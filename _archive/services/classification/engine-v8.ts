/**
 * Classification Engine V8 "Arbiter" - Ask Upfront, Classify with Confidence
 * 
 * Philosophy: Unlike V5's "Infer first, ask later", V8 asks critical questions
 * BEFORE classification to achieve high confidence results.
 * 
 * Flow:
 * 1. Understand the product (semantic analysis)
 * 2. Determine classification route (function vs material driven)
 * 3. Check for decision points (attributes that affect HTS code)
 * 4. If questions needed → return them for user input
 * 5. If ready → navigate HTS tree with high confidence
 * 
 * @module classificationEngineV8
 * @created December 27, 2025
 */

import { prisma } from '@/lib/db';
import { getXAIClient } from '@/lib/xai';
import {
  analyzeProduct,
  determineRoute,
  getEffectiveMaterial,
  allDecisionPointsAnswered,
  ProductUnderstanding,
  DecisionPoint,
  ClassificationRoute,
} from '@/services/productClassifier';
import {
  getChapterByMaterial,
  getHeadingForChapter,
  getFullMaterialRoute,
} from '@/services/hts/decision-tree';
import {
  navigateTree,
  ProductContext,
  TreePath,
  NavigationStep,
} from '@/services/hts/tree-navigator';
import { CHAPTER_DESCRIPTIONS } from '@/services/hts/hierarchy';
import { selectChapterAndHeading } from '@/services/aiChapterSelector';

// ═══════════════════════════════════════════════════════════════════════════════
// HIERARCHY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HierarchyLevel {
  level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
  code: string;
  codeFormatted: string;
  description: string;
  /** Whether this level has an actual HTS code or is just a grouping description */
  hasCode: boolean;
  dutyRate?: string | null;
}

export interface ClassificationHierarchy {
  levels: HierarchyLevel[];
  /** The full path as a single string: "Chapter 61 > Heading 6109 > ..." */
  breadcrumb: string;
  /** Concatenated description: "Apparel, knitted or crocheted: T-shirts: Of cotton: Men's or boys'" */
  fullDescription: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassificationV8Input {
  description: string;
  material?: string;
  use?: string;
  countryOfOrigin?: string;
  value?: number;
  // Pre-answered questions from previous call
  answers?: Record<string, string>;
}

export interface ClassificationV8Result {
  // Phase indicator
  needsInput: boolean;
  
  // If needsInput = true, return questions
  questions?: DecisionPoint[];
  productUnderstanding?: ProductUnderstanding;
  
  // If needsInput = false, return classification
  htsCode?: string;
  htsCodeFormatted?: string;
  description?: string;
  generalRate?: string | null;
  confidence?: number;
  confidenceLabel?: 'high' | 'medium' | 'low';
  
  // Classification path and transparency
  treePath?: TreePath;
  hierarchy?: ClassificationHierarchy;
  routeApplied?: string;
  transparency?: {
    stated: string[];
    inferred: string[];
    assumed: string[];
  };
  
  // Timing
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIERARCHY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a clean hierarchy from the tree path with chapter info
 * This creates the full description chain: Chapter → Heading → ... → Statistical
 */
function buildHierarchy(treePath: TreePath, chapter: string): ClassificationHierarchy {
  const levels: HierarchyLevel[] = [];
  
  // Add chapter as first level
  const chapterDesc = CHAPTER_DESCRIPTIONS[chapter] || `Chapter ${chapter}`;
  levels.push({
    level: 'chapter',
    code: chapter,
    codeFormatted: `Chapter ${chapter}`,
    description: chapterDesc,
    hasCode: true,
  });
  
  // Add each step from the tree path
  for (const step of treePath.steps) {
    // Clean up description
    let desc = step.description;
    
    // Remove trailing colons
    if (desc.endsWith(':')) {
      desc = desc.slice(0, -1);
    }
    
    // Remove textile category numbers like (838), (339), etc.
    // These are quota/statistical tracking numbers, not needed for display
    desc = desc.replace(/\s*\(\d{3}\)\s*$/, '').trim();
    
    levels.push({
      level: step.level as HierarchyLevel['level'],
      code: step.code,
      codeFormatted: step.codeFormatted,
      description: desc,
      hasCode: true,
      dutyRate: step.level === 'tariff_line' || step.level === 'statistical' 
        ? treePath.generalRate 
        : undefined,
    });
  }
  
  // Build breadcrumb: "Chapter 61 > 6109 > 6109.10 > ..."
  const breadcrumb = levels
    .map(l => l.level === 'chapter' ? l.codeFormatted : l.codeFormatted)
    .join(' > ');
  
  // Build full concatenated description
  // This creates: "Apparel, knitted: T-shirts, singlets: Of cotton: Men's or boys'"
  const fullDescription = levels
    .map(l => l.description)
    .join(': ');
  
  return {
    levels,
    breadcrumb,
    fullDescription,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * V8 Classification Engine - "Ask Upfront, Classify with Confidence"
 * 
 * This may return needsInput=true if questions need to be answered.
 * Call again with answers to complete classification.
 */
export async function classifyProductV8(
  input: ClassificationV8Input
): Promise<ClassificationV8Result> {
  const startTime = Date.now();
  
  console.log('[V8] ════════════════════════════════════════════════════════════');
  console.log('[V8] Starting V8 "Arbiter" classification for:', input.description);
  console.log('[V8] ════════════════════════════════════════════════════════════');
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1: Product Understanding
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[V8] Phase 1: Understanding product...');
  
  const understanding = await analyzeProduct(input.description, {
    material: input.material,
    use: input.use,
  });
  
  console.log('[V8] Product type:', understanding.productType);
  console.log('[V8] Material:', understanding.material, `(${understanding.materialSource})`);
  console.log('[V8] Function checks:', {
    isForCarrying: understanding.isForCarrying,
    isToy: understanding.isToy,
    isJewelry: understanding.isJewelry,
    isWearable: understanding.isWearable,
    isLighting: understanding.isLighting,
  });
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2: GRI Override Check (ONLY legally mandated rules)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('[V8] Phase 2: Checking GRI overrides...');
  
  // Check for the 3 legally-mandated function-over-material cases
  const griOverride = checkGRIOverrides(understanding);
  
  let result: ClassificationV8Result;
  
  if (griOverride) {
    console.log('[V8] GRI Override:', griOverride.rule, '→ Chapter', griOverride.chapter);
    result = await classifyWithGRIOverride(understanding, griOverride, input.answers);
  } else {
    // ─────────────────────────────────────────────────────────────────────────────
    // PHASE 3: AI-Driven Classification (THE ROBUST SOLUTION)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log('[V8] Phase 3: AI-driven chapter/heading selection...');
    result = await classifyWithAI(understanding, input);
  }
  
  // Build transparency info
  const transparency = buildTransparency(understanding, input.answers);
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: Final Result with Hierarchy
  // ─────────────────────────────────────────────────────────────────────────────
  
  // Build hierarchy for display
  let hierarchy: ClassificationHierarchy | undefined;
  if (result.treePath && result.htsCode) {
    const chapter = result.htsCode.substring(0, 2);
    hierarchy = buildHierarchy(result.treePath, chapter);
  }
  
  // Determine route description
  const routeApplied = griOverride 
    ? `${griOverride.rule}: ${griOverride.reason}`
    : `AI-driven: AI selected chapter and heading based on HTS descriptions`;
  
  const finalResult: ClassificationV8Result = {
    ...result,
    needsInput: false,
    hierarchy,
    routeApplied,
    transparency,
    processingTimeMs: Date.now() - startTime,
  };
  
  console.log('[V8] ════════════════════════════════════════════════════════════');
  console.log('[V8] RESULT:', finalResult.htsCodeFormatted);
  console.log('[V8] Confidence:', finalResult.confidenceLabel, `(${((finalResult.confidence || 0) * 100).toFixed(0)}%)`);
  console.log('[V8] Time:', finalResult.processingTimeMs, 'ms');
  console.log('[V8] ════════════════════════════════════════════════════════════');
  
  return finalResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GRI OVERRIDE CHECK - Only 3 legally mandated cases
// ═══════════════════════════════════════════════════════════════════════════════

interface GRIOverride {
  rule: string;
  chapter: string;
  heading: string;
  reason: string;
}

/**
 * Check for GRI-mandated function-over-material cases.
 * ONLY these 3 cases are hardcoded - everything else uses AI.
 */
function checkGRIOverrides(understanding: ProductUnderstanding): GRIOverride | null {
  // GRI 3(a): Cases designed to contain specific articles → Chapter 42
  if (understanding.isForCarrying) {
    return {
      rule: 'GRI 3(a) - Cases',
      chapter: '42',
      heading: '4202',
      reason: 'Cases and containers for carrying items classified under 4202 regardless of material',
    };
  }
  
  // GRI 3(a): Toys for children's amusement → Chapter 95
  if (understanding.isToy) {
    return {
      rule: 'GRI 3(a) - Toys',
      chapter: '95',
      heading: '9503',
      reason: 'Toys designed for children classified under Chapter 95 regardless of material',
    };
  }
  
  // GRI 3(a): Imitation jewelry → Chapter 71
  if (understanding.isJewelry) {
    return {
      rule: 'GRI 3(a) - Jewelry',
      chapter: '71',
      heading: '7117',
      reason: 'Imitation jewelry classified under 7117 regardless of material',
    };
  }
  
  return null;
}

/**
 * Classify with GRI override (the 3 hardcoded cases)
 */
async function classifyWithGRIOverride(
  understanding: ProductUnderstanding,
  override: GRIOverride,
  answers?: Record<string, string>
): Promise<ClassificationV8Result> {
  console.log('[V8] GRI Override classification:', override.rule);
  
  const effectiveMaterial = getEffectiveMaterial(understanding, answers);
  
  const context: ProductContext = {
    essentialCharacter: override.rule,
    productType: understanding.productType,
    material: effectiveMaterial,
    useContext: understanding.useContext,
    keywords: understanding.keywords,
  };
  
  const treePath = await navigateTree(override.chapter, override.heading, context);
  
  const finalCode = await prisma.htsCode.findFirst({
    where: { code: treePath.finalCode },
  });
  
  const confidence = Math.min(0.95, treePath.confidence + 0.05);
  
  return {
    needsInput: false,
    htsCode: treePath.finalCode,
    htsCodeFormatted: treePath.finalCodeFormatted,
    description: finalCode?.description || 'Unknown',
    generalRate: finalCode?.generalRate || null,
    confidence,
    confidenceLabel: confidence >= 0.85 ? 'high' : confidence >= 0.7 ? 'medium' : 'low',
    treePath,
    processingTimeMs: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI-DRIVEN CLASSIFICATION - The Robust Solution
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AI-driven classification - no hardcoded patterns.
 * AI reads actual HTS chapter/heading descriptions and selects the best match.
 */
async function classifyWithAI(
  understanding: ProductUnderstanding,
  input: ClassificationV8Input
): Promise<ClassificationV8Result> {
  console.log('[V8] AI-driven classification for:', understanding.productType);
  
  // Step 1: AI selects chapter and heading by reading actual HTS data
  const { chapter, heading } = await selectChapterAndHeading({
    description: input.description,
    material: input.material || understanding.material,
    use: input.use || understanding.useContext,
    productType: understanding.productType,
  });
  
  console.log('[V8] AI selected Chapter:', chapter.chapter, '-', chapter.chapterName);
  console.log('[V8] AI selected Heading:', heading.heading, '-', heading.headingName);
  
  // Step 2: Navigate tree from the AI-selected heading
  const effectiveMaterial = input.material || understanding.material || 'unknown';
  console.log('[V8] Effective material for tree navigation:', effectiveMaterial);
  
  const context: ProductContext = {
    essentialCharacter: 'article',
    productType: understanding.productType,
    material: effectiveMaterial,
    useContext: understanding.useContext,
    keywords: understanding.keywords,
  };
  
  console.log('[V8] Product context:', JSON.stringify(context, null, 2));
  
  const treePath = await navigateTree(chapter.chapter, heading.heading, context);
  
  // Step 3: Get final code details
  const finalCode = await prisma.htsCode.findFirst({
    where: { code: treePath.finalCode },
  });
  
  // Confidence is combination of AI selection confidence and tree navigation
  const confidence = (chapter.confidence + heading.confidence + treePath.confidence) / 3;
  
  return {
    needsInput: false,
    htsCode: treePath.finalCode,
    htsCodeFormatted: treePath.finalCodeFormatted,
    description: finalCode?.description || 'Unknown',
    generalRate: finalCode?.generalRate || null,
    confidence,
    confidenceLabel: confidence >= 0.85 ? 'high' : confidence >= 0.7 ? 'medium' : 'low',
    treePath,
    processingTimeMs: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY FUNCTION-DRIVEN CLASSIFICATION (kept for reference, not used)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use classifyWithGRIOverride or classifyWithAI instead
 */
async function classifyFunctionDriven(
  understanding: ProductUnderstanding,
  route: ClassificationRoute,
  answers?: Record<string, string>
): Promise<ClassificationV8Result> {
  console.log('[V8] Legacy function-driven classification');
  console.log('[V8] Forced chapter:', route.forcedChapter);
  console.log('[V8] Forced heading:', route.forcedHeading);
  
  // Get chapter and heading from route
  const chapter = route.forcedChapter || '99';
  const heading = route.forcedHeading || '';
  
  // Get effective material/fiber for routing
  const effectiveMaterial = getEffectiveMaterial(understanding, answers);
  console.log('[V8] Effective material for routing:', effectiveMaterial);
  
  // Build product context for tree navigation
  const context: ProductContext = {
    essentialCharacter: route.functionRule || 'unknown',
    productType: understanding.productType,
    material: effectiveMaterial,
    useContext: understanding.useContext,
    keywords: understanding.keywords,
  };
  
  // Navigate the HTS tree using AI-driven selection at each level
  let treePath: TreePath;
  
  if (heading) {
    // We have a forced heading - navigate from there
    treePath = await navigateTree(chapter, heading, context);
  } else {
    // Need to find the heading within the chapter
    const headingResult = await selectHeadingWithAILegacy(chapter, understanding);
    treePath = await navigateTree(chapter, headingResult.heading, context);
  }
  
  // Get final code details
  const finalCode = await prisma.htsCode.findFirst({
    where: { code: treePath.finalCode },
  });
  
  // Calculate confidence (higher for function-driven since less ambiguity)
  const confidence = Math.min(0.95, treePath.confidence + 0.05);
  
  return {
    needsInput: false,
    htsCode: treePath.finalCode,
    htsCodeFormatted: treePath.finalCodeFormatted,
    description: finalCode?.description || 'Unknown',
    generalRate: finalCode?.generalRate || null,
    confidence,
    confidenceLabel: confidence >= 0.85 ? 'high' : confidence >= 0.7 ? 'medium' : 'low',
    treePath,
    processingTimeMs: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATERIAL-DRIVEN CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classify products where MATERIAL determines the chapter
 * - Plastic → Chapter 39
 * - Ceramic → Chapter 69
 * - Steel → Chapter 73
 * - etc.
 */
async function classifyMaterialDriven(
  understanding: ProductUnderstanding,
  route: ClassificationRoute,
  answers?: Record<string, string>
): Promise<ClassificationV8Result> {
  console.log('[V8] Material-driven classification');
  
  // Get effective material (from answers or understanding)
  const material = getEffectiveMaterial(understanding, answers);
  console.log('[V8] Effective material:', material);
  
  if (material === 'unknown') {
    // Should have been caught in route determination, but handle gracefully
    return {
      needsInput: true,
      questions: [{
        id: 'material',
        attribute: 'material',
        question: `What material is your ${understanding.productType} made of?`,
        options: [
          { value: 'plastic', label: 'Plastic', htsImpact: 'Chapter 39' },
          { value: 'ceramic', label: 'Ceramic', htsImpact: 'Chapter 69' },
          { value: 'steel', label: 'Steel/Iron', htsImpact: 'Chapter 73' },
          { value: 'glass', label: 'Glass', htsImpact: 'Chapter 70' },
        ],
        impact: 'high',
      }],
      productUnderstanding: understanding,
      processingTimeMs: 0,
    };
  }
  
  // Get the full route from decision tree
  const fullRoute = getFullMaterialRoute(material, understanding);
  
  if (!fullRoute) {
    // Fallback: Use AI to determine chapter
    console.log('[V8] No decision tree route, using AI fallback');
    return await classifyWithAIFallback(understanding, material, answers);
  }
  
  console.log('[V8] Decision tree route:', fullRoute.chapter.chapter, '→', fullRoute.heading.heading);
  
  // Build product context
  const context: ProductContext = {
    essentialCharacter: 'article',
    productType: understanding.productType,
    material,
    useContext: understanding.useContext,
    keywords: understanding.keywords,
  };
  
  // Navigate from heading down
  const treePath = await navigateTree(
    fullRoute.chapter.chapter,
    fullRoute.heading.heading,
    context
  );
  
  // Get final code details
  const finalCode = await prisma.htsCode.findFirst({
    where: { code: treePath.finalCode },
  });
  
  return {
    needsInput: false,
    htsCode: treePath.finalCode,
    htsCodeFormatted: treePath.finalCodeFormatted,
    description: finalCode?.description || 'Unknown',
    generalRate: finalCode?.generalRate || null,
    confidence: treePath.confidence,
    confidenceLabel: treePath.confidence >= 0.85 ? 'high' : treePath.confidence >= 0.7 ? 'medium' : 'low',
    treePath,
    processingTimeMs: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI FALLBACK CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fallback when decision tree doesn't have a route
 */
async function classifyWithAIFallback(
  understanding: ProductUnderstanding,
  material: string,
  answers?: Record<string, string>
): Promise<ClassificationV8Result> {
  const xai = getXAIClient();
  
  console.log('[V8] AI fallback classification');
  
  const prompt = `You are a U.S. Customs HTS classification expert.

PRODUCT: ${understanding.whatThisIs}
- Type: ${understanding.productType}
- Material: ${material}
- Use context: ${understanding.useContext}

Determine the correct HTS CHAPTER and HEADING for this product.

CRITICAL RULES:
1. Household articles by material:
   - Plastic household → 3924
   - Ceramic household → 6912
   - Glass household → 7013
   - Steel household → 7323
   - Aluminum household → 7615

2. Industrial containers:
   - Plastic industrial → 3923
   - Steel industrial → 7310

3. Function over material:
   - Cases/bags for carrying → 4202
   - Toys → 9503
   - Furniture → 94XX
   - Electronics → 85XX

Return JSON:
{
  "chapter": "XX",
  "heading": "XXXX",
  "reasoning": "One sentence explanation"
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'You are an HTS classification expert. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    const chapter = parsed.chapter?.toString().padStart(2, '0') || '99';
    const heading = parsed.heading?.toString() || '';
    
    // Build context and navigate
    const context: ProductContext = {
      essentialCharacter: 'article',
      productType: understanding.productType,
      material,
      useContext: understanding.useContext,
      keywords: understanding.keywords,
    };
    
    const treePath = await navigateTree(chapter, heading, context);
    
    const finalCode = await prisma.htsCode.findFirst({
      where: { code: treePath.finalCode },
    });
    
    // Lower confidence for AI fallback
    const confidence = Math.max(0.6, treePath.confidence - 0.1);
    
    return {
      needsInput: false,
      htsCode: treePath.finalCode,
      htsCodeFormatted: treePath.finalCodeFormatted,
      description: finalCode?.description || 'Unknown',
      generalRate: finalCode?.generalRate || null,
      confidence,
      confidenceLabel: confidence >= 0.85 ? 'high' : confidence >= 0.7 ? 'medium' : 'low',
      treePath,
      processingTimeMs: 0,
    };
  } catch (error) {
    console.error('[V8] AI fallback error:', error);
    
    // Return a generic result with low confidence
    return {
      needsInput: false,
      htsCode: '',
      htsCodeFormatted: '',
      description: 'Classification failed',
      generalRate: null,
      confidence: 0.3,
      confidenceLabel: 'low',
      processingTimeMs: 0,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEADING SELECTION WITH AI
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Use selectHeadingWithAI from aiChapterSelector instead
 */
async function selectHeadingWithAILegacy(
  chapter: string,
  understanding: ProductUnderstanding
): Promise<{ heading: string; reasoning: string }> {
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
    `${i + 1}. ${h.codeFormatted}: ${h.description.substring(0, 100)}`
  ).join('\n');
  
  const prompt = `Select the correct HTS HEADING for this product:

PRODUCT: ${understanding.whatThisIs}
- Type: ${understanding.productType}
- Material: ${understanding.material}
- Use: ${understanding.useContext}

CHAPTER: ${chapter}

HEADINGS:
${headingList}

Select the MOST SPECIFIC heading. Return JSON:
{
  "selectedIndex": <1-based index>,
  "reasoning": "Why this heading"
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'Select the most appropriate heading. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 150,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    const idx = Math.max(0, Math.min((parsed.selectedIndex || 1) - 1, headings.length - 1));
    
    return {
      heading: headings[idx].code,
      reasoning: parsed.reasoning || 'AI selection',
    };
  } catch (error) {
    console.error('[V8] Heading selection error:', error);
    // Return first heading as fallback
    return {
      heading: headings[0].code,
      reasoning: 'Fallback to first heading',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSPARENCY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

function buildTransparency(
  understanding: ProductUnderstanding,
  answers?: Record<string, string>
): { stated: string[]; inferred: string[]; assumed: string[] } {
  const stated: string[] = [];
  const inferred: string[] = [];
  const assumed: string[] = [];
  
  // Material
  if (understanding.materialSource === 'stated' || answers?.material) {
    stated.push(`Material: ${answers?.material || understanding.material}`);
  } else if (understanding.materialSource === 'inferred') {
    inferred.push(`Material: ${understanding.material}`);
  } else if (understanding.material !== 'unknown') {
    assumed.push(`Material: ${understanding.material}`);
  }
  
  // Fiber (for textiles)
  if (answers?.fiber) {
    stated.push(`Fiber: ${answers.fiber}`);
  }
  
  // Product type
  inferred.push(`Product type: ${understanding.productType}`);
  
  // Use context
  inferred.push(`Use context: ${understanding.useContext}`);
  
  // Function checks
  if (understanding.isForCarrying) {
    inferred.push('Function: Case/container for carrying items');
  }
  if (understanding.isToy) {
    inferred.push('Function: Toy for children');
  }
  if (understanding.isJewelry) {
    inferred.push('Function: Jewelry/adornment');
  }
  if (understanding.isLighting) {
    inferred.push('Function: Lighting/lamp');
  }
  if (understanding.isWearable && understanding.isTextile) {
    inferred.push('Function: Apparel/clothing');
  }
  
  return { stated, inferred, assumed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  analyzeProduct,
  determineRoute,
} from '@/services/productClassifier';

export type {
  ProductUnderstanding,
  DecisionPoint,
  ClassificationRoute,
} from '@/services/productClassifier';

