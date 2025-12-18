// Classification System Types

export interface ClassificationInput {
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
