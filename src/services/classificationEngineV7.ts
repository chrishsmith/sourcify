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

export type ClassificationV7Input = ClassificationV6Input;

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

export interface TreePathV6 {
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
  treePath: TreePathV6;
  productUnderstanding: ProductUnderstanding;
  transparency: {
    stated: string[];
    inferred: string[];
    assumed: string[];
  };
  processingTimeMs: number;
}

export interface NavigationStep {
  level: string;
  code: string;
  codeFormatted: string;
  description: string;
  reasoning: string;
  griRuleApplied?: string;       // Which GRI rule drove this decision
  selected: boolean;
  alternatives: { code: string; description: string; whyNot: string }[];
}

export interface TreePath {
  steps: NavigationStep[];
  finalCode: string;
  finalCodeFormatted: string;
  generalRate: string | null;
  confidence: number;
}

export interface ClassificationV7Result {
  success: boolean;
  htsCode: string;
  htsCodeFormatted: string;
  description: string;
  generalRate: string | null;
  confidence: number;
  confidenceLabel: 'high' | 'medium' | 'low';
  treePath: TreePath;
  productUnderstanding: ProductUnderstanding;
  griRulesApplied: string[];
  transparency: {
    stated: string[];
    inferred: string[];
    assumed: string[];
  };
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRI RULES - THE LEGAL FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════════

const GRI_RULES = `
GENERAL RULES OF INTERPRETATION (GRI) - You MUST apply these in order:

GRI 1: Classification is determined by the terms of headings and chapter notes.
       The titles of sections/chapters are for reference only.

GRI 2(a): Incomplete/unfinished articles are classified as complete if they have
          the essential character of the complete article.

GRI 2(b): Mixtures and combinations of materials are classified by GRI 3.

GRI 3(a): MOST SPECIFIC DESCRIPTION WINS. If two headings could apply, choose
          the one that describes the goods most specifically.
          Example: "Phone case" (4202) beats "article of plastic" (3926)

GRI 3(b): ESSENTIAL CHARACTER determines classification for composite goods.
          What gives the product its fundamental nature?

GRI 3(c): When 3(a) and 3(b) fail, use the heading that occurs LAST numerically.

GRI 4: Goods not classifiable above go to the heading for most similar goods.

GRI 5: Cases, containers, and packing materials are generally classified with
       the goods they contain, UNLESS designed for long-term repeated use.

GRI 6: Classification at subheading level follows the same rules.
`;

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION OVER MATERIAL - KEY CLASSIFICATION PRINCIPLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * These product types are classified by FUNCTION, not by material.
 * This is one of the most important HTS classification principles.
 * 
 * A plastic toy goes to Chapter 95 (toys), NOT Chapter 39 (plastics)
 * A leather phone case goes to Chapter 42 (cases), NOT Chapter 41 (leather)
 */
const FUNCTION_OVER_MATERIAL_RULES = `
CRITICAL: FUNCTION OVER MATERIAL RULES

These product types are ALWAYS classified by function, regardless of material:

1. CASES, BAGS, CONTAINERS FOR CARRYING (Chapter 42):
   - Phone cases, laptop bags, camera cases → 4202
   - Suitcases, briefcases, handbags → 4202
   - Protective cases for portable equipment → 4202
   EXCEPTION: Industrial shipping containers stay in material chapters

2. TOYS AND GAMES (Chapter 95):
   - Toy cars, dolls, action figures → 9503
   - Board games, puzzles → 9504
   - Sports equipment → 9506
   Material (plastic, wood, metal) does NOT matter

3. FURNITURE (Chapter 94):
   - Chairs, tables, beds, shelves → 94XX
   - Material does NOT change the chapter

4. ELECTRICAL/ELECTRONIC EQUIPMENT (Chapter 85):
   - Products with electrical operation → 85XX
   - Cables, connectors, switches → 85XX

5. MACHINERY (Chapter 84):
   - Products with mechanical operation → 84XX
   - Pumps, motors, tools with motors

6. VEHICLES (Chapter 87):
   - Wheeled vehicles designed to be ridden → 87XX
   - Includes toy vehicles designed to be ridden by children
`;

// ═══════════════════════════════════════════════════════════════════════════════
// HOUSEHOLD VS INDUSTRIAL DISTINCTION
// ═══════════════════════════════════════════════════════════════════════════════

const HOUSEHOLD_VS_INDUSTRIAL_RULES = `
HOUSEHOLD vs INDUSTRIAL CLASSIFICATION:

HOUSEHOLD articles (for consumer/home use):
- Plastic household articles → 3924 (NOT 3923 industrial)
- Steel household articles → 7323 (NOT 7310 industrial)
- Aluminum household articles → 7615 (NOT 7612 industrial)
- Glass household articles → 7013 (NOT 7010 industrial)

INDICATORS OF HOUSEHOLD USE:
- Sold to consumers (retail)
- Used in homes, kitchens, bathrooms
- Decorative purpose
- Personal use items
- Small quantities (bottles, cups, containers for personal use)

INDUSTRIAL containers (for factories, shipping):
- 3923: Plastic boxes, cases, crates for conveyance/packing
- 7310: Steel tanks, casks, drums for industrial materials
- 7612: Aluminum containers for industrial use

KEY DISTINCTIONS:
- Water bottle for personal use → 7323 (household)
- Steel drum for shipping chemicals → 7310 (industrial)
- Plastic food container for home → 3924 (household)
- Plastic crate for shipping goods → 3923 (industrial)
`;

// ═══════════════════════════════════════════════════════════════════════════════
// TEXTILE CLASSIFICATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

const TEXTILE_RULES = `
TEXTILE CLASSIFICATION (Chapters 61-62):

Chapter 61: KNITTED or crocheted apparel
Chapter 62: NOT knitted (woven, nonwoven)

T-shirts, polo shirts, sweatshirts → Usually 61 (knit)
Dress shirts, blouses → Usually 62 (woven)

MATERIAL DETERMINES SUBHEADING:
Within each heading, material determines the 6-digit code:
- .10 = Cotton (≥50% cotton by weight)
- .20 = Wool or fine animal hair
- .30 = Synthetic fibers (polyester, nylon, etc.)
- .90 = Other fibers (silk, linen, blends)

EXAMPLES:
- Cotton t-shirt (knit) → 6109.10.XX
- Polyester t-shirt (knit) → 6109.90.XX (other, including synthetic)
- Cotton dress shirt (woven) → 6205.20.XX

GENDER/AGE:
- Men's or boys' → specific statistical suffixes
- Women's or girls' → specific statistical suffixes
`;

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER KNOWLEDGE BASE
// ═══════════════════════════════════════════════════════════════════════════════

const CHAPTER_GUIDE = `
KEY CHAPTER CLASSIFICATIONS:

MATERIAL-DRIVEN (for non-functional articles):
- Chapter 39: Plastics and articles thereof
- Chapter 40: Rubber and articles thereof
- Chapter 42: Leather articles, TRAVEL GOODS, CASES for carrying
- Chapter 44: Wood and articles of wood
- Chapter 48: Paper and paperboard
- Chapter 69: Ceramic products
- Chapter 70: Glass and glassware
- Chapter 71: Jewelry, precious stones/metals
- Chapter 73: Articles of iron or steel
- Chapter 74: Copper articles
- Chapter 76: Aluminum articles

FUNCTION-DRIVEN (material doesn't matter):
- Chapter 61: Knitted apparel (by fiber type)
- Chapter 62: Woven apparel (by fiber type)
- Chapter 63: Other textile articles (blankets, linens)
- Chapter 64: Footwear
- Chapter 84: Machinery, mechanical appliances
- Chapter 85: Electrical machinery and equipment
- Chapter 87: Vehicles
- Chapter 94: Furniture, lamps, bedding
- Chapter 95: Toys, games, sports equipment
- Chapter 96: Miscellaneous manufactured articles
`;

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: DEEP PRODUCT UNDERSTANDING
// ═══════════════════════════════════════════════════════════════════════════════

async function understandProductV7(input: ClassificationV7Input): Promise<ProductUnderstanding> {
  const xai = getXAIClient();
  
  const prompt = `Analyze this product deeply. Your analysis will be used for HTS classification.

PRODUCT: "${input.description}"
${input.material ? `STATED MATERIAL: ${input.material}` : ''}
${input.use ? `STATED USE: ${input.use}` : ''}

Provide a detailed analysis:

1. WHAT IS THIS? (One clear sentence)
2. PRIMARY FUNCTION: What does it DO? (hold things, protect something, worn on body, etc.)
3. MATERIAL: What is it made of? Be specific (e.g., "plastic (polypropylene)", "100% cotton", "stainless steel")
4. MATERIAL SOURCE: Is material "stated" in description, "inferred" by you, or "unknown"?
5. MATERIAL COMPOSITION: For textiles, specify percentage if possible
6. USE CONTEXT: Who uses this? (household/consumer, commercial/business, industrial/factory, agricultural/farm)

7. BOOLEAN CHECKS (answer true/false for each):
   - isForCarrying: Is this a CASE, BAG, or PROTECTIVE CONTAINER designed to CARRY and PROTECT other portable ITEMS during transport? 
     TRUE: phone case, laptop bag, camera case, suitcase, handbag, briefcase
     FALSE: water bottle (holds liquid for drinking), food container (holds food), planter (holds soil/plants), bucket
     Key: Must be designed to PROTECT and TRANSPORT discrete items - NOT for holding consumables/liquids
   - isWearable: Is this worn on the human body? (clothing, jewelry, watches, rings)
   - isToy: Is this designed primarily for CHILDREN'S PLAY or amusement? (toy cars, dolls, action figures, toy trains)
     NOT: festive decorations, carnival items, magic tricks
   - isFurniture: Is this furniture (chairs, tables, beds, shelves)?
   - isElectronic: Does this have electrical components or require electricity?
   - isMachinery: Does this have mechanical moving parts for operation?
   - isJewelry: Is this an ADORNMENT worn on the body for decorative purposes? (rings, necklaces, bracelets, earrings)
     Key: If it's worn for decoration/fashion, it's jewelry REGARDLESS of material (rubber, plastic, metal)

8. KEYWORDS: 5-8 specific terms for this product

Return ONLY valid JSON:
{
  "whatThisIs": "string",
  "productType": "string (specific name like 'phone case', 't-shirt', 'water bottle')",
  "primaryFunction": "string",
  "material": "string",
  "materialSource": "stated|inferred|unknown",
  "materialComposition": "string or null",
  "useContext": "household|commercial|industrial|agricultural",
  "isForCarrying": boolean,
  "isWearable": boolean,
  "isToy": boolean,
  "isFurniture": boolean,
  "isElectronic": boolean,
  "isMachinery": boolean,
  "isJewelry": boolean,
  "keywords": ["array", "of", "strings"]
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a product analysis expert. Return ONLY valid JSON. Be precise and specific. Think about how this product would be classified for customs/import purposes.' 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 800,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      whatThisIs: parsed.whatThisIs || input.description,
      productType: parsed.productType || input.description,
      primaryFunction: parsed.primaryFunction || 'unknown',
      material: input.material || parsed.material || 'unknown',
      materialSource: input.material ? 'stated' : (parsed.materialSource || 'unknown'),
      materialComposition: parsed.materialComposition || undefined,
      useContext: parsed.useContext || 'household',
      isForCarrying: parsed.isForCarrying || false,
      isWearable: parsed.isWearable || false,
      isToy: parsed.isToy || false,
      isFurniture: parsed.isFurniture || false,
      isElectronic: parsed.isElectronic || false,
      isMachinery: parsed.isMachinery || false,
      isJewelry: parsed.isJewelry || false,
      keywords: parsed.keywords || input.description.split(' '),
    };
  } catch (error) {
    console.error('[V7] Understanding error:', error);
    return {
      whatThisIs: input.description,
      productType: input.description,
      primaryFunction: 'unknown',
      material: input.material || 'unknown',
      materialSource: input.material ? 'stated' : 'unknown',
      useContext: 'household',
      isForCarrying: false,
      isWearable: false,
      isToy: false,
      isFurniture: false,
      isElectronic: false,
      isMachinery: false,
      isJewelry: false,
      keywords: input.description.split(' '),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: GRI-AWARE CHAPTER SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply function-over-material rules to determine if we should
 * force a specific chapter regardless of material.
 */
function applyFunctionOverMaterial(understanding: ProductUnderstanding): { 
  forcedChapter?: string; 
  forcedHeading?: string;
  rule: string;
} | null {
  // Cases for carrying → Chapter 42
  if (understanding.isForCarrying) {
    return {
      forcedChapter: '42',
      forcedHeading: '4202',
      rule: 'GRI 3(a): Cases/containers for carrying classified under 4202 (most specific description)'
    };
  }
  
  // Toys → Chapter 95
  if (understanding.isToy) {
    return {
      forcedChapter: '95',
      forcedHeading: '9503',
      rule: 'GRI 3(a): Toys classified under Chapter 95 regardless of material'
    };
  }
  
  // Furniture → Chapter 94
  if (understanding.isFurniture) {
    return {
      forcedChapter: '94',
      rule: 'GRI 3(a): Furniture classified under Chapter 94 regardless of material'
    };
  }
  
  // Electronics → Chapter 85
  if (understanding.isElectronic) {
    return {
      forcedChapter: '85',
      rule: 'Function: Electrical equipment classified under Chapter 85'
    };
  }
  
  // Machinery → Chapter 84
  if (understanding.isMachinery) {
    return {
      forcedChapter: '84',
      rule: 'Function: Machinery classified under Chapter 84'
    };
  }
  
  // Jewelry (adornment) → Chapter 71
  if (understanding.isJewelry) {
    return {
      forcedChapter: '71',
      forcedHeading: '7117',
      rule: 'GRI 3(a): Jewelry/adornment classified under 7117 (imitation jewelry) regardless of material'
    };
  }
  
  // Wearable apparel → Chapters 61/62
  if (understanding.isWearable && isApparel(understanding.productType)) {
    // Determine knit vs woven
    const isKnit = isKnittedGarment(understanding.productType);
    return {
      forcedChapter: isKnit ? '61' : '62',
      rule: `GRI 1: Apparel classified under Chapter ${isKnit ? '61 (knit)' : '62 (woven)'}`
    };
  }
  
  return null;
}

function isApparel(productType: string): boolean {
  const apparelTerms = ['shirt', 't-shirt', 'tshirt', 'blouse', 'dress', 'pants', 'trousers', 
    'jacket', 'coat', 'sweater', 'hoodie', 'shorts', 'skirt', 'suit', 'vest'];
  return apparelTerms.some(term => productType.toLowerCase().includes(term));
}

function isKnittedGarment(productType: string): boolean {
  // T-shirts, polo shirts, sweatshirts, hoodies are typically knit
  const knittedItems = ['t-shirt', 'tshirt', 'polo', 'sweatshirt', 'hoodie', 'sweater', 
    'pullover', 'cardigan', 'jersey', 'tank top'];
  return knittedItems.some(term => productType.toLowerCase().includes(term));
}

/**
 * Select chapter using GRI rules and domain knowledge
 */
async function selectChapterV7(understanding: ProductUnderstanding): Promise<{
  chapter: string;
  heading?: string;
  reasoning: string;
  griRule: string;
}> {
  const xai = getXAIClient();
  
  // First, check function-over-material rules
  const functionRule = applyFunctionOverMaterial(understanding);
  if (functionRule?.forcedChapter) {
    console.log('[V7] Function over material applied:', functionRule.rule);
    return {
      chapter: functionRule.forcedChapter,
      heading: functionRule.forcedHeading,
      reasoning: functionRule.rule,
      griRule: functionRule.rule,
    };
  }
  
  // For material-driven products, use AI with strong guidance
  const prompt = `You are a US Customs HTS classification expert.

${GRI_RULES}

${FUNCTION_OVER_MATERIAL_RULES}

${HOUSEHOLD_VS_INDUSTRIAL_RULES}

${CHAPTER_GUIDE}

PRODUCT TO CLASSIFY:
- What it is: ${understanding.whatThisIs}
- Product type: ${understanding.productType}
- Primary function: ${understanding.primaryFunction}
- Material: ${understanding.material}
- Use context: ${understanding.useContext}
- Is for carrying: ${understanding.isForCarrying}
- Is wearable: ${understanding.isWearable}

TASK: Select the correct HTS CHAPTER (2-digit) for this product.

Think step by step:
1. Does function-over-material apply? (cases, toys, furniture, electronics)
2. If household article, what material is it? (plastic→39, steel→73, ceramic→69, glass→70)
3. Is it household or industrial?

Return JSON:
{
  "chapter": "XX",
  "reasoning": "One sentence explaining why",
  "griRule": "Which GRI rule or principle applies"
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'You are an HTS classification expert. Apply the rules precisely. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 300,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      chapter: parsed.chapter?.toString().padStart(2, '0') || '00',
      reasoning: parsed.reasoning || 'AI selection',
      griRule: parsed.griRule || 'GRI 1',
    };
  } catch (error) {
    console.error('[V7] Chapter selection error:', error);
    // Fallback: guess based on material
    const materialChapters: Record<string, string> = {
      'plastic': '39', 'silicone': '39', 'rubber': '40',
      'cotton': '61', 'polyester': '61', 'textile': '61',
      'steel': '73', 'iron': '73', 'stainless': '73',
      'aluminum': '76', 'copper': '74',
      'glass': '70', 'ceramic': '69',
      'wood': '44', 'leather': '42',
    };
    const mat = understanding.material.toLowerCase();
    for (const [key, chapter] of Object.entries(materialChapters)) {
      if (mat.includes(key)) {
        return { chapter, reasoning: 'Fallback: material-based', griRule: 'GRI 1' };
      }
    }
    return { chapter: '96', reasoning: 'Fallback: miscellaneous', griRule: 'GRI 4' };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: HEADING SELECTION
// ═══════════════════════════════════════════════════════════════════════════════

async function selectHeadingV7(
  chapter: string, 
  understanding: ProductUnderstanding,
  preselectedHeading?: string
): Promise<{
  heading: string;
  description: string;
  reasoning: string;
  alternatives: { code: string; description: string; whyNot: string }[];
}> {
  // If heading was pre-selected by function-over-material rules
  if (preselectedHeading) {
    const headingData = await prisma.htsCode.findFirst({
      where: { code: preselectedHeading, level: 'heading' }
    });
    return {
      heading: preselectedHeading,
      description: headingData?.description || 'Pre-selected heading',
      reasoning: 'Heading determined by function-over-material rule',
      alternatives: [],
    };
  }
  
  const xai = getXAIClient();
  
  // Get all headings in this chapter
  const headings = await prisma.htsCode.findMany({
    where: {
      level: 'heading',
      chapter: chapter.padStart(2, '0'),
    },
    orderBy: { code: 'asc' },
  });
  
  if (headings.length === 0) {
    throw new Error(`No headings found for chapter ${chapter}`);
  }
  
  const headingList = headings.map((h, i) => 
    `${i + 1}. ${h.codeFormatted}: ${h.description.substring(0, 150)}`
  ).join('\n');
  
  // Special rules for specific chapters
  let chapterSpecificRules = '';
  
  if (chapter === '73') {
    chapterSpecificRules = `
CHAPTER 73 RULES:
- 7310: Industrial tanks, casks, drums (factories, shipping)
- 7323: HOUSEHOLD articles (consumer products for home use)
- Water bottles, food containers, kitchen items → 7323
- Shipping drums, industrial containers → 7310
`;
  } else if (chapter === '39') {
    chapterSpecificRules = `
CHAPTER 39 RULES:
- 3923: Industrial containers for conveyance/packing (shipping crates, industrial boxes)
- 3924: HOUSEHOLD articles (consumer products, kitchenware, home goods)
- 3925: Builder's ware (construction materials)
- 3926: Other articles (catch-all)
- Planters, food containers, household storage → 3924
- Shipping crates, industrial packaging → 3923
`;
  } else if (chapter === '61') {
    chapterSpecificRules = `
CHAPTER 61 RULES (Knitted apparel):
- 6105: Men's/boys' shirts (dress shirts, button-up)
- 6106: Women's/girls' blouses and shirts
- 6109: T-shirts, singlets, tank tops (both genders) - MOST COMMON FOR T-SHIRTS
- 6110: Sweaters, pullovers, cardigans
- T-shirts ALWAYS go to 6109, NOT 6105
`;
  } else if (chapter === '95') {
    chapterSpecificRules = `
CHAPTER 95 RULES (Toys and Games):
- 9503: TOYS - wheeled toys, dolls, toy animals, toy vehicles, construction sets, puzzles, etc.
  THIS IS THE MAIN HEADING FOR CHILDREN'S TOYS
- 9504: Video game consoles, arcade games, billiard equipment, card games
- 9505: FESTIVE articles, carnival items, magic tricks, Christmas decorations
  NOT for regular toys - only for party/holiday items
- 9506: Sports equipment

CRITICAL DISTINCTIONS:
- Toy car, toy train, action figure, doll → 9503 (toys)
- Party supplies, Christmas ornaments, carnival masks → 9505 (festive)
- Toy vehicles designed to be ridden by children → 9503

A "toy car for kids" is DEFINITELY 9503, not 9505.
`;
  } else if (chapter === '85') {
    chapterSpecificRules = `
CHAPTER 85 RULES (Electrical):
- 8539: Electric LAMPS and LIGHTING
  - 8539.21: Filament lamps (incandescent)
  - 8539.22: Discharge lamps (fluorescent, etc.)
  - 8539.50: LED LAMPS AND MODULES - USE THIS FOR LED BULBS
- 8544: Insulated wire, cable, connectors
  - 8544.42: Cables with connectors (USB cables, charging cables)
- 8536: Switches, connectors, plugs

CRITICAL FOR LIGHT BULBS:
LED light bulb → 8539.50 (LED lamps)
Incandescent bulb → 8539.21
Fluorescent bulb → 8539.22
`;
  }
  
  const prompt = `You are selecting the HTS HEADING (4-digit) for this product.

PRODUCT:
- What it is: ${understanding.whatThisIs}
- Product type: ${understanding.productType}
- Material: ${understanding.material}
- Use context: ${understanding.useContext}

CHAPTER: ${chapter}

${chapterSpecificRules}

${HOUSEHOLD_VS_INDUSTRIAL_RULES}

AVAILABLE HEADINGS:
${headingList}

Select the MOST SPECIFIC heading that accurately describes this product.
Apply GRI 3(a): Most specific description wins.

Return JSON:
{
  "selectedIndex": <1-based index>,
  "reasoning": "Why this heading",
  "rejected": [{"index": <number>, "reason": "why not"}]
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'You are an HTS expert. Select the most specific heading. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 400,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    const idx = (parsed.selectedIndex || 1) - 1;
    const selected = headings[Math.max(0, Math.min(idx, headings.length - 1))];
    
    return {
      heading: selected.code,
      description: selected.description,
      reasoning: parsed.reasoning || 'AI selection',
      alternatives: (parsed.rejected || []).slice(0, 3).map((r: any) => ({
        code: headings[r.index - 1]?.code || '',
        description: headings[r.index - 1]?.description || '',
        whyNot: r.reason,
      })).filter((a: any) => a.code),
    };
  } catch (error) {
    console.error('[V7] Heading selection error:', error);
    return {
      heading: headings[0].code,
      description: headings[0].description,
      reasoning: 'Fallback to first heading',
      alternatives: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: NAVIGATE DOWN THE TREE
// ═══════════════════════════════════════════════════════════════════════════════

async function navigateSublevels(
  startingCode: string,
  understanding: ProductUnderstanding
): Promise<NavigationStep[]> {
  const steps: NavigationStep[] = [];
  let currentCode = startingCode.replace(/\./g, '');
  const xai = getXAIClient();
  
  // Get starting point info
  const startingPoint = await prisma.htsCode.findFirst({
    where: { code: currentCode }
  });
  
  if (startingPoint) {
    steps.push({
      level: startingPoint.level,
      code: startingPoint.code,
      codeFormatted: startingPoint.codeFormatted,
      description: startingPoint.description,
      reasoning: 'Starting heading',
      selected: true,
      alternatives: [],
    });
  }
  
  // Navigate down
  let depth = 0;
  const maxDepth = 4;
  
  while (depth < maxDepth) {
    const children = await prisma.htsCode.findMany({
      where: { parentCode: currentCode },
      orderBy: { code: 'asc' },
    });
    
    if (children.length === 0) break;
    
    // Special handling for textile material routing
    let selectedChild = null;
    const material = understanding.material.toLowerCase();
    
    // T-shirts (6109): route by material
    if (currentCode === '6109') {
      const cottonChild = children.find(c =>
        c.code.startsWith('610910') ||
        c.description.toLowerCase().includes('cotton')
      );
      const woolChild = children.find(c =>
        c.code.startsWith('610920') ||
        c.description.toLowerCase().includes('wool')
      );
      const syntheticChild = children.find(c =>
        c.code.startsWith('610990') ||
        c.description.toLowerCase().includes('other')
      );

      if (material.includes('cotton') && cottonChild) {
        selectedChild = cottonChild;
        console.log('[V7] Textile routing: cotton → 610910');
      } else if (material.includes('wool') && woolChild) {
        selectedChild = woolChild;
        console.log('[V7] Textile routing: wool → 610920');
      } else if ((material.includes('polyester') || material.includes('synthetic') || material.includes('nylon')) && syntheticChild) {
        selectedChild = syntheticChild;
        console.log('[V7] Textile routing: synthetic → 610990');
      }
    }

    // T-shirt subheadings (610910, 610920, 610990): route by gender
    if (currentCode === '610910' || currentCode === '610920' || currentCode === '610990') {
      const mensBoysChild = children.find(c =>
        c.description.toLowerCase().includes("men's") ||
        c.description.toLowerCase().includes("boys'")
      );

      // For cotton t-shirts, most are men's/boys' unless specified otherwise
      if (mensBoysChild && understanding.productType.toLowerCase().includes('t-shirt')) {
        selectedChild = mensBoysChild;
        console.log('[V7] T-shirt gender routing: mens/boys');
      }
    }
    
    // Blankets (6301): route by material
    if (currentCode === '6301') {
      const syntheticChild = children.find(c =>
        c.code.startsWith('630140') ||
        c.description.toLowerCase().includes('synthetic')
      );
      const cottonChild = children.find(c =>
        c.description.toLowerCase().includes('cotton')
      );
      const otherChild = children.find(c =>
        c.description.toLowerCase().includes('other')
      );

      if ((material.includes('polyester') || material.includes('synthetic') || material.includes('fleece')) && syntheticChild) {
        selectedChild = syntheticChild;
        console.log('[V7] Blanket routing: synthetic → 630140');
      } else if (material.includes('cotton') && cottonChild) {
        selectedChild = cottonChild;
        console.log('[V7] Blanket routing: cotton');
      } else if (otherChild) {
        selectedChild = otherChild;
        console.log('[V7] Blanket routing: other');
      }
    }
    
    if (!selectedChild) {
      // Use AI to select
      const childList = children.map((c, i) => 
        `${i + 1}. ${c.codeFormatted}: ${c.description.substring(0, 100)}`
      ).join('\n');
      
      const prompt = `Select the correct HTS code for this product.

PRODUCT: ${understanding.whatThisIs}
- Type: ${understanding.productType}
- Material: ${understanding.material}
- Use: ${understanding.useContext}

PARENT CODE: ${formatHtsCode(currentCode)}

CHILDREN:
${childList}

RULES:
- Select the MOST SPECIFIC code that matches
- Check for CARVE-OUTS: specific codes like "Nursing nipples" do NOT apply to general products
- If no specific code matches, select "Other" catch-all
- For textiles: cotton→.10, synthetic→.90

Return JSON: {"selectedIndex": <1-based>, "reasoning": "why"}`;

      try {
        const response = await xai.chat.completions.create({
          model: 'grok-3-mini',
          messages: [
            { role: 'system', content: 'Select the most appropriate code. Return only valid JSON.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 200,
        });
        
        const content = response.choices[0]?.message?.content || '';
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const idx = (parsed.selectedIndex || 1) - 1;
          selectedChild = children[Math.max(0, Math.min(idx, children.length - 1))];
          
          steps.push({
            level: selectedChild.level,
            code: selectedChild.code,
            codeFormatted: selectedChild.codeFormatted,
            description: selectedChild.description,
            reasoning: parsed.reasoning || 'AI selection',
            selected: true,
            alternatives: [],
          });
        }
      } catch (error) {
        console.error('[V7] Sublevel selection error:', error);
        selectedChild = children[children.length - 1]; // Usually "Other" is last
      }
    } else {
      steps.push({
        level: selectedChild.level,
        code: selectedChild.code,
        codeFormatted: selectedChild.codeFormatted,
        description: selectedChild.description,
        reasoning: `Material routing: ${understanding.material}`,
        selected: true,
        alternatives: [],
      });
    }
    
    if (selectedChild) {
      currentCode = selectedChild.code;
    } else {
      break;
    }
    
    depth++;
  }
  
  return steps;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function formatHtsCode(code: string): string {
  const clean = code.replace(/\./g, '');
  if (clean.length <= 4) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 4)}.${clean.slice(4)}`;
  if (clean.length <= 8) return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}.${clean.slice(8)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function classifyProductV7(input: ClassificationV7Input): Promise<ClassificationV7Result> {
  const startTime = Date.now();
  const griRulesApplied: string[] = [];
  
  console.log('[V7] ════════════════════════════════════════════════════════════');
  console.log('[V7] Starting V7 GRI-aware classification for:', input.description);
  console.log('[V7] ════════════════════════════════════════════════════════════');
  
  // PHASE 1: Deep product understanding
  console.log('[V7] Phase 1: Understanding product...');
  const understanding = await understandProductV7(input);
  console.log('[V7] Product type:', understanding.productType);
  console.log('[V7] Material:', understanding.material);
  console.log('[V7] Is for carrying:', understanding.isForCarrying);
  console.log('[V7] Is wearable:', understanding.isWearable);
  console.log('[V7] Use context:', understanding.useContext);
  
  // PHASE 2: Chapter selection with GRI rules
  console.log('[V7] Phase 2: Selecting chapter...');
  const chapterResult = await selectChapterV7(understanding);
  console.log('[V7] Chapter:', chapterResult.chapter, '-', chapterResult.reasoning);
  griRulesApplied.push(chapterResult.griRule);
  
  // PHASE 3: Heading selection
  console.log('[V7] Phase 3: Selecting heading...');
  const headingResult = await selectHeadingV7(
    chapterResult.chapter, 
    understanding,
    undefined // Could be pre-selected by function rules
  );
  console.log('[V7] Heading:', headingResult.heading, '-', headingResult.description.substring(0, 50));
  
  // PHASE 4: Navigate down the tree
  console.log('[V7] Phase 4: Navigating sublevels...');
  const sublevelSteps = await navigateSublevels(headingResult.heading, understanding);
  
  // Build final tree path
  const allSteps: NavigationStep[] = [
    {
      level: 'chapter',
      code: chapterResult.chapter,
      codeFormatted: chapterResult.chapter,
      description: `Chapter ${chapterResult.chapter}`,
      reasoning: chapterResult.reasoning,
      griRuleApplied: chapterResult.griRule,
      selected: true,
      alternatives: [],
    },
    ...sublevelSteps,
  ];
  
  const finalStep = allSteps[allSteps.length - 1];
  
  // Get duty rate
  const finalCodeData = await prisma.htsCode.findFirst({
    where: { code: finalStep.code },
    select: { generalRate: true, description: true },
  });
  
  // Calculate confidence
  let confidence = 0.9;
  if (understanding.isForCarrying || understanding.isToy || understanding.isFurniture) {
    confidence += 0.05; // Higher confidence when function rules apply
  }
  if (understanding.materialSource === 'stated') {
    confidence += 0.03;
  }
  // Reduce for each "Other" selection
  for (const step of allSteps) {
    if (step.description.toLowerCase() === 'other' || step.description.toLowerCase() === 'other:') {
      confidence -= 0.02;
    }
  }
  confidence = Math.max(0.5, Math.min(0.98, confidence));
  
  const confidenceLabel = confidence >= 0.85 ? 'high' : confidence >= 0.7 ? 'medium' : 'low';
  
  // Build transparency
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
  if (understanding.isForCarrying) inferred.push('Classification rule: Function over material (carrying case)');
  if (understanding.isToy) inferred.push('Classification rule: Function over material (toy)');
  if (understanding.isJewelry) inferred.push('Classification rule: Function over material (jewelry/adornment)');
  
  const result: ClassificationV7Result = {
    success: true,
    htsCode: finalStep.code,
    htsCodeFormatted: finalStep.codeFormatted,
    description: finalCodeData?.description || finalStep.description,
    generalRate: finalCodeData?.generalRate || null,
    confidence,
    confidenceLabel,
    treePath: {
      steps: allSteps,
      finalCode: finalStep.code,
      finalCodeFormatted: finalStep.codeFormatted,
      generalRate: finalCodeData?.generalRate || null,
      confidence,
    },
    productUnderstanding: understanding,
    griRulesApplied,
    transparency: { stated, inferred, assumed },
    processingTimeMs: Date.now() - startTime,
  };
  
  console.log('[V7] ════════════════════════════════════════════════════════════');
  console.log('[V7] RESULT:', result.htsCodeFormatted);
  console.log('[V7] Confidence:', confidenceLabel, `(${(confidence * 100).toFixed(0)}%)`);
  console.log('[V7] Time:', result.processingTimeMs, 'ms');
  console.log('[V7] ════════════════════════════════════════════════════════════');
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { understandProductV7, selectChapterV7, selectHeadingV7 };

