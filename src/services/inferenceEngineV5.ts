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
 * Complete extraction result
 */
export interface InferenceResult {
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
  
  return {
    product: {
      category: aiResult.category,
      productType: aiResult.productType,
      confidence: aiResult.productConfidence,
      alternativeTypes: aiResult.alternativeTypes,
    },
    attributes: aiResult.attributes,
    htsAttributes,
    suggestedChapters: aiResult.suggestedChapters,
    searchTerms,
    potentialQuestions: aiResult.potentialQuestions,
    originalInput: description,
    processingTimeMs: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI EXTRACTION - ALL LOGIC IS IN THE PROMPT, NOT HARDCODED
// ═══════════════════════════════════════════════════════════════════════════════

interface AIExtractionResult {
  category: string;
  productType: string;
  productConfidence: number;
  alternativeTypes?: string[];
  attributes: ExtractedAttribute[];
  suggestedChapters: string[];
  potentialQuestions: InferenceResult['potentialQuestions'];
}

const EXTRACTION_PROMPT = `You are a U.S. Customs HTS classification expert. Your job is to extract ALL relevant product attributes for tariff classification.

PRODUCT DESCRIPTION:
"{description}"

TASK: Extract every attribute that could affect HTS classification. Be precise about what was STATED vs what you INFERRED.

CRITICAL RULES:
1. "stated" = User explicitly mentioned it in the description
2. "inferred" = You determined it with 90%+ confidence from the product type or context
3. "assumed" = You're guessing based on typical cases (50-89% confidence)
4. Only use "inferred" when there's strong logical basis (e.g., "smartphone" implies wireless capability)
5. For uncertain attributes, include alternatives array with other possible values
6. htsRelevant = true only if the attribute affects tariff classification (not color, brand, etc.)

WHAT TO EXTRACT (if applicable to this product):
- Material/composition (cotton, steel, plastic, etc.)
- Construction method (knit, woven, molded, forged, etc.)
- Gender/age (men's, women's, children's, babies', unisex)
- Intended use (kitchen, industrial, personal, sports, etc.)
- Form/state (liquid, powder, assembled, parts, etc.)
- Power source (electric, manual, battery, etc.)
- Value tier (under $X thresholds if mentioned)
- Any other attribute that HTS schedules typically differentiate on

SUGGESTED CHAPTERS:
Based on the product, suggest 1-3 likely HTS chapters (2-digit codes).

QUESTIONS TO ASK:
For any attribute where you marked source as "assumed" or "inferred" with <95% confidence, generate a clarifying question. Rate impact as:
- "high" = Would change the 4-digit heading or duty rate significantly
- "medium" = Would change the 6-8 digit subheading
- "low" = Would only affect statistical suffix

Return JSON in this exact format:
{
  "category": "apparel|textiles|electronics|machinery|tools|food|chemicals|plastics|metals|vehicles|other",
  "productType": "specific product type",
  "productConfidence": 0.0-1.0,
  "alternativeTypes": ["other possible types if ambiguous"],
  "suggestedChapters": ["61", "62"],
  "attributes": [
    {
      "key": "material",
      "value": "cotton",
      "source": "stated|inferred|assumed",
      "confidence": 0.0-1.0,
      "reasoning": "Why you determined this",
      "alternatives": ["polyester", "blend"],
      "htsRelevant": true
    }
  ],
  "potentialQuestions": [
    {
      "attributeKey": "construction",
      "question": "How is this garment constructed?",
      "options": ["Knit/Crocheted", "Woven", "Not sure"],
      "impact": "high",
      "currentAssumption": "knit"
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
    
    return {
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
    category: 'other',
    productType: description.split(' ').slice(0, 3).join(' '),
    productConfidence: 0.3,
    attributes: [],
    suggestedChapters: [],
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
