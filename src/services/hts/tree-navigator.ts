/**
 * HTS Tree Navigator - Hierarchical Classification
 * 
 * The HTS is a TREE, not a keyword database.
 * This service navigates from Chapter → Heading → Subheading → Tariff Line → Statistical
 * 
 * Key principle: At each level, check SPECIFIC carve-outs before falling to "Other"
 * 
 * @module htsTreeNavigator
 * @created December 24, 2025
 */

import { prisma } from '@/lib/db';
import { HtsLevel } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HtsTreeNode {
  code: string;
  codeFormatted: string;
  level: HtsLevel;
  description: string;
  generalRate: string | null;
  indent: number;
  parentGroupings: string[];
  isOtherCatchAll: boolean;      // Is this an "Other" catch-all code?
  isSpecificCarveOut: boolean;   // Is this a specific carve-out (not "other")?
}

export interface NavigationStep {
  level: HtsLevel;
  code: string;
  codeFormatted: string;
  description: string;
  reasoning: string;
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

export interface ProductContext {
  essentialCharacter: string;      // "container", "clothing", "tool", etc.
  productType: string;             // "planter", "t-shirt", "knife"
  material?: string;               // "plastic", "ceramic", "cotton"
  useContext: 'household' | 'commercial' | 'industrial' | 'agricultural';
  sizeCategory?: 'small' | 'medium' | 'large' | 'industrial';
  keywords: string[];              // Additional search keywords
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAPTER SELECTION - First critical decision
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Material → Chapter mappings for common product types
 * This is the PRIMARY driver for household articles
 */
export const MATERIAL_TO_CHAPTER: Record<string, { chapter: string; heading: string; description: string }> = {
  // Household articles by material
  'plastic': { chapter: '39', heading: '3924', description: 'Household articles of plastics' },
  'silicone': { chapter: '39', heading: '3924', description: 'Household articles of plastics (silicone is a plastic)' },
  'ceramic': { chapter: '69', heading: '6912', description: 'Ceramic household articles' },
  'porcelain': { chapter: '69', heading: '6912', description: 'Ceramic household articles' },
  'terracotta': { chapter: '69', heading: '6912', description: 'Ceramic household articles' },
  'glass': { chapter: '70', heading: '7013', description: 'Glassware for household/decorative purposes' },
  'steel': { chapter: '73', heading: '7323', description: 'Household articles of iron or steel' },
  'stainless steel': { chapter: '73', heading: '7323', description: 'Household articles of stainless steel' },
  'iron': { chapter: '73', heading: '7323', description: 'Household articles of iron or steel' },
  'aluminum': { chapter: '76', heading: '7615', description: 'Household articles of aluminum' },
  'copper': { chapter: '74', heading: '7418', description: 'Household articles of copper' },
  'wood': { chapter: '44', heading: '4419', description: 'Tableware and kitchenware of wood' },
  'bamboo': { chapter: '46', heading: '4602', description: 'Basketwork and wickerwork' },
};

/**
 * Essential character → Chapter mappings (takes precedence over material)
 */
export const CHARACTER_TO_CHAPTER: Record<string, { chapter: string; heading?: string; description: string }> = {
  // Apparel - Chapter 61 (knit) or 62 (woven)
  'clothing_knit': { chapter: '61', description: 'Articles of apparel, knitted or crocheted' },
  'clothing_woven': { chapter: '62', description: 'Articles of apparel, not knitted' },
  
  // Footwear - Chapter 64
  'footwear': { chapter: '64', description: 'Footwear, gaiters and the like' },
  
  // Electronics - Chapter 85
  'electrical': { chapter: '85', description: 'Electrical machinery and equipment' },
  
  // Machinery - Chapter 84
  'machinery': { chapter: '84', description: 'Nuclear reactors, boilers, machinery' },
  
  // Toys - Chapter 95
  'toy': { chapter: '95', heading: '9503', description: 'Toys' },
  
  // Furniture - Chapter 94
  'furniture': { chapter: '94', description: 'Furniture' },
  
  // Jewelry - Chapter 71
  'jewelry': { chapter: '71', heading: '7117', description: 'Imitation jewelry' },
  
  // Cases/bags for carrying - Chapter 42 (FUNCTION over material)
  'carrying_case': { chapter: '42', heading: '4202', description: 'Trunks, cases, handbags' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARVE-OUT DETECTION (Enhanced for V8)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Known HTS carve-out patterns that should NOT be selected for general products.
 * These are very specific product categories that appear in the HTS tree.
 */
const KNOWN_CARVEOUT_PATTERNS = [
  // Chapter 39 - Plastics
  /nursing nipples/i,
  /finger cots/i,
  /baby bottles/i,
  /ice bags/i,
  /toilets/i,
  /bidets/i,
  /lavatory/i,
  /medical/i,
  /surgical/i,
  /hypodermic/i,
  /syringes/i,
  /catheters/i,
  
  // Chapter 69 - Ceramics
  /sanitary ware/i,
  /sinks/i,
  /wash basins/i,
  /toilet bowls/i,
  
  // Chapter 71 - Jewelry (NOT carve-outs, but specific categories)
  /precious metal/i,
  /gold-plated/i,
  /silver-plated/i,
  
  // Chapter 73 - Steel
  /cooking appliances/i,
  /central heating/i,
  /radiators/i,
  
  // Chapter 85 - Electronics
  /microwave/i,
  /x-ray/i,
  /mri/i,
  /ct scanner/i,
  
  // Chapter 95 - Toys (specific types)
  /video games/i,
  /slot machines/i,
  /coin-operated/i,
];

/**
 * Keywords that indicate a general product description, NOT a carve-out
 */
const GENERAL_DESCRIPTION_PATTERNS = [
  /tableware/i,
  /kitchenware/i,
  /household articles/i,
  /other articles/i,
  /articles of/i,
  /table\s*,\s*kitchen/i,
];

/**
 * Check if a description indicates a SPECIFIC carve-out
 * These are NOT "Other" codes - they're for specific products only
 * 
 * Enhanced for V8: Uses pattern matching to avoid false positives
 */
export function isSpecificCarveOut(description: string): boolean {
  const desc = description.toLowerCase().trim();
  
  // "Other" codes are catch-alls, not carve-outs
  if (isOtherCatchAll(desc)) return false;
  
  // NESOI (not elsewhere specified or included) is a catch-all
  if (desc.includes('nesoi') || desc.includes('not elsewhere specified')) return false;
  
  // General descriptions are NOT carve-outs
  if (GENERAL_DESCRIPTION_PATTERNS.some(p => p.test(desc))) return false;
  
  // Check against known carve-out patterns
  if (KNOWN_CARVEOUT_PATTERNS.some(p => p.test(desc))) return true;
  
  // Short, specific descriptions are carve-outs
  // "Nursing nipples and finger cots" = specific
  // "Tableware, kitchenware, other household articles..." = general
  const wordCount = desc.split(/\s+/).length;
  
  // Specific patterns that indicate carve-outs:
  // - Short descriptions (< 8 words)
  // - Lists of specific items ("X and Y", "X, Y, Z")
  // - Descriptions with specific product names
  if (wordCount <= 8 && !desc.includes('article')) {
    return true;
  }
  
  // Check for listing pattern: "X and Y" or "X, Y"
  if ((desc.includes(' and ') || desc.includes(', ')) && wordCount <= 12) {
    // But NOT if it's a general category listing
    if (!desc.includes('table') && !desc.includes('kitchen') && !desc.includes('household')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if a product might match a specific carve-out
 * Used to prevent classifying general products under specific codes
 */
export function shouldAvoidCarveOut(
  productType: string,
  productKeywords: string[],
  carveOutDescription: string
): { shouldAvoid: boolean; reason: string } {
  const descLower = carveOutDescription.toLowerCase();
  const productLower = productType.toLowerCase();
  const keywordsLower = productKeywords.map(k => k.toLowerCase());
  
  // Check if any known carve-out pattern matches
  for (const pattern of KNOWN_CARVEOUT_PATTERNS) {
    if (pattern.test(descLower)) {
      // Check if the product is actually this carve-out type
      const patternStr = pattern.source.toLowerCase().replace(/\\s\+/g, ' ').replace(/\//g, '');
      
      // If product doesn't contain the carve-out keywords, avoid this code
      if (!pattern.test(productLower) && !keywordsLower.some(k => pattern.test(k))) {
        return {
          shouldAvoid: true,
          reason: `"${productType}" is not a ${patternStr} - this is a specific carve-out code`,
        };
      }
    }
  }
  
  return { shouldAvoid: false, reason: 'Product may match this code' };
}

/**
 * Check if a description is an "Other" catch-all
 */
export function isOtherCatchAll(description: string): boolean {
  const desc = description.toLowerCase().trim();
  
  // Direct "Other" codes
  if (desc === 'other' || desc === 'other:') return true;
  if (desc.startsWith('other ') || desc.startsWith('other,')) return true;
  if (desc.startsWith('other:')) return true;
  
  // Ends with "other" (common in HTS)
  if (desc.endsWith(', other') || desc.endsWith(': other')) return true;
  
  return false;
}

/**
 * Check if a product MATCHES a specific carve-out description
 * Returns true only if the product IS one of the listed items
 */
export function productMatchesCarveOut(
  productContext: ProductContext,
  carveOutDescription: string
): { matches: boolean; reason: string } {
  const desc = carveOutDescription.toLowerCase();
  const productType = productContext.productType.toLowerCase();
  const keywords = productContext.keywords.map(k => k.toLowerCase());
  
  // Extract the specific items from the carve-out description
  // "Nursing nipples and finger cots" → ["nursing nipples", "finger cots"]
  const listedItems = desc
    .split(/\s+and\s+|,\s*/)
    .map(item => item.trim())
    .filter(item => item.length > 2);
  
  // Check if product type or keywords match ANY listed item
  for (const item of listedItems) {
    // Exact or partial match
    if (productType.includes(item) || item.includes(productType)) {
      return { matches: true, reason: `Product type "${productType}" matches carve-out item "${item}"` };
    }
    
    // Check keywords
    for (const keyword of keywords) {
      if (keyword.includes(item) || item.includes(keyword)) {
        return { matches: true, reason: `Keyword "${keyword}" matches carve-out item "${item}"` };
      }
    }
  }
  
  return { 
    matches: false, 
    reason: `Product "${productType}" does not match carve-out items: ${listedItems.join(', ')}` 
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREE NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all children of an HTS code at the next level
 * 
 * V8 Enhancement: Uses both parentCode lookup AND prefix matching
 * to handle database inconsistencies where parentCode might not be set correctly.
 */
export async function getChildren(parentCode: string): Promise<HtsTreeNode[]> {
  const normalizedParent = parentCode.replace(/\./g, '');
  
  // First, try direct parent-child relationship
  let children = await prisma.htsCode.findMany({
    where: { parentCode: normalizedParent },
    orderBy: { code: 'asc' },
  });
  
  // If no children found via parentCode, try prefix-based search
  if (children.length === 0) {
    console.log(`[TreeNavigator] No children via parentCode for ${normalizedParent}, trying prefix search...`);
    
    // Find codes that start with this prefix but are longer
    const prefixChildren = await prisma.htsCode.findMany({
      where: {
        code: { startsWith: normalizedParent },
        NOT: { code: normalizedParent }, // Exclude the parent itself
      },
      orderBy: { code: 'asc' },
    });
    
    // Filter to only get immediate children (next level down)
    // e.g., for 6301 (4 digits), get 630110, 630120 (6 digits) but not 63011000 (8 digits)
    const parentLen = normalizedParent.length;
    const nextLevelLen = parentLen + 2; // HTS codes grow by 2 digits per level
    
    children = prefixChildren.filter(c => 
      c.code.length === nextLevelLen || 
      c.code.length === nextLevelLen + 2 // Also include tariff lines if no subheadings
    );
    
    // If still no children at next level, try the level after
    if (children.length === 0 && prefixChildren.length > 0) {
      // Get the shortest codes in the prefix results
      const minLen = Math.min(...prefixChildren.map(c => c.code.length));
      children = prefixChildren.filter(c => c.code.length === minLen);
    }
    
    console.log(`[TreeNavigator] Found ${children.length} children via prefix for ${normalizedParent}`);
  }
  
  return children.map(child => ({
    code: child.code,
    codeFormatted: child.codeFormatted,
    level: child.level,
    description: child.description,
    generalRate: child.generalRate,
    indent: child.indent,
    parentGroupings: child.parentGroupings || [],
    isOtherCatchAll: isOtherCatchAll(child.description),
    isSpecificCarveOut: isSpecificCarveOut(child.description),
  }));
}

/**
 * Get all codes under a heading/subheading prefix
 */
export async function getCodesUnderPrefix(prefix: string, level?: HtsLevel): Promise<HtsTreeNode[]> {
  const normalizedPrefix = prefix.replace(/\./g, '');
  
  const codes = await prisma.htsCode.findMany({
    where: {
      code: { startsWith: normalizedPrefix },
      ...(level ? { level } : {}),
    },
    orderBy: { code: 'asc' },
  });
  
  return codes.map(code => ({
    code: code.code,
    codeFormatted: code.codeFormatted,
    level: code.level,
    description: code.description,
    generalRate: code.generalRate,
    indent: code.indent,
    parentGroupings: code.parentGroupings || [],
    isOtherCatchAll: isOtherCatchAll(code.description),
    isSpecificCarveOut: isSpecificCarveOut(code.description),
  }));
}

/**
 * Navigate from a parent code to select the best child for a product
 * 
 * V8 ROBUST LOGIC - AI-driven selection based on HTS descriptions:
 * 1. Get all children at this level
 * 2. Use AI to match product attributes to HTS descriptions
 * 3. Avoid specific carve-outs that don't apply
 * 4. Fall back to "Other" if no specific match
 */
export async function selectBestChild(
  parentCode: string,
  productContext: ProductContext
): Promise<{
  selected: HtsTreeNode;
  reasoning: string;
  alternatives: { code: string; description: string; whyNot: string }[];
}> {
  const children = await getChildren(parentCode);
  
  if (children.length === 0) {
    throw new Error(`No children found under ${parentCode}`);
  }
  
  const alternatives: { code: string; description: string; whyNot: string }[] = [];
  
  // If only one child, select it
  if (children.length === 1) {
    return {
      selected: children[0],
      reasoning: 'Only option at this level',
      alternatives: [],
    };
  }
  
  // Use AI to select the best match based on product context and HTS descriptions
  const aiSelection = await selectChildWithAI(children, productContext);
  
  if (aiSelection.selected) {
    // Verify it's not a carve-out we should avoid
    if (aiSelection.selected.isSpecificCarveOut) {
      const avoidCheck = shouldAvoidCarveOut(
        productContext.productType,
        productContext.keywords,
        aiSelection.selected.description
      );
      
      if (avoidCheck.shouldAvoid) {
        // AI selected a carve-out that doesn't apply - fall back to "Other"
        console.log(`[TreeNavigator] AI selected carve-out "${aiSelection.selected.codeFormatted}" but avoiding: ${avoidCheck.reason}`);
        alternatives.push({
          code: aiSelection.selected.codeFormatted,
          description: aiSelection.selected.description,
          whyNot: avoidCheck.reason,
        });
      } else {
        // aiSelection.selected is confirmed non-null by the if check above
        const selected = aiSelection.selected;
        return {
          selected,
          reasoning: aiSelection.reasoning,
          alternatives: aiSelection.alternatives,
        };
      }
    } else {
      // aiSelection.selected is confirmed non-null by the if check above
      const selected = aiSelection.selected;
      return {
        selected,
        reasoning: aiSelection.reasoning,
        alternatives: aiSelection.alternatives,
      };
    }
  }
  
  // Fallback: Find "Other" catch-all
  const otherCode = children.find(c => c.isOtherCatchAll);
  
  if (otherCode) {
    return {
      selected: otherCode,
      reasoning: `No specific match found; classified under "Other" catch-all`,
      alternatives,
    };
  }
  
  // Last resort: Find the most general child
  const generalChildren = children.filter(c => !c.isSpecificCarveOut);
  
  if (generalChildren.length > 0) {
    const selected = generalChildren[generalChildren.length - 1];
    return {
      selected,
      reasoning: `Selected most general option available`,
      alternatives,
    };
  }
  
  // Absolute last resort
  return {
    selected: children[children.length - 1],
    reasoning: `Using last available option`,
    alternatives,
  };
}

/**
 * AI-powered child selection based on product context and HTS descriptions
 * This is the core of robust classification - matching product attributes to HTS rules
 */
async function selectChildWithAI(
  children: HtsTreeNode[],
  productContext: ProductContext
): Promise<{
  selected: HtsTreeNode | null;
  reasoning: string;
  alternatives: { code: string; description: string; whyNot: string }[];
}> {
  const materialLower = (productContext.material || '').toLowerCase();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1: Check for DIRECT material match FIRST (before AI)
  // This is critical for textiles, ceramics, metals, etc.
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (materialLower && materialLower !== 'unknown') {
    console.log(`[TreeNavigator] Checking material "${materialLower}" against ${children.length} children`);
    
    // Log all children for debugging
    for (const child of children) {
      console.log(`[TreeNavigator]   - ${child.codeFormatted}: "${child.description}" (isOther: ${child.isOtherCatchAll})`);
    }
    
    // Handle material synonyms - define these FIRST
    const materialSynonyms: Record<string, string[]> = {
      'cotton': ['cotton'],
      'polyester': ['synthetic', 'man-made', 'polyester', 'manmade'],
      'synthetic': ['synthetic', 'man-made', 'polyester', 'nylon', 'manmade'],
      'nylon': ['synthetic', 'man-made', 'nylon', 'manmade'],
      'wool': ['wool', 'fine animal hair'],
      'silk': ['silk'],
      'plastic': ['plastic', 'plastics'],
      'steel': ['steel', 'iron or steel', 'stainless', 'iron'],
      'stainless': ['stainless', 'steel'],
      'ceramic': ['ceramic', 'porcelain', 'china'],
      'glass': ['glass'],
      'aluminum': ['aluminum', 'aluminium'],
      'wood': ['wood', 'wooden'],
      'fleece': ['synthetic', 'man-made', 'polyester'],
    };
    
    const synonyms = materialSynonyms[materialLower] || [materialLower];
    
    // Look for material match in HTS descriptions - check ALL patterns
    for (const child of children) {
      const descLower = child.description.toLowerCase();
      console.log(`[TreeNavigator] Checking child "${child.codeFormatted}": desc="${descLower}", isOther=${child.isOtherCatchAll}`);
      
      if (child.isOtherCatchAll) {
        console.log(`[TreeNavigator]   Skipping - is other catch-all`);
        continue;
      }
      
      // Check each synonym
      for (const synonym of synonyms) {
        console.log(`[TreeNavigator]   Checking synonym "${synonym}" in "${descLower}"`);
        
        // Simple check - does the description contain the material word?
        if (descLower.includes(synonym)) {
          console.log(`[TreeNavigator] ✓ MATCH FOUND: "${synonym}" in "${child.description}"`);
          return {
            selected: child,
            reasoning: `Material "${productContext.material}" matches HTS description "${child.description}"`,
            alternatives: [],
          };
        }
      }
    }
    
    console.log(`[TreeNavigator] ✗ No material match found for "${materialLower}" in any child`);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 2: Skip AI for simple cases with 2 or fewer options
  // ═══════════════════════════════════════════════════════════════════════════
  
  if (children.length <= 2) {
    // Just find the best match based on keywords
    for (const child of children) {
      if (!child.isOtherCatchAll) {
        const descLower = child.description.toLowerCase();
        
        // Check if any keyword matches
        for (const keyword of productContext.keywords) {
          if (descLower.includes(keyword.toLowerCase())) {
            return {
              selected: child,
              reasoning: `Keyword "${keyword}" matches HTS description`,
              alternatives: [],
            };
          }
        }
      }
    }
    return { selected: null, reasoning: 'No simple match', alternatives: [] };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3: Use AI for complex selections
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Build options list for AI
  const optionsList = children.map((c, i) => 
    `${i + 1}. ${c.codeFormatted}: ${c.description}`
  ).join('\n');
  
  const prompt = `Select the BEST HTS code for this product:

PRODUCT: ${productContext.productType}
- Material: ${productContext.material || 'unknown'}
- Use context: ${productContext.useContext}
- Keywords: ${productContext.keywords.slice(0, 5).join(', ')}

HTS OPTIONS:
${optionsList}

CRITICAL RULES (in order of priority):

1. **MATERIAL IS #1 PRIORITY**: If the product has a known material, you MUST select the option that matches that material.
   - "Of cotton" → for cotton products
   - "Of synthetic fibers" or "Of man-made fibers" → for polyester, nylon, etc.
   - "Of wool" → for wool products
   - DO NOT select "Other" if there is a material-specific option that matches!

2. Match the product's USE to HTS descriptions (e.g., "household", "industrial", "tableware")

3. AVOID specific carve-outs unless the product IS that specific item

4. ONLY select "Other" if NO material-specific or use-specific option matches

Return ONLY a JSON object:
{
  "selectedIndex": <1-based index>,
  "reasoning": "Brief explanation - mention the material match if applicable"
}`;

  try {
    const { getXAIClient } = await import('@/lib/xai');
    const xai = getXAIClient();
    
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'You are an HTS classification expert. Match products to HTS codes based on material, use, and function. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 150,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    const idx = Math.max(0, Math.min((parsed.selectedIndex || 1) - 1, children.length - 1));
    
    return {
      selected: children[idx],
      reasoning: parsed.reasoning || 'AI selection',
      alternatives: [],
    };
  } catch (error) {
    console.error('[TreeNavigator] AI selection error:', error);
    return { selected: null, reasoning: 'AI error', alternatives: [] };
  }
}

/**
 * Navigate the full tree from chapter to statistical suffix
 * 
 * V8 Enhancement: Handles database codes stored at different levels
 * (e.g., heading 6912 might be stored as subheading 691200)
 */
export async function navigateTree(
  chapter: string,
  heading: string,
  productContext: ProductContext
): Promise<TreePath> {
  const steps: NavigationStep[] = [];
  let currentCode = heading.replace(/\./g, '');
  
  // Try to get the heading info - may be stored as heading, subheading, or tariff_line
  let headingInfo = await prisma.htsCode.findFirst({
    where: { code: currentCode },
  });
  
  // If not found, try searching for codes that START with this heading
  if (!headingInfo) {
    console.log(`[TreeNavigator] Heading ${currentCode} not found directly, searching prefix...`);
    
    // Find the first code under this heading prefix
    const prefixCodes = await prisma.htsCode.findMany({
      where: { code: { startsWith: currentCode } },
      orderBy: { code: 'asc' },
      take: 1,
    });
    
    if (prefixCodes.length > 0) {
      headingInfo = prefixCodes[0];
      currentCode = headingInfo.code;
      console.log(`[TreeNavigator] Found via prefix: ${headingInfo.codeFormatted}`);
    }
  }
  
  if (!headingInfo) {
    throw new Error(`Heading ${heading} not found`);
  }
  
  // Record the heading step
  steps.push({
    level: headingInfo.level, // Use actual level from DB
    code: headingInfo.code,
    codeFormatted: headingInfo.codeFormatted,
    description: headingInfo.description,
    reasoning: `Starting point: ${headingInfo.description}`,
    selected: true,
    alternatives: [],
  });
  
  // Navigate down through subheading → tariff_line → statistical
  const levels: HtsLevel[] = ['subheading', 'tariff_line', 'statistical'];
  
  for (const level of levels) {
    // Skip levels we've already passed
    const levelOrder = { chapter: 0, heading: 1, subheading: 2, tariff_line: 3, statistical: 4 };
    if (levelOrder[level] <= levelOrder[headingInfo.level as keyof typeof levelOrder]) {
      continue;
    }
    
    try {
      const result = await selectBestChild(currentCode, productContext);
      
      steps.push({
        level,
        code: result.selected.code,
        codeFormatted: result.selected.codeFormatted,
        description: result.selected.description,
        reasoning: result.reasoning,
        selected: true,
        alternatives: result.alternatives,
      });
      
      currentCode = result.selected.code;
      
      // Stop if we've reached statistical level or no more children
      if (result.selected.level === 'statistical') break;
      
      const hasMoreChildren = await getChildren(currentCode);
      if (hasMoreChildren.length === 0) break;
      
    } catch (error) {
      // No more children at this level - we've reached the end
      console.log(`[TreeNavigator] No children at ${level} level for ${currentCode}`);
      break;
    }
  }
  
  // Get final code info
  const finalCode = await prisma.htsCode.findUnique({
    where: { code: currentCode },
  });
  
  return {
    steps,
    finalCode: currentCode,
    finalCodeFormatted: finalCode?.codeFormatted || currentCode,
    generalRate: finalCode?.generalRate || null,
    confidence: calculatePathConfidence(steps),
  };
}

/**
 * Calculate confidence based on the navigation path
 */
function calculatePathConfidence(steps: NavigationStep[]): number {
  let confidence = 0.9; // Start high
  
  for (const step of steps) {
    // Reduce confidence for each level where we fell to "Other"
    if (step.reasoning.includes('Other') || step.reasoning.includes('catch-all')) {
      confidence -= 0.05;
    }
    
    // Increase confidence for specific matches
    if (step.reasoning.includes('matches')) {
      confidence += 0.02;
    }
  }
  
  return Math.max(0.5, Math.min(0.99, confidence));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH-LEVEL CLASSIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine the chapter and heading for a household article based on material
 */
export function getHouseholdArticleChapter(material: string): { chapter: string; heading: string; description: string } | null {
  const materialLower = material.toLowerCase();
  
  // Check direct matches
  for (const [mat, info] of Object.entries(MATERIAL_TO_CHAPTER)) {
    if (materialLower.includes(mat) || mat.includes(materialLower)) {
      return info;
    }
  }
  
  // Default to plastic (most common)
  return MATERIAL_TO_CHAPTER['plastic'];
}

/**
 * Classify a household container (planter, pot, bottle, etc.)
 */
export async function classifyHouseholdContainer(
  productType: string,
  material: string = 'plastic',
  additionalKeywords: string[] = []
): Promise<TreePath> {
  // Get the right chapter/heading for this material
  const chapterInfo = getHouseholdArticleChapter(material);
  
  if (!chapterInfo) {
    throw new Error(`Cannot determine chapter for material: ${material}`);
  }
  
  console.log(`[TreeNavigator] Classifying ${productType} (${material}) under heading ${chapterInfo.heading}`);
  
  // Build product context
  const context: ProductContext = {
    essentialCharacter: 'container',
    productType,
    material,
    useContext: 'household',
    sizeCategory: 'small',
    keywords: [productType, material, ...additionalKeywords],
  };
  
  // Navigate the tree
  return navigateTree(chapterInfo.chapter, chapterInfo.heading, context);
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK TEST FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quick test of the tree navigator
 */
export async function testTreeNavigation(): Promise<void> {
  console.log('\n=== Testing Tree Navigation ===\n');
  
  // Test 1: Indoor planter (plastic)
  console.log('Test 1: Indoor planter (plastic)');
  try {
    const result = await classifyHouseholdContainer('planter', 'plastic', ['flower pot', 'indoor']);
    console.log(`  Result: ${result.finalCodeFormatted}`);
    console.log(`  Rate: ${result.generalRate}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log('  Path:');
    for (const step of result.steps) {
      console.log(`    ${step.codeFormatted}: ${step.description.substring(0, 50)}... [${step.reasoning.substring(0, 40)}...]`);
    }
    console.log('');
  } catch (error) {
    console.error('  Error:', error);
  }
  
  // Test 2: Indoor planter (ceramic)
  console.log('Test 2: Indoor planter (ceramic)');
  try {
    const result = await classifyHouseholdContainer('planter', 'ceramic', ['flower pot', 'indoor']);
    console.log(`  Result: ${result.finalCodeFormatted}`);
    console.log(`  Rate: ${result.generalRate}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    console.log('');
  } catch (error) {
    console.error('  Error:', error);
  }
}

