/**
 * COMPREHENSIVE US IMPORT TARIFF PROGRAMS
 * 
 * This file contains all tariff programs that can apply to US imports,
 * beyond the base MFN rate. These are "Chapter 99" codes that ADD to
 * the base rate.
 * 
 * TARIFF STACKING ORDER (all apply cumulatively):
 * 1. Base MFN Rate (from HTS code)
 * 2. Section 301 (China trade war - product specific)
 * 3. IEEPA Emergency (Fentanyl + Reciprocal)
 * 4. Section 232 (Steel/Aluminum)
 * 5. AD/CVD (Manufacturer-specific, checked separately)
 * 
 * Last Updated: December 2024
 * Note: Tariff rates change frequently - verify with official sources
 */

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface TariffProgram {
    id: string;
    name: string;
    shortName: string;
    htsChapter99Code: string;
    authority: string;
    legalBasis: string;
    effectiveDate: string;
    expirationDate?: string;
    description: string;
    affectedCountries: string[];
    rate: number;
    rateType: 'ad_valorem' | 'specific' | 'compound';
    productScope: 'all' | 'specific';
    htsPrefixes?: string[];       // If specific products
    exclusions?: string[];        // HTS codes excluded
    notes: string[];
    officialSource: string;
}

export interface CountryTariffSummary {
    countryCode: string;
    countryName: string;
    flag: string;
    tradeStatus: 'normal' | 'fta' | 'sanctioned' | 'elevated';
    applicablePrograms: string[];  // Program IDs
    totalAdditionalRate: number;   // Sum of all additional duties
    notes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 301 - CHINA TRADE TARIFFS
// ═══════════════════════════════════════════════════════════════════════════

export const SECTION_301_PROGRAMS: TariffProgram[] = [
    {
        id: 'section301_list1',
        name: 'Section 301 List 1',
        shortName: 'List 1',
        htsChapter99Code: '9903.88.01',
        authority: 'USTR',
        legalBasis: 'Trade Act of 1974, Section 301',
        effectiveDate: '2018-07-06',
        description: 'First tranche of tariffs on Chinese goods targeting industrial machinery, electronics, and technology products.',
        affectedCountries: ['CN'],
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'specific',
        notes: [
            'Covers ~$34 billion of Chinese imports',
            '818 tariff lines',
            'Focus: Industrial machinery, electronics, technology',
        ],
        officialSource: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions',
    },
    {
        id: 'section301_list2',
        name: 'Section 301 List 2',
        shortName: 'List 2',
        htsChapter99Code: '9903.88.02',
        authority: 'USTR',
        legalBasis: 'Trade Act of 1974, Section 301',
        effectiveDate: '2018-08-23',
        description: 'Second tranche of tariffs targeting chemicals, plastics, and railway equipment from China.',
        affectedCountries: ['CN'],
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'specific',
        notes: [
            'Covers ~$16 billion of Chinese imports',
            '279 tariff lines',
            'Focus: Chemicals, plastics, railway equipment',
        ],
        officialSource: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions',
    },
    {
        id: 'section301_list3',
        name: 'Section 301 List 3',
        shortName: 'List 3',
        htsChapter99Code: '9903.88.03',
        authority: 'USTR',
        legalBasis: 'Trade Act of 1974, Section 301',
        effectiveDate: '2018-09-24',
        description: 'Third tranche covering a broad range of consumer and industrial goods from China.',
        affectedCountries: ['CN'],
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'specific',
        notes: [
            'Covers ~$200 billion of Chinese imports',
            '~5,700 tariff lines',
            'Originally 10%, increased to 25% in May 2019',
            'Broadest list - includes many consumer goods',
        ],
        officialSource: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions',
    },
    {
        id: 'section301_list4a',
        name: 'Section 301 List 4A',
        shortName: 'List 4A',
        htsChapter99Code: '9903.88.15',
        authority: 'USTR',
        legalBasis: 'Trade Act of 1974, Section 301',
        effectiveDate: '2019-09-01',
        description: 'Fourth tranche (A) covering consumer goods at reduced rate.',
        affectedCountries: ['CN'],
        rate: 7.5,
        rateType: 'ad_valorem',
        productScope: 'specific',
        notes: [
            'Covers ~$120 billion of Chinese imports',
            '~3,200 tariff lines',
            'Originally 15%, reduced to 7.5% in Phase One deal',
            'Focus: Consumer goods (clothing, footwear, toys)',
        ],
        officialSource: 'https://ustr.gov/issue-areas/enforcement/section-301-investigations/tariff-actions',
    },
    {
        id: 'section301_2024',
        name: 'Section 301 (2024 Increases)',
        shortName: '2024 Strategic',
        htsChapter99Code: '9903.88.16',
        authority: 'USTR',
        legalBasis: 'Trade Act of 1974, Section 301',
        effectiveDate: '2024-09-27',
        description: 'Strategic tariff increases on EVs, solar cells, batteries, semiconductors, and critical minerals.',
        affectedCountries: ['CN'],
        rate: 100,  // EVs - varies by product
        rateType: 'ad_valorem',
        productScope: 'specific',
        notes: [
            'Electric Vehicles: 100%',
            'Solar Cells: 50%',
            'Semiconductors: 50%',
            'Lithium-ion Batteries: 25%',
            'Critical Minerals: 25%',
            'Steel/Aluminum: 25%',
            'Ship-to-Shore Cranes: 25%',
            'Medical Products: 25-50%',
        ],
        officialSource: 'https://ustr.gov/about-us/policy-offices/press-office/press-releases/2024/may/ustr-finalizes-action-china-tariffs-following-statutory-four-year-review',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// IEEPA EMERGENCY TARIFFS (2025)
// ═══════════════════════════════════════════════════════════════════════════

export const IEEPA_PROGRAMS: TariffProgram[] = [
    {
        id: 'ieepa_fentanyl_cn',
        name: 'IEEPA Fentanyl Emergency (China)',
        shortName: 'Fentanyl (CN)',
        htsChapter99Code: '9903.01.24',
        authority: 'President / IEEPA',
        legalBasis: 'International Emergency Economic Powers Act',
        effectiveDate: '2025-02-04',
        description: 'Emergency tariffs on Chinese goods related to the fentanyl crisis.',
        affectedCountries: ['CN', 'HK'],
        rate: 20,
        rateType: 'ad_valorem',
        productScope: 'all',
        notes: [
            'Applies to virtually ALL Chinese imports',
            'Cumulative with Section 301',
            'First 10% effective Feb 4, 2025',
            'Additional 10% effective Mar 4, 2025 (total 20%)',
            'Executive Order 14195',
        ],
        officialSource: 'https://www.whitehouse.gov/presidential-actions/',
    },
    {
        id: 'ieepa_fentanyl_mx',
        name: 'IEEPA Fentanyl Emergency (Mexico)',
        shortName: 'Fentanyl (MX)',
        htsChapter99Code: '9903.01.26',
        authority: 'President / IEEPA',
        legalBasis: 'International Emergency Economic Powers Act',
        effectiveDate: '2025-03-04',
        description: 'Emergency tariffs on Mexican goods related to the fentanyl crisis.',
        affectedCountries: ['MX'],
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'all',
        exclusions: ['USMCA-compliant goods (paused)'],
        notes: [
            'Subject to USMCA compliance review',
            'May be paused for USMCA-qualifying goods',
            'Verify current status before import',
        ],
        officialSource: 'https://www.whitehouse.gov/presidential-actions/',
    },
    {
        id: 'ieepa_fentanyl_ca',
        name: 'IEEPA Fentanyl Emergency (Canada)',
        shortName: 'Fentanyl (CA)',
        htsChapter99Code: '9903.01.27',
        authority: 'President / IEEPA',
        legalBasis: 'International Emergency Economic Powers Act',
        effectiveDate: '2025-03-04',
        description: 'Emergency tariffs on Canadian goods related to the fentanyl crisis.',
        affectedCountries: ['CA'],
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'all',
        exclusions: ['USMCA-compliant goods (paused)', 'Energy products (paused)'],
        notes: [
            'Subject to USMCA compliance review',
            'Energy products may be exempt',
            'Verify current status before import',
        ],
        officialSource: 'https://www.whitehouse.gov/presidential-actions/',
    },
    {
        id: 'ieepa_reciprocal_cn',
        name: 'IEEPA Reciprocal Tariff (China)',
        shortName: 'Reciprocal (CN)',
        htsChapter99Code: '9903.01.25',
        authority: 'President / IEEPA',
        legalBasis: 'International Emergency Economic Powers Act',
        effectiveDate: '2025-04-09',
        description: 'Reciprocal tariffs to match trade barriers imposed by China.',
        affectedCountries: ['CN', 'HK'],
        rate: 125,  // Increased significantly in 2025
        rateType: 'ad_valorem',
        productScope: 'all',
        notes: [
            'Originally 10%, increased substantially',
            'China total can exceed 145%+ when combined',
            'Check current rates - subject to frequent changes',
            'Executive Order 14257',
        ],
        officialSource: 'https://www.whitehouse.gov/presidential-actions/',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 232 - NATIONAL SECURITY TARIFFS
// ═══════════════════════════════════════════════════════════════════════════

export const SECTION_232_PROGRAMS: TariffProgram[] = [
    {
        id: 'section232_steel',
        name: 'Section 232 Steel Tariffs',
        shortName: 'Steel (232)',
        htsChapter99Code: '9903.80.01',
        authority: 'Commerce / President',
        legalBasis: 'Trade Expansion Act of 1962, Section 232',
        effectiveDate: '2018-03-23',
        description: 'National security tariffs on steel imports.',
        affectedCountries: ['ALL'],  // Varies by country
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'specific',
        htsPrefixes: ['72', '7301', '7302', '7303', '7304', '7305', '7306', '7307', '7308', '7309', '7310', '7311', '7312', '7313', '7317', '7318', '7320', '7321', '7322', '7323', '7324', '7325', '7326'],
        notes: [
            'Applies to steel mill products (Chapter 72) and articles (Chapter 73)',
            'Some countries exempt via quotas or agreements (varies)',
            'USMCA countries: Subject to quotas/exemptions',
            'Rate increased to 25% in March 2025',
        ],
        officialSource: 'https://www.cbp.gov/trade/programs-administration/entry-summary/232-tariffs-aluminum-and-steel',
    },
    {
        id: 'section232_aluminum',
        name: 'Section 232 Aluminum Tariffs',
        shortName: 'Aluminum (232)',
        htsChapter99Code: '9903.85.01',
        authority: 'Commerce / President',
        legalBasis: 'Trade Expansion Act of 1962, Section 232',
        effectiveDate: '2018-03-23',
        description: 'National security tariffs on aluminum imports.',
        affectedCountries: ['ALL'],  // Varies by country
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'specific',
        htsPrefixes: ['76'],
        notes: [
            'Applies to aluminum products (Chapter 76)',
            'Originally 10%, increased to 25% in March 2025',
            'Some countries exempt via quotas or agreements',
            'USMCA countries: Subject to quotas/exemptions',
        ],
        officialSource: 'https://www.cbp.gov/trade/programs-administration/entry-summary/232-tariffs-aluminum-and-steel',
    },
    {
        id: 'section232_autos',
        name: 'Section 232 Auto Tariffs',
        shortName: 'Autos (232)',
        htsChapter99Code: '9903.85.05',
        authority: 'Commerce / President',
        legalBasis: 'Trade Expansion Act of 1962, Section 232',
        effectiveDate: '2025-04-03',
        description: 'National security tariffs on automobile imports.',
        affectedCountries: ['ALL'],
        rate: 25,
        rateType: 'ad_valorem',
        productScope: 'specific',
        htsPrefixes: ['8703', '8704'],
        notes: [
            'Applies to passenger vehicles and light trucks',
            'Effective April 3, 2025',
            'Auto parts tariffs scheduled for May 3, 2025',
            'USMCA compliance may provide relief',
        ],
        officialSource: 'https://www.cbp.gov/trade/programs-administration/entry-summary/232-tariffs',
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// COUNTRY PROFILES - Pre-calculated summaries
// ═══════════════════════════════════════════════════════════════════════════

export const COUNTRY_TARIFF_PROFILES: CountryTariffSummary[] = [
    {
        countryCode: 'CN',
        countryName: 'China',
        flag: '🇨🇳',
        tradeStatus: 'elevated',
        applicablePrograms: [
            'section301_list1', 'section301_list2', 'section301_list3', 
            'section301_list4a', 'section301_2024',
            'ieepa_fentanyl_cn', 'ieepa_reciprocal_cn',
            'section232_steel', 'section232_aluminum'
        ],
        totalAdditionalRate: 145,  // Base estimate, varies by product
        notes: [
            '⚠️ Highest tariff rates of any country',
            'Section 301: 7.5% to 100% (product dependent)',
            'IEEPA Fentanyl: 20%',
            'IEEPA Reciprocal: 125%+',
            'Total can exceed 145% on many products',
            'Check product-specific rates carefully',
        ],
    },
    {
        countryCode: 'HK',
        countryName: 'Hong Kong',
        flag: '🇭🇰',
        tradeStatus: 'elevated',
        applicablePrograms: ['ieepa_fentanyl_cn', 'ieepa_reciprocal_cn'],
        totalAdditionalRate: 145,
        notes: [
            'Treated same as China for tariff purposes',
            'All China tariffs apply',
        ],
    },
    {
        countryCode: 'MX',
        countryName: 'Mexico',
        flag: '🇲🇽',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_fentanyl_mx'],
        totalAdditionalRate: 25,
        notes: [
            'USMCA member - may qualify for duty-free',
            'Fentanyl tariff: 25% (may be paused for USMCA goods)',
            'Must meet USMCA rules of origin',
            'Steel/Aluminum: Subject to quotas',
        ],
    },
    {
        countryCode: 'CA',
        countryName: 'Canada',
        flag: '🇨🇦',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_fentanyl_ca'],
        totalAdditionalRate: 25,
        notes: [
            'USMCA member - may qualify for duty-free',
            'Fentanyl tariff: 25% (may be paused for USMCA goods)',
            'Energy products may be exempt',
            'Steel/Aluminum: Subject to quotas',
        ],
    },
    {
        countryCode: 'VN',
        countryName: 'Vietnam',
        flag: '🇻🇳',
        tradeStatus: 'normal',
        applicablePrograms: [],
        totalAdditionalRate: 0,
        notes: [
            'Standard MFN rates apply',
            'Popular alternative sourcing country',
            'Check for AD/CVD on specific products (solar, tires)',
        ],
    },
    {
        countryCode: 'TW',
        countryName: 'Taiwan',
        flag: '🇹🇼',
        tradeStatus: 'normal',
        applicablePrograms: [],
        totalAdditionalRate: 0,
        notes: [
            'Standard MFN rates apply',
            'NOT treated as China for tariff purposes',
            'Check for AD/CVD on specific products',
        ],
    },
    {
        countryCode: 'KR',
        countryName: 'South Korea',
        flag: '🇰🇷',
        tradeStatus: 'fta',
        applicablePrograms: [],
        totalAdditionalRate: 0,
        notes: [
            'US-Korea FTA (KORUS) - many products duty-free',
            'Steel subject to quota arrangements',
            'Check for AD/CVD on specific products (steel, appliances)',
        ],
    },
    {
        countryCode: 'JP',
        countryName: 'Japan',
        flag: '🇯🇵',
        tradeStatus: 'normal',
        applicablePrograms: [],
        totalAdditionalRate: 0,
        notes: [
            'Standard MFN rates apply',
            'US-Japan Trade Agreement covers some agriculture',
            'Check for AD/CVD on specific products (steel)',
        ],
    },
    {
        countryCode: 'DE',
        countryName: 'Germany',
        flag: '🇩🇪',
        tradeStatus: 'normal',
        applicablePrograms: [],
        totalAdditionalRate: 0,
        notes: [
            'EU member - standard MFN rates apply',
            'Steel/Aluminum: Subject to Section 232 (25%)',
            'Auto tariffs may apply (25% as of April 2025)',
        ],
    },
    {
        countryCode: 'IN',
        countryName: 'India',
        flag: '🇮🇳',
        tradeStatus: 'normal',
        applicablePrograms: [],
        totalAdditionalRate: 0,
        notes: [
            'Standard MFN rates apply',
            'GSP eligibility suspended',
            'Check for AD/CVD on specific products',
        ],
    },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all applicable programs for a country
 */
export function getCountryPrograms(countryCode: string): TariffProgram[] {
    const allPrograms = [...SECTION_301_PROGRAMS, ...IEEPA_PROGRAMS, ...SECTION_232_PROGRAMS];
    return allPrograms.filter(p => 
        p.affectedCountries.includes(countryCode) || 
        p.affectedCountries.includes('ALL')
    );
}

/**
 * Get country profile
 */
export function getCountryProfile(countryCode: string): CountryTariffSummary | undefined {
    return COUNTRY_TARIFF_PROFILES.find(p => p.countryCode === countryCode);
}

/**
 * Check if a product is subject to Section 232
 */
export function isSection232Product(htsCode: string): { steel: boolean; aluminum: boolean; auto: boolean } {
    const cleanCode = htsCode.replace(/\./g, '');
    const chapter = cleanCode.substring(0, 2);
    const heading = cleanCode.substring(0, 4);
    
    // Steel: Chapter 72 and specific headings in 73
    const steelPrefixes = ['72', '7301', '7302', '7303', '7304', '7305', '7306', '7307', '7308', '7309', '7310', '7311', '7312', '7313', '7317', '7318', '7320', '7321', '7322', '7323', '7324', '7325', '7326'];
    const isSteel = steelPrefixes.some(p => cleanCode.startsWith(p));
    
    // Aluminum: Chapter 76
    const isAluminum = chapter === '76';
    
    // Auto: 8703, 8704
    const isAuto = ['8703', '8704'].includes(heading);
    
    return { steel: isSteel, aluminum: isAluminum, auto: isAuto };
}

/**
 * Get summary for UI display
 */
export function getTariffSummaryForCountry(countryCode: string, htsCode: string): {
    baseRateNote: string;
    additionalDuties: { name: string; rate: string; code: string; description: string }[];
    totalEstimate: string;
    warnings: string[];
} {
    const profile = getCountryProfile(countryCode);
    const section232 = isSection232Product(htsCode);
    const additionalDuties: { name: string; rate: string; code: string; description: string }[] = [];
    const warnings: string[] = [];
    
    let totalAdditional = 0;
    
    if (profile) {
        // Add country-specific duties
        for (const programId of profile.applicablePrograms) {
            const program = [...SECTION_301_PROGRAMS, ...IEEPA_PROGRAMS, ...SECTION_232_PROGRAMS]
                .find(p => p.id === programId);
            if (program) {
                // For Section 301, check if product is covered
                if (program.id.startsWith('section301') && program.productScope === 'specific') {
                    // Would need to check against full mapping
                    additionalDuties.push({
                        name: program.shortName,
                        rate: `${program.rate}%*`,
                        code: program.htsChapter99Code,
                        description: `${program.description} (*if product on list)`,
                    });
                } else {
                    additionalDuties.push({
                        name: program.shortName,
                        rate: `${program.rate}%`,
                        code: program.htsChapter99Code,
                        description: program.description,
                    });
                    totalAdditional += program.rate;
                }
            }
        }
        
        warnings.push(...profile.notes);
    }
    
    // Add Section 232 if applicable
    if (section232.steel) {
        additionalDuties.push({
            name: 'Steel (232)',
            rate: '25%',
            code: '9903.80.01',
            description: 'Section 232 steel tariff',
        });
        totalAdditional += 25;
        warnings.push('⚠️ Section 232 steel tariffs apply');
    }
    
    if (section232.aluminum) {
        additionalDuties.push({
            name: 'Aluminum (232)',
            rate: '25%',
            code: '9903.85.01',
            description: 'Section 232 aluminum tariff',
        });
        totalAdditional += 25;
        warnings.push('⚠️ Section 232 aluminum tariffs apply');
    }
    
    if (section232.auto) {
        additionalDuties.push({
            name: 'Auto (232)',
            rate: '25%',
            code: '9903.85.05',
            description: 'Section 232 auto tariff',
        });
        totalAdditional += 25;
        warnings.push('⚠️ Section 232 auto tariffs apply (effective April 2025)');
    }
    
    return {
        baseRateNote: 'See HTS code for base MFN rate',
        additionalDuties,
        totalEstimate: totalAdditional > 0 ? `+${totalAdditional}% additional` : 'No additional duties',
        warnings,
    };
}

