// Tariff Layers Types - For calculating effective total tariff rates
// Including base rates, Section 301, IEEPA, and other additional duties

export interface EffectiveTariffRate {
    baseHtsCode: string;
    htsDescription: string;
    countryOfOrigin: string;
    destinationCountry: string;  // Default: "US"

    // Base MFN rate
    baseMfnRate: TariffRate;

    // All additional duties (Chapter 99)
    additionalDuties: AdditionalDuty[];

    // Calculated totals
    effectiveRate: TariffRate;
    totalAdValorem: number;      // Sum of all percentage rates
    estimatedDutyForValue?: {
        value: number;
        currency: string;
        estimatedDuty: number;
    };

    // Applicable exclusions
    exclusions: TariffExclusion[];

    // AD/CVD warning (if applicable)
    adcvdWarning?: {
        productCategory: string;
        message: string;
        affectedCountries: string[];
        lookupUrl: string;
        isCountryAffected: boolean;
    };

    // Metadata
    calculatedAt: Date;
    dataFreshness: string;       // e.g., "As of December 2024"
    disclaimer: string;
}

export interface TariffRate {
    rate: string;                // e.g., "25%", "Free", "$0.50/kg"
    rateType: 'ad_valorem' | 'specific' | 'compound' | 'free';
    numericRate?: number;        // For ad valorem, the percentage (e.g., 25)
    specificRate?: {
        amount: number;
        unit: string;            // e.g., "kg", "piece", "dozen"
    };
}

export interface AdditionalDuty {
    htsCode: string;             // e.g., "9903.88.01"
    programName: string;         // e.g., "Section 301 List 1"
    programType: AdditionalDutyType;
    rate: TariffRate;
    authority: string;           // e.g., "USTR", "IEEPA", "CBP"
    legalReference?: string;     // e.g., "Executive Order 14257"
    effectiveDate: string;
    expirationDate?: string;
    applicable: boolean;
    applicabilityReason?: string;

    // For UI tooltip
    description: string;         // Plain-English explanation
}

export type AdditionalDutyType =
    | 'section_301'              // China trade war tariffs
    | 'ieepa_fentanyl'           // Fentanyl-related IEEPA
    | 'ieepa_reciprocal'         // Reciprocal tariffs under IEEPA
    | 'section_232'              // Steel/aluminum tariffs
    | 'antidumping_ad'           // Antidumping duties
    | 'countervailing_cvd'       // Countervailing duties
    | 'safeguard'                // Safeguard measures
    | 'other';

export interface TariffExclusion {
    htsCode?: string;            // Specific exclusion code if applicable
    program: string;             // e.g., "Section 301 Product Exclusion"
    description: string;
    effectiveDate: string;
    expirationDate: string;
    status: 'active' | 'expired' | 'pending';
    savings?: TariffRate;        // Amount saved by exclusion
}

// Country-specific tariff configuration
export interface CountryTariffProfile {
    countryCode: string;         // ISO 2-letter code
    countryName: string;

    // Blanket additional duties (apply to all products)
    blanketDuties: AdditionalDuty[];

    // Trade agreement for reduced/free rates
    tradeAgreements: TradeAgreement[];

    // Special designations
    specialStatus?: 'normal' | 'gsp' | 'fta' | 'sanctioned' | 'ntr_suspended';
}

export interface TradeAgreement {
    name: string;                // e.g., "USMCA", "KORUS"
    htsSpecialIndicator: string; // e.g., "CA", "MX", "KR"
    preferentialRate?: TariffRate;
    rulesOfOrigin?: string;
    expirationDate?: string;
}

// Section 301 List membership
export type Section301List =
    | 'list1'     // July 2018, 25%
    | 'list2'     // August 2018, 25%
    | 'list3'     // September 2018, 25%
    | 'list4a'    // September 2019, 7.5%
    | 'list4b'    // September 2019, increased to 25%
    | 'list2024'  // September 2024 additions (EVs, solar, etc.)
    | 'excluded'; // Active exclusion

export interface Section301Mapping {
    htsPattern: string;          // Full code or prefix (e.g., "8471.30" or "8471")
    lists: Section301List[];
    effectiveRate: number;
    notes?: string;
}
