/**
 * HTS Classification Engine v2
 * 
 * A robust, multi-phase classification system that:
 * 1. Analyzes the product to understand its essential character
 * 2. Determines likely HTS chapters using knowledge base + AI
 * 3. Searches USITC hierarchically (chapter → heading → subheading)
 * 4. Uses AI with proper GRI context to select the best code
 * 5. Validates the selection makes sense
 */

import { getXAIClient } from '@/lib/xai';
import { searchHTSCodes, getHTSDutyRate } from '@/services/usitc';
import { getLikelyChapters, getChapterInfo, HEADING_MAPPINGS } from '@/data/htsChapterGuide';
import { 
    validateClassificationSemantics, 
    getCategoryDisplayName,
    type ValidationResult as SemanticValidationResult 
} from '@/services/classificationValidator';
import type { ClassificationInput, ClassificationResult, USITCCandidate, HTSCode, DutyRate } from '@/types/classification.types';

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: PRODUCT ANALYSIS
// Understand WHAT the product is before searching
// ═══════════════════════════════════════════════════════════════════════════

export interface ProductAnalysis {
    essentialCharacter: string;       // What IS this thing? (noun)
    primaryFunction: string;          // What does it DO?
    primaryMaterial: string;          // What is it made of?
    likelyChapters: string[];         // Which HTS chapters to search
    suggestedHeadings: string[];      // Specific 4-digit headings if known
    searchTerms: string[];            // Optimized terms for USITC search
    confidence: number;               // How confident in this analysis
    reasoning: string;                // Why these chapters/headings
}

const PRODUCT_ANALYSIS_PROMPT = `You are a U.S. Customs classification expert. Analyze this product to determine its HTS classification path.

PRODUCT:
- Description: "{description}"
- Material: "{material}"
- Intended Use: "{use}"

TASK: Identify the essential character and most likely HTS chapter(s).

KEY HTS RULES:
1. Classification is by ESSENTIAL CHARACTER (what the product IS), not brand names or marketing terms
2. Chapter 39 = Plastics articles (NOT jewelry or wearable accessories)
3. Chapter 40 = Rubber articles (NOT jewelry or wearable accessories)
4. Chapter 42 = Bags, cases, luggage (FUNCTION-based, any material)
5. Chapters 61-62 = Clothing (knit vs woven)
6. Chapter 64 = Footwear
7. **Chapter 71 = JEWELRY including imitation jewelry of ANY material (rubber, plastic, metal, etc.)**
8. Chapter 84 = Machinery (mechanical)
9. Chapter 85 = Electrical/Electronic equipment
10. Chapter 90 = Instruments, measuring devices
11. Chapter 94 = Furniture
12. Chapter 95 = Toys, sporting goods

CRITICAL - JEWELRY vs INDUSTRIAL PARTS:
- **"Ring" worn on finger/body as adornment** → Chapter 71 (Heading 7117 "Imitation jewelry")
- **"Ring" as O-ring, gasket, seal for machinery** → Chapter 40 (Heading 4016)
- If the word "ring" appears with "finger", "wear", "body", "fashion" → IT IS JEWELRY → Chapter 71
- Rubber/plastic finger rings, bracelets, necklaces = IMITATION JEWELRY = Chapter 71, NOT 39/40

COMMON TRAPS TO AVOID:
- Finger rings made of rubber/plastic → Chapter 71 (NOT 40 - not industrial rubber goods!)
- Ear plugs (foam/plastic) → Chapter 39 (NOT 42 - they're not "cases")
- Phone cases → Chapter 42 (they ARE cases/containers)
- Electronic headphones → Chapter 85 (audio equipment)
- Passive ear muffs → Chapter 39 or 65 depending on construction

OUTPUT JSON ONLY:
{
  "essentialCharacter": "finger ring",
  "primaryFunction": "personal adornment/fashion accessory",
  "primaryMaterial": "rubber",
  "likelyChapters": ["71"],
  "suggestedHeadings": ["7117"],
  "searchTerms": ["imitation jewelry", "finger ring", "fashion ring", "bijouterie"],
  "confidence": 90,
  "reasoning": "A ring worn on the finger as an accessory is JEWELRY, regardless of material. HTS 7117 covers 'imitation jewelry' of ANY material including rubber and plastic. Chapter 40 (rubber articles) is for industrial rubber goods like gaskets and seals, NOT personal accessories."
}`;

/**
 * Phase 1: Analyze the product to determine classification path
 */
export async function analyzeProduct(input: ClassificationInput): Promise<ProductAnalysis> {
    const xai = getXAIClient();
    
    // First, try our knowledge base
    const kbChapters = getLikelyChapters(
        input.productDescription,
        input.materialComposition
    );
    
    console.log('[Engine] Knowledge base chapters:', kbChapters);
    
    // Then, use AI to analyze
    const prompt = PRODUCT_ANALYSIS_PROMPT
        .replace('{description}', input.productDescription)
        .replace('{material}', input.materialComposition || 'Not specified')
        .replace('{use}', input.intendedUse || 'Not specified');
    
    try {
        const completion = await xai.chat.completions.create({
            model: 'grok-3-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a U.S. Customs classification expert. Respond with valid JSON only.'
                },
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
            essentialCharacter: parsed.essentialCharacter || extractNoun(input.productDescription),
            primaryFunction: parsed.primaryFunction || input.intendedUse || 'general use',
            primaryMaterial: parsed.primaryMaterial || input.materialComposition || 'unknown',
            likelyChapters: Array.from(mergedChapters),
            suggestedHeadings: parsed.suggestedHeadings || [],
            searchTerms: parsed.searchTerms || [input.productDescription],
            confidence: parsed.confidence || 70,
            reasoning: parsed.reasoning || 'AI analysis'
        };
    } catch (error) {
        console.error('[Engine] Product analysis failed:', error);
        
        // Fallback to knowledge base only
        return {
            essentialCharacter: extractNoun(input.productDescription),
            primaryFunction: input.intendedUse || 'general use',
            primaryMaterial: input.materialComposition || 'unknown',
            likelyChapters: kbChapters.slice(0, 3).map(c => c.chapter),
            suggestedHeadings: [],
            searchTerms: [input.productDescription],
            confidence: 50,
            reasoning: 'Fallback to knowledge base analysis'
        };
    }
}

/**
 * Extract the main noun from a description
 */
function extractNoun(description: string): string {
    const words = description.toLowerCase().split(/\s+/);
    // Simple heuristic: last noun before any preposition
    const prepIndex = words.findIndex(w => ['for', 'with', 'of', 'in', 'to'].includes(w));
    if (prepIndex > 0) {
        return words.slice(0, prepIndex).pop() || words[0];
    }
    return words[words.length - 1] || description;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: HIERARCHICAL SEARCH
// Search USITC in a structured way based on analysis
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchResults {
    candidates: USITCCandidate[];
    searchStrategy: string[];
    chaptersSearched: string[];
}

/**
 * Phase 2: Search USITC hierarchically based on product analysis
 */
export async function searchHierarchically(
    analysis: ProductAnalysis
): Promise<SearchResults> {
    const allCandidates: USITCCandidate[] = [];
    const searchStrategy: string[] = [];
    
    // Strategy 1: Search by suggested headings first (most specific)
    if (analysis.suggestedHeadings.length > 0) {
        for (const heading of analysis.suggestedHeadings.slice(0, 3)) {
            searchStrategy.push(`Heading search: ${heading}`);
            const results = await searchHTSCodes(heading);
            allCandidates.push(...results);
        }
    }
    
    // Strategy 2: Search by essential character + chapter
    for (const chapter of analysis.likelyChapters.slice(0, 3)) {
        const searchTerm = `${analysis.essentialCharacter} ${chapter}`;
        searchStrategy.push(`Chapter-guided search: "${analysis.essentialCharacter}" in Ch ${chapter}`);
        const results = await searchHTSCodes(analysis.essentialCharacter);
        
        // Filter to only codes in the target chapter
        const chapterFiltered = results.filter(r => r.htsno.startsWith(chapter));
        allCandidates.push(...chapterFiltered);
    }
    
    // Strategy 3: Search by each search term
    for (const term of analysis.searchTerms.slice(0, 4)) {
        searchStrategy.push(`Term search: "${term}"`);
        const results = await searchHTSCodes(term);
        allCandidates.push(...results);
    }
    
    // Strategy 4: Search by material if specific
    if (analysis.primaryMaterial && analysis.primaryMaterial !== 'unknown') {
        const materialTerms = analysis.primaryMaterial.split(/\s+/).slice(0, 2).join(' ');
        searchStrategy.push(`Material search: "${materialTerms}"`);
        const results = await searchHTSCodes(materialTerms);
        allCandidates.push(...results);
    }
    
    // Deduplicate by HTS code
    const seen = new Set<string>();
    const dedupedCandidates = allCandidates.filter(c => {
        if (seen.has(c.htsno)) return false;
        seen.add(c.htsno);
        return true;
    });
    
    // Filter to 10-digit codes only and prioritize target chapters
    const fullCodes = dedupedCandidates
        .filter(c => {
            const clean = c.htsno.replace(/\./g, '');
            return clean.length === 10;
        })
        .sort((a, b) => {
            // Prioritize codes in likely chapters
            const aInChapter = analysis.likelyChapters.includes(a.htsno.substring(0, 2)) ? 0 : 1;
            const bInChapter = analysis.likelyChapters.includes(b.htsno.substring(0, 2)) ? 0 : 1;
            if (aInChapter !== bInChapter) return aInChapter - bInChapter;
            
            // Then by description length (more specific = longer)
            return b.description.length - a.description.length;
        });
    
    console.log('[Engine] Total candidates found:', fullCodes.length);
    console.log('[Engine] Search strategy:', searchStrategy);
    console.log('[Engine] Top 5:', fullCodes.slice(0, 5).map(c => `${c.htsno}: ${c.description.slice(0, 50)}`));
    
    return {
        candidates: fullCodes,
        searchStrategy,
        chaptersSearched: analysis.likelyChapters
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: AI SELECTION WITH GRI CONTEXT
// AI selects the best code using proper customs methodology
// ═══════════════════════════════════════════════════════════════════════════

const GRI_SELECTION_PROMPT = `You are a senior U.S. Customs and Border Protection (CBP) classification specialist.

PRODUCT TO CLASSIFY:
- Essential Character: "{essentialCharacter}"
- Description: "{description}"
- Material: "{material}"
- Intended Use: "{use}"

PRODUCT ANALYSIS:
{analysisContext}

CANDIDATE HTS CODES (verified from USITC database):
{candidates}

GENERAL RULES OF INTERPRETATION (GRI):
1. GRI 1: Classification is determined by heading terms and Section/Chapter notes
2. GRI 2(a): Incomplete/unassembled articles may be classified as complete
3. GRI 2(b): Mixtures/composites - classify by component giving essential character
4. GRI 3(a): Most specific description prevails over general
5. GRI 3(b): Composite goods - essential character determines classification
6. GRI 3(c): If tied, last in numerical order
7. GRI 6: Apply GRI 1-5 at subheading level

YOUR TASK:
Select exactly ONE 10-digit HTS code from the candidates. Apply GRI in order.

CRITICAL RULES:
1. The product's ESSENTIAL CHARACTER (what it IS) determines chapter
2. Do NOT classify by what the product is USED WITH (e.g., "phone case" is a case, not a phone)
3. Chapter 42 is for CONTAINERS (bags, cases that carry things) regardless of material
4. Chapter 39 is for PLASTIC ARTICLES that are NOT containers/bags/jewelry
5. Chapter 40 is for RUBBER ARTICLES that are NOT jewelry or personal accessories
6. **Chapter 71 (7117) = IMITATION JEWELRY** - includes finger rings, bracelets, necklaces of ANY material
7. Electronic items with circuits → Chapter 85
8. If description says "Other" - only use if no specific code matches

CRITICAL - JEWELRY vs INDUSTRIAL/MOTOR VEHICLE PARTS:
- **NEVER** classify personal accessories (rings worn on fingers, bracelets, necklaces) as "motor vehicle" parts
- A "ring for finger" is JEWELRY (Chapter 71), NOT a motor vehicle gasket (Chapter 40)
- If product description mentions "finger", "worn", "wear", "body", "fashion", "accessory" → IT IS NOT A MOTOR VEHICLE PART
- HTS codes containing "motor vehicle", "automobile", "automotive" should ONLY be used for actual vehicle parts/components

OUTPUT STRICT JSON ONLY:
{
  "selectedCode": "XXXX.XX.XXXX",
  "selectedDescription": "Full description from candidate list",
  "confidence": 85,
  "griApplication": "GRI 1: [explanation]. GRI 3(a): [if needed]...",
  "rationale": "Detailed classification reasoning...",
  "rejectedCodes": [
    {"code": "XXXX.XX.XXXX", "reason": "Wrong chapter because..."},
    {"code": "XXXX.XX.XXXX", "reason": "Description explicitly excludes..."}
  ],
  "warnings": ["Any compliance notes..."]
}`;

/**
 * Phase 3: AI selects the best HTS code from candidates
 */
export async function selectBestCode(
    input: ClassificationInput,
    analysis: ProductAnalysis,
    searchResults: SearchResults
): Promise<{
    selectedCandidate: USITCCandidate;
    confidence: number;
    rationale: string;
    griApplication: string;
    warnings: string[];
}> {
    const xai = getXAIClient();
    
    // Take top 30 candidates, prioritizing target chapters
    const topCandidates = searchResults.candidates.slice(0, 30);
    
    if (topCandidates.length === 0) {
        throw new Error('No candidates found for classification');
    }
    
    // Build candidate text with hierarchy info
    let candidatesText = '';
    const grouped = groupByChapter(topCandidates);
    
    for (const [chapter, headings] of Object.entries(grouped)) {
        const chapterInfo = getChapterInfo(chapter);
        candidatesText += `\n## Chapter ${chapter}: ${chapterInfo?.title || 'Unknown'}\n`;
        
        for (const [heading, codes] of Object.entries(headings)) {
            candidatesText += `  Heading ${heading}:\n`;
            for (const code of codes) {
                candidatesText += `    ${code.htsno} | ${code.description} | Duty: ${code.general || 'N/A'}\n`;
            }
        }
    }
    
    // Build analysis context
    const analysisContext = `
- Essential Character: ${analysis.essentialCharacter}
- Primary Material: ${analysis.primaryMaterial}
- Primary Function: ${analysis.primaryFunction}
- Likely Chapters: ${analysis.likelyChapters.join(', ')}
- Analysis Reasoning: ${analysis.reasoning}
`.trim();
    
    const prompt = GRI_SELECTION_PROMPT
        .replace('{essentialCharacter}', analysis.essentialCharacter)
        .replace('{description}', input.productDescription)
        .replace('{material}', input.materialComposition || 'Not specified')
        .replace('{use}', input.intendedUse || 'Not specified')
        .replace('{analysisContext}', analysisContext)
        .replace('{candidates}', candidatesText);
    
    try {
        const completion = await xai.chat.completions.create({
            model: 'grok-3-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are a U.S. Customs classification expert. Select the most appropriate HTS code based on GRI rules. Respond with valid JSON only.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
        });
        
        const responseText = completion.choices[0]?.message?.content || '{}';
        console.log('[Engine] AI Selection Response:', responseText.substring(0, 300));
        
        // Clean the response (remove markdown if present)
        let cleanResponse = responseText;
        if (responseText.includes('```')) {
            cleanResponse = responseText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        }
        
        const parsed = JSON.parse(cleanResponse);
        const selectedCode = parsed.selectedCode;
        
        // Find the candidate
        let selectedCandidate = topCandidates.find(c =>
            c.htsno === selectedCode ||
            c.htsno.replace(/\./g, '') === selectedCode.replace(/\./g, '')
        );
        
        // If AI selected a code not in candidates, try rescue search
        if (!selectedCandidate && selectedCode) {
            console.log('[Engine] Code not in candidates, attempting rescue:', selectedCode);
            const rescueResults = await searchHTSCodes(selectedCode);
            selectedCandidate = rescueResults.find(c =>
                c.htsno.replace(/\./g, '') === selectedCode.replace(/\./g, '')
            );
            
            if (selectedCandidate) {
                console.log('[Engine] Rescue successful:', selectedCandidate.htsno);
            }
        }
        
        // Final fallback
        if (!selectedCandidate) {
            console.log('[Engine] Using fallback candidate');
            selectedCandidate = topCandidates[0];
            return {
                selectedCandidate,
                confidence: 50,
                rationale: 'Fallback selection - AI choice not found in candidates',
                griApplication: 'Unable to apply GRI - fallback mode',
                warnings: ['⚠️ Classification uncertain. Manual review recommended.']
            };
        }
        
        return {
            selectedCandidate,
            confidence: Math.min(parsed.confidence || 80, 95),
            rationale: parsed.rationale || 'Selected based on GRI analysis',
            griApplication: parsed.griApplication || 'GRI 1 applied',
            warnings: parsed.warnings || []
        };
        
    } catch (error) {
        console.error('[Engine] AI selection failed:', error);
        
        // Use best candidate from target chapter
        const targetChapter = analysis.likelyChapters[0];
        const fallback = topCandidates.find(c => c.htsno.startsWith(targetChapter)) || topCandidates[0];
        
        return {
            selectedCandidate: fallback,
            confidence: 40,
            rationale: 'Fallback - AI selection error',
            griApplication: 'Unable to apply GRI',
            warnings: ['⚠️ AI classification failed. Using best match from target chapter.']
        };
    }
}

/**
 * Group candidates by chapter and heading for display
 */
function groupByChapter(candidates: USITCCandidate[]): Record<string, Record<string, USITCCandidate[]>> {
    const grouped: Record<string, Record<string, USITCCandidate[]>> = {};
    
    for (const c of candidates) {
        const chapter = c.htsno.substring(0, 2);
        const heading = c.htsno.substring(0, 4);
        
        if (!grouped[chapter]) grouped[chapter] = {};
        if (!grouped[chapter][heading]) grouped[chapter][heading] = [];
        
        grouped[chapter][heading].push(c);
    }
    
    return grouped;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: VALIDATION
// Verify the selection makes sense
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Phase 4: Validate the classification result
 */
export function validateClassification(
    analysis: ProductAnalysis,
    selectedCandidate: USITCCandidate
): { isValid: boolean; warnings: string[]; suggestedChapter?: string } {
    const warnings: string[] = [];
    const selectedChapter = selectedCandidate.htsno.substring(0, 2);
    const descLower = selectedCandidate.description.toLowerCase();
    const essentialLower = analysis.essentialCharacter.toLowerCase();
    const inputDescLower = analysis.primaryFunction?.toLowerCase() || '';
    let suggestedChapter: string | undefined;
    
    // Check if selected chapter is in likely chapters
    if (!analysis.likelyChapters.includes(selectedChapter)) {
        warnings.push(`⚠️ Selected chapter ${selectedChapter} was not in expected chapters (${analysis.likelyChapters.join(', ')}). Verify classification.`);
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // CRITICAL: Detect "motor vehicle" misclassification for personal items
    // ═══════════════════════════════════════════════════════════════════
    const isMotorVehicleDescription = descLower.includes('motor vehicle') || 
                                       descLower.includes('automobile') ||
                                       descLower.includes('automotive');
    
    // Personal/body-worn items should NOT be classified as motor vehicle parts
    const isPersonalItem = essentialLower.includes('ring') ||
                           essentialLower.includes('bracelet') ||
                           essentialLower.includes('necklace') ||
                           essentialLower.includes('earring') ||
                           essentialLower.includes('jewelry') ||
                           essentialLower.includes('finger') ||
                           essentialLower.includes('worn') ||
                           inputDescLower.includes('finger') ||
                           inputDescLower.includes('wear') ||
                           inputDescLower.includes('body');
    
    if (isMotorVehicleDescription && isPersonalItem) {
        warnings.push('⚠️ MISCLASSIFICATION DETECTED: Product appears to be a personal/wearable item but was classified as "motor vehicle" article. Finger rings worn as accessories should be in Chapter 71 (imitation jewelry), NOT motor vehicle parts.');
        suggestedChapter = '71';
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // Jewelry/Ring classification checks
    // ═══════════════════════════════════════════════════════════════════
    // Finger rings should be in Chapter 71 (jewelry), not Chapter 40 (rubber articles)
    const isFingerRing = essentialLower.includes('finger ring') || 
                         essentialLower.includes('ring for finger') ||
                         (essentialLower.includes('ring') && 
                          (inputDescLower.includes('finger') || inputDescLower.includes('wear') || inputDescLower.includes('worn')));
    
    if (isFingerRing && selectedChapter === '40') {
        warnings.push('⚠️ Finger rings worn as accessories are typically classified under Chapter 71 (imitation jewelry, HTS 7117.90), not Chapter 40 (rubber articles). Chapter 40.16 "Other articles of rubber" is for mechanical/industrial rubber goods.');
        suggestedChapter = '71';
    }
    
    if (isFingerRing && selectedChapter === '39') {
        warnings.push('⚠️ Finger rings worn as accessories are typically classified under Chapter 71 (imitation jewelry, HTS 7117.90), not Chapter 39 (plastic articles).');
        suggestedChapter = '71';
    }
    
    // ═══════════════════════════════════════════════════════════════════
    // Existing validation checks
    // ═══════════════════════════════════════════════════════════════════
    
    // Ear plugs should NOT be in Chapter 42
    if (essentialLower.includes('ear plug') || essentialLower.includes('earplug')) {
        if (selectedChapter === '42') {
            warnings.push('⚠️ Ear plugs are typically NOT classified under Chapter 42 (cases/containers). Consider Chapter 39 (plastics) or 40 (rubber).');
        }
    }
    
    // Phone cases SHOULD be in Chapter 42
    if (essentialLower.includes('phone case') || essentialLower.includes('smartphone case')) {
        if (selectedChapter !== '42') {
            warnings.push('⚠️ Phone cases are typically classified under Chapter 42 (cases/containers), not Chapter ' + selectedChapter);
        }
    }
    
    // Electronic items should be in Chapter 85
    if (essentialLower.includes('electronic') || essentialLower.includes('headphone') || 
        essentialLower.includes('earphone') || essentialLower.includes('bluetooth')) {
        if (selectedChapter !== '85' && selectedChapter !== '84') {
            warnings.push('⚠️ Electronic items are typically in Chapter 85. Verify if this product has electronic components.');
        }
    }
    
    const isValid = warnings.length === 0;
    
    return { isValid, warnings, suggestedChapter };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CLASSIFICATION FUNCTION
// Orchestrates all phases
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main classification entry point
 * Runs all phases and returns a complete classification result
 */
export async function classifyProduct(input: ClassificationInput): Promise<ClassificationResult> {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('[Engine] Starting Classification v3 (with Semantic Validation)');
    console.log('[Engine] Product:', input.productDescription);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Phase 1: Analyze the product
    console.log('[Engine] Phase 1: Product Analysis...');
    const analysis = await analyzeProduct(input);
    console.log('[Engine] Analysis:', JSON.stringify(analysis, null, 2));
    
    // Phase 2: Hierarchical search
    console.log('\n[Engine] Phase 2: Hierarchical Search...');
    let searchResults = await searchHierarchically(analysis);
    console.log('[Engine] Found', searchResults.candidates.length, 'candidates');
    
    if (searchResults.candidates.length === 0) {
        // Fallback: broader search
        console.log('[Engine] No candidates, trying broader search...');
        const broadResults = await searchHTSCodes(input.productDescription);
        searchResults.candidates = broadResults.filter(c => c.htsno.replace(/\./g, '').length === 10);
    }
    
    // Phase 3: AI Selection
    console.log('\n[Engine] Phase 3: AI Selection...');
    let selection = await selectBestCode(input, analysis, searchResults);
    console.log('[Engine] Selected:', selection.selectedCandidate.htsno);
    
    // Phase 4: SEMANTIC VALIDATION (NEW - catches misclassifications)
    console.log('\n[Engine] Phase 4: Semantic Validation...');
    const semanticValidation = validateClassificationSemantics(
        input.productDescription,
        input.materialComposition,
        input.intendedUse,
        selection.selectedCandidate.htsno,
        selection.selectedCandidate.description
    );
    
    console.log('[Engine] Product Category:', getCategoryDisplayName(semanticValidation.productCategory));
    console.log('[Engine] HTS Category:', getCategoryDisplayName(semanticValidation.htsCategory));
    console.log('[Engine] Semantic Valid:', semanticValidation.isValid);
    
    // Phase 4b: RE-CLASSIFICATION if critical semantic mismatch detected
    if (semanticValidation.shouldReclassify && semanticValidation.suggestedChapters.length > 0) {
        console.log('\n[Engine] ⚠️ CRITICAL MISMATCH DETECTED - Attempting re-classification...');
        console.log('[Engine] Conflicts:', semanticValidation.conflicts.map(c => c.message).join('; '));
        console.log('[Engine] Suggested chapters:', semanticValidation.suggestedChapters.join(', '));
        
        // Update analysis with suggested chapters
        const correctedAnalysis = {
            ...analysis,
            likelyChapters: [...new Set([...semanticValidation.suggestedChapters, ...analysis.likelyChapters])],
        };
        
        // Re-search with corrected chapters
        const correctedSearchResults = await searchHierarchically(correctedAnalysis);
        
        if (correctedSearchResults.candidates.length > 0) {
            // Re-select with corrected candidates, filtering to suggested chapters
            const filteredCandidates = correctedSearchResults.candidates.filter(c => 
                semanticValidation.suggestedChapters.includes(c.htsno.substring(0, 2))
            );
            
            if (filteredCandidates.length > 0) {
                correctedSearchResults.candidates = filteredCandidates;
                const correctedSelection = await selectBestCode(input, correctedAnalysis, correctedSearchResults);
                
                // Re-validate the corrected selection
                const reValidation = validateClassificationSemantics(
                    input.productDescription,
                    input.materialComposition,
                    input.intendedUse,
                    correctedSelection.selectedCandidate.htsno,
                    correctedSelection.selectedCandidate.description
                );
                
                // Use corrected selection if it's better
                if (reValidation.isValid || reValidation.confidencePenalty < semanticValidation.confidencePenalty) {
                    console.log('[Engine] ✓ Re-classification successful:', correctedSelection.selectedCandidate.htsno);
                    selection = correctedSelection;
                    searchResults = correctedSearchResults;
                } else {
                    console.log('[Engine] Re-classification did not improve result, keeping original');
                }
            }
        }
    }
    
    // Phase 5: Rule-based Validation (existing checks)
    console.log('\n[Engine] Phase 5: Rule-based Validation...');
    const validation = validateClassification(analysis, selection.selectedCandidate);
    
    // Phase 6: Get the correct duty rate (with inheritance if needed)
    console.log('\n[Engine] Phase 6: Duty Rate Resolution...');
    let generalRate = selection.selectedCandidate.general;
    
    // If no direct rate, look up inherited rate from parent code
    if (!generalRate || generalRate.trim() === '') {
        console.log('[Engine] No direct rate for', selection.selectedCandidate.htsno, '- looking up inherited rate');
        const inheritedRate = await getHTSDutyRate(selection.selectedCandidate.htsno);
        if (inheritedRate) {
            generalRate = inheritedRate.general;
            console.log('[Engine] Inherited rate:', generalRate, 
                inheritedRate.inheritedFrom ? `from ${inheritedRate.inheritedFrom}` : '');
        }
    } else {
        console.log('[Engine] Direct rate:', generalRate);
    }
    
    // Build final result with semantic validation results
    const allWarnings = [
        '✓ HTS code verified against official USITC database',
        ...selection.warnings,
        ...validation.warnings,
        // Add semantic validation warnings
        ...semanticValidation.conflicts.map(c => 
            c.severity === 'critical' ? `🚨 ${c.message}` : `⚠️ ${c.message}`
        ),
    ];
    
    // Apply confidence penalty from semantic validation
    const semanticPenalty = semanticValidation.confidencePenalty;
    
    // Generate suggested product name from AI analysis if user didn't provide one
    const suggestedProductName = generateProductName(analysis, input);
    
    const result: ClassificationResult = {
        id: crypto.randomUUID(),
        input,
        htsCode: {
            code: selection.selectedCandidate.htsno,
            description: selection.selectedCandidate.description,
            chapter: selection.selectedCandidate.htsno.substring(0, 2),
            heading: selection.selectedCandidate.htsno.substring(0, 4),
            subheading: selection.selectedCandidate.htsno.substring(0, 7),
        },
        confidence: Math.max(
            selection.confidence - (validation.isValid ? 0 : 20) - semanticPenalty,
            30 // Minimum confidence floor
        ),
        dutyRate: {
            generalRate: normalizeDutyRate(generalRate),
            specialPrograms: parseSpecialPrograms(selection.selectedCandidate.special),
            column2Rate: selection.selectedCandidate.other,
        },
        rulings: [],
        alternativeCodes: [],
        rationale: `${selection.griApplication}\n\n${selection.rationale}`,
        warnings: allWarnings,
        createdAt: new Date(),
        suggestedProductName,
    };
    
    console.log('\n[Engine] Classification Complete:', result.htsCode.code);
    console.log('[Engine] Final Confidence:', result.confidence, 
        semanticPenalty > 0 ? `(semantic penalty: -${semanticPenalty})` : '(no semantic issues)');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    return result;
}

/**
 * Generate a product name from the AI analysis
 * Used when user doesn't provide a product name
 * 
 * Example: { essentialCharacter: "water bottle", primaryMaterial: "stainless steel" }
 * Returns: "Stainless Steel Water Bottle"
 */
function generateProductName(
    analysis: { essentialCharacter: string; primaryMaterial: string; primaryFunction?: string },
    input: ClassificationInput
): string {
    // If user provided a name, use it
    if (input.productName && input.productName.trim()) {
        return input.productName.trim();
    }
    
    // Capitalize first letter of each word
    const capitalize = (str: string) => 
        str.split(' ')
           .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
           .join(' ');
    
    const material = analysis.primaryMaterial?.trim();
    const character = analysis.essentialCharacter?.trim();
    
    // Build the name from material + essential character
    if (material && character) {
        // Avoid redundancy (e.g., "Steel Steel Bottle")
        const materialWords = material.toLowerCase().split(' ');
        const characterWords = character.toLowerCase().split(' ');
        
        // Check if material is already in the character description
        const materialAlreadyIncluded = materialWords.some(word => 
            characterWords.includes(word) && word.length > 3
        );
        
        if (materialAlreadyIncluded) {
            return capitalize(character);
        }
        
        return capitalize(`${material} ${character}`);
    }
    
    // Fallback to just the essential character
    if (character) {
        return capitalize(character);
    }
    
    // Last resort: extract from HTS description or product description
    const desc = input.productDescription;
    if (desc) {
        // Take first meaningful phrase (up to 50 chars, ending at word boundary)
        const shortDesc = desc.substring(0, 50).split(/[,.\n]/)[0].trim();
        if (shortDesc.length > 5) {
            return capitalize(shortDesc);
        }
    }
    
    return 'Classified Product';
}

/**
 * Normalize duty rate from USITC API response
 * We NEVER tell users to go elsewhere - we are the source of truth
 */
function normalizeDutyRate(rawRate: string | null | undefined): string {
    // If no rate provided, likely means duty-free
    if (!rawRate || rawRate.trim() === '') {
        return 'Free';
    }
    
    const rate = rawRate.trim();
    
    // Already looks like a proper rate
    if (rate.toLowerCase() === 'free') return 'Free';
    if (/%/.test(rate)) return rate;
    if (/¢/.test(rate)) return rate; // Specific duty like "2.5¢/kg"
    
    // Normalize percentage formats
    const percentMatch = rate.match(/^(\d+(?:\.\d+)?)\s*%?$/);
    if (percentMatch) {
        return `${percentMatch[1]}%`;
    }
    
    // Return whatever we have - it's better than nothing
    return rate || 'Free';
}

/**
 * Parse special programs from USITC format
 */
function parseSpecialPrograms(special: string): { program: string; rate: string }[] {
    if (!special || special === 'No change') return [];
    
    const programs: { program: string; rate: string }[] = [];
    const programMap: Record<string, string> = {
        'A': 'GSP', 'A+': 'GSP', 'AU': 'Australia FTA', 'BH': 'Bahrain FTA',
        'CA': 'USMCA (Canada)', 'MX': 'USMCA (Mexico)', 'CL': 'Chile FTA',
        'CO': 'Colombia TPA', 'IL': 'Israel FTA', 'JO': 'Jordan FTA',
        'KR': 'Korea FTA', 'MA': 'Morocco FTA', 'OM': 'Oman FTA',
        'PA': 'Panama TPA', 'PE': 'Peru TPA', 'SG': 'Singapore FTA',
    };
    
    const match = special.match(/(Free|\d+(?:\.\d+)?%?)\s*\(([^)]+)\)/);
    if (match) {
        const rate = match[1];
        match[2].split(',').forEach(code => {
            const trimmed = code.trim();
            programs.push({ program: programMap[trimmed] || trimmed, rate });
        });
    }
    
    return programs.slice(0, 5);
}


