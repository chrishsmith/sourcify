/**
 * Comprehensive Additional Duties Calculator v3
 * 
 * NOW WITH LIVE RATES from USITC API!
 * 
 * Calculates ALL applicable tariffs beyond the base MFN rate:
 * 1. Section 301 (China trade - product specific)
 * 2. IEEPA Emergency (Fentanyl + Reciprocal)
 * 3. Section 232 (Steel/Aluminum/Auto)
 * 4. AD/CVD warnings
 * 
 * IMPORTANT: Tariffs are CUMULATIVE - they stack on top of each other!
 */

import type {
    EffectiveTariffRate,
    AdditionalDuty,
    TariffRate,
    TariffExclusion
} from '@/types/tariffLayers.types';
import { findSection301Lists, getSection301Rate } from '@/data/section301Lists';
import { checkADCVDWarning } from '@/data/adcvdOrders';
import { 
    getCountryProfile, 
    isSection232Product,
    IEEPA_PROGRAMS,
    SECTION_232_PROGRAMS,
    type TariffProgram
} from '@/data/tariffPrograms';
import { 
    getLiveAdditionalDuties,
    type LiveTariffRate 
} from './chapter99';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the TOTAL effective tariff rate including all additional duties
 * This is the main function - it returns everything needed for the UI
 * 
 * NOW FETCHES LIVE RATES from USITC API when possible!
 */
export async function calculateEffectiveTariff(
    htsCode: string,
    htsDescription: string,
    baseMfnRate: string,
    countryOfOrigin: string,
    shipmentValue?: number
): Promise<EffectiveTariffRate> {
    const additionalDuties: AdditionalDuty[] = [];
    const exclusions: TariffExclusion[] = [];
    const warnings: string[] = [];

    // Parse base MFN rate
    const baseMfn = parseRate(baseMfnRate);
    let totalAdValorem = baseMfn.numericRate || 0;

    // Get country profile
    const countryProfile = getCountryProfile(countryOfOrigin);

    console.log(`[Duties] Calculating for ${htsCode} from ${countryOfOrigin}`);
    console.log(`[Duties] Base MFN: ${baseMfnRate} (${baseMfn.numericRate}%)`);

    // ═══════════════════════════════════════════════════════════════════
    // TRY LIVE RATES FIRST from USITC API
    // ═══════════════════════════════════════════════════════════════════
    let liveRates: Awaited<ReturnType<typeof getLiveAdditionalDuties>> | null = null;
    let usedLiveRates = false;
    
    try {
        console.log('[Duties] Fetching LIVE rates from USITC API...');
        liveRates = await getLiveAdditionalDuties(htsCode, countryOfOrigin);
        usedLiveRates = true;
        console.log('[Duties] Live rates fetched:', liveRates.dataFreshness);
    } catch (error) {
        console.warn('[Duties] Failed to fetch live rates, using fallback:', error);
        warnings.push('ℹ️ Using cached tariff rates. Live rates unavailable.');
    }

    // ═══════════════════════════════════════════════════════════════════
    // 1. SECTION 301 TARIFFS (China only, product-specific)
    // ═══════════════════════════════════════════════════════════════════
    if (countryOfOrigin === 'CN' || countryOfOrigin === 'HK') {
        // Try live rate first
        if (liveRates?.section301?.numericRate !== null && liveRates?.section301?.numericRate !== undefined) {
            const liveRate = liveRates.section301;
            additionalDuties.push({
                htsCode: liveRate.htsCode,
                programName: 'Section 301',
                programType: 'section_301',
                rate: { rate: liveRate.rate, rateType: 'ad_valorem', numericRate: liveRate.numericRate || 0 },
                authority: 'USTR',
                legalReference: 'Trade Act of 1974, Section 301',
                effectiveDate: '2018-07-06',
                applicable: true,
                description: `${liveRate.description} (LIVE from USITC)`,
            });
            totalAdValorem += liveRate.numericRate || 0;
            console.log(`[Duties] Section 301 (LIVE): +${liveRate.numericRate}%`);
        } else {
            // Fallback to hardcoded mapping
            const section301 = getSection301Rate(htsCode);
            if (section301) {
                const duty = createSection301Duty(section301.rate, section301.listNames);
                additionalDuties.push(duty);
                totalAdValorem += section301.rate;
                console.log(`[Duties] Section 301 (fallback): +${section301.rate}% (${section301.listNames.join(', ')})`);
            } else {
                warnings.push('ℹ️ Section 301: Product may be subject to 7.5-100% tariff depending on list. Verify at USTR.gov');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 2. IEEPA EMERGENCY TARIFFS (Country-wide) - USE LIVE RATES
    // ═══════════════════════════════════════════════════════════════════
    
    // IEEPA Fentanyl (China, Mexico, Canada)
    if (liveRates?.ieepaFentanyl?.numericRate !== null && liveRates?.ieepaFentanyl?.numericRate !== undefined) {
        const liveRate = liveRates.ieepaFentanyl;
        additionalDuties.push({
            htsCode: liveRate.htsCode,
            programName: 'IEEPA Fentanyl Emergency',
            programType: 'ieepa_fentanyl',
            rate: { rate: liveRate.rate, rateType: 'ad_valorem', numericRate: liveRate.numericRate || 0 },
            authority: 'President / IEEPA',
            legalReference: 'International Emergency Economic Powers Act',
            effectiveDate: '2025-02-04',
            applicable: true,
            description: `${liveRate.description} (LIVE from USITC)`,
        });
        totalAdValorem += liveRate.numericRate || 0;
        console.log(`[Duties] IEEPA Fentanyl (LIVE): +${liveRate.numericRate}%`);
    } else {
        // Fallback to hardcoded
        const ieepaFentanylProgram = IEEPA_PROGRAMS.find(p => 
            p.id.includes('fentanyl') && p.affectedCountries.includes(countryOfOrigin)
        );
        if (ieepaFentanylProgram) {
            additionalDuties.push(createIEEPADuty(ieepaFentanylProgram));
            totalAdValorem += ieepaFentanylProgram.rate;
            console.log(`[Duties] IEEPA Fentanyl (fallback): +${ieepaFentanylProgram.rate}%`);
        }
    }
    
    // IEEPA Reciprocal (China-specific high rate)
    if (liveRates?.ieepaReciprocal?.numericRate !== null && liveRates?.ieepaReciprocal?.numericRate !== undefined) {
        const liveRate = liveRates.ieepaReciprocal;
        additionalDuties.push({
            htsCode: liveRate.htsCode,
            programName: 'IEEPA Reciprocal Tariff',
            programType: 'ieepa_reciprocal',
            rate: { rate: liveRate.rate, rateType: 'ad_valorem', numericRate: liveRate.numericRate || 0 },
            authority: 'President / IEEPA',
            legalReference: 'International Emergency Economic Powers Act',
            effectiveDate: '2025-04-09',
            applicable: true,
            description: `${liveRate.description} (LIVE from USITC)`,
        });
        totalAdValorem += liveRate.numericRate || 0;
        console.log(`[Duties] IEEPA Reciprocal (LIVE): +${liveRate.numericRate}%`);
    } else {
        // Fallback to hardcoded
        const ieepaReciprocalProgram = IEEPA_PROGRAMS.find(p => 
            p.id.includes('reciprocal') && p.affectedCountries.includes(countryOfOrigin)
        );
        if (ieepaReciprocalProgram) {
            additionalDuties.push(createIEEPADuty(ieepaReciprocalProgram));
            totalAdValorem += ieepaReciprocalProgram.rate;
            console.log(`[Duties] IEEPA Reciprocal (fallback): +${ieepaReciprocalProgram.rate}%`);
        }
    }
    
    // IEEPA Universal Baseline (10% for nearly ALL countries including FTA partners!)
    // This is the critical addition for April 2025 - affects Singapore, Korea, Australia, etc.
    if (liveRates?.ieepaBaseline?.numericRate !== null && liveRates?.ieepaBaseline?.numericRate !== undefined) {
        const liveRate = liveRates.ieepaBaseline;
        additionalDuties.push({
            htsCode: liveRate.htsCode,
            programName: 'IEEPA Universal Baseline',
            programType: 'ieepa_reciprocal', // Group with reciprocal for UI
            rate: { rate: liveRate.rate, rateType: 'ad_valorem', numericRate: liveRate.numericRate || 0 },
            authority: 'President / IEEPA',
            legalReference: 'International Emergency Economic Powers Act (Executive Order 14257)',
            effectiveDate: '2025-04-09',
            applicable: true,
            description: `${liveRate.description} - ⚠️ This applies even to FTA partners!`,
        });
        totalAdValorem += liveRate.numericRate || 0;
        console.log(`[Duties] IEEPA Baseline: +${liveRate.numericRate}% (applies to ${countryOfOrigin} even with FTA)`);
        warnings.push(`⚠️ 10% IEEPA baseline applies despite any FTA status`);
    } else {
        // Fallback: Check if this country should get the universal baseline
        // Countries NOT subject to baseline: USMCA (MX, CA) when compliant
        const isUSMCA = countryOfOrigin === 'MX' || countryOfOrigin === 'CA';
        const isChina = countryOfOrigin === 'CN' || countryOfOrigin === 'HK';
        
        if (!isUSMCA && !isChina) {
            // Apply 10% baseline to everyone else (including FTA partners!)
            const baselineProgram = IEEPA_PROGRAMS.find(p => p.id === 'ieepa_reciprocal_baseline');
            if (baselineProgram) {
                additionalDuties.push({
                    htsCode: baselineProgram.htsChapter99Code,
                    programName: 'IEEPA Universal Baseline',
                    programType: 'ieepa_reciprocal',
                    rate: { rate: '10%', rateType: 'ad_valorem', numericRate: 10 },
                    authority: 'President / IEEPA',
                    legalReference: baselineProgram.legalBasis,
                    effectiveDate: baselineProgram.effectiveDate,
                    applicable: true,
                    description: `Universal 10% tariff on nearly all imports (April 2025) - ⚠️ Applies even to FTA partners!`,
                });
                totalAdValorem += 10;
                console.log(`[Duties] IEEPA Baseline (fallback): +10% for ${countryOfOrigin}`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 3. SECTION 232 TARIFFS (Product-specific) - USE LIVE RATES
    // ═══════════════════════════════════════════════════════════════════
    const section232 = isSection232Product(htsCode);

    if (section232.steel) {
        const isExempt = checkSection232Exemption(countryOfOrigin, 'steel');
        
        if (!isExempt) {
            if (liveRates?.section232Steel?.numericRate !== null && liveRates?.section232Steel?.numericRate !== undefined) {
                const liveRate = liveRates.section232Steel;
                additionalDuties.push({
                    htsCode: liveRate.htsCode,
                    programName: 'Section 232 Steel',
                    programType: 'section_232',
                    rate: { rate: liveRate.rate, rateType: 'ad_valorem', numericRate: liveRate.numericRate || 0 },
                    authority: 'Commerce / President',
                    legalReference: 'Trade Expansion Act of 1962, Section 232',
                    effectiveDate: '2018-03-23',
                    applicable: true,
                    description: `${liveRate.description} (LIVE from USITC)`,
                });
                totalAdValorem += liveRate.numericRate || 0;
                console.log(`[Duties] Section 232 Steel (LIVE): +${liveRate.numericRate}%`);
            } else {
                const steelProgram = SECTION_232_PROGRAMS.find(p => p.id === 'section232_steel')!;
                additionalDuties.push(createSection232Duty(steelProgram, 'steel'));
                totalAdValorem += steelProgram.rate;
                console.log(`[Duties] Section 232 Steel (fallback): +${steelProgram.rate}%`);
            }
        } else {
            warnings.push('ℹ️ Section 232 Steel: May qualify for quota exemption from ' + countryOfOrigin);
        }
    }

    if (section232.aluminum) {
        const isExempt = checkSection232Exemption(countryOfOrigin, 'aluminum');
        
        if (!isExempt) {
            if (liveRates?.section232Aluminum?.numericRate !== null && liveRates?.section232Aluminum?.numericRate !== undefined) {
                const liveRate = liveRates.section232Aluminum;
                additionalDuties.push({
                    htsCode: liveRate.htsCode,
                    programName: 'Section 232 Aluminum',
                    programType: 'section_232',
                    rate: { rate: liveRate.rate, rateType: 'ad_valorem', numericRate: liveRate.numericRate || 0 },
                    authority: 'Commerce / President',
                    legalReference: 'Trade Expansion Act of 1962, Section 232',
                    effectiveDate: '2018-03-23',
                    applicable: true,
                    description: `${liveRate.description} (LIVE from USITC)`,
                });
                totalAdValorem += liveRate.numericRate || 0;
                console.log(`[Duties] Section 232 Aluminum (LIVE): +${liveRate.numericRate}%`);
            } else {
                const aluminumProgram = SECTION_232_PROGRAMS.find(p => p.id === 'section232_aluminum')!;
                additionalDuties.push(createSection232Duty(aluminumProgram, 'aluminum'));
                totalAdValorem += aluminumProgram.rate;
                console.log(`[Duties] Section 232 Aluminum (fallback): +${aluminumProgram.rate}%`);
            }
        } else {
            warnings.push('ℹ️ Section 232 Aluminum: May qualify for quota exemption from ' + countryOfOrigin);
        }
    }

    if (section232.auto) {
        const autoProgram = SECTION_232_PROGRAMS.find(p => p.id === 'section232_autos');
        if (autoProgram) {
            const isExempt = checkSection232Exemption(countryOfOrigin, 'auto');
            
            if (!isExempt) {
                additionalDuties.push(createSection232Duty(autoProgram, 'auto'));
                totalAdValorem += autoProgram.rate;
                console.log(`[Duties] Section 232 Auto: +${autoProgram.rate}%`);
                warnings.push('⚠️ Auto tariff effective April 3, 2025. Parts tariff effective May 3, 2025.');
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 4. AD/CVD CHECK (Warning only - rates are manufacturer-specific)
    // ═══════════════════════════════════════════════════════════════════
    const adcvdCheck = checkADCVDWarning(htsCode, countryOfOrigin);

    // ═══════════════════════════════════════════════════════════════════
    // 5. TRADE AGREEMENT BENEFITS (Limited as of April 2025!)
    // ═══════════════════════════════════════════════════════════════════
    if (countryProfile?.tradeStatus === 'fta') {
        // IMPORTANT: FTAs now only waive BASE duty, not IEEPA!
        if (countryOfOrigin === 'MX' || countryOfOrigin === 'CA') {
            warnings.push(`💡 USMCA may provide tariff exemptions for compliant goods - verify current status.`);
        } else {
            warnings.push(`⚠️ ${countryProfile.countryName} is an FTA partner BUT the 10% IEEPA baseline still applies!`);
            warnings.push(`💡 FTA may waive the base MFN duty only - not the IEEPA tariff.`);
        }
    }
    
    // Add data source indicator
    if (usedLiveRates && liveRates) {
        warnings.unshift(`✓ ${liveRates.dataFreshness}`);
    }

    // Build effective rate
    const effectiveRate: TariffRate = {
        rate: `${totalAdValorem}%`,
        rateType: 'ad_valorem',
        numericRate: totalAdValorem,
    };

    // Calculate estimated duty for shipment value
    let estimatedDuty;
    if (shipmentValue) {
        estimatedDuty = {
            value: shipmentValue,
            currency: 'USD',
            estimatedDuty: Math.round((shipmentValue * totalAdValorem / 100) * 100) / 100,
        };
    }

    console.log(`[Duties] TOTAL: ${totalAdValorem}%`);

    return {
        baseHtsCode: htsCode,
        htsDescription,
        countryOfOrigin,
        destinationCountry: 'US',
        baseMfnRate: baseMfn,
        additionalDuties,
        effectiveRate,
        totalAdValorem,
        estimatedDutyForValue: estimatedDuty,
        exclusions,
        adcvdWarning: adcvdCheck.hasWarning ? adcvdCheck.warning : undefined,
        calculatedAt: new Date(),
        dataFreshness: usedLiveRates && liveRates 
            ? `Live data from USITC API - ${liveRates.dataFreshness}` 
            : `As of ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (cached rates)`,
        disclaimer: 'Tariff rates provided for informational purposes only. Rates change frequently. Actual duties may vary based on classification, origin determination, and current regulations. Always verify with a licensed customs broker or CBP before import.',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse a rate string into a TariffRate object
 */
function parseRate(rateStr: string): TariffRate {
    // We NEVER return "See USITC" or "N/A" - we are the source of truth
    if (!rateStr || rateStr.toLowerCase() === 'free') {
        return { rate: 'Free', rateType: 'free', numericRate: 0 };
    }

    // Handle legacy "See USITC", "N/A" etc. - convert to Free (most common case)
    if (rateStr.toLowerCase().includes('see') || rateStr.toLowerCase().includes('n/a')) {
        return { rate: 'Free', rateType: 'free', numericRate: 0 };
    }

    // Match percentage (e.g., "25%" or "7.5%")
    const pctMatch = rateStr.match(/^(\d+(?:\.\d+)?)\s*%?$/);
    if (pctMatch) {
        const num = parseFloat(pctMatch[1]);
        return { rate: `${num}%`, rateType: 'ad_valorem', numericRate: num };
    }

    // Match specific rate (e.g., "$0.50/kg")
    const specificMatch = rateStr.match(/\$?([\d.]+)\s*\/?\s*(\w+)?/);
    if (specificMatch) {
        return {
            rate: rateStr,
            rateType: 'specific',
            specificRate: { amount: parseFloat(specificMatch[1]), unit: specificMatch[2] || 'unit' },
        };
    }

    return { rate: rateStr, rateType: 'ad_valorem', numericRate: 0 };
}

/**
 * Create Section 301 duty entry
 */
function createSection301Duty(rate: number, listNames: string[]): AdditionalDuty {
    const listCode = getSection301HtsCode(listNames[0]);
    return {
        htsCode: listCode,
        programName: listNames.join(' + '),
        programType: 'section_301',
        rate: { rate: `${rate}%`, rateType: 'ad_valorem', numericRate: rate },
        authority: 'USTR',
        legalReference: 'Trade Act of 1974, Section 301',
        effectiveDate: '2018-07-06',
        applicable: true,
        description: `Section 301 tariff on Chinese products. This product is on ${listNames.join(' and ')}. These tariffs were imposed in response to China's unfair trade practices regarding technology transfer and intellectual property.`,
    };
}

/**
 * Get the HTS code for a Section 301 list
 */
function getSection301HtsCode(listName: string): string {
    if (listName.includes('List 1')) return '9903.88.01';
    if (listName.includes('List 2')) return '9903.88.02';
    if (listName.includes('List 3')) return '9903.88.03';
    if (listName.includes('List 4A')) return '9903.88.15';
    if (listName.includes('List 4B')) return '9903.88.16';
    if (listName.includes('2024')) return '9903.88.16';
    return '9903.88.00';
}

/**
 * Create IEEPA duty entry
 */
function createIEEPADuty(program: TariffProgram): AdditionalDuty {
    return {
        htsCode: program.htsChapter99Code,
        programName: program.name,
        programType: program.id.includes('fentanyl') ? 'ieepa_fentanyl' : 'ieepa_reciprocal',
        rate: { rate: `${program.rate}%`, rateType: 'ad_valorem', numericRate: program.rate },
        authority: 'President / IEEPA',
        legalReference: program.legalBasis,
        effectiveDate: program.effectiveDate,
        applicable: true,
        description: program.description + ' ' + program.notes.join(' '),
    };
}

/**
 * Create Section 232 duty entry
 */
function createSection232Duty(program: TariffProgram, productType: string): AdditionalDuty {
    return {
        htsCode: program.htsChapter99Code,
        programName: program.name,
        programType: 'section_232',
        rate: { rate: `${program.rate}%`, rateType: 'ad_valorem', numericRate: program.rate },
        authority: 'Commerce / President',
        legalReference: program.legalBasis,
        effectiveDate: program.effectiveDate,
        applicable: true,
        description: `Section 232 national security tariff on ${productType}. ${program.description}`,
    };
}

/**
 * Check if a country has Section 232 exemption
 * Note: Exemptions are complex and change frequently
 */
function checkSection232Exemption(countryCode: string, productType: string): boolean {
    // USMCA countries have quota arrangements, not full exemptions
    // For now, return false (apply tariff) and add warning
    // In production, would need to check quota status
    
    const quotaCountries: Record<string, string[]> = {
        'steel': ['AR', 'AU', 'BR', 'KR'],  // Countries with quota arrangements
        'aluminum': ['AR', 'AU'],
        'auto': [], // No exemptions yet
    };
    
    // Note: USMCA (MX, CA) has complex arrangements - not full exemptions
    // We show the tariff but add warnings about potential exemptions
    
    return quotaCountries[productType]?.includes(countryCode) || false;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Re-export getSection301Rate for use in other modules
export { getSection301Rate } from '@/data/section301Lists';

/**
 * Get IEEPA rate for a country (Fentanyl + Reciprocal combined)
 */
export function getIEEPARate(countryCode: string): number {
    let totalRate = 0;
    
    // Check Fentanyl IEEPA
    const fentanylProgram = IEEPA_PROGRAMS.find(p => 
        p.id.includes('fentanyl') && p.affectedCountries.includes(countryCode)
    );
    if (fentanylProgram) {
        totalRate += fentanylProgram.rate;
    }
    
    // Check Reciprocal IEEPA
    const reciprocalProgram = IEEPA_PROGRAMS.find(p => 
        p.id.includes('reciprocal') && p.affectedCountries.includes(countryCode)
    );
    if (reciprocalProgram) {
        totalRate += reciprocalProgram.rate;
    }
    
    return totalRate;
}

/**
 * Get quick summary of additional duties for a country
 */
export function getCountryDutySummary(countryCode: string): string {
    const profile = getCountryProfile(countryCode);
    
    if (!profile) {
        return 'Standard MFN rates apply';
    }
    
    if (profile.tradeStatus === 'elevated') {
        return `⚠️ HIGH TARIFF COUNTRY: Up to ${profile.totalAdditionalRate}%+ additional duties`;
    }
    
    if (profile.tradeStatus === 'fta') {
        return `✓ FTA Partner: May qualify for reduced/free rates`;
    }
    
    return 'Standard MFN rates apply';
}

/**
 * Check if a country has any blanket additional duties
 */
export function hasAdditionalDuties(countryCode: string): boolean {
    const profile = getCountryProfile(countryCode);
    return profile?.tradeStatus === 'elevated' || false;
}

/**
 * Get all warnings for a country/product combination
 */
export function getTariffWarnings(
    htsCode: string,
    countryOfOrigin: string
): string[] {
    const warnings: string[] = [];
    const profile = getCountryProfile(countryOfOrigin);
    
    if (profile?.tradeStatus === 'elevated') {
        warnings.push(`⚠️ ${profile.countryName} has elevated tariff status with significant additional duties.`);
    }
    
    const section232 = isSection232Product(htsCode);
    if (section232.steel) warnings.push('⚠️ Product is subject to Section 232 steel tariffs (25%)');
    if (section232.aluminum) warnings.push('⚠️ Product is subject to Section 232 aluminum tariffs (25%)');
    if (section232.auto) warnings.push('⚠️ Product may be subject to Section 232 auto tariffs (25%)');
    
    const adcvd = checkADCVDWarning(htsCode, countryOfOrigin);
    if (adcvd.hasWarning) {
        warnings.push(`⚠️ ${adcvd.warning?.message}`);
    }
    
    return warnings;
}
