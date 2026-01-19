/**
 * Duty Optimizer Service
 * 
 * Exhaustive HTS code analysis to find ALL potentially applicable codes.
 * Builds on top of V10 semantic search with AI-powered analysis layer.
 * 
 * Three-Layer Architecture:
 * 1. Layer 1: V10 semantic search + sibling expansion (fast, no AI)
 * 2. Layer 2: AI analysis - product interpretation, condition extraction, plain English
 * 3. Layer 3: Duty comparison and savings calculation
 * 
 * @module dutyOptimizer
 * @created January 2, 2026
 * @see docs/ARCHITECTURE_DUTY_OPTIMIZER.md
 */

import { prisma } from '@/lib/db';
import { getXAIClient } from '@/lib/xai';
import { 
  formatHtsCode, 
  normalizeHtsCode,
  getHtsSiblings,
  getHtsHierarchy,
} from './htsDatabase';
import { searchHtsBySemantic } from './htsEmbeddings';
import { getEffectiveTariff } from './tariffRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface DutyOptimizerInput {
  productDescription: string;
  countryOfOrigin: string;
  unitValue?: number;
  intendedUse?: 'household' | 'commercial' | 'industrial' | 'unknown';
  materialComposition?: string;
  maxResults?: number;
}

export interface ProductInterpretation {
  summary: string;
  material: string;
  use: string;
  valueCategory: string;
  keyFeatures: string[];
  potentialChapters: { chapter: string; reason: string }[];
}

export interface CodeCondition {
  condition: string;
  met: boolean | 'unknown';
  explanation: string;
  documentationNeeded?: string;
}

export interface ApplicableCode {
  htsCode: string;
  formattedCode: string;
  
  // Descriptions
  rawDescription: string;
  plainEnglishDescription: string;
  fullHierarchyDescription: string;
  
  // Applicability
  applicabilityScore: number;
  applicabilityReason: string;
  conditions: CodeCondition[];
  
  // Hierarchy
  chapter: string;
  chapterDescription: string;
  heading: string;
  headingDescription: string;
  
  // Duty info
  dutyBreakdown: {
    baseMfnRate: number;
    baseMfnDisplay: string;
    section301Rate: number;
    ieepaRate: number;
    fentanylRate: number;
    totalRate: number;
  };
  
  // Comparison
  savingsVsBest?: number;
  savingsVsWorst?: number;
}

export interface SmartQuestion {
  id: string;
  question: string;
  reason: string;
  options: {
    value: string;
    label: string;
    hint?: string;
    affectsCodeIds?: string[];
  }[];
}

export interface DutyOptimizerResult {
  success: boolean;
  analysisId: string;
  processingTimeMs: number;
  
  // Product interpretation
  productInterpretation: ProductInterpretation;
  
  // Questions (if needed)
  questions: SmartQuestion[];
  
  // All applicable codes
  applicableCodes: ApplicableCode[];
  
  // Summary
  summary: {
    totalCodesFound: number;
    bestRateCode: string;
    bestRate: number;
    worstRateCode: string;
    worstRate: number;
    potentialSavings: number;
    dollarSavingsAt10k: number;
  };
  
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER DESCRIPTIONS (shared with V10)
// ═══════════════════════════════════════════════════════════════════════════════

const CHAPTER_DESCRIPTIONS: Record<string, string> = {
  '01': 'Live animals',
  '02': 'Meat and edible meat offal',
  '03': 'Fish, crustaceans, molluscs',
  '04': 'Dairy, eggs, honey',
  '05': 'Products of animal origin',
  '06': 'Live trees and plants',
  '07': 'Edible vegetables',
  '08': 'Edible fruit and nuts',
  '09': 'Coffee, tea, spices',
  '10': 'Cereals',
  '11': 'Milling products, malt, starches',
  '12': 'Oil seeds, miscellaneous grains',
  '13': 'Lac, gums, resins',
  '14': 'Vegetable plaiting materials',
  '15': 'Animal or vegetable fats and oils',
  '16': 'Meat and fish preparations',
  '17': 'Sugars and confectionery',
  '18': 'Cocoa and cocoa preparations',
  '19': 'Cereal preparations, pastry',
  '20': 'Vegetable and fruit preparations',
  '21': 'Miscellaneous edible preparations',
  '22': 'Beverages, spirits, vinegar',
  '23': 'Food industry residues, animal feed',
  '24': 'Tobacco',
  '25': 'Salt, sulfur, earths, stone',
  '26': 'Ores, slag, ash',
  '27': 'Mineral fuels, oils',
  '28': 'Inorganic chemicals',
  '29': 'Organic chemicals',
  '30': 'Pharmaceutical products',
  '31': 'Fertilizers',
  '32': 'Tanning, dyeing extracts, dyes',
  '33': 'Essential oils, perfumery, cosmetics',
  '34': 'Soap, lubricating preparations',
  '35': 'Albuminoidal substances, glues',
  '36': 'Explosives, pyrotechnics, matches',
  '37': 'Photographic goods',
  '38': 'Miscellaneous chemical products',
  '39': 'Plastics and articles thereof',
  '40': 'Rubber and articles thereof',
  '41': 'Raw hides, skins, leather',
  '42': 'Leather articles, travel goods',
  '43': 'Furskins and artificial fur',
  '44': 'Wood and articles of wood',
  '45': 'Cork and articles of cork',
  '46': 'Straw, esparto, plaiting materials',
  '47': 'Pulp of wood',
  '48': 'Paper and paperboard',
  '49': 'Printed books, newspapers',
  '50': 'Silk',
  '51': 'Wool, animal hair',
  '52': 'Cotton',
  '53': 'Other vegetable textile fibers',
  '54': 'Man-made filaments',
  '55': 'Man-made staple fibers',
  '56': 'Wadding, felt, nonwovens',
  '57': 'Carpets, textile floor coverings',
  '58': 'Special woven fabrics, lace',
  '59': 'Impregnated textile fabrics',
  '60': 'Knitted or crocheted fabrics',
  '61': 'Knitted apparel and accessories',
  '62': 'Non-knitted apparel and accessories',
  '63': 'Other made-up textile articles',
  '64': 'Footwear, gaiters',
  '65': 'Headgear',
  '66': 'Umbrellas, walking sticks',
  '67': 'Prepared feathers, artificial flowers',
  '68': 'Stone, plaster, cement articles',
  '69': 'Ceramic products',
  '70': 'Glass and glassware',
  '71': 'Precious metals, jewelry',
  '72': 'Iron and steel',
  '73': 'Iron and steel articles',
  '74': 'Copper and articles thereof',
  '75': 'Nickel and articles thereof',
  '76': 'Aluminum and articles thereof',
  '78': 'Lead and articles thereof',
  '79': 'Zinc and articles thereof',
  '80': 'Tin and articles thereof',
  '81': 'Other base metals',
  '82': 'Tools, cutlery, base metal',
  '83': 'Miscellaneous base metal articles',
  '84': 'Nuclear reactors, machinery',
  '85': 'Electrical machinery, equipment',
  '86': 'Railway, tramway locomotives',
  '87': 'Vehicles (not railway)',
  '88': 'Aircraft, spacecraft',
  '89': 'Ships, boats',
  '90': 'Optical, photographic, medical instruments',
  '91': 'Clocks and watches',
  '92': 'Musical instruments',
  '94': 'Furniture, bedding, lamps',
  '95': 'Toys, games, sports equipment',
  '96': 'Miscellaneous manufactured articles',
  '97': 'Works of art, antiques',
  '98': 'Special classification provisions',
  '99': 'Special import provisions',
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: EXHAUSTIVE SEARCH (V10 + Sibling Expansion)
// ═══════════════════════════════════════════════════════════════════════════════

interface CandidateCode {
  code: string;
  formattedCode: string;
  description: string;
  fullDescription: string;
  parentGroupings: string[];
  generalRate: string | null;
  adValoremRate: number | null;
  chapter: string;
  heading: string;
  similarity: number;
  source: 'semantic' | 'sibling' | 'heading_expansion';
}

async function layer1ExhaustiveSearch(
  productDescription: string,
  maxCandidates: number = 50
): Promise<CandidateCode[]> {
  console.log('[DutyOptimizer] Layer 1: Starting exhaustive search');
  
  // Step 1: Semantic search (primary method)
  const semanticResults = await searchHtsBySemantic(productDescription, { limit: 30 });
  console.log(`[DutyOptimizer] Semantic search found ${semanticResults.length} candidates`);
  
  const candidates: CandidateCode[] = semanticResults.map(r => ({
    code: r.code,
    formattedCode: formatHtsCode(r.code),
    description: r.description,
    fullDescription: r.description,
    parentGroupings: [],
    generalRate: r.generalRate,
    adValoremRate: r.generalRate ? parseFloat(r.generalRate.replace('%', '')) : null,
    chapter: r.chapter || r.code.substring(0, 2),
    heading: r.heading || r.code.substring(0, 4),
    similarity: r.similarity,
    source: 'semantic' as const,
  }));
  
  // Step 2: Sibling expansion - for each unique heading, get all siblings
  const uniqueHeadings = [...new Set(candidates.map(c => c.heading))];
  console.log(`[DutyOptimizer] Expanding ${uniqueHeadings.length} unique headings`);
  
  const seenCodes = new Set(candidates.map(c => c.code));
  
  for (const heading of uniqueHeadings.slice(0, 5)) { // Limit to top 5 headings
    // Get all codes under this heading
    const headingCodes = await prisma.htsCode.findMany({
      where: {
        code: { startsWith: heading },
        level: { in: ['tariff_line', 'statistical'] },
      },
      take: 20,
    });
    
    for (const code of headingCodes) {
      if (!seenCodes.has(code.code)) {
        seenCodes.add(code.code);
        candidates.push({
          code: code.code,
          formattedCode: formatHtsCode(code.code),
          description: code.description,
          fullDescription: code.description,
          parentGroupings: code.parentGroupings || [],
          generalRate: code.generalRate,
          adValoremRate: code.adValoremRate,
          chapter: code.code.substring(0, 2),
          heading: code.code.substring(0, 4),
          similarity: 0.3, // Lower similarity for expanded results
          source: 'sibling',
        });
      }
    }
  }
  
  console.log(`[DutyOptimizer] Layer 1 complete: ${candidates.length} total candidates`);
  
  // Sort by similarity and return top candidates
  return candidates
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxCandidates);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: AI ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

async function interpretProduct(
  productDescription: string,
  unitValue?: number,
  intendedUse?: string
): Promise<ProductInterpretation> {
  console.log('[DutyOptimizer] Layer 2a: Interpreting product');
  
  const xai = getXAIClient();
  
  const prompt = `You are an expert customs classifier analyzing a product for HTS code classification.

PRODUCT DESCRIPTION:
${productDescription}

ADDITIONAL INFO:
- Unit Value: ${unitValue ? `$${unitValue}` : 'Not specified'}
- Intended Use: ${intendedUse || 'Not specified'}

Analyze this product and respond with a JSON object:

{
  "summary": "Brief 1-sentence summary of what this product is",
  "material": "Primary material (e.g., ceramic, plastic, metal, textile, wood)",
  "use": "Use category: household, commercial, industrial, or mixed",
  "valueCategory": "Budget (under $10), Mid-range ($10-50), Premium ($50-200), or Luxury (over $200)",
  "keyFeatures": ["feature1", "feature2", "feature3"],
  "potentialChapters": [
    {"chapter": "69", "reason": "Ceramic products"},
    {"chapter": "39", "reason": "If has plastic components"}
  ]
}

Respond with ONLY the JSON, no other text.`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    
    const content = response.choices[0]?.message?.content || '';
    // Extract JSON from response (handle potential markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.error('[DutyOptimizer] Error interpreting product:', err);
  }
  
  // Fallback interpretation
  return {
    summary: productDescription,
    material: 'unknown',
    use: 'unknown',
    valueCategory: 'unknown',
    keyFeatures: [],
    potentialChapters: [],
  };
}

async function extractConditions(
  code: string,
  description: string,
  parentGroupings: string[]
): Promise<CodeCondition[]> {
  const conditions: CodeCondition[] = [];
  const fullDesc = [description, ...parentGroupings].join(' ').toLowerCase();
  
  // Value conditions
  const valueMatch = fullDesc.match(/valued?\s*(not\s+)?(over|under|exceeding|less than)\s*\$?([\d,.]+)/i);
  if (valueMatch) {
    const isNot = valueMatch[1] ? true : false;
    const comparison = valueMatch[2].toLowerCase();
    const value = valueMatch[3].replace(',', '');
    
    let conditionText = '';
    if (comparison.includes('over') || comparison.includes('exceeding')) {
      conditionText = isNot ? `Value must be $${value} or less` : `Value must exceed $${value}`;
    } else {
      conditionText = isNot ? `Value must exceed $${value}` : `Value must be $${value} or less`;
    }
    
    conditions.push({
      condition: conditionText,
      met: 'unknown',
      explanation: `Classification depends on the transaction value per unit`,
      documentationNeeded: 'Commercial invoice showing unit value',
    });
  }
  
  // Use conditions
  if (fullDesc.includes('household') || fullDesc.includes('domestic')) {
    conditions.push({
      condition: 'Must be for household/domestic use',
      met: 'unknown',
      explanation: 'Product should be designed and marketed for home use',
      documentationNeeded: 'Product marketing materials, packaging',
    });
  }
  if (fullDesc.includes('hotel') || fullDesc.includes('restaurant') || fullDesc.includes('commercial')) {
    conditions.push({
      condition: 'Must be for commercial/hospitality use',
      met: 'unknown',
      explanation: 'Product should be commercial-grade for hotels, restaurants, or businesses',
      documentationNeeded: 'Purchase orders from commercial buyers, product specifications',
    });
  }
  if (fullDesc.includes('industrial')) {
    conditions.push({
      condition: 'Must be for industrial use',
      met: 'unknown',
      explanation: 'Product should be designed for industrial/manufacturing applications',
    });
  }
  
  // Material conditions
  const materialPatterns = [
    { pattern: /chief(?:ly)?\s+(?:weight|value)\s+(?:of\s+)?(\w+)/i, type: 'chief' },
    { pattern: /containing\s+(\d+)%\s+or\s+more/i, type: 'percentage' },
    { pattern: /of\s+(cotton|wool|silk|polyester|nylon|ceramic|porcelain|glass|plastic)/i, type: 'material' },
  ];
  
  for (const { pattern, type } of materialPatterns) {
    const match = fullDesc.match(pattern);
    if (match) {
      conditions.push({
        condition: type === 'percentage' 
          ? `Must contain ${match[1]}% or more of specified material`
          : `Must be primarily made of ${match[1]}`,
        met: 'unknown',
        explanation: 'Classification depends on material composition',
        documentationNeeded: 'Material composition certificate, lab test results',
      });
    }
  }
  
  return conditions;
}

async function translateToPlainEnglish(
  code: string,
  description: string,
  chapterDescription: string
): Promise<string> {
  console.log(`[DutyOptimizer] Translating ${code} to plain English`);
  
  const xai = getXAIClient();
  
  const prompt = `Translate this HTS code description into plain English that a small business owner would understand.

HTS CODE: ${code}
DESCRIPTION: ${description}
CHAPTER: ${chapterDescription}

Rules:
1. Avoid legal jargon
2. Give concrete examples of what products use this code
3. Keep it under 40 words
4. Be specific about what distinguishes this code

Respond with ONLY the plain English description, no quotes or formatting.`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
    });
    
    return response.choices[0]?.message?.content?.trim() || description;
  } catch (err) {
    console.error('[DutyOptimizer] Error translating:', err);
    return description;
  }
}

function generateSmartQuestions(
  candidates: CandidateCode[],
  productInterpretation: ProductInterpretation
): SmartQuestion[] {
  const questions: SmartQuestion[] = [];
  
  // Check for value-based differentiation
  const hasValueVariants = candidates.some(c => 
    c.description.toLowerCase().includes('valued') ||
    c.description.toLowerCase().includes('over $') ||
    c.description.toLowerCase().includes('not over')
  );
  
  if (hasValueVariants) {
    questions.push({
      id: 'unit_value',
      question: 'What is the value per unit (piece)?',
      reason: 'Some codes have different duty rates based on value thresholds',
      options: [
        { value: 'under_10', label: 'Under $10', hint: 'Budget items' },
        { value: '10_to_38', label: '$10 - $38', hint: 'Standard consumer goods' },
        { value: '38_to_100', label: '$38 - $100', hint: 'Premium items' },
        { value: 'over_100', label: 'Over $100', hint: 'Luxury/high-end items' },
      ],
    });
  }
  
  // Check for use-based differentiation
  const hasUseVariants = candidates.some(c => {
    const desc = c.description.toLowerCase();
    return desc.includes('household') || desc.includes('hotel') || 
           desc.includes('commercial') || desc.includes('industrial');
  });
  
  if (hasUseVariants) {
    questions.push({
      id: 'intended_use',
      question: 'What is the intended use of this product?',
      reason: 'Different codes apply for household vs commercial use',
      options: [
        { value: 'household', label: 'Household/Consumer', hint: 'For home use' },
        { value: 'commercial', label: 'Commercial/Hospitality', hint: 'Hotels, restaurants, offices' },
        { value: 'industrial', label: 'Industrial/Manufacturing', hint: 'Factory or industrial use' },
      ],
    });
  }
  
  // Check for material-based differentiation
  const chaptersFound = [...new Set(candidates.map(c => c.chapter))];
  const materialChapters = ['39', '44', '69', '70', '72', '73', '74', '76'];
  const hasMaterialAmbiguity = chaptersFound.filter(c => materialChapters.includes(c)).length > 1;
  
  if (hasMaterialAmbiguity && productInterpretation.material === 'unknown') {
    questions.push({
      id: 'material',
      question: 'What is the primary material?',
      reason: 'Material determines which chapter the product falls under',
      options: [
        { value: 'plastic', label: 'Plastic/Polymer', hint: 'Chapter 39' },
        { value: 'ceramic', label: 'Ceramic/Porcelain', hint: 'Chapter 69' },
        { value: 'glass', label: 'Glass', hint: 'Chapter 70' },
        { value: 'metal', label: 'Metal (steel, aluminum, etc.)', hint: 'Chapters 72-76' },
        { value: 'wood', label: 'Wood', hint: 'Chapter 44' },
      ],
    });
  }
  
  return questions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: DUTY COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

async function calculateDutyForCode(
  code: string,
  generalRate: string | null,
  countryOfOrigin: string
): Promise<ApplicableCode['dutyBreakdown']> {
  try {
    const tariff = await getEffectiveTariff(countryOfOrigin, code);
    
    // Parse base MFN rate from generalRate string
    let baseMfnRate = 0;
    if (generalRate) {
      const match = generalRate.match(/([\d.]+)%/);
      if (match) {
        baseMfnRate = parseFloat(match[1]);
      } else if (generalRate.toLowerCase() === 'free') {
        baseMfnRate = 0;
      }
    }
    
    return {
      baseMfnRate,
      baseMfnDisplay: generalRate || 'Free',
      section301Rate: tariff.section301Rate || 0,
      ieepaRate: (tariff.ieepaBreakdown?.baseline || 0) + (tariff.ieepaBreakdown?.reciprocal || 0),
      fentanylRate: tariff.ieepaBreakdown?.fentanyl || 0,
      totalRate: baseMfnRate + (tariff.section301Rate || 0) + (tariff.ieepaBreakdown?.baseline || 0) + 
                 (tariff.ieepaBreakdown?.reciprocal || 0) + (tariff.ieepaBreakdown?.fentanyl || 0),
    };
  } catch (err) {
    console.error(`[DutyOptimizer] Error calculating duty for ${code}:`, err);
    return {
      baseMfnRate: 0,
      baseMfnDisplay: 'Unknown',
      section301Rate: 0,
      ieepaRate: 0,
      fentanylRate: 0,
      totalRate: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN OPTIMIZER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function optimizeDuty(input: DutyOptimizerInput): Promise<DutyOptimizerResult> {
  const startTime = Date.now();
  const analysisId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[DutyOptimizer] Starting analysis ${analysisId}`);
  console.log(`[DutyOptimizer] Product: "${input.productDescription}"`);
  console.log(`[DutyOptimizer] Country: ${input.countryOfOrigin}`);
  
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // LAYER 1: Exhaustive Search
    // ─────────────────────────────────────────────────────────────────────────
    const candidates = await layer1ExhaustiveSearch(
      input.productDescription,
      input.maxResults || 30
    );
    
    if (candidates.length === 0) {
      return {
        success: false,
        analysisId,
        processingTimeMs: Date.now() - startTime,
        productInterpretation: {
          summary: input.productDescription,
          material: 'unknown',
          use: 'unknown',
          valueCategory: 'unknown',
          keyFeatures: [],
          potentialChapters: [],
        },
        questions: [],
        applicableCodes: [],
        summary: {
          totalCodesFound: 0,
          bestRateCode: '',
          bestRate: 0,
          worstRateCode: '',
          worstRate: 0,
          potentialSavings: 0,
          dollarSavingsAt10k: 0,
        },
        error: 'No applicable codes found',
      };
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // LAYER 2: AI Analysis
    // ─────────────────────────────────────────────────────────────────────────
    
    // 2a. Product interpretation
    const productInterpretation = await interpretProduct(
      input.productDescription,
      input.unitValue,
      input.intendedUse
    );
    console.log('[DutyOptimizer] Product interpretation complete');
    
    // 2b. Generate smart questions based on candidates
    const questions = generateSmartQuestions(candidates, productInterpretation);
    console.log(`[DutyOptimizer] Generated ${questions.length} smart questions`);
    
    // 2c. Process top candidates with AI enrichment (limit to save API calls)
    const topCandidates = candidates.slice(0, 15);
    const applicableCodes: ApplicableCode[] = [];
    
    for (const candidate of topCandidates) {
      const chapterDesc = CHAPTER_DESCRIPTIONS[candidate.chapter] || `Chapter ${candidate.chapter}`;
      
      // Extract conditions
      const conditions = await extractConditions(
        candidate.code,
        candidate.description,
        candidate.parentGroupings
      );
      
      // Translate to plain English (only for top 8 to save API calls)
      let plainEnglish = candidate.description;
      if (applicableCodes.length < 8) {
        plainEnglish = await translateToPlainEnglish(
          candidate.code,
          candidate.description,
          chapterDesc
        );
      }
      
      // Calculate duty
      const dutyBreakdown = await calculateDutyForCode(
        candidate.code,
        candidate.generalRate,
        input.countryOfOrigin
      );
      
      // Get heading description
      const headingCode = await prisma.htsCode.findFirst({
        where: { code: candidate.heading },
        select: { description: true },
      });
      
      applicableCodes.push({
        htsCode: candidate.code,
        formattedCode: candidate.formattedCode,
        rawDescription: candidate.description,
        plainEnglishDescription: plainEnglish,
        fullHierarchyDescription: candidate.fullDescription,
        applicabilityScore: Math.round(candidate.similarity * 100),
        applicabilityReason: candidate.source === 'semantic' 
          ? 'Strong match based on product description'
          : 'Related code in same product category',
        conditions,
        chapter: candidate.chapter,
        chapterDescription: chapterDesc,
        heading: candidate.heading,
        headingDescription: headingCode?.description || '',
        dutyBreakdown,
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // LAYER 3: Comparison & Summary
    // ─────────────────────────────────────────────────────────────────────────
    
    // Sort by duty rate (lowest first)
    applicableCodes.sort((a, b) => a.dutyBreakdown.totalRate - b.dutyBreakdown.totalRate);
    
    // Calculate savings comparisons
    const bestRate = applicableCodes[0]?.dutyBreakdown.totalRate || 0;
    const worstRate = applicableCodes[applicableCodes.length - 1]?.dutyBreakdown.totalRate || 0;
    
    for (const code of applicableCodes) {
      code.savingsVsBest = parseFloat((code.dutyBreakdown.totalRate - bestRate).toFixed(1));
      code.savingsVsWorst = parseFloat((worstRate - code.dutyBreakdown.totalRate).toFixed(1));
    }
    
    const potentialSavings = parseFloat((worstRate - bestRate).toFixed(1));
    const dollarSavingsAt10k = Math.round((potentialSavings / 100) * 10000);
    
    const processingTimeMs = Date.now() - startTime;
    console.log(`[DutyOptimizer] Analysis complete in ${processingTimeMs}ms`);
    console.log(`[DutyOptimizer] Found ${applicableCodes.length} codes, savings range: ${potentialSavings}%`);
    
    return {
      success: true,
      analysisId,
      processingTimeMs,
      productInterpretation,
      questions,
      applicableCodes,
      summary: {
        totalCodesFound: applicableCodes.length,
        bestRateCode: applicableCodes[0]?.formattedCode || '',
        bestRate,
        worstRateCode: applicableCodes[applicableCodes.length - 1]?.formattedCode || '',
        worstRate,
        potentialSavings,
        dollarSavingsAt10k,
      },
    };
    
  } catch (err) {
    console.error('[DutyOptimizer] Error:', err);
    return {
      success: false,
      analysisId,
      processingTimeMs: Date.now() - startTime,
      productInterpretation: {
        summary: input.productDescription,
        material: 'unknown',
        use: 'unknown',
        valueCategory: 'unknown',
        keyFeatures: [],
        potentialChapters: [],
      },
      questions: [],
      applicableCodes: [],
      summary: {
        totalCodesFound: 0,
        bestRateCode: '',
        bestRate: 0,
        worstRateCode: '',
        worstRate: 0,
        potentialSavings: 0,
        dollarSavingsAt10k: 0,
      },
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK TEASER (for free tier classification results)
// ═══════════════════════════════════════════════════════════════════════════════

export interface OptimizerTeaser {
  hasOpportunity: boolean;
  alternativeCount: number;
  bestAlternative?: {
    code: string;
    formattedCode: string;
    description: string;
    totalRate: number;
    savings: number;
  };
  currentRate: number;
}

export async function getOptimizerTeaser(
  primaryCode: string,
  primaryRate: number,
  countryOfOrigin: string
): Promise<OptimizerTeaser> {
  console.log(`[DutyOptimizer] Generating teaser for ${primaryCode}`);
  
  try {
    // Get siblings under same heading
    const heading = primaryCode.substring(0, 4);
    const siblings = await prisma.htsCode.findMany({
      where: {
        code: { startsWith: heading, not: primaryCode },
        level: { in: ['tariff_line', 'statistical'] },
      },
      take: 20,
    });
    
    if (siblings.length === 0) {
      return {
        hasOpportunity: false,
        alternativeCount: 0,
        currentRate: primaryRate,
      };
    }
    
    // Find lowest rate alternative
    let bestAlternative: OptimizerTeaser['bestAlternative'] = undefined;
    let lowestRate = primaryRate;
    
    for (const sibling of siblings) {
      const duty = await calculateDutyForCode(sibling.code, sibling.generalRate, countryOfOrigin);
      
      if (duty.totalRate < lowestRate) {
        lowestRate = duty.totalRate;
        bestAlternative = {
          code: sibling.code,
          formattedCode: formatHtsCode(sibling.code),
          description: sibling.description,
          totalRate: duty.totalRate,
          savings: parseFloat((primaryRate - duty.totalRate).toFixed(1)),
        };
      }
    }
    
    return {
      hasOpportunity: bestAlternative !== undefined,
      alternativeCount: siblings.length,
      bestAlternative,
      currentRate: primaryRate,
    };
    
  } catch (err) {
    console.error('[DutyOptimizer] Error generating teaser:', err);
    return {
      hasOpportunity: false,
      alternativeCount: 0,
      currentRate: primaryRate,
    };
  }
}


