// Section 301 HTS Code Mapping
// Determines which Section 301 list(s) apply to each HTS code
// Source: USTR 301 Exclusions & Tariff Lists (updated November 2024)

import type { Section301List, Section301Mapping } from '@/types/tariffLayers.types';

// Section 301 tariff rates by list
export const SECTION_301_RATES: Record<Section301List, number> = {
    list1: 25,       // List 1: July 6, 2018
    list2: 25,       // List 2: August 23, 2018
    list3: 25,       // List 3: September 24, 2018 (increased from 10%)
    list4a: 7.5,     // List 4A: September 1, 2019 (reduced from 15%)
    list4b: 25,      // List 4B: September 1, 2019 (increased from 15%)
    list2024: 50,    // 2024 additions: EVs=100%, Solar=50%, Semiconductors=50%
    excluded: 0,     // Active exclusion
};

// HTS codes for Section 301 lists
// NOTE: This is a representative sample. Full list has 10,000+ codes.
// Pattern matching: "8471" matches all 8471.xx.xxxx codes
export const SECTION_301_MAPPING: Section301Mapping[] = [
    // ═══════════════════════════════════════════════════════════════
    // LIST 1 - July 6, 2018 (818 lines, 25%)
    // Machinery, mechanical appliances, electrical equipment
    // ═══════════════════════════════════════════════════════════════
    { htsPattern: '8471.30', lists: ['list1'], effectiveRate: 25, notes: 'Portable computers (laptops)' },
    { htsPattern: '8471.41', lists: ['list1'], effectiveRate: 25, notes: 'Data processing machines' },
    { htsPattern: '8471.49', lists: ['list1'], effectiveRate: 25, notes: 'Other data processing machines' },
    { htsPattern: '8471.50', lists: ['list1'], effectiveRate: 25, notes: 'Processing units' },
    { htsPattern: '8471.60', lists: ['list1'], effectiveRate: 25, notes: 'Input/output units' },
    { htsPattern: '8471.70', lists: ['list1'], effectiveRate: 25, notes: 'Storage units' },
    { htsPattern: '8473', lists: ['list1'], effectiveRate: 25, notes: 'Parts for computers' },
    { htsPattern: '8414.30', lists: ['list1'], effectiveRate: 25, notes: 'Compressors for refrigeration' },
    { htsPattern: '8482', lists: ['list1'], effectiveRate: 25, notes: 'Ball bearings' },
    { htsPattern: '8501', lists: ['list1'], effectiveRate: 25, notes: 'Electric motors' },
    { htsPattern: '8541', lists: ['list1'], effectiveRate: 25, notes: 'Diodes, transistors, semiconductors' },
    { htsPattern: '8542', lists: ['list1'], effectiveRate: 25, notes: 'Integrated circuits' },

    // ═══════════════════════════════════════════════════════════════
    // LIST 2 - August 23, 2018 (279 lines, 25%)
    // Chemicals, plastics, railway equipment
    // ═══════════════════════════════════════════════════════════════
    { htsPattern: '2804', lists: ['list2'], effectiveRate: 25, notes: 'Hydrogen, rare gases' },
    { htsPattern: '2903', lists: ['list2'], effectiveRate: 25, notes: 'Halogenated hydrocarbons' },
    { htsPattern: '3901', lists: ['list2'], effectiveRate: 25, notes: 'Polymers of ethylene' },
    { htsPattern: '3907', lists: ['list2'], effectiveRate: 25, notes: 'Polyacetals, polyethers' },
    { htsPattern: '8601', lists: ['list2'], effectiveRate: 25, notes: 'Rail locomotives' },
    { htsPattern: '8607', lists: ['list2'], effectiveRate: 25, notes: 'Railway parts' },

    // ═══════════════════════════════════════════════════════════════
    // LIST 3 - September 24, 2018 (~5,700 lines, 25%)
    // Broad range of consumer and industrial goods
    // ═══════════════════════════════════════════════════════════════
    { htsPattern: '3926.90', lists: ['list3'], effectiveRate: 25, notes: 'Other articles of plastics' },
    { htsPattern: '3926.20', lists: ['list3'], effectiveRate: 25, notes: 'Articles of apparel' },
    { htsPattern: '4016.93', lists: ['list3'], effectiveRate: 25, notes: 'Rubber gaskets' },
    { htsPattern: '4016.99', lists: ['list3'], effectiveRate: 25, notes: 'Other rubber articles' },
    { htsPattern: '7318', lists: ['list3'], effectiveRate: 25, notes: 'Screws, bolts, nuts' },
    { htsPattern: '7326', lists: ['list3'], effectiveRate: 25, notes: 'Other iron/steel articles' },
    { htsPattern: '8413', lists: ['list3'], effectiveRate: 25, notes: 'Pumps' },
    { htsPattern: '8481', lists: ['list3'], effectiveRate: 25, notes: 'Valves and taps' },
    { htsPattern: '8504', lists: ['list3'], effectiveRate: 25, notes: 'Electrical transformers' },
    { htsPattern: '8536', lists: ['list3'], effectiveRate: 25, notes: 'Electrical switches' },
    { htsPattern: '8544', lists: ['list3'], effectiveRate: 25, notes: 'Insulated wire, cables' },
    { htsPattern: '9032', lists: ['list3'], effectiveRate: 25, notes: 'Automatic regulating instruments' },
    { htsPattern: '9403', lists: ['list3'], effectiveRate: 25, notes: 'Furniture' },

    // ═══════════════════════════════════════════════════════════════
    // LIST 4A - September 1, 2019 (~3,200 lines, 7.5%)
    // Consumer goods with reduced rate
    // ═══════════════════════════════════════════════════════════════
    { htsPattern: '6109', lists: ['list4a'], effectiveRate: 7.5, notes: 'T-shirts, cotton' },
    { htsPattern: '6110', lists: ['list4a'], effectiveRate: 7.5, notes: 'Sweaters, pullovers' },
    { htsPattern: '6203', lists: ['list4a'], effectiveRate: 7.5, notes: "Men's suits, jackets" },
    { htsPattern: '6204', lists: ['list4a'], effectiveRate: 7.5, notes: "Women's suits, jackets" },
    { htsPattern: '6402', lists: ['list4a'], effectiveRate: 7.5, notes: 'Rubber/plastic footwear' },
    { htsPattern: '6403', lists: ['list4a'], effectiveRate: 7.5, notes: 'Leather footwear' },
    { htsPattern: '9503', lists: ['list4a'], effectiveRate: 7.5, notes: 'Toys' },
    { htsPattern: '9504', lists: ['list4a'], effectiveRate: 7.5, notes: 'Video games' },
    { htsPattern: '8517.12', lists: ['list4a'], effectiveRate: 7.5, notes: 'Smartphones' },
    { htsPattern: '8528.72', lists: ['list4a'], effectiveRate: 7.5, notes: 'TV receivers' },

    // ═══════════════════════════════════════════════════════════════
    // 2024 ADDITIONS - September 27, 2024 (increased rates)
    // EVs, Solar, Semiconductors, Critical Minerals, Medical
    // ═══════════════════════════════════════════════════════════════
    { htsPattern: '8703.40', lists: ['list2024'], effectiveRate: 100, notes: 'Electric vehicles (100%)' },
    { htsPattern: '8703.50', lists: ['list2024'], effectiveRate: 100, notes: 'Plug-in hybrid vehicles (100%)' },
    { htsPattern: '8703.60', lists: ['list2024'], effectiveRate: 100, notes: 'Electric vehicles (100%)' },
    { htsPattern: '8703.70', lists: ['list2024'], effectiveRate: 100, notes: 'Plug-in hybrid vehicles (100%)' },
    { htsPattern: '8703.80', lists: ['list2024'], effectiveRate: 100, notes: 'Electric vehicles (100%)' },
    { htsPattern: '8507.60', lists: ['list2024'], effectiveRate: 25, notes: 'Lithium-ion batteries (25%)' },
    { htsPattern: '8507.80', lists: ['list2024'], effectiveRate: 25, notes: 'Other batteries (25%)' },
    { htsPattern: '8541.40', lists: ['list2024'], effectiveRate: 50, notes: 'Solar cells (50%)' },
    { htsPattern: '8541.42', lists: ['list2024'], effectiveRate: 50, notes: 'Solar cells (50%)' },
    { htsPattern: '8541.43', lists: ['list2024'], effectiveRate: 50, notes: 'Solar cells (50%)' },
    { htsPattern: '8541.51', lists: ['list2024'], effectiveRate: 50, notes: 'Semiconductors (50%)' },
    { htsPattern: '8523.51', lists: ['list2024'], effectiveRate: 50, notes: 'Semiconductor media (50%)' },
];

/**
 * Find which Section 301 list(s) an HTS code belongs to
 * Returns null if not on any list
 */
export function findSection301Lists(htsCode: string): Section301Mapping | null {
    // Clean the code
    const cleanCode = htsCode.replace(/\./g, '');

    // Try exact match first, then progressively shorter prefixes
    for (let len = cleanCode.length; len >= 4; len--) {
        const pattern = cleanCode.substring(0, len);
        const formattedPattern = formatHtsPattern(pattern);

        const match = SECTION_301_MAPPING.find(m =>
            m.htsPattern.replace(/\./g, '') === pattern ||
            m.htsPattern === formattedPattern
        );

        if (match) return match;
    }

    return null;
}

/**
 * Format HTS pattern with dots for display
 */
function formatHtsPattern(code: string): string {
    if (code.length <= 4) return code;
    if (code.length <= 6) return `${code.substring(0, 4)}.${code.substring(4)}`;
    return `${code.substring(0, 4)}.${code.substring(4, 6)}.${code.substring(6)}`;
}

/**
 * Get Section 301 tariff rate for an HTS code
 */
export function getSection301Rate(htsCode: string): { rate: number; listNames: string[] } | null {
    const mapping = findSection301Lists(htsCode);
    if (!mapping) return null;

    const listNames = mapping.lists.map(list => {
        switch (list) {
            case 'list1': return 'Section 301 List 1';
            case 'list2': return 'Section 301 List 2';
            case 'list3': return 'Section 301 List 3';
            case 'list4a': return 'Section 301 List 4A';
            case 'list4b': return 'Section 301 List 4B';
            case 'list2024': return 'Section 301 (2024)';
            case 'excluded': return 'Excluded';
            default: return list;
        }
    });

    return { rate: mapping.effectiveRate, listNames };
}
