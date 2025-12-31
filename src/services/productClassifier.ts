/**
 * Product Classifier V8 - Route Determination
 * 
 * This module analyzes products and determines the classification "route":
 * - Function-driven: Cases, toys, furniture, electronics, jewelry (material doesn't matter)
 * - Material-driven: Household containers, general articles (material determines chapter)
 * 
 * It also identifies "decision points" - attributes that need user input before classification.
 * 
 * @module productClassifier
 * @created December 27, 2025
 */

import { getXAIClient } from '@/lib/xai';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProductUnderstanding {
  // Core understanding
  whatThisIs: string;
  productType: string;
  primaryFunction: string;
  
  // Material info
  material: string;
  materialSource: 'stated' | 'inferred' | 'unknown';
  
  // Use context
  useContext: 'household' | 'commercial' | 'industrial' | 'agricultural';
  
  // Function-over-material boolean checks
  isForCarrying: boolean;      // Cases, bags, protective containers for ITEMS
  isWearable: boolean;         // Clothing, accessories worn on body
  isToy: boolean;              // Children's play items
  isFurniture: boolean;        // Chairs, tables, beds
  isElectronic: boolean;       // Requires electricity
  isMachinery: boolean;        // Mechanical operation
  isJewelry: boolean;          // Adornment worn for decoration
  isTextile: boolean;          // Made from woven/knit fabric
  isLighting: boolean;         // Light bulbs, lamps
  
  // Additional context
  keywords: string[];
  confidence: number;
}

export interface DecisionPoint {
  id: string;
  attribute: 'material' | 'gender' | 'use' | 'fiber' | 'construction';
  question: string;
  options: DecisionOption[];
  impact: 'high' | 'medium' | 'low';
  currentValue?: string;       // If we have an inferred value
  currentSource?: 'stated' | 'inferred' | 'unknown';
}

export interface DecisionOption {
  value: string;
  label: string;
  htsImpact: string;           // "Chapter 39 (Plastic)" or "6109.10 (Cotton)"
  dutyEstimate?: string;       // "~5%" or "Free under FTA"
}

export type FunctionRule = 'cases' | 'toys' | 'furniture' | 'electronics' | 'jewelry' | 'apparel' | 'lighting' | 'cables';

export interface ClassificationRoute {
  // Which classification path to take
  routeType: 'function-driven' | 'material-driven';
  
  // If function-driven, which rule applies
  functionRule?: FunctionRule;
  forcedChapter?: string;
  forcedHeading?: string;
  routeReason: string;
  
  // Decision points that need user input
  decisionPoints: DecisionPoint[];
  
  // If no questions needed, classification can proceed immediately
  readyToClassify: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCTION-OVER-MATERIAL PRODUCT PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Products that are ALWAYS classified by function, regardless of material.
 * These patterns help the AI make correct boolean determinations.
 */
const CARRYING_CASE_PATTERNS = [
  'phone case', 'phone cover', 'phone protector',
  'laptop bag', 'laptop case', 'laptop sleeve',
  'camera case', 'camera bag',
  'tablet case', 'tablet cover',
  'suitcase', 'luggage', 'travel bag',
  'briefcase', 'messenger bag', 'backpack',
  'handbag', 'purse', 'wallet', 'clutch',
  'pencil case', 'cosmetic bag', 'makeup bag',
  'tool bag', 'tool case',
  'glasses case', 'eyeglass case', 'sunglasses case',
  'watch case', 'jewelry case', 'jewelry box',
  'gun case', 'instrument case', 'violin case', 'guitar case',
];

const TOY_PATTERNS = [
  'toy car', 'toy truck', 'toy train', 'toy airplane',
  'action figure', 'doll', 'stuffed animal', 'plush toy',
  'building blocks', 'lego', 'construction toy',
  'board game', 'puzzle', 'jigsaw',
  'toy gun', 'water gun', 'nerf',
  'play set', 'playset', 'dollhouse',
  'toy robot', 'remote control car', 'rc car',
  'toy soldier', 'figurine',
  'children\'s toy', 'kids toy', 'for kids',
];

const JEWELRY_PATTERNS = [
  'ring', 'finger ring', 'band ring',
  'necklace', 'pendant', 'chain',
  'bracelet', 'bangle', 'wristband',
  'earring', 'ear ring', 'stud',
  'brooch', 'pin', 'badge',
  'anklet', 'ankle bracelet',
  'body jewelry', 'belly ring', 'nose ring',
];

const APPAREL_PATTERNS = [
  't-shirt', 'tshirt', 'shirt', 'blouse',
  'pants', 'trousers', 'jeans', 'shorts',
  'dress', 'skirt', 'gown',
  'jacket', 'coat', 'blazer', 'vest',
  'sweater', 'hoodie', 'sweatshirt', 'cardigan',
  'underwear', 'boxer', 'brief', 'panties', 'bra',
  'socks', 'stockings', 'tights',
  'hat', 'cap', 'beanie',
  'gloves', 'mittens', 'scarf',
];

const TEXTILE_HOME_PATTERNS = [
  'blanket', 'throw blanket', 'fleece blanket',
  'towel', 'bath towel', 'hand towel',
  'sheet', 'bed sheet', 'fitted sheet',
  'pillowcase', 'pillow cover',
  'curtain', 'drape', 'window treatment',
  'tablecloth', 'table linen',
  'napkin', 'placemat',
  'rug', 'carpet', 'mat',
  'cushion cover', 'pillow sham',
];

// NOTE: These patterns are kept minimal - AI handles most electronics detection
// Only list patterns where we need to ensure detection even if AI misses
const ELECTRONICS_PATTERNS = [
  'phone', 'smartphone', 'tablet', 'laptop', 'computer',
  'tv', 'television', 'monitor', 'display', 'screen',
  'speaker', 'headphone', 'earphone', 'earbud',
  'camera', 'webcam', 'camcorder',
  'charger', 'power adapter', 'power supply',
  'battery', 'power bank',
  'router', 'modem', 'switch',
  'keyboard', 'mouse', 'controller',
  'projector', 'printer', 'scanner',
  'microwave', 'refrigerator', 'washer', 'dryer',
  'air conditioner', 'heater', 'fan',
  'radio', 'receiver', 'amplifier',
  'drone', 'robot', 'smart',
];

const CABLE_PATTERNS = [
  'usb cable', 'usb-c cable', 'lightning cable',
  'charging cable', 'charger cable',
  'hdmi cable', 'displayport cable',
  'ethernet cable', 'network cable',
  'power cord', 'extension cord',
  'audio cable', 'aux cable',
  'data cable', 'sync cable',
];

const LIGHTING_PATTERNS = [
  'light bulb', 'lightbulb', 'led bulb', 'bulb',
  'lamp', 'table lamp', 'floor lamp', 'desk lamp',
  'ceiling light', 'pendant light', 'chandelier',
  'flashlight', 'torch', 'headlamp',
  'led strip', 'light strip', 'rope light',
  'floodlight', 'spotlight', 'work light',
];

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCT ANALYSIS - AI-POWERED UNDERSTANDING
// ═══════════════════════════════════════════════════════════════════════════════

// Pre-extract materials from description
const KNOWN_MATERIALS = [
  'cotton', 'polyester', 'nylon', 'wool', 'silk', 'linen',
  'plastic', 'silicone', 'rubber', 'latex',
  'steel', 'stainless steel', 'stainless', 'iron', 'aluminum', 'aluminium',
  'copper', 'brass', 'bronze',
  'glass', 'crystal',
  'ceramic', 'porcelain', 'terracotta', 'earthenware',
  'wood', 'bamboo', 'plywood',
  'leather', 'synthetic leather', 'faux leather',
  'fleece', 'acrylic', 'rayon', 'spandex',
];

function extractMaterialFromDescription(desc: string): { material: string; source: 'stated' | 'inferred' } | null {
  const descLower = desc.toLowerCase();
  
  // Check for explicit material mentions
  for (const mat of KNOWN_MATERIALS) {
    if (descLower.includes(mat)) {
      return { material: mat, source: 'stated' };
    }
  }
  
  return null;
}

/**
 * Analyze a product description and extract structured understanding.
 * This is the first step in classification - understanding WHAT the product IS.
 */
export async function analyzeProduct(
  description: string,
  options: {
    material?: string;
    use?: string;
  } = {}
): Promise<ProductUnderstanding> {
  const xai = getXAIClient();
  
  // Pre-extract material from description if not explicitly provided
  const extractedMaterial = !options.material ? extractMaterialFromDescription(description) : null;
  
  // Pre-check for obvious function-over-material patterns
  const descLower = description.toLowerCase();
  const preChecks = {
    isCarryingCase: CARRYING_CASE_PATTERNS.some(p => descLower.includes(p)),
    isToy: TOY_PATTERNS.some(p => descLower.includes(p)) || descLower.includes('for kids') || descLower.includes('for children'),
    isJewelry: JEWELRY_PATTERNS.some(p => descLower.includes(p)),
    isApparel: APPAREL_PATTERNS.some(p => descLower.includes(p)),
    isElectronics: ELECTRONICS_PATTERNS.some(p => descLower.includes(p)),
    isCable: CABLE_PATTERNS.some(p => descLower.includes(p)),
    isLighting: LIGHTING_PATTERNS.some(p => descLower.includes(p)),
  };
  
  const prompt = `Analyze this product for HTS customs classification.

PRODUCT: "${description}"
${options.material ? `STATED MATERIAL: ${options.material}` : ''}
${options.use ? `STATED USE: ${options.use}` : ''}

PRE-ANALYSIS HINTS (patterns detected):
- Carrying case pattern: ${preChecks.isCarryingCase}
- Toy pattern: ${preChecks.isToy}
- Jewelry pattern: ${preChecks.isJewelry}
- Apparel pattern: ${preChecks.isApparel}
- Electronics pattern: ${preChecks.isElectronics}
- Cable pattern: ${preChecks.isCable}
- Lighting pattern: ${preChecks.isLighting}

TASK: Provide deep product understanding. Be PRECISE about the boolean checks.

CRITICAL BOOLEAN DEFINITIONS:

1. isForCarrying: Is this a CASE, BAG, or CONTAINER designed to CARRY and PROTECT discrete ITEMS?
   TRUE: phone case, laptop bag, suitcase, handbag, briefcase, camera case, pencil case
   FALSE: water bottle (holds liquid), food container (holds food), planter (holds soil), bucket, jar
   KEY: Must protect discrete items during TRANSPORT - NOT for holding consumables/liquids/bulk materials

2. isJewelry: Is this an ADORNMENT worn on the body for DECORATION?
   TRUE: rings, necklaces, bracelets, earrings, brooches, anklets - regardless of material (rubber, plastic, gold)
   FALSE: watches (functional), hair clips (functional), buttons
   KEY: If worn for decoration/fashion, it's jewelry REGARDLESS of material

3. isToy: Is this designed for CHILDREN'S PLAY or amusement?
   TRUE: toy cars, dolls, action figures, building blocks, puzzles, plush toys
   FALSE: adult collectibles, display models, festive decorations, party supplies
   KEY: Must be designed for children to play with

4. isTextile: Is this made primarily from woven, knitted, or nonwoven FABRIC?
   TRUE: clothing, blankets, towels, linens, upholstery fabric
   FALSE: items that contain some fabric but are primarily another material

5. isLighting: Is this a LIGHT SOURCE or LAMP?
   TRUE: light bulbs, LED bulbs, desk lamps, flashlights, light strips
   FALSE: lamp shades (without bulb), decorative items that happen to glow

6. isElectronic: Does this REQUIRE ELECTRICITY to function?
   TRUE: monitors, TVs, computers, phones, tablets, appliances, speakers, cameras, printers, 
         any device that plugs in or uses batteries to operate its primary function
   FALSE: items that are merely packaged with batteries (like battery-powered toys which are TOYS first),
         passive items like cables by themselves, non-electric versions of products
   KEY: If the PRIMARY FUNCTION requires electricity, it's electronic - classify under Chapter 84-85

Return ONLY valid JSON:
{
  "whatThisIs": "One clear sentence describing what this product actually is",
  "productType": "Specific product name (e.g., 'phone case', 't-shirt', 'water bottle')",
  "primaryFunction": "What it DOES (e.g., 'protects phone during transport', 'holds beverages')",
  "material": "Primary material if known, otherwise 'unknown'",
  "materialSource": "stated|inferred|unknown",
  "useContext": "household|commercial|industrial|agricultural",
  "isForCarrying": boolean,
  "isWearable": boolean,
  "isToy": boolean,
  "isFurniture": boolean,
  "isElectronic": boolean,
  "isMachinery": boolean,
  "isJewelry": boolean,
  "isTextile": boolean,
  "isLighting": boolean,
  "keywords": ["array", "of", "relevant", "terms"],
  "confidence": 0.0-1.0
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a product classification expert. Return ONLY valid JSON. Be precise with boolean checks - they determine the classification path.' 
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
    
    // Determine the effective material
    let effectiveMaterial = options.material || extractedMaterial?.material || parsed.material || 'unknown';
    let effectiveMaterialSource: 'stated' | 'inferred' | 'unknown' = 
      options.material ? 'stated' : 
      extractedMaterial ? 'stated' : // If found in description, treat as stated
      (parsed.materialSource || 'unknown');
    
    // Apply pre-checks to strengthen AI results
    return {
      whatThisIs: parsed.whatThisIs || description,
      productType: parsed.productType || description,
      primaryFunction: parsed.primaryFunction || 'unknown',
      material: effectiveMaterial,
      materialSource: effectiveMaterialSource,
      useContext: parsed.useContext || 'household',
      isForCarrying: preChecks.isCarryingCase || parsed.isForCarrying || false,
      isWearable: preChecks.isApparel || parsed.isWearable || false,
      isToy: preChecks.isToy || parsed.isToy || false,
      isFurniture: parsed.isFurniture || false,
      isElectronic: preChecks.isElectronics || preChecks.isCable || parsed.isElectronic || false,
      isMachinery: parsed.isMachinery || false,
      isJewelry: preChecks.isJewelry || parsed.isJewelry || false,
      isTextile: preChecks.isApparel || parsed.isTextile || false,
      isLighting: preChecks.isLighting || parsed.isLighting || false,
      keywords: parsed.keywords || description.split(' '),
      confidence: parsed.confidence || 0.7,
    };
  } catch (error) {
    console.error('[ProductClassifier] Analysis error:', error);
    // Fallback using pre-checks and extracted material
    return {
      whatThisIs: description,
      productType: description,
      primaryFunction: 'unknown',
      material: options.material || extractedMaterial?.material || 'unknown',
      materialSource: options.material ? 'stated' : extractedMaterial ? 'stated' : 'unknown',
      useContext: 'household',
      isForCarrying: preChecks.isCarryingCase,
      isWearable: preChecks.isApparel,
      isToy: preChecks.isToy,
      isFurniture: false,
      isElectronic: preChecks.isElectronics || preChecks.isCable,
      isMachinery: false,
      isJewelry: preChecks.isJewelry,
      isTextile: preChecks.isApparel,
      isLighting: preChecks.isLighting,
      keywords: description.split(' '),
      confidence: 0.5,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE DETERMINATION - FUNCTION VS MATERIAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine the classification route based on product understanding.
 * This decides whether we use function-driven or material-driven classification.
 */
export function determineRoute(
  understanding: ProductUnderstanding,
  answers?: Record<string, string>
): ClassificationRoute {
  // ─────────────────────────────────────────────────────────────────────────────
  // FUNCTION-DRIVEN ROUTES (material doesn't matter)
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Cases for carrying → Chapter 42
  if (understanding.isForCarrying) {
    return {
      routeType: 'function-driven',
      functionRule: 'cases',
      forcedChapter: '42',
      forcedHeading: '4202',
      routeReason: 'GRI 3(a): Cases and containers for carrying items are classified under 4202 regardless of material',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // Toys → Chapter 95
  if (understanding.isToy) {
    return {
      routeType: 'function-driven',
      functionRule: 'toys',
      forcedChapter: '95',
      forcedHeading: '9503',
      routeReason: 'GRI 3(a): Toys and games are classified under Chapter 95 regardless of material',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // Jewelry/adornment → Chapter 71
  if (understanding.isJewelry) {
    return {
      routeType: 'function-driven',
      functionRule: 'jewelry',
      forcedChapter: '71',
      forcedHeading: '7117',
      routeReason: 'GRI 3(a): Jewelry and imitation jewelry classified under 7117 regardless of material',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // Furniture → Chapter 94
  if (understanding.isFurniture) {
    return {
      routeType: 'function-driven',
      functionRule: 'furniture',
      forcedChapter: '94',
      routeReason: 'GRI 3(a): Furniture classified under Chapter 94 regardless of material',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // Lighting (light bulbs, lamps) → Chapter 85
  if (understanding.isLighting) {
    return {
      routeType: 'function-driven',
      functionRule: 'lighting',
      forcedChapter: '85',
      forcedHeading: '8539',
      routeReason: 'Function: Electric lamps and lighting equipment classified under 8539',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // Cables and wires → Chapter 85
  if (understanding.isElectronic && understanding.productType.toLowerCase().includes('cable')) {
    return {
      routeType: 'function-driven',
      functionRule: 'cables',
      forcedChapter: '85',
      forcedHeading: '8544',
      routeReason: 'Function: Insulated wire and cables classified under 8544',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // Monitors, displays, TVs → Chapter 85, heading 8528
  const productLowerForElectronics = understanding.productType.toLowerCase();
  const isMonitorOrDisplay = ['monitor', 'display', 'television', 'tv', 'screen'].some(term => 
    productLowerForElectronics.includes(term)
  );
  
  if (understanding.isElectronic && isMonitorOrDisplay) {
    return {
      routeType: 'function-driven',
      functionRule: 'electronics',
      forcedChapter: '85',
      forcedHeading: '8528',
      routeReason: 'Function: Monitors, displays, and television receivers classified under 8528',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // Other electronic equipment → Chapter 85 (catch-all for electronics)
  if (understanding.isElectronic) {
    return {
      routeType: 'function-driven',
      functionRule: 'electronics',
      forcedChapter: '85',
      routeReason: 'Function: Electronic equipment classified under Chapter 85',
      decisionPoints: [],
      readyToClassify: true,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // TEXTILE HOME GOODS (blankets, towels, etc.) → Chapter 63
  // ─────────────────────────────────────────────────────────────────────────────
  
  const productLower = understanding.productType.toLowerCase();
  const isTextileHome = TEXTILE_HOME_PATTERNS.some(p => productLower.includes(p));
  
  if (isTextileHome || (understanding.isTextile && productLower.includes('blanket'))) {
    const decisionPoints: DecisionPoint[] = [];
    
    // Check if we need to ask about fiber for blankets
    const materialKnown = understanding.materialSource === 'stated' ||
                          isFiberDeterminable(understanding.material);
    
    if (!materialKnown && !answers?.fiber) {
      decisionPoints.push({
        id: 'fiber',
        attribute: 'fiber',
        question: 'What fiber is this blanket made of?',
        options: [
          { value: 'synthetic', label: 'Polyester/Fleece/Synthetic', htsImpact: '6301.40', dutyEstimate: '~8.5%' },
          { value: 'cotton', label: 'Cotton', htsImpact: '6301.30', dutyEstimate: '~8%' },
          { value: 'wool', label: 'Wool', htsImpact: '6301.20', dutyEstimate: '~6%' },
          { value: 'other', label: 'Other', htsImpact: '6301.90', dutyEstimate: '~5%' },
        ],
        impact: 'medium',
        currentValue: understanding.material !== 'unknown' ? understanding.material : undefined,
        currentSource: understanding.materialSource,
      });
    }
    
    return {
      routeType: 'function-driven',
      functionRule: 'apparel', // Will be handled specially
      forcedChapter: '63',
      forcedHeading: '6301',
      routeReason: 'Textile home goods (blankets, linens) classified under Chapter 63',
      decisionPoints,
      readyToClassify: decisionPoints.length === 0,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // APPAREL ROUTE (function-driven but needs fiber info)
  // ─────────────────────────────────────────────────────────────────────────────
  
  if (understanding.isTextile && understanding.isWearable) {
    const isKnit = isKnittedGarment(understanding.productType);
    const decisionPoints: DecisionPoint[] = [];
    
    // Check if we need to ask about fiber
    const materialKnown = understanding.materialSource === 'stated' || 
                          isFiberDeterminable(understanding.material);
    
    if (!materialKnown && !answers?.fiber) {
      decisionPoints.push({
        id: 'fiber',
        attribute: 'fiber',
        question: 'What fiber is this garment made of?',
        options: [
          { value: 'cotton', label: 'Cotton (≥50%)', htsImpact: isKnit ? '6109.10' : '6205.20', dutyEstimate: '~16.5%' },
          { value: 'synthetic', label: 'Polyester/Nylon/Synthetic', htsImpact: isKnit ? '6109.90' : '6205.30', dutyEstimate: '~32%' },
          { value: 'wool', label: 'Wool or Fine Animal Hair', htsImpact: isKnit ? '6109.90' : '6205.90', dutyEstimate: '~16%' },
          { value: 'other', label: 'Other (silk, linen, blend)', htsImpact: isKnit ? '6109.90' : '6205.90', dutyEstimate: '~7%' },
        ],
        impact: 'high',
        currentValue: understanding.material !== 'unknown' ? understanding.material : undefined,
        currentSource: understanding.materialSource,
      });
    }
    
    return {
      routeType: 'function-driven',
      functionRule: 'apparel',
      forcedChapter: isKnit ? '61' : '62',
      routeReason: `Apparel classified under Chapter ${isKnit ? '61 (knit)' : '62 (woven)'}; subheading determined by fiber`,
      decisionPoints,
      readyToClassify: decisionPoints.length === 0,
    };
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // MATERIAL-DRIVEN ROUTES (household containers, general articles)
  // ─────────────────────────────────────────────────────────────────────────────
  
  const decisionPoints: DecisionPoint[] = [];
  
  // Check if we need to ask about material
  if (understanding.materialSource === 'unknown' && !answers?.material) {
    decisionPoints.push({
      id: 'material',
      attribute: 'material',
      question: `What material is your ${understanding.productType} made of?`,
      options: [
        { value: 'plastic', label: 'Plastic', htsImpact: 'Chapter 39', dutyEstimate: '~3-5%' },
        { value: 'ceramic', label: 'Ceramic/Terracotta', htsImpact: 'Chapter 69', dutyEstimate: '~6%' },
        { value: 'glass', label: 'Glass', htsImpact: 'Chapter 70', dutyEstimate: '~5%' },
        { value: 'steel', label: 'Steel/Iron', htsImpact: 'Chapter 73', dutyEstimate: '~3%' },
        { value: 'aluminum', label: 'Aluminum', htsImpact: 'Chapter 76', dutyEstimate: '~5%' },
        { value: 'wood', label: 'Wood', htsImpact: 'Chapter 44', dutyEstimate: '~3%' },
        { value: 'rubber', label: 'Rubber/Silicone', htsImpact: 'Chapter 40', dutyEstimate: '~3%' },
      ],
      impact: 'high',
    });
  }
  
  return {
    routeType: 'material-driven',
    routeReason: 'Material determines chapter; use context determines heading',
    decisionPoints,
    readyToClassify: decisionPoints.length === 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function isKnittedGarment(productType: string): boolean {
  const knittedItems = [
    't-shirt', 'tshirt', 'polo', 'sweatshirt', 'hoodie', 'sweater',
    'pullover', 'cardigan', 'jersey', 'tank top', 'singlet',
    'underwear', 'boxer', 'brief', 'panties', 'socks',
  ];
  const productLower = productType.toLowerCase();
  return knittedItems.some(term => productLower.includes(term));
}

function isFiberDeterminable(material: string): boolean {
  const knownFibers = ['cotton', 'polyester', 'nylon', 'wool', 'silk', 'linen', 'synthetic'];
  const matLower = material.toLowerCase();
  return knownFibers.some(fiber => matLower.includes(fiber));
}

/**
 * Get the effective material from understanding and user answers
 */
export function getEffectiveMaterial(
  understanding: ProductUnderstanding,
  answers?: Record<string, string>
): string {
  if (answers?.material) return answers.material;
  if (answers?.fiber) return answers.fiber;
  if (understanding.materialSource === 'stated') return understanding.material;
  if (understanding.materialSource === 'inferred' && understanding.material !== 'unknown') {
    return understanding.material;
  }
  return 'unknown';
}

/**
 * Check if all required decision points have been answered
 */
export function allDecisionPointsAnswered(
  decisionPoints: DecisionPoint[],
  answers?: Record<string, string>
): boolean {
  if (!answers) return decisionPoints.length === 0;
  return decisionPoints.every(dp => answers[dp.id] !== undefined);
}

