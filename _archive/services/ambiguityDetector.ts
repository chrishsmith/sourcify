/**
 * Ambiguity Detector Service
 * 
 * Detects when an HTS classification has multiple valid codes depending on
 * product specifications (material, value, dimensions, etc.)
 * 
 * This is the foundation for:
 * - Showing duty ranges when uncertain
 * - Generating targeted clarifying questions
 * - Making smart assumptions transparent
 * 
 * @module ambiguityDetector
 */

import { searchHTSCodes } from '@/services/usitc';
import { getHTSHierarchy } from '@/services/hts/hierarchy';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A decision variable that determines which HTS code applies
 */
export interface DecisionVariable {
    id: string;                          // 'blade_material', 'value_bracket', etc.
    name: string;                        // "Blade Material"
    type: 'select' | 'value' | 'boolean'; // Type of input needed
    question: string;                    // "What is the blade made of?"
    options?: VariableOption[];          // For select type
    threshold?: number;                  // For value type (e.g., $0.60/dozen)
    thresholdUnit?: string;              // 'per_dozen', 'per_kg', etc.
    detectedValue?: string;              // If we extracted this from user input
    detectedSource?: 'user_input' | 'assumed'; // How we know this
    confidence: number;                  // How confident we are in detected value
}

export interface VariableOption {
    value: string;                       // 'stainless_steel'
    label: string;                       // "Stainless Steel"
    description?: string;                // "Contains 12%+ chromium, resists rust"
    leadsToCodes: string[];              // ['8211.91.20', '8211.91.25']
}

/**
 * A possible HTS classification with its requirements
 */
export interface PossibleCode {
    htsCode: string;                     // '8211.91.25.00'
    description: string;                 // Full HTS description
    requirements: CodeRequirement[];     // What makes this code apply
    baseDutyRate: string;                // '6.4%' or 'Free'
    estimatedTotalDuty?: number;         // Including 301, etc.
    isLikely: boolean;                   // Based on user input
    isConfirmed: boolean;                // All requirements verified
    matchReason?: string;                // Why this might be the one
}

export interface CodeRequirement {
    variableId: string;                  // 'blade_material'
    requiredValue: string | string[];    // 'stainless_steel' or ['stainless', 'ss']
    met: boolean;                        // Did user input satisfy this?
    source: 'user_input' | 'assumed' | 'unknown';
}

/**
 * Result of ambiguity analysis
 */
export interface AmbiguityAnalysis {
    // Is this classification ambiguous?
    isAmbiguous: boolean;
    ambiguityLevel: 'none' | 'low' | 'medium' | 'high';
    
    // The heading we identified
    heading: string;                     // '8211.91'
    headingDescription: string;          // "Table knives, kitchen knives..."
    
    // All possible codes under this heading
    possibleCodes: PossibleCode[];
    
    // Variables that determine which code
    decisionVariables: DecisionVariable[];
    
    // Questions to ask (only unresolved variables)
    questionsToAsk: DecisionVariable[];
    
    // Best guess based on available info
    likelyCode: PossibleCode | null;
    
    // Duty range across all possibilities
    dutyRange: {
        min: number;
        max: number;
        minCode: string;
        maxCode: string;
    };
    
    // What we assumed
    assumptions: {
        variableId: string;
        variableName: string;
        assumedValue: string;
        reason: string;
    }[];
    
    // Overall confidence
    confidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC PATTERN DETECTION
// Instead of hardcoding materials, we analyze HTS descriptions to find what varies
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Common dimension categories that HTS codes split on
 * We use these to categorize detected variations, not to hardcode options
 */
const DIMENSION_CATEGORIES = {
    // Split material into specific sub-categories for better questions
    bladeMaterial: {
        keywords: ['stainless steel', 'carbon steel', 'high carbon', 'ceramic blade', 'steel blade', 'blade of'],
        question: 'What is the blade material?',
        icon: '🔪',
    },
    handleMaterial: {
        keywords: ['handle of wood', 'handles of wood', 'wooden handle', 'handle of rubber', 'handles of rubber', 'handle of plastic', 'handles of plastic', 'with handle', 'with handles'],
        question: 'What is the handle material?',
        icon: '🪵',
    },
    plating: {
        keywords: ['silver-plated', 'silverplated', 'gold-plated', 'goldplated', 'plated with', 'clad with'],
        question: 'What is the plating/finish?',
        icon: '✨',
    },
    material: {
        // Generic material - only used if not blade/handle/plating specific
        keywords: ['steel', 'metal', 'plastic', 'rubber', 'wood', 'cotton', 'polyester', 'ceramic', 'glass', 'leather', 'textile', 'aluminum', 'copper', 'iron', 'titanium', 'brass', 'bronze', 'nickel', 'zinc', 'gold', 'silver', 'precious', 'base metal', 'alloy', 'stainless', 'carbon', 'synthetic', 'natural', 'organic', 'silk', 'wool', 'linen', 'nylon', 'acrylic', 'polycarbonate', 'fiberglass', 'concrete', 'stone', 'marble', 'granite', 'paper', 'cardboard'],
        question: 'What is the primary material?',
        icon: '🔧',
    },
    value: {
        keywords: ['over', 'not over', 'exceeding', 'valued', 'value', 'under', 'less than', 'more than', 'price', 'cost'],
        question: 'What is the unit value?',
        icon: '💰',
    },
    size: {
        keywords: ['length', 'width', 'height', 'diameter', 'size', 'dimension', 'inch', 'cm', 'mm', 'meter', 'feet', 'ft', 'small', 'medium', 'large', 'under', 'over', 'not exceeding', 'blade length', 'overall length'],
        question: 'What are the dimensions?',
        icon: '📏',
    },
    weight: {
        keywords: ['kg', 'gram', 'pound', 'lb', 'oz', 'ounce', 'weight', 'mass', 'heavy', 'light'],
        question: 'What is the weight?',
        icon: '⚖️',
    },
    count: {
        keywords: ['dozen', 'gross', 'pair', 'set', 'piece', 'unit', 'each', 'per', 'count', 'number', 'single', 'multiple', 'assorted'],
        question: 'What is the quantity/packaging?',
        icon: '🔢',
    },
    use: {
        keywords: ['kitchen', 'table', 'industrial', 'commercial', 'household', 'domestic', 'professional', 'consumer', 'medical', 'surgical', 'agricultural', 'automotive', 'marine', 'aviation', 'military', 'sports', 'recreational', 'outdoor', 'indoor'],
        question: 'What is the intended use?',
        icon: '🎯',
    },
    power: {
        keywords: ['electric', 'manual', 'powered', 'battery', 'cordless', 'corded', 'ac', 'dc', 'volt', 'watt', 'amp', 'motor', 'hand-operated', 'mechanical'],
        question: 'Is it powered or manual?',
        icon: '⚡',
    },
    construction: {
        keywords: ['fixed', 'folding', 'retractable', 'telescoping', 'adjustable', 'permanent', 'removable', 'assembled', 'unassembled', 'kit', 'parts', 'complete', 'partial', 'serrated', 'smooth', 'blade'],
        question: 'What is the construction type?',
        icon: '🔨',
    },
    finish: {
        keywords: ['plated', 'coated', 'painted', 'lacquered', 'polished', 'matte', 'chrome', 'nickel', 'gold', 'silver', 'enamel', 'anodized', 'raw', 'unfinished', 'treated', 'untreated'],
        question: 'What is the finish/coating?',
        icon: '✨',
    },
    origin: {
        keywords: ['handmade', 'machine-made', 'manufactured', 'hand-forged', 'cast', 'molded', 'extruded', 'stamped', 'welded', 'assembled'],
        question: 'How is it manufactured?',
        icon: '🏭',
    },
    demographic: {
        keywords: ["men's", "women's", "boys'", "girls'", "infants'", "children's", 'mens', 'womens', 'boys', 'girls', 'infant', 'children', 'unisex', 'adult', 'youth', 'toddler', 'baby'],
        question: 'Who is this product for?',
        icon: '👥',
    },
    garmentType: {
        keywords: ['t-shirt', 'tshirt', 'shirt', 'blouse', 'sweater', 'pullover', 'cardigan', 'vest', 'jacket', 'coat', 'pants', 'trousers', 'shorts', 'skirt', 'dress', 'underwear', 'undershirt', 'undershirts', 'thermal', 'tank top', 'sweatshirt', 'hoodie', 'sleepwear', 'nightwear', 'pajamas', 'briefs', 'boxers', 'bra', 'panties', 'socks', 'stockings'],
        question: 'What type of garment is this?',
        icon: '👕',
    },
};

// Patterns to extract numeric thresholds from HTS descriptions
const VALUE_THRESHOLD_PATTERN = /(?:not\s+over|over|exceeding|valued?\s+(?:not\s+)?(?:over|under)?)\s*\$?([\d,.]+)/gi;
const SIZE_THRESHOLD_PATTERN = /(?:not\s+over|over|exceeding|under|less than|more than)\s*([\d,.]+)\s*(cm|mm|inch|in|feet|ft|meter|m)\b/gi;
const WEIGHT_THRESHOLD_PATTERN = /(?:not\s+over|over|exceeding|under)\s*([\d,.]+)\s*(kg|g|gram|lb|pound|oz|ounce)\b/gi;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ANALYSIS FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Analyze a classification for ambiguity
 * 
 * @param heading - The 4 or 6 digit heading identified (e.g., '8211.91')
 * @param productDescription - User's product description
 * @param material - User-provided material
 * @param unitValue - User-provided unit value
 * @param countryOfOrigin - For duty calculation
 */
export async function analyzeAmbiguity(
    heading: string,
    productDescription: string,
    material?: string,
    unitValue?: number,
    countryOfOrigin?: string
): Promise<AmbiguityAnalysis> {
    console.log('[Ambiguity] Analyzing heading:', heading);
    
    // Step 1: Get all codes under this heading
    const allCodes = await fetchCodesUnderHeading(heading);
    console.log('[Ambiguity] Found', allCodes.length, 'codes under heading');
    
    if (allCodes.length <= 1) {
        // No ambiguity - only one code
        return createUnambiguousResult(allCodes[0], heading, productDescription);
    }
    
    // Step 2: Extract decision variables from the HTS descriptions
    const decisionVariables = extractDecisionVariables(allCodes, productDescription, material, unitValue);
    console.log('[Ambiguity] Decision variables:', decisionVariables.map(v => v.id));
    
    // Step 3: Match user input to each possible code
    const possibleCodes = matchCodesToInput(allCodes, decisionVariables, productDescription, material, unitValue);
    
    // Step 4: Identify which questions still need answers
    // IMPORTANT: Show ALL questions that have multiple options, even if we detected a value
    // The UI will pre-select the detected answer but still allow the user to change it
    // This helps users see all their options and catches edge cases
    const questionsToAsk = decisionVariables.filter(v => {
        // Always show questions with multiple options
        if (v.options && v.options.length >= 2) return true;
        // Show value questions if no value detected
        if (v.type === 'value' && !v.detectedValue) return true;
        // Skip if we have very high confidence from explicit user input
        if (v.detectedSource === 'user_input' && v.confidence >= 95) return false;
        return true;
    });
    
    // Step 5: Calculate duty range
    const dutyRange = calculateDutyRange(possibleCodes, countryOfOrigin);
    
    // Step 6: Determine likely code
    const likelyCode = possibleCodes.find(c => c.isLikely) || possibleCodes[0];
    
    // Step 7: Compile assumptions made
    const assumptions = decisionVariables
        .filter(v => v.detectedSource === 'assumed')
        .map(v => ({
            variableId: v.id,
            variableName: v.name,
            assumedValue: v.detectedValue || 'unknown',
            reason: getAssumptionReason(v),
        }));
    
    // Step 8: Calculate ambiguity level
    const ambiguityLevel = calculateAmbiguityLevel(questionsToAsk, possibleCodes);
    
    // Step 9: Calculate overall confidence
    const confidence = calculateOverallConfidence(decisionVariables, likelyCode);
    
    return {
        isAmbiguous: ambiguityLevel !== 'none',
        ambiguityLevel,
        heading,
        headingDescription: allCodes[0]?.parentDescription || '',
        possibleCodes,
        decisionVariables,
        questionsToAsk,
        likelyCode,
        dutyRange,
        assumptions,
        confidence,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all 10-digit codes under a heading
 */
async function fetchCodesUnderHeading(heading: string): Promise<HTSCodeWithDetails[]> {
    // Search for the heading to get all children
    const results = await searchHTSCodes(heading);
    
    // Filter to only 10-digit codes and add details
    const fullCodes = results
        .filter(r => {
            const clean = r.htsno.replace(/\./g, '');
            return clean.length === 10 && r.htsno.startsWith(heading.replace(/\./g, '').substring(0, 4));
        })
        .map(r => ({
            htsCode: r.htsno,
            description: r.description,
            general: r.general || '',
            special: r.special || '',
            other: r.other || '',
            parentDescription: '', // Will be filled if we get hierarchy
        }));
    
    return fullCodes;
}

interface HTSCodeWithDetails {
    htsCode: string;
    description: string;
    general: string;
    special: string;
    other: string;
    parentDescription: string;
}

/**
 * Extract decision variables by analyzing HTS descriptions GENERICALLY
 * 
 * This function compares all HTS descriptions to find what differs between them,
 * then generates questions based on those actual differences.
 * No hardcoded material lists - everything is derived from the HTS data.
 */
function extractDecisionVariables(
    codes: HTSCodeWithDetails[],
    productDescription: string,
    material?: string,
    unitValue?: number
): DecisionVariable[] {
    const variables: DecisionVariable[] = [];
    const userInput = `${productDescription} ${material || ''}`.toLowerCase();
    
    if (codes.length <= 1) return variables;
    
    // Step 1: Extract all unique differentiating phrases from HTS descriptions
    const differentiators = findDifferentiatingPhrases(codes);
    console.log('[Ambiguity] Found differentiators:', differentiators);
    
    // Step 2: Group differentiators by category
    const groupedDiffs = groupByCategory(differentiators);
    console.log('[Ambiguity] Grouped differentiators:', Object.keys(groupedDiffs));
    
    // Step 3: For each category with multiple options, create a decision variable
    // Process ALL categories including "other" - questions should be generated dynamically from HTS data
    for (const [category, phrases] of Object.entries(groupedDiffs)) {
        // Filter to only meaningful phrases (not noise)
        const meaningfulPhrases = phrases.filter(p => isMeaningfulDifferentiator(p.phrase));
        if (meaningfulPhrases.length === 0) continue;
        
        // For specific material categories, we want to show even single options
        // because they're important for classification
        const isSpecificMaterialCategory = ['bladeMaterial', 'handleMaterial', 'plating'].includes(category);
        
        // Need at least 2 options normally, but allow 1 for specific categories
        if (meaningfulPhrases.length < 2 && !isSpecificMaterialCategory) continue;
        
        const variable = createDecisionVariable(
            category,
            meaningfulPhrases,
            codes,
            userInput,
            material,
            unitValue
        );
        
        if (variable && variable.options) {
            // For specific material categories with only 1 real option, 
            // add "Other / Standard" as second option
            if (isSpecificMaterialCategory && variable.options.length === 1) {
                const otherCodes = codes
                    .filter(c => !variable.options!.some(o => o.leadsToCodes.includes(c.htsCode)))
                    .map(c => c.htsCode);
                
                if (otherCodes.length > 0) {
                    variable.options.push({
                        value: 'standard',
                        label: category === 'plating' ? 'Not Plated / Standard' : 'Other / Standard',
                        description: 'Standard material (not specifically listed)',
                        leadsToCodes: otherCodes,
                    });
                }
            }
            
            if (variable.options.length >= 2) {
                // If too many options (>6), it's probably noise - skip or simplify
                if (variable.options.length > 6) {
                    // For value thresholds, just ask for the value directly
                    if (category === 'value') {
                        variable.type = 'value';
                        variable.question = 'What is the unit value?';
                        variable.options = undefined; // Will use threshold logic instead
                    } else {
                        // Too many options = probably noise, skip
                        continue;
                    }
                }
                variables.push(variable);
            }
        }
    }
    
    // Step 4: Detect numeric threshold variables (value, size, weight)
    const thresholdVariables = detectThresholdVariables(codes, userInput, unitValue);
    for (const tv of thresholdVariables) {
        // Don't duplicate if we already have this category
        if (!variables.find(v => v.id === tv.id)) {
            variables.push(tv);
        }
    }
    
    return variables;
}

/**
 * Find phrases that differentiate HTS codes from each other
 * by comparing their descriptions and finding unique terms
 */
function findDifferentiatingPhrases(codes: HTSCodeWithDetails[]): DifferentiatingPhrase[] {
    const phrases: DifferentiatingPhrase[] = [];
    const allDescriptions = codes.map(c => c.description.toLowerCase());
    
    // Tokenize and find words/phrases that appear in SOME but not ALL descriptions
    const wordCounts: Map<string, { count: number; codes: string[] }> = new Map();
    
    for (const code of codes) {
        const desc = code.description.toLowerCase();
        
        // Extract meaningful phrases (not just single words)
        const tokens = extractMeaningfulTokens(desc);
        const seen = new Set<string>();
        
        for (const token of tokens) {
            if (seen.has(token)) continue;
            seen.add(token);
            
            const existing = wordCounts.get(token);
            if (existing) {
                existing.count++;
                existing.codes.push(code.htsCode);
            } else {
                wordCounts.set(token, { count: 1, codes: [code.htsCode] });
            }
        }
    }
    
    // Find tokens that appear in some but not all (these are differentiators)
    const totalCodes = codes.length;
    for (const [token, data] of wordCounts.entries()) {
        // Skip common HTS filler words
        if (isFillerWord(token)) continue;
        
        // A differentiator appears in 1+ codes but not ALL codes
        if (data.count > 0 && data.count < totalCodes) {
            phrases.push({
                phrase: token,
                foundInCodes: data.codes,
                category: categorizePhrase(token),
            });
        }
    }
    
    return phrases;
}

interface DifferentiatingPhrase {
    phrase: string;
    foundInCodes: string[];
    category: string;
}

/**
 * Extract meaningful tokens from an HTS description
 * Includes multi-word phrases that matter (e.g., "stainless steel", "not over")
 */
function extractMeaningfulTokens(description: string): string[] {
    const tokens: string[] = [];
    const desc = description.toLowerCase();
    
    // Multi-word patterns to extract first (order matters)
    // These capture the MEANINGFUL decision points
    const multiWordPatterns = [
        // Handle material patterns (most specific first)
        /with\s+handles?\s+of\s+wood/gi,
        /with\s+handles?\s+of\s+rubber/gi,
        /with\s+handles?\s+of\s+plastic/gi,
        /with\s+handles?\s+of\s+[\w\s]+/gi,
        /wooden\s+handle/gi,
        /rubber\s+handle/gi,
        /plastic\s+handle/gi,
        
        // Plating patterns
        /silver-?plated/gi,
        /gold-?plated/gi,
        /plated\s+with\s+\w+/gi,
        /clad\s+with\s+\w+/gi,
        
        // Blade material patterns
        /stainless\s+steel\s+blade/gi,
        /carbon\s+steel\s+blade/gi,
        /ceramic\s+blade/gi,
        /blade\s+of\s+\w+/gi,
        
        // General material patterns
        /stainless steel/gi,
        /carbon steel/gi,
        /high carbon/gi,
        /base metal/gi,
        /precious metal/gi,
        /100%?\s*cotton/gi,
        /100%?\s*polyester/gi,
        /man-?made\s*fibers?/gi,
        /synthetic\s*fibers?/gi,
        
        // Value patterns
        /not over \$?[\d,.]+/gi,
        /over \$?[\d,.]+/gi,
        /not exceeding/gi,
        /valued not over/gi,
        /valued over/gi,
        /per dozen/gi,
        /per kg/gi,
        /per piece/gi,
        
        // Size patterns
        /blade length/gi,
        /overall length/gi,
        
        // Construction patterns
        /fixed blade/gi,
        /folding blade/gi,
        /having fixed blades/gi,
        /having folding blades/gi,
        /with handle/gi,
        /without handle/gi,
        /hand operated/gi,
        
        // Product type patterns (knives)
        /table knives/gi,
        /kitchen knives/gi,
        /butcher knives/gi,
        /pocket knives/gi,
        /pen knives/gi,
        
        // Apparel patterns - IMPORTANT for clothing
        /men'?s/gi,
        /women'?s/gi,
        /boys'?/gi,
        /girls'?/gi,
        /infants'?/gi,
        /children'?s/gi,
        /unisex/gi,
        /undershirts/gi,
        /underwear/gi,
        /t-?shirts?/gi,
        /sweatshirts?/gi,
        /tank tops?/gi,
        /pullovers?/gi,
        /cardigans?/gi,
        /thermal/gi,
        
        // Textile fiber patterns
        /wholly of cotton/gi,
        /containing.*cotton/gi,
        /containing.*polyester/gi,
        /chief weight/gi,
    ];
    
    let remaining = desc;
    for (const pattern of multiWordPatterns) {
        const matches = desc.match(pattern);
        if (matches) {
            for (const match of matches) {
                tokens.push(match.trim());
                remaining = remaining.replace(match, ' ');
            }
        }
    }
    
    // Now extract individual significant words
    const words = remaining.split(/[\s,;:()]+/);
    for (const word of words) {
        const cleaned = word.replace(/[^\w-]/g, '');
        if (cleaned.length >= 3 && !isFillerWord(cleaned)) {
            tokens.push(cleaned);
        }
    }
    
    return tokens;
}

/**
 * Check if a word is a common HTS filler that doesn't differentiate
 */
function isFillerWord(word: string): boolean {
    const w = word.toLowerCase();
    
    // Skip pure numbers or statistical suffixes
    if (/^\d+$/.test(w)) return true;
    if (/^\(\d+\)$/.test(word)) return true;
    
    const fillers = new Set([
        // Common words
        'the', 'and', 'for', 'with', 'without', 'other', 'others', 'any',
        'all', 'not', 'or', 'of', 'in', 'on', 'at', 'to', 'a', 'an',
        // HTS boilerplate
        'nesoi', 'nesi', 'thereof', 'thereto', 'therefrom', 'articles',
        'article', 'parts', 'part', 'made', 'described', 'heading',
        'subheading', 'chapter', 'note', 'notes', 'including', 'excluding',
        'whether', 'etc', 'similar', 'type', 'types', 'kinds', 'kind',
        // Too generic product parts
        'having', 'handle', 'handles', 'blade', 'blades', 'body', 'bodies',
        // Clothing description noise
        'hemmed', 'sleeves', 'sleeve', 'bottom', 'neckline', 'seam', 'center',
        'pockets', 'pocket', 'trim', 'neck', 'collar', 'cuff', 'cuffs',
        // Size/count noise
        'short', 'long', 'small', 'medium', 'large', 'round', 'square',
        // Description connectors
        'which', 'that', 'such', 'as', 'like', 'but', 'also', 'only',
    ]);
    return fillers.has(w);
}

/**
 * Check if a phrase is a meaningful differentiator worth asking about
 */
function isMeaningfulDifferentiator(phrase: string): boolean {
    const p = phrase.toLowerCase();
    
    // Skip pure numbers
    if (/^\d+$/.test(p)) return false;
    
    // Skip very short phrases
    if (p.length < 3) return false;
    
    // Skip statistical category numbers in parentheses
    if (/^\(\d+\)$/.test(phrase)) return false;
    
    // Skip generic HTS words that appear everywhere
    const genericHtsWords = new Set([
        'other', 'nesoi', 'nesi', 'parts', 'articles', 'thereof',
        'white', 'black', 'red', 'blue', 'green', 'colored', // colors are too granular
        'new', 'used', 'old',
    ]);
    if (genericHtsWords.has(p)) return false;
    
    // Skip words that are just descriptive but not decision points
    const descriptiveWords = new Set([
        'hemmed', 'mitered', 'seam', 'center', 'embroidery', 'trim',
        'printed', 'woven', 'knit', 'knitted', // too implementation-level
    ]);
    if (descriptiveWords.has(p)) return false;
    
    // Skip single words that are incomplete threshold references
    const incompleteThresholdWords = new Set([
        'valued', 'under', 'over', 'exceeding', 'not', 'overall', 'length',
        'overall length', // multi-word version
    ]);
    if (incompleteThresholdWords.has(p)) return false;
    
    return true;
}

/**
 * Categorize a phrase into a dimension category
 */
function categorizePhrase(phrase: string): string {
    const lowerPhrase = phrase.toLowerCase();
    
    // Check for numeric value patterns FIRST (most specific)
    if (/\$[\d,.]+/.test(phrase)) {
        return 'value';
    }
    if (/\d+\s*(cm|mm|inch|in|ft|m)\b/i.test(phrase)) {
        return 'size';
    }
    if (/\d+\s*(kg|g|lb|oz)\b/i.test(phrase)) {
        return 'weight';
    }
    
    // For value keywords, require word boundaries to avoid false matches
    // e.g., "undershirts" should NOT match "under"
    const valueKeywordsWithBoundary = ['\\bover\\b', '\\bnot over\\b', '\\bunder\\b(?!wear|shirt|pants|garment)', 
        '\\bexceeding\\b', '\\bvalued\\b', '\\bvalue\\b', '\\bless than\\b', '\\bmore than\\b'];
    for (const pattern of valueKeywordsWithBoundary) {
        if (new RegExp(pattern, 'i').test(lowerPhrase)) {
            return 'value';
        }
    }
    
    // CHECK SPECIFIC MATERIAL CATEGORIES FIRST (before generic "material")
    // Handle material - requires actual material words (wood, rubber, etc.)
    if (/handle|handles/i.test(lowerPhrase) && 
        /wood|rubber|plastic|metal|steel|bone|ivory|horn|mother.?of.?pearl/i.test(lowerPhrase)) {
        return 'handleMaterial';
    }
    // "Two-handled", "single-handled" etc describe knife CONSTRUCTION (design), not material
    if (/\b(one|two|three|single|double|multi|multiple)-?handle/i.test(lowerPhrase)) {
        return 'construction';
    }
    
    // Plating/finish
    if (/plated|clad/i.test(lowerPhrase)) {
        return 'plating';
    }
    
    // Blade material
    if (/blade/i.test(lowerPhrase) && /steel|ceramic|carbon|stainless/i.test(lowerPhrase)) {
        return 'bladeMaterial';
    }
    
    // Check other categories with word boundary awareness
    // Process in specific order: specific categories first, generic "material" last
    const categoryOrder = ['bladeMaterial', 'handleMaterial', 'plating', 'demographic', 'garmentType', 
                          'use', 'power', 'construction', 'finish', 'count', 'size', 'weight', 'origin', 'material'];
    
    for (const category of categoryOrder) {
        const config = DIMENSION_CATEGORIES[category as keyof typeof DIMENSION_CATEGORIES];
        if (!config) continue;
        
        for (const keyword of config.keywords) {
            // Use word boundary for short keywords to avoid substring matches
            if (keyword.length <= 5) {
                const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
                if (pattern.test(lowerPhrase)) {
                    return category;
                }
            } else if (lowerPhrase.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    
    return 'other';
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Group differentiating phrases by category
 */
function groupByCategory(phrases: DifferentiatingPhrase[]): Record<string, DifferentiatingPhrase[]> {
    const groups: Record<string, DifferentiatingPhrase[]> = {};
    
    for (const phrase of phrases) {
        const cat = phrase.category;
        if (!groups[cat]) {
            groups[cat] = [];
        }
        groups[cat].push(phrase);
    }
    
    return groups;
}

/**
 * Create a decision variable from a group of differentiating phrases
 */
function createDecisionVariable(
    category: string,
    phrases: DifferentiatingPhrase[],
    codes: HTSCodeWithDetails[],
    userInput: string,
    material?: string,
    unitValue?: number
): DecisionVariable | null {
    const categoryConfig = DIMENSION_CATEGORIES[category as keyof typeof DIMENSION_CATEGORIES];
    const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
    
    // Build options from the phrases
    const options: VariableOption[] = [];
    const seenPhrases = new Set<string>();
    
    for (const phrase of phrases) {
        // Normalize the phrase for deduplication
        const normalized = normalizePhrase(phrase.phrase);
        if (seenPhrases.has(normalized)) continue;
        seenPhrases.add(normalized);
        
        // Create a human-friendly label
        const label = createHumanLabel(phrase.phrase);
        
        options.push({
            value: normalized,
            label: label,
            description: `Found in: ${phrase.foundInCodes.map(c => c.slice(-7)).join(', ')}`,
            leadsToCodes: phrase.foundInCodes,
        });
    }
    
    // Add an "Other" option if we have specific options
    if (options.length > 0 && options.length < 5) {
        const otherCodes = codes
            .filter(c => !options.some(o => o.leadsToCodes.includes(c.htsCode)))
            .map(c => c.htsCode);
        
        if (otherCodes.length > 0) {
            options.push({
                value: 'other',
                label: 'Other / Not Listed',
                description: 'None of the above options apply',
                leadsToCodes: otherCodes,
            });
        }
    }
    
    if (options.length < 2) return null;
    
    // Try to detect value from user input
    const { detectedValue, detectedSource, confidence } = detectFromUserInput(
        options,
        userInput,
        category,
        material,
        unitValue
    );
    
    // Generate a meaningful question - use config if available, otherwise derive from the options
    let question = categoryConfig?.question;
    if (!question) {
        // For uncategorized ("other") phrases, generate question from the actual options
        if (options.length === 2 && options.some(o => o.value === 'other')) {
            // Binary choice - "Is it X or something else?"
            const specificOption = options.find(o => o.value !== 'other');
            question = `Is this ${specificOption?.label.toLowerCase()}?`;
        } else {
            // Multiple options - "Which applies to your product?"
            question = 'Which of these applies to your product?';
        }
    }
    
    return {
        id: `${category}_decision`,
        name: categoryName === 'Other' ? 'Product Specification' : categoryName,
        type: 'select',
        question,
        options,
        detectedValue,
        detectedSource,
        confidence,
    };
}

/**
 * Normalize a phrase for comparison/deduplication
 */
function normalizePhrase(phrase: string): string {
    let normalized = phrase
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '_')
        .trim();
    
    // Normalize common variations
    const normalizations: Record<string, string> = {
        'folding_blade': 'folding',
        'having_folding_blades': 'folding',
        'fixed_blade': 'fixed',
        'having_fixed_blades': 'fixed',
        'stainless_steel': 'stainless',
        'carbon_steel': 'carbon',
        'mens': 'men',
        'womens': 'women',
        'boys': 'boy',
        'girls': 'girl',
    };
    
    return normalizations[normalized] || normalized;
}

/**
 * Create a human-friendly label from a phrase
 */
function createHumanLabel(phrase: string): string {
    // Capitalize first letter of each word
    return phrase
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Try to detect which option the user's input matches
 */
function detectFromUserInput(
    options: VariableOption[],
    userInput: string,
    category: string,
    material?: string,
    unitValue?: number
): { detectedValue?: string; detectedSource?: 'user_input' | 'assumed'; confidence: number } {
    const inputLower = userInput.toLowerCase();
    
    // Try direct matching
    for (const option of options) {
        const valueLower = option.value.replace(/_/g, ' ');
        const labelLower = option.label.toLowerCase();
        
        if (inputLower.includes(valueLower) || inputLower.includes(labelLower)) {
            return {
                detectedValue: option.value,
                detectedSource: 'user_input',
                confidence: 90,
            };
        }
    }
    
    // Try fuzzy matching with synonyms
    for (const option of options) {
        const synonyms = getSynonyms(option.value);
        for (const syn of synonyms) {
            if (inputLower.includes(syn.toLowerCase())) {
                return {
                    detectedValue: option.value,
                    detectedSource: 'user_input',
                    confidence: 75,
                };
            }
        }
    }
    
    // If no match, assume the first option (most common pattern in HTS)
    // But only with low confidence
    if (options.length > 0 && options[0].value !== 'other') {
        return {
            detectedValue: options[0].value,
            detectedSource: 'assumed',
            confidence: 40,
        };
    }
    
    return { confidence: 0 };
}

/**
 * Get common synonyms for matching
 */
function getSynonyms(value: string): string[] {
    const synonymMap: Record<string, string[]> = {
        'stainless_steel': ['stainless', 'ss', '18/8', '18/10', '304', '316', 'inox'],
        'carbon_steel': ['carbon', 'high carbon', 'tool steel'],
        'plastic': ['polymer', 'polypropylene', 'polyethylene', 'abs', 'pvc', 'nylon', 'acrylic'],
        'rubber': ['silicone', 'latex', 'neoprene', 'elastomer'],
        'ceramic': ['zirconia', 'porcelain', 'clay'],
        'wood': ['wooden', 'bamboo', 'hardwood', 'rosewood', 'oak', 'maple'],
        'fixed_blade': ['fixed', 'non-folding', 'full tang'],
        'folding_blade': ['folding', 'pocket', 'foldable'],
        'kitchen': ['culinary', 'cooking', 'chef'],
        'table': ['dining', 'dinner', 'cutlery'],
    };
    
    return synonymMap[value] || [];
}

/**
 * Detect numeric threshold-based decision variables
 * (value brackets, size limits, weight limits)
 */
function detectThresholdVariables(
    codes: HTSCodeWithDetails[],
    userInput: string,
    unitValue?: number
): DecisionVariable[] {
    const variables: DecisionVariable[] = [];
    
    // Check for value thresholds
    const valueThresholds: { threshold: number; unit: string; codes: string[] }[] = [];
    
    for (const code of codes) {
        const match = code.description.match(/(?:not\s+over|over|exceeding|valued?\s+(?:not\s+)?(?:over|under)?)\s*\$?([\d,.]+)/i);
        if (match) {
            const threshold = parseFloat(match[1].replace(/,/g, ''));
            const unit = code.description.match(/per\s+(dozen|kg|piece|unit|each)/i)?.[1] || 'each';
            
            const existing = valueThresholds.find(v => v.threshold === threshold && v.unit === unit);
            if (existing) {
                existing.codes.push(code.htsCode);
            } else {
                valueThresholds.push({ threshold, unit, codes: [code.htsCode] });
            }
        }
    }
    
    // Create value threshold variable if found
    if (valueThresholds.length > 0) {
        const threshold = valueThresholds[0].threshold;
        const unit = valueThresholds[0].unit;
        
        const underCodes = codes.filter(c => 
            /not\s+over|under|not\s+exceeding/i.test(c.description) && 
            c.description.includes(threshold.toString())
        ).map(c => c.htsCode);
        
        const overCodes = codes.filter(c => 
            /\bover\b(?!\s*\$)|exceeding/i.test(c.description) && 
            !/not\s+over/i.test(c.description) &&
            c.description.includes(threshold.toString())
        ).map(c => c.htsCode);
        
        if (underCodes.length > 0 || overCodes.length > 0) {
            const options: VariableOption[] = [];
            
            if (underCodes.length > 0) {
                options.push({
                    value: 'under_threshold',
                    label: `At or under $${threshold} per ${unit}`,
                    leadsToCodes: underCodes,
                });
            }
            
            if (overCodes.length > 0) {
                options.push({
                    value: 'over_threshold',
                    label: `Over $${threshold} per ${unit}`,
                    leadsToCodes: overCodes,
                });
            }
            
            if (options.length >= 2) {
                // Try to detect from user input
                let detectedValue: string | undefined;
                let detectedSource: 'user_input' | 'assumed' | undefined;
                let confidence = 0;
                
                if (unitValue !== undefined) {
                    const compareValue = unit === 'dozen' ? unitValue * 12 : unitValue;
                    if (compareValue > threshold) {
                        detectedValue = 'over_threshold';
                        detectedSource = 'user_input';
                        confidence = 95;
                    } else {
                        detectedValue = 'under_threshold';
                        detectedSource = 'user_input';
                        confidence = 95;
                    }
                }
                
                variables.push({
                    id: 'value_bracket',
                    name: 'Value Bracket',
                    type: 'value',
                    question: `What is the unit value? (threshold: $${threshold} per ${unit})`,
                    options,
                    threshold,
                    thresholdUnit: `per_${unit}`,
                    detectedValue,
                    detectedSource,
                    confidence,
                });
            }
        }
    }
    
    return variables;
}

// Old hardcoded material/value detection functions removed
// Now using generic extractDecisionVariables() which analyzes actual HTS descriptions

/**
 * Match codes to user input based on decision variables
 */
function matchCodesToInput(
    codes: HTSCodeWithDetails[],
    variables: DecisionVariable[],
    productDescription: string,
    material?: string,
    unitValue?: number
): PossibleCode[] {
    return codes.map(code => {
        const requirements: CodeRequirement[] = [];
        let allRequirementsMet = true;
        let hasUnknownRequirements = false;
        
        for (const variable of variables) {
            // Find which value this code requires
            const option = variable.options?.find(o => 
                o.leadsToCodes.includes(code.htsCode)
            );
            
            if (option) {
                const met = variable.detectedValue === option.value;
                const source = variable.detectedSource || 'unknown';
                
                requirements.push({
                    variableId: variable.id,
                    requiredValue: option.value,
                    met,
                    source,
                });
                
                if (!met) allRequirementsMet = false;
                if (source === 'unknown') hasUnknownRequirements = true;
            }
        }
        
        return {
            htsCode: code.htsCode,
            description: code.description,
            requirements,
            baseDutyRate: code.general || 'See HTS',
            isLikely: allRequirementsMet && !hasUnknownRequirements,
            isConfirmed: allRequirementsMet && requirements.every(r => r.source === 'user_input'),
        };
    });
}

/**
 * Calculate duty range across all possible codes
 */
function calculateDutyRange(
    codes: PossibleCode[],
    countryOfOrigin?: string
): { min: number; max: number; minCode: string; maxCode: string } {
    let min = Infinity;
    let max = -Infinity;
    let minCode = '';
    let maxCode = '';
    
    for (const code of codes) {
        const rate = parseDutyRate(code.baseDutyRate);
        if (rate !== null) {
            if (rate < min) {
                min = rate;
                minCode = code.htsCode;
            }
            if (rate > max) {
                max = rate;
                maxCode = code.htsCode;
            }
        }
    }
    
    // Add Section 301 if from China
    const section301 = countryOfOrigin === 'CN' ? 25 : 0;
    
    return {
        min: min === Infinity ? 0 : min + section301,
        max: max === -Infinity ? 0 : max + section301,
        minCode,
        maxCode,
    };
}

/**
 * Parse duty rate string to number
 */
function parseDutyRate(rate: string): number | null {
    if (!rate) return null;
    if (rate.toLowerCase() === 'free') return 0;
    
    // Try to extract percentage
    const percentMatch = rate.match(/([\d.]+)\s*%/);
    if (percentMatch) {
        return parseFloat(percentMatch[1]);
    }
    
    return null;
}

/**
 * Calculate ambiguity level
 */
function calculateAmbiguityLevel(
    questionsToAsk: DecisionVariable[],
    possibleCodes: PossibleCode[]
): 'none' | 'low' | 'medium' | 'high' {
    if (possibleCodes.length <= 1) return 'none';
    if (questionsToAsk.length === 0) return 'none';
    
    const confirmedCodes = possibleCodes.filter(c => c.isConfirmed);
    if (confirmedCodes.length === 1) return 'none';
    
    const likelyCodes = possibleCodes.filter(c => c.isLikely);
    if (likelyCodes.length === 1 && questionsToAsk.every(q => q.confidence >= 80)) return 'low';
    
    if (questionsToAsk.length === 1) return 'medium';
    
    return 'high';
}

/**
 * Calculate overall confidence
 */
function calculateOverallConfidence(
    variables: DecisionVariable[],
    likelyCode: PossibleCode | null
): number {
    if (!likelyCode) return 30;
    if (likelyCode.isConfirmed) return 98;
    
    // Average confidence of all variables that led to this code
    const relevantVars = variables.filter(v => 
        v.detectedValue && 
        likelyCode.requirements.some(r => r.variableId === v.id && r.met)
    );
    
    if (relevantVars.length === 0) return 50;
    
    const avgConfidence = relevantVars.reduce((sum, v) => sum + v.confidence, 0) / relevantVars.length;
    
    // Penalize for assumptions
    const assumptionPenalty = variables.filter(v => v.detectedSource === 'assumed').length * 10;
    
    return Math.max(30, Math.min(95, avgConfidence - assumptionPenalty));
}

/**
 * Get explanation for why we assumed something
 */
function getAssumptionReason(variable: DecisionVariable): string {
    switch (variable.id) {
        case 'blade_material':
            if (variable.detectedValue === 'stainless_steel') {
                return 'Stainless steel is the most common material for this product type';
            }
            return 'Based on typical products in this category';
        case 'value_bracket':
            return 'Value not specified in description';
        default:
            return 'Not specified in description';
    }
}

/**
 * Create result for unambiguous classification
 */
function createUnambiguousResult(
    code: HTSCodeWithDetails | undefined,
    heading: string,
    productDescription: string
): AmbiguityAnalysis {
    if (!code) {
        return {
            isAmbiguous: false,
            ambiguityLevel: 'none',
            heading,
            headingDescription: '',
            possibleCodes: [],
            decisionVariables: [],
            questionsToAsk: [],
            likelyCode: null,
            dutyRange: { min: 0, max: 0, minCode: '', maxCode: '' },
            assumptions: [],
            confidence: 30,
        };
    }
    
    return {
        isAmbiguous: false,
        ambiguityLevel: 'none',
        heading,
        headingDescription: code.description,
        possibleCodes: [{
            htsCode: code.htsCode,
            description: code.description,
            requirements: [],
            baseDutyRate: code.general,
            isLikely: true,
            isConfirmed: true,
        }],
        decisionVariables: [],
        questionsToAsk: [],
        likelyCode: {
            htsCode: code.htsCode,
            description: code.description,
            requirements: [],
            baseDutyRate: code.general,
            isLikely: true,
            isConfirmed: true,
        },
        dutyRange: {
            min: parseDutyRate(code.general) || 0,
            max: parseDutyRate(code.general) || 0,
            minCode: code.htsCode,
            maxCode: code.htsCode,
        },
        assumptions: [],
        confidence: 95,
    };
}

// parseDutyRate and DIMENSION_CATEGORIES are exported inline above

