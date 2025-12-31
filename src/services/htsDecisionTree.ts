/**
 * HTS Decision Tree V8
 * 
 * Explicit routing logic for determining chapters and headings based on:
 * - Material (for material-driven products)
 * - Use context (household vs industrial)
 * - Product type specifics
 * 
 * This module provides deterministic routing rules, reducing AI variability.
 * 
 * @module htsDecisionTree
 * @created December 27, 2025
 */

import { ProductUnderstanding } from './productClassifier';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ChapterRoute {
  chapter: string;
  chapterName: string;
  reason: string;
}

export interface HeadingRoute {
  heading: string;
  headingName: string;
  reason: string;
}

export interface SubheadingRoute {
  subheading: string;
  description: string;
  reason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIAL TO CHAPTER MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps materials to their primary HTS chapter.
 * This is used for material-driven products (not function-driven).
 */
export const MATERIAL_TO_CHAPTER: Record<string, ChapterRoute> = {
  // Plastics
  'plastic': { chapter: '39', chapterName: 'Plastics and articles thereof', reason: 'Material: Plastic articles' },
  'polypropylene': { chapter: '39', chapterName: 'Plastics and articles thereof', reason: 'Material: Polypropylene (plastic)' },
  'polyethylene': { chapter: '39', chapterName: 'Plastics and articles thereof', reason: 'Material: Polyethylene (plastic)' },
  'pvc': { chapter: '39', chapterName: 'Plastics and articles thereof', reason: 'Material: PVC (plastic)' },
  'acrylic': { chapter: '39', chapterName: 'Plastics and articles thereof', reason: 'Material: Acrylic (plastic)' },
  'silicone': { chapter: '39', chapterName: 'Plastics and articles thereof', reason: 'Material: Silicone (classified with plastics)' },
  
  // Rubber
  'rubber': { chapter: '40', chapterName: 'Rubber and articles thereof', reason: 'Material: Rubber' },
  'latex': { chapter: '40', chapterName: 'Rubber and articles thereof', reason: 'Material: Latex (rubber)' },
  'neoprene': { chapter: '40', chapterName: 'Rubber and articles thereof', reason: 'Material: Neoprene (rubber)' },
  
  // Wood
  'wood': { chapter: '44', chapterName: 'Wood and articles of wood', reason: 'Material: Wood' },
  'bamboo': { chapter: '44', chapterName: 'Wood and articles of wood', reason: 'Material: Bamboo (classified with wood)' },
  'plywood': { chapter: '44', chapterName: 'Wood and articles of wood', reason: 'Material: Plywood' },
  
  // Paper
  'paper': { chapter: '48', chapterName: 'Paper and paperboard', reason: 'Material: Paper' },
  'cardboard': { chapter: '48', chapterName: 'Paper and paperboard', reason: 'Material: Cardboard' },
  
  // Ceramics
  'ceramic': { chapter: '69', chapterName: 'Ceramic products', reason: 'Material: Ceramic' },
  'terracotta': { chapter: '69', chapterName: 'Ceramic products', reason: 'Material: Terracotta (ceramic)' },
  'porcelain': { chapter: '69', chapterName: 'Ceramic products', reason: 'Material: Porcelain (ceramic)' },
  'stoneware': { chapter: '69', chapterName: 'Ceramic products', reason: 'Material: Stoneware (ceramic)' },
  'earthenware': { chapter: '69', chapterName: 'Ceramic products', reason: 'Material: Earthenware (ceramic)' },
  
  // Glass
  'glass': { chapter: '70', chapterName: 'Glass and glassware', reason: 'Material: Glass' },
  'crystal': { chapter: '70', chapterName: 'Glass and glassware', reason: 'Material: Crystal (glass)' },
  
  // Iron/Steel
  'iron': { chapter: '73', chapterName: 'Articles of iron or steel', reason: 'Material: Iron' },
  'steel': { chapter: '73', chapterName: 'Articles of iron or steel', reason: 'Material: Steel' },
  'stainless steel': { chapter: '73', chapterName: 'Articles of iron or steel', reason: 'Material: Stainless steel' },
  'stainless': { chapter: '73', chapterName: 'Articles of iron or steel', reason: 'Material: Stainless steel' },
  
  // Copper
  'copper': { chapter: '74', chapterName: 'Copper and articles thereof', reason: 'Material: Copper' },
  'brass': { chapter: '74', chapterName: 'Copper and articles thereof', reason: 'Material: Brass (copper alloy)' },
  'bronze': { chapter: '74', chapterName: 'Copper and articles thereof', reason: 'Material: Bronze (copper alloy)' },
  
  // Aluminum
  'aluminum': { chapter: '76', chapterName: 'Aluminum and articles thereof', reason: 'Material: Aluminum' },
  'aluminium': { chapter: '76', chapterName: 'Aluminum and articles thereof', reason: 'Material: Aluminum' },
  
  // Textiles (fibers) - for apparel
  'cotton': { chapter: '61', chapterName: 'Knitted or crocheted apparel', reason: 'Material: Cotton (knit apparel)' },
  'polyester': { chapter: '61', chapterName: 'Knitted or crocheted apparel', reason: 'Material: Polyester (knit apparel)' },
  'nylon': { chapter: '61', chapterName: 'Knitted or crocheted apparel', reason: 'Material: Nylon (knit apparel)' },
  'synthetic': { chapter: '61', chapterName: 'Knitted or crocheted apparel', reason: 'Material: Synthetic fiber (knit apparel)' },
  'wool': { chapter: '61', chapterName: 'Knitted or crocheted apparel', reason: 'Material: Wool (knit apparel)' },
  'silk': { chapter: '61', chapterName: 'Knitted or crocheted apparel', reason: 'Material: Silk (knit apparel)' },
  'linen': { chapter: '61', chapterName: 'Knitted or crocheted apparel', reason: 'Material: Linen (knit apparel)' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER-SPECIFIC HEADING RULES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HeadingRule {
  heading: string;
  description: string;
  condition: (understanding: ProductUnderstanding) => boolean;
  priority: number; // Higher = checked first
}

/**
 * Chapter 39: Plastics and articles thereof
 */
export const CHAPTER_39_HEADINGS: HeadingRule[] = [
  {
    heading: '3924',
    description: 'Tableware, kitchenware, other household articles',
    condition: (u) => u.useContext === 'household',
    priority: 10,
  },
  {
    heading: '3923',
    description: 'Articles for conveyance or packing of goods',
    condition: (u) => u.useContext === 'industrial' || u.useContext === 'commercial',
    priority: 9,
  },
  {
    heading: '3925',
    description: "Builders' ware of plastics",
    condition: (u) => u.keywords.some(k => 
      ['construction', 'building', 'plumbing', 'fixture', 'faucet', 'door', 'window'].includes(k.toLowerCase())
    ),
    priority: 8,
  },
  {
    heading: '3926',
    description: 'Other articles of plastics',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 40: Rubber and articles thereof
 */
export const CHAPTER_40_HEADINGS: HeadingRule[] = [
  {
    heading: '4016',
    description: 'Other articles of vulcanized rubber',
    condition: () => true, // Most common for finished rubber articles
    priority: 10,
  },
  {
    heading: '4014',
    description: 'Hygienic or pharmaceutical articles',
    condition: (u) => u.keywords.some(k => 
      ['hygienic', 'medical', 'pharmaceutical', 'gloves', 'condom'].includes(k.toLowerCase())
    ),
    priority: 15,
  },
];

/**
 * Chapter 69: Ceramic products
 */
export const CHAPTER_69_HEADINGS: HeadingRule[] = [
  {
    heading: '6912',
    description: 'Ceramic tableware, kitchenware, other household articles',
    condition: (u) => u.useContext === 'household',
    priority: 10,
  },
  {
    heading: '6911',
    description: 'Tableware, kitchenware for hotel/restaurant',
    condition: (u) => u.useContext === 'commercial',
    priority: 9,
  },
  {
    heading: '6913',
    description: 'Statuettes and other ornamental ceramic articles',
    condition: (u) => u.keywords.some(k => 
      ['statue', 'figurine', 'ornament', 'decorative', 'sculpture'].includes(k.toLowerCase())
    ),
    priority: 8,
  },
  {
    heading: '6914',
    description: 'Other ceramic articles',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 70: Glass and glassware
 */
export const CHAPTER_70_HEADINGS: HeadingRule[] = [
  {
    heading: '7013',
    description: 'Glassware for table, kitchen, toilet, office, indoor decoration',
    condition: (u) => u.useContext === 'household',
    priority: 10,
  },
  {
    heading: '7010',
    description: 'Carboys, bottles, flasks, jars, pots (containers)',
    condition: (u) => u.keywords.some(k => 
      ['bottle', 'jar', 'container', 'flask', 'carboy'].includes(k.toLowerCase())
    ),
    priority: 9,
  },
  {
    heading: '7020',
    description: 'Other articles of glass',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 73: Articles of iron or steel
 */
export const CHAPTER_73_HEADINGS: HeadingRule[] = [
  {
    heading: '7323',
    description: 'Table, kitchen, household articles of iron or steel',
    condition: (u) => u.useContext === 'household',
    priority: 10,
  },
  {
    heading: '7310',
    description: 'Tanks, casks, drums, cans for industrial use',
    condition: (u) => u.useContext === 'industrial',
    priority: 9,
  },
  {
    heading: '7321',
    description: 'Stoves, ranges, cookers, space heaters',
    condition: (u) => u.keywords.some(k => 
      ['stove', 'range', 'cooker', 'heater', 'grill', 'bbq', 'barbecue'].includes(k.toLowerCase())
    ),
    priority: 11,
  },
  {
    heading: '7326',
    description: 'Other articles of iron or steel',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 76: Aluminum and articles thereof
 */
export const CHAPTER_76_HEADINGS: HeadingRule[] = [
  {
    heading: '7615',
    description: 'Table, kitchen, household articles of aluminum',
    condition: (u) => u.useContext === 'household',
    priority: 10,
  },
  {
    heading: '7612',
    description: 'Aluminum casks, drums, cans for industrial use',
    condition: (u) => u.useContext === 'industrial',
    priority: 9,
  },
  {
    heading: '7616',
    description: 'Other articles of aluminum',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 61: Knitted or crocheted apparel
 */
export const CHAPTER_61_HEADINGS: HeadingRule[] = [
  {
    heading: '6109',
    description: 'T-shirts, singlets, tank tops',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('t-shirt') || pType.includes('tshirt') || 
             pType.includes('singlet') || pType.includes('tank top');
    },
    priority: 15,
  },
  {
    heading: '6110',
    description: 'Sweaters, pullovers, sweatshirts, cardigans',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('sweater') || pType.includes('pullover') || 
             pType.includes('sweatshirt') || pType.includes('hoodie') || 
             pType.includes('cardigan');
    },
    priority: 14,
  },
  {
    heading: '6105',
    description: "Men's or boys' shirts",
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('polo') || (pType.includes('shirt') && !pType.includes('t-shirt'));
    },
    priority: 13,
  },
  {
    heading: '6104',
    description: "Women's or girls' suits, dresses, skirts, trousers",
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('dress') || pType.includes('skirt');
    },
    priority: 12,
  },
  {
    heading: '6103',
    description: "Men's or boys' suits, trousers, shorts",
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('pant') || pType.includes('trouser') || pType.includes('short');
    },
    priority: 11,
  },
  {
    heading: '6115',
    description: 'Pantyhose, tights, stockings, socks',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('sock') || pType.includes('stocking') || pType.includes('tight');
    },
    priority: 14,
  },
  {
    heading: '6107',
    description: "Men's or boys' underpants, briefs, nightshirts",
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('underwear') || pType.includes('boxer') || pType.includes('brief');
    },
    priority: 13,
  },
  {
    heading: '6114',
    description: 'Other garments, knitted or crocheted',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 63: Other made up textile articles
 */
export const CHAPTER_63_HEADINGS: HeadingRule[] = [
  {
    heading: '6301',
    description: 'Blankets and traveling rugs',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('blanket') || pType.includes('throw') || pType.includes('fleece');
    },
    priority: 15,
  },
  {
    heading: '6302',
    description: 'Bed linen, table linen, toilet linen, kitchen linen',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('sheet') || pType.includes('pillowcase') || 
             pType.includes('towel') || pType.includes('tablecloth') ||
             pType.includes('napkin');
    },
    priority: 14,
  },
  {
    heading: '6304',
    description: 'Other furnishing articles (cushions, etc.)',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('cushion') || pType.includes('pillow') || pType.includes('curtain');
    },
    priority: 13,
  },
  {
    heading: '6307',
    description: 'Other made up textile articles',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 42: Leather articles, travel goods, cases
 */
export const CHAPTER_42_HEADINGS: HeadingRule[] = [
  {
    heading: '4202',
    description: 'Trunks, suitcases, handbags, cases, containers',
    condition: () => true, // This is the main heading for cases/bags
    priority: 10,
  },
];

/**
 * Chapter 71: Jewelry
 */
export const CHAPTER_71_HEADINGS: HeadingRule[] = [
  {
    heading: '7117',
    description: 'Imitation jewelry',
    condition: () => true, // Default for non-precious jewelry
    priority: 10,
  },
  {
    heading: '7113',
    description: 'Articles of jewelry of precious metal',
    condition: (u) => u.keywords.some(k => 
      ['gold', 'silver', 'platinum', 'precious'].includes(k.toLowerCase())
    ),
    priority: 15,
  },
];

/**
 * Chapter 85: Electrical machinery and equipment
 */
export const CHAPTER_85_HEADINGS: HeadingRule[] = [
  {
    heading: '8528',
    description: 'Monitors and projectors; reception apparatus for television',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('monitor') || pType.includes('display') || 
             pType.includes('television') || pType.includes(' tv') || pType.includes('tv ') ||
             pType.includes('projector') || pType.includes('screen');
    },
    priority: 16,
  },
  {
    heading: '8539',
    description: 'Electric lamps and tubes',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('bulb') || pType.includes('lamp') || pType.includes('led light');
    },
    priority: 15,
  },
  {
    heading: '8544',
    description: 'Insulated wire, cables, connectors',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('cable') || pType.includes('cord') || pType.includes('wire');
    },
    priority: 14,
  },
  {
    heading: '8536',
    description: 'Electrical apparatus for switching, protecting circuits',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('switch') || pType.includes('plug') || pType.includes('socket');
    },
    priority: 13,
  },
  {
    heading: '8504',
    description: 'Electrical transformers, power supplies',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('charger') || pType.includes('adapter') || pType.includes('power supply');
    },
    priority: 13,
  },
  {
    heading: '8543',
    description: 'Other electrical machines and apparatus',
    condition: () => true, // Catch-all
    priority: 0,
  },
];

/**
 * Chapter 94: Furniture
 */
export const CHAPTER_94_HEADINGS: HeadingRule[] = [
  {
    heading: '9401',
    description: 'Seats (excluding 9402)',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('chair') || pType.includes('seat') || pType.includes('stool') || pType.includes('sofa');
    },
    priority: 15,
  },
  {
    heading: '9403',
    description: 'Other furniture',
    condition: () => true, // Tables, desks, shelves, etc.
    priority: 10,
  },
  {
    heading: '9404',
    description: 'Mattresses, bedding',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('mattress') || pType.includes('pillow') || pType.includes('comforter');
    },
    priority: 14,
  },
];

/**
 * Chapter 95: Toys and games
 */
export const CHAPTER_95_HEADINGS: HeadingRule[] = [
  {
    heading: '9503',
    description: 'Tricycles, scooters, pedal cars; dolls; other toys; scale models; puzzles',
    condition: () => true, // Main heading for toys
    priority: 10,
  },
  {
    heading: '9504',
    description: 'Video game consoles, articles for games',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('video game') || pType.includes('console') || pType.includes('billiard');
    },
    priority: 15,
  },
  {
    heading: '9505',
    description: 'Festive, carnival, or other entertainment articles',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('christmas') || pType.includes('halloween') || 
             pType.includes('party') || pType.includes('decoration') ||
             pType.includes('carnival') || pType.includes('festive');
    },
    priority: 14,
  },
  {
    heading: '9506',
    description: 'Sports equipment',
    condition: (u) => {
      const pType = u.productType.toLowerCase();
      return pType.includes('golf') || pType.includes('tennis') || 
             pType.includes('baseball') || pType.includes('football') ||
             pType.includes('basketball') || pType.includes('exercise');
    },
    priority: 13,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER HEADING LOOKUP
// ═══════════════════════════════════════════════════════════════════════════════

const CHAPTER_HEADING_MAP: Record<string, HeadingRule[]> = {
  '39': CHAPTER_39_HEADINGS,
  '40': CHAPTER_40_HEADINGS,
  '42': CHAPTER_42_HEADINGS,
  '61': CHAPTER_61_HEADINGS,
  '63': CHAPTER_63_HEADINGS,
  '69': CHAPTER_69_HEADINGS,
  '70': CHAPTER_70_HEADINGS,
  '71': CHAPTER_71_HEADINGS,
  '73': CHAPTER_73_HEADINGS,
  '76': CHAPTER_76_HEADINGS,
  '85': CHAPTER_85_HEADINGS,
  '94': CHAPTER_94_HEADINGS,
  '95': CHAPTER_95_HEADINGS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ROUTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the chapter based on material
 */
export function getChapterByMaterial(material: string): ChapterRoute | null {
  const materialLower = material.toLowerCase().trim();
  
  // Direct match
  if (MATERIAL_TO_CHAPTER[materialLower]) {
    return MATERIAL_TO_CHAPTER[materialLower];
  }
  
  // Partial match
  for (const [key, route] of Object.entries(MATERIAL_TO_CHAPTER)) {
    if (materialLower.includes(key) || key.includes(materialLower)) {
      return route;
    }
  }
  
  return null;
}

/**
 * Get the heading within a chapter based on product understanding
 */
export function getHeadingForChapter(
  chapter: string,
  understanding: ProductUnderstanding
): HeadingRoute | null {
  const headingRules = CHAPTER_HEADING_MAP[chapter];
  
  if (!headingRules) {
    console.warn(`[DecisionTree] No heading rules for chapter ${chapter}`);
    return null;
  }
  
  // Sort by priority (highest first) and find first matching
  const sortedRules = [...headingRules].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    if (rule.condition(understanding)) {
      return {
        heading: rule.heading,
        headingName: rule.description,
        reason: `Best match for ${understanding.productType} in Chapter ${chapter}`,
      };
    }
  }
  
  // Should never reach here if there's a catch-all, but just in case
  return null;
}

/**
 * Get subheading routing for specific chapters
 * 
 * NOTE: This function is DEPRECATED in V8. Subheading selection is now
 * handled dynamically by AI in the tree navigator (selectChildWithAI).
 * 
 * Keeping minimal implementation for backward compatibility, but
 * returning null to defer to AI-driven selection.
 */
export function getSubheadingRoute(
  heading: string,
  understanding: ProductUnderstanding,
  fiber?: string
): SubheadingRoute | null {
  // V8: Defer all subheading selection to AI-driven tree navigation
  // The AI will match product attributes (material, use, etc.) to HTS descriptions
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL ROUTE DETERMINATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface FullRoute {
  chapter: ChapterRoute;
  heading: HeadingRoute;
  subheading?: SubheadingRoute;
  reason: string;
}

/**
 * Get the complete routing for a material-driven product
 */
export function getFullMaterialRoute(
  material: string,
  understanding: ProductUnderstanding
): FullRoute | null {
  const chapterRoute = getChapterByMaterial(material);
  if (!chapterRoute) {
    console.warn(`[DecisionTree] No chapter found for material: ${material}`);
    return null;
  }
  
  const headingRoute = getHeadingForChapter(chapterRoute.chapter, understanding);
  if (!headingRoute) {
    console.warn(`[DecisionTree] No heading found for chapter ${chapterRoute.chapter}`);
    return null;
  }
  
  const subheadingRoute = getSubheadingRoute(headingRoute.heading, understanding);
  
  return {
    chapter: chapterRoute,
    heading: headingRoute,
    subheading: subheadingRoute || undefined,
    reason: `${chapterRoute.reason} → ${headingRoute.reason}`,
  };
}

