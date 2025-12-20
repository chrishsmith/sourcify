// Classification System Types

export interface ClassificationInput {
    productName?: string;       // User-friendly name, e.g., "Widget A"
    productSku?: string;        // Internal part number or SKU
    productDescription: string;
    classificationType: 'import' | 'export';
    countryOfOrigin?: string;
    materialComposition?: string;
    intendedUse?: string;
}

export interface HTSCode {
    code: string;           // e.g., "8471.30.0100"
    description: string;    // Official HTS description
    chapter: string;        // e.g., "84"
    heading: string;        // e.g., "8471"
    subheading: string;     // e.g., "8471.30"
}

export interface DutyRate {
    generalRate: string;    // e.g., "Free" or "2.5%"
    specialPrograms: {
        program: string;    // e.g., "USMCA", "GSP"
        rate: string;       // e.g., "Free"
    }[];
    column2Rate?: string;   // Rate for non-MFN countries
}

export interface RulingReference {
    rulingNumber: string;   // e.g., "NY N123456"
    date: string;
    summary: string;
    relevanceScore: number; // 0-100
}

// For HTS codes that vary based on price, weight, dimensions, etc.
export interface ConditionalClassification {
    conditionType: 'price' | 'weight' | 'dimension' | 'quantity';
    conditionLabel: string;         // e.g., "Unit Value", "Weight per unit"
    conditionUnit: string;          // e.g., "$", "kg", "cm"
    conditions: {
        rangeLabel: string;         // e.g., "$0.30 - $3.00", "Under 2kg"
        minValue?: number;          // e.g., 0.30
        maxValue?: number;          // e.g., 3.00
        htsCode: string;            // The HTS code for this range
        description: string;        // HTS description
        dutyRate: string;           // e.g., "5.3%"
    }[];
    explanation: string;            // Why this matters for classification
}

export interface ClassificationResult {
    id: string;
    input: ClassificationInput;
    htsCode: HTSCode;
    confidence: number;     // 0-100
    dutyRate: DutyRate;
    rulings: RulingReference[];
    alternativeCodes?: HTSCode[];
    rationale: string;      // AI explanation
    warnings?: string[];    // Compliance warnings
    createdAt: Date;
    // Effective tariff breakdown (includes all additional duties)
    effectiveTariff?: import('./tariffLayers.types').EffectiveTariffRate;
    conditionalClassifications?: ConditionalClassification[];
    // Hierarchical path (e.g., "Plastics > Articles of Plastic > Other")
    humanReadablePath?: string;
    // Full HTS hierarchy with all levels
    hierarchy?: HTSHierarchy;
    // Value-dependent classification (when product has multiple codes based on value/weight)
    valueDependentClassification?: ValueDependentClassification;
    // Database reference for history
    searchHistoryId?: string;
    // Auto-generated product name if user didn't provide one
    // Generated from AI analysis (essentialCharacter + primaryMaterial)
    suggestedProductName?: string;
}

export interface ClassificationHistoryItem {
    id: string;
    productDescription: string;
    htsCode: string;
    confidence: number;
    dutyRate: string;
    status: 'completed' | 'pending' | 'needs_review';
    createdAt: Date;
}

export interface USITCCandidate {
    htsno: string;
    description: string;
    general: string;
    special: string;
    other: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HTS HIERARCHY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface HTSHierarchyLevel {
    level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
    code: string;
    description: string;
    indent: number;
    dutyRate?: string;
}

export interface HTSHierarchy {
    fullCode: string;
    levels: HTSHierarchyLevel[];
    humanReadablePath: string;
    shortPath: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALUE-DEPENDENT CLASSIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════

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
