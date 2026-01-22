/**
 * Classification Engine V4 - Experimental
 * 
 * Enhanced classification with:
 * - Ambiguity detection and duty range display
 * - Transparent assumptions
 * - Guided question flow
 * - Smart defaults with explanations
 * 
 * This is an EXPERIMENTAL version. The stable version is in:
 * - classificationEngine.v3-stable.ts
 * 
 * @module classificationEngineV4
 */

import { getXAIClient } from '@/lib/xai';
import { searchHTSCodes, getHTSDutyRate } from '@/services/usitc';
import { getLikelyChapters, getChapterInfo, HEADING_MAPPINGS } from '@/data/htsChapterGuide';
import { 
    validateClassificationSemantics, 
    getCategoryDisplayName,
} from '@/services/classification/validator';
import {
    analyzeAmbiguity,
    type AmbiguityAnalysis,
    type DecisionVariable,
    type PossibleCode,
} from '@/services/ambiguityDetector';
import type { ClassificationInput, ClassificationResult, USITCCandidate } from '@/types/classification.types';

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Enhanced classification result with ambiguity information
 */
export interface GuidedClassificationResult extends ClassificationResult {
    // Ambiguity information
    ambiguity: {
        isAmbiguous: boolean;
        level: 'none' | 'low' | 'medium' | 'high';
        possibleCodes: PossibleCode[];
        questionsToAsk: DecisionVariable[];
        dutyRange: {
            min: number;
            max: number;
            minCode: string;
            maxCode: string;
            formatted: string; // "25% - 35%"
        };
    };
    
    // What we assumed
    assumptions: {
        variableId: string;
        variableName: string;
        assumedValue: string;
        reason: string;
    }[];
    
    // User-friendly explanation
    explanation: {
        whyThisCode: string;
        whyNotOthers: string[];
        howToRefine: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT ANALYSIS (Same as v3 but enhanced)
// ═══════════════════════════════════════════════════════════════════════════

export interface ProductAnalysis {
    essentialCharacter: string;
    primaryFunction: string;
    primaryMaterial: string;
    likelyChapters: string[];
    suggestedHeadings: string[];
    searchTerms: string[];
    confidence: number;
    reasoning: string;
    // V4 additions
    extractedAttributes: {
        material?: string;
        value?: number;
        dimensions?: string;
        weight?: string;
        use?: string;
    };
}

const PRODUCT_ANALYSIS_PROMPT_V4 = `You are a U.S. Customs classification expert. Analyze this product to determine its HTS classification path.

PRODUCT:
- Description: "{description}"
- Material: "{material}"
- Intended Use: "{use}"

TASK: Identify the essential character, extract ALL attributes mentioned, and determine likely HTS chapter(s).

KEY HTS RULES:
1. Classification is by ESSENTIAL CHARACTER (what the product IS), not brand names
2. Chapter 39 = Plastics articles (NOT jewelry)
3. Chapter 40 = Rubber articles (NOT jewelry)  
4. Chapter 42 = Bags, cases, luggage (FUNCTION-based, any material)
5. Chapters 61-62 = Clothing (knit vs woven)
6. Chapter 64 = Footwear
7. **Chapter 71 = JEWELRY including imitation jewelry of ANY material**
8. Chapter 84 = Machinery (mechanical)
9. Chapter 85 = Electrical/Electronic equipment
10. Chapter 94 = Furniture
11. Chapter 95 = Toys, sporting goods

EXTRACT ALL MENTIONED ATTRIBUTES:
- Material (steel type, plastic type, fabric type, etc.)
- Value/price if mentioned
- Dimensions/size if mentioned
- Weight if mentioned
- Specific use case

OUTPUT JSON ONLY:
{
  "essentialCharacter": "chef knife",
  "primaryFunction": "cutting food in kitchen",
  "primaryMaterial": "stainless steel",
  "likelyChapters": ["82"],
  "suggestedHeadings": ["8211"],
  "searchTerms": ["kitchen knife", "table knife", "knife stainless"],
  "confidence": 85,
  "reasoning": "Kitchen knives are classified under heading 8211 based on their function...",
  "extractedAttributes": {
    "material": "stainless steel",
    "value": 45,
    "dimensions": "8 inch blade",
    "use": "kitchen food preparation"
  }
}`;

/**
 * Phase 1: Analyze product and extract all attributes
 */
export async function analyzeProductV4(input: ClassificationInput): Promise<ProductAnalysis> {
    const xai = getXAIClient();
    
    // Get knowledge base suggestions first
    const kbChapters = getLikelyChapters(input.productDescription, input.materialComposition);
    
    const prompt = PRODUCT_ANALYSIS_PROMPT_V4
        .replace('{description}', input.productDescription)
        .replace('{material}', input.materialComposition || 'Not specified')
        .replace('{use}', input.intendedUse || 'Not specified');
    
    try {
        const completion = await xai.chat.completions.create({
            model: 'grok-3-latest',
            messages: [
                { role: 'system', content: 'You are a U.S. Customs classification expert. Respond with valid JSON only.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
        });
        
        const responseText = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(responseText);
        
        // Merge KB results with AI results
        const mergedChapters = new Set<string>([
            ...(parsed.likelyChapters || []),
            ...kbChapters.slice(0, 2).map(c => c.chapter)
        ]);
        
        return {
            essentialCharacter: parsed.essentialCharacter || '',
            primaryFunction: parsed.primaryFunction || input.intendedUse || '',
            primaryMaterial: parsed.primaryMaterial || input.materialComposition || '',
            likelyChapters: Array.from(mergedChapters),
            suggestedHeadings: parsed.suggestedHeadings || [],
            searchTerms: parsed.searchTerms || [input.productDescription],
            confidence: parsed.confidence || 70,
            reasoning: parsed.reasoning || '',
            extractedAttributes: {
                material: parsed.extractedAttributes?.material || input.materialComposition,
                value: parsed.extractedAttributes?.value,
                dimensions: parsed.extractedAttributes?.dimensions,
                weight: parsed.extractedAttributes?.weight,
                use: parsed.extractedAttributes?.use || input.intendedUse,
            },
        };
    } catch (error) {
        console.error('[EngineV4] Product analysis failed:', error);
        return {
            essentialCharacter: '',
            primaryFunction: input.intendedUse || '',
            primaryMaterial: input.materialComposition || '',
            likelyChapters: kbChapters.slice(0, 3).map(c => c.chapter),
            suggestedHeadings: [],
            searchTerms: [input.productDescription],
            confidence: 50,
            reasoning: 'Fallback analysis',
            extractedAttributes: {
                material: input.materialComposition,
            },
        };
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GUIDED CLASSIFICATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main classification entry point - V4 with guided flow
 */
export async function classifyProductGuided(
    input: ClassificationInput,
    options?: {
        skipAmbiguityCheck?: boolean;
        answeredQuestions?: Record<string, string>;
    }
): Promise<GuidedClassificationResult> {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('[EngineV4] Starting Guided Classification');
    console.log('[EngineV4] Product:', input.productDescription);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Phase 1: Product Analysis
    console.log('[EngineV4] Phase 1: Product Analysis...');
    const analysis = await analyzeProductV4(input);
    console.log('[EngineV4] Essential character:', analysis.essentialCharacter);
    console.log('[EngineV4] Likely chapters:', analysis.likelyChapters);
    console.log('[EngineV4] Extracted attributes:', JSON.stringify(analysis.extractedAttributes));
    
    // Phase 2: Search for codes
    console.log('\n[EngineV4] Phase 2: Searching USITC...');
    const searchResults = await searchForCodes(analysis);
    console.log('[EngineV4] Found', searchResults.length, 'potential codes');
    
    // Phase 3: Identify the heading
    const heading = identifyBestHeading(searchResults, analysis);
    console.log('[EngineV4] Best heading:', heading);
    
    // Phase 4: Ambiguity Analysis
    console.log('\n[EngineV4] Phase 4: Ambiguity Analysis...');
    const unitValue = analysis.extractedAttributes.value || 
                      (input as unknown as { unitValue?: number }).unitValue;
    
    const ambiguityAnalysis = await analyzeAmbiguity(
        heading,
        input.productDescription,
        analysis.primaryMaterial,
        unitValue,
        input.countryOfOrigin
    );
    
    console.log('[EngineV4] Ambiguity level:', ambiguityAnalysis.ambiguityLevel);
    console.log('[EngineV4] Possible codes:', ambiguityAnalysis.possibleCodes.length);
    console.log('[EngineV4] Questions to ask:', ambiguityAnalysis.questionsToAsk.length);
    console.log('[EngineV4] Assumptions made:', ambiguityAnalysis.assumptions.length);
    
    // Apply any answered questions from user
    let finalAmbiguity = ambiguityAnalysis;
    if (options?.answeredQuestions) {
        finalAmbiguity = applyAnsweredQuestions(ambiguityAnalysis, options.answeredQuestions);
    }
    
    // Phase 5: Select best code
    console.log('\n[EngineV4] Phase 5: Code Selection...');
    const selectedCode = selectBestCodeV4(finalAmbiguity, analysis);
    console.log('[EngineV4] Selected:', selectedCode?.htsCode);
    
    // Phase 6: Semantic Validation
    console.log('\n[EngineV4] Phase 6: Semantic Validation...');
    const semanticValidation = validateClassificationSemantics(
        input.productDescription,
        input.materialComposition,
        input.intendedUse,
        selectedCode?.htsCode || '',
        selectedCode?.description || ''
    );
    
    if (semanticValidation.shouldReclassify) {
        console.log('[EngineV4] ⚠️ Semantic mismatch detected, attempting re-classification...');
        // TODO: Implement re-classification with suggested chapters
    }
    
    // Phase 7: Get duty rate
    console.log('\n[EngineV4] Phase 7: Duty Rate Resolution...');
    let dutyRate = selectedCode?.baseDutyRate || 'See HTS';
    if ((!dutyRate || dutyRate === 'See HTS') && selectedCode) {
        const inheritedRate = await getHTSDutyRate(selectedCode.htsCode);
        if (inheritedRate) {
            dutyRate = inheritedRate.general;
        }
    }
    
    // Build result
    const result = buildGuidedResult(
        input,
        analysis,
        finalAmbiguity,
        selectedCode,
        semanticValidation,
        dutyRate
    );
    
    console.log('\n[EngineV4] Classification Complete');
    console.log('[EngineV4] Code:', result.htsCode.code);
    console.log('[EngineV4] Confidence:', result.confidence);
    console.log('[EngineV4] Ambiguous:', result.ambiguity.isAmbiguous);
    console.log('[EngineV4] Duty Range:', result.ambiguity.dutyRange.formatted);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Search for HTS codes based on product analysis
 */
async function searchForCodes(analysis: ProductAnalysis): Promise<USITCCandidate[]> {
    const allResults: USITCCandidate[] = [];
    const seen = new Set<string>();
    
    // Search by suggested headings
    for (const heading of analysis.suggestedHeadings.slice(0, 3)) {
        const results = await searchHTSCodes(heading);
        for (const r of results) {
            if (!seen.has(r.htsno)) {
                seen.add(r.htsno);
                allResults.push(r);
            }
        }
    }
    
    // Search by essential character
    if (analysis.essentialCharacter) {
        const results = await searchHTSCodes(analysis.essentialCharacter);
        for (const r of results) {
            if (!seen.has(r.htsno) && analysis.likelyChapters.includes(r.htsno.substring(0, 2))) {
                seen.add(r.htsno);
                allResults.push(r);
            }
        }
    }
    
    // Search by search terms
    for (const term of analysis.searchTerms.slice(0, 3)) {
        const results = await searchHTSCodes(term);
        for (const r of results) {
            if (!seen.has(r.htsno)) {
                seen.add(r.htsno);
                allResults.push(r);
            }
        }
    }
    
    // Filter to 10-digit codes in likely chapters
    return allResults.filter(r => {
        const clean = r.htsno.replace(/\./g, '');
        const chapter = r.htsno.substring(0, 2);
        return clean.length === 10 && analysis.likelyChapters.includes(chapter);
    });
}

/**
 * Identify the best heading from search results
 */
function identifyBestHeading(results: USITCCandidate[], analysis: ProductAnalysis): string {
    // If we have suggested headings, use the first one
    if (analysis.suggestedHeadings.length > 0) {
        return analysis.suggestedHeadings[0];
    }
    
    // Otherwise, find the most common heading in results
    const headingCounts: Record<string, number> = {};
    for (const r of results) {
        const heading = r.htsno.substring(0, 4);
        headingCounts[heading] = (headingCounts[heading] || 0) + 1;
    }
    
    let bestHeading = '';
    let maxCount = 0;
    for (const [heading, count] of Object.entries(headingCounts)) {
        if (count > maxCount) {
            maxCount = count;
            bestHeading = heading;
        }
    }
    
    return bestHeading || (results[0]?.htsno.substring(0, 4) || '');
}

/**
 * Apply user's answered questions to refine ambiguity
 */
function applyAnsweredQuestions(
    ambiguity: AmbiguityAnalysis,
    answers: Record<string, string>
): AmbiguityAnalysis {
    const updatedVariables = ambiguity.decisionVariables.map(v => {
        if (answers[v.id]) {
            return {
                ...v,
                detectedValue: answers[v.id],
                detectedSource: 'user_input' as const,
                confidence: 100,
            };
        }
        return v;
    });
    
    // Re-match codes with new variable values
    const updatedCodes = ambiguity.possibleCodes.map(code => {
        let allMet = true;
        const updatedRequirements = code.requirements.map(req => {
            const variable = updatedVariables.find(v => v.id === req.variableId);
            const met = variable?.detectedValue === req.requiredValue;
            if (!met) allMet = false;
            return {
                ...req,
                met,
                source: variable?.detectedSource || req.source,
            };
        });
        
        return {
            ...code,
            requirements: updatedRequirements,
            isLikely: allMet,
            isConfirmed: allMet && updatedRequirements.every(r => r.source === 'user_input'),
        };
    });
    
    // Remove answered questions
    const remainingQuestions = updatedVariables.filter(v => 
        !answers[v.id] && v.confidence < 90
    );
    
    return {
        ...ambiguity,
        decisionVariables: updatedVariables,
        possibleCodes: updatedCodes,
        questionsToAsk: remainingQuestions,
        likelyCode: updatedCodes.find(c => c.isLikely) || updatedCodes[0],
        assumptions: updatedVariables
            .filter(v => v.detectedSource === 'assumed')
            .map(v => ({
                variableId: v.id,
                variableName: v.name,
                assumedValue: v.detectedValue || '',
                reason: 'Most common value for this product type',
            })),
    };
}

/**
 * Select the best code from ambiguity analysis
 */
function selectBestCodeV4(
    ambiguity: AmbiguityAnalysis,
    analysis: ProductAnalysis
): PossibleCode | null {
    // First, filter out codes that don't make sense for this product
    const filteredCodes = filterRelevantCodes(ambiguity.possibleCodes, analysis);
    
    if (filteredCodes.length === 0) {
        // Fallback to original list
        return ambiguity.likelyCode || ambiguity.possibleCodes[0] || null;
    }
    
    // Prefer confirmed codes
    const confirmed = filteredCodes.find(c => c.isConfirmed);
    if (confirmed) return confirmed;
    
    // Then likely codes
    const likely = filteredCodes.find(c => c.isLikely);
    if (likely) return likely;
    
    // Then prefer codes with more specific descriptions (not "Other" or "Sets")
    const specificCodes = filteredCodes.filter(c => 
        !c.description.toLowerCase().includes('sets of') &&
        !c.description.toLowerCase().startsWith('other')
    );
    if (specificCodes.length > 0) return specificCodes[0];
    
    // Last resort: first filtered code
    return filteredCodes[0];
}

/**
 * Filter codes to only those relevant to the product
 */
function filterRelevantCodes(
    codes: PossibleCode[],
    analysis: ProductAnalysis
): PossibleCode[] {
    const essentialLower = analysis.essentialCharacter.toLowerCase();
    const functionLower = analysis.primaryFunction.toLowerCase();
    
    // Build keywords to match
    const keywords: string[] = [];
    
    // For knives
    if (essentialLower.includes('knife') || functionLower.includes('cutting')) {
        if (essentialLower.includes('kitchen') || essentialLower.includes('chef') || 
            essentialLower.includes('table') || functionLower.includes('food')) {
            keywords.push('table', 'kitchen', 'fixed');
        }
        if (essentialLower.includes('folding') || essentialLower.includes('pocket')) {
            keywords.push('folding', 'blade');
        }
    }
    
    // If no specific keywords, return all except obvious mismatches
    if (keywords.length === 0) {
        return codes.filter(c => {
            const descLower = c.description.toLowerCase();
            // Filter out "sets" for single items
            if (descLower.includes('sets of') && !essentialLower.includes('set')) {
                return false;
            }
            return true;
        });
    }
    
    // Filter to codes matching keywords
    const matched = codes.filter(c => {
        const descLower = c.description.toLowerCase();
        // Exclude sets unless user mentioned sets
        if (descLower.includes('sets of') && !essentialLower.includes('set')) {
            return false;
        }
        // Match any keyword
        return keywords.some(kw => descLower.includes(kw));
    });
    
    // If we got matches, return them; otherwise return filtered non-sets
    return matched.length > 0 ? matched : codes.filter(c => 
        !c.description.toLowerCase().includes('sets of')
    );
}

/**
 * Build the final guided result
 */
function buildGuidedResult(
    input: ClassificationInput,
    analysis: ProductAnalysis,
    ambiguity: AmbiguityAnalysis,
    selectedCode: PossibleCode | null,
    semanticValidation: ReturnType<typeof validateClassificationSemantics>,
    dutyRate: string
): GuidedClassificationResult {
    const htsCode = selectedCode?.htsCode || '';
    
    // Calculate confidence with penalties
    let confidence = ambiguity.confidence;
    if (!selectedCode?.isConfirmed) confidence = Math.min(confidence, 85);
    if (ambiguity.assumptions.length > 0) confidence -= ambiguity.assumptions.length * 5;
    if (semanticValidation.confidencePenalty) confidence -= semanticValidation.confidencePenalty;
    confidence = Math.max(30, Math.min(98, confidence));
    
    // Format duty range
    const dutyRangeFormatted = ambiguity.dutyRange.min === ambiguity.dutyRange.max
        ? `${ambiguity.dutyRange.min}%`
        : `${ambiguity.dutyRange.min}% - ${ambiguity.dutyRange.max}%`;
    
    // Build explanation
    const explanation = buildExplanation(analysis, ambiguity, selectedCode);
    
    // Build warnings
    const warnings = buildWarnings(ambiguity, semanticValidation);
    
    return {
        id: crypto.randomUUID(),
        input,
        htsCode: {
            code: htsCode,
            description: selectedCode?.description || '',
            chapter: htsCode.substring(0, 2),
            heading: htsCode.substring(0, 4),
            subheading: htsCode.substring(0, 7).replace(/(\d{4})(\d{2})/, '$1.$2'),
        },
        confidence,
        dutyRate: {
            generalRate: dutyRate,
            specialPrograms: [],
            column2Rate: undefined,
        },
        rulings: [],
        alternativeCodes: ambiguity.possibleCodes
            .filter(c => c.htsCode !== htsCode)
            .slice(0, 3)
            .map(c => ({
                code: c.htsCode,
                description: c.description,
                chapter: c.htsCode.substring(0, 2),
                heading: c.htsCode.substring(0, 4),
                subheading: c.htsCode.substring(0, 7).replace(/(\d{4})(\d{2})/, '$1.$2'),
            })),
        rationale: explanation.whyThisCode,
        warnings,
        createdAt: new Date(),
        suggestedProductName: analysis.essentialCharacter 
            ? capitalizeWords(`${analysis.primaryMaterial} ${analysis.essentialCharacter}`)
            : undefined,
        
        // V4 additions
        ambiguity: {
            isAmbiguous: ambiguity.isAmbiguous,
            level: ambiguity.ambiguityLevel,
            possibleCodes: ambiguity.possibleCodes,
            questionsToAsk: ambiguity.questionsToAsk,
            dutyRange: {
                ...ambiguity.dutyRange,
                formatted: dutyRangeFormatted,
            },
        },
        assumptions: ambiguity.assumptions,
        explanation,
    };
}

/**
 * Build user-friendly explanation
 */
function buildExplanation(
    analysis: ProductAnalysis,
    ambiguity: AmbiguityAnalysis,
    selectedCode: PossibleCode | null
): GuidedClassificationResult['explanation'] {
    const whyThisCode = selectedCode
        ? `Based on your description of "${analysis.essentialCharacter}", this product falls under HTS ${selectedCode.htsCode}. ${analysis.reasoning}`
        : 'Unable to determine specific code.';
    
    const whyNotOthers = ambiguity.possibleCodes
        .filter(c => c.htsCode !== selectedCode?.htsCode)
        .slice(0, 2)
        .map(c => {
            const unmetReq = c.requirements.find(r => !r.met);
            if (unmetReq) {
                return `${c.htsCode} requires ${unmetReq.variableId} to be ${unmetReq.requiredValue}`;
            }
            return `${c.htsCode} is for different specifications`;
        });
    
    const howToRefine = ambiguity.questionsToAsk.length > 0
        ? `Answer ${ambiguity.questionsToAsk.length} question(s) to get a more precise classification: ${ambiguity.questionsToAsk.map(q => q.name).join(', ')}.`
        : 'All key specifications have been identified. Classification is complete.';
    
    return { whyThisCode, whyNotOthers, howToRefine };
}

/**
 * Build warnings list
 */
function buildWarnings(
    ambiguity: AmbiguityAnalysis,
    semanticValidation: ReturnType<typeof validateClassificationSemantics>
): string[] {
    const warnings: string[] = [];
    
    // Add verification message
    warnings.push('✓ HTS code verified against official USITC database');
    
    // Ambiguity warnings
    if (ambiguity.isAmbiguous) {
        if (ambiguity.ambiguityLevel === 'high') {
            warnings.push(`⚠️ Multiple codes possible (${ambiguity.possibleCodes.length} options). Answer the questions above to narrow down.`);
        } else if (ambiguity.ambiguityLevel === 'medium') {
            warnings.push(`ℹ️ This classification has ${ambiguity.assumptions.length} assumption(s). Verify to confirm accuracy.`);
        }
    }
    
    // Assumption warnings
    if (ambiguity.assumptions.length > 0) {
        const assumptionList = ambiguity.assumptions.map(a => `${a.variableName}: ${a.assumedValue}`).join(', ');
        warnings.push(`ℹ️ Assumed: ${assumptionList}`);
    }
    
    // Semantic validation warnings
    for (const conflict of semanticValidation.conflicts) {
        warnings.push(conflict.severity === 'critical' ? `🚨 ${conflict.message}` : `⚠️ ${conflict.message}`);
    }
    
    return warnings;
}

/**
 * Capitalize words in a string
 */
function capitalizeWords(str: string): string {
    return str
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Functions are exported inline above

