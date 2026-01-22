/**
 * Classification Validator Service
 * 
 * A semantic validation layer that catches misclassifications by detecting
 * logical inconsistencies between product descriptions and HTS code descriptions.
 * 
 * This acts as a "sanity check" on every classification to prevent errors like:
 * - Personal items classified as industrial/motor vehicle parts
 * - Food items classified as chemicals
 * - Wearable accessories classified as machinery
 * 
 * @module classificationValidator
 */

// ═══════════════════════════════════════════════════════════════════════════
// SEMANTIC CATEGORY DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Product semantic categories based on intended use and nature
 */
export type ProductCategory = 
    | 'personal_wearable'      // Worn on body (jewelry, clothing, accessories)
    | 'personal_care'          // Used on body (cosmetics, hygiene)
    | 'household'              // Home use (furniture, kitchenware)
    | 'food_beverage'          // Edible items
    | 'industrial'             // Manufacturing, machinery
    | 'automotive'             // Vehicles, vehicle parts
    | 'electronics'            // Electrical devices
    | 'office_supplies'        // Stationery, office equipment
    | 'toys_recreation'        // Toys, games, sports
    | 'medical'                // Healthcare, medical devices
    | 'construction'           // Building materials
    | 'agricultural'           // Farming, gardening
    | 'unknown';

/**
 * HTS description categories that indicate specific industries/uses
 */
export type HTSCategory =
    | 'motor_vehicle'
    | 'aircraft'
    | 'railway'
    | 'ship_marine'
    | 'industrial_machinery'
    | 'agricultural_machinery'
    | 'medical_surgical'
    | 'military_arms'
    | 'nuclear'
    | 'chemical_industrial'
    | 'construction_structural'
    | 'general';

// ═══════════════════════════════════════════════════════════════════════════
// KEYWORD EXTRACTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Keywords that indicate a product is personal/wearable
 */
const PERSONAL_WEARABLE_KEYWORDS = [
    // Body parts
    'finger', 'wrist', 'neck', 'ear', 'ankle', 'toe', 'arm', 'body', 'hand', 'head', 'hair',
    // Jewelry terms
    'ring', 'bracelet', 'necklace', 'earring', 'pendant', 'charm', 'bangle', 'cuff', 'anklet',
    'jewelry', 'jewellery', 'bijouterie', 'accessory', 'fashion',
    // Wear-related
    'wear', 'worn', 'wearing', 'wearable', 'put on', 'adornment', 'personal',
    // Clothing
    'shirt', 'pants', 'dress', 'skirt', 'jacket', 'coat', 'sweater', 'sock', 'shoe', 'hat',
    'glove', 'scarf', 'belt', 'tie', 'underwear', 'clothing', 'apparel', 'garment',
];

/**
 * Keywords that indicate a product is for personal care/hygiene
 */
const PERSONAL_CARE_KEYWORDS = [
    'skin', 'face', 'hair', 'body wash', 'shampoo', 'conditioner', 'lotion', 'cream',
    'soap', 'toothbrush', 'toothpaste', 'deodorant', 'cosmetic', 'makeup', 'beauty',
    'hygiene', 'grooming', 'razor', 'comb', 'brush',
];

/**
 * Keywords that indicate a product is household/domestic
 */
const HOUSEHOLD_KEYWORDS = [
    'kitchen', 'cooking', 'dining', 'home', 'house', 'domestic', 'household',
    'furniture', 'table', 'chair', 'bed', 'sofa', 'lamp', 'decoration', 'decor',
    'storage', 'organizer', 'container', 'box', 'basket', 'shelf',
    'cleaning', 'laundry', 'bathroom', 'bedroom', 'living room',
    'cup', 'plate', 'bowl', 'utensil', 'pot', 'pan', 'knife', 'fork', 'spoon',
];

/**
 * Keywords that indicate a product is food/beverage
 */
const FOOD_KEYWORDS = [
    'food', 'eat', 'edible', 'drink', 'beverage', 'snack', 'meal',
    'fruit', 'vegetable', 'meat', 'fish', 'dairy', 'grain', 'bread',
    'candy', 'chocolate', 'sugar', 'salt', 'spice', 'sauce', 'oil',
    'coffee', 'tea', 'juice', 'water', 'milk', 'wine', 'beer', 'alcohol',
];

/**
 * Keywords that indicate a product is electronic
 */
const ELECTRONICS_KEYWORDS = [
    'electronic', 'electric', 'battery', 'powered', 'digital', 'smart',
    'phone', 'computer', 'laptop', 'tablet', 'monitor', 'keyboard', 'mouse',
    'speaker', 'headphone', 'earphone', 'microphone', 'camera', 'tv', 'television',
    'charger', 'cable', 'usb', 'bluetooth', 'wifi', 'wireless',
    'led', 'lcd', 'display', 'screen', 'circuit', 'chip', 'processor',
];

/**
 * Keywords that indicate a product is a toy/recreational
 */
const TOYS_KEYWORDS = [
    'toy', 'game', 'play', 'fun', 'child', 'children', 'kid', 'baby',
    'doll', 'action figure', 'puzzle', 'board game', 'card game', 'video game',
    'sport', 'exercise', 'fitness', 'outdoor', 'camping', 'hiking',
    'ball', 'bat', 'racket', 'bicycle', 'bike', 'skateboard', 'scooter',
];

/**
 * Keywords that indicate a product is office/stationery
 */
const OFFICE_KEYWORDS = [
    'office', 'desk', 'paper', 'pen', 'pencil', 'marker', 'highlighter',
    'notebook', 'binder', 'folder', 'stapler', 'tape', 'scissors',
    'calendar', 'planner', 'organizer', 'filing', 'document',
];

// ═══════════════════════════════════════════════════════════════════════════
// HTS DESCRIPTION PATTERNS (Indicate specific industries)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * HTS description terms that indicate motor vehicle classification
 */
const MOTOR_VEHICLE_HTS_TERMS = [
    'motor vehicle', 'automobile', 'automotive', 'car', 'truck', 'bus',
    'passenger vehicle', 'commercial vehicle', 'vehicle part',
    'dashboard', 'bumper', 'fender', 'hood', 'trunk', 'windshield',
    'transmission', 'engine part', 'exhaust', 'muffler', 'brake',
];

/**
 * HTS description terms that indicate aircraft classification
 */
const AIRCRAFT_HTS_TERMS = [
    'aircraft', 'airplane', 'helicopter', 'aviation', 'aerospace',
    'fuselage', 'wing', 'propeller', 'cockpit', 'landing gear',
];

/**
 * HTS description terms that indicate railway classification
 */
const RAILWAY_HTS_TERMS = [
    'railway', 'railroad', 'locomotive', 'train', 'tramway',
    'rail track', 'rolling stock', 'railway car',
];

/**
 * HTS description terms that indicate ship/marine classification
 */
const MARINE_HTS_TERMS = [
    'ship', 'vessel', 'boat', 'marine', 'maritime', 'naval',
    'hull', 'deck', 'anchor', 'propeller', 'rudder',
];

/**
 * HTS description terms that indicate industrial machinery
 */
const INDUSTRIAL_HTS_TERMS = [
    'industrial', 'machinery', 'machine tool', 'manufacturing',
    'factory', 'production line', 'assembly', 'hydraulic', 'pneumatic',
    'compressor', 'pump', 'turbine', 'generator', 'boiler',
];

/**
 * HTS description terms that indicate military/arms classification
 */
const MILITARY_HTS_TERMS = [
    'military', 'weapon', 'ammunition', 'firearm', 'bomb', 'missile',
    'armor', 'armored', 'combat', 'defense', 'munition',
];

/**
 * HTS description terms that indicate nuclear classification
 */
const NUCLEAR_HTS_TERMS = [
    'nuclear', 'radioactive', 'reactor', 'uranium', 'plutonium',
    'isotope', 'radiation',
];

// ═══════════════════════════════════════════════════════════════════════════
// INCOMPATIBLE CATEGORY PAIRS
// These combinations should NEVER occur and indicate a misclassification
// ═══════════════════════════════════════════════════════════════════════════

interface IncompatiblePair {
    productCategory: ProductCategory;
    htsCategory: HTSCategory;
    severity: 'critical' | 'warning';
    message: string;
    suggestedChapters?: string[];
}

const INCOMPATIBLE_PAIRS: IncompatiblePair[] = [
    // Personal wearable items should never be motor vehicle parts
    {
        productCategory: 'personal_wearable',
        htsCategory: 'motor_vehicle',
        severity: 'critical',
        message: 'Personal wearable items cannot be motor vehicle parts. Jewelry/accessories should be in Chapter 71 (imitation jewelry), clothing in Chapters 61-62, or footwear in Chapter 64.',
        suggestedChapters: ['71', '61', '62', '64', '65'],
    },
    // Personal wearable items should never be aircraft parts
    {
        productCategory: 'personal_wearable',
        htsCategory: 'aircraft',
        severity: 'critical',
        message: 'Personal wearable items cannot be aircraft parts.',
        suggestedChapters: ['71', '61', '62', '64'],
    },
    // Personal wearable items should never be railway parts
    {
        productCategory: 'personal_wearable',
        htsCategory: 'railway',
        severity: 'critical',
        message: 'Personal wearable items cannot be railway parts.',
        suggestedChapters: ['71', '61', '62', '64'],
    },
    // Personal wearable items should never be marine/ship parts
    {
        productCategory: 'personal_wearable',
        htsCategory: 'ship_marine',
        severity: 'critical',
        message: 'Personal wearable items cannot be ship/marine parts.',
        suggestedChapters: ['71', '61', '62', '64'],
    },
    // Personal care items should never be motor vehicle parts
    {
        productCategory: 'personal_care',
        htsCategory: 'motor_vehicle',
        severity: 'critical',
        message: 'Personal care items cannot be motor vehicle parts. Cosmetics belong in Chapter 33, toiletries in Chapter 34.',
        suggestedChapters: ['33', '34', '96'],
    },
    // Food items should never be motor vehicle parts
    {
        productCategory: 'food_beverage',
        htsCategory: 'motor_vehicle',
        severity: 'critical',
        message: 'Food/beverage items cannot be motor vehicle parts.',
        suggestedChapters: ['02', '04', '07', '08', '09', '16', '17', '18', '19', '20', '21', '22'],
    },
    // Food items should never be industrial chemicals
    {
        productCategory: 'food_beverage',
        htsCategory: 'chemical_industrial',
        severity: 'warning',
        message: 'Food items should not be classified as industrial chemicals. Verify the product is not a food additive or ingredient.',
        suggestedChapters: ['16', '17', '18', '19', '20', '21', '22'],
    },
    // Household items should never be military/arms
    {
        productCategory: 'household',
        htsCategory: 'military_arms',
        severity: 'critical',
        message: 'Household items cannot be military/arms products.',
        suggestedChapters: ['39', '73', '82', '94'],
    },
    // Toys should never be military/arms (unless clearly military toy)
    {
        productCategory: 'toys_recreation',
        htsCategory: 'military_arms',
        severity: 'warning',
        message: 'Verify this is a toy/replica and not an actual weapon. Toys belong in Chapter 95.',
        suggestedChapters: ['95'],
    },
    // Personal items should never be nuclear
    {
        productCategory: 'personal_wearable',
        htsCategory: 'nuclear',
        severity: 'critical',
        message: 'Personal wearable items cannot be nuclear materials.',
        suggestedChapters: ['71', '61', '62'],
    },
    {
        productCategory: 'personal_care',
        htsCategory: 'nuclear',
        severity: 'critical',
        message: 'Personal care items cannot be nuclear materials.',
        suggestedChapters: ['33', '34'],
    },
    {
        productCategory: 'household',
        htsCategory: 'nuclear',
        severity: 'critical',
        message: 'Household items cannot be nuclear materials.',
        suggestedChapters: ['39', '73', '94'],
    },
    {
        productCategory: 'food_beverage',
        htsCategory: 'nuclear',
        severity: 'critical',
        message: 'Food items cannot be nuclear materials.',
        suggestedChapters: ['16', '17', '18', '19', '20', '21', '22'],
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect the semantic category of a product based on its description
 */
export function detectProductCategory(description: string, material?: string, intendedUse?: string): ProductCategory {
    const combined = `${description} ${material || ''} ${intendedUse || ''}`.toLowerCase();
    
    // Score each category based on keyword matches
    const scores: Record<ProductCategory, number> = {
        personal_wearable: 0,
        personal_care: 0,
        household: 0,
        food_beverage: 0,
        industrial: 0,
        automotive: 0,
        electronics: 0,
        office_supplies: 0,
        toys_recreation: 0,
        medical: 0,
        construction: 0,
        agricultural: 0,
        unknown: 0,
    };
    
    // Check personal wearable keywords
    for (const keyword of PERSONAL_WEARABLE_KEYWORDS) {
        if (combined.includes(keyword)) {
            scores.personal_wearable += keyword.length > 4 ? 2 : 1; // Longer keywords get more weight
        }
    }
    
    // Check personal care keywords
    for (const keyword of PERSONAL_CARE_KEYWORDS) {
        if (combined.includes(keyword)) {
            scores.personal_care += keyword.length > 4 ? 2 : 1;
        }
    }
    
    // Check household keywords
    for (const keyword of HOUSEHOLD_KEYWORDS) {
        if (combined.includes(keyword)) {
            scores.household += keyword.length > 4 ? 2 : 1;
        }
    }
    
    // Check food keywords
    for (const keyword of FOOD_KEYWORDS) {
        if (combined.includes(keyword)) {
            scores.food_beverage += keyword.length > 4 ? 2 : 1;
        }
    }
    
    // Check electronics keywords
    for (const keyword of ELECTRONICS_KEYWORDS) {
        if (combined.includes(keyword)) {
            scores.electronics += keyword.length > 4 ? 2 : 1;
        }
    }
    
    // Check toys keywords
    for (const keyword of TOYS_KEYWORDS) {
        if (combined.includes(keyword)) {
            scores.toys_recreation += keyword.length > 4 ? 2 : 1;
        }
    }
    
    // Check office keywords
    for (const keyword of OFFICE_KEYWORDS) {
        if (combined.includes(keyword)) {
            scores.office_supplies += keyword.length > 4 ? 2 : 1;
        }
    }
    
    // Find highest scoring category
    let maxScore = 0;
    let detectedCategory: ProductCategory = 'unknown';
    
    for (const [category, score] of Object.entries(scores)) {
        if (score > maxScore) {
            maxScore = score;
            detectedCategory = category as ProductCategory;
        }
    }
    
    return maxScore >= 2 ? detectedCategory : 'unknown';
}

/**
 * Detect the HTS category based on the HTS code description
 */
export function detectHTSCategory(htsDescription: string): HTSCategory {
    const descLower = htsDescription.toLowerCase();
    
    // Check motor vehicle
    for (const term of MOTOR_VEHICLE_HTS_TERMS) {
        if (descLower.includes(term)) return 'motor_vehicle';
    }
    
    // Check aircraft
    for (const term of AIRCRAFT_HTS_TERMS) {
        if (descLower.includes(term)) return 'aircraft';
    }
    
    // Check railway
    for (const term of RAILWAY_HTS_TERMS) {
        if (descLower.includes(term)) return 'railway';
    }
    
    // Check marine
    for (const term of MARINE_HTS_TERMS) {
        if (descLower.includes(term)) return 'ship_marine';
    }
    
    // Check industrial
    for (const term of INDUSTRIAL_HTS_TERMS) {
        if (descLower.includes(term)) return 'industrial_machinery';
    }
    
    // Check military
    for (const term of MILITARY_HTS_TERMS) {
        if (descLower.includes(term)) return 'military_arms';
    }
    
    // Check nuclear
    for (const term of NUCLEAR_HTS_TERMS) {
        if (descLower.includes(term)) return 'nuclear';
    }
    
    return 'general';
}

/**
 * Result of semantic validation
 */
export interface ValidationResult {
    isValid: boolean;
    productCategory: ProductCategory;
    htsCategory: HTSCategory;
    conflicts: {
        severity: 'critical' | 'warning';
        message: string;
        suggestedChapters?: string[];
    }[];
    confidencePenalty: number; // How much to reduce confidence (0-50)
    shouldReclassify: boolean;
    suggestedChapters: string[];
}

/**
 * Validate a classification result for semantic consistency
 * 
 * @param productDescription - Original product description
 * @param material - Product material
 * @param intendedUse - Product intended use
 * @param htsCode - Classified HTS code
 * @param htsDescription - HTS code description
 * @returns Validation result with any conflicts detected
 */
export function validateClassificationSemantics(
    productDescription: string,
    material: string | undefined,
    intendedUse: string | undefined,
    htsCode: string,
    htsDescription: string
): ValidationResult {
    const productCategory = detectProductCategory(productDescription, material, intendedUse);
    const htsCategory = detectHTSCategory(htsDescription);
    
    const conflicts: ValidationResult['conflicts'] = [];
    const suggestedChapters: string[] = [];
    let confidencePenalty = 0;
    let shouldReclassify = false;
    
    // Check for incompatible pairs
    for (const pair of INCOMPATIBLE_PAIRS) {
        if (productCategory === pair.productCategory && htsCategory === pair.htsCategory) {
            conflicts.push({
                severity: pair.severity,
                message: pair.message,
                suggestedChapters: pair.suggestedChapters,
            });
            
            if (pair.suggestedChapters) {
                suggestedChapters.push(...pair.suggestedChapters);
            }
            
            if (pair.severity === 'critical') {
                confidencePenalty = Math.max(confidencePenalty, 40);
                shouldReclassify = true;
            } else {
                confidencePenalty = Math.max(confidencePenalty, 20);
            }
        }
    }
    
    // Additional semantic checks
    const productLower = `${productDescription} ${intendedUse || ''}`.toLowerCase();
    const htsLower = htsDescription.toLowerCase();
    
    // Check for obvious word mismatches
    const productKeywords = extractSignificantKeywords(productLower);
    const htsKeywords = extractSignificantKeywords(htsLower);
    
    // If product mentions "finger" but HTS mentions "motor vehicle" - critical mismatch
    if (productKeywords.includes('finger') && htsKeywords.includes('motor') && htsKeywords.includes('vehicle')) {
        if (!conflicts.some(c => c.message.includes('motor vehicle'))) {
            conflicts.push({
                severity: 'critical',
                message: 'Product mentions "finger" but HTS code is for motor vehicles. This is likely a misclassification.',
                suggestedChapters: ['71'],
            });
            confidencePenalty = Math.max(confidencePenalty, 50);
            shouldReclassify = true;
            suggestedChapters.push('71');
        }
    }
    
    // Remove duplicates from suggested chapters
    const uniqueChapters = [...new Set(suggestedChapters)];
    
    return {
        isValid: conflicts.length === 0,
        productCategory,
        htsCategory,
        conflicts,
        confidencePenalty,
        shouldReclassify,
        suggestedChapters: uniqueChapters,
    };
}

/**
 * Extract significant keywords from text (words > 3 chars, not common words)
 */
function extractSignificantKeywords(text: string): string[] {
    const stopWords = new Set([
        'the', 'and', 'for', 'with', 'from', 'that', 'this', 'which', 'other',
        'not', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
        'made', 'make', 'used', 'use', 'than', 'more', 'most', 'such', 'only',
    ]);
    
    return text
        .split(/\s+/)
        .map(w => w.replace(/[^a-z]/g, ''))
        .filter(w => w.length > 3 && !stopWords.has(w));
}

/**
 * Get human-readable category name
 */
export function getCategoryDisplayName(category: ProductCategory | HTSCategory): string {
    const names: Record<string, string> = {
        personal_wearable: 'Personal/Wearable Item',
        personal_care: 'Personal Care Product',
        household: 'Household Item',
        food_beverage: 'Food/Beverage',
        industrial: 'Industrial Product',
        automotive: 'Automotive Product',
        electronics: 'Electronics',
        office_supplies: 'Office Supplies',
        toys_recreation: 'Toys/Recreation',
        medical: 'Medical Product',
        construction: 'Construction Material',
        agricultural: 'Agricultural Product',
        unknown: 'General Product',
        motor_vehicle: 'Motor Vehicle Part',
        aircraft: 'Aircraft Part',
        railway: 'Railway Equipment',
        ship_marine: 'Marine/Ship Part',
        industrial_machinery: 'Industrial Machinery',
        agricultural_machinery: 'Agricultural Machinery',
        medical_surgical: 'Medical/Surgical Equipment',
        military_arms: 'Military/Arms',
        nuclear: 'Nuclear Material',
        chemical_industrial: 'Industrial Chemical',
        construction_structural: 'Construction/Structural',
        general: 'General Goods',
    };
    
    return names[category] || category;
}

