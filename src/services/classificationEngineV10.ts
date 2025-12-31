/**
 * HTS Classification Engine V10 "Velocity"
 * 
 * Sub-2-second classification through:
 * 1. SEMANTIC SEARCH via pgvector embeddings (primary method)
 * 2. Keyword fallback (when embeddings not available)
 * 3. Deterministic scoring (no AI in critical path)
 * 4. "Other" validation via negative matching
 * 5. Full description building from parentGroupings
 * 
 * @module classificationEngineV10
 * @created December 30, 2025
 * @see docs/ARCHITECTURE_HTS_CLASSIFICATION_V10.md
 */

import { prisma } from '@/lib/db';
import { HtsLevel, Prisma } from '@prisma/client';
import { 
  formatHtsCode, 
  normalizeHtsCode, 
  getParentCode,
  getHtsHierarchy,
  getHtsSiblings,
  parseHtsCode,
} from './htsDatabase';
import { getEffectiveTariff, convertToLegacyFormat } from './tariffRegistry';
import { searchHtsBySemantic, dualPathSearch, getEmbeddingStats } from './htsEmbeddings';
import { 
  detectConditionalSiblings,
  ConditionalClassificationResult,
} from './conditionalClassification';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassifyV10Input {
  description: string;
  origin?: string;        // ISO country code (e.g., 'CN')
  destination?: string;   // ISO country code (default: 'US')
  material?: string;      // Optional material hint
  useSemanticSearch?: boolean; // Use embedding-based semantic search (faster, more accurate)
}

export interface ClassifyV10Result {
  success: boolean;
  timing: {
    total: number;
    search: number;
    scoring: number;
    tariff: number;
  };
  
  primary: {
    htsCode: string;
    htsCodeFormatted: string;
    confidence: number;
    
    path: {
      codes: string[];
      descriptions: string[];
    };
    
    fullDescription: string;
    shortDescription: string;
    
    duty: {
      baseMfn: string;
      additional: string;
      effective: string;
      special?: string;
    } | null;
    
    isOther: boolean;
    otherExclusions?: string[];
    
    scoringFactors: ScoringFactors;
  } | null;
  
  alternatives: Alternative[];
  
  showMore: number;
  
  // Detected attributes from input
  detectedMaterial: string | null;
  detectedChapters: string[];
  searchTerms: string[];
  
  // Clarification needed when confidence is too low
  needsClarification?: {
    reason: string;
    question: string;
    options: { value: string; label: string; hint?: string }[];
  };
  
  // Conditional classification (when siblings have value/size/weight conditions)
  conditionalClassification?: ConditionalClassificationResult;
  
  justification?: string | null;
}

export interface Alternative {
  rank: number;
  htsCode: string;
  htsCodeFormatted: string;
  confidence: number;
  description: string;
  fullDescription: string;
  chapter: string;
  chapterDescription: string;
  materialNote?: string;
  duty?: {
    baseMfn: string;
    effective: string;
  };
}

interface ScoringFactors {
  keywordMatch: number;
  materialMatch: number;
  specificity: number;
  hierarchyCoherence: number;
  penalties: number;
  total: number;
}

interface HtsCandidate {
  code: string;
  codeFormatted: string;
  level: HtsLevel;
  description: string;
  generalRate: string | null;
  specialRates: string | null;
  keywords: string[];
  parentGroupings: string[];
  chapter: string;
  parentCode: string | null;
  
  // Computed
  isOtherCode: boolean;
  isSpecificCarveOut: boolean;
  fullDescription: string;
  parentDescription: string | null;
  
  // Scoring
  score: number;
  factors: ScoringFactors;
  otherValidation?: OtherValidation;
}

interface OtherValidation {
  isValidOther: boolean;
  excludedSiblings: { code: string; description: string; reason: string }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIAL DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Map materials to their corresponding HTS chapters
 */
const MATERIAL_CHAPTERS: Record<string, string[]> = {
  'plastic': ['39'],
  'plastics': ['39'],
  'silicone': ['39'],
  'rubber': ['40'],
  'leather': ['41', '42'],
  'wood': ['44'],
  'wooden': ['44'],
  'bamboo': ['46'],
  'paper': ['48'],
  'cardboard': ['48'],
  'cotton': ['52', '61', '62'],
  'wool': ['51', '61', '62'],
  'silk': ['50', '61', '62'],
  'polyester': ['54', '61', '62'],
  'nylon': ['54', '61', '62'],
  'textile': ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63'],
  'fabric': ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '60', '61', '62', '63'],
  'ceramic': ['69'],
  'ceramics': ['69'],
  'porcelain': ['69'],
  'earthenware': ['69'],
  'stoneware': ['69'],
  'terracotta': ['69'],
  'glass': ['70'],
  'iron': ['72', '73'],
  'steel': ['72', '73'],
  'stainless': ['72', '73'],
  'copper': ['74'],
  'brass': ['74'],
  'bronze': ['74'],
  'nickel': ['75'],
  'aluminum': ['76'],
  'aluminium': ['76'],
  'zinc': ['79'],
  'tin': ['80'],
  'metal': ['72', '73', '74', '75', '76', '78', '79', '80', '81', '82', '83'],
  'electronics': ['84', '85'],
  'electronic': ['84', '85'],
  'electrical': ['85'],
  'furniture': ['94'],
};

/**
 * Extract material from product description
 */
function detectMaterial(description: string): string | null {
  const descLower = description.toLowerCase();
  
  // Check for explicit material keywords
  for (const [material] of Object.entries(MATERIAL_CHAPTERS)) {
    if (descLower.includes(material)) {
      return material;
    }
  }
  
  return null;
}

/**
 * Get chapters for a material
 */
function getMaterialChapters(material: string | null): string[] {
  if (!material) return [];
  
  const materialLower = material.toLowerCase();
  
  for (const [key, chapters] of Object.entries(MATERIAL_CHAPTERS)) {
    if (materialLower.includes(key) || key.includes(materialLower)) {
      return chapters;
    }
  }
  
  return [];
}

/**
 * Product type to HTS heading hints
 * This helps guide the search to ARTICLE codes, not raw material codes
 */
const PRODUCT_TYPE_HINTS: Record<string, { headings: string[]; keywords: string[] }> = {
  // Household items
  'planter': { headings: ['3924', '6912', '7323', '4419'], keywords: ['household', 'article', 'container', 'pot'] },
  'pot': { headings: ['3924', '6912', '7323', '7615'], keywords: ['household', 'article', 'container', 'cooking'] },
  'container': { headings: ['3923', '3924', '7310', '7612'], keywords: ['container', 'article', 'storage'] },
  'bottle': { headings: ['3923', '7010'], keywords: ['bottle', 'container'] },
  'cup': { headings: ['3924', '6912', '7323'], keywords: ['tableware', 'cup', 'drinking'] },
  'mug': { headings: ['3924', '6912', '7323'], keywords: ['tableware', 'cup', 'mug', 'drinking'] },
  'plate': { headings: ['3924', '6912', '7323'], keywords: ['tableware', 'plate', 'dish'] },
  'bowl': { headings: ['3924', '6912', '7323'], keywords: ['tableware', 'bowl', 'kitchenware'] },
  'box': { headings: ['3923', '4819', '7310'], keywords: ['container', 'box', 'storage'] },
  'basket': { headings: ['4602', '3926'], keywords: ['basket', 'container', 'wickerwork'] },
  'bag': { headings: ['3923', '4202', '6305'], keywords: ['bag', 'sack', 'container'] },
  'case': { headings: ['4202', '3926'], keywords: ['case', 'container', 'carrying'] },
  
  // Clothing
  'shirt': { headings: ['6109', '6105', '6205', '6206'], keywords: ['shirt', 'apparel', 'clothing'] },
  't-shirt': { headings: ['6109'], keywords: ['t-shirt', 'tshirt', 'knit', 'apparel'] },
  'tshirt': { headings: ['6109'], keywords: ['t-shirt', 'tshirt', 'knit', 'apparel'] },
  'pants': { headings: ['6103', '6104', '6203', '6204'], keywords: ['pants', 'trousers', 'apparel'] },
  'dress': { headings: ['6104', '6204'], keywords: ['dress', 'apparel', 'women'] },
  'jacket': { headings: ['6101', '6102', '6201', '6202'], keywords: ['jacket', 'coat', 'apparel'] },
  
  // Electronics
  'phone': { headings: ['8517'], keywords: ['telephone', 'cellular', 'mobile'] },
  'laptop': { headings: ['8471'], keywords: ['computer', 'laptop', 'portable'] },
  'cable': { headings: ['8544'], keywords: ['cable', 'wire', 'electrical'] },
  
  // Furniture
  'chair': { headings: ['9401'], keywords: ['seat', 'chair', 'furniture'] },
  'table': { headings: ['9403'], keywords: ['table', 'furniture', 'desk'] },
  'shelf': { headings: ['9403'], keywords: ['shelf', 'furniture', 'storage'] },
  
  // Toys
  'toy': { headings: ['9503'], keywords: ['toy', 'game', 'plaything'] },
  'doll': { headings: ['9503'], keywords: ['doll', 'toy', 'figure'] },
  'game': { headings: ['9504', '9503'], keywords: ['game', 'toy', 'play'] },
};

/**
 * Detect product type and get search hints
 */
function detectProductType(description: string): { type: string | null; headings: string[]; keywords: string[] } {
  const descLower = description.toLowerCase();
  
  for (const [productType, hints] of Object.entries(PRODUCT_TYPE_HINTS)) {
    if (descLower.includes(productType)) {
      return { type: productType, ...hints };
    }
  }
  
  return { type: null, headings: [], keywords: [] };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tokenize and generate search variations from input
 */
function tokenizeInput(description: string): string[] {
  const tokens = new Set<string>();
  const descLower = description.toLowerCase().trim();
  
  // Split by spaces, hyphens, commas
  const words = descLower.split(/[\s,\-\/]+/).filter(w => w.length > 1);
  
  for (const word of words) {
    // Skip common words
    if (['the', 'a', 'an', 'of', 'for', 'and', 'or', 'with', 'to', 'in', 'on'].includes(word)) {
      continue;
    }
    
    tokens.add(word);
    
    // Remove possessives
    if (word.endsWith("'s")) {
      tokens.add(word.slice(0, -2));
    }
    
    // Handle plurals
    if (word.endsWith('s') && word.length > 3) {
      tokens.add(word.slice(0, -1));
    }
    if (word.endsWith('es') && word.length > 4) {
      tokens.add(word.slice(0, -2));
    }
    if (word.endsWith('ies') && word.length > 5) {
      tokens.add(word.slice(0, -3) + 'y');
    }
  }
  
  // Add common variations
  if (descLower.includes('t-shirt') || descLower.includes('tshirt')) {
    tokens.add('t-shirt');
    tokens.add('tshirt');
    tokens.add('shirt');
  }
  
  return Array.from(tokens);
}

/**
 * Extract key nouns from HTS description for matching
 */
function extractNouns(description: string): string[] {
  const descLower = description.toLowerCase();
  
  // Remove common HTS boilerplate
  const cleaned = descLower
    .replace(/other/gi, '')
    .replace(/articles? of/gi, '')
    .replace(/parts? (?:and|&) accessories/gi, '')
    .replace(/not elsewhere specified/gi, '')
    .replace(/nesoi/gi, '')
    .replace(/thereof/gi, '')
    .replace(/:/g, '')
    .replace(/,/g, ' ');
  
  const words = cleaned.split(/\s+/).filter(w => 
    w.length > 2 && 
    !['the', 'and', 'for', 'with', 'other', 'not', 'than', 'more'].includes(w)
  );
  
  return words;
}

// ═══════════════════════════════════════════════════════════════════════════════
// "OTHER" CODE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a description indicates an "Other" catch-all code
 */
function isOtherCode(description: string): boolean {
  const desc = description.toLowerCase().trim();
  
  return (
    desc === 'other' ||
    desc === 'other:' ||
    desc.startsWith('other ') ||
    desc.startsWith('other,') ||
    desc.startsWith('other:') ||
    desc.endsWith(': other') ||
    desc.endsWith(':other') ||
    desc.includes('not elsewhere specified') ||
    desc.includes('nesoi') ||
    desc.includes('n.e.s.o.i')
  );
}

/**
 * Check if a code is a specific carve-out (NOT "Other")
 * 
 * LOGIC-BASED (no hardcoding):
 * - "Other" codes are catch-alls
 * - General category descriptions (like "articles of plastics") are NOT specific
 * - Short, concrete descriptions (like "Nursing nipples") ARE specific
 */
function isSpecificCarveOut(description: string): boolean {
  if (isOtherCode(description)) return false;
  
  const desc = description.toLowerCase().trim();
  
  // General category descriptions are NOT carve-outs
  const generalPatterns = [
    'tableware', 'kitchenware', 'household articles', 'articles of',
    'parts and accessories', 'parts thereof', 'not elsewhere',
    'of plastics', 'of rubber', 'of metal', 'of wood', 'of glass',
    'of ceramic', 'of iron', 'of steel', 'of aluminum',
  ];
  
  if (generalPatterns.some(p => desc.includes(p))) {
    return false;
  }
  
  // Logic-based detection:
  // Specific carve-outs tend to be:
  // 1. Short (< 60 characters)
  // 2. Name concrete products (not categories)
  // 3. Don't have many commas (not lists of general items)
  
  const wordCount = desc.split(/\s+/).length;
  const commaCount = (desc.match(/,/g) || []).length;
  
  // Short descriptions with few commas are likely specific
  if (desc.length < 60 && wordCount <= 8 && commaCount <= 1) {
    return true;
  }
  
  // If description looks like a list of specific items (X and Y, X or Y)
  if ((desc.includes(' and ') || desc.includes(' or ')) && wordCount <= 10 && commaCount <= 2) {
    return true;
  }
  
  return false;
}

/**
 * Validate "Other" selection by checking siblings at multiple levels
 * High confidence when product doesn't match ANY specific sibling
 * 
 * This is the KEY LOGIC: Use the HTS tree structure itself as the rules!
 */
async function validateOtherSelection(
  productTerms: string[],
  otherCode: string,
  parentCode: string
): Promise<OtherValidation> {
  const excludedSiblings: { code: string; description: string; reason: string }[] = [];
  
  // Get the subheading code (6 digits) - this is where meaningful carve-outs typically are
  const normalizedCode = normalizeHtsCode(otherCode);
  const subheadingCode = normalizedCode.slice(0, 6);
  
  // Get all codes under this subheading (tariff lines AND statistical where carve-outs are defined)
  // Include both levels since some chapters have carve-outs at tariff_line, others at statistical
  const codesUnderSubheading = await prisma.htsCode.findMany({
    where: {
      code: { startsWith: subheadingCode },
      level: { in: ['tariff_line', 'statistical'] },
    },
    select: { code: true, codeFormatted: true, description: true, level: true },
    orderBy: { code: 'asc' },
  });
  
  // Filter to get siblings at the same level with different descriptions
  // (codes under same subheading but with a different 8-digit prefix)
  const our8Digit = normalizedCode.slice(0, 8);
  let siblings = codesUnderSubheading.filter(c => {
    const their8Digit = c.code.slice(0, 8);
    return their8Digit !== our8Digit;
  });
  
  // Debug logging (can be removed in production)
  // console.log(`[V10 Validate] Subheading ${subheadingCode}, found ${codesUnderSubheading.length} codes, ${siblings.length} siblings`);
  
  // Filter to only specific codes (not "Other" codes)
  const specificSiblings = siblings.filter(s => 
    !isOtherCode(s.description) && isSpecificCarveOut(s.description)
  );
  
  // If still no specific siblings, we can't validate but assume "Other" is reasonable
  if (specificSiblings.length === 0) {
    return {
      isValidOther: true,
      excludedSiblings: [], // No exclusions to report, but still valid
    };
  }
  
  for (const sibling of specificSiblings) {
    const siblingNouns = extractNouns(sibling.description);
    
    // Skip if no meaningful nouns extracted
    if (siblingNouns.length === 0) continue;
    
    // Check if ANY product term matches sibling nouns
    const hasMatch = productTerms.some(term => 
      siblingNouns.some(noun => {
        // Direct match
        if (term.includes(noun) || noun.includes(term)) return true;
        // Stem match (for plurals, etc.)
        if (term.length > 3 && noun.length > 3) {
          const termStem = term.slice(0, -1);
          const nounStem = noun.slice(0, -1);
          if (termStem === nounStem) return true;
        }
        return false;
      })
    );
    
    if (hasMatch) {
      // Product might match this specific sibling - "Other" may not be correct
      return {
        isValidOther: false,
        excludedSiblings: [{
          code: sibling.codeFormatted,
          description: sibling.description,
          reason: `Product may match "${sibling.description}"`,
        }],
      };
    }
    
    // Product does NOT match this sibling - add to exclusion list
    excludedSiblings.push({
      code: sibling.codeFormatted,
      description: sibling.description,
      reason: `Product is not "${siblingNouns.slice(0, 3).join(', ')}"`,
    });
  }
  
  // All specific siblings excluded → "Other" is validated as correct
  return {
    isValidOther: true,
    excludedSiblings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL DESCRIPTION BUILDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build full legal description from hierarchy + parentGroupings
 */
async function buildFullDescription(code: string): Promise<{ full: string; short: string; path: { codes: string[]; descriptions: string[] } }> {
  const hierarchy = await getHtsHierarchy(code);
  
  const codes: string[] = [];
  const descriptions: string[] = [];
  const segments: string[] = [];
  
  for (const node of hierarchy) {
    codes.push(node.codeFormatted);
    
    // Add parent groupings first (the "Other:", "Men's or boys':" rows)
    if (node.parentGroupings && node.parentGroupings.length > 0) {
      for (const grouping of node.parentGroupings) {
        const cleaned = grouping.replace(/:$/, '').trim();
        if (cleaned && !segments.includes(cleaned) && cleaned.toLowerCase() !== 'other') {
          segments.push(cleaned);
        }
      }
    }
    
    // Add node description
    const desc = node.description.replace(/:$/, '').trim();
    if (desc && !segments.some(s => s.toLowerCase() === desc.toLowerCase())) {
      descriptions.push(desc);
      
      // Don't add duplicate "Other" to segments
      if (desc.toLowerCase() !== 'other' || segments.length === 0) {
        segments.push(desc);
      }
    }
  }
  
  // Get short description (leaf node)
  const leafNode = hierarchy[hierarchy.length - 1];
  const shortDesc = leafNode?.description || '';
  
  return {
    full: segments.join(': '),
    short: shortDesc,
    path: { codes, descriptions },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate score for a candidate HTS code
 */
function calculateScore(
  productTerms: string[],
  productMaterial: string | null,
  productTypeHints: { type: string | null; headings: string[]; keywords: string[] },
  candidate: {
    code: string;
    description: string;
    keywords: string[];
    chapter: string;
    heading: string | null;
    parentDescription?: string | null;
    isOtherCode: boolean;
    isSpecificCarveOut: boolean;
    otherValidation?: OtherValidation;
  }
): ScoringFactors {
  const factors: ScoringFactors = {
    keywordMatch: 0,
    materialMatch: 0,
    specificity: 0,
    hierarchyCoherence: 0,
    penalties: 0,
    total: 0,
  };
  
  // 1. KEYWORD MATCH (0-40 points)
  const descLower = candidate.description.toLowerCase();
  const keywordsLower = candidate.keywords.map(k => k.toLowerCase());
  
  // Check keyword array matches
  const keywordHits = productTerms.filter(term => 
    keywordsLower.some(kw => kw.includes(term) || term.includes(kw))
  );
  factors.keywordMatch += Math.min(25, keywordHits.length * 10);
  
  // Check description matches
  const descHits = productTerms.filter(term => descLower.includes(term));
  factors.keywordMatch += Math.min(15, descHits.length * 5);
  
  factors.keywordMatch = Math.min(40, factors.keywordMatch);
  
  // 2. MATERIAL MATCH (0-30 points)
  if (productMaterial) {
    const materialChapters = getMaterialChapters(productMaterial);
    if (materialChapters.includes(candidate.chapter)) {
      factors.materialMatch = 30;
    } else if (materialChapters.length > 0) {
      // Material mismatch - penalize
      factors.penalties -= 20;
    }
  }
  
  // 2b. PRODUCT TYPE HEADING HINT
  // This is DOMAIN KNOWLEDGE (planters are household items), not HTS-specific hardcoding
  // It helps guide us to the right area of the tariff schedule
  if (productTypeHints.type && productTypeHints.headings.length > 0 && candidate.heading) {
    if (productTypeHints.headings.includes(candidate.heading)) {
      factors.hierarchyCoherence += 15; // Boost for being in a heading commonly used for this product type
    } else if (productTypeHints.headings.length > 0) {
      // Slight penalty for being in a different heading than expected
      // (e.g., polymers 3901-3914 instead of articles 3923-3926)
      factors.penalties -= 10;
    }
  }
  
  // 3. SPECIFICITY (0-20 points)
  if (candidate.isSpecificCarveOut) {
    // Specific codes are best IF product matches
    const matchesCarveOut = productTerms.some(term => 
      descLower.includes(term) || 
      keywordsLower.some(kw => kw.includes(term))
    );
    
    if (matchesCarveOut) {
      factors.specificity = 20;
    } else {
      // Product doesn't match this specific carve-out - penalize heavily
      factors.penalties -= 40;
    }
  } else if (candidate.isOtherCode) {
    if (candidate.otherValidation?.isValidOther) {
      factors.specificity = 15; // "Other" with verified exclusions
    } else {
      factors.specificity = 8; // "Other" without verification
    }
  } else {
    factors.specificity = 10; // General category
  }
  
  // 4. HIERARCHY COHERENCE (0-10 points)
  if (candidate.parentDescription) {
    const parentLower = candidate.parentDescription.toLowerCase();
    const parentHits = productTerms.filter(term => parentLower.includes(term));
    factors.hierarchyCoherence = Math.min(10, parentHits.length * 4);
  }
  
  // 5. DYNAMIC MISMATCH DETECTION (No hardcoding!)
  // If this is a SPECIFIC code (not "Other"), check if product matches its description
  // by extracting key nouns from the HTS description and comparing to product terms
  if (candidate.isSpecificCarveOut) {
    const htsNouns = extractNouns(candidate.description);
    
    // Check if ANY product term matches ANY HTS noun
    const hasOverlap = productTerms.some(pt => 
      htsNouns.some(hn => 
        pt.includes(hn) || hn.includes(pt) ||
        (pt.length > 3 && hn.length > 3 && pt.slice(0, 4) === hn.slice(0, 4))
      )
    );
    
    if (!hasOverlap && htsNouns.length > 0) {
      // Product doesn't match this specific code's description
      factors.penalties -= 40;
    }
  }
  
  // 6. "OTHER" CODE VALIDATION (The KEY logic-based insight!)
  // This is where we USE THE HTS STRUCTURE ITSELF as the rules
  // If we validated that the product doesn't match any specific sibling → "Other" is correct
  if (candidate.isOtherCode && candidate.otherValidation) {
    if (candidate.otherValidation.isValidOther) {
      // All siblings were excluded - "Other" is VALIDATED as correct
      // Boost based on how many siblings we excluded (more exclusions = higher confidence)
      const siblingCount = candidate.otherValidation.excludedSiblings.length;
      factors.specificity += Math.min(25, 10 + siblingCount * 3); // +10 base, up to +25 total
    } else {
      // Product might match a specific sibling - this "Other" might be wrong
      factors.penalties -= 25;
    }
  } else if (candidate.isOtherCode && !candidate.otherValidation) {
    // "Other" code but we couldn't validate it - slight penalty for uncertainty
    factors.penalties -= 5;
  }
  
  // Calculate total
  factors.total = Math.max(0, Math.min(100,
    factors.keywordMatch +
    factors.materialMatch +
    factors.specificity +
    factors.hierarchyCoherence +
    factors.penalties
  ));
  
  return factors;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify a product description to HTS code
 * Target: <2 seconds total
 */
export async function classifyV10(input: ClassifyV10Input): Promise<ClassifyV10Result> {
  const startTime = Date.now();
  let searchTime = 0;
  let scoringTime = 0;
  let tariffTime = 0;
  
  const { description, origin, destination = 'US', material: inputMaterial } = input;
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: TOKENIZE & DETECT MATERIAL
  // ─────────────────────────────────────────────────────────────────────────────
  
  const searchTerms = tokenizeInput(description);
  const detectedMaterial = inputMaterial || detectMaterial(description);
  const materialChapters = getMaterialChapters(detectedMaterial);
  const productTypeHints = detectProductType(description);
  
  // Expand search terms with product type keywords
  const expandedTerms = [...new Set([
    ...searchTerms, 
    ...productTypeHints.keywords
  ])];
  
  console.log('[V10] Search terms:', searchTerms);
  console.log('[V10] Detected material:', detectedMaterial);
  console.log('[V10] Material chapters:', materialChapters);
  console.log('[V10] Product type:', productTypeHints.type);
  console.log('[V10] Product headings hint:', productTypeHints.headings);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: SEARCH - Try Semantic Search First, Fallback to Keywords
  // ─────────────────────────────────────────────────────────────────────────────
  
  const searchStart = Date.now();
  let allResults: Awaited<ReturnType<typeof prisma.htsCode.findMany>> = [];
  let usedSemanticSearch = false;
  
  // Check if embeddings are available and semantic search is enabled
  const useSemanticSearch = input.useSemanticSearch !== false; // Default to true
  
  if (useSemanticSearch) {
    try {
      // Check embedding coverage
      const stats = await getEmbeddingStats();
      
      if (stats.withEmbeddings > 1000) { // Need at least some embeddings
        console.log(`[V10] Using SEMANTIC SEARCH (${stats.coverage} coverage)`);
        
        // CRITICAL: Enrich the query with product type context
        // This prevents "indoor planter" from matching "greenhouse vegetables"
        // by adding "container pot household" to clarify intent
        const productTypeContext = productTypeHints.keywords.length > 0
          ? productTypeHints.keywords.join(' ')
          : '';
        
        // Build enriched search query
        const enrichedDescription = productTypeContext
          ? `${description} ${productTypeContext}`
          : description;
        
        console.log(`[V10] Enriched query: "${enrichedDescription}"`);
        
        // Use dual-path search for material + function
        const semanticResults = await dualPathSearch(
          detectedMaterial,
          enrichedDescription,
          { 
            limit: 50,
            // When we know the product type, restrict to relevant headings
            preferredHeadings: productTypeHints.headings,
          }
        );
        
        if (semanticResults.length > 0) {
          // Filter out very low similarity results (garbage matches)
          const minSimilarity = 0.4;
          const filteredResults = semanticResults.filter(r => r.similarity >= minSimilarity);
          
          if (filteredResults.length > 0) {
            // Convert semantic results to the format we need
            const codes = filteredResults.map(r => r.code);
            allResults = await prisma.htsCode.findMany({
              where: { code: { in: codes } },
            });
            
            // Sort by similarity score from semantic search
            const similarityMap = new Map(filteredResults.map(r => [r.code, r.similarity]));
            allResults.sort((a, b) => 
              (similarityMap.get(b.code) || 0) - (similarityMap.get(a.code) || 0)
            );
            
            usedSemanticSearch = true;
            console.log(`[V10] Semantic search found ${allResults.length} candidates (filtered from ${semanticResults.length})`);
          } else {
            console.log(`[V10] All semantic results below ${minSimilarity} threshold, using keyword fallback`);
          }
        }
      } else {
        console.log(`[V10] Embeddings not ready (${stats.coverage}), using keyword search`);
      }
    } catch (err) {
      console.log('[V10] Semantic search unavailable, falling back to keywords:', err);
    }
  }
  
  // Fallback to keyword search if semantic search didn't work
  if (!usedSemanticSearch) {
    console.log('[V10] Using KEYWORD SEARCH');
    
    // Priority 1: Search in product-type-specific headings with material filter
    if (productTypeHints.headings.length > 0 && materialChapters.length > 0) {
      const relevantHeadings = productTypeHints.headings.filter(h => 
        materialChapters.includes(h.slice(0, 2))
      );
      
      if (relevantHeadings.length > 0) {
        const headingResults = await prisma.htsCode.findMany({
          where: {
            AND: [
              { heading: { in: relevantHeadings } },
              { level: { in: ['statistical', 'tariff_line'] } },
            ],
          },
          take: 50,
          orderBy: { code: 'asc' },
        });
        allResults = [...allResults, ...headingResults];
        console.log(`[V10] Found ${headingResults.length} codes in specific headings`);
      }
    }
    
    // Priority 2: Search in material chapter with expanded keywords
    if (allResults.length < 30 && materialChapters.length > 0) {
      const keywordResults = await prisma.htsCode.findMany({
        where: {
          AND: [
            { chapter: { in: materialChapters } },
            { level: { in: ['statistical', 'tariff_line'] } },
            { 
              OR: [
                { keywords: { hasSome: expandedTerms } },
                ...expandedTerms.slice(0, 3).map(term => ({
                  description: { contains: term, mode: 'insensitive' as const },
                })),
              ],
            },
          ],
        },
        take: 50,
        orderBy: { code: 'asc' },
      });
      
      const existingCodes = new Set(allResults.map(r => r.code));
      const newResults = keywordResults.filter(r => !existingCodes.has(r.code));
      allResults = [...allResults, ...newResults];
      console.log(`[V10] Found ${newResults.length} codes via keyword search in chapter`);
    }
    
    // Priority 3: Broader search if still few results
    if (allResults.length < 20) {
      const broadResults = await prisma.htsCode.findMany({
        where: {
          AND: [
            { level: { in: ['statistical', 'tariff_line'] } },
            { 
              OR: [
                { keywords: { hasSome: searchTerms } },
                ...searchTerms.slice(0, 3).map(term => ({
                  description: { contains: term, mode: 'insensitive' as const },
                })),
              ],
            },
          ],
        },
        take: 50,
        orderBy: { code: 'asc' },
      });
      
      const existingCodes = new Set(allResults.map(r => r.code));
      const newResults = broadResults.filter(r => !existingCodes.has(r.code));
      allResults = [...allResults, ...newResults];
      console.log(`[V10] Found ${newResults.length} codes via broad search`);
    }
  }
  
  searchTime = Date.now() - searchStart;
  console.log(`[V10] Search found ${allResults.length} candidates in ${searchTime}ms`);
  
  if (allResults.length === 0) {
    return {
      success: false,
      timing: { total: Date.now() - startTime, search: searchTime, scoring: 0, tariff: 0 },
      primary: null,
      alternatives: [],
      showMore: 0,
      detectedMaterial,
      detectedChapters: materialChapters,
      searchTerms,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3: SCORE CANDIDATES
  // ─────────────────────────────────────────────────────────────────────────────
  
  const scoringStart = Date.now();
  
  // Get parent descriptions for hierarchy coherence scoring
  const parentCodes = [...new Set(allResults.map(r => r.parentCode).filter(Boolean) as string[])];
  const parentMap = new Map<string, string>();
  
  if (parentCodes.length > 0) {
    const parents = await prisma.htsCode.findMany({
      where: { code: { in: parentCodes } },
      select: { code: true, description: true },
    });
    for (const p of parents) {
      parentMap.set(p.code, p.description);
    }
  }
  
  // Score each candidate
  const candidates: HtsCandidate[] = [];
  
  for (const result of allResults) {
    const isOther = isOtherCode(result.description);
    const isSpecific = isSpecificCarveOut(result.description);
    
    // Validate "Other" codes
    let otherValidation: OtherValidation | undefined;
    if (isOther && result.parentCode) {
      otherValidation = await validateOtherSelection(searchTerms, result.code, result.parentCode);
    }
    
    const factors = calculateScore(searchTerms, detectedMaterial, productTypeHints, {
      code: result.code,
      description: result.description,
      keywords: result.keywords,
      chapter: result.chapter,
      heading: result.heading,
      parentDescription: result.parentCode ? parentMap.get(result.parentCode) : null,
      isOtherCode: isOther,
      isSpecificCarveOut: isSpecific,
      otherValidation,
    });
    
    candidates.push({
      code: result.code,
      codeFormatted: result.codeFormatted,
      level: result.level,
      description: result.description,
      generalRate: result.generalRate,
      specialRates: result.specialRates,
      keywords: result.keywords,
      parentGroupings: result.parentGroupings,
      chapter: result.chapter,
      parentCode: result.parentCode,
      isOtherCode: isOther,
      isSpecificCarveOut: isSpecific,
      fullDescription: '', // Will be populated for top candidates
      parentDescription: result.parentCode ? parentMap.get(result.parentCode) || null : null,
      score: factors.total,
      factors,
      otherValidation,
    });
  }
  
  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);
  
  // Deduplicate by 8-digit code (keep highest scoring variant)
  const seen8Digit = new Set<string>();
  const uniqueCandidates = candidates.filter(c => {
    const code8 = c.code.slice(0, 8);
    if (seen8Digit.has(code8)) return false;
    seen8Digit.add(code8);
    return true;
  });
  
  scoringTime = Date.now() - scoringStart;
  console.log(`[V10] Scored ${candidates.length} candidates in ${scoringTime}ms`);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: BUILD RESULTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  const topCandidates = uniqueCandidates.slice(0, 15);
  
  // Build full descriptions for top candidates
  for (const candidate of topCandidates) {
    const fullDesc = await buildFullDescription(candidate.code);
    candidate.fullDescription = fullDesc.full;
  }
  
  // Primary result
  const primary = topCandidates[0];
  
  if (!primary) {
    return {
      success: false,
      timing: { total: Date.now() - startTime, search: searchTime, scoring: scoringTime, tariff: 0 },
      primary: null,
      alternatives: [],
      showMore: 0,
      detectedMaterial,
      detectedChapters: materialChapters,
      searchTerms,
    };
  }
  
  // Get tariff info for primary
  const tariffStart = Date.now();
  let dutyInfo: {
    baseMfn: string;
    additional: string;
    effective: string;
    special?: string;
  } | null = null;
  
  if (origin) {
    try {
      const tariff = await getEffectiveTariff(origin, primary.code, {
        baseMfnRate: primary.generalRate ? parseFloat(primary.generalRate) || 0 : 0,
      });
      
      dutyInfo = {
        baseMfn: primary.generalRate || 'N/A',
        additional: tariff.section301Rate > 0 ? `+${tariff.section301Rate}% (Section 301)` : '',
        effective: `${tariff.effectiveRate.toFixed(1)}%`,
        special: primary.specialRates || undefined,
      };
    } catch (err) {
      console.error('[V10] Tariff lookup error:', err);
    }
  }
  
  tariffTime = Date.now() - tariffStart;
  
  // Build full description path for primary
  const primaryDesc = await buildFullDescription(primary.code);
  
  // Build alternatives (exclude primary)
  const alternatives: Alternative[] = topCandidates.slice(1, 11).map((c, i) => {
    // Generate material note if different chapter
    let materialNote: string | undefined;
    if (c.chapter !== primary.chapter) {
      const chapterMaterial = Object.entries(MATERIAL_CHAPTERS)
        .find(([_, chapters]) => chapters.includes(c.chapter))?.[0];
      if (chapterMaterial) {
        materialNote = `If your product is ${chapterMaterial}`;
      }
    }
    
    return {
      rank: i + 2,
      htsCode: c.code,
      htsCodeFormatted: c.codeFormatted,
      confidence: c.score,
      description: c.description,
      fullDescription: c.fullDescription,
      chapter: c.chapter,
      chapterDescription: `Chapter ${c.chapter}`,
      materialNote,
    };
  });
  
  // Count remaining candidates
  const showMore = Math.max(0, uniqueCandidates.length - 11);
  
  const totalTime = Date.now() - startTime;
  console.log(`[V10] Classification complete in ${totalTime}ms (search: ${searchTime}ms, scoring: ${scoringTime}ms, tariff: ${tariffTime}ms)`);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LOW CONFIDENCE HANDLING: Ask for clarification when we're not confident
  // This is better than returning garbage results (like "cucumbers" for "planter")
  // ─────────────────────────────────────────────────────────────────────────────
  
  const CONFIDENCE_THRESHOLD = 40; // Below this, ask for clarification
  const needsMaterialClarification = !detectedMaterial && primary.score < CONFIDENCE_THRESHOLD && productTypeHints.type;
  
  let needsClarification: ClassifyV10Result['needsClarification'] = undefined;
  
  if (needsMaterialClarification) {
    console.log(`[V10] Low confidence (${primary.score}%) with no material detected - asking for clarification`);
    
    // Build material options based on common materials for this product type
    const materialOptions = [
      { value: 'plastic', label: 'Plastic', hint: 'Chapter 39' },
      { value: 'ceramic', label: 'Ceramic/Clay', hint: 'Chapter 69' },
      { value: 'metal', label: 'Metal', hint: 'Chapters 72-83' },
      { value: 'wood', label: 'Wood', hint: 'Chapter 44' },
      { value: 'glass', label: 'Glass', hint: 'Chapter 70' },
    ];
    
    needsClarification = {
      reason: 'material_unknown',
      question: `What material is your ${productTypeHints.type || 'product'} made of?`,
      options: materialOptions,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // CONDITIONAL CLASSIFICATION: Detect value/size/weight dependent siblings
  // This helps users find more specific codes when conditions apply
  // ─────────────────────────────────────────────────────────────────────────────
  
  let conditionalClassification: ClassifyV10Result['conditionalClassification'] = undefined;
  
  try {
    const conditionalResult = await detectConditionalSiblings(
      primary.code,
      dutyInfo?.baseMfn || null
    );
    
    if (conditionalResult.hasConditions) {
      console.log(`[V10] Found ${conditionalResult.decisionQuestions.length} decision questions, ${conditionalResult.alternatives.length} alternatives`);
      conditionalClassification = conditionalResult;
    }
  } catch (err) {
    console.log('[V10] Error detecting conditional siblings:', err);
  }
  
  return {
    success: true,
    timing: {
      total: totalTime,
      search: searchTime,
      scoring: scoringTime,
      tariff: tariffTime,
    },
    primary: {
      htsCode: primary.code,
      htsCodeFormatted: primary.codeFormatted,
      confidence: primary.score,
      path: primaryDesc.path,
      fullDescription: primaryDesc.full,
      shortDescription: primary.description,
      duty: dutyInfo,
      isOther: primary.isOtherCode,
      otherExclusions: primary.otherValidation?.excludedSiblings.map(s => s.description),
      scoringFactors: primary.factors,
    },
    alternatives,
    showMore,
    detectedMaterial,
    detectedChapters: materialChapters,
    searchTerms,
    needsClarification,
    conditionalClassification,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ON-DEMAND JUSTIFICATION (AI-powered, async)
// ═══════════════════════════════════════════════════════════════════════════════

export interface JustificationResult {
  gri1Analysis: string;
  gri6Analysis: string;
  carveOutExclusions: string[];
  confidenceFactors: string[];
  fullJustification: string;
}

/**
 * Generate AI-powered justification for a classification
 * This is called ON-DEMAND, not in the critical path
 */
export async function generateJustification(
  productDescription: string,
  htsCode: string,
  result: ClassifyV10Result
): Promise<JustificationResult> {
  // For now, return a deterministic justification
  // Can be enhanced with AI call later
  
  const primary = result.primary;
  if (!primary) {
    return {
      gri1Analysis: 'No classification result available.',
      gri6Analysis: '',
      carveOutExclusions: [],
      confidenceFactors: [],
      fullJustification: 'Unable to generate justification without classification result.',
    };
  }
  
  const chapter = primary.htsCode.slice(0, 2);
  const heading = primary.htsCode.slice(0, 4);
  
  // Build GRI 1 analysis
  const gri1 = `The product "${productDescription}" is classified under Chapter ${chapter} ` +
    `based on ${result.detectedMaterial ? `its ${result.detectedMaterial} material` : 'its essential character'}. ` +
    `Heading ${heading} specifically provides for "${primary.path.descriptions[1] || primary.shortDescription}".`;
  
  // Build GRI 6 analysis
  const gri6 = primary.isOther 
    ? `Within heading ${heading}, the product falls under the "Other" subheading because it does not match any specific carve-out codes.`
    : `The specific subheading ${primary.htsCodeFormatted} provides for "${primary.shortDescription}".`;
  
  // Carve-out exclusions
  const exclusions = primary.otherExclusions || [];
  
  // Confidence factors
  const factors = [
    primary.scoringFactors.keywordMatch > 20 ? `Strong keyword match (+${primary.scoringFactors.keywordMatch})` : null,
    primary.scoringFactors.materialMatch > 0 ? `Material match (${result.detectedMaterial} → Chapter ${chapter})` : null,
    primary.isOther && primary.otherExclusions?.length ? `"Other" verified via ${primary.otherExclusions.length} exclusions` : null,
    primary.scoringFactors.hierarchyCoherence > 5 ? `Hierarchy coherence (+${primary.scoringFactors.hierarchyCoherence})` : null,
  ].filter(Boolean) as string[];
  
  const fullJustification = [
    '## GRI 1 - Terms of Headings',
    gri1,
    '',
    '## GRI 6 - Subheading Classification',
    gri6,
    '',
    exclusions.length > 0 ? '## Specific Carve-Out Exclusions' : '',
    ...exclusions.map(e => `- ✓ Not "${e}" - product does not match this specific category`),
    '',
    '## Confidence Factors',
    ...factors.map(f => `- ${f}`),
    '',
    `**Total Confidence: ${primary.confidence}%**`,
  ].filter(Boolean).join('\n');
  
  return {
    gri1Analysis: gri1,
    gri6Analysis: gri6,
    carveOutExclusions: exclusions,
    confidenceFactors: factors,
    fullJustification,
  };
}

