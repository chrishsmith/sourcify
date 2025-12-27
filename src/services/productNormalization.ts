/**
 * Product Normalization Service
 * 
 * Translates consumer language ("indoor planter") into trade/customs terminology
 * ("ceramic flower pot", "plastic plant container") that matches HTS database entries.
 * 
 * FEATURE FLAG CONTROLLED - Can be disabled without code changes
 * 
 * @module productNormalization
 * @created December 24, 2025
 */

import { getXAIClient } from '@/lib/xai';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAG
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Feature flag to enable/disable AI product normalization
 * Set to false to revert to original V5 behavior
 */
export const ENABLE_AI_PRODUCT_NORMALIZATION = true;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NormalizationResult {
  success: boolean;
  
  // Trade-language synonyms for the product
  tradeTerms: string[];
  
  // Likely material variations (for products where material is often omitted)
  materialVariants: string[];
  
  // Suggested HTS chapters based on what the product likely is
  suggestedChapters: string[];
  
  // Clarifying question if product is truly ambiguous
  clarification?: {
    question: string;
    options: string[];
  };
  
  // What the AI thinks this product is
  interpretation: string;
  
  // Processing time
  processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN NORMALIZATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

const NORMALIZATION_PROMPT = `You are a U.S. Customs HTS classification expert. Your job is to translate consumer product descriptions into official trade/HTS terminology.

CONSUMER DESCRIPTION:
"{description}"

TASK:
1. UNDERSTAND what this product actually IS (semantically, not just the words)
2. Provide trade/customs terminology that would appear in the HTS schedule
3. Suggest appropriate HTS chapters (2-digit codes) based on material

CRITICAL: Think about what the product ACTUALLY IS:
- What is it used for?
- Who uses it? (consumers at home, businesses, industry)
- What materials is it typically made of?
- What is the typical size/scale?

RULES:
- HTS uses formal trade language, not consumer slang
- Include 5-10 search terms that would match HTS descriptions
- Include BOTH specific terms AND generic HTS categories like "household articles", "articles of plastics/ceramic/metal"
- Include singular and plural forms
- Think about what HTS chapter headings would include this product

Return JSON:
{
  "interpretation": "Semantic description of what this product actually is",
  "tradeTerms": ["formal HTS term 1", "formal HTS term 2", "etc - at least 5-10 terms"],
  "materialVariants": ["typical materials this product is made of"],
  "suggestedChapters": ["2-digit HTS chapters that could contain this product"],
  "needsClarification": false,
  "clarificationQuestion": "Question if truly ambiguous",
  "clarificationOptions": ["option1", "option2"]
}`;

/**
 * Normalize a consumer product description into trade/HTS terminology
 * This is called when the initial HTS search returns 0 candidates
 */
export async function normalizeProductDescription(
  description: string
): Promise<NormalizationResult> {
  const startTime = Date.now();
  
  // If feature flag is disabled, return empty result
  if (!ENABLE_AI_PRODUCT_NORMALIZATION) {
    return {
      success: false,
      tradeTerms: [],
      materialVariants: [],
      suggestedChapters: [],
      interpretation: description,
      processingTimeMs: 0,
    };
  }
  
  const xai = getXAIClient();
  const prompt = NORMALIZATION_PROMPT.replace('{description}', description);
  
  try {
    console.log('[ProductNormalization] Normalizing:', description);
    
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a trade terminology expert. Return only valid JSON. Provide synonyms that would appear in HTS/tariff schedules.' 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });
    
    const content = response.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ProductNormalization] No JSON found in response:', content);
      return getDefaultNormalizationResult(description, startTime);
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    const result: NormalizationResult = {
      success: true,
      interpretation: parsed.interpretation || description,
      tradeTerms: parsed.tradeTerms || [],
      materialVariants: parsed.materialVariants || [],
      suggestedChapters: parsed.suggestedChapters || [],
      processingTimeMs: Date.now() - startTime,
    };
    
    // Add clarification if needed
    if (parsed.needsClarification && parsed.clarificationQuestion) {
      result.clarification = {
        question: parsed.clarificationQuestion,
        options: parsed.clarificationOptions || [],
      };
    }
    
    console.log('[ProductNormalization] Result:', {
      tradeTerms: result.tradeTerms.length,
      materialVariants: result.materialVariants.length,
      suggestedChapters: result.suggestedChapters,
    });
    
    return result;
    
  } catch (error) {
    console.error('[ProductNormalization] Error:', error);
    return getDefaultNormalizationResult(description, startTime);
  }
}

function getDefaultNormalizationResult(description: string, startTime: number): NormalizationResult {
  return {
    success: false,
    interpretation: description,
    tradeTerms: [],
    materialVariants: [],
    suggestedChapters: [],
    processingTimeMs: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH TERM EXPANSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate expanded search terms by combining trade terms with material variants
 * This creates comprehensive search coverage
 */
export function expandSearchTerms(normalization: NormalizationResult): string[] {
  const terms = new Set<string>();
  
  // Add all trade terms
  for (const term of normalization.tradeTerms) {
    terms.add(term.toLowerCase());
    // Also add without hyphens/special chars
    terms.add(term.toLowerCase().replace(/-/g, ' '));
  }
  
  // Combine trade terms with materials for specific searches
  // e.g., "ceramic flower pot", "plastic plant container"
  for (const material of normalization.materialVariants.slice(0, 4)) {
    for (const term of normalization.tradeTerms.slice(0, 3)) {
      terms.add(`${material} ${term}`.toLowerCase());
    }
  }
  
  return Array.from(terms);
}

