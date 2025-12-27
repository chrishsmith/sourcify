/**
 * Inference Engine V5 - "Infer First, Ask Later"
 * 
 * Extracts structured product attributes from free-text descriptions.
 * Key principle: Track WHAT we know vs WHAT we assumed.
 * 
 * NO HARDCODING - All extraction is done by AI dynamically.
 * 
 * @module inferenceEngineV5
 * @created December 23, 2025
 */

import { getXAIClient } from '@/lib/xai';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * How we know an attribute value
 */
export type AttributeSource = 
  | 'stated'    // User explicitly said it: "cotton t-shirt"
  | 'inferred'  // AI determined with high confidence from context
  | 'assumed';  // AI made a weak assumption

/**
 * A single extracted attribute
 */
export interface ExtractedAttribute {
  key: string;           // "material", "gender", "construction"
  value: string;         // "cotton", "men", "knit"
  source: AttributeSource;
  confidence: number;    // 0.0 - 1.0
  reasoning?: string;    // Why we inferred/assumed this
  alternatives?: string[]; // Other possible values if uncertain
  htsRelevant: boolean;  // Does this affect HTS classification?
}

/**
 * Product type identification
 */
export interface ProductIdentification {
  category: string;           // "apparel", "electronics", "tools"
  productType: string;        // "t-shirt", "smartphone", "knife"
  confidence: number;
  alternativeTypes?: string[];
}

/**
 * AI's understanding of what the product actually IS
 */
export interface ProductUnderstanding {
  whatThisIs: string;           // "A decorative container for holding indoor houseplants"
  primaryPurpose: 'functional' | 'decorative' | 'both';
  userContext: 'household' | 'commercial' | 'industrial';
  typicalSize: string;          // "small (under 5L)", "large (50L+)", etc.
}

/**
 * Chapter/code to AVOID and why
 */
export interface AvoidChapter {
  chapter: string;              // "3925" or "84"
  reason: string;               // "Builder's ware - this is a household article"
}

/**
 * Complete extraction result
 */
export interface InferenceResult {
  // AI's semantic understanding of the product
  productUnderstanding: ProductUnderstanding;
  
  // What product is this?
  product: ProductIdentification;
  
  // All extracted attributes
  attributes: ExtractedAttribute[];
  
  // Quick access to key HTS-relevant attributes
  htsAttributes: {
    material?: ExtractedAttribute;
    construction?: ExtractedAttribute;
    gender?: ExtractedAttribute;
    use?: ExtractedAttribute;
    value?: ExtractedAttribute;
    origin?: ExtractedAttribute;
  };
  
  // Suggested HTS chapters based on product type
  suggestedChapters: string[];
  
  // Chapters/codes to AVOID (with reasons)
  avoidChapters: AvoidChapter[];
  
  // Search terms for HTS database
  searchTerms: string[];
  
  // Questions we COULD ask (but won't force)
  potentialQuestions: {
    attributeKey: string;
    question: string;
    options: string[];
    impact: 'high' | 'medium' | 'low';
    currentAssumption?: string;
  }[];
  
  // Raw input preserved
  originalInput: string;
  
  // Processing metadata
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract structured attributes from a product description
 * ALL extraction is done by AI - no hardcoded rules
 */
export async function extractProductAttributes(
  description: string,
  options: {
    material?: string;
    use?: string;
    origin?: string;
    additionalContext?: string;
  } = {}
): Promise<InferenceResult> {
  const startTime = Date.now();
  
  // Combine all input
  const fullDescription = [
    description,
    options.material ? `Material: ${options.material}` : '',
    options.use ? `Use: ${options.use}` : '',
    options.origin ? `Origin: ${options.origin}` : '',
    options.additionalContext || '',
  ].filter(Boolean).join('. ');
  
  // Call AI for extraction - AI does ALL the work
  const aiResult = await callAIForExtraction(fullDescription);
  
  // Identify HTS-relevant attributes from AI results
  const htsAttributes = identifyHtsAttributes(aiResult.attributes);
  
  // Generate search terms from AI results
  const searchTerms = generateSearchTerms(aiResult.productType, aiResult.attributes);
  
  // Use AI-provided search terms if available, otherwise generate
  const finalSearchTerms = aiResult.searchTerms.length > 0 
    ? aiResult.searchTerms 
    : searchTerms;
  
  return {
    productUnderstanding: aiResult.productUnderstanding,
    product: {
      category: aiResult.category,
      productType: aiResult.productType,
      confidence: aiResult.productConfidence,
      alternativeTypes: aiResult.alternativeTypes,
    },
    attributes: aiResult.attributes,
    htsAttributes,
    suggestedChapters: aiResult.suggestedChapters,
    avoidChapters: aiResult.avoidChapters,
    searchTerms: finalSearchTerms,
    potentialQuestions: aiResult.potentialQuestions,
    originalInput: description,
    processingTimeMs: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI EXTRACTION - ALL LOGIC IS IN THE PROMPT, NOT HARDCODED
// ═══════════════════════════════════════════════════════════════════════════════

interface AIExtractionResult {
  productUnderstanding: ProductUnderstanding;
  category: string;
  productType: string;
  productConfidence: number;
  alternativeTypes?: string[];
  attributes: ExtractedAttribute[];
  suggestedChapters: string[];
  avoidChapters: AvoidChapter[];
  searchTerms: string[];
  potentialQuestions: InferenceResult['potentialQuestions'];
}

const EXTRACTION_PROMPT = `You are a U.S. Customs HTS classification expert with deep knowledge of what products actually ARE and how they're classified.

PRODUCT DESCRIPTION:
"{description}"

TASK: 
1. UNDERSTAND what this product actually IS (semantically, not just the words)
2. Extract all HTS-relevant attributes
3. Suggest appropriate HTS chapters
4. CRITICALLY: Identify what codes should be AVOIDED

═══════════════════════════════════════════════════════════════════════════════
STEP 1: PRODUCT UNDERSTANDING
═══════════════════════════════════════════════════════════════════════════════

Think about what this product ACTUALLY IS:
- "indoor planter" = a small decorative container for holding houseplants (typically 0.5-20 liters)
- "water bottle" = a portable beverage container for personal use
- "phone case" = a protective accessory for mobile devices
- "t-shirt" = a casual knit upper body garment

Consider:
- Is this a household/consumer item or industrial/commercial equipment?
- What is the PRIMARY purpose? (functional vs decorative vs both)
- What is the typical size/scale? (pocket-sized, household, industrial)
- Who uses this? (consumers at home, businesses, industry)

═══════════════════════════════════════════════════════════════════════════════
STEP 2: HTS CONTEXT - WHAT TO USE vs WHAT TO AVOID
═══════════════════════════════════════════════════════════════════════════════

For each product, you must think about:
- What HTS chapters/headings are APPROPRIATE
- What HTS chapters/headings should be AVOIDED (and why)

Examples of common misclassifications to AVOID:
- "planter/flower pot" → USE: 3924 (plastic household articles), 6912 (ceramic household articles)
                       → AVOID: 3925 (builder's ware - for construction), 8432 (agricultural machinery)
- "water bottle" → USE: 3924 (plastic household), 7013 (glassware), 7323 (metal household)
                → AVOID: 7310 (industrial tanks), 3923 (industrial packaging)
- "phone case" → USE: 3926 (other plastic articles), 4205 (leather articles)
              → AVOID: 8517 (telephone parts - it's an accessory, not a phone part)

═══════════════════════════════════════════════════════════════════════════════
STEP 3: ATTRIBUTE EXTRACTION RULES
═══════════════════════════════════════════════════════════════════════════════

1. "stated" = User explicitly mentioned it
2. "inferred" = 90%+ confidence from product type (e.g., "planter" implies container for plants)
3. "assumed" = 50-89% confidence, typical case
4. htsRelevant = true only if it affects tariff classification

Extract (if applicable):
- Material/composition
- Construction method  
- Gender/age (for apparel)
- Intended use context (household, industrial, commercial)
- Form/state (assembled, parts, liquid, etc.)
- Size category (small/household vs large/industrial)
- Power source (if applicable)

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Return JSON:
{
  "productUnderstanding": {
    "whatThisIs": "A decorative container for holding indoor houseplants",
    "primaryPurpose": "functional|decorative|both",
    "userContext": "household|commercial|industrial",
    "typicalSize": "small (under 5L)|medium (5-50L)|large (50L+)|varies"
  },
  "category": "household|apparel|electronics|machinery|tools|food|chemicals|plastics|metals|vehicles|other",
  "productType": "specific product type",
  "productConfidence": 0.0-1.0,
  "alternativeTypes": ["other possible types if ambiguous"],
  "suggestedChapters": ["39", "69"],
  "avoidChapters": [
    {"chapter": "84", "reason": "Agricultural machinery - this is a household container, not farming equipment"},
    {"chapter": "3925", "reason": "Builder's ware - this is a household article, not construction material"}
  ],
  "searchTerms": ["flower pot", "plant container", "household articles", "pot"],
  "attributes": [
    {
      "key": "material",
      "value": "plastic",
      "source": "stated|inferred|assumed",
      "confidence": 0.0-1.0,
      "reasoning": "Why you determined this",
      "alternatives": ["ceramic", "metal"],
      "htsRelevant": true
    }
  ],
  "potentialQuestions": [
    {
      "attributeKey": "material",
      "question": "What material is your planter made of?",
      "options": ["Plastic", "Ceramic/Terracotta", "Metal", "Other"],
      "impact": "high",
      "currentAssumption": "plastic"
    }
  ]
}`;

async function callAIForExtraction(description: string): Promise<AIExtractionResult> {
  const xai = getXAIClient();
  
  const prompt = EXTRACTION_PROMPT.replace('{description}', description);
  
  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: 'You are a precise JSON generator for HTS classification. Return only valid JSON, no markdown. Extract all HTS-relevant attributes dynamically based on the product.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });
    
    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[InferenceV5] No JSON found in response:', content);
      return getDefaultExtractionResult(description);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Parse product understanding
    const productUnderstanding: ProductUnderstanding = {
      whatThisIs: parsed.productUnderstanding?.whatThisIs || `A ${parsed.productType || 'product'}`,
      primaryPurpose: parsed.productUnderstanding?.primaryPurpose || 'functional',
      userContext: parsed.productUnderstanding?.userContext || 'household',
      typicalSize: parsed.productUnderstanding?.typicalSize || 'varies',
    };
    
    // Parse avoid chapters
    const avoidChapters: AvoidChapter[] = (parsed.avoidChapters || []).map((ac: Record<string, unknown>) => ({
      chapter: String(ac.chapter || ''),
      reason: String(ac.reason || ''),
    }));
    
    return {
      productUnderstanding,
      category: parsed.category || 'other',
      productType: parsed.productType || 'unknown product',
      productConfidence: parsed.productConfidence || 0.5,
      alternativeTypes: parsed.alternativeTypes,
      attributes: (parsed.attributes || []).map((attr: Record<string, unknown>) => ({
        key: attr.key as string,
        value: attr.value as string,
        source: (attr.source as AttributeSource) || 'assumed',
        confidence: (attr.confidence as number) || 0.5,
        reasoning: attr.reasoning as string,
        alternatives: attr.alternatives as string[],
        htsRelevant: attr.htsRelevant !== false,
      })),
      suggestedChapters: parsed.suggestedChapters || [],
      avoidChapters,
      searchTerms: parsed.searchTerms || [],
      potentialQuestions: (parsed.potentialQuestions || []).map((q: Record<string, unknown>) => ({
        attributeKey: q.attributeKey as string,
        question: q.question as string,
        options: q.options as string[],
        impact: (q.impact as 'high' | 'medium' | 'low') || 'medium',
        currentAssumption: q.currentAssumption as string,
      })),
    };
  } catch (error) {
    console.error('[InferenceV5] AI extraction error:', error);
    return getDefaultExtractionResult(description);
  }
}

function getDefaultExtractionResult(description: string): AIExtractionResult {
  // Minimal fallback - just return what we can parse without AI
  return {
    productUnderstanding: {
      whatThisIs: description,
      primaryPurpose: 'functional',
      userContext: 'household',
      typicalSize: 'varies',
    },
    category: 'other',
    productType: description.split(' ').slice(0, 3).join(' '),
    productConfidence: 0.3,
    attributes: [],
    suggestedChapters: [],
    avoidChapters: [],
    searchTerms: [],
    potentialQuestions: [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTS ATTRIBUTE IDENTIFICATION (from AI results, not hardcoded)
// ═══════════════════════════════════════════════════════════════════════════════

function identifyHtsAttributes(attributes: ExtractedAttribute[]): InferenceResult['htsAttributes'] {
  const result: InferenceResult['htsAttributes'] = {};
  
  // Map common attribute keys to our standard fields
  const keyMappings: Record<string, keyof InferenceResult['htsAttributes']> = {
    'material': 'material',
    'primaryMaterial': 'material',
    'composition': 'material',
    'fabric': 'material',
    'construction': 'construction',
    'constructionMethod': 'construction',
    'gender': 'gender',
    'targetGender': 'gender',
    'ageGroup': 'gender',
    'use': 'use',
    'intendedUse': 'use',
    'purpose': 'use',
    'application': 'use',
    'value': 'value',
    'price': 'value',
    'unitValue': 'value',
    'origin': 'origin',
    'countryOfOrigin': 'origin',
    'madeIn': 'origin',
  };
  
  for (const attr of attributes) {
    if (!attr.htsRelevant) continue;
    
    const mappedKey = keyMappings[attr.key] || keyMappings[attr.key.toLowerCase()];
    if (mappedKey && !result[mappedKey]) {
      result[mappedKey] = attr;
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH TERM GENERATION (from AI results)
// ═══════════════════════════════════════════════════════════════════════════════

function generateSearchTerms(productType: string, attributes: ExtractedAttribute[]): string[] {
  const terms = new Set<string>();
  
  // Add product type and variations
  terms.add(productType.toLowerCase());
  terms.add(productType.toLowerCase().replace(/-/g, ' '));
  terms.add(productType.toLowerCase().replace(/\s+/g, '-'));
  
  // Add key attribute values
  for (const attr of attributes) {
    if (attr.htsRelevant && attr.confidence > 0.5) {
      terms.add(attr.value.toLowerCase());
      
      // Combine with product type for more specific searches
      terms.add(`${attr.value} ${productType}`.toLowerCase());
    }
  }
  
  return Array.from(terms);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a human-readable summary of what was stated vs inferred vs assumed
 */
export function getAttributeSummary(result: InferenceResult): {
  stated: string[];
  inferred: string[];
  assumed: string[];
} {
  const summary = { stated: [] as string[], inferred: [] as string[], assumed: [] as string[] };
  
  for (const attr of result.attributes) {
    if (!attr.htsRelevant) continue;
    
    const display = `${attr.key}: ${attr.value}`;
    
    switch (attr.source) {
      case 'stated':
        summary.stated.push(display);
        break;
      case 'inferred':
        summary.inferred.push(`${display} (${attr.reasoning || 'from context'})`);
        break;
      case 'assumed':
        summary.assumed.push(`${display} (${attr.reasoning || 'typical default'})`);
        break;
    }
  }
  
  return summary;
}

/**
 * Check if any high-impact questions remain unanswered
 */
export function hasHighImpactUncertainty(result: InferenceResult): boolean {
  return result.potentialQuestions.some(q => q.impact === 'high');
}

/**
 * Update inference result with user-provided answers
 */
export function applyUserAnswers(
  result: InferenceResult,
  answers: Record<string, string>
): InferenceResult {
  const updatedAttributes = result.attributes.map(attr => {
    if (answers[attr.key]) {
      return {
        ...attr,
        value: answers[attr.key],
        source: 'stated' as AttributeSource,
        confidence: 1.0,
        reasoning: 'User confirmed',
      };
    }
    return attr;
  });
  
  // Add any new attributes from answers
  for (const [key, value] of Object.entries(answers)) {
    if (!updatedAttributes.find(a => a.key === key)) {
      updatedAttributes.push({
        key,
        value,
        source: 'stated',
        confidence: 1.0,
        reasoning: 'User provided',
        htsRelevant: true,
      });
    }
  }
  
  return {
    ...result,
    attributes: updatedAttributes,
    htsAttributes: identifyHtsAttributes(updatedAttributes),
    potentialQuestions: result.potentialQuestions.filter(q => !answers[q.attributeKey]),
  };
}
