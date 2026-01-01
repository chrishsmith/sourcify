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
// HTS CHAPTER DESCRIPTIONS (Not in database, stored here for reference)
// ═══════════════════════════════════════════════════════════════════════════════

const CHAPTER_DESCRIPTIONS: Record<string, string> = {
  '01': 'Live animals',
  '02': 'Meat and edible meat offal',
  '03': 'Fish and crustaceans, molluscs and other aquatic invertebrates',
  '04': 'Dairy produce; birds\' eggs; natural honey; edible products of animal origin',
  '05': 'Products of animal origin, not elsewhere specified or included',
  '06': 'Live trees and other plants; bulbs, roots and the like; cut flowers and ornamental foliage',
  '07': 'Edible vegetables and certain roots and tubers',
  '08': 'Edible fruit and nuts; peel of citrus fruit or melons',
  '09': 'Coffee, tea, maté and spices',
  '10': 'Cereals',
  '11': 'Products of the milling industry; malt; starches; inulin; wheat gluten',
  '12': 'Oil seeds and oleaginous fruits; miscellaneous grains, seeds and fruit',
  '13': 'Lac; gums, resins and other vegetable saps and extracts',
  '14': 'Vegetable plaiting materials; vegetable products not elsewhere specified',
  '15': 'Animal or vegetable fats and oils and their cleavage products',
  '16': 'Preparations of meat, of fish or of crustaceans, molluscs or other aquatic invertebrates',
  '17': 'Sugars and sugar confectionery',
  '18': 'Cocoa and cocoa preparations',
  '19': 'Preparations of cereals, flour, starch or milk; pastrycooks\' products',
  '20': 'Preparations of vegetables, fruit, nuts or other parts of plants',
  '21': 'Miscellaneous edible preparations',
  '22': 'Beverages, spirits and vinegar',
  '23': 'Residues and waste from the food industries; prepared animal fodder',
  '24': 'Tobacco and manufactured tobacco substitutes',
  '25': 'Salt; sulfur; earths and stone; plastering materials, lime and cement',
  '26': 'Ores, slag and ash',
  '27': 'Mineral fuels, mineral oils and products of their distillation',
  '28': 'Inorganic chemicals; organic or inorganic compounds of precious metals',
  '29': 'Organic chemicals',
  '30': 'Pharmaceutical products',
  '31': 'Fertilizers',
  '32': 'Tanning or dyeing extracts; tannins and their derivatives; dyes, pigments',
  '33': 'Essential oils and resinoids; perfumery, cosmetic or toilet preparations',
  '34': 'Soap, organic surface-active agents, washing preparations, lubricating preparations',
  '35': 'Albuminoidal substances; modified starches; glues; enzymes',
  '36': 'Explosives; pyrotechnic products; matches; pyrophoric alloys',
  '37': 'Photographic or cinematographic goods',
  '38': 'Miscellaneous chemical products',
  '39': 'Plastics and articles thereof',
  '40': 'Rubber and articles thereof',
  '41': 'Raw hides and skins (other than furskins) and leather',
  '42': 'Articles of leather; saddlery and harness; travel goods, handbags',
  '43': 'Furskins and artificial fur; manufactures thereof',
  '44': 'Wood and articles of wood; wood charcoal',
  '45': 'Cork and articles of cork',
  '46': 'Manufactures of straw, of esparto or of other plaiting materials',
  '47': 'Pulp of wood or of other fibrous cellulosic material',
  '48': 'Paper and paperboard; articles of paper pulp, of paper or of paperboard',
  '49': 'Printed books, newspapers, pictures and other products of the printing industry',
  '50': 'Silk',
  '51': 'Wool, fine or coarse animal hair; horsehair yarn and woven fabric',
  '52': 'Cotton',
  '53': 'Other vegetable textile fibers; paper yarn and woven fabrics of paper yarn',
  '54': 'Man-made filaments; strip and the like of man-made textile materials',
  '55': 'Man-made staple fibers',
  '56': 'Wadding, felt and nonwovens; special yarns; twine, cordage, ropes and cables',
  '57': 'Carpets and other textile floor coverings',
  '58': 'Special woven fabrics; tufted textile fabrics; lace; tapestries; trimmings',
  '59': 'Impregnated, coated, covered or laminated textile fabrics',
  '60': 'Knitted or crocheted fabrics',
  '61': 'Articles of apparel and clothing accessories, knitted or crocheted',
  '62': 'Articles of apparel and clothing accessories, not knitted or crocheted',
  '63': 'Other made up textile articles; sets; worn clothing and worn textile articles',
  '64': 'Footwear, gaiters and the like; parts of such articles',
  '65': 'Headgear and parts thereof',
  '66': 'Umbrellas, sun umbrellas, walking sticks, seat-sticks, whips, riding-crops',
  '67': 'Prepared feathers and down and articles made of feathers or of down',
  '68': 'Articles of stone, plaster, cement, asbestos, mica or similar materials',
  '69': 'Ceramic products',
  '70': 'Glass and glassware',
  '71': 'Natural or cultured pearls, precious or semiprecious stones, precious metals',
  '72': 'Iron and steel',
  '73': 'Articles of iron or steel',
  '74': 'Copper and articles thereof',
  '75': 'Nickel and articles thereof',
  '76': 'Aluminum and articles thereof',
  '78': 'Lead and articles thereof',
  '79': 'Zinc and articles thereof',
  '80': 'Tin and articles thereof',
  '81': 'Other base metals; cermets; articles thereof',
  '82': 'Tools, implements, cutlery, spoons and forks, of base metal',
  '83': 'Miscellaneous articles of base metal',
  '84': 'Nuclear reactors, boilers, machinery and mechanical appliances',
  '85': 'Electrical machinery and equipment and parts thereof',
  '86': 'Railway or tramway locomotives, rolling stock, track fixtures and fittings',
  '87': 'Vehicles other than railway or tramway rolling stock',
  '88': 'Aircraft, spacecraft, and parts thereof',
  '89': 'Ships, boats and floating structures',
  '90': 'Optical, photographic, cinematographic, measuring, checking, precision instruments',
  '91': 'Clocks and watches and parts thereof',
  '92': 'Musical instruments; parts and accessories of such articles',
  '93': 'Arms and ammunition; parts and accessories thereof',
  '94': 'Furniture; bedding, mattresses, cushions and similar stuffed furnishings',
  '95': 'Toys, games and sports requisites; parts and accessories thereof',
  '96': 'Miscellaneous manufactured articles',
  '97': 'Works of art, collectors\' pieces and antiques',
  '98': 'Special classification provisions',
  '99': 'Temporary legislation; temporary modifications; additional import restrictions',
};

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
      groupings?: string[]; // Parent groupings like "Men's or boys':"
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
  headingDescription?: string;
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
 * 
 * IMPORTANT: We must check more specific terms BEFORE less specific terms!
 * e.g., "tshirt" must be checked before "shirt" because "tshirt" contains "shirt"
 * 
 * Strategy: Sort product types by length (longest first) to ensure specificity
 */
function detectProductType(description: string): { type: string | null; headings: string[]; keywords: string[] } {
  const descLower = description.toLowerCase();
  
  // Sort product types by length (longest first) to match most specific term
  // This prevents "shirt" from matching when user said "tshirt"
  const sortedTypes = Object.entries(PRODUCT_TYPE_HINTS)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [productType, hints] of sortedTypes) {
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
 * Calculate penalty for unmentioned specificity in HTS description
 * 
 * When the HTS code has specific requirements that weren't mentioned in the user's query,
 * we reduce confidence. This prevents 100% confidence on overly-specific matches.
 * 
 * Examples:
 * - User: "cotton tshirt for boys"
 * - HTS: "T-shirts, all white, short hemmed sleeves, hemmed bottom, crew or round neckline..."
 * - The user didn't mention: "all white", "short hemmed sleeves", "hemmed bottom", etc.
 * - These are ASSUMPTIONS, not confirmations → reduce confidence
 */
function calculateUnmentionedSpecificityPenalty(
  htsDescLower: string,
  productTerms: string[],
  userQueryLower: string
): number {
  let penalty = 0;
  
  // Specific qualifiers that indicate restrictive requirements
  // These reduce confidence when present in HTS but not in user query
  const specificQualifiers = [
    // Color/appearance
    { pattern: /\ball white\b/, term: 'white', penalty: 15 },
    { pattern: /\bwhite\b/, term: 'white', penalty: 10 },
    { pattern: /\bblack\b/, term: 'black', penalty: 10 },
    { pattern: /\bprinted\b/, term: 'print', penalty: 8 },
    { pattern: /\bdyed\b/, term: 'dye', penalty: 6 },
    
    // Garment features
    { pattern: /\bshort hemmed sleeves?\b/, term: 'short sleeve', penalty: 10 },
    { pattern: /\blong sleeves?\b/, term: 'long sleeve', penalty: 10 },
    { pattern: /\bsleeveless\b/, term: 'sleeveless', penalty: 10 },
    { pattern: /\bhemmed bottom\b/, term: 'hemmed', penalty: 8 },
    { pattern: /\bcrew.{0,5}neckline\b/, term: 'crew neck', penalty: 8 },
    { pattern: /\bv.?neck\b/, term: 'v-neck', penalty: 8 },
    { pattern: /\bround neckline\b/, term: 'round neck', penalty: 8 },
    { pattern: /\bwithout pockets\b/, term: 'pocket', penalty: 10 },
    { pattern: /\bwith pockets\b/, term: 'pocket', penalty: 8 },
    { pattern: /\bwithout.{0,10}trim\b/, term: 'trim', penalty: 8 },
    { pattern: /\bwithout.{0,10}embroidery\b/, term: 'embroider', penalty: 8 },
    { pattern: /\bthermal\b/, term: 'thermal', penalty: 12 },
    { pattern: /\bknitted\b/, term: 'knit', penalty: 5 },
    { pattern: /\bcrocheted\b/, term: 'crochet', penalty: 8 },
    
    // Size/dimensions
    { pattern: /\bover \d+/, term: 'over', penalty: 12 },
    { pattern: /\bnot over \d+/, term: 'not over', penalty: 12 },
    { pattern: /\bvalued over\b/, term: 'value', penalty: 10 },
    { pattern: /\bvalued not over\b/, term: 'value', penalty: 10 },
    
    // Material specifics (when not in query)
    { pattern: /\b100.?percent\b/, term: '100%', penalty: 8 },
    { pattern: /\bchiefly of\b/, term: 'chiefly', penalty: 6 },
  ];
  
  for (const qualifier of specificQualifiers) {
    // Check if HTS has this qualifier
    if (!qualifier.pattern.test(htsDescLower)) continue;
    
    // Check if user mentioned anything related to this qualifier
    const userMentioned = 
      userQueryLower.includes(qualifier.term) ||
      productTerms.some(term => term.includes(qualifier.term) || qualifier.term.includes(term));
    
    // If HTS has it but user didn't mention it, add penalty
    if (!userMentioned) {
      penalty += qualifier.penalty;
    }
  }
  
  // Cap penalty at 40 to avoid completely zeroing out good matches
  return Math.min(40, penalty);
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
 * 
 * HTS codes have two types of hierarchy:
 * 1. Code hierarchy: Chapter (61) → Heading (6109) → Subheading (6109.10) → Tariff (6109.10.00.04)
 * 2. Parent groupings: Indent text like "Men's or boys':" that groups statistical codes
 * 
 * Both should be visible in the classification path for accuracy.
 */
async function buildFullDescription(code: string): Promise<{ 
  full: string; 
  short: string; 
  path: { codes: string[]; descriptions: string[]; groupings?: string[]; chapterDescription?: string } 
}> {
  const hierarchy = await getHtsHierarchy(code);
  
  // Get chapter description from our lookup table
  const chapter = code.slice(0, 2);
  const chapterDescription = CHAPTER_DESCRIPTIONS[chapter] || `Chapter ${chapter}`;
  
  const codes: string[] = [];
  const descriptions: string[] = [];
  const groupings: string[] = []; // Separate array for groupings like "Men's or boys':"
  const segments: string[] = [];
  
  for (const node of hierarchy) {
    codes.push(node.codeFormatted);
    
    // Capture parent groupings (the "Other:", "Men's or boys':" rows)
    // These are critical for accurate classification display
    if (node.parentGroupings && node.parentGroupings.length > 0) {
      for (const grouping of node.parentGroupings) {
        const cleaned = grouping.replace(/:$/, '').trim();
        if (cleaned && !groupings.includes(cleaned) && cleaned.toLowerCase() !== 'other') {
          groupings.push(cleaned);
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
    path: { codes, descriptions, groupings, chapterDescription },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING ALGORITHM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate score for a candidate HTS code
 */
function calculateScore(
  userQueryLower: string,  // Original user query (lowercase)
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
    headingDescription?: string | null; // Full heading description (e.g., "T-shirts, singlets, tank tops...")
    subheadingDescription?: string | null; // 6-digit subheading description (e.g., "Of man-made fibers")
    parentGroupings?: string[]; // Intermediate groupings (e.g., "Men's or boys'", "Other T-shirts")
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
  
  // 1. KEYWORD MATCH (0-60 points)
  const descLower = candidate.description.toLowerCase();
  const keywordsLower = candidate.keywords.map(k => k.toLowerCase());
  
  // EXACT MATCH DETECTION: When the HTS description literally names the product
  // e.g., "confetti" → "Confetti, paper spirals..." = NEAR-PERFECT MATCH
  // This is the strongest possible signal and should result in HIGH confidence
  
  // Check if description STARTS with the product term (strongest signal)
  const descFirstWord = descLower.split(/[\s,;:]+/)[0] || '';
  const startsWithProduct = productTerms.some(term => 
    descFirstWord === term || descFirstWord === term + 's' || term === descFirstWord + 's'
  );
  
  if (startsWithProduct) {
    factors.keywordMatch += 50; // Very high boost - description starts with product name
  } else {
    // Check if product term appears as a primary item in a comma-separated list
    const descPrimaryTerms = descLower.split(/[,;:]/).map(s => s.trim().split(/\s+/)[0] || '').filter(Boolean);
    const hasExactPrimaryMatch = productTerms.some(term => 
      descPrimaryTerms.some(primary => primary === term || primary === term + 's')
    );
    
    if (hasExactPrimaryMatch) {
      factors.keywordMatch += 35; // Major boost for exact primary match
    }
  }
  
  // Check keyword array matches
  const keywordHits = productTerms.filter(term => 
    keywordsLower.some(kw => kw.includes(term) || term.includes(kw))
  );
  factors.keywordMatch += Math.min(15, keywordHits.length * 6);
  
  // Check description matches (general)
  const descHits = productTerms.filter(term => descLower.includes(term));
  factors.keywordMatch += Math.min(10, descHits.length * 4);
  
  factors.keywordMatch = Math.min(60, factors.keywordMatch);
  
  // 2. MATERIAL MATCH (0-30 points)
  if (productMaterial) {
    const materialChapters = getMaterialChapters(productMaterial);
    if (materialChapters.includes(candidate.chapter)) {
      factors.materialMatch = 30;
    } else if (materialChapters.length > 0) {
      // Material mismatch - penalize
      factors.penalties -= 20;
    }
    
    // 2a. DESCRIPTION MATERIAL MISMATCH
    // When user specifies a material (e.g., "cotton") but the HTS description 
    // specifies a DIFFERENT material (e.g., "Of man-made fibers"), that's a major red flag
    // 
    // CRITICAL: Check not just the leaf description, but also:
    // - Parent description (immediate parent)
    // - Subheading description (6-digit level, often contains material)
    // e.g., code 6205.30.20.40 has "Of man-made fibers" at the 6205.30 level
    const conflictingMaterials = [
      { pattern: /man-made fibers?|synthetic|polyester|nylon|acrylic/i, conflicts: ['cotton', 'wool', 'silk', 'linen'] },
      { pattern: /\bcotton\b/i, conflicts: ['polyester', 'nylon', 'synthetic', 'man-made'] },
      { pattern: /\bwool\b/i, conflicts: ['cotton', 'polyester', 'synthetic', 'man-made'] },
      { pattern: /\bsilk\b/i, conflicts: ['cotton', 'polyester', 'synthetic', 'man-made'] },
    ];
    
    // Combine all relevant descriptions for material checking
    const allDescriptions = [
      descLower,
      candidate.parentDescription?.toLowerCase() || '',
      candidate.subheadingDescription?.toLowerCase() || '',
    ].join(' ');
    
    const materialLower = productMaterial.toLowerCase();
    for (const check of conflictingMaterials) {
      // If ANY level of HTS hierarchy mentions this material category
      if (check.pattern.test(allDescriptions)) {
        // And user's material conflicts with it
        if (check.conflicts.some(c => materialLower.includes(c))) {
          factors.penalties -= 50; // HEAVY penalty for material mismatch anywhere in hierarchy
          console.log(`[V10 Scoring] Material conflict for ${candidate.code}: user="${productMaterial}" vs HTS="${allDescriptions.match(check.pattern)?.[0]}"`);
          break;
        }
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // PRODUCT TYPE PRIORITY SCORING - THE MOST IMPORTANT FACTOR
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // The HTS hierarchy is structured as:
  //   HEADING (4-digit) = WHAT IS THE PRODUCT?  (e.g., 6109 = T-shirts, 6205 = Shirts)
  //   SUBHEADING (6-digit) = WHAT MATERIAL?     (e.g., 6109.10 = Of cotton)
  //   STATISTICAL (8-10 digit) = WHO/SPECIFICS  (e.g., 6109.10.00.14 = Boys')
  //
  // Getting the heading wrong means the ENTIRE classification is wrong.
  // A cotton t-shirt classified under "shirts" (6205) instead of "t-shirts" (6109)
  // is fundamentally incorrect, regardless of material or demographic match.
  //
  // Therefore: PRODUCT TYPE (heading) must be a GATING function, not just a factor.
  // If product type is detected AND the candidate is in the WRONG heading,
  // apply a SEVERE penalty that cannot be overcome by other factors.
  //
  // This is NOT hardcoding - it's using domain knowledge about how HTS works.
  // The PRODUCT_TYPE_HINTS map is general knowledge (t-shirts → heading 6109),
  // not specific product rules.
  // ═══════════════════════════════════════════════════════════════════════════════
  
  if (productTypeHints.type && productTypeHints.headings.length > 0 && candidate.heading) {
    // Check if candidate is in one of the expected headings for this product type
    const isInExpectedHeading = productTypeHints.headings.includes(candidate.heading);
    
    // Also check heading description directly - more robust for edge cases
    // e.g., "tshirt" should match "T-shirts, singlets, tank tops..."
    let headingDescriptionMatches = false;
    if (candidate.headingDescription) {
      const headingLower = candidate.headingDescription.toLowerCase();
      const typeVariants = [
        productTypeHints.type,
        productTypeHints.type.replace('-', ''),
        productTypeHints.type + 's',
        productTypeHints.type.replace('s', ''),
      ];
      headingDescriptionMatches = typeVariants.some(v => headingLower.includes(v));
    }
    
    if (isInExpectedHeading || headingDescriptionMatches) {
      // CORRECT product type - significant boost
      factors.hierarchyCoherence += 30;
      console.log(`[V10 Scoring] Product type MATCH for ${candidate.code}: "${productTypeHints.type}" → heading ${candidate.heading}`);
    } else {
      // WRONG product type - this is a fundamental misclassification
      // Apply a severe penalty that effectively caps confidence at ~50-60%
      factors.penalties -= 50;
      console.log(`[V10 Scoring] Product type MISMATCH for ${candidate.code}: "${productTypeHints.type}" expects headings [${productTypeHints.headings.join(', ')}], got ${candidate.heading}`);
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
  
  // 4. HIERARCHY COHERENCE (0-25 points)
  // Check both parent description and heading description
  if (candidate.parentDescription) {
    const parentLower = candidate.parentDescription.toLowerCase();
    const parentHits = productTerms.filter(term => parentLower.includes(term));
    factors.hierarchyCoherence = Math.min(10, parentHits.length * 4);
  }
  
  // 4b. ADDITIONAL HEADING DESCRIPTION MATCHING
  // This provides a secondary boost when product terms appear directly in the heading description.
  // This works alongside the product type priority scoring (above) to handle cases
  // where the product type wasn't detected but terms still match the heading.
  // e.g., if user says "singlet" (not in PRODUCT_TYPE_HINTS), we still want to boost 6109.
  if (candidate.headingDescription && !productTypeHints.type) {
    // Only apply this if product type wasn't detected (avoids double-counting)
    const headingLower = candidate.headingDescription.toLowerCase();
    
    for (const term of productTerms) {
      const termVariants = [
        term,
        term.replace('-', ''),
        term.replace('s', ''),
        term + 's',
      ];
      
      for (const variant of termVariants) {
        if (headingLower.includes(variant)) {
          factors.hierarchyCoherence += 15;
          break;
        }
      }
    }
    
    factors.hierarchyCoherence = Math.min(45, factors.hierarchyCoherence);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // USER SEGMENT MATCHING - Prefer 10-digit codes when user specifies demographics
  // ═══════════════════════════════════════════════════════════════════════════════
  // 
  // HTS 10-digit statistical codes often specify demographics: boys, men, women, girls
  // If user says "cotton tshirt for boys", we should prefer:
  //   6109.10.00.14 "Boys' (338)" over 6109.10.00 "Of cotton"
  // 
  // Check both the description AND parentGroupings for segment matches
  const userSegments = ['boys', 'boy', 'girls', 'girl', 'men', 'mens', 'women', 'womens'];
  const detectedSegment = productTerms.find(term => userSegments.includes(term.toLowerCase()));
  
  if (detectedSegment) {
    const segmentLower = detectedSegment.toLowerCase();
    const allDescText = [
      descLower,
      ...(candidate.parentGroupings || []).map(g => g.toLowerCase())
    ].join(' ');
    
    // Check if this code matches the user's demographic
    const segmentVariants = [segmentLower, segmentLower + "'s", segmentLower.replace('s', '') + "'s"];
    const matchesSegment = segmentVariants.some(v => allDescText.includes(v));
    
    if (matchesSegment) {
      // This code specifically matches the user's demographic - big boost!
      factors.keywordMatch += 25;
      console.log(`[V10 Scoring] Segment match for ${candidate.code}: "${detectedSegment}" found in "${allDescText.slice(0, 50)}..."`);
    } else if (candidate.code.length === 8) {
      // This is an 8-digit code and user specified a segment
      // They likely want a more specific 10-digit code, so penalize
      factors.penalties -= 15;
      console.log(`[V10 Scoring] Segment preference penalty for ${candidate.code}: user wants "${detectedSegment}" but code is 8-digit general`);
    }
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
  
  // 5b. UNMENTIONED SPECIFICITY PENALTY
  // When HTS description has specific qualifiers that the user didn't mention,
  // we should reduce confidence. The more unmentioned specifics, the lower the confidence.
  // 
  // Examples: "all white", "without pockets", "short hemmed sleeves", "thermal"
  // If user just says "cotton tshirt for boys" but HTS says "all white, without pockets",
  // that's a lot of assumptions we're making!
  const specificityPenalty = calculateUnmentionedSpecificityPenalty(
    descLower,
    productTerms,
    userQueryLower
  );
  factors.penalties -= specificityPenalty;
  
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
          // Two-tier filtering: strict threshold for primary, lenient for alternatives
          // This ensures we show diverse options (different chapters/materials)
          const PRIMARY_THRESHOLD = 0.4;    // High quality for main result
          const ALTERNATIVE_THRESHOLD = 0.2; // Include diverse options even with lower match
          
          // Get all results above the lenient threshold
          const allViable = semanticResults.filter(r => r.similarity >= ALTERNATIVE_THRESHOLD);
          
          // Ensure chapter diversity - keep at least one result per chapter if above alt threshold
          const chapterBest = new Map<string, typeof semanticResults[0]>();
          for (const r of allViable) {
            const chapter = r.code.substring(0, 2);
            const existing = chapterBest.get(chapter);
            if (!existing || r.similarity > existing.similarity) {
              chapterBest.set(chapter, r);
            }
          }
          
          // Start with high-quality results, then add diverse chapter results
          const highQuality = semanticResults.filter(r => r.similarity >= PRIMARY_THRESHOLD);
          const diverseResults = [...highQuality];
          
          // Add best result from each chapter not already represented
          for (const [chapter, result] of chapterBest) {
            if (!diverseResults.some(r => r.code.substring(0, 2) === chapter)) {
              diverseResults.push(result);
            }
          }
          
          // Sort by similarity (best first)
          diverseResults.sort((a, b) => b.similarity - a.similarity);
          
          console.log(`[V10] Similarity filtering: ${highQuality.length} high-quality (>=${PRIMARY_THRESHOLD}), ${chapterBest.size} chapters represented`);
          
          if (diverseResults.length > 0) {
            // Convert semantic results to the format we need
            const codes = diverseResults.map(r => r.code);
            allResults = await prisma.htsCode.findMany({
              where: { code: { in: codes } },
            });
            
            // Sort by similarity score from semantic search
            const similarityMap = new Map(diverseResults.map(r => [r.code, r.similarity]));
            allResults.sort((a, b) => 
              (similarityMap.get(b.code) || 0) - (similarityMap.get(a.code) || 0)
            );
            
            usedSemanticSearch = true;
            console.log(`[V10] Semantic search found ${allResults.length} candidates (${diverseResults.length} diverse from ${semanticResults.length} total)`);
          } else {
            console.log(`[V10] All semantic results below ${ALTERNATIVE_THRESHOLD} threshold, using keyword fallback`);
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
  
  // Also get heading descriptions (4-digit) for proper hierarchy matching
  // This is critical for differentiating 6105 (shirts) from 6109 (t-shirts)
  const headingCodes = [...new Set(allResults.map(r => r.heading).filter(Boolean) as string[])];
  const headingMap = new Map<string, string>();
  
  if (headingCodes.length > 0) {
    const headings = await prisma.htsCode.findMany({
      where: { code: { in: headingCodes } },
      select: { code: true, description: true },
    });
    for (const h of headings) {
      headingMap.set(h.code, h.description);
    }
  }
  
  // Get subheading descriptions (6-digit) for material verification
  // This is CRITICAL: material specifications like "Of man-made fibers" often appear at the subheading level
  // e.g., 6205.30 = "Of man-made fibers" vs 6205.20 = "Of cotton"
  const subheadingCodes = [...new Set(allResults.map(r => r.code.slice(0, 6)).filter(sh => sh.length === 6))];
  const subheadingMap = new Map<string, string>();
  
  if (subheadingCodes.length > 0) {
    const subheadings = await prisma.htsCode.findMany({
      where: { code: { in: subheadingCodes } },
      select: { code: true, description: true },
    });
    for (const sh of subheadings) {
      subheadingMap.set(sh.code, sh.description);
    }
    console.log(`[V10] Loaded ${subheadings.length} subheading descriptions for material verification`);
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
    
    // Get subheading code (first 6 digits)
    const subheadingCode = result.code.slice(0, 6);
    
    const factors = calculateScore(description.toLowerCase(), searchTerms, detectedMaterial, productTypeHints, {
      code: result.code,
      description: result.description,
      keywords: result.keywords,
      chapter: result.chapter,
      heading: result.heading,
      parentDescription: result.parentCode ? parentMap.get(result.parentCode) : null,
      headingDescription: result.heading ? headingMap.get(result.heading) : null,
      subheadingDescription: subheadingMap.get(subheadingCode) || null,
      parentGroupings: result.parentGroupings,
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
    breakdown?: Array<{ program: string; rate: number; description?: string }>;
  } | null = null;
  
  if (origin) {
    try {
      // IMPORTANT: Statistical codes (10-digit) often don't have their own generalRate
      // They inherit from their parent tariff_line (8-digit) code
      let effectiveGeneralRate = primary.generalRate;
      let effectiveSpecialRates = primary.specialRates;
      
      if (!effectiveGeneralRate && primary.parentCode) {
        // Look up parent code to inherit rate
        const parentCode = await prisma.htsCode.findFirst({
          where: { code: primary.parentCode },
          select: { generalRate: true, specialRates: true },
        });
        
        if (parentCode?.generalRate) {
          effectiveGeneralRate = parentCode.generalRate;
          effectiveSpecialRates = parentCode.specialRates || effectiveSpecialRates;
          console.log(`[V10] Inherited rate from parent ${primary.parentCode}: ${effectiveGeneralRate}`);
        }
      }
      
      const tariff = await getEffectiveTariff(origin, primary.code, {
        baseMfnRate: effectiveGeneralRate ? parseFloat(effectiveGeneralRate) || 0 : 0,
      });
      
      // Build detailed additional duties breakdown
      const additionalParts: string[] = [];
      
      // IEEPA Breakdown (baseline, fentanyl, reciprocal)
      if (tariff.ieepaBreakdown.baseline > 0) {
        additionalParts.push(`+${tariff.ieepaBreakdown.baseline}% (IEEPA Baseline)`);
      }
      if (tariff.ieepaBreakdown.fentanyl > 0) {
        additionalParts.push(`+${tariff.ieepaBreakdown.fentanyl}% (Fentanyl)`);
      }
      if (tariff.ieepaBreakdown.reciprocal > 0) {
        additionalParts.push(`+${tariff.ieepaBreakdown.reciprocal}% (Reciprocal)`);
      }
      
      // Section 301 (China)
      if (tariff.section301Rate > 0) {
        const listInfo = tariff.section301Lists.length > 0 
          ? ` (${tariff.section301Lists.join(', ')})`
          : '';
        additionalParts.push(`+${tariff.section301Rate}% (Section 301${listInfo})`);
      }
      
      // Section 232 (Steel/Aluminum)
      if (tariff.section232Rate > 0) {
        additionalParts.push(`+${tariff.section232Rate}% (Section 232)`);
      }
      
      // Build structured breakdown for UI display
      const breakdown: Array<{ program: string; rate: number; description?: string }> = [];
      
      if (tariff.ieepaBreakdown.baseline > 0) {
        breakdown.push({ program: 'IEEPA Baseline', rate: tariff.ieepaBreakdown.baseline, description: 'April 2025 universal tariff' });
      }
      if (tariff.ieepaBreakdown.fentanyl > 0) {
        breakdown.push({ program: 'Fentanyl Tariff', rate: tariff.ieepaBreakdown.fentanyl, description: 'IEEPA fentanyl emergency tariff' });
      }
      if (tariff.ieepaBreakdown.reciprocal > 0) {
        breakdown.push({ program: 'Reciprocal Tariff', rate: tariff.ieepaBreakdown.reciprocal, description: 'Country-specific reciprocal tariff' });
      }
      if (tariff.section301Rate > 0) {
        const listInfo = tariff.section301Lists.length > 0 ? tariff.section301Lists.join(', ') : '';
        breakdown.push({ program: 'Section 301', rate: tariff.section301Rate, description: listInfo ? `China ${listInfo}` : 'China trade action' });
      }
      if (tariff.section232Rate > 0) {
        breakdown.push({ program: 'Section 232', rate: tariff.section232Rate, description: 'Steel/Aluminum national security tariff' });
      }
      
      dutyInfo = {
        baseMfn: effectiveGeneralRate || 'N/A',
        additional: additionalParts.length > 0 ? additionalParts.join(', ') : 'None',
        effective: `${tariff.effectiveRate.toFixed(1)}%`,
        special: effectiveSpecialRates || undefined,
        breakdown: breakdown.length > 0 ? breakdown : undefined,
      };
    } catch (err) {
      console.error('[V10] Tariff lookup error:', err);
    }
  }
  
  tariffTime = Date.now() - tariffStart;
  
  // Build full description path for primary
  const primaryDesc = await buildFullDescription(primary.code);
  
  // Build alternatives with DIVERSITY: prefer candidates from different chapters/headings
  // This ensures users see multiple interpretations, not just variations of the same code
  const buildDiverseAlternatives = (): Alternative[] => {
    const result: Alternative[] = [];
    const usedChapters = new Set<string>([primary.chapter]);
    const usedHeadings = new Set<string>([primary.code.substring(0, 4)]);
    
    // First pass: prioritize alternatives from DIFFERENT chapters
    for (const c of topCandidates.slice(1)) {
      if (result.length >= 10) break;
      if (!usedChapters.has(c.chapter)) {
        usedChapters.add(c.chapter);
        result.push(c);
      }
    }
    
    // Second pass: add alternatives from different HEADINGS within same chapters
    for (const c of topCandidates.slice(1)) {
      if (result.length >= 10) break;
      const heading = c.code.substring(0, 4);
      if (!usedHeadings.has(heading) && !result.includes(c)) {
        usedHeadings.add(heading);
        result.push(c);
      }
    }
    
    // Third pass: fill remaining slots with highest-scoring candidates
    for (const c of topCandidates.slice(1)) {
      if (result.length >= 10) break;
      if (!result.includes(c)) {
        result.push(c);
      }
    }
    
    // Sort by confidence (score) descending - highest confidence first
    result.sort((a, b) => b.score - a.score);
    
    // Map to Alternative format with ranks reflecting the sorted order
    return result.map((c, i) => {
      // Generate material note if different chapter
      let materialNote: string | undefined;
      if (c.chapter !== primary.chapter) {
        const chapterMaterial = Object.entries(MATERIAL_CHAPTERS)
          .find(([_, chapters]) => chapters.includes(c.chapter))?.[0];
        if (chapterMaterial) {
          materialNote = `If your product is ${chapterMaterial}`;
        }
      }
      
      // Get heading description from the map we already built
      const heading = c.code.substring(0, 4);
      const headingDesc = headingMap.get(heading) || '';
      
      return {
        rank: i + 2,
        htsCode: c.code,
        htsCodeFormatted: c.codeFormatted,
        confidence: c.score,
        description: c.description,
        fullDescription: c.fullDescription,
        chapter: c.chapter,
        chapterDescription: CHAPTER_DESCRIPTIONS[c.chapter] || `Chapter ${c.chapter}`,
        headingDescription: headingDesc,
        materialNote,
      };
    });
  };
  
  const alternatives = buildDiverseAlternatives();
  
  // Count remaining candidates
  const showMore = Math.max(0, uniqueCandidates.length - 11);
  
  const totalTime = Date.now() - startTime;
  console.log(`[V10] Classification complete in ${totalTime}ms (search: ${searchTime}ms, scoring: ${scoringTime}ms, tariff: ${tariffTime}ms)`);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // LOW CONFIDENCE HANDLING: Ask for clarification when we're not confident
  // This is better than returning garbage results
  // ─────────────────────────────────────────────────────────────────────────────
  
  const CONFIDENCE_THRESHOLD = 40; // Below this, consider asking for clarification
  const CONFIDENCE_FLOOR = 15;     // Minimum displayable confidence (prevents 0%)
  
  // Apply confidence floor to prevent displaying 0% or very low scores
  // This acknowledges uncertainty without showing absurdly low numbers
  const displayConfidence = Math.max(CONFIDENCE_FLOOR, primary.score);
  
  let needsClarification: ClassifyV10Result['needsClarification'] = undefined;
  
  // Determine what kind of clarification is most useful
  const hasLowConfidence = primary.score < CONFIDENCE_THRESHOLD;
  const hasDiverseAlternatives = alternatives.some(a => a.chapter !== primary.chapter);
  const noMaterialDetected = !detectedMaterial;
  
  if (hasLowConfidence) {
    console.log(`[V10] Low confidence (${primary.score}%) - determining best clarification approach`);
    
    // Priority 1: If no material detected and alternatives span multiple material-chapters
    if (noMaterialDetected && hasDiverseAlternatives) {
      // Find which material-chapters are represented in alternatives
      const representedMaterials = new Set<string>();
      for (const alt of alternatives) {
        const material = Object.entries(MATERIAL_CHAPTERS)
          .find(([_, chapters]) => chapters.includes(alt.chapter))?.[0];
        if (material) representedMaterials.add(material);
      }
      
      if (representedMaterials.size > 1) {
        // Multiple materials possible - ask about material
        const materialOptions = [
          { value: 'plastic', label: 'Plastic', hint: 'Chapter 39' },
          { value: 'ceramic', label: 'Ceramic/Clay', hint: 'Chapter 69' },
          { value: 'metal', label: 'Metal', hint: 'Chapters 72-83' },
          { value: 'wood', label: 'Wood', hint: 'Chapter 44' },
          { value: 'glass', label: 'Glass', hint: 'Chapter 70' },
        ];
        
        needsClarification = {
          reason: 'material_ambiguous',
          question: `What material is your product made of?`,
          options: materialOptions,
        };
        console.log(`[V10] Clarification: material ambiguous (${[...representedMaterials].join(', ')})`);
      }
    }
    
    // Priority 2: If alternatives have different use cases (household vs commercial, etc.)
    // This handles cases like "indoor planter" which could be household OR hotel
    if (!needsClarification && hasDiverseAlternatives) {
      // Check if alternatives suggest different use contexts
      const primaryDesc = primary.description.toLowerCase();
      const hasUseAmbiguity = alternatives.some(alt => {
        const altDesc = alt.description.toLowerCase();
        // Detect household vs commercial ambiguity
        const primaryIsHousehold = primaryDesc.includes('household') || primaryDesc.includes('domestic');
        const primaryIsCommercial = primaryDesc.includes('hotel') || primaryDesc.includes('restaurant') || primaryDesc.includes('commercial');
        const altIsHousehold = altDesc.includes('household') || altDesc.includes('domestic');
        const altIsCommercial = altDesc.includes('hotel') || altDesc.includes('restaurant') || altDesc.includes('commercial');
        return (primaryIsHousehold && altIsCommercial) || (primaryIsCommercial && altIsHousehold);
      });
      
      if (hasUseAmbiguity) {
        needsClarification = {
          reason: 'use_ambiguous',
          question: `What is the intended use of your product?`,
          options: [
            { value: 'household', label: 'Household/Residential', hint: 'For home use' },
            { value: 'commercial', label: 'Commercial/Industrial', hint: 'For hotels, restaurants, businesses' },
          ],
        };
        console.log(`[V10] Clarification: use context ambiguous (household vs commercial)`);
      }
    }
    
    // Priority 3: Generic low confidence - prompt for more details
    if (!needsClarification && primary.score < 25) {
      needsClarification = {
        reason: 'low_confidence',
        question: `We need more details to classify this product accurately. What is the primary material?`,
        options: [
          { value: 'plastic', label: 'Plastic', hint: 'Chapter 39' },
          { value: 'ceramic', label: 'Ceramic/Clay', hint: 'Chapter 69' },
          { value: 'metal', label: 'Metal', hint: 'Chapters 72-83' },
          { value: 'textile', label: 'Textile/Fabric', hint: 'Chapters 50-63' },
          { value: 'other', label: 'Other', hint: 'Please specify in description' },
        ],
      };
      console.log(`[V10] Clarification: very low confidence (${primary.score}%)`);
    }
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
      // Use displayConfidence (floored) instead of raw score to prevent showing 0%
      confidence: displayConfidence,
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

