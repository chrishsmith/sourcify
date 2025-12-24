/**
 * Classification Flow V2 Service
 * 
 * A cleaner classification flow with three phases:
 * 1. UNDERSTAND - Identify category, show rate range, list variables
 * 2. ALL - Return all possible codes grouped by category with country tariffs separate
 * 3. ANSWER - Process user answers and return specific result
 * 
 * Key design principles:
 * - We provide information, user decides
 * - Questions come BEFORE results (optional)
 * - Country tariffs shown once (not repeated per code)
 * - Lowest rate codes highlighted naturally
 * 
 * @see docs/DESIGN_CLASSIFICATION_FLOW_V2.md
 */

import { getXAIClient } from '@/lib/xai';
import { searchHTSCodes, getHTSDutyRate } from '@/services/usitc';
import { getLikelyChapters } from '@/data/htsChapterGuide';
import { getEffectiveTariff } from '@/services/tariffRegistry';
import { analyzeAmbiguity, type AmbiguityAnalysis, type DecisionVariable } from '@/services/ambiguityDetector';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ClassificationInputV2 {
    productDescription: string;
    materialComposition?: string;
    countryOfOrigin: string;
    intendedUse?: string;
    unitValue?: number;
}

export type ClassificationPhase = 'understand' | 'all' | 'all-tree' | 'answer';

/**
 * Category identification result
 */
export interface CategoryIdentification {
    name: string;                    // "T-shirt", "Kitchen Knife", etc.
    description: string;             // "Knit or woven upper body garment"
    chapters: string[];              // ["61", "62"]
    headings: string[];              // ["6109", "6205", "6206"]
    confidence: number;              // 85
    essentialCharacter: string;      // What the AI determined the product IS
    extractedAttributes: {           // What we parsed from input
        material?: string;
        value?: number;
        dimensions?: string;
        use?: string;
        demographic?: string;
    };
}

/**
 * Variable that affects classification/rate
 */
export interface ClassificationVariable {
    id: string;                      // "construction", "fiber", "demographic"
    name: string;                    // "Construction Type"
    question: string;                // "Is this knit or woven?"
    impact: 'high' | 'medium' | 'low';  // How much this affects the rate
    rateSwing: number;               // Max rate difference (e.g., 15%)
    options: VariableOption[];
    detectedValue?: string;          // If we parsed it from input
    detectedSource?: 'user_input' | 'assumed';
}

export interface VariableOption {
    value: string;                   // "knit"
    label: string;                   // "Knit (jersey, interlock)"
    hint?: string;                   // "Most t-shirts are knit"
    leadsToCodes: string[];          // Codes this option leads to
}

/**
 * Phase 1: UNDERSTAND response
 */
export interface UnderstandResponse {
    phase: 'understand';
    category: CategoryIdentification;
    rateRange: {
        min: number;
        max: number;
        minCode: string;
        maxCode: string;
    };
    countryAdditions: CountryTariffSummary;
    variables: ClassificationVariable[];
    possibleCodeCount: number;
}

/**
 * A single HTS code with its criteria
 */
export interface HtsCodeOption {
    htsCode: string;                 // "6109.10.00"
    description: string;             // "T-shirts, knit, cotton ≥50%"
    criteria: string;                // "Cotton fiber content 50% or more"
    baseRate: number;                // 16.5
    baseRateFormatted: string;       // "16.5%"
    isLowest: boolean;               // Highlight lowest options
}

/**
 * Group of codes (e.g., KNIT vs WOVEN)
 * @deprecated Use HtsTreeNode for hierarchical display
 */
export interface CodeGroup {
    groupName: string;               // "Knit (Chapter 61)"
    groupNote?: string;              // "Most t-shirts are knit"
    chapter: string;                 // "61"
    codes: HtsCodeOption[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIERARCHICAL TREE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * A node in the HTS code tree (can be a category or a leaf code)
 */
export interface HtsTreeNode {
    id: string;                      // Unique ID (htsCode or generated)
    htsCode?: string;                // HTS code if this is a selectable code
    label: string;                   // Display label ("Cotton", "T-shirts, all white", "Men's")
    description?: string;            // Full description from USITC
    indent: number;                  // Original indent level from USITC
    baseRate?: number;               // Duty rate (may be inherited from parent)
    baseRateFormatted?: string;      // "16.5%" or "Free"
    inheritedRate?: boolean;         // True if rate comes from parent
    isSelectable: boolean;           // Can user select this code? (10-digit codes only)
    isOther: boolean;                // Is this an "Other" catch-all code?
    relevanceScore: number;          // 0-100 based on user input match
    isTopMatch: boolean;             // One of the best matches
    children: HtsTreeNode[];         // Child nodes
    collapsed?: boolean;             // UI state: is this section collapsed?
}

/**
 * Material group in the tree (top level) - DEPRECATED, use HtsHeadingGroup
 */
export interface HtsMaterialGroup {
    material: string;                // "Cotton", "Man-made fibers", "Wool"
    baseHeading: string;             // "6109.10.00", "6109.90.10"
    baseRate: number;                // Rate that applies to all children
    baseRateFormatted: string;       // "16.5%"
    isRelevant: boolean;             // Does this match user's product?
    relevanceReason?: string;        // "Matches your product", "Material match only", etc.
    defaultCollapsed: boolean;       // Should start collapsed?
    children: HtsTreeNode[];         // The tree of codes under this material
    codeCount: number;               // Total selectable codes
}

/**
 * NEW: Proper HTS hierarchy starting from 4-digit heading
 * 
 * Structure: Heading (4-digit) → Subheading (6-digit) → Codes (8/10-digit)
 * Example:
 *   6109 - T-shirts, singlets, tank tops
 *     └── 6109.10 - Of cotton
 *          └── 6109.10.00.04 - T-shirts, all white...
 */
export interface HtsHeadingGroup {
    heading: string;                 // "6109" (4 digits)
    headingDescription: string;      // "T-shirts, singlets, tank tops and similar garments"
    isRelevant: boolean;             // Does this match the product type?
    relevanceReason?: string;        // "Matches your product" or "Different product type"
    defaultExpanded: boolean;        // Should show expanded by default?
    subheadings: HtsSubheading[];    // 6-digit subheadings
    totalCodes: number;              // Total selectable codes across all subheadings
}

export interface HtsSubheading {
    code: string;                    // "6109.10" (6 digits)
    description: string;             // "Of cotton"
    fullDescription: string;         // "T-shirts, singlets... › Of cotton" 
    baseRate: number;
    baseRateFormatted: string;
    isRelevant: boolean;             // Does this match material?
    relevanceReason?: string;
    codeCount: number;               // Selectable codes under this
    codes: HtsSelectableCode[];      // 8/10-digit codes (collapsed by default)
}

export interface HtsSelectableCode {
    htsCode: string;                 // Full 10-digit code "6109.10.00.04"
    description: string;             // "T-shirts, all white, short hemmed sleeves..."
    rate: string;                    // "16.5%"
    isTopMatch: boolean;             // Highlight as best match
}

/**
 * NEW: Clean tree structure matching user's visual mockup
 * 
 * Structure: Material → ProductType → Code
 * Example:
 *   ▼ Cotton (6109.10) — 16.5%
 *      ├── T-shirts
 *      │    ├── ★ All white, short sleeves (6109.10.00.04)
 *      │    └── Other (6109.10.00.27)
 *      ├── Thermal undershirts
 *      │    ├── Men's (6109.10.00.12)
 *      │    └── Boys' (6109.10.00.14)
 *      └── Underwear
 *           └── Other (6109.10.00.70)
 */
export interface CleanMaterialGroup {
    material: string;                 // "Cotton", "Man-made fibers", "Wool", "Silk"
    materialCode: string;             // "6109.10", "6109.90"
    rate: string;                     // "16.5%"
    rateNumber: number;               // 16.5
    isMatch: boolean;                 // Does this match user's material?
    isExpanded: boolean;              // Default expanded state
    productCategories: ProductCategory[];
    codeCount: number;
}

export interface ProductCategory {
    name: string;                     // "T-shirts", "Thermal undershirts", "Underwear"
    codes: CleanCode[];
}

export interface CleanCode {
    htsCode: string;                  // "6109.10.00.04"
    label: string;                    // "All white, short sleeves" or "Men's"
    rate: string;
    isTopMatch: boolean;
}

/**
 * Enhanced ALL response with clean tree structure
 */
export interface AllCodesTreeResponse {
    phase: 'all';
    category: CategoryIdentification;
    materialGroups: HtsMaterialGroup[];      // DEPRECATED
    headingGroups: HtsHeadingGroup[];        // DEPRECATED
    cleanTree: CleanMaterialGroup[];         // NEW: Clean tree matching mockup
    countryAdditions: CountryTariffSummary;
    topMatches: HtsSelectableCode[];
    tip?: string;
}

/**
 * Country tariff summary (shown once, not per code)
 */
export interface CountryTariffSummary {
    countryCode: string;
    countryName: string;
    total: number;                   // Total additional duties
    breakdown: Array<{
        name: string;                // "Section 301"
        rate: number;                // 7.5
        legalReference?: string;     // "Trade Act of 1974"
    }>;
    example?: {
        code: string;
        baseRate: number;
        totalRate: number;
    };
}

/**
 * Phase 2: ALL response
 */
export interface AllCodesResponse {
    phase: 'all';
    category: CategoryIdentification;
    codeGroups: CodeGroup[];
    countryAdditions: CountryTariffSummary;
    tip?: string;                    // "Looking for lower rates? Try Mexico."
}

/**
 * Matched criteria from user answers
 */
export interface MatchedCriterion {
    variable: string;                // "construction"
    value: string;                   // "knit"
    source: 'user_answer' | 'parsed' | 'assumed';
}

/**
 * Phase 3: ANSWER response (specific result)
 */
export interface AnswerResponse {
    phase: 'result';
    htsCode: {
        code: string;
        description: string;
        chapter: string;
        heading: string;
    };
    confidence: number;
    matchedCriteria: MatchedCriterion[];
    dutyBreakdown: {
        baseRate: number;
        baseRateFormatted: string;
        additions: CountryTariffSummary['breakdown'];
        totalRate: number;
        perUnitExample?: {
            value: number;
            duty: number;
        };
    };
    alternatives: HtsCodeOption[];
    hierarchy?: HtsHierarchyLevel[];
}

export interface HtsHierarchyLevel {
    code: string;
    description: string;
    level: 'chapter' | 'heading' | 'subheading' | 'tariff' | 'statistical' | 'full';
    dutyRate?: string;
}

export type ClassificationResponseV2 = UnderstandResponse | AllCodesResponse | AllCodesTreeResponse | AnswerResponse;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Main classification function - handles all three phases
 */
export async function classifyV2(
    input: ClassificationInputV2,
    phase: ClassificationPhase,
    answeredQuestions?: Record<string, string>
): Promise<ClassificationResponseV2> {
    console.log(`\n[FlowV2] Starting phase: ${phase}`);
    console.log(`[FlowV2] Product: ${input.productDescription.substring(0, 50)}...`);
    
    // Phase 1: UNDERSTAND - Always runs first to identify category
    const category = await identifyCategory(input);
    console.log(`[FlowV2] Category identified: ${category.name}`);
    
    // Search for all possible codes
    const searchResults = await searchForAllCodes(category, input);
    console.log(`[FlowV2] Found ${searchResults.length} potential codes`);
    
    // Get the primary heading for ambiguity analysis
    const primaryHeading = category.headings[0] || searchResults[0]?.htsno.substring(0, 4) || '';
    
    // Run ambiguity analysis
    const ambiguity = await analyzeAmbiguity(
        primaryHeading,
        input.productDescription,
        input.materialComposition,
        input.unitValue,
        input.countryOfOrigin
    );
    
    // Get country tariff summary
    const countryAdditions = await getCountryTariffSummary(input.countryOfOrigin);
    
    // Route to appropriate phase handler
    switch (phase) {
        case 'understand':
            return buildUnderstandResponse(category, ambiguity, countryAdditions, searchResults);
            
        case 'all':
            return buildAllCodesResponse(category, ambiguity, countryAdditions, searchResults, input);
        
        case 'all-tree':
            return buildAllCodesTreeResponse(category, ambiguity, countryAdditions, searchResults, input);
            
        case 'answer':
            return buildAnswerResponse(category, ambiguity, countryAdditions, answeredQuestions || {}, input);
            
        default:
            throw new Error(`Unknown phase: ${phase}`);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1: UNDERSTAND
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_IDENTIFICATION_PROMPT = `You are a U.S. Customs classification expert. Your job is to identify what product category this is.

PRODUCT DESCRIPTION:
"{description}"

MATERIAL: {material}
INTENDED USE: {use}

TASK: Identify the product category and extract all attributes mentioned.

IMPORTANT RULES:
1. Identify the ESSENTIAL CHARACTER - what the product fundamentally IS
2. Determine the likely HTS chapter(s) - there may be multiple if ambiguous
3. Extract ANY attributes mentioned (material, size, value, demographic, etc.)

COMMON CATEGORIES:
- Apparel/Clothing → Chapters 61 (knit) or 62 (woven)
- Footwear → Chapter 64
- Jewelry (including imitation) → Chapter 71
- Cutlery/Knives → Chapter 82
- Electrical equipment → Chapter 85
- Furniture → Chapter 94
- Toys → Chapter 95
- Plastic articles → Chapter 39
- Rubber articles → Chapter 40

OUTPUT JSON ONLY:
{
  "name": "T-shirt",
  "description": "Knit upper body garment",
  "chapters": ["61"],
  "headings": ["6109"],
  "confidence": 90,
  "essentialCharacter": "knit cotton t-shirt for men",
  "extractedAttributes": {
    "material": "cotton",
    "demographic": "men",
    "construction": "knit"
  }
}`;

/**
 * Identify the product category using AI
 */
async function identifyCategory(input: ClassificationInputV2): Promise<CategoryIdentification> {
    const xai = getXAIClient();
    
    // Get knowledge base suggestions
    const kbChapters = getLikelyChapters(input.productDescription, input.materialComposition);
    
    const prompt = CATEGORY_IDENTIFICATION_PROMPT
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
        
        // Merge with knowledge base
        const mergedChapters = new Set<string>([
            ...(parsed.chapters || []),
            ...kbChapters.slice(0, 2).map(c => c.chapter)
        ]);
        
        return {
            name: parsed.name || 'Unknown Product',
            description: parsed.description || '',
            chapters: Array.from(mergedChapters),
            headings: parsed.headings || [],
            confidence: parsed.confidence || 70,
            essentialCharacter: parsed.essentialCharacter || '',
            extractedAttributes: {
                material: parsed.extractedAttributes?.material || input.materialComposition,
                value: parsed.extractedAttributes?.value || input.unitValue,
                dimensions: parsed.extractedAttributes?.dimensions,
                use: parsed.extractedAttributes?.use || input.intendedUse,
                demographic: parsed.extractedAttributes?.demographic,
            },
        };
    } catch (error) {
        console.error('[FlowV2] Category identification failed:', error);
        // Fallback to knowledge base only
        return {
            name: 'Product',
            description: '',
            chapters: kbChapters.slice(0, 3).map(c => c.chapter),
            headings: [],
            confidence: 50,
            essentialCharacter: input.productDescription,
            extractedAttributes: {
                material: input.materialComposition,
                value: input.unitValue,
                use: input.intendedUse,
            },
        };
    }
}

/**
 * Extended search result with hierarchy info
 */
interface ExtendedSearchResult {
    htsno: string;
    description: string;
    general: string;
    indent?: number;
}

/**
 * Search for all possible HTS codes based on category
 * Returns all codes (including parent hierarchy) for context building
 */
async function searchForAllCodes(
    category: CategoryIdentification,
    input: ClassificationInputV2
): Promise<ExtendedSearchResult[]> {
    const allResults: ExtendedSearchResult[] = [];
    const seen = new Set<string>();
    
    // Search by headings first - get all results including parents
    for (const heading of category.headings.slice(0, 4)) {
        const results = await searchHTSCodes(heading);
        for (const r of results) {
            if (!seen.has(r.htsno)) {
                seen.add(r.htsno);
                allResults.push({
                    htsno: r.htsno,
                    description: r.description,
                    general: r.general,
                    indent: r.indent,
                });
            }
        }
    }
    
    // Search by essential character
    if (category.essentialCharacter && allResults.length < 50) {
        const results = await searchHTSCodes(category.essentialCharacter);
        for (const r of results) {
            if (!seen.has(r.htsno) && category.chapters.includes(r.htsno.substring(0, 2))) {
                seen.add(r.htsno);
                allResults.push({
                    htsno: r.htsno,
                    description: r.description,
                    general: r.general,
                    indent: r.indent,
                });
            }
        }
    }
    
    // Search by product name
    if (category.name && allResults.length < 50) {
        const results = await searchHTSCodes(category.name);
        for (const r of results) {
            if (!seen.has(r.htsno) && category.chapters.includes(r.htsno.substring(0, 2))) {
                seen.add(r.htsno);
                allResults.push({
                    htsno: r.htsno,
                    description: r.description,
                    general: r.general,
                    indent: r.indent,
                });
            }
        }
    }
    
    // Keep ALL results for hierarchy context, but mark which are 10-digit for display
    // Sort by code to maintain proper hierarchy order
    allResults.sort((a, b) => a.htsno.localeCompare(b.htsno));
    
    return allResults;
}

/**
 * Filter results to only 10-digit codes for display
 */
function filterToDisplayCodes(
    allResults: ExtendedSearchResult[], 
    chapters: string[]
): ExtendedSearchResult[] {
    return allResults.filter(r => {
        const clean = r.htsno.replace(/\./g, '');
        const chapter = r.htsno.substring(0, 2);
        return clean.length === 10 && chapters.includes(chapter);
    });
}

/**
 * Get country tariff summary (Section 301, IEEPA, etc.)
 */
async function getCountryTariffSummary(countryCode: string): Promise<CountryTariffSummary> {
    try {
        // Use a sample HTS code to get country-level tariffs
        const tariffResult = await getEffectiveTariff(countryCode, '9999.99.99', { baseMfnRate: 0 });
        
        const breakdown = tariffResult.breakdown
            .filter(b => b.rate > 0 && !b.program.toLowerCase().includes('fta'))
            .map(b => ({
                name: b.program,
                rate: b.rate,
                legalReference: b.legalReference,
            }));
        
        return {
            countryCode: tariffResult.countryCode,
            countryName: tariffResult.countryName,
            total: tariffResult.totalAdditionalDuties,
            breakdown,
        };
    } catch (error) {
        console.warn('[FlowV2] Failed to get country tariffs:', error);
        // Return estimated defaults
        return getEstimatedCountryTariffs(countryCode);
    }
}

/**
 * Estimated country tariffs when registry lookup fails
 */
function getEstimatedCountryTariffs(countryCode: string): CountryTariffSummary {
    const countryNames: Record<string, string> = {
        'CN': 'China', 'VN': 'Vietnam', 'MX': 'Mexico', 'CA': 'Canada',
        'IN': 'India', 'TW': 'Taiwan', 'KR': 'South Korea', 'JP': 'Japan',
    };
    
    const countryTariffs: Record<string, CountryTariffSummary['breakdown']> = {
        'CN': [
            { name: 'Section 301', rate: 25, legalReference: 'Trade Act of 1974' },
            { name: 'IEEPA Fentanyl', rate: 20, legalReference: 'EO 14195' },
            { name: 'IEEPA Baseline', rate: 10, legalReference: 'EO 14257' },
        ],
        'VN': [
            { name: 'IEEPA Reciprocal', rate: 46, legalReference: 'EO 14257' },
        ],
        'MX': [
            { name: 'USMCA Eligible', rate: 0, legalReference: 'USMCA' },
        ],
        'CA': [
            { name: 'USMCA Eligible', rate: 0, legalReference: 'USMCA' },
        ],
    };
    
    const breakdown = countryTariffs[countryCode] || [
        { name: 'IEEPA Baseline', rate: 10, legalReference: 'EO 14257' },
    ];
    
    const total = breakdown.reduce((sum, b) => sum + b.rate, 0);
    
    return {
        countryCode,
        countryName: countryNames[countryCode] || countryCode,
        total,
        breakdown,
    };
}

/**
 * Build UNDERSTAND phase response
 */
function buildUnderstandResponse(
    category: CategoryIdentification,
    ambiguity: AmbiguityAnalysis,
    countryAdditions: CountryTariffSummary,
    searchResults: ExtendedSearchResult[]
): UnderstandResponse {
    // Convert ambiguity variables to classification variables with impact
    const variables = prioritizeVariables(ambiguity.decisionVariables, ambiguity.possibleCodes);
    
    // Count only 10-digit display codes
    const displayCodes = filterToDisplayCodes(searchResults, category.chapters);
    
    return {
        phase: 'understand',
        category,
        rateRange: {
            min: ambiguity.dutyRange.min,
            max: ambiguity.dutyRange.max,
            minCode: ambiguity.dutyRange.minCode,
            maxCode: ambiguity.dutyRange.maxCode,
        },
        countryAdditions,
        variables,
        possibleCodeCount: ambiguity.possibleCodes.length || displayCodes.length,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2: ALL CODES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build ALL CODES phase response
 */
function buildAllCodesResponse(
    category: CategoryIdentification,
    ambiguity: AmbiguityAnalysis,
    countryAdditions: CountryTariffSummary,
    searchResults: ExtendedSearchResult[],
    input: ClassificationInputV2
): AllCodesResponse {
    // Pass ALL results for hierarchy context, but grouping will use possibleCodes or filtered results
    // The hierarchy context helps build proper descriptions for child codes
    const displayCodes = filterToDisplayCodes(searchResults, category.chapters);
    const codeGroups = groupCodesByCategory(ambiguity.possibleCodes, searchResults, category, displayCodes);
    
    // Add example to country additions
    if (codeGroups.length > 0 && codeGroups[0].codes.length > 0) {
        const exampleCode = codeGroups[0].codes.find(c => c.isLowest) || codeGroups[0].codes[0];
        countryAdditions.example = {
            code: exampleCode.htsCode,
            baseRate: exampleCode.baseRate,
            totalRate: exampleCode.baseRate + countryAdditions.total,
        };
    }
    
    // Generate tip
    let tip: string | undefined;
    if (countryAdditions.total > 20) {
        if (input.countryOfOrigin === 'CN') {
            tip = 'Looking for lower rates? Mexico (USMCA) or Vietnam may have lower additional tariffs.';
        } else if (input.countryOfOrigin === 'VN') {
            tip = 'Looking for lower rates? Mexico (USMCA) may qualify for 0% additional tariffs.';
        }
    }
    
    return {
        phase: 'all',
        category,
        codeGroups,
        countryAdditions,
        tip,
    };
}

/**
 * Group codes by chapter/category with human-readable labels
 * Also builds hierarchical context for each code
 */
function groupCodesByCategory(
    possibleCodes: AmbiguityAnalysis['possibleCodes'],
    allSearchResults: ExtendedSearchResult[], // All results including parents for hierarchy
    category: CategoryIdentification,
    displayCodes?: ExtendedSearchResult[]     // Only 10-digit codes to display
): CodeGroup[] {
    const groups: Map<string, CodeGroup> = new Map();
    
    // Build hierarchy context from ALL search results (which has indent info)
    const hierarchyContext = buildHierarchyContext(allSearchResults);
    
    // Use possibleCodes if available, otherwise use displayCodes (filtered to 10-digit)
    const codesToGroup = possibleCodes.length > 0 
        ? possibleCodes.map(pc => ({
            htsno: pc.htsCode,
            description: pc.description,
            general: pc.baseDutyRate,
        }))
        : (displayCodes || filterToDisplayCodes(allSearchResults, category.chapters));
    
    // Find lowest rate for highlighting
    let lowestRate = Infinity;
    for (const code of codesToGroup) {
        const rate = parseDutyRate(code.general);
        if (rate !== null && rate < lowestRate) {
            lowestRate = rate;
        }
    }
    
    // Group by chapter
    for (const code of codesToGroup) {
        const chapter = code.htsno.substring(0, 2);
        const groupKey = chapter;
        
        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                groupName: getGroupName(chapter, category),
                groupNote: getGroupNote(chapter, category),
                chapter,
                codes: [],
            });
        }
        
        const rate = parseDutyRate(code.general);
        const isLowest = rate !== null && Math.abs(rate - lowestRate) < 0.1;
        
        // Build enriched criteria with parent context
        const enrichedCriteria = buildEnrichedCriteria(code.htsno, code.description, hierarchyContext);
        
        groups.get(groupKey)!.codes.push({
            htsCode: code.htsno,
            description: code.description,
            criteria: enrichedCriteria,
            baseRate: rate ?? 0,
            baseRateFormatted: code.general || 'See HTS',
            isLowest,
        });
    }
    
    // Sort groups by chapter, then codes by rate
    const sortedGroups = Array.from(groups.values());
    sortedGroups.sort((a, b) => a.chapter.localeCompare(b.chapter));
    
    for (const group of sortedGroups) {
        group.codes.sort((a, b) => a.baseRate - b.baseRate);
    }
    
    return sortedGroups;
}

/**
 * Build a hierarchy context map from search results with indent info
 * Maps each code to its parent descriptions
 */
function buildHierarchyContext(
    searchResults: Array<{ htsno: string; description: string; indent?: number }>
): Map<string, { parentDescriptions: string[]; ownDescription: string }> {
    const context = new Map<string, { parentDescriptions: string[]; ownDescription: string }>();
    
    // Sort by code to ensure proper ordering
    const sorted = [...searchResults].sort((a, b) => a.htsno.localeCompare(b.htsno));
    
    // Track parent stack by indent level
    const parentStack: Array<{ indent: number; description: string; code: string }> = [];
    
    for (const item of sorted) {
        const indent = item.indent ?? 0;
        const cleanDesc = cleanStatCode(item.description);
        
        // Pop parents that are at same or higher indent level
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].indent >= indent) {
            parentStack.pop();
        }
        
        // Build parent descriptions array
        const parentDescriptions = parentStack
            .filter(p => p.indent < indent && p.indent > 0) // Skip indent 0 (chapter level)
            .map(p => cleanStatCode(p.description));
        
        context.set(item.htsno, {
            parentDescriptions,
            ownDescription: cleanDesc,
        });
        
        // Add current to parent stack for children
        parentStack.push({ indent, description: item.description, code: item.htsno });
    }
    
    return context;
}

/**
 * Build enriched criteria with parent context
 */
function buildEnrichedCriteria(
    htsCode: string,
    description: string,
    hierarchyContext: Map<string, { parentDescriptions: string[]; ownDescription: string }>
): string {
    const ctx = hierarchyContext.get(htsCode);
    const cleanDesc = cleanStatCode(description);
    
    // If this is a short/ambiguous description (like "Men's", "Boys'", "(338)"),
    // add parent context
    const needsContext = isAmbiguousDescription(cleanDesc);
    
    if (needsContext && ctx && ctx.parentDescriptions.length > 0) {
        // Find the most relevant parent (usually the immediate one)
        const relevantParent = ctx.parentDescriptions[ctx.parentDescriptions.length - 1];
        if (relevantParent && relevantParent !== cleanDesc) {
            return `${relevantParent} › ${cleanDesc}`;
        }
    }
    
    return extractCriteria(cleanDesc);
}

/**
 * Check if a description is too short/ambiguous to stand alone
 */
function isAmbiguousDescription(desc: string): boolean {
    const clean = desc.trim();
    
    // Very short descriptions need context
    if (clean.length < 15) return true;
    
    // Demographic-only descriptions need context
    const demographicOnly = /^(men's|women's|boys'|girls'|other|infants')$/i;
    if (demographicOnly.test(clean)) return true;
    
    // Just a stat code
    if (/^\(\d+\)$/.test(clean)) return true;
    
    return false;
}

/**
 * Remove statistical category codes like (338), (339), (352) from descriptions
 */
function cleanStatCode(description: string): string {
    return description
        .replace(/\s*\(\d{3}\)\s*$/, '') // Remove trailing (###)
        .replace(/\s*\(\d{3}\)\s*/g, ' ') // Remove inline (###)
        .trim();
}

/**
 * Get human-readable group name
 */
function getGroupName(chapter: string, category: CategoryIdentification): string {
    const chapterNames: Record<string, string> = {
        '61': 'Knit (Chapter 61)',
        '62': 'Woven (Chapter 62)',
        '82': 'Cutlery & Tools (Chapter 82)',
        '85': 'Electrical (Chapter 85)',
        '71': 'Jewelry (Chapter 71)',
        '39': 'Plastic Articles (Chapter 39)',
        '40': 'Rubber Articles (Chapter 40)',
        '94': 'Furniture (Chapter 94)',
        '95': 'Toys & Games (Chapter 95)',
    };
    
    return chapterNames[chapter] || `Chapter ${chapter}`;
}

/**
 * Get note for group (e.g., "Most t-shirts are knit")
 */
function getGroupNote(chapter: string, category: CategoryIdentification): string | undefined {
    const categoryLower = category.name.toLowerCase();
    
    if ((categoryLower.includes('t-shirt') || categoryLower.includes('tshirt')) && chapter === '61') {
        return 'Most t-shirts are knit';
    }
    if (categoryLower.includes('knife') && chapter === '82') {
        return 'Kitchen and table knives';
    }
    
    return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIERARCHICAL TREE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build ALL CODES response with hierarchical tree structure
 */
export function buildAllCodesTreeResponse(
    category: CategoryIdentification,
    ambiguity: AmbiguityAnalysis,
    countryAdditions: CountryTariffSummary,
    searchResults: ExtendedSearchResult[],
    input: ClassificationInputV2
): AllCodesTreeResponse {
    // Build the hierarchical tree (old format for compatibility)
    const materialGroups = buildMaterialGroups(searchResults, category, input);
    
    // Build NEW proper heading hierarchy
    const headingGroups = buildHeadingGroups(searchResults, category, input);
    
    // Build CLEAN tree based on indent levels (user's visual mockup)
    const cleanTree = buildCleanIndentTree(searchResults, input);
    
    // Find top matches
    const topMatches = findTopFromCleanTree(cleanTree, input, 3);
    
    // Add example to country additions
    if (topMatches.length > 0) {
        const bestMatch = topMatches[0];
        const rate = parseFloat(bestMatch.rate) || 0;
        countryAdditions.example = {
            code: bestMatch.htsCode,
            baseRate: rate,
            totalRate: rate + countryAdditions.total,
        };
    }
    
    // Generate tip (only shown on final screen now)
    const tip = undefined;
    
    return {
        phase: 'all',
        category,
        materialGroups,
        headingGroups,
        cleanTree,
        countryAdditions,
        topMatches,
        tip,
    };
}

/**
 * Build clean indent-based tree matching user's visual mockup
 * Uses indent field from USITC API to build proper parent-child relationships
 */
function buildCleanIndentTree(
    searchResults: ExtendedSearchResult[],
    input: ClassificationInputV2
): CleanMaterialGroup[] {
    const userKeywords = extractKeywords(input);
    
    // Filter to only relevant heading (e.g., 6109 for T-shirts)
    // Group by 6-digit material code first
    const materialMap = new Map<string, ExtendedSearchResult[]>();
    
    for (const result of searchResults) {
        // Get 6-digit code (e.g., "6109.10" from "6109.10.00.04")
        const code6 = result.htsno.substring(0, 7);
        
        if (!materialMap.has(code6)) {
            materialMap.set(code6, []);
        }
        materialMap.get(code6)!.push(result);
    }
    
    // Build material groups
    const groups: CleanMaterialGroup[] = [];
    
    for (const [code6, codes] of materialMap) {
        // Sort by code to maintain order
        codes.sort((a, b) => a.htsno.localeCompare(b.htsno));
        
        // Find the material name (lowest indent, usually the 6-digit code itself)
        const materialCode = codes.find(c => c.htsno === code6 || c.htsno.startsWith(code6 + '.00'));
        const materialName = getMaterialName(materialCode?.description || code6);
        const rate = materialCode?.general || 'See HTS';
        const rateNumber = parseDutyRate(rate) || 0;
        
        // Check if this material matches user input
        const isMatch = checkMaterialRelevance(materialName, userKeywords);
        
        // Build the nested tree using indent levels
        const productCategories = buildProductCategoriesFromIndent(codes, userKeywords);
        
        // Count total selectable codes (leaf nodes)
        const codeCount = countLeafCodes(productCategories);
        
        groups.push({
            material: materialName,
            materialCode: code6,
            rate,
            rateNumber,
            isMatch,
            isExpanded: isMatch, // Expand matching materials by default
            productCategories,
            codeCount,
        });
    }
    
    // Sort: matching materials first, then by rate
    groups.sort((a, b) => {
        if (a.isMatch !== b.isMatch) return a.isMatch ? -1 : 1;
        return a.rateNumber - b.rateNumber;
    });
    
    return groups;
}

/**
 * Build product categories using indent levels
 * This creates the nested tree structure that respects HTS hierarchy
 */
function buildProductCategoriesFromIndent(
    codes: ExtendedSearchResult[],
    userKeywords: ExtractedKeywords
): ProductCategory[] {
    // Filter to just the selectable codes (usually 10-digit)
    const selectableCodes = codes.filter(c => 
        c.htsno.replace(/\./g, '').length >= 10 || 
        (c.indent ?? 0) >= 3
    );
    
    if (selectableCodes.length === 0) return [];
    
    // Build tree using indent levels
    const categories: ProductCategory[] = [];
    let currentCategory: ProductCategory | null = null;
    let lastIndent = 0;
    
    for (const code of selectableCodes) {
        const indent = code.indent || 3;
        const desc = cleanStatCode(code.description);
        
        // Determine if this is a category (parent) or a leaf code
        const isParent = isParentDescription(desc);
        
        if (indent <= 3 || isParent) {
            // This is a top-level category or product type
            if (currentCategory && currentCategory.codes.length === 0) {
                // Previous category was actually just a code, convert it
                categories.push({
                    name: 'General',
                    codes: [{
                        htsCode: currentCategory.name,
                        label: currentCategory.name,
                        rate: '',
                        isTopMatch: false,
                    }]
                });
            }
            currentCategory = {
                name: desc,
                codes: [],
            };
            categories.push(currentCategory);
        } else if (currentCategory) {
            // This is a child code under current category
            currentCategory.codes.push({
                htsCode: code.htsno,
                label: desc,
                rate: code.general || 'See HTS',
                isTopMatch: checkCodeRelevance(desc, userKeywords),
            });
        } else {
            // No category yet, create a general one
            currentCategory = {
                name: 'General',
                codes: [{
                    htsCode: code.htsno,
                    label: desc,
                    rate: code.general || 'See HTS',
                    isTopMatch: checkCodeRelevance(desc, userKeywords),
                }],
            };
            categories.push(currentCategory);
        }
        
        lastIndent = indent;
    }
    
    // Clean up: if categories have no codes but are leaf items themselves
    return categories.filter(cat => cat.codes.length > 0 || !cat.name.includes('('));
}

/**
 * Check if description is a parent (has children) or a leaf code
 */
function isParentDescription(desc: string): boolean {
    const parentPatterns = [
        /^t-shirts?/i,
        /^singlets?/i,
        /^thermal/i,
        /^underwear/i,
        /^other$/i,
    ];
    
    return parentPatterns.some(p => p.test(desc));
}

/**
 * Check if code matches user's criteria
 */
function checkCodeRelevance(desc: string, keywords: ExtractedKeywords): boolean {
    const descLower = desc.toLowerCase();
    
    // Check demographic match
    for (const demo of keywords.demographics) {
        if (descLower.includes(demo.toLowerCase())) return true;
    }
    
    // Check product type match
    for (const pt of keywords.productTypes) {
        const terms = mapProductTypeToHts(pt);
        for (const term of terms) {
            if (descLower.includes(term)) return true;
        }
    }
    
    return false;
}

/**
 * Get clean material name from description
 */
function getMaterialName(desc: string): string {
    const clean = cleanStatCode(desc);
    
    // Map common patterns to clean names
    if (/of cotton/i.test(clean)) return 'Cotton';
    if (/man-made|synthetic/i.test(clean)) return 'Man-made fibers';
    if (/of wool/i.test(clean)) return 'Wool';
    if (/of silk/i.test(clean)) return 'Silk';
    if (/of other/i.test(clean)) return 'Other materials';
    
    return clean;
}

/**
 * Count leaf codes (selectable HTS codes) in categories
 */
function countLeafCodes(categories: ProductCategory[]): number {
    return categories.reduce((sum, cat) => sum + cat.codes.length, 0);
}

/**
 * Find top matching codes from clean tree
 */
function findTopFromCleanTree(
    tree: CleanMaterialGroup[],
    input: ClassificationInputV2,
    limit: number
): HtsSelectableCode[] {
    const allCodes: Array<CleanCode & { materialMatch: boolean }> = [];
    
    for (const material of tree) {
        for (const category of material.productCategories) {
            for (const code of category.codes) {
                allCodes.push({
                    ...code,
                    materialMatch: material.isMatch,
                });
            }
        }
    }
    
    // Sort by relevance
    allCodes.sort((a, b) => {
        // Material match first
        if (a.materialMatch !== b.materialMatch) return a.materialMatch ? -1 : 1;
        // Then top matches
        if (a.isTopMatch !== b.isTopMatch) return a.isTopMatch ? -1 : 1;
        return 0;
    });
    
    return allCodes.slice(0, limit).map(c => ({
        htsCode: c.htsCode,
        description: c.label,
        rate: c.rate,
        isTopMatch: true,
    }));
}

/**
 * Build proper HTS heading hierarchy
 * 
 * Structure: Heading (4-digit) → Subheading (6-digit) → Codes (8/10-digit)
 */
function buildHeadingGroups(
    searchResults: ExtendedSearchResult[],
    category: CategoryIdentification,
    input: ClassificationInputV2
): HtsHeadingGroup[] {
    const userKeywords = extractKeywords(input);
    const sorted = [...searchResults].sort((a, b) => a.htsno.localeCompare(b.htsno));
    
    // Group by 4-digit heading
    const headingMap = new Map<string, {
        description: string;
        codes: ExtendedSearchResult[];
    }>();
    
    for (const result of sorted) {
        const heading4 = result.htsno.substring(0, 4);
        
        if (!headingMap.has(heading4)) {
            // Find the heading description from a low-indent result
            const headingDesc = findHeadingDescription(sorted, heading4);
            headingMap.set(heading4, {
                description: headingDesc,
                codes: [],
            });
        }
        headingMap.get(heading4)!.codes.push(result);
    }
    
    // Build heading groups - ONLY include relevant headings
    const groups: HtsHeadingGroup[] = [];
    
    for (const [heading4, data] of headingMap) {
        // Check if this heading matches the product type
        const isProductMatch = checkHeadingRelevance(heading4 + '.00.00.00', category);
        
        // Build subheadings (6-digit)
        const subheadings = buildSubheadings(data.codes, heading4, data.description, userKeywords);
        
        // Count total selectable codes
        const totalCodes = subheadings.reduce((sum, sh) => sum + sh.codeCount, 0);
        
        groups.push({
            heading: heading4,
            headingDescription: data.description,
            isRelevant: isProductMatch,
            relevanceReason: isProductMatch ? 'Matches your product' : 'Different product type',
            defaultExpanded: isProductMatch, // Only expand relevant headings
            subheadings,
            totalCodes,
        });
    }
    
    // Sort: relevant headings first, then by code
    groups.sort((a, b) => {
        if (a.isRelevant !== b.isRelevant) return a.isRelevant ? -1 : 1;
        return a.heading.localeCompare(b.heading);
    });
    
    // KEY: Only return relevant headings + a summary of others
    // This dramatically reduces scrolling
    const relevantGroups = groups.filter(g => g.isRelevant);
    const otherGroups = groups.filter(g => !g.isRelevant);
    
    // If we have relevant groups, only show those
    // Otherwise show all (fallback for edge cases)
    if (relevantGroups.length > 0 && otherGroups.length > 3) {
        // Create a summary "Other headings" group
        const otherTotalCodes = otherGroups.reduce((sum, g) => sum + g.totalCodes, 0);
        const otherSummary: HtsHeadingGroup = {
            heading: 'OTHER',
            headingDescription: `${otherGroups.length} other headings (not T-shirts)`,
            isRelevant: false,
            relevanceReason: 'Click to expand if needed',
            defaultExpanded: false,
            subheadings: [], // Empty - this is just a summary
            totalCodes: otherTotalCodes,
        };
        
        return [...relevantGroups, otherSummary];
    }
    
    return groups;
}

/**
 * Find the description for a 4-digit heading
 * Uses static lookup for common headings since API doesn't always return heading-level descriptions
 */
function findHeadingDescription(results: ExtendedSearchResult[], heading4: string): string {
    // Static lookup for common Chapter 61/62 headings (apparel)
    const headingDescriptions: Record<string, string> = {
        '6101': "Men's or boys' overcoats, carcoats, capes, cloaks, anoraks, windbreakers (knitted)",
        '6102': "Women's or girls' overcoats, carcoats, capes, cloaks, anoraks, windbreakers (knitted)",
        '6103': "Men's or boys' suits, ensembles, jackets, blazers, trousers (knitted)",
        '6104': "Women's or girls' suits, ensembles, jackets, blazers, dresses, skirts (knitted)",
        '6105': "Men's or boys' shirts (knitted)",
        '6106': "Women's or girls' blouses and shirts (knitted)",
        '6107': "Men's or boys' underpants, briefs, nightshirts, pajamas, bathrobes (knitted)",
        '6108': "Women's or girls' slips, petticoats, briefs, panties, nightdresses (knitted)",
        '6109': "T-shirts, singlets, tank tops and similar garments (knitted)",
        '6110': "Sweaters, pullovers, sweatshirts, waistcoats (knitted)",
        '6111': "Babies' garments and clothing accessories (knitted)",
        '6112': "Track suits, ski suits, swimwear (knitted)",
        '6113': "Garments coated with plastics, rubber (knitted)",
        '6114': "Other garments (knitted)",
        '6115': "Pantyhose, tights, stockings, socks (knitted)",
        '6116': "Gloves, mittens (knitted)",
        '6117': "Other clothing accessories, parts of garments (knitted)",
        '6201': "Men's or boys' overcoats, carcoats, capes, cloaks, anoraks, windbreakers (woven)",
        '6202': "Women's or girls' overcoats, carcoats, capes, cloaks, anoraks, windbreakers (woven)",
        '6203': "Men's or boys' suits, ensembles, jackets, blazers, trousers (woven)",
        '6204': "Women's or girls' suits, ensembles, jackets, blazers, dresses, skirts (woven)",
        '6205': "Men's or boys' shirts (woven)",
        '6206': "Women's or girls' blouses, shirts, shirt-blouses (woven)",
        '6207': "Men's or boys' singlets, undershirts, underpants, briefs, nightshirts (woven)",
        '6208': "Women's or girls' slips, petticoats, briefs, panties, nightdresses (woven)",
        '6209': "Babies' garments and clothing accessories (woven)",
        '6210': "Garments of felt, nonwovens, coated textiles (woven)",
        '6211': "Track suits, ski suits, swimwear, other garments (woven)",
        '6212': "Brassieres, girdles, corsets, braces, garters (woven)",
        '6213': "Handkerchiefs (woven)",
        '6214': "Shawls, scarves, mufflers, mantillas, veils (woven)",
        '6215': "Ties, bow ties, cravats (woven)",
        '6216': "Gloves, mittens (woven)",
        '6217': "Other clothing accessories, parts of garments (woven)",
    };
    
    // Check static lookup first
    if (headingDescriptions[heading4]) {
        return headingDescriptions[heading4];
    }
    
    // Fallback: Look for the lowest indent code in this heading
    const headingResults = results.filter(r => r.htsno.startsWith(heading4));
    
    if (headingResults.length === 0) {
        return `Heading ${heading4}`;
    }
    
    // Find result with lowest indent (usually indent 0 or 1)
    let bestResult = headingResults[0];
    for (const r of headingResults) {
        if ((r.indent || 99) < (bestResult.indent || 99)) {
            bestResult = r;
        }
    }
    
    const desc = cleanStatCode(bestResult.description);
    
    // If description is generic (material only), return with heading number
    const genericDescriptions = ['of cotton', 'of man-made', 'of synthetic', 'of wool', 'of other', "men's", "women's", "boys'", "girls'"];
    if (genericDescriptions.some(g => desc.toLowerCase().startsWith(g))) {
        return `Heading ${heading4}`;
    }
    
    return desc;
}

/**
 * Build 6-digit subheadings under a heading
 */
function buildSubheadings(
    codes: ExtendedSearchResult[],
    heading4: string,
    headingDescription: string,
    userKeywords: ExtractedKeywords
): HtsSubheading[] {
    // Group by 6-digit subheading (e.g., "6109.10")
    const subheadingMap = new Map<string, {
        description: string;
        rate: string;
        codes: ExtendedSearchResult[];
    }>();
    
    for (const code of codes) {
        const code6 = code.htsno.substring(0, 7); // "6109.10" (including dot)
        
        if (!subheadingMap.has(code6)) {
            // Find subheading description
            const subDesc = findSubheadingDescription(codes, code6);
            subheadingMap.set(code6, {
                description: subDesc,
                rate: code.general || 'See HTS',
                codes: [],
            });
        }
        subheadingMap.get(code6)!.codes.push(code);
    }
    
    // Build subheading objects
    const subheadings: HtsSubheading[] = [];
    
    for (const [code6, data] of subheadingMap) {
        // Check material relevance
        const isMatMatch = checkMaterialRelevance(data.description, userKeywords);
        
        // Get selectable codes (10-digit)
        const selectableCodes = data.codes
            .filter(c => c.htsno.replace(/\./g, '').length === 10)
            .map(c => ({
                htsCode: c.htsno,
                description: cleanStatCode(c.description),
                rate: c.general || 'See HTS',
                isTopMatch: false, // Will be set later
            }));
        
        // Parse rate
        const baseRate = parseDutyRate(data.rate) || 0;
        
        subheadings.push({
            code: code6,
            description: cleanStatCode(data.description),
            fullDescription: `${headingDescription} › ${cleanStatCode(data.description)}`,
            baseRate,
            baseRateFormatted: data.rate,
            isRelevant: isMatMatch,
            relevanceReason: isMatMatch ? undefined : 'Different material',
            codeCount: selectableCodes.length,
            codes: selectableCodes,
        });
    }
    
    // Sort: relevant subheadings first, then by rate
    subheadings.sort((a, b) => {
        if (a.isRelevant !== b.isRelevant) return a.isRelevant ? -1 : 1;
        return a.baseRate - b.baseRate;
    });
    
    return subheadings;
}

/**
 * Find description for a 6-digit subheading
 */
function findSubheadingDescription(codes: ExtendedSearchResult[], code6: string): string {
    const matching = codes.filter(c => c.htsno.startsWith(code6));
    
    if (matching.length === 0) return code6;
    
    // Find the one with lowest indent
    let best = matching[0];
    for (const c of matching) {
        if ((c.indent || 99) < (best.indent || 99)) {
            best = c;
        }
    }
    
    return best.description;
}

/**
 * Find top matching selectable codes across all headings
 */
function findTopSelectableCodes(
    headingGroups: HtsHeadingGroup[],
    input: ClassificationInputV2,
    limit: number
): HtsSelectableCode[] {
    const userKeywords = extractKeywords(input);
    const allCodes: Array<HtsSelectableCode & { score: number }> = [];
    
    for (const heading of headingGroups) {
        for (const subheading of heading.subheadings) {
            for (const code of subheading.codes) {
                // Score based on relevance
                let score = 0;
                if (heading.isRelevant) score += 50;      // Product type match
                if (subheading.isRelevant) score += 30;   // Material match
                
                // Boost for description containing product keywords
                const descLower = code.description.toLowerCase();
                for (const pt of userKeywords.productTypes) {
                    const terms = mapProductTypeToHts(pt);
                    for (const term of terms) {
                        if (descLower.includes(term)) {
                            score += 20;
                            break;
                        }
                    }
                }
                
                allCodes.push({ ...code, score });
            }
        }
    }
    
    // Sort by score descending, then by rate ascending
    allCodes.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        const rateA = parseFloat(a.rate) || 0;
        const rateB = parseFloat(b.rate) || 0;
        return rateA - rateB;
    });
    
    // Mark top matches and return
    const topCodes = allCodes.slice(0, limit);
    return topCodes.map(c => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { score, ...code } = c;
        return { ...code, isTopMatch: true };
    });
}

/**
 * Build material groups from search results
 */
function buildMaterialGroups(
    searchResults: ExtendedSearchResult[],
    category: CategoryIdentification,
    input: ClassificationInputV2
): HtsMaterialGroup[] {
    // Sort results by code for proper hierarchy building
    const sorted = [...searchResults].sort((a, b) => a.htsno.localeCompare(b.htsno));
    
    // Find material-level codes (typically indent 1 or 2)
    const materialCodes = findMaterialCodes(sorted);
    
    // Extract user input keywords for relevance scoring
    const userKeywords = extractKeywords(input);
    
    // Build groups
    const groups: HtsMaterialGroup[] = [];
    
    for (const materialCode of materialCodes) {
        // Find all codes under this material
        const childCodes = sorted.filter(c => 
            c.htsno.startsWith(materialCode.htsno.replace(/\.00$/, '')) &&
            c.htsno !== materialCode.htsno
        );
        
        // Get the base rate for this material
        const baseRate = parseDutyRate(materialCode.general) || 0;
        const baseRateFormatted = materialCode.general || 'See HTS';
        
        // Build tree for this material's children
        const tree = buildTree(childCodes, materialCode.indent || 1, baseRate, userKeywords);
        
        // Sort tree with "Other" last
        sortTreeWithOtherLast(tree);
        
        // Check if this group is relevant (both material AND heading)
        const relevance = checkGroupRelevance(
            materialCode.description,
            materialCode.htsno,
            userKeywords,
            category
        );
        
        // Count selectable codes
        const codeCount = countSelectableCodes(tree);
        
        groups.push({
            material: cleanStatCode(materialCode.description),
            baseHeading: materialCode.htsno,
            baseRate,
            baseRateFormatted,
            isRelevant: relevance.isRelevant,
            relevanceReason: relevance.reason,
            defaultCollapsed: !relevance.isRelevant, // Collapse non-matching groups
            children: tree,
            codeCount,
        });
    }
    
    // Sort: relevant materials first, then by rate
    groups.sort((a, b) => {
        if (a.isRelevant !== b.isRelevant) return a.isRelevant ? -1 : 1;
        return a.baseRate - b.baseRate;
    });
    
    return groups;
}

/**
 * Find material-level codes (Of cotton, Of man-made fibers, etc.)
 */
function findMaterialCodes(sorted: ExtendedSearchResult[]): ExtendedSearchResult[] {
    // Material codes are typically at indent 1 or 2
    return sorted.filter(c => {
        const indent = c.indent || 0;
        const codeLength = c.htsno.replace(/\./g, '').length;
        // Looking for 6-8 digit codes at low indent levels
        return indent <= 2 && codeLength >= 6 && codeLength <= 8;
    });
}

/**
 * Build a tree from codes
 */
function buildTree(
    codes: ExtendedSearchResult[],
    parentIndent: number,
    inheritedRate: number,
    userKeywords: ExtractedKeywords
): HtsTreeNode[] {
    const tree: HtsTreeNode[] = [];
    const nodeMap = new Map<string, HtsTreeNode>();
    
    // First pass: create all nodes
    for (const code of codes) {
        const indent = code.indent || 0;
        const isSelectable = code.htsno.replace(/\./g, '').length === 10;
        const cleanDesc = cleanStatCode(code.description);
        const isOther = /^other$/i.test(cleanDesc) || cleanDesc.toLowerCase().startsWith('other ');
        
        // Calculate rate (use own rate or inherit from parent)
        const ownRate = parseDutyRate(code.general);
        const baseRate = ownRate !== null ? ownRate : inheritedRate;
        
        // Calculate relevance score
        const relevanceScore = calculateRelevanceScore(cleanDesc, userKeywords);
        
        const node: HtsTreeNode = {
            id: code.htsno,
            htsCode: isSelectable ? code.htsno : undefined,
            label: cleanDesc,
            description: code.description,
            indent,
            baseRate,
            baseRateFormatted: ownRate !== null ? code.general : `${inheritedRate}%`,
            inheritedRate: ownRate === null,
            isSelectable,
            isOther,
            relevanceScore,
            isTopMatch: false, // Will be set later
            children: [],
        };
        
        nodeMap.set(code.htsno, node);
    }
    
    // Second pass: build hierarchy
    const parentStack: HtsTreeNode[] = [];
    
    for (const code of codes) {
        const node = nodeMap.get(code.htsno)!;
        const indent = node.indent;
        
        // Pop stack until we find a valid parent (lower indent)
        while (parentStack.length > 0 && parentStack[parentStack.length - 1].indent >= indent) {
            parentStack.pop();
        }
        
        if (parentStack.length > 0) {
            // Add as child of top of stack
            parentStack[parentStack.length - 1].children.push(node);
        } else {
            // Top-level node
            tree.push(node);
        }
        
        // Push this node as potential parent
        parentStack.push(node);
    }
    
    return tree;
}

/**
 * Sort tree nodes with "Other" always last, highest relevance first
 */
function sortTreeWithOtherLast(nodes: HtsTreeNode[]): void {
    nodes.sort((a, b) => {
        // "Other" always last
        if (a.isOther !== b.isOther) return a.isOther ? 1 : -1;
        // Higher relevance first
        if (a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
        // Lower rate first
        return (a.baseRate || 0) - (b.baseRate || 0);
    });
    
    // Recursively sort children
    for (const node of nodes) {
        if (node.children.length > 0) {
            sortTreeWithOtherLast(node.children);
        }
    }
}

/**
 * Structured keywords from user input for relevance matching
 */
interface ExtractedKeywords {
    materials: string[];      // cotton, polyester, wool, etc.
    demographics: string[];   // men's, women's, boys', girls'
    productTypes: string[];   // t-shirt, shirt, underwear, etc.
    all: string[];           // All keywords combined
    hasMaterial: boolean;    // Did user explicitly specify material?
    hasDemographic: boolean; // Did user specify demographic?
}

/**
 * Extract structured keywords from user input
 */
function extractKeywords(input: ClassificationInputV2): ExtractedKeywords {
    const descText = (input.productDescription || '').toLowerCase();
    const materialText = (input.materialComposition || '').toLowerCase();
    const allText = [descText, materialText, input.intendedUse || ''].join(' ');
    
    // Material keywords
    const materialPatterns = /\b(cotton|polyester|wool|silk|linen|synthetic|man-made|nylon|acrylic|rayon|spandex|elastane|poly|fleece)\b/gi;
    const materials = [...new Set((allText.match(materialPatterns) || []).map(m => m.toLowerCase()))];
    
    // Demographic keywords
    const demographicPatterns = /\b(men's|women's|boys'|girls'|men|women|boy|girl|male|female|unisex|adult|child|children|infant|baby)\b/gi;
    const demographics = [...new Set((allText.match(demographicPatterns) || []).map(d => d.toLowerCase()))];
    
    // Product type keywords - be specific about what the product IS
    const productPatterns = /\b(t-shirt|tshirt|t\s+shirt|shirt|blouse|underwear|thermal|singlet|tank\s*top|sweater|pullover|cardigan|jacket|coat|pants|trousers|shorts|dress|skirt|suit|vest|hoodie|sweatshirt)\b/gi;
    const productTypes = [...new Set((allText.match(productPatterns) || []).map(p => p.toLowerCase().replace(/\s+/g, '-')))];
    
    // Check if material was explicitly specified (in material field OR description)
    const hasMaterial = materials.length > 0;
    const hasDemographic = demographics.length > 0;
    
    return {
        materials,
        demographics,
        productTypes,
        all: [...materials, ...demographics, ...productTypes],
        hasMaterial,
        hasDemographic,
    };
}

/**
 * Calculate relevance score (0-100) based on keyword match
 * Weighs different keyword types differently
 */
function calculateRelevanceScore(description: string, keywords: ExtractedKeywords): number {
    const descLower = description.toLowerCase();
    let score = 50; // Base score
    
    // Product type is MOST important - if description doesn't match product type, penalize heavily
    if (keywords.productTypes.length > 0) {
        let productMatch = false;
        for (const productType of keywords.productTypes) {
            const htsTerms = mapProductTypeToHts(productType);
            for (const term of htsTerms) {
                if (descLower.includes(term)) {
                    productMatch = true;
                    score += 30; // Big boost for product type match
                    break;
                }
            }
            if (productMatch) break;
        }
        if (!productMatch) {
            score -= 20; // Penalize if product type doesn't match
        }
    }
    
    // Demographics match - only boost if user specified
    if (keywords.hasDemographic) {
        for (const demo of keywords.demographics) {
            const htsTerms = mapToHtsTerms(demo);
            for (const term of htsTerms) {
                if (descLower.includes(term)) {
                    score += 15; // Medium boost for demographic match
                    break;
                }
            }
        }
    }
    
    // Material match - only boost if user explicitly specified material
    if (keywords.hasMaterial) {
        for (const mat of keywords.materials) {
            const htsTerms = mapToHtsTerms(mat);
            for (const term of htsTerms) {
                if (descLower.includes(term)) {
                    score += 10; // Smaller boost for material
                    break;
                }
            }
        }
    }
    
    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
}

/**
 * Map product types to HTS terminology
 */
function mapProductTypeToHts(productType: string): string[] {
    const mapping: Record<string, string[]> = {
        't-shirt': ['t-shirt', 'tshirt', 'singlet', 'tank top', 'garment'],
        'tshirt': ['t-shirt', 'tshirt', 'singlet', 'tank top', 'garment'],
        't shirt': ['t-shirt', 'tshirt', 'singlet', 'tank top', 'garment'],
        'shirt': ['shirt', 'blouse'],
        'blouse': ['blouse', 'shirt'],
        'underwear': ['underwear', 'undergarment', 'underpant', 'brief'],
        'thermal': ['thermal'],
        'singlet': ['singlet', 't-shirt', 'tank'],
        'tank-top': ['tank', 'singlet', 't-shirt'],
        'sweater': ['sweater', 'pullover', 'jumper'],
        'pullover': ['pullover', 'sweater'],
        'cardigan': ['cardigan'],
        'jacket': ['jacket', 'anorak'],
        'coat': ['coat', 'overcoat'],
        'pants': ['trouser', 'pant', 'slack'],
        'trousers': ['trouser', 'pant', 'slack'],
        'shorts': ['short'],
        'dress': ['dress', 'frock'],
        'skirt': ['skirt'],
        'suit': ['suit', 'ensemble'],
        'vest': ['vest', 'waistcoat'],
        'hoodie': ['hoodie', 'hooded', 'sweatshirt'],
        'sweatshirt': ['sweatshirt', 'hoodie'],
    };
    
    return mapping[productType.toLowerCase()] || [productType.toLowerCase()];
}

/**
 * Map user keywords to HTS terminology
 */
function mapToHtsTerms(keyword: string): string[] {
    const mapping: Record<string, string[]> = {
        'cotton': ['cotton'],
        'polyester': ['man-made', 'synthetic'],
        'synthetic': ['man-made', 'synthetic'],
        'wool': ['wool'],
        'silk': ['silk'],
        'men': ["men's", 'men', 'male'],
        "men's": ["men's", 'men'],
        'women': ["women's", 'women', 'female'],
        "women's": ["women's", 'women'],
        'boy': ["boys'", 'boy'],
        "boys'": ["boys'", 'boy'],
        'girl': ["girls'", 'girl'],
        "girls'": ["girls'", 'girl'],
        't-shirt': ['t-shirt', 'tshirt'],
        'tshirt': ['t-shirt', 'tshirt'],
        'underwear': ['underwear'],
        'thermal': ['thermal'],
    };
    
    return mapping[keyword.toLowerCase()] || [keyword.toLowerCase()];
}

/**
 * Check if material description matches user keywords
 */
function checkMaterialRelevance(description: string, keywords: ExtractedKeywords): boolean {
    // If user didn't specify material, all materials are relevant
    if (!keywords.hasMaterial) return true;
    
    const descLower = description.toLowerCase();
    
    // Check if description mentions any of the user's materials
    for (const mat of keywords.materials) {
        const terms = mapToHtsTerms(mat);
        for (const term of terms) {
            if (descLower.includes(term)) return true;
        }
    }
    
    return false;
}

/**
 * Check if a heading (by HTS code) is relevant to the product type
 * This uses the heading number to determine product category
 */
function checkHeadingRelevance(htsCode: string, category: CategoryIdentification): boolean {
    // If we don't have expected headings, all headings are potentially relevant
    if (!category.headings || category.headings.length === 0) return true;
    
    // Extract the 4-digit heading from the HTS code (e.g., "6109" from "6109.10.00.04")
    const heading4 = htsCode.replace(/\./g, '').substring(0, 4);
    
    // Check if this code matches any of our expected headings
    for (const expected of category.headings) {
        const expectedClean = expected.replace(/\./g, '');
        if (heading4 === expectedClean || heading4.startsWith(expectedClean) || expectedClean.startsWith(heading4)) {
            return true;
        }
    }
    
    // If no match, this heading is not relevant to the product type
    return false;
}

/**
 * Check overall group relevance: both material AND heading must match
 */
function checkGroupRelevance(
    description: string,
    htsCode: string,
    keywords: ExtractedKeywords,
    category: CategoryIdentification
): { isRelevant: boolean; reason: string } {
    const materialMatch = checkMaterialRelevance(description, keywords);
    const headingMatch = checkHeadingRelevance(htsCode, category);
    
    if (materialMatch && headingMatch) {
        return { isRelevant: true, reason: 'Matches your product' };
    }
    if (materialMatch && !headingMatch) {
        return { isRelevant: false, reason: 'Material match only' };
    }
    if (!materialMatch && headingMatch) {
        return { isRelevant: false, reason: 'Different material' };
    }
    return { isRelevant: false, reason: '' };
}

/**
 * Count selectable (10-digit) codes in tree
 */
function countSelectableCodes(nodes: HtsTreeNode[]): number {
    let count = 0;
    for (const node of nodes) {
        if (node.isSelectable) count++;
        count += countSelectableCodes(node.children);
    }
    return count;
}

/**
 * Find top matching codes across all material groups
 */
function findTopMatches(groups: HtsMaterialGroup[], limit: number): HtsTreeNode[] {
    const allSelectable: HtsTreeNode[] = [];
    
    // Collect all selectable codes
    function collectSelectable(nodes: HtsTreeNode[]) {
        for (const node of nodes) {
            if (node.isSelectable) allSelectable.push(node);
            collectSelectable(node.children);
        }
    }
    
    for (const group of groups) {
        collectSelectable(group.children);
    }
    
    // Sort by relevance, then by rate
    allSelectable.sort((a, b) => {
        if (a.relevanceScore !== b.relevanceScore) return b.relevanceScore - a.relevanceScore;
        return (a.baseRate || 0) - (b.baseRate || 0);
    });
    
    // Mark top matches
    const topMatches = allSelectable.slice(0, limit);
    for (const match of topMatches) {
        match.isTopMatch = true;
    }
    
    return topMatches;
}

/**
 * Extract human-readable criteria from HTS description
 */
function extractCriteria(description: string): string {
    // First clean stat codes
    let criteria = cleanStatCode(description);
    
    // Remove common HTS boilerplate
    criteria = criteria
        .replace(/^(other|nesoi|thereof|articles of)\s*/i, '')
        .replace(/\s*,\s*nesoi\s*/i, '')
        .replace(/\s*,\s*other\s*/i, '');
    
    // Capitalize first letter
    if (criteria.length > 0) {
        criteria = criteria.charAt(0).toUpperCase() + criteria.slice(1);
    }
    
    // Truncate if too long
    if (criteria.length > 120) {
        criteria = criteria.substring(0, 117) + '...';
    }
    
    return criteria || 'See HTS description';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3: ANSWER (SPECIFIC RESULT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build ANSWER phase response with specific result
 */
async function buildAnswerResponse(
    category: CategoryIdentification,
    ambiguity: AmbiguityAnalysis,
    countryAdditions: CountryTariffSummary,
    answers: Record<string, string>,
    input: ClassificationInputV2
): Promise<AnswerResponse> {
    // Apply answers to narrow down codes
    const { selectedCode, matchedCriteria, confidence } = selectCodeFromAnswers(
        ambiguity,
        answers,
        category
    );
    
    // Get duty rate
    let baseRate = parseDutyRate(selectedCode?.baseDutyRate) || 0;
    if (!selectedCode?.baseDutyRate || selectedCode.baseDutyRate === 'See HTS') {
        const inherited = await getHTSDutyRate(selectedCode?.htsCode || '');
        if (inherited) {
            baseRate = parseDutyRate(inherited.general) || 0;
        }
    }
    
    // Calculate duty example
    let perUnitExample: AnswerResponse['dutyBreakdown']['perUnitExample'];
    if (input.unitValue) {
        const totalRate = baseRate + countryAdditions.total;
        perUnitExample = {
            value: input.unitValue,
            duty: Math.round(input.unitValue * totalRate) / 100,
        };
    }
    
    // Get alternatives (other codes that were close)
    const alternatives = ambiguity.possibleCodes
        .filter(pc => pc.htsCode !== selectedCode?.htsCode)
        .slice(0, 3)
        .map(pc => ({
            htsCode: pc.htsCode,
            description: pc.description,
            criteria: extractCriteria(pc.description),
            baseRate: parseDutyRate(pc.baseDutyRate) || 0,
            baseRateFormatted: pc.baseDutyRate,
            isLowest: false,
        }));
    
    // Get hierarchy
    const hierarchy = await buildHierarchy(selectedCode?.htsCode || '', selectedCode?.description || '');
    
    return {
        phase: 'result',
        htsCode: {
            code: selectedCode?.htsCode || '',
            description: selectedCode?.description || '',
            chapter: (selectedCode?.htsCode || '').substring(0, 2),
            heading: (selectedCode?.htsCode || '').substring(0, 4),
        },
        confidence,
        matchedCriteria,
        dutyBreakdown: {
            baseRate,
            baseRateFormatted: baseRate > 0 ? `${baseRate}%` : 'Free',
            additions: countryAdditions.breakdown,
            totalRate: baseRate + countryAdditions.total,
            perUnitExample,
        },
        alternatives,
        hierarchy,
    };
}

/**
 * Select the best code based on user answers
 */
function selectCodeFromAnswers(
    ambiguity: AmbiguityAnalysis,
    answers: Record<string, string>,
    category: CategoryIdentification
): {
    selectedCode: AmbiguityAnalysis['possibleCodes'][0] | null;
    matchedCriteria: MatchedCriterion[];
    confidence: number;
} {
    const matchedCriteria: MatchedCriterion[] = [];
    let confidence = 70;
    
    // Apply answers to variables
    for (const variable of ambiguity.decisionVariables) {
        if (answers[variable.id]) {
            matchedCriteria.push({
                variable: variable.id,
                value: answers[variable.id],
                source: 'user_answer',
            });
            confidence += 5;
        } else if (variable.detectedValue && variable.detectedSource === 'user_input') {
            matchedCriteria.push({
                variable: variable.id,
                value: variable.detectedValue,
                source: 'parsed',
            });
            confidence += 3;
        } else if (variable.detectedValue) {
            matchedCriteria.push({
                variable: variable.id,
                value: variable.detectedValue,
                source: 'assumed',
            });
        }
    }
    
    // Filter codes that match all answered variables
    let matchingCodes = ambiguity.possibleCodes;
    
    for (const [variableId, answerValue] of Object.entries(answers)) {
        const variable = ambiguity.decisionVariables.find(v => v.id === variableId);
        if (!variable) continue;
        
        const matchingOption = variable.options?.find(o => o.value === answerValue);
        if (matchingOption) {
            matchingCodes = matchingCodes.filter(code => 
                matchingOption.leadsToCodes.includes(code.htsCode)
            );
        }
    }
    
    // If we narrowed to 1, high confidence
    if (matchingCodes.length === 1) {
        confidence = Math.min(98, confidence + 15);
    } else if (matchingCodes.length <= 3) {
        confidence = Math.min(90, confidence + 5);
    }
    
    // Select the best remaining code
    const selectedCode = matchingCodes[0] || ambiguity.likelyCode || ambiguity.possibleCodes[0] || null;
    
    return { selectedCode, matchedCriteria, confidence };
}

/**
 * Build HTS hierarchy for display
 */
async function buildHierarchy(htsCode: string, description: string): Promise<HtsHierarchyLevel[]> {
    if (!htsCode) return [];
    
    const levels: HtsHierarchyLevel[] = [];
    const clean = htsCode.replace(/\./g, '');
    
    // HTS code structure:
    // - Chapter: 2 digits (61)
    // - Heading: 4 digits (6105)
    // - Subheading: 6 digits (6105.90)
    // - Tariff line: 8 digits (6105.90.80)
    // - Statistical: 10 digits (6105.90.80.10)
    
    // Fetch from USITC API - note: API only returns leaf codes, not intermediate headers
    const hierarchyData: Map<string, string> = new Map();
    try {
        const results = await searchHTSCodes(clean.substring(0, 4));
        for (const r of results) {
            hierarchyData.set(r.htsno, r.description);
            hierarchyData.set(r.htsno.replace(/\./g, ''), r.description);
        }
    } catch (e) {
        console.log('[Hierarchy] Could not fetch from API');
    }
    
    // Chapter - always show (we have hardcoded descriptions)
    if (clean.length >= 2) {
        levels.push({
            code: clean.substring(0, 2),
            description: CHAPTER_DESCRIPTIONS[clean.substring(0, 2)] || `Chapter ${clean.substring(0, 2)}`,
            level: 'chapter',
        });
    }
    
    // 4-digit heading - check if we have a real description
    if (clean.length >= 4) {
        const code4 = clean.substring(0, 4);
        const desc4 = hierarchyData.get(code4);
        if (desc4) {
            levels.push({
                code: code4,
                description: desc4,
                level: 'heading',
            });
        }
    }
    
    // 6-digit subheading - only show if we have a real description
    if (clean.length >= 6) {
        const code6formatted = `${clean.substring(0, 4)}.${clean.substring(4, 6)}`;
        const desc6 = hierarchyData.get(code6formatted) || hierarchyData.get(clean.substring(0, 6));
        if (desc6) {
            levels.push({
                code: code6formatted,
                description: desc6,
                level: 'subheading',
            });
        }
    }
    
    // 8-digit tariff line - only show if we have a real description
    if (clean.length >= 8) {
        const code8formatted = `${clean.substring(0, 4)}.${clean.substring(4, 6)}.${clean.substring(6, 8)}`;
        const desc8 = hierarchyData.get(code8formatted) || hierarchyData.get(clean.substring(0, 8));
        if (desc8) {
            levels.push({
                code: code8formatted,
                description: desc8,
                level: 'tariff',
            });
        }
    }
    
    // 10-digit full code - always show (we have the description from classification)
    if (clean.length >= 10) {
        levels.push({
            code: htsCode,
            description: description,
            level: 'full',
        });
    }
    
    return levels;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Prioritize variables by rate impact
 */
function prioritizeVariables(
    variables: DecisionVariable[],
    codes: AmbiguityAnalysis['possibleCodes']
): ClassificationVariable[] {
    return variables
        .map(v => {
            // Calculate rate swing for this variable
            let minRate = Infinity;
            let maxRate = -Infinity;
            
            for (const option of v.options || []) {
                for (const codeId of option.leadsToCodes) {
                    const code = codes.find(c => c.htsCode === codeId);
                    if (code) {
                        const rate = parseDutyRate(code.baseDutyRate);
                        if (rate !== null) {
                            minRate = Math.min(minRate, rate);
                            maxRate = Math.max(maxRate, rate);
                        }
                    }
                }
            }
            
            const rateSwing = maxRate > -Infinity ? maxRate - minRate : 0;
            const impact: 'high' | 'medium' | 'low' = 
                rateSwing >= 10 ? 'high' : rateSwing >= 5 ? 'medium' : 'low';
            
            return {
                id: v.id,
                name: v.name,
                question: v.question,
                impact,
                rateSwing,
                options: (v.options || []).map(o => ({
                    value: o.value,
                    label: o.label,
                    hint: o.description,
                    leadsToCodes: o.leadsToCodes,
                })),
                detectedValue: v.detectedValue,
                detectedSource: v.detectedSource,
            };
        })
        .sort((a, b) => b.rateSwing - a.rateSwing); // Highest impact first
}

/**
 * Parse duty rate string to number
 */
function parseDutyRate(rate: string | undefined): number | null {
    if (!rate) return null;
    if (rate.toLowerCase() === 'free') return 0;
    
    const match = rate.match(/([\d.]+)\s*%/);
    if (match) {
        return parseFloat(match[1]);
    }
    
    return null;
}

/**
 * Chapter descriptions for hierarchy display
 */
const CHAPTER_DESCRIPTIONS: Record<string, string> = {
    '39': 'Plastics and articles thereof',
    '40': 'Rubber and articles thereof',
    '42': 'Articles of leather; saddlery; travel goods',
    '61': 'Articles of apparel and clothing accessories, knitted or crocheted',
    '62': 'Articles of apparel and clothing accessories, not knitted or crocheted',
    '64': 'Footwear, gaiters and the like',
    '71': 'Natural or cultured pearls, precious stones, jewelry',
    '72': 'Iron and steel',
    '73': 'Articles of iron or steel',
    '82': 'Tools, implements, cutlery, spoons and forks, of base metal',
    '84': 'Nuclear reactors, boilers, machinery and mechanical appliances',
    '85': 'Electrical machinery and equipment',
    '94': 'Furniture; bedding, mattresses; lamps',
    '95': 'Toys, games and sports requisites',
};

// Note: classifyV2 and parseDutyRate are exported inline above

