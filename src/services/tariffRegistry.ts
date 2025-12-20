/**
 * Country Tariff Registry Service
 * 
 * SINGLE SOURCE OF TRUTH for all tariff data by country.
 * 
 * All other services (classification, sourcing, alerts) should consume
 * this service rather than maintaining their own tariff logic.
 * 
 * Key Functions:
 * - getTariffProfile(countryCode): Get complete tariff profile for a country
 * - getEffectiveTariff(countryCode, htsCode): Get effective tariff with product overrides
 * - getAllActivePrograms(countryCode): Get all active tariff programs
 * 
 * Data Sources:
 * - CountryTariffProfile table (seeded + updated via sync jobs)
 * - TariffProgram table (individual tariff programs)
 * - HtsTariffOverride table (product-specific overrides like Section 301 lists)
 * 
 * @see docs/ARCHITECTURE_TARIFF_REGISTRY.md
 */

import { prisma } from '@/lib/db';
import type { 
    CountryTariffProfile, 
    TariffProgram, 
    HtsTariffOverride,
    ProgramType,
    TradeStatus,
} from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TariffProfileWithPrograms extends CountryTariffProfile {
    programs: TariffProgram[];
    htsOverrides?: HtsTariffOverride[];
}

export interface EffectiveTariffResult {
    // Country info
    countryCode: string;
    countryName: string;
    tradeStatus: TradeStatus;
    
    // Base MFN rate (passed in or 0)
    baseMfnRate: number;
    
    // FTA benefits (only waives base, NOT IEEPA)
    hasFta: boolean;
    ftaName: string | null;
    ftaDiscount: number;
    ftaWaivesIeepa: boolean;
    
    // IEEPA (applies to nearly all countries!)
    ieepaRate: number;
    ieepaBreakdown: {
        baseline: number;       // Universal 10%
        fentanyl: number;       // CN: 20%, MX/CA: 25%
        reciprocal: number;     // Country-specific higher rate
    };
    
    // Section 301 (China only)
    section301Rate: number;
    section301Lists: string[];
    
    // Section 232 (steel/aluminum/auto)
    section232Rate: number;
    section232Product: string | null;
    
    // AD/CVD (if applicable)
    adcvdRate: number;
    adcvdWarning: string | null;
    
    // Totals
    totalAdditionalDuties: number;  // Sum of all duties above
    effectiveRate: number;           // Base - FTA + Additional
    
    // Breakdown for UI
    breakdown: Array<{
        program: string;
        rate: number;
        description: string;
        legalReference?: string;
    }>;
    
    // Warnings for user
    warnings: string[];
    
    // Metadata
    dataFreshness: string;
    lastVerified: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the complete tariff profile for a country
 * Returns all programs and pre-computed rates
 */
export async function getTariffProfile(
    countryCode: string
): Promise<TariffProfileWithPrograms | null> {
    const profile = await prisma.countryTariffProfile.findUnique({
        where: { countryCode: countryCode.toUpperCase() },
        include: {
            programs: {
                where: { active: true },
                orderBy: { programType: 'asc' },
            },
        },
    });
    
    return profile;
}

/**
 * Get effective tariff rate for a specific HTS code from a country
 * This is the main function for classification and sourcing
 * 
 * @param countryCode - ISO 2-letter country code
 * @param htsCode - HTS code (any length, will check for overrides)
 * @param options.baseMfnRate - Base MFN rate if known
 * @param options.includeSection232 - Check for steel/aluminum/auto
 */
export async function getEffectiveTariff(
    countryCode: string,
    htsCode: string,
    options: {
        baseMfnRate?: number;
        includeSection232?: boolean;
    } = {}
): Promise<EffectiveTariffResult> {
    const upperCountry = countryCode.toUpperCase();
    const cleanHts = htsCode.replace(/\./g, '');
    const baseMfn = options.baseMfnRate ?? 0;
    
    // Get country profile
    const profile = await getTariffProfile(upperCountry);
    
    // Initialize result with defaults
    const result: EffectiveTariffResult = {
        countryCode: upperCountry,
        countryName: profile?.countryName ?? upperCountry,
        tradeStatus: profile?.tradeStatus ?? 'normal',
        baseMfnRate: baseMfn,
        hasFta: profile?.hasFta ?? false,
        ftaName: profile?.ftaName ?? null,
        ftaDiscount: 0,
        ftaWaivesIeepa: profile?.ftaWaivesIeepa ?? false,
        ieepaRate: 0,
        ieepaBreakdown: { baseline: 0, fentanyl: 0, reciprocal: 0 },
        section301Rate: 0,
        section301Lists: [],
        section232Rate: 0,
        section232Product: null,
        adcvdRate: 0,
        adcvdWarning: null,
        totalAdditionalDuties: 0,
        effectiveRate: baseMfn,
        breakdown: [],
        warnings: [],
        dataFreshness: profile 
            ? `Last verified: ${profile.lastVerified.toLocaleDateString()}`
            : 'No data available',
        lastVerified: profile?.lastVerified ?? new Date(),
    };
    
    if (!profile) {
        // NO HARDCODED FALLBACK - if no profile exists, return 0 with error
        // The tariff registry sync should be run first to populate all countries
        console.error(`[TariffRegistry] NO profile for ${upperCountry} - run tariffRegistrySync first!`);
        result.warnings.push(
            `⚠️ No tariff data for ${upperCountry}. Run /api/tariff-registry/sync to populate.`
        );
        result.effectiveRate = baseMfn; // Only base rate, no additional duties assumed
        result.breakdown.push({
            program: 'Missing Data',
            rate: 0,
            description: 'Tariff registry needs to be synced for this country',
        });
        return result;
    }
    
    // Calculate FTA discount (only waives BASE duty, not IEEPA!)
    if (profile.hasFta && profile.ftaWaivesBaseDuty) {
        result.ftaDiscount = baseMfn;
        result.breakdown.push({
            program: `${profile.ftaName} (Base Duty Waiver)`,
            rate: -baseMfn,
            description: 'FTA waives base MFN duty',
        });
        
        // Add warning that IEEPA still applies (unless USMCA)
        if (!profile.ftaWaivesIeepa) {
            result.warnings.push(
                `⚠️ ${profile.ftaName} waives base duty but 10%+ IEEPA still applies!`
            );
        }
    }
    
    // Calculate IEEPA rates
    if (!profile.ieepaExempt) {
        // Baseline (10% for most countries)
        if (profile.ieepaBaselineRate > 0) {
            result.ieepaBreakdown.baseline = profile.ieepaBaselineRate;
            result.breakdown.push({
                program: 'IEEPA Universal Baseline',
                rate: profile.ieepaBaselineRate,
                description: 'April 2025 reciprocal tariff - applies to nearly all countries',
                legalReference: 'Executive Order 14257',
            });
        }
        
        // Fentanyl (CN, MX, CA)
        if (profile.fentanylActive && profile.fentanylRate) {
            result.ieepaBreakdown.fentanyl = profile.fentanylRate;
            result.breakdown.push({
                program: 'IEEPA Fentanyl Emergency',
                rate: profile.fentanylRate,
                description: 'Fentanyl crisis emergency tariff',
                legalReference: 'Executive Order 14195',
            });
        }
        
        // Country-specific reciprocal (if higher than baseline)
        if (profile.reciprocalRate && profile.reciprocalRate > profile.ieepaBaselineRate) {
            // The reciprocal rate is IN ADDITION to baseline for countries like China
            // Or it REPLACES baseline for countries like Vietnam
            const additionalReciprocal = profile.reciprocalRate - profile.ieepaBaselineRate;
            if (additionalReciprocal > 0) {
                result.ieepaBreakdown.reciprocal = additionalReciprocal;
                result.breakdown.push({
                    program: 'IEEPA Country Reciprocal',
                    rate: additionalReciprocal,
                    description: `Additional reciprocal tariff for ${profile.countryName}`,
                    legalReference: 'Executive Order 14257',
                });
            }
        }
        
        result.ieepaRate = 
            result.ieepaBreakdown.baseline + 
            result.ieepaBreakdown.fentanyl + 
            result.ieepaBreakdown.reciprocal;
    }
    
    // Calculate Section 301 (China only)
    if (profile.section301Active) {
        // Check for HTS-specific overrides first
        const section301Override = await getHtsOverride(
            profile.id, 
            cleanHts, 
            'section_301'
        );
        
        if (section301Override) {
            result.section301Rate = section301Override.rate;
            result.section301Lists.push(section301Override.listName ?? 'Section 301');
            result.breakdown.push({
                program: `Section 301 (${section301Override.listName ?? 'Trade Act'})`,
                rate: section301Override.rate,
                description: section301Override.htsDescription ?? 'China trade tariff',
                legalReference: section301Override.legalReference ?? undefined,
            });
        } else if (profile.section301DefaultRate) {
            // Use default rate
            result.section301Rate = profile.section301DefaultRate;
            result.breakdown.push({
                program: 'Section 301 (estimated)',
                rate: profile.section301DefaultRate,
                description: 'Default Section 301 rate - verify product-specific rate',
            });
        }
    }
    
    // Check Section 232 (steel/aluminum/auto)
    if (options.includeSection232 !== false) {
        const section232 = checkSection232(cleanHts);
        if (section232.applies) {
            result.section232Rate = section232.rate;
            result.section232Product = section232.product;
            result.breakdown.push({
                program: `Section 232 (${section232.product})`,
                rate: section232.rate,
                description: `National security tariff on ${section232.product}`,
                legalReference: 'Trade Expansion Act of 1962, Section 232',
            });
        }
    }
    
    // Calculate totals
    result.totalAdditionalDuties = 
        result.ieepaRate + 
        result.section301Rate + 
        result.section232Rate + 
        result.adcvdRate;
    
    result.effectiveRate = Math.max(0,
        result.baseMfnRate - result.ftaDiscount + result.totalAdditionalDuties
    );
    
    // Add final warning for elevated countries
    if (profile.tradeStatus === 'elevated' && result.totalAdditionalDuties > 25) {
        result.warnings.push(
            `⚠️ HIGH TARIFF ALERT: ${profile.countryName} faces ${result.totalAdditionalDuties}%+ additional duties`
        );
    }
    
    return result;
}

/**
 * Get all active tariff programs for a country
 */
export async function getAllActivePrograms(
    countryCode: string
): Promise<TariffProgram[]> {
    const programs = await prisma.tariffProgram.findMany({
        where: {
            countryProfile: { countryCode: countryCode.toUpperCase() },
            active: true,
        },
        orderBy: [
            { programType: 'asc' },
            { rate: 'desc' },
        ],
    });
    
    return programs;
}

/**
 * Get HTS-specific override (for Section 301 lists, AD/CVD, etc.)
 */
export async function getHtsOverride(
    countryProfileId: string,
    htsCode: string,
    overrideType: ProgramType
): Promise<HtsTariffOverride | null> {
    const cleanHts = htsCode.replace(/\./g, '');
    
    // Try exact match first
    let override = await prisma.htsTariffOverride.findFirst({
        where: {
            countryProfileId,
            overrideType,
            active: true,
            matchType: 'exact',
            htsCode: cleanHts,
        },
    });
    
    if (override) return override;
    
    // Try prefix matches (longest first)
    for (let len = cleanHts.length; len >= 2; len--) {
        const prefix = cleanHts.substring(0, len);
        override = await prisma.htsTariffOverride.findFirst({
            where: {
                countryProfileId,
                overrideType,
                active: true,
                matchType: 'prefix',
                htsCode: prefix,
            },
        });
        if (override) return override;
    }
    
    // Try chapter match
    const chapter = cleanHts.substring(0, 2);
    override = await prisma.htsTariffOverride.findFirst({
        where: {
            countryProfileId,
            overrideType,
            active: true,
            matchType: 'chapter',
            htsCode: chapter,
        },
    });
    
    return override;
}

/**
 * Get all country profiles (for admin/listing)
 */
export async function getAllCountryProfiles(
    options: {
        tradeStatus?: TradeStatus;
        hasFta?: boolean;
        orderBy?: 'name' | 'rate';
    } = {}
): Promise<TariffProfileWithPrograms[]> {
    const whereClause: Record<string, unknown> = {};
    
    if (options.tradeStatus) {
        whereClause.tradeStatus = options.tradeStatus;
    }
    if (options.hasFta !== undefined) {
        whereClause.hasFta = options.hasFta;
    }
    
    const profiles = await prisma.countryTariffProfile.findMany({
        where: whereClause,
        include: {
            programs: {
                where: { active: true },
            },
        },
        orderBy: options.orderBy === 'rate' 
            ? { totalAdditionalRate: 'desc' }
            : { countryName: 'asc' },
    });
    
    return profiles;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if an HTS code is subject to Section 232 (steel/aluminum/auto)
 */
function checkSection232(htsCode: string): { 
    applies: boolean; 
    rate: number; 
    product: string | null;
} {
    const cleanCode = htsCode.replace(/\./g, '');
    const chapter = cleanCode.substring(0, 2);
    const heading = cleanCode.substring(0, 4);
    
    // Steel: Chapter 72 and specific headings in 73
    const steelPrefixes = [
        '72',      // Iron and steel
        '7301', '7302', '7303', '7304', '7305', '7306', '7307', '7308', 
        '7309', '7310', '7311', '7312', '7313', '7317', '7318', '7320', 
        '7321', '7322', '7323', '7324', '7325', '7326'
    ];
    if (steelPrefixes.some(p => cleanCode.startsWith(p))) {
        return { applies: true, rate: 25, product: 'Steel' };
    }
    
    // Aluminum: Chapter 76
    if (chapter === '76') {
        return { applies: true, rate: 25, product: 'Aluminum' };
    }
    
    // Auto: 8703, 8704 (effective April 2025)
    if (heading === '8703' || heading === '8704') {
        return { applies: true, rate: 25, product: 'Automobiles' };
    }
    
    return { applies: false, rate: 0, product: null };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC & UPDATE FUNCTIONS (for scheduled jobs)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Recalculate totalAdditionalRate for a country based on active programs
 */
export async function recalculateTotalRate(countryCode: string): Promise<number> {
    const profile = await getTariffProfile(countryCode);
    if (!profile) return 0;
    
    // Sum all active programs
    let total = 0;
    
    // IEEPA components
    if (!profile.ieepaExempt) {
        total += profile.ieepaBaselineRate ?? 0;
        if (profile.fentanylActive) {
            total += profile.fentanylRate ?? 0;
        }
        // Reciprocal is the higher country-specific rate
        const reciprocalExtra = (profile.reciprocalRate ?? 0) - (profile.ieepaBaselineRate ?? 0);
        if (reciprocalExtra > 0) {
            total += reciprocalExtra;
        }
    }
    
    // Section 301 default
    if (profile.section301Active && profile.section301DefaultRate) {
        total += profile.section301DefaultRate;
    }
    
    // Update the profile
    await prisma.countryTariffProfile.update({
        where: { countryCode },
        data: { 
            totalAdditionalRate: total,
            lastVerified: new Date(),
        },
    });
    
    return total;
}

/**
 * Verify all rates match expected values (for validation)
 */
export async function validateAllProfiles(): Promise<{
    valid: number;
    invalid: number;
    issues: Array<{ country: string; issue: string }>;
}> {
    const profiles = await getAllCountryProfiles();
    const issues: Array<{ country: string; issue: string }> = [];
    let valid = 0;
    let invalid = 0;
    
    for (const profile of profiles) {
        // Recalculate and compare
        const calculated = await recalculateTotalRate(profile.countryCode);
        
        if (Math.abs(calculated - profile.totalAdditionalRate) > 0.1) {
            issues.push({
                country: profile.countryCode,
                issue: `Rate mismatch: stored ${profile.totalAdditionalRate}%, calculated ${calculated}%`,
            });
            invalid++;
        } else {
            valid++;
        }
    }
    
    return { valid, invalid, issues };
}

