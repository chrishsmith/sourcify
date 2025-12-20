/**
 * Landed Cost Calculator
 * 
 * Calculates total cost to import products from different countries.
 * Uses REAL cost data from HtsCostByCountry combined with tariff data.
 */

import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFF HELPERS (inline to avoid module resolution issues)
// ═══════════════════════════════════════════════════════════════════════════════

// Section 301 rates by HTS chapter for China
function getSection301Rate(htsCode: string, countryCode: string): number {
    if (countryCode !== 'CN') return 0;
    
    const chapter = htsCode.substring(0, 2);
    // Most products are on List 4A at 7.5% or List 3 at 25%
    const list3Chapters = ['84', '85', '90', '94', '95']; // Electronics, machinery, furniture, toys
    const list4AChapters = ['39', '61', '62', '63', '64', '42']; // Plastics, apparel, footwear
    
    if (list3Chapters.includes(chapter)) return 25;
    if (list4AChapters.includes(chapter)) return 7.5;
    return 7.5; // Default assumption
}

// IEEPA rates by country (Fentanyl + Reciprocal)
function getIEEPARate(countryCode: string): number {
    const ieepaRates: Record<string, number> = {
        'CN': 20, // Fentanyl 20% (reciprocal paused)
        'MX': 0,  // USMCA exempt
        'CA': 0,  // USMCA exempt
        'VN': 10, 'IN': 10, 'BD': 5, 'TH': 10, 'ID': 10,
        'TW': 10, 'KR': 0, 'JP': 0, 'DE': 10, 'IT': 10,
        'PL': 10, 'TR': 10, 'MY': 10, 'PH': 10, 'PK': 10, 'KH': 5,
    };
    return ieepaRates[countryCode] || 10; // Default 10% for unlisted
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface LandedCostBreakdown {
    country: string;
    countryCode: string;
    
    // Product cost from HtsCostByCountry (real import data)
    productCost: number;
    productCostConfidence: number;
    
    // Shipping estimates
    shippingCost: number;
    transitDays: number;
    
    // Tariff breakdown
    tariffs: {
        baseTariff: number;         // MFN rate %
        section301: number;         // Section 301 rate %
        ieepaRate: number;          // IEEPA reciprocal rate %
        adCvdRate: number;          // AD/CVD if applicable %
        ftaDiscount: number;        // FTA reduction %
        effectiveRate: number;      // Total tariff %
        tariffAmount: number;       // $ per unit
    };
    
    // Fees
    fees: {
        mpf: number;                // Merchandise Processing Fee
        hmf: number;                // Harbor Maintenance Fee
        totalFees: number;
    };
    
    // Totals
    totalLandedCost: number;
    
    // Comparison
    savingsVsChina: number | null;
    savingsPercent: number | null;
    
    // Metadata
    dataQuality: 'high' | 'medium' | 'low';
    lastUpdated: Date | null;
}

export interface LandedCostComparison {
    htsCode: string;
    htsDescription?: string;
    baseTariffRate: number;
    countries: LandedCostBreakdown[];
    cheapestCountry: string;
    mostExpensiveCountry: string;
    averageCost: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Merchandise Processing Fee (MPF): 0.3464% of value, min $27.75, max $538.40
const MPF_RATE = 0.003464;
const MPF_MIN = 27.75;
const MPF_MAX = 538.40;

// Harbor Maintenance Fee (HMF): 0.125% of value (ocean shipments only)
const HMF_RATE = 0.00125;

// Shipping cost estimates ($ per kg, from country to US West Coast)
const SHIPPING_COSTS: Record<string, number> = {
    'CN': 0.80,  // China
    'VN': 0.90,  // Vietnam
    'IN': 1.10,  // India
    'BD': 1.20,  // Bangladesh
    'TH': 0.95,  // Thailand
    'ID': 1.00,  // Indonesia
    'MY': 0.90,  // Malaysia
    'PH': 0.95,  // Philippines
    'TW': 0.85,  // Taiwan
    'KR': 0.80,  // South Korea
    'JP': 0.75,  // Japan
    'MX': 0.40,  // Mexico (land/rail)
    'CA': 0.35,  // Canada
    'DE': 1.20,  // Germany
    'IT': 1.25,  // Italy
    'TR': 1.10,  // Turkey
    'default': 1.00,
};

// Transit times (days, to US)
const TRANSIT_DAYS: Record<string, number> = {
    'CN': 28,
    'VN': 30,
    'IN': 35,
    'BD': 38,
    'TH': 32,
    'ID': 35,
    'MY': 30,
    'PH': 28,
    'TW': 22,
    'KR': 20,
    'JP': 18,
    'MX': 5,
    'CA': 3,
    'DE': 18,
    'IT': 20,
    'TR': 22,
    'default': 30,
};

// FTA countries and their typical rate
const FTA_COUNTRIES: Record<string, { name: string; rate: number }> = {
    'CA': { name: 'USMCA', rate: 0 },
    'MX': { name: 'USMCA', rate: 0 },
    'KR': { name: 'KORUS FTA', rate: 0 },
    'AU': { name: 'Australia FTA', rate: 0 },
    'SG': { name: 'Singapore FTA', rate: 0 },
    'CL': { name: 'Chile FTA', rate: 0 },
    'CO': { name: 'Colombia TPA', rate: 0 },
    'PE': { name: 'Peru TPA', rate: 0 },
    'PA': { name: 'Panama TPA', rate: 0 },
    'IL': { name: 'Israel FTA', rate: 0 },
    'JO': { name: 'Jordan FTA', rate: 0 },
    'MA': { name: 'Morocco FTA', rate: 0 },
    'BH': { name: 'Bahrain FTA', rate: 0 },
    'OM': { name: 'Oman FTA', rate: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFF CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate effective tariff rate for HTS code from specific country
 */
export function calculateEffectiveTariff(
    baseTariffRate: number,
    countryCode: string,
    htsCode: string
): {
    baseTariff: number;
    section301: number;
    ieepaRate: number;
    adCvdRate: number;
    ftaDiscount: number;
    effectiveRate: number;
} {
    // Get additional duties
    const section301 = getSection301Rate(htsCode, countryCode);
    const ieepaRate = getIEEPARate(countryCode);
    const adCvdRate = 0; // Would need AD/CVD lookup
    
    // Check FTA
    let ftaDiscount = 0;
    if (FTA_COUNTRIES[countryCode]) {
        ftaDiscount = baseTariffRate; // FTA eliminates base tariff
    }
    
    // Calculate effective rate
    const effectiveRate = Math.max(0,
        baseTariffRate - ftaDiscount + section301 + ieepaRate + adCvdRate
    );
    
    return {
        baseTariff: baseTariffRate,
        section301,
        ieepaRate,
        adCvdRate,
        ftaDiscount,
        effectiveRate,
    };
}

/**
 * Calculate fees
 */
function calculateFees(productValue: number): {
    mpf: number;
    hmf: number;
    totalFees: number;
} {
    // MPF
    let mpf = productValue * MPF_RATE;
    mpf = Math.max(MPF_MIN, Math.min(MPF_MAX, mpf));
    
    // HMF (ocean shipments)
    const hmf = productValue * HMF_RATE;
    
    return {
        mpf,
        hmf,
        totalFees: mpf + hmf,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate landed cost for a specific HTS code from a specific country
 */
export async function calculateLandedCost(
    htsCode: string,
    countryCode: string,
    quantity: number = 1000,
    weightPerUnitKg: number = 0.5
): Promise<LandedCostBreakdown | null> {
    const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
    
    // Get cost data from our aggregated table
    const costData = await prisma.htsCostByCountry.findUnique({
        where: {
            htsCode_countryCode: {
                htsCode: hts6,
                countryCode,
            },
        },
    });
    
    if (!costData) {
        return null;
    }
    
    // Get base tariff rate (from costData or lookup)
    const baseTariffRate = costData.baseTariffRate || 5.0; // Default 5%
    
    // Calculate tariffs
    const tariffs = calculateEffectiveTariff(baseTariffRate, countryCode, hts6);
    
    // Calculate shipping
    const shippingRate = SHIPPING_COSTS[countryCode] || SHIPPING_COSTS['default'];
    const shippingCostPerUnit = shippingRate * weightPerUnitKg;
    
    // Calculate tariff amount
    const tariffAmount = costData.avgUnitValue * (tariffs.effectiveRate / 100);
    
    // Calculate fees (based on total shipment value)
    const totalProductValue = costData.avgUnitValue * quantity;
    const fees = calculateFees(totalProductValue);
    const feesPerUnit = fees.totalFees / quantity;
    
    // Calculate total landed cost
    const totalLandedCost = 
        costData.avgUnitValue + 
        shippingCostPerUnit + 
        tariffAmount + 
        feesPerUnit;
    
    // Determine data quality
    let dataQuality: 'high' | 'medium' | 'low' = 'low';
    if (costData.confidenceScore >= 70) dataQuality = 'high';
    else if (costData.confidenceScore >= 40) dataQuality = 'medium';
    
    return {
        country: costData.countryName,
        countryCode,
        productCost: costData.avgUnitValue,
        productCostConfidence: costData.confidenceScore,
        shippingCost: shippingCostPerUnit,
        transitDays: TRANSIT_DAYS[countryCode] || TRANSIT_DAYS['default'],
        tariffs: {
            ...tariffs,
            tariffAmount,
        },
        fees: {
            mpf: fees.mpf / quantity,
            hmf: fees.hmf / quantity,
            totalFees: feesPerUnit,
        },
        totalLandedCost,
        savingsVsChina: null, // Calculated in comparison
        savingsPercent: null,
        dataQuality,
        lastUpdated: costData.lastCalculated,
    };
}

/**
 * Compare landed costs across all available countries for an HTS code
 */
export async function compareLandedCosts(
    htsCode: string,
    options: {
        quantity?: number;
        weightPerUnitKg?: number;
        minConfidence?: number;
        includeCountries?: string[];
        excludeCountries?: string[];
    } = {}
): Promise<LandedCostComparison> {
    const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
    const quantity = options.quantity || 1000;
    const weightPerUnit = options.weightPerUnitKg || 0.5;
    const minConfidence = options.minConfidence || 20;
    
    // Get all cost data for this HTS
    const whereClause: Record<string, unknown> = {
        htsCode: hts6,
        confidenceScore: { gte: minConfidence },
    };
    
    if (options.includeCountries?.length) {
        whereClause.countryCode = { in: options.includeCountries };
    } else if (options.excludeCountries?.length) {
        whereClause.countryCode = { notIn: options.excludeCountries };
    }
    
    const costRecords = await prisma.htsCostByCountry.findMany({
        where: whereClause,
        orderBy: { avgUnitValue: 'asc' },
    });
    
    // Calculate landed cost for each country
    const countries: LandedCostBreakdown[] = [];
    
    for (const record of costRecords) {
        const landed = await calculateLandedCost(
            hts6,
            record.countryCode,
            quantity,
            weightPerUnit
        );
        
        if (landed) {
            countries.push(landed);
        }
    }
    
    // Sort by total landed cost
    countries.sort((a, b) => a.totalLandedCost - b.totalLandedCost);
    
    // Calculate China baseline for savings comparison
    const chinaLanded = countries.find(c => c.countryCode === 'CN');
    const chinaBaseline = chinaLanded?.totalLandedCost;
    
    // Add savings calculations
    for (const country of countries) {
        if (chinaBaseline && country.countryCode !== 'CN') {
            country.savingsVsChina = chinaBaseline - country.totalLandedCost;
            country.savingsPercent = Math.round(
                (country.savingsVsChina / chinaBaseline) * 100
            );
        }
    }
    
    // Get base tariff rate
    const baseTariffRate = costRecords[0]?.baseTariffRate || 5.0;
    
    return {
        htsCode: hts6,
        baseTariffRate,
        countries,
        cheapestCountry: countries[0]?.countryCode || 'N/A',
        mostExpensiveCountry: countries[countries.length - 1]?.countryCode || 'N/A',
        averageCost: countries.length > 0
            ? countries.reduce((sum, c) => sum + c.totalLandedCost, 0) / countries.length
            : 0,
    };
}

/**
 * Get quick cost comparison summary for display
 */
export async function getQuickCostComparison(
    htsCode: string,
    currentCountry?: string
): Promise<{
    current: { country: string; cost: number } | null;
    cheapest: { country: string; cost: number; savingsPercent: number } | null;
    ftaBest: { country: string; cost: number; ftaName: string } | null;
    countries: Array<{
        code: string;
        name: string;
        cost: number;
        tariffRate: number;
        hasFTA: boolean;
    }>;
}> {
    const comparison = await compareLandedCosts(htsCode, {
        minConfidence: 30,
    });
    
    // Current country cost
    const current = currentCountry
        ? comparison.countries.find(c => c.countryCode === currentCountry)
        : null;
    
    // Cheapest overall
    const cheapest = comparison.countries[0];
    
    // Best FTA country
    const ftaCountries = comparison.countries.filter(c => 
        FTA_COUNTRIES[c.countryCode]
    );
    const ftaBest = ftaCountries[0];
    
    return {
        current: current
            ? { country: current.countryCode, cost: current.totalLandedCost }
            : null,
        cheapest: cheapest
            ? {
                country: cheapest.countryCode,
                cost: cheapest.totalLandedCost,
                savingsPercent: current
                    ? Math.round((1 - cheapest.totalLandedCost / current.totalLandedCost) * 100)
                    : 0,
            }
            : null,
        ftaBest: ftaBest && FTA_COUNTRIES[ftaBest.countryCode]
            ? {
                country: ftaBest.countryCode,
                cost: ftaBest.totalLandedCost,
                ftaName: FTA_COUNTRIES[ftaBest.countryCode].name,
            }
            : null,
        countries: comparison.countries.slice(0, 10).map(c => ({
            code: c.countryCode,
            name: c.country,
            cost: Math.round(c.totalLandedCost * 100) / 100,
            tariffRate: c.tariffs.effectiveRate,
            hasFTA: !!FTA_COUNTRIES[c.countryCode],
        })),
    };
}

/**
 * Enrich HtsCostByCountry records with tariff data
 */
export async function enrichWithTariffData(
    htsCode?: string
): Promise<{ updated: number }> {
    const whereClause = htsCode
        ? { htsCode: htsCode.replace(/\./g, '').substring(0, 6) }
        : {};
    
    const records = await prisma.htsCostByCountry.findMany({
        where: whereClause,
    });
    
    let updated = 0;
    
    for (const record of records) {
        const tariffs = calculateEffectiveTariff(
            record.baseTariffRate || 5.0,
            record.countryCode,
            record.htsCode
        );
        
        await prisma.htsCostByCountry.update({
            where: { id: record.id },
            data: {
                section301Rate: tariffs.section301,
                ieepaRate: tariffs.ieepaRate,
                effectiveTariff: tariffs.effectiveRate,
                hasFTA: !!FTA_COUNTRIES[record.countryCode],
                ftaName: FTA_COUNTRIES[record.countryCode]?.name,
                ftaRate: FTA_COUNTRIES[record.countryCode]?.rate,
            },
        });
        
        updated++;
    }
    
    return { updated };
}
