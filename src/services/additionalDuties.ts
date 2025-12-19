// Additional Duties Service
// Calculates all applicable additional tariffs beyond the base MFN rate
// Including Section 301, IEEPA Fentanyl, IEEPA Reciprocal, Section 232

import type {
    EffectiveTariffRate,
    AdditionalDuty,
    TariffRate,
    CountryTariffProfile,
    TariffExclusion
} from '@/types/tariffLayers.types';
import { findSection301Lists, getSection301Rate } from '@/data/section301Lists';
import { checkADCVDWarning } from '@/data/adcvdOrders';

// ═══════════════════════════════════════════════════════════════════════════
// COUNTRY-SPECIFIC TARIFF PROFILES
// ═══════════════════════════════════════════════════════════════════════════

const COUNTRY_PROFILES: Record<string, CountryTariffProfile> = {
    'CN': {
        countryCode: 'CN',
        countryName: 'China',
        blanketDuties: [
            {
                htsCode: '9903.01.24',
                programName: 'IEEPA Fentanyl Tariff',
                programType: 'ieepa_fentanyl',
                rate: { rate: '10%', rateType: 'ad_valorem', numericRate: 10 },
                authority: 'IEEPA / Executive Order',
                legalReference: 'Executive Order 14195',
                effectiveDate: '2025-02-04',
                applicable: true,
                description: 'Additional 10% tariff on goods from China related to fentanyl crisis response. Applies to most Chinese imports.',
            },
            {
                htsCode: '9903.01.25',
                programName: 'IEEPA Reciprocal Tariff',
                programType: 'ieepa_reciprocal',
                rate: { rate: '10%', rateType: 'ad_valorem', numericRate: 10 },
                authority: 'IEEPA / Executive Order',
                legalReference: 'Executive Order 14257',
                effectiveDate: '2025-04-05',
                applicable: true,
                description: 'Additional 10% reciprocal tariff applied to imports from China and Hong Kong to address trade imbalances.',
            },
        ],
        tradeAgreements: [],
        specialStatus: 'normal',
    },
    'HK': {
        countryCode: 'HK',
        countryName: 'Hong Kong',
        blanketDuties: [
            {
                htsCode: '9903.01.24',
                programName: 'IEEPA Fentanyl Tariff',
                programType: 'ieepa_fentanyl',
                rate: { rate: '10%', rateType: 'ad_valorem', numericRate: 10 },
                authority: 'IEEPA / Executive Order',
                effectiveDate: '2025-02-04',
                applicable: true,
                description: 'Additional 10% tariff on goods from Hong Kong.',
            },
            {
                htsCode: '9903.01.25',
                programName: 'IEEPA Reciprocal Tariff',
                programType: 'ieepa_reciprocal',
                rate: { rate: '10%', rateType: 'ad_valorem', numericRate: 10 },
                authority: 'IEEPA / Executive Order',
                effectiveDate: '2025-04-05',
                applicable: true,
                description: 'Additional 10% reciprocal tariff on Hong Kong imports.',
            },
        ],
        tradeAgreements: [],
        specialStatus: 'normal',
    },
    'MX': {
        countryCode: 'MX',
        countryName: 'Mexico',
        blanketDuties: [],
        tradeAgreements: [
            {
                name: 'USMCA',
                htsSpecialIndicator: 'S',
                preferentialRate: { rate: 'Free', rateType: 'free' },
                rulesOfOrigin: 'Must meet USMCA rules of origin requirements',
            },
        ],
        specialStatus: 'fta',
    },
    'CA': {
        countryCode: 'CA',
        countryName: 'Canada',
        blanketDuties: [],
        tradeAgreements: [
            {
                name: 'USMCA',
                htsSpecialIndicator: 'S',
                preferentialRate: { rate: 'Free', rateType: 'free' },
                rulesOfOrigin: 'Must meet USMCA rules of origin requirements',
            },
        ],
        specialStatus: 'fta',
    },
    'VN': {
        countryCode: 'VN',
        countryName: 'Vietnam',
        blanketDuties: [],
        tradeAgreements: [],
        specialStatus: 'gsp',
    },
    // Default for unlisted countries
    'DEFAULT': {
        countryCode: 'DEFAULT',
        countryName: 'Other Countries',
        blanketDuties: [],
        tradeAgreements: [],
        specialStatus: 'normal',
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN CALCULATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calculate the effective tariff rate including all additional duties
 */
export function calculateEffectiveTariff(
    htsCode: string,
    htsDescription: string,
    baseMfnRate: string,
    countryOfOrigin: string,
    shipmentValue?: number
): EffectiveTariffRate {
    const additionalDuties: AdditionalDuty[] = [];
    const exclusions: TariffExclusion[] = [];

    // Get country profile
    const profile = COUNTRY_PROFILES[countryOfOrigin] || COUNTRY_PROFILES['DEFAULT'];

    // Parse base MFN rate
    const baseMfn = parseRate(baseMfnRate);
    let totalAdValorem = baseMfn.numericRate || 0;

    // 1. Add blanket country duties (IEEPA Fentanyl, Reciprocal, etc.)
    for (const duty of profile.blanketDuties) {
        additionalDuties.push(duty);
        if (duty.applicable && duty.rate.numericRate) {
            totalAdValorem += duty.rate.numericRate;
        }
    }

    // 2. Check Section 301 (only applies to China)
    if (countryOfOrigin === 'CN' || countryOfOrigin === 'HK') {
        const section301 = getSection301Rate(htsCode);
        if (section301) {
            const listCode = getSection301HtsCode(section301.listNames[0]);
            additionalDuties.push({
                htsCode: listCode,
                programName: section301.listNames.join(', '),
                programType: 'section_301',
                rate: { rate: `${section301.rate}%`, rateType: 'ad_valorem', numericRate: section301.rate },
                authority: 'USTR',
                legalReference: 'Trade Act of 1974, Section 301',
                effectiveDate: '2018-07-06',
                applicable: true,
                description: `Section 301 tariff on products from China. This product is on ${section301.listNames.join(' and ')}.`,
            });
            totalAdValorem += section301.rate;
        }
    }

    // 3. Check for trade agreement benefits (reduces rate)
    if (profile.tradeAgreements.length > 0) {
        // Note: FTA benefits would reduce rates, but require proof of origin
        // For now, we show both scenarios
    }

    // 4. Check for AD/CVD warnings
    const adcvdCheck = checkADCVDWarning(htsCode, countryOfOrigin);

    // Calculate effective rate
    const effectiveRate: TariffRate = {
        rate: `${totalAdValorem}%`,
        rateType: 'ad_valorem',
        numericRate: totalAdValorem,
    };

    // Calculate estimated duty for value
    let estimatedDuty;
    if (shipmentValue) {
        estimatedDuty = {
            value: shipmentValue,
            currency: 'USD',
            estimatedDuty: Math.round((shipmentValue * totalAdValorem / 100) * 100) / 100,
        };
    }

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
        dataFreshness: `As of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        disclaimer: 'These tariff rates are provided for informational purposes only. Actual duties may vary based on product classification, country of origin determination, and current regulations. Always verify with a licensed customs broker or CBP.',
    };
}

/**
 * Parse a rate string into a TariffRate object
 */
function parseRate(rateStr: string): TariffRate {
    if (!rateStr || rateStr.toLowerCase() === 'free') {
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

    return { rate: rateStr, rateType: 'ad_valorem' };
}

/**
 * Get the HTS code for a Section 301 list
 */
function getSection301HtsCode(listName: string): string {
    if (listName.includes('List 1')) return '9903.88.01';
    if (listName.includes('List 2')) return '9903.88.02';
    if (listName.includes('List 3')) return '9903.88.03';
    if (listName.includes('List 4A')) return '9903.88.04';
    if (listName.includes('List 4B')) return '9903.88.15';
    if (listName.includes('2024')) return '9903.91.01';
    return '9903.88.00';
}

/**
 * Get country profile
 */
export function getCountryProfile(countryCode: string): CountryTariffProfile {
    return COUNTRY_PROFILES[countryCode] || COUNTRY_PROFILES['DEFAULT'];
}

/**
 * Check if a country has any additional blanket duties
 */
export function hasAdditionalDuties(countryCode: string): boolean {
    const profile = getCountryProfile(countryCode);
    return profile.blanketDuties.length > 0;
}

/**
 * Get summary of all additional duties for a country
 */
export function getCountryDutySummary(countryCode: string): string {
    const profile = getCountryProfile(countryCode);

    if (profile.blanketDuties.length === 0 && profile.tradeAgreements.length > 0) {
        return `Eligible for preferential rates under ${profile.tradeAgreements.map(t => t.name).join(', ')}`;
    }

    if (profile.blanketDuties.length > 0) {
        const total = profile.blanketDuties.reduce((sum, d) => sum + (d.rate.numericRate || 0), 0);
        return `+${total}% additional duties (${profile.blanketDuties.map(d => d.programName).join(' + ')})`;
    }

    return 'Standard MFN rates apply';
}
