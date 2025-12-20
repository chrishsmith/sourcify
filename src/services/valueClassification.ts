/**
 * Value-Dependent Classification Service
 * 
 * Many HTS codes have different rates based on product value, weight, or other metrics.
 * This service detects these cases and returns ALL applicable codes with clear guidance.
 * 
 * Examples:
 * - Guitars: Under $100 = 9202.90.20 (4.5%), Over $100 = 9202.90.40 (8.7%)
 * - Footwear: Often valued per pair thresholds
 * - Textiles: Often valued per dozen/kg thresholds
 */

import { searchHTSCodes, type HTSSearchResult } from './usitc';

export interface ValueThreshold {
    condition: string;          // e.g., "valued not over $100 each"
    htsCode: string;
    description: string;
    dutyRate: string;
    minValue?: number;
    maxValue?: number;
    unit?: string;              // e.g., "each", "per pair", "per kg"
}

export interface ValueDependentClassification {
    productType: string;        // e.g., "Guitars"
    baseHeading: string;        // e.g., "9202.90"
    headingDescription: string; // e.g., "Other string musical instruments"
    isValueDependent: boolean;
    thresholds: ValueThreshold[];
    guidance: string;           // User-friendly explanation
    question?: string;          // Question to ask user
}

/**
 * Patterns that indicate value-dependent classification
 */
const VALUE_PATTERNS = [
    /valued (?:not )?over \$?([\d,.]+)/i,
    /valued (?:not )?(?:more|less) than \$?([\d,.]+)/i,
    /valued at (?:not )?(?:more|less) than \$?([\d,.]+)/i,
    /under \$?([\d,.]+)/i,
    /over \$?([\d,.]+)/i,
    /exceeding \$?([\d,.]+)/i,
    /not exceeding \$?([\d,.]+)/i,
];

const WEIGHT_PATTERNS = [
    /weighing (?:not )?(?:over|more than) ([\d,.]+)\s*(kg|g|lb|oz)/i,
    /weighing (?:not )?(?:under|less than) ([\d,.]+)\s*(kg|g|lb|oz)/i,
    /weight (?:not )?exceed(?:ing)? ([\d,.]+)\s*(kg|g|lb|oz)/i,
];

/**
 * Detect if a classification has value/weight thresholds and fetch all variants
 */
export async function detectValueDependentCodes(
    selectedCode: string,
    selectedDescription: string
): Promise<ValueDependentClassification | null> {
    // Check if the selected code has value/weight language
    const hasValueCondition = VALUE_PATTERNS.some(p => p.test(selectedDescription));
    const hasWeightCondition = WEIGHT_PATTERNS.some(p => p.test(selectedDescription));
    
    if (!hasValueCondition && !hasWeightCondition) {
        return null; // Not value-dependent
    }
    
    // Extract the base subheading (6 digits) to find sibling codes
    const cleanCode = selectedCode.replace(/\./g, '');
    const baseSubheading = cleanCode.substring(0, 6);
    
    console.log('[ValueClass] Detected value-dependent code:', selectedCode);
    console.log('[ValueClass] Searching siblings for subheading:', baseSubheading);
    
    // Search for all codes in the same subheading
    const siblingResults = await searchHTSCodes(baseSubheading);
    
    // Filter to only 10-digit codes in the same subheading
    const siblingCodes = siblingResults.filter(r => {
        const code = r.htsno.replace(/\./g, '');
        return code.startsWith(baseSubheading) && code.length === 10;
    });
    
    console.log('[ValueClass] Found', siblingCodes.length, 'sibling codes');
    
    // Parse each code to extract value thresholds
    const thresholds: ValueThreshold[] = [];
    let productType = '';
    let headingDescription = '';
    
    for (const code of siblingCodes) {
        const threshold = parseValueThreshold(code);
        if (threshold) {
            thresholds.push(threshold);
        }
        
        // Try to extract product type from description
        if (!productType) {
            productType = extractProductType(code.description);
        }
    }
    
    // Get heading description
    const headingCode = baseSubheading.substring(0, 4);
    const headingResults = await searchHTSCodes(headingCode);
    const headingMatch = headingResults.find(r => 
        r.htsno.replace(/\./g, '').length <= 6
    );
    if (headingMatch) {
        headingDescription = headingMatch.description;
    }
    
    if (thresholds.length <= 1) {
        return null; // Only one code, no decision needed
    }
    
    // Sort thresholds by value (ascending)
    thresholds.sort((a, b) => (a.maxValue || 999999) - (b.maxValue || 999999));
    
    // Generate user guidance
    const guidance = generateGuidance(productType, thresholds, hasValueCondition ? 'value' : 'weight');
    const question = generateQuestion(productType, thresholds, hasValueCondition ? 'value' : 'weight');
    
    return {
        productType: productType || 'This product',
        baseHeading: formatCode(baseSubheading),
        headingDescription,
        isValueDependent: true,
        thresholds,
        guidance,
        question,
    };
}

/**
 * Find all value-dependent codes for a product type
 * Use this to proactively show multiple options
 */
export async function findAllValueVariants(
    htsCode: string
): Promise<ValueThreshold[]> {
    const cleanCode = htsCode.replace(/\./g, '');
    const baseSubheading = cleanCode.substring(0, 6);
    
    const results = await searchHTSCodes(baseSubheading);
    const variants: ValueThreshold[] = [];
    
    for (const result of results) {
        const code = result.htsno.replace(/\./g, '');
        if (code.startsWith(baseSubheading) && code.length === 10) {
            const threshold = parseValueThreshold(result);
            if (threshold) {
                variants.push(threshold);
            }
        }
    }
    
    return variants.sort((a, b) => (a.maxValue || 999999) - (b.maxValue || 999999));
}

/**
 * Parse value/weight threshold from an HTS description
 * IMPORTANT: We ALWAYS provide duty rate - never tell users to go elsewhere
 */
function parseValueThreshold(code: HTSSearchResult): ValueThreshold | null {
    const desc = code.description;
    
    // Parse the duty rate - ALWAYS provide a value
    const dutyRate = parseDutyRate(code.general);
    
    // Try value patterns
    for (const pattern of VALUE_PATTERNS) {
        const match = desc.match(pattern);
        if (match) {
            const value = parseFloat(match[1].replace(/,/g, ''));
            const isUnder = /not over|under|less than|not exceeding/i.test(desc);
            
            return {
                condition: extractConditionPhrase(desc),
                htsCode: code.htsno,
                description: desc,
                dutyRate,
                minValue: isUnder ? undefined : value,
                maxValue: isUnder ? value : undefined,
                unit: extractUnit(desc),
            };
        }
    }
    
    // Try weight patterns
    for (const pattern of WEIGHT_PATTERNS) {
        const match = desc.match(pattern);
        if (match) {
            const value = parseFloat(match[1].replace(/,/g, ''));
            const unit = match[2];
            const isUnder = /not over|under|less than|not exceeding/i.test(desc);
            
            return {
                condition: extractConditionPhrase(desc),
                htsCode: code.htsno,
                description: desc,
                dutyRate,
                minValue: isUnder ? undefined : value,
                maxValue: isUnder ? value : undefined,
                unit: unit,
            };
        }
    }
    
    // No value/weight condition, but still valid code
    if (desc.toLowerCase().includes('other')) {
        return {
            condition: 'Other (no value restriction)',
            htsCode: code.htsno,
            description: desc,
            dutyRate,
        };
    }
    
    return null;
}

/**
 * Parse and normalize duty rate from USITC API response
 * We NEVER tell users to go elsewhere - we are the source of truth
 */
function parseDutyRate(rawRate: string | null | undefined): string {
    // If no rate provided, indicate it's duty-free by default for household articles
    if (!rawRate || rawRate.trim() === '') {
        return 'Free'; // Most common case for empty rates
    }
    
    const rate = rawRate.trim();
    
    // Already looks like a proper rate
    if (rate.toLowerCase() === 'free') return 'Free';
    if (/%/.test(rate)) return rate;
    if (/\d+\.\d+¢/.test(rate)) return rate; // Specific duty like "2.5¢/kg"
    
    // Normalize percentage formats
    const percentMatch = rate.match(/^(\d+(?:\.\d+)?)\s*%?$/);
    if (percentMatch) {
        return `${percentMatch[1]}%`;
    }
    
    // Return whatever we have - it's better than nothing
    return rate || 'Free';
}

/**
 * Extract the condition phrase from description
 */
function extractConditionPhrase(desc: string): string {
    const patterns = [
        /(valued (?:not )?over \$?[\d,.]+[^,]*)/i,
        /(valued at (?:not )?(?:more|less) than \$?[\d,.]+[^,]*)/i,
        /(under \$?[\d,.]+[^,]*)/i,
        /(over \$?[\d,.]+[^,]*)/i,
        /(weighing (?:not )?(?:over|under|more than|less than) [\d,.]+\s*(?:kg|g|lb|oz)[^,]*)/i,
    ];
    
    for (const pattern of patterns) {
        const match = desc.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    
    return desc;
}

/**
 * Extract product type from description
 */
function extractProductType(desc: string): string {
    // Common product patterns
    const productPatterns = [
        /^(guitars?)/i,
        /^(violins?)/i,
        /^(pianos?)/i,
        /^(footwear)/i,
        /^(shoes?)/i,
        /^(t-?shirts?)/i,
        /^(sweaters?)/i,
    ];
    
    for (const pattern of productPatterns) {
        const match = desc.match(pattern);
        if (match) {
            return match[1].charAt(0).toUpperCase() + match[1].slice(1);
        }
    }
    
    // Extract first noun-like word
    const words = desc.split(/[,;:]/)[0].trim();
    return words || '';
}

/**
 * Extract unit from description
 */
function extractUnit(desc: string): string {
    if (/each/i.test(desc)) return 'each';
    if (/per pair/i.test(desc)) return 'per pair';
    if (/per dozen/i.test(desc)) return 'per dozen';
    if (/per kg/i.test(desc)) return 'per kg';
    if (/per lb/i.test(desc)) return 'per lb';
    return 'each';
}

/**
 * Generate user-friendly guidance
 */
function generateGuidance(productType: string, thresholds: ValueThreshold[], type: 'value' | 'weight'): string {
    const typeLabel = type === 'value' ? 'value' : 'weight';
    
    let guidance = `**${productType}** has different HTS codes based on ${typeLabel}:\n\n`;
    
    for (const t of thresholds) {
        guidance += `• **${t.htsCode}** — ${t.condition} → Duty: ${t.dutyRate}\n`;
    }
    
    guidance += `\nChoose the code that matches your product's ${typeLabel}.`;
    
    return guidance;
}

/**
 * Generate question to ask user
 */
function generateQuestion(productType: string, thresholds: ValueThreshold[], type: 'value' | 'weight'): string {
    if (type === 'value') {
        const values = thresholds
            .filter(t => t.maxValue || t.minValue)
            .map(t => t.maxValue || t.minValue);
        
        if (values.length > 0) {
            const threshold = values[0];
            return `What is the value of each ${productType.toLowerCase()}? (Is it over or under $${threshold}?)`;
        }
    }
    
    return `What is the ${type} of your ${productType.toLowerCase()}?`;
}

/**
 * Format HTS code with dots
 */
function formatCode(code: string): string {
    const clean = code.replace(/\./g, '');
    if (clean.length <= 4) return clean;
    if (clean.length <= 6) return `${clean.substring(0, 4)}.${clean.substring(4)}`;
    return `${clean.substring(0, 4)}.${clean.substring(4, 6)}.${clean.substring(6)}`;
}

/**
 * Given a value, select the correct HTS code from thresholds
 */
export function selectCodeByValue(
    thresholds: ValueThreshold[],
    value: number
): ValueThreshold | null {
    // Sort by maxValue (ascending), nulls last
    const sorted = [...thresholds].sort((a, b) => {
        if (a.maxValue === undefined && b.maxValue === undefined) return 0;
        if (a.maxValue === undefined) return 1;
        if (b.maxValue === undefined) return -1;
        return a.maxValue - b.maxValue;
    });
    
    for (const threshold of sorted) {
        if (threshold.maxValue !== undefined && value <= threshold.maxValue) {
            return threshold;
        }
        if (threshold.minValue !== undefined && value > threshold.minValue) {
            // This is an "over X" code, check if it's the last one
            const nextThreshold = sorted[sorted.indexOf(threshold) + 1];
            if (!nextThreshold || nextThreshold.maxValue === undefined) {
                return threshold;
            }
        }
    }
    
    // Return the "Other" category if no match
    return sorted.find(t => t.condition.toLowerCase().includes('other')) || sorted[sorted.length - 1];
}


