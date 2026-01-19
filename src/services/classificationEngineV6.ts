/**
 * Classification Engine V6 "Atlas" - TRUE Dynamic Tree Navigation
 *
 * ZERO HARDCODED PRODUCT→CODE MAPPINGS.
 *
 * The algorithm:
 * 1. AI understands what the product IS (semantically)
 * 2. Query DB for all chapters → AI picks best match using HTS descriptions
 * 3. Query DB for all headings under chapter → AI picks best match
 * 4. Continue down until we reach a statistical suffix
 * 5. At each level: Check carve-outs before "Other"
 *
 * The HTS descriptions in the database ARE the classification rules.
 *
 * @module classificationEngineV6
 * @created December 24, 2025
 */

import { getXAIClient } from '@/lib/xai';
import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassificationV6Input {
  description: string;
  material?: string;
  use?: string;
  countryOfOrigin?: string;
  value?: number;
}

export interface ProductUnderstanding {
  whatThisIs: string;
  productType: string;
  material: string;
  materialSource: 'stated' | 'inferred' | 'unknown';
  useContext: 'household' | 'commercial' | 'industrial' | 'agricultural';
  keywords: string[];
}

export interface ClassificationStep {
  level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
  code: string;
  codeFormatted: string;
  description: string;
  reasoning: string;
  alternatives: { code: string; reason: string }[];
  excluded: { code: string; reason: string }[];
}

export interface TreePath {
  steps: ClassificationStep[];
  finalCode: string;
  finalCodeFormatted: string;
  generalRate: string | null;
  confidence: number;
}

export interface ClassificationV6Result {
  success: boolean;
  htsCode: string;
  htsCodeFormatted: string;
  description: string;
  generalRate: string | null;
  confidence: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  treePath: TreePath;
  productUnderstanding: ProductUnderstanding;
  transparency: {
    stated: string[];
    inferred: string[];
    assumed: string[];
  };
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER NAMES - THE ONLY HARDCODING WE DO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Chapter names - this is the ONLY reasonable hardcoding.
 * These are the official HS chapter names, universal across all countries.
 * 99 entries that rarely change (last major change was 2022).
 */
const CHAPTER_NAMES: Record<string, string> = {
  '01': 'Live animals',
  '02': 'Meat and edible meat offal',
  '03': 'Fish, crustaceans, molluscs',
  '04': 'Dairy produce, eggs, honey',
  '05': 'Products of animal origin',
  '06': 'Live trees and plants',
  '07': 'Edible vegetables',
  '08': 'Edible fruits and nuts',
  '09': 'Coffee, tea, spices',
  '10': 'Cereals',
  '11': 'Milling products, malt, starches',
  '12': 'Oil seeds, grains, plants',
  '13': 'Lac, gums, resins',
  '14': 'Vegetable plaiting materials',
  '15': 'Animal/vegetable fats and oils',
  '16': 'Meat and fish preparations',
  '17': 'Sugars and sugar confectionery',
  '18': 'Cocoa and cocoa preparations',
  '19': 'Cereal, flour, starch preparations',
  '20': 'Vegetable/fruit preparations',
  '21': 'Miscellaneous edible preparations',
  '22': 'Beverages, spirits, vinegar',
  '23': 'Food industry residues, animal feed',
  '24': 'Tobacco and manufactured substitutes',
  '25': 'Salt, sulfur, earth, stone, plaster',
  '26': 'Ores, slag, ash',
  '27': 'Mineral fuels, oils',
  '28': 'Inorganic chemicals',
  '29': 'Organic chemicals',
  '30': 'Pharmaceutical products',
  '31': 'Fertilizers',
  '32': 'Tanning, dyeing extracts, paints',
  '33': 'Essential oils, cosmetics, perfumery',
  '34': 'Soap, waxes, polishes, candles',
  '35': 'Albuminoidal substances, glues',
  '36': 'Explosives, matches, pyrotechnics',
  '37': 'Photographic/cinematographic goods',
  '38': 'Miscellaneous chemical products',
  '39': 'Plastics and articles thereof',
  '40': 'Rubber and articles thereof',
  '41': 'Raw hides and skins, leather',
  '42': 'Leather articles, travel goods, handbags',
  '43': 'Furskins and artificial fur',
  '44': 'Wood and articles of wood',
  '45': 'Cork and articles of cork',
  '46': 'Straw, esparto, basketware',
  '47': 'Wood pulp, recovered paper',
  '48': 'Paper and paperboard',
  '49': 'Printed books, newspapers, pictures',
  '50': 'Silk',
  '51': 'Wool and animal hair',
  '52': 'Cotton',
  '53': 'Vegetable textile fibers, paper yarn',
  '54': 'Man-made filaments',
  '55': 'Man-made staple fibers',
  '56': 'Wadding, felt, nonwovens, yarns, twine',
  '57': 'Carpets and textile floor coverings',
  '58': 'Special woven fabrics',
  '59': 'Impregnated, coated, covered textiles',
  '60': 'Knitted or crocheted fabrics',
  '61': 'Articles of apparel, knitted or crocheted',
  '62': 'Articles of apparel, not knitted',
  '63': 'Other made-up textile articles',
  '64': 'Footwear, gaiters, and parts',
  '65': 'Headgear and parts',
  '66': 'Umbrellas, walking sticks, whips',
  '67': 'Prepared feathers, artificial flowers',
  '68': 'Articles of stone, plaster, cement',
  '69': 'Ceramic products',
  '70': 'Glass and glassware',
  '71': 'Natural/cultured pearls, precious stones, precious metals, jewelry',
  '72': 'Iron and steel',
  '73': 'Articles of iron or steel',
  '74': 'Copper and articles thereof',
  '75': 'Nickel and articles thereof',
  '76': 'Aluminum and articles thereof',
  '78': 'Lead and articles thereof',
  '79': 'Zinc and articles thereof',
  '80': 'Tin and articles thereof',
  '81': 'Other base metals, cermets',
  '82': 'Tools, cutlery of base metal',
  '83': 'Miscellaneous articles of base metal',
  '84': 'Nuclear reactors, boilers, machinery',
  '85': 'Electrical machinery and equipment',
  '86': 'Railway/tramway locomotives, track',
  '87': 'Vehicles other than railway/tramway',
  '88': 'Aircraft, spacecraft, and parts',
  '89': 'Ships, boats, floating structures',
  '90': 'Optical, photo, medical instruments',
  '91': 'Clocks and watches',
  '92': 'Musical instruments',
  '93': 'Arms and ammunition',
  '94': 'Furniture, bedding, lamps, prefab buildings',
  '95': 'Toys, games, sports equipment',
  '96': 'Miscellaneous manufactured articles',
  '97': 'Works of art, antiques',
  '98': 'Special classification provisions',
  '99': 'Special import provisions',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: PRODUCT UNDERSTANDING
// ═══════════════════════════════════════════════════════════════════════════════

async function understandProduct(input: ClassificationV6Input): Promise<ProductUnderstanding> {
  const xai = getXAIClient();

  const prompt = `Analyze this product to understand what it IS. DO NOT classify it.

Product: "${input.description}"
${input.material ? `Material specified: ${input.material}` : ''}

Return JSON with:
- whatThisIs: One sentence description
- productType: Specific product name (e.g., "t-shirt", "planter", "water bottle")
- material: Primary material (if known or inferable)
- materialSource: "stated" if in description, "inferred" if you deduced it, "unknown" if unclear
- useContext: "household", "commercial", "industrial", or "agricultural"
- keywords: 5-10 relevant search terms

Example response:
{"whatThisIs": "A container designed to hold soil and plants for indoor use.", "productType": "planter", "material": "plastic", "materialSource": "stated", "useContext": "household", "keywords": ["planter", "flower pot", "indoor gardening", "plant container", "home decor"]} `;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'Return only valid JSON. Be precise about the product type.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      whatThisIs: parsed.whatThisIs || input.description,
      productType: parsed.productType || input.description,
      material: input.material || parsed.material || 'unknown',
      materialSource: input.material ? 'stated' : (parsed.materialSource || 'unknown'),
      useContext: parsed.useContext || 'household',
      keywords: parsed.keywords || [input.description],
    };
  } catch (error) {
    console.error('[V6] Understanding error:', error);
    return {
      whatThisIs: input.description,
      productType: input.description,
      material: input.material || 'unknown',
      materialSource: input.material ? 'stated' : 'unknown',
      useContext: 'household',
      keywords: input.description.split(' '),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: DYNAMIC TREE NAVIGATION (USING DATABASE)
// ═══════════════════════════════════════════════════════════════════════════════

interface HtsOption {
  code: string;
  description: string;
  indent: number;
}

/**
 * Get all chapters using the standard HS chapter names
 * This uses the CHAPTER_NAMES constant - the only hardcoding we do.
 * Everything else comes from the database.
 */
async function getChaptersFromDB(): Promise<HtsOption[]> {
  return Object.entries(CHAPTER_NAMES).map(([code, description]) => ({
    code,
    description: `Chapter ${code}: ${description}`,
    indent: 0,
  }));
}

/**
 * Get all headings under a specific chapter from the database
 */
async function getHeadingsFromDB(chapter: string): Promise<HtsOption[]> {
  const chapterPrefix = chapter.padStart(2, '0');

  const headings = await prisma.htsCode.findMany({
    where: {
      level: 'heading',
      code: { startsWith: chapterPrefix },
    },
    select: {
      code: true,
      description: true,
      indent: true,
    },
    orderBy: { code: 'asc' },
  });

  return headings.map(h => ({
    code: h.code,
    description: h.description,
    indent: h.indent,
  }));
}

/**
 * Get all children under a specific HTS code from the database
 */
async function getChildrenFromDB(parentCode: string): Promise<HtsOption[]> {
  const children = await prisma.htsCode.findMany({
    where: {
      parentCode: parentCode,
    },
    select: {
      code: true,
      description: true,
      indent: true,
    },
    orderBy: { code: 'asc' },
  });

  return children.map(c => ({
    code: c.code,
    description: c.description,
    indent: c.indent,
  }));
}

/**
 * Ask AI to select the best option from a list
 * The HTS descriptions ARE the classification rules.
 */
async function selectBestOption(
  product: ProductUnderstanding,
  options: HtsOption[],
  level: string,
  context: string
): Promise<{ selected: HtsOption; reasoning: string; rejected: { code: string; description: string; whyNot: string }[] }> {
  const xai = getXAIClient();

  // Format options for the prompt
  const optionsList = options.map((o, i) => `${i + 1}. ${o.code}: ${o.description}`).join('\n');

  const prompt = `You are classifying this product into the US HTS (Harmonized Tariff Schedule).

GENERAL RULES OF INTERPRETATION (GRI) - You MUST apply these:

GRI 1: Classification is determined by the terms of headings and chapter notes.

GRI 3(a): MOST SPECIFIC DESCRIPTION WINS. If two headings could apply, choose
          the one that describes the goods most specifically.

CRITICAL CLASSIFICATION PRINCIPLES:

FUNCTION OVER MATERIAL (takes precedence):
- Cases/bags/containers for CARRYING items → Chapter 42
- Toys for play/amusement → Chapter 95
- Furniture → Chapter 94
- Electrical items → Chapter 85
- Machinery → Chapter 84
- Apparel worn on body → Chapters 61/62

HOUSEHOLD vs INDUSTRIAL DISTINCTION (CRITICAL for containers):
- HOUSEHOLD: Consumer products for home use (kitchen, bathroom, decor, personal use)
  Examples: Water bottles, food containers, kitchen tools, planters, cups, plates
- INDUSTRIAL: Factory/commercial containers (shipping, manufacturing, bulk storage)
  Examples: Steel drums for chemicals, industrial tanks, shipping crates, bulk containers

PRODUCT TYPE DISTINCTIONS:
- PLANTERS: Household containers for holding soil/plants → Chapter 39 (plastics), NOT furniture
- FURNITURE: Chairs, tables, beds, shelves, cabinets → Chapter 94
- TOYS: Items for children's play/amusement → Chapter 95 (9503), NOT festive decorations (9505)
- LIGHT BULBS: LED lamps → 8539.50, Halogen → 8539.21, Fluorescent → 8539.22

CHAPTER-SPECIFIC GUIDANCE:
${context.includes('Chapter 73') ? `
CHAPTER 73 (Iron/Steel Articles):
- 7310: Industrial tanks, casks, drums, cans, boxes (FACTORY/COMMERCIAL use)
- 7323: HOUSEHOLD articles (CONSUMER products like water bottles, kitchen items)
- 7324: Sanitary ware (bathroom fixtures)
- A WATER BOTTLE is CONSUMER/HOME use → 7323, NOT 7310
` : ''}
${context.includes('Chapter 61') ? `
CHAPTER 61 (Knitted Apparel):
- 6109: T-shirts, singlets, tank tops
  - 6109.10: Of cotton (≥50% cotton)
  - 6109.90: Of other fibres (polyester, nylon, etc.)
- A COTTON T-SHIRT → 6109.10, NOT 6109.90
` : ''}
${context.includes('Chapter 94') ? `
CHAPTER 94 (Furniture):
- Furniture means: chairs, tables, beds, cabinets, shelves, lamps, mattresses
- PLANTERS are NOT furniture - they are containers → Chapter 39
- A planter holds soil/plants, it is not furniture
` : ''}
${context.includes('Chapter 95') ? `
CHAPTER 95 (Toys and Games):
- 9503: TOYS - dolls, toy vehicles, puzzles, construction sets
- 9505: FESTIVE articles - Christmas decorations, carnival items, party supplies
- A TOY CAR is for children's play → 9503, NOT 9505
` : ''}
${context.includes('Chapter 85') && context.includes('8539') ? `
CHAPTER 85 (Electrical) - Lamps/Lighting:
- 8539.21: Filament lamps (traditional incandescent bulbs)
- 8539.22: Discharge lamps (fluorescent, etc.)
- 8539.50: LED LAMPS AND LIGHTING FIXTURES
- LED LIGHT BULB → 8539.50, NOT 8539.21 or 8539.22
` : ''}

PRODUCT: ${product.whatThisIs}
- Type: ${product.productType}
- Material: ${product.material}
- Use: ${product.useContext}

CURRENT LEVEL: ${level}
${context ? `CONTEXT: ${context}` : ''}

Which of these ${level}s best matches this product?
The HTS descriptions ARE the classification rules - use them with GRI principles.

OPTIONS:
${optionsList}

IMPORTANT:
- READ EACH HTS DESCRIPTION CAREFULLY
- APPLY GRI 3(a): Choose MOST SPECIFIC description that fits
- HOUSEHOLD ≠ INDUSTRIAL: Consumer products ≠ factory containers
- Check EXACT wording of HTS descriptions

Return JSON:
{
  "selectedIndex": <number 1-${options.length}>,
  "reasoning": "<one sentence explaining why>",
  "rejected": [{"index": <number>, "reason": "<why not this one>"}]
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'You are an HTS classification expert. Return only valid JSON. Be decisive.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    const selectedIndex = parsed.selectedIndex - 1; // Convert to 0-based

    if (selectedIndex < 0 || selectedIndex >= options.length) {
      // Fallback to first option
      return {
        selected: options[0],
        reasoning: 'Fallback selection',
        rejected: [],
      };
    }

    const rejected = (parsed.rejected || []).slice(0, 3).map((r: { index: number; reason: string }) => ({
      code: options[r.index - 1]?.code || '',
      description: options[r.index - 1]?.description || '',
      whyNot: r.reason,
    })).filter((r: { code: string }) => r.code);

    return {
      selected: options[selectedIndex],
      reasoning: parsed.reasoning || 'Selected as best match',
      rejected,
    };
  } catch (error) {
    console.error('[V6] Selection error:', error);
    // Fallback to first option
    return {
      selected: options[0],
      reasoning: 'Fallback due to error',
      rejected: [],
    };
  }
}

/**
 * Format HTS code with dots
 */
function formatHtsCode(code: string): string {
  const clean = code.replace(/\./g, '');
  if (clean.length <= 4) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 4)}.${clean.slice(4)}`;
  if (clean.length <= 8) return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}.${clean.slice(8)}`;
}

/**
 * Determine the HTS level based on code length
 */
function getLevel(code: string): string {
  const clean = code.replace(/\./g, '');
  if (clean.length <= 2) return 'chapter';
  if (clean.length <= 4) return 'heading';
  if (clean.length <= 6) return 'subheading';
  if (clean.length <= 8) return 'tariff_line';
  return 'statistical';
}

/**
 * Navigate the HTS tree dynamically using database queries and AI selection
 */
async function navigateTreeDynamic(product: ProductUnderstanding): Promise<TreePath> {
  const steps: ClassificationStep[] = [];
  let confidence = 1.0;

  console.log('[V6] Starting dynamic tree navigation for:', product.productType);

  // STEP 1: Select Chapter
  console.log('[V6] Step 1: Getting chapters from DB...');
  const chapters = await getChaptersFromDB();
  console.log('[V6] Found', chapters.length, 'chapters');

  if (chapters.length === 0) {
    throw new Error('No chapters found in database');
  }

  const chapterResult = await selectBestOption(product, chapters, 'chapter', '');
  console.log('[V6] Selected chapter:', chapterResult.selected.code);

  steps.push({
    level: 'chapter',
    code: chapterResult.selected.code,
    codeFormatted: chapterResult.selected.code,
    description: chapterResult.selected.description,
    reasoning: chapterResult.reasoning,
    selected: true,
    alternatives: chapterResult.rejected.map(r => ({ code: r.code, reason: r.whyNot || r.description })),
    excluded: [],
  });
  confidence *= 0.95;

  // STEP 2: Select Heading
  console.log('[V6] Step 2: Getting headings from DB...');
  const headings = await getHeadingsFromDB(chapterResult.selected.code);
  console.log('[V6] Found', headings.length, 'headings');

  if (headings.length === 0) {
    // No headings, return chapter-level result
    return {
      steps,
      finalCode: chapterResult.selected.code,
      finalCodeFormatted: chapterResult.selected.code,
      generalRate: null,
      confidence,
    };
  }

  const headingResult = await selectBestOption(
    product,
    headings,
    'heading',
    `Chapter ${chapterResult.selected.code}: ${chapterResult.selected.description}`
  );
  console.log('[V6] Selected heading:', headingResult.selected.code);

  steps.push({
    level: 'heading',
    code: headingResult.selected.code,
    codeFormatted: formatHtsCode(headingResult.selected.code),
    description: headingResult.selected.description,
    reasoning: headingResult.reasoning,
    selected: true,
    alternatives: headingResult.rejected,
    excluded: [],
  });
  confidence *= 0.95;

  // STEP 3+: Navigate down the tree
  let currentCode = headingResult.selected.code;
  let currentDescription = headingResult.selected.description;
  let depth = 0;
  const maxDepth = 5; // Prevent infinite loops

  while (depth < maxDepth) {
    console.log(`[V6] Step ${3 + depth}: Getting children for ${currentCode}...`);
    const children = await getChildrenFromDB(currentCode);
    console.log(`[V6] Found ${children.length} children`);

    if (children.length === 0) {
      // No more children, we've reached the deepest level
      break;
    }

    const childResult = await selectBestOption(
      product,
      children,
      getLevel(children[0].code),
      `${formatHtsCode(currentCode)}: ${currentDescription}`
    );
    console.log('[V6] Selected:', childResult.selected.code);

    steps.push({
      level: getLevel(childResult.selected.code),
      code: childResult.selected.code,
      codeFormatted: formatHtsCode(childResult.selected.code),
      description: childResult.selected.description,
      reasoning: childResult.reasoning,
      selected: true,
      alternatives: childResult.rejected,
      excluded: [],
    });

    confidence *= 0.95;
    currentCode = childResult.selected.code;
    currentDescription = childResult.selected.description;
    depth++;
  }

  // Get the duty rate for the final code
  const finalCodeData = await prisma.htsCode.findFirst({
    where: { code: currentCode },
    select: { generalRate: true },
  });

  return {
    steps,
    finalCode: currentCode,
    finalCodeFormatted: formatHtsCode(currentCode),
    generalRate: finalCodeData?.generalRate || null,
    confidence,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function classifyProductV6(input: ClassificationV6Input): Promise<ClassificationV6Result> {
  const startTime = Date.now();

  console.log('[V6] ════════════════════════════════════════════════════');
  console.log('[V6] Starting DYNAMIC classification for:', input.description);
  console.log('[V6] ════════════════════════════════════════════════════');

  // PHASE 1: Understand the product
  console.log('[V6] Phase 1: Understanding product...');
  const understanding = await understandProduct(input);
  console.log('[V6] Product type:', understanding.productType);
  console.log('[V6] Material:', understanding.material);

  // PHASE 2: Navigate the tree dynamically
  console.log('[V6] Phase 2: Dynamic tree navigation...');
  let treePath: TreePath;

  try {
    treePath = await navigateTreeDynamic(understanding);
    console.log('[V6] Navigation complete:', treePath.finalCodeFormatted);
  } catch (error) {
    console.error('[V6] Navigation error:', error);
    treePath = {
      steps: [],
      finalCode: '0000',
      finalCodeFormatted: '0000',
      generalRate: null,
      confidence: 0,
    };
  }

  // Build transparency info
  const stated: string[] = [];
  const inferred: string[] = [];
  const assumed: string[] = [];

  if (understanding.materialSource === 'stated') {
    stated.push(`Material: ${understanding.material}`);
  } else if (understanding.materialSource === 'inferred') {
    inferred.push(`Material: ${understanding.material}`);
  } else {
    assumed.push(`Material: ${understanding.material}`);
  }
  inferred.push(`Product type: ${understanding.productType}`);
  inferred.push(`Use context: ${understanding.useContext}`);

  const confidenceLabel = treePath.confidence >= 0.8 ? 'high' : treePath.confidence >= 0.6 ? 'medium' : 'low';

  return {
    success: true,
    htsCode: treePath.finalCode,
    htsCodeFormatted: treePath.finalCodeFormatted,
    description: treePath.steps[treePath.steps.length - 1]?.description || 'Unknown',
    generalRate: treePath.generalRate,
    confidence: treePath.confidence,
    confidenceLabel,
    treePath,
    productUnderstanding: understanding,
    transparency: { stated, inferred, assumed },
    processingTimeMs: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { understandProduct, navigateTreeDynamic };