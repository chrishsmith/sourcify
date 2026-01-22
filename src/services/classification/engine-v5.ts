/**
 * Classification Engine V5 - "Infer First, Ask Later"
 * 
 * Uses local HTS database + Inference Engine for transparent classification.
 * 
 * Key principles:
 * 1. Show best match immediately with confidence
 * 2. Be transparent about what was stated vs inferred vs assumed
 * 3. Only ask questions if they would change the outcome
 * 4. Provide alternatives and duty ranges
 * 
 * @module classificationEngineV5
 * @created December 23, 2025
 */

import { 
  extractProductAttributes, 
  getAttributeSummary,
  hasHighImpactUncertainty,
  applyUserAnswers,
  type InferenceResult,
  type ExtractedAttribute,
} from '@/services/inferenceEngineV5';
import { 
  searchHtsCodes, 
  getHtsHierarchy,
  getHtsCode,
  HtsLevel,
  type HtsSearchResult,
  type HtsCodeResult,
} from '@/services/hts/database';
import {
  ENABLE_AI_PRODUCT_NORMALIZATION,
  normalizeProductDescription,
  expandSearchTerms,
  type NormalizationResult,
} from '@/services/productNormalization';
import {
  classifyWithAI,
  validateAndEnrichRecommendations,
  type AIClassificationRecommendation,
} from '@/services/aiClassificationEngine';

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAG: AI-FIRST CLASSIFICATION
// When enabled, the AI directly recommends HTS codes instead of just extracting keywords
// ═══════════════════════════════════════════════════════════════════════════════
export const ENABLE_AI_FIRST_CLASSIFICATION = true;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassificationV5Input {
  description: string;
  material?: string;
  use?: string;
  origin?: string;
  value?: number;
  // If user has answered questions
  userAnswers?: Record<string, string>;
}

export interface ClassificationCandidate {
  htsCode: string;
  htsCodeFormatted: string;
  description: string;
  level: HtsLevel;
  generalRate: string | null;
  adValoremRate: number | null;
  matchScore: number;
  matchReasons: string[];
  // Why this might not be right
  uncertainties: string[];
}

export interface DutyRange {
  min: number;
  max: number;
  minCode: string;
  maxCode: string;
  formatted: string; // "Free - 16.5%"
}

export interface ClassificationV5Result {
  success: boolean;
  
  // Best match
  bestMatch: {
    htsCode: string;
    htsCodeFormatted: string;
    description: string;
    generalRate: string | null;
    adValoremRate: number | null;
    confidence: number; // 0.0 - 1.0
    confidenceLabel: 'high' | 'medium' | 'low';
  } | null;
  
  // Full hierarchy for display
  hierarchy: {
    chapter: { code: string; description: string } | null;
    heading: { code: string; description: string } | null;
    subheading: { code: string; description: string } | null;
    tariffLine: { code: string; description: string } | null;
    statistical: { code: string; description: string; parentGroupings?: string[] } | null;
  };
  
  // Alternative candidates
  alternatives: ClassificationCandidate[];
  
  // What we knew vs assumed
  transparency: {
    stated: string[];    // User explicitly told us
    inferred: string[];  // We figured out with high confidence
    assumed: string[];   // Weak assumptions we made
  };
  
  // Duty impact if uncertain
  dutyRange: DutyRange | null;
  
  // Questions we COULD ask (but aren't forcing)
  optionalQuestions: {
    attributeKey: string;
    question: string;
    options: string[];
    impact: 'high' | 'medium' | 'low';
    currentAssumption?: string;
    potentialDutyChange?: string; // "Could change rate from 16.5% to Free"
  }[];
  
  // Processing info
  processingTimeMs: number;
  searchTermsUsed: string[];
  
  // AI expert recommendation (if AI-first classification enabled)
  aiRecommendation?: {
    understanding: string;
    primaryCode: string;
    reasoning: string;
    confidence: number;
  };
  
  // AI normalization info (if used)
  normalization?: {
    used: boolean;
    interpretation?: string;
    tradeTerms?: string[];
    clarification?: {
      question: string;
      options: string[];
    };
  };
  
  // For refinement
  inferenceResult: InferenceResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function classifyProductV5(
  input: ClassificationV5Input
): Promise<ClassificationV5Result> {
  const startTime = Date.now();
  
  console.log('[ClassifyV5] Starting classification for:', input.description);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AI-FIRST CLASSIFICATION
  // The AI is the customs expert - it DIRECTLY recommends HTS codes
  // ═══════════════════════════════════════════════════════════════════════════
  
  let aiRecommendation: AIClassificationRecommendation | undefined;
  
  if (ENABLE_AI_FIRST_CLASSIFICATION) {
    console.log('[ClassifyV5] Using AI-first classification');
    
    // Get AI's direct classification recommendations
    aiRecommendation = await classifyWithAI(input.description, {
      material: input.material,
      use: input.use,
    });
    
    // Validate AI recommendations against our database
    aiRecommendation = await validateAndEnrichRecommendations(aiRecommendation);
    
    console.log('[ClassifyV5] AI understanding:', aiRecommendation.productUnderstanding.whatThisIs);
    console.log('[ClassifyV5] AI primary code:', aiRecommendation.recommendations.primary.htsCode);
    console.log('[ClassifyV5] AI avoid:', aiRecommendation.avoidCodes.map(a => a.code).join(', '));
  }
  
  // Step 1: Extract attributes using inference engine (for transparency display)
  let inference = await extractProductAttributes(input.description, {
    material: input.material,
    use: input.use,
    origin: input.origin,
  });
  
  // Merge AI recommendation into inference for scoring
  if (aiRecommendation) {
    inference.productUnderstanding = {
      whatThisIs: aiRecommendation.productUnderstanding.whatThisIs,
      primaryPurpose: 'functional',
      userContext: aiRecommendation.productUnderstanding.userContext.includes('home') ? 'household' : 
                   aiRecommendation.productUnderstanding.userContext.includes('industrial') ? 'industrial' : 'household',
      typicalSize: aiRecommendation.productUnderstanding.typicalSize,
    };
    inference.avoidChapters = aiRecommendation.avoidCodes.map(ac => ({
      chapter: ac.code,
      reason: ac.reason,
    }));
  }
  
  // Apply any user answers
  if (input.userAnswers && Object.keys(input.userAnswers).length > 0) {
    inference = applyUserAnswers(inference, input.userAnswers);
  }
  
  // Step 2: Search local HTS database (with AI normalization fallback)
  const { candidates, normalization } = await findHtsCandidates(inference);
  
  // Step 3: Score and rank candidates (uses AI's avoidCodes)
  let scoredCandidates = scoreAndRankCandidates(candidates, inference);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // AI-FIRST: Inject and boost AI-recommended codes
  // If the AI found a valid code, make sure it's in the candidate pool!
  // ═══════════════════════════════════════════════════════════════════════════
  if (aiRecommendation && aiRecommendation.recommendations.primary.htsCode) {
    const aiPrimaryCode = aiRecommendation.recommendations.primary.htsCode.replace(/\./g, '');
    const aiPrimaryFormatted = aiRecommendation.recommendations.primary.htsCode;
    
    // CRITICAL: If AI's recommended code isn't in candidates, ADD IT
    const aiCodeExists = scoredCandidates.some(c => 
      c.htsCode.replace(/\./g, '') === aiPrimaryCode
    );
    
    if (!aiCodeExists && aiPrimaryCode.length >= 8) {
      // Fetch the actual code from database to get full details
      const aiCode = await getHtsCode(aiPrimaryCode);
      if (aiCode) {
        console.log(`[ClassifyV5] Injecting AI-recommended code: ${aiCode.codeFormatted}`);
        scoredCandidates.unshift({
          htsCode: aiCode.code,
          htsCodeFormatted: aiCode.codeFormatted,
          description: aiCode.description,
          level: aiCode.level,
          generalRate: aiCode.generalRate,
          adValoremRate: aiCode.adValoremRate,
          matchScore: 200, // High score - AI expert recommendation
          matchReasons: [`AI expert recommendation: ${aiRecommendation.recommendations.primary.reasoning}`],
          uncertainties: [],
        });
      }
    }
    
    // Also boost any existing candidates that match
    for (const candidate of scoredCandidates) {
      const candidateCode = candidate.htsCode.replace(/\./g, '');
      
      // Boost if matches AI's primary recommendation
      if (candidateCode.startsWith(aiPrimaryCode) || aiPrimaryCode.startsWith(candidateCode)) {
        candidate.matchScore += 100;
        candidate.matchReasons.push(`AI expert: ${aiRecommendation.recommendations.primary.reasoning}`);
      }
      
      // Boost if matches AI's by-material recommendations
      for (const matRec of aiRecommendation.recommendations.byMaterial) {
        const matCode = matRec.htsCode.replace(/\./g, '');
        if (candidateCode.startsWith(matCode) || matCode.startsWith(candidateCode)) {
          candidate.matchScore += 80;
          candidate.matchReasons.push(`AI (${matRec.conditions}): ${matRec.reasoning}`);
        }
      }
    }
    
    // Re-sort after boosting
    scoredCandidates = scoredCandidates.sort((a, b) => b.matchScore - a.matchScore);
  }
  
  // Step 4: Calculate duty range if there's uncertainty
  const dutyRange = calculateDutyRange(scoredCandidates);
  
  // Step 5: Get hierarchy for best match
  const bestMatch = scoredCandidates[0] || null;
  const hierarchy = bestMatch 
    ? await buildHierarchy(bestMatch.htsCode)
    : { chapter: null, heading: null, subheading: null, tariffLine: null, statistical: null };
  
  // Step 6: Enhance questions with duty impact
  let optionalQuestions = await enhanceQuestionsWithDutyImpact(
    inference.potentialQuestions,
    scoredCandidates
  );
  
  // Add AI's refinement questions
  if (aiRecommendation && aiRecommendation.refinementQuestions.length > 0) {
    for (const aq of aiRecommendation.refinementQuestions) {
      if (!optionalQuestions.find(oq => oq.attributeKey === aq.affects)) {
        optionalQuestions.push({
          attributeKey: aq.affects,
          question: aq.question,
          options: aq.options,
          impact: aq.impact,
          currentAssumption: undefined,
          potentialDutyChange: undefined,
        });
      }
    }
  }
  
  // Deduplicate semantically similar questions (e.g., "size" vs "capacity" vs "dimensions")
  optionalQuestions = deduplicateQuestions(optionalQuestions);
  
  // Get transparency summary
  const transparency = getAttributeSummary(inference);
  
  // Calculate confidence
  const confidence = calculateConfidence(inference, scoredCandidates);
  
  return {
    success: true,
    bestMatch: bestMatch ? {
      htsCode: bestMatch.htsCode,
      htsCodeFormatted: bestMatch.htsCodeFormatted,
      description: bestMatch.description,
      generalRate: bestMatch.generalRate,
      adValoremRate: bestMatch.adValoremRate,
      confidence: confidence.score,
      confidenceLabel: confidence.label,
    } : null,
    hierarchy,
    alternatives: scoredCandidates.slice(1, 6), // Top 5 alternatives
    transparency,
    dutyRange,
    optionalQuestions,
    processingTimeMs: Date.now() - startTime,
    searchTermsUsed: inference.searchTerms,
    // Include AI expert recommendation
    aiRecommendation: aiRecommendation ? {
      understanding: aiRecommendation.productUnderstanding.whatThisIs,
      primaryCode: aiRecommendation.recommendations.primary.htsCode,
      reasoning: aiRecommendation.reasoning,
      confidence: aiRecommendation.confidence,
    } : undefined,
    // Include normalization info if AI normalization was used
    normalization: normalization ? {
      used: normalization.success,
      interpretation: normalization.interpretation,
      tradeTerms: normalization.tradeTerms,
      clarification: normalization.clarification,
    } : undefined,
    inferenceResult: inference,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANDIDATE SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

interface FindCandidatesResult {
  candidates: HtsSearchResult[];
  normalization?: NormalizationResult;
}

async function findHtsCandidates(inference: InferenceResult): Promise<FindCandidatesResult> {
  const allResults: HtsSearchResult[] = [];
  const seenCodes = new Set<string>();
  
  // Extract core product term (e.g., "men's t-shirt" → "t-shirt")
  // Remove gender qualifiers and common words to find the actual product
  const productLower = inference.product.productType.toLowerCase();
  const productTerms = productLower.split(/[\s]+/);
  
  // Remove possessives and check against gender words
  const isGenderTerm = (term: string) => {
    const cleaned = term.replace(/['']s$/i, ''); // Remove 's or 's
    return ['men', 'women', 'boy', 'boys', 'girl', 'girls', 'male', 'female', 'unisex'].includes(cleaned);
  };
  
  // Common stop words and adjectives that shouldn't be the core product term
  const stopWords = ['for', 'the', 'and', 'with', 'of', 'a', 'an', 'in', 'on', 'to'];
  const commonAdjectives = ['indoor', 'outdoor', 'small', 'large', 'big', 'new', 'old', 'hot', 'cold', 
    'red', 'blue', 'green', 'black', 'white', 'gray', 'grey', 'brown', 'yellow', 'pink', 'purple', 'orange',
    'electric', 'electronic', 'digital', 'manual', 'automatic', 'portable', 'wireless', 'wired',
    'professional', 'commercial', 'industrial', 'residential', 'home', 'office', 'kitchen', 'garden',
    'modern', 'vintage', 'antique', 'custom', 'standard', 'mini', 'micro', 'mega', 'super', 'ultra'];
  
  // Filter to find significant terms (excluding stop words, gender terms, and common adjectives)
  const significantTerms = productTerms.filter(t => 
    t.length > 2 && 
    !isGenderTerm(t) && 
    !stopWords.includes(t) &&
    !commonAdjectives.includes(t)
  );
  
  // In English noun phrases, the NOUN (product) typically comes LAST
  // "indoor planter" → "planter", "red shirt" → "shirt", "men's cotton t-shirt" → "t-shirt"
  const coreProductTerm = significantTerms.length > 0 
    ? significantTerms[significantTerms.length - 1] 
    : productTerms[productTerms.length - 1];
  
  console.log(`[ClassifyV5] Core product term: "${coreProductTerm}" from "${inference.product.productType}" (significant: ${significantTerms.join(', ')})`);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: AI NORMALIZATION (PRIMARY, not fallback!)
  // Translate consumer language → trade/HTS terminology BEFORE searching
  // "planter" → "flower pot", "plant container", etc.
  // ═══════════════════════════════════════════════════════════════════════════════
  
  let normalization: NormalizationResult | undefined;
  let normalizedTradeTerms: string[] = [];
  
  if (ENABLE_AI_PRODUCT_NORMALIZATION) {
    console.log('[ClassifyV5] Running AI product normalization for consumer term:', inference.originalInput);
    normalization = await normalizeProductDescription(inference.originalInput);
    
    if (normalization.success && normalization.tradeTerms.length > 0) {
      normalizedTradeTerms = normalization.tradeTerms;
      console.log('[ClassifyV5] Normalized trade terms:', normalizedTradeTerms);
      console.log('[ClassifyV5] Suggested chapters from normalization:', normalization.suggestedChapters);
    }
  }
  
  // Combine normalization chapters with inference chapters (prioritize normalization)
  const chaptersToSearch = normalization?.suggestedChapters?.length 
    ? [...new Set([...normalization.suggestedChapters, ...inference.suggestedChapters])]
    : inference.suggestedChapters;
  
  // Search strategies ordered by reliability
  const searchStrategies = [
    // Strategy 1: BEST - Search NORMALIZED TRADE TERMS within suggested chapters
    // "planter" → search "flower pot", "plant container" in chapters 39, 69, 73
    async () => {
      if (normalizedTradeTerms.length === 0) return [];
      const results: HtsSearchResult[] = [];
      for (const chapter of chaptersToSearch.slice(0, 4)) {
        for (const term of normalizedTradeTerms.slice(0, 5)) {
          const termResults = await searchHtsCodes(term, {
            limit: 20,
            chapter,
          });
          results.push(...termResults);
        }
      }
      return results;
    },
    
    // Strategy 2: Normalized trade terms globally (important for uncommon products)
    async () => {
      if (normalizedTradeTerms.length === 0) return [];
      const results: HtsSearchResult[] = [];
      for (const term of normalizedTradeTerms.slice(0, 5)) {
        const termResults = await searchHtsCodes(term, { limit: 15 });
        results.push(...termResults);
      }
      return results;
    },
    
    // Strategy 3: Core product term within suggested chapters (original approach)
    // "men's t-shirt" → search "t-shirt" in chapter 61
    async () => {
      const results: HtsSearchResult[] = [];
      for (const chapter of chaptersToSearch.slice(0, 3)) {
        const chapterResults = await searchHtsCodes(coreProductTerm, {
          limit: 30,
          chapter,
        });
        results.push(...chapterResults);
      }
      return results;
    },
    
    // Strategy 4: Full product type within chapters (may include gender qualifiers)
    async () => {
      const results: HtsSearchResult[] = [];
      for (const chapter of chaptersToSearch.slice(0, 2)) {
        const chapterResults = await searchHtsCodes(inference.product.productType, {
          limit: 20,
          chapter,
        });
        results.push(...chapterResults);
      }
      return results;
    },
    
    // Strategy 5: Core product term globally (all chapters) - lower priority
    () => searchHtsCodes(coreProductTerm, { 
      limit: 30,
    }),
    
    // Strategy 6: Search terms within suggested chapters
    async () => {
      const results: HtsSearchResult[] = [];
      for (const chapter of chaptersToSearch.slice(0, 2)) {
        for (const term of inference.searchTerms.slice(0, 3)) {
          const termResults = await searchHtsCodes(term, {
            limit: 10,
            chapter,
          });
          results.push(...termResults);
        }
      }
      return results;
    },
  ];
  
  // Execute all strategies
  for (const strategy of searchStrategies) {
    try {
      const results = await strategy();
      for (const result of results) {
        if (!seenCodes.has(result.code)) {
          seenCodes.add(result.code);
          allResults.push(result);
        }
      }
    } catch (error) {
      console.error('[ClassifyV5] Search strategy error:', error);
    }
  }
  
  console.log(`[ClassifyV5] Found ${allResults.length} unique candidates`);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPANDED SEARCH FALLBACK (if still 0 candidates)
  // Try material combinations from normalization
  // ═══════════════════════════════════════════════════════════════════════════════
  
  if (allResults.length === 0 && normalization?.success && normalization.materialVariants.length > 0) {
    console.log('[ClassifyV5] No candidates found, trying material combinations...');
    
    // Get expanded search terms (trade terms + material combinations)
    const expandedTerms = expandSearchTerms(normalization);
    
    // Search with material-combined terms (e.g., "ceramic flower pot", "plastic pot")
    for (const term of expandedTerms.slice(0, 15)) {
      try {
        const results = await searchHtsCodes(term, {
          limit: 10,
          level: [HtsLevel.statistical, HtsLevel.tariff_line],
        });
        for (const result of results) {
          if (!seenCodes.has(result.code)) {
            seenCodes.add(result.code);
            allResults.push(result);
          }
        }
      } catch (error) {
        console.error('[ClassifyV5] Expanded search error:', error);
      }
    }
    
    console.log(`[ClassifyV5] After expanded search: ${allResults.length} candidates`);
  }
  
  // Return candidates with normalization info (if normalization was performed)
  return { candidates: allResults, normalization };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANDIDATE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function scoreAndRankCandidates(
  candidates: HtsSearchResult[],
  inference: InferenceResult
): ClassificationCandidate[] {
  const scored: ClassificationCandidate[] = candidates.map(candidate => {
    let score = 0;
    const matchReasons: string[] = [];
    const uncertainties: string[] = [];
    
    const descLower = candidate.description.toLowerCase();
    const productLower = inference.product.productType.toLowerCase();
    
    // Product type match - THIS IS THE MOST IMPORTANT FACTOR
    const productTerms = productLower.split(/[\s]+/).filter(t => t.length > 1);
    let productMatchCount = 0;
    let exactProductMatch = false;
    
    // Check for exact product type match (e.g., "t-shirt" in description)
    // Use the same logic as findHtsCandidates to extract core term
    const isGenderTermInner = (term: string) => {
      const cleaned = term.replace(/['']s$/i, '');
      return ['men', 'women', 'boy', 'boys', 'girl', 'girls', 'male', 'female', 'unisex'].includes(cleaned);
    };
    
    const coreProductTerm = productTerms.find(t => 
      t.length > 2 && !isGenderTermInner(t) && !['for', 'the', 'and', 'with', 'of', 'a', 'an'].includes(t)
    ) || productTerms[productTerms.length - 1];
    
    if (coreProductTerm && (descLower.includes(coreProductTerm) || 
        descLower.includes(coreProductTerm.replace(/-/g, '')) ||
        descLower.includes(coreProductTerm.replace(/-/g, ' ')))) {
      exactProductMatch = true;
      score += 80;  // Very strong boost for exact product match
      matchReasons.push(`Exact product match: ${coreProductTerm}`);
    }
    
    // Also check for partial matches
    for (const term of productTerms) {
      if (term.length > 2 && descLower.includes(term)) {
        productMatchCount++;
      }
    }
    
    if (!exactProductMatch && productMatchCount > 0) {
      score += 30 + (productMatchCount * 5);
      matchReasons.push(`Partial product match: ${inference.product.productType}`);
    }
    
    // Penalty for codes that describe raw materials when product is finished goods
    const isRawMaterial = descLower.includes('not carded') || 
                          descLower.includes('raw') || 
                          descLower.includes('unprocessed') ||
                          descLower.includes('waste') ||
                          descLower.includes('scrap');
    const isFinishedProduct = productLower.includes('shirt') || 
                              productLower.includes('pants') ||
                              productLower.includes('jacket') ||
                              productLower.includes('device') ||
                              productLower.includes('tool');
    if (isRawMaterial && productMatchCount === 0) {
      score -= 30;
      uncertainties.push('This code is for raw materials, not finished products');
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AI-DRIVEN CATEGORY PENALTIES
    // The AI tells us which chapters/codes to AVOID for this product
    // No hardcoding - the AI understands what the product IS
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (inference.avoidChapters && inference.avoidChapters.length > 0) {
      for (const avoidInfo of inference.avoidChapters) {
        // Check if this candidate matches a chapter we should avoid
        if (candidate.code.startsWith(avoidInfo.chapter)) {
          score -= 150; // Heavy penalty for AI-identified wrong chapters
          uncertainties.push(`AI: ${avoidInfo.reason}`);
        }
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AI-DRIVEN USER CONTEXT MATCHING
    // If AI says this is a "household" item, penalize industrial/commercial codes
    // ═══════════════════════════════════════════════════════════════════════════
    
    const userContext = inference.productUnderstanding?.userContext || 'household';
    
    // Household products should match household codes
    if (userContext === 'household') {
      // CRITICAL: Heavily penalize codes that EXPLICITLY say "not household"
      // This is a common trap - 6912.00.20 says "other ware not household ware"
      if (descLower.includes('not household') || descLower.includes('other than household')) {
        score -= 200; // VERY heavy penalty - this is explicitly the wrong code
        uncertainties.push('This code explicitly excludes household items');
      }
      
      // Bonus for household-related descriptions
      if (descLower.includes('household') && !descLower.includes('not household')) {
        score += 50;
        matchReasons.push('HTS is for household articles matching product context');
      } else if (descLower.includes('domestic') || 
                 descLower.includes('tableware') || 
                 descLower.includes('kitchenware')) {
        score += 40;
        matchReasons.push('HTS is for domestic/household use');
      }
      
      // Penalty for hotel/restaurant ware codes when product is household
      if (descLower.includes('hotel') || descLower.includes('restaurant')) {
        score -= 100;
        uncertainties.push('This code is for commercial hotel/restaurant use - product is household');
      }
      
      // Penalty for industrial/commercial descriptions
      if (descLower.includes('industrial') || descLower.includes('commercial') ||
          descLower.includes('exceeding 300') || descLower.includes('exceeding 100 liters') ||
          descLower.includes('machinery') || descLower.includes('agricultural')) {
        score -= 80;
        uncertainties.push('This code is for industrial/commercial use - product is household');
      }
    }
    
    // Industrial products should match industrial codes
    if (userContext === 'industrial') {
      if (descLower.includes('industrial') || descLower.includes('commercial') ||
          descLower.includes('machinery') || descLower.includes('equipment')) {
        score += 40;
        matchReasons.push('HTS is for industrial/commercial use matching product context');
      }
    }
    
    // Material match
    if (inference.htsAttributes.material) {
      const material = inference.htsAttributes.material.value.toLowerCase();
      if (descLower.includes(material)) {
        score += 25;
        matchReasons.push(`Matches material: ${inference.htsAttributes.material.value}`);
        if (inference.htsAttributes.material.source !== 'stated') {
          uncertainties.push(`Material (${material}) was ${inference.htsAttributes.material.source}, not stated`);
        }
      }
    }
    
    // Construction match (check if description mentions construction type)
    if (inference.htsAttributes.construction) {
      const construction = inference.htsAttributes.construction.value.toLowerCase();
      const isKnit = construction.includes('knit') || construction.includes('crochet');
      const isWoven = construction.includes('woven') || construction.includes('not knit');
      
      // Check if HTS description mentions construction type
      const descMentionsKnit = descLower.includes('knit') || descLower.includes('crochet');
      const descMentionsWoven = descLower.includes('woven') || descLower.includes('not knit');
      
      if ((isKnit && descMentionsKnit) || (isWoven && descMentionsWoven)) {
        score += 20;
        matchReasons.push(`Construction (${construction}) matches HTS description`);
      } else if ((isKnit && descMentionsWoven) || (isWoven && descMentionsKnit)) {
        score -= 30;
        uncertainties.push(`Construction mismatch: product is ${construction} but HTS is for ${descMentionsKnit ? 'knit' : 'woven'}`);
      }
      
      if (inference.htsAttributes.construction.source !== 'stated') {
        uncertainties.push(`Construction (${construction}) was ${inference.htsAttributes.construction.source}`);
      }
    }
    
    // Gender match
    if (inference.htsAttributes.gender) {
      const gender = inference.htsAttributes.gender.value.toLowerCase();
      if (descLower.includes(gender) || descLower.includes("men's") || descLower.includes("women's")) {
        score += 10;
        matchReasons.push(`Matches gender: ${inference.htsAttributes.gender.value}`);
      }
      
      // Penalty for age-mismatched codes (based on description, not hardcoded codes)
      const isBabyCode = descLower.includes('bab') || descLower.includes('infant') || descLower.includes('toddler');
      const isChildCode = descLower.includes('child') || descLower.includes('girl') || descLower.includes('boy');
      const isAdultGender = gender.includes('men') || gender.includes('women') || gender.includes('adult');
      
      if (isAdultGender && (isBabyCode || isChildCode)) {
        score -= 50;
        uncertainties.push(`This code appears to be for ${isBabyCode ? 'babies/infants' : 'children'}, not adults`);
      }
    }
    
    // Chapter match bonus - CRITICAL for getting the right product category
    // Extract chapter from code (first 2 digits)
    const candidateChapter = candidate.code.substring(0, 2);
    if (inference.suggestedChapters.includes(candidateChapter)) {
      score += 40;
      matchReasons.push(`In suggested chapter ${candidateChapter}`);
    } else {
      // Penalty for wrong chapter
      score -= 25;
      uncertainties.push(`Not in suggested chapter(s): ${inference.suggestedChapters.join(', ')}`);
    }
    
    // STRONGLY prefer more specific codes - this is critical for proper classification
    // The goal is always to return a 10-digit statistical suffix when possible
    switch (candidate.level) {
      case HtsLevel.statistical:
        score += 50;  // Strong preference for 10-digit codes
        matchReasons.push('Most specific code (statistical suffix)');
        break;
      case HtsLevel.tariff_line:
        score += 35;  // 8-digit is good
        matchReasons.push('Tariff line level (8-digit)');
        break;
      case HtsLevel.subheading:
        score += 15;  // 6-digit is acceptable
        break;
      case HtsLevel.heading:
        score -= 20;  // Penalize 4-digit - too general
        uncertainties.push('This is a heading-level code; more specific codes may exist');
        break;
      case HtsLevel.chapter:
        score -= 50;  // Strongly penalize 2-digit
        uncertainties.push('This is only a chapter - need more specific classification');
        break;
    }
    
    // STRONGLY deprioritize special preference/trade agreement codes (Chapters 98, 99)
    // These should NEVER be the primary classification - they're special program codes
    const isPreferenceCode = descLower.includes('subject to') || 
                             descLower.includes('provisions of') ||
                             descLower.includes('classifiable in') ||
                             candidate.code.startsWith('98') ||
                             candidate.code.startsWith('99');
    if (isPreferenceCode) {
      score -= 100;  // Heavy penalty - these should almost never be picked
      uncertainties.push('This is a special trade preference code, not a base tariff code');
    }
    
    // Boost score based on matchScore from HTS search (relevance)
    score += candidate.matchScore * 0.1;
    
    return {
      htsCode: candidate.code,
      htsCodeFormatted: candidate.codeFormatted,
      description: candidate.description,
      level: candidate.level,
      generalRate: candidate.generalRate,
      adValoremRate: null, // Not available in HtsSearchResult
      matchScore: score,
      matchReasons,
      uncertainties,
    };
  });
  
  // Sort by score descending
  scored.sort((a, b) => b.matchScore - a.matchScore);
  
  return scored;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIERARCHY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

async function buildHierarchy(htsCode: string): Promise<ClassificationV5Result['hierarchy']> {
  const hierarchy = await getHtsHierarchy(htsCode);
  
  const result: ClassificationV5Result['hierarchy'] = {
    chapter: null,
    heading: null,
    subheading: null,
    tariffLine: null,
    statistical: null,
  };
  
  for (const item of hierarchy) {
    switch (item.level) {
      case HtsLevel.chapter:
        result.chapter = { code: item.codeFormatted, description: item.description };
        break;
      case HtsLevel.heading:
        result.heading = { code: item.codeFormatted, description: item.description };
        break;
      case HtsLevel.subheading:
        result.subheading = { code: item.codeFormatted, description: item.description };
        break;
      case HtsLevel.tariff_line:
        result.tariffLine = { code: item.codeFormatted, description: item.description };
        break;
      case HtsLevel.statistical:
        result.statistical = { 
          code: item.codeFormatted, 
          description: item.description,
          parentGroupings: item.parentGroupings || [],
        };
        break;
    }
  }
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUTY RANGE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calculateDutyRange(candidates: ClassificationCandidate[]): DutyRange | null {
  // Filter to candidates with valid numeric rates
  const candidatesWithRates = candidates
    .filter(c => c.adValoremRate !== null && typeof c.adValoremRate === 'number' && !isNaN(c.adValoremRate))
    .slice(0, 10); // Top 10 candidates
  
  if (candidatesWithRates.length < 2) return null;
  
  const rates = candidatesWithRates.map(c => ({
    rate: c.adValoremRate!,
    code: c.htsCodeFormatted,
  }));
  
  rates.sort((a, b) => a.rate - b.rate);
  
  const min = rates[0];
  const max = rates[rates.length - 1];
  
  // Only show range if there's meaningful variance
  if (max.rate - min.rate < 1) return null;
  
  const formatRate = (rate: number) => rate === 0 ? 'Free' : `${rate.toFixed(1)}%`;
  
  return {
    min: min.rate,
    max: max.rate,
    minCode: min.code,
    maxCode: max.code,
    formatted: `${formatRate(min.rate)} - ${formatRate(max.rate)}`,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

function calculateConfidence(
  inference: InferenceResult,
  candidates: ClassificationCandidate[]
): { score: number; label: 'high' | 'medium' | 'low' } {
  let score = 0.5; // Base score
  
  // Product identification confidence
  score += inference.product.confidence * 0.2;
  
  // Attribute confidence
  const htsAttrs = Object.values(inference.htsAttributes).filter(Boolean) as ExtractedAttribute[];
  const statedCount = htsAttrs.filter(a => a.source === 'stated').length;
  const totalCount = htsAttrs.length || 1;
  score += (statedCount / totalCount) * 0.2;
  
  // Top candidate score gap
  if (candidates.length >= 2) {
    const gap = candidates[0].matchScore - candidates[1].matchScore;
    if (gap > 20) score += 0.1;
    if (gap > 40) score += 0.1;
  }
  
  // Penalty for high-impact questions
  if (hasHighImpactUncertainty(inference)) {
    score -= 0.15;
  }
  
  // Clamp to 0-1
  score = Math.max(0, Math.min(1, score));
  
  // Label
  let label: 'high' | 'medium' | 'low';
  if (score >= 0.8) label = 'high';
  else if (score >= 0.6) label = 'medium';
  else label = 'low';
  
  return { score, label };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION ENHANCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

async function enhanceQuestionsWithDutyImpact(
  questions: InferenceResult['potentialQuestions'],
  candidates: ClassificationCandidate[]
): Promise<ClassificationV5Result['optionalQuestions']> {
  return questions.map(q => {
    // Try to estimate duty impact (simplified)
    let potentialDutyChange: string | undefined;
    
    if (q.attributeKey === 'construction' && candidates.length > 0) {
      // Knit vs woven can significantly change rates
      potentialDutyChange = 'Knit vs woven may change chapter (61 vs 62) and rates';
    } else if (q.attributeKey === 'material') {
      potentialDutyChange = 'Material can significantly affect duty rates';
    }
    
    return {
      ...q,
      potentialDutyChange,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION DEDUPLICATION
// Detects semantically similar questions and keeps only the best one
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Groups of semantically equivalent attribute concepts
 * Questions about any of these within a group are considered duplicates
 */
const SEMANTIC_ATTRIBUTE_GROUPS: string[][] = [
  // Size-related attributes
  ['size', 'capacity', 'dimensions', 'volume', 'sizeCategory', 'typicalSize'],
  // Use/purpose-related attributes  
  ['use', 'intendedUse', 'purpose', 'application', 'primaryUse'],
  // Context-related attributes
  ['context', 'userContext', 'intendedUseContext', 'setting'],
];

/**
 * Deduplicate questions that ask about the same semantic concept
 * Keeps the question with higher impact, or the first one if equal
 */
function deduplicateQuestions(
  questions: ClassificationV5Result['optionalQuestions']
): ClassificationV5Result['optionalQuestions'] {
  const seen = new Map<string, ClassificationV5Result['optionalQuestions'][0]>();
  const impactOrder = { high: 3, medium: 2, low: 1 };
  
  for (const q of questions) {
    // Find which semantic group this attributeKey belongs to
    const semanticKey = getSemanticKey(q.attributeKey);
    
    const existing = seen.get(semanticKey);
    if (!existing) {
      seen.set(semanticKey, q);
    } else {
      // Keep the one with higher impact
      const existingScore = impactOrder[existing.impact] || 0;
      const newScore = impactOrder[q.impact] || 0;
      if (newScore > existingScore) {
        seen.set(semanticKey, q);
      }
      // If equal impact, keep the first one (already in seen)
    }
  }
  
  return Array.from(seen.values());
}

/**
 * Get the canonical semantic key for an attribute
 * Groups like 'size', 'capacity', 'dimensions' all map to the same key
 */
function getSemanticKey(attributeKey: string): string {
  const keyLower = attributeKey.toLowerCase();
  
  for (const group of SEMANTIC_ATTRIBUTE_GROUPS) {
    if (group.some(term => keyLower.includes(term.toLowerCase()))) {
      return group[0]; // Return canonical term for the group
    }
  }
  
  // No group found - use the attribute key itself
  return keyLower;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REFINEMENT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Re-classify with user-provided answers to questions
 */
export async function refineClassification(
  previousResult: ClassificationV5Result,
  answers: Record<string, string>
): Promise<ClassificationV5Result> {
  // Get the original input from the inference result
  const originalInput = previousResult.inferenceResult.originalInput;
  
  // Re-classify with answers applied
  return classifyProductV5({
    description: originalInput,
    userAnswers: answers,
  });
}

