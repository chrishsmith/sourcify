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
    // ═══════════════════════════════════════════════════════════════════
    // UNIVERSAL BASELINE TARIFF (April 2025)
    // This 10% applies to NEARLY ALL imports regardless of FTAs
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'ieepa_reciprocal_baseline',
        name: 'IEEPA Universal Baseline Tariff',
        shortName: 'Universal 10%',
        htsChapter99Code: '9903.01.20',
        authority: 'President / IEEPA',
        legalBasis: 'International Emergency Economic Powers Act',
        effectiveDate: '2025-04-09',
        description: 'Universal 10% baseline tariff on nearly all imports to address trade deficits.',
        affectedCountries: ['ALL'],  // Applies to most countries
        rate: 10,
        rateType: 'ad_valorem',
        productScope: 'all',
        exclusions: ['USMCA-compliant goods from CA/MX (paused)', 'Some energy products'],
        notes: [
            '⚠️ APPLIES ON TOP OF FTA PREFERENCES',
            'Even Singapore FTA goods face this 10%',
            'Even KORUS FTA (Korea) goods face this 10%',
            'Overrides traditional FTA duty-free treatment',
            'Executive Order 14257 - Reciprocal Trade',
            'Some country-specific higher rates exist (see below)',
        ],
        officialSource: 'https://www.whitehouse.gov/presidential-actions/',
    },
    // ═══════════════════════════════════════════════════════════════════
    // FENTANYL EMERGENCY TARIFFS
    // ═══════════════════════════════════════════════════════════════════
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
            'Cumulative with Section 301 AND Universal Baseline',
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
        exclusions: ['USMCA-compliant goods (status varies)'],
        notes: [
            'Subject to USMCA compliance review',
            'Status changes frequently - verify before import',
            'May be paused/active depending on negotiations',
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
        exclusions: ['USMCA-compliant goods (status varies)', 'Energy products (status varies)'],
        notes: [
            'Subject to USMCA compliance review',
            'Energy products may be exempt',
            'Status changes frequently - verify before import',
        ],
        officialSource: 'https://www.whitehouse.gov/presidential-actions/',
    },
    // ═══════════════════════════════════════════════════════════════════
    // RECIPROCAL TARIFFS (Country-Specific Higher Rates)
    // These are IN ADDITION TO the 10% baseline for specific countries
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'ieepa_reciprocal_cn',
        name: 'IEEPA Reciprocal Tariff (China)',
        shortName: 'Reciprocal (CN)',
        htsChapter99Code: '9903.01.25',
        authority: 'President / IEEPA',
        legalBasis: 'International Emergency Economic Powers Act',
        effectiveDate: '2025-04-09',
        description: 'Additional reciprocal tariffs on China beyond the baseline.',
        affectedCountries: ['CN', 'HK'],
        rate: 125,  // This is ON TOP of fentanyl 20% + Section 301
        rateType: 'ad_valorem',
        productScope: 'all',
        notes: [
            'ADDS to Fentanyl 20% + Section 301 rates',
            'China total can exceed 145%+ when combined',
            'Subject to frequent changes - verify current rate',
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
        // Section 232 covers raw/semi-finished steel and structural articles
        // NOT covered: household goods (7323), sanitary ware (7324), consumer products
        htsPrefixes: ['72', '7301', '7302', '7303', '7304', '7305', '7306', '7307', '7308', '7309', '7310', '7311', '7312', '7313'],
        notes: [
            'Applies to steel mill products (Chapter 72) and structural articles (7301-7313)',
            'NOT covered: Household kitchenware (7323), sanitary ware, consumer goods',
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

/**
 * COUNTRY TARIFF PROFILES - Updated December 2025
 * 
 * IMPORTANT: As of April 2025, a universal 10% IEEPA reciprocal baseline
 * applies to NEARLY ALL countries, including FTA partners!
 * 
 * FTAs may waive the BASE MFN duty, but the 10% IEEPA still applies.
 */
export const COUNTRY_TARIFF_PROFILES: CountryTariffSummary[] = [
    // ═══════════════════════════════════════════════════════════════════
    // ELEVATED TARIFF COUNTRIES (China + fentanyl targets)
    // ═══════════════════════════════════════════════════════════════════
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
    // ═══════════════════════════════════════════════════════════════════
    // USMCA COUNTRIES (Special handling - tariffs may be paused)
    // ═══════════════════════════════════════════════════════════════════
    {
        countryCode: 'MX',
        countryName: 'Mexico',
        flag: '🇲🇽',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_fentanyl_mx'],
        totalAdditionalRate: 25,  // When active; may be paused for USMCA goods
        notes: [
            '⚠️ USMCA goods may have tariffs paused - status varies',
            'Fentanyl tariff: 25% (check current status)',
            'Must meet USMCA rules of origin for any exemption',
            'Steel/Aluminum: Subject to quotas',
            'Verify current status before import',
        ],
    },
    {
        countryCode: 'CA',
        countryName: 'Canada',
        flag: '🇨🇦',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_fentanyl_ca'],
        totalAdditionalRate: 25,  // When active; may be paused for USMCA goods
        notes: [
            '⚠️ USMCA goods may have tariffs paused - status varies',
            'Fentanyl tariff: 25% (check current status)',
            'Energy products may be exempt',
            'Steel/Aluminum: Subject to quotas',
            'Verify current status before import',
        ],
    },
    // ═══════════════════════════════════════════════════════════════════
    // FTA COUNTRIES (Subject to universal 10% despite FTA)
    // ═══════════════════════════════════════════════════════════════════
    {
        countryCode: 'SG',
        countryName: 'Singapore',
        flag: '🇸🇬',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,  // Universal baseline applies!
        notes: [
            '⚠️ US-Singapore FTA still in force BUT...',
            '10% IEEPA reciprocal baseline STILL APPLIES',
            'FTA may waive base MFN duty only',
            'No fentanyl-specific tariffs on Singapore',
            'Per Enterprise Singapore FAQs - USSFTA does not exempt from April 2025 tariffs',
        ],
    },
    {
        countryCode: 'KR',
        countryName: 'South Korea',
        flag: '🇰🇷',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,  // Universal baseline applies!
        notes: [
            '⚠️ KORUS FTA still in force BUT...',
            '10% IEEPA reciprocal baseline STILL APPLIES',
            'FTA may waive base MFN duty only',
            'Steel subject to quota arrangements',
            'Check for AD/CVD on specific products (steel, appliances)',
        ],
    },
    {
        countryCode: 'AU',
        countryName: 'Australia',
        flag: '🇦🇺',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,  // Universal baseline applies!
        notes: [
            '⚠️ Australia FTA still in force BUT...',
            '10% IEEPA reciprocal baseline STILL APPLIES',
            'FTA may waive base MFN duty only',
        ],
    },
    {
        countryCode: 'IL',
        countryName: 'Israel',
        flag: '🇮🇱',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,
        notes: [
            '⚠️ US-Israel FTA still in force BUT...',
            '10% IEEPA reciprocal baseline STILL APPLIES',
        ],
    },
    {
        countryCode: 'CL',
        countryName: 'Chile',
        flag: '🇨🇱',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,
        notes: [
            '⚠️ Chile FTA still in force BUT...',
            '10% IEEPA reciprocal baseline STILL APPLIES',
        ],
    },
    {
        countryCode: 'CO',
        countryName: 'Colombia',
        flag: '🇨🇴',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,
        notes: [
            '⚠️ Colombia TPA still in force BUT...',
            '10% IEEPA reciprocal baseline STILL APPLIES',
        ],
    },
    {
        countryCode: 'PE',
        countryName: 'Peru',
        flag: '🇵🇪',
        tradeStatus: 'fta',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,
        notes: [
            '⚠️ Peru TPA still in force BUT...',
            '10% IEEPA reciprocal baseline STILL APPLIES',
        ],
    },
    // ═══════════════════════════════════════════════════════════════════
    // STANDARD MFN COUNTRIES (Subject to universal 10%)
    // ═══════════════════════════════════════════════════════════════════
    {
        countryCode: 'VN',
        countryName: 'Vietnam',
        flag: '🇻🇳',
        tradeStatus: 'elevated',  // Changed from 'normal' - has higher reciprocal rate
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 46,  // Higher reciprocal rate for Vietnam
        notes: [
            '⚠️ 46% reciprocal tariff rate (not just 10%)',
            'One of the higher reciprocal rates',
            'Popular China alternative but significant tariff cost',
            'Check for AD/CVD on specific products (solar, tires)',
        ],
    },
    {
        countryCode: 'TW',
        countryName: 'Taiwan',
        flag: '🇹🇼',
        tradeStatus: 'normal',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,  // Baseline 10%
        notes: [
            '10% IEEPA reciprocal baseline applies',
            'NOT treated as China for tariff purposes',
            'Check for AD/CVD on specific products',
        ],
    },
    {
        countryCode: 'JP',
        countryName: 'Japan',
        flag: '🇯🇵',
        tradeStatus: 'normal',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,
        notes: [
            '10% IEEPA reciprocal baseline applies',
            'US-Japan Trade Agreement covers some agriculture',
            'Check for AD/CVD on specific products (steel)',
        ],
    },
    {
        countryCode: 'DE',
        countryName: 'Germany',
        flag: '🇩🇪',
        tradeStatus: 'normal',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,  // EU rate
        notes: [
            '10% IEEPA reciprocal baseline applies',
            'EU member - no FTA with US',
            'Steel/Aluminum: Subject to Section 232 (25%)',
            'Auto tariffs: 25% as of April 2025',
        ],
    },
    {
        countryCode: 'IN',
        countryName: 'India',
        flag: '🇮🇳',
        tradeStatus: 'elevated',  // Changed - has higher reciprocal rate
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 26,  // Higher reciprocal rate for India
        notes: [
            '⚠️ 26% reciprocal tariff rate (not just 10%)',
            'GSP eligibility suspended',
            'Check for AD/CVD on specific products',
        ],
    },
    {
        countryCode: 'TH',
        countryName: 'Thailand',
        flag: '🇹🇭',
        tradeStatus: 'elevated',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 36,  // Higher reciprocal rate
        notes: [
            '⚠️ 36% reciprocal tariff rate',
            'Popular manufacturing hub',
        ],
    },
    {
        countryCode: 'ID',
        countryName: 'Indonesia',
        flag: '🇮🇩',
        tradeStatus: 'elevated',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 32,  // Higher reciprocal rate
        notes: [
            '⚠️ 32% reciprocal tariff rate',
            'Growing manufacturing base',
        ],
    },
    {
        countryCode: 'MY',
        countryName: 'Malaysia',
        flag: '🇲🇾',
        tradeStatus: 'elevated',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 24,
        notes: [
            '⚠️ 24% reciprocal tariff rate',
            'Electronics manufacturing hub',
        ],
    },
    {
        countryCode: 'BD',
        countryName: 'Bangladesh',
        flag: '🇧🇩',
        tradeStatus: 'elevated',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 37,
        notes: [
            '⚠️ 37% reciprocal tariff rate',
            'Major apparel/textile source',
        ],
    },
    {
        countryCode: 'KH',
        countryName: 'Cambodia',
        flag: '🇰🇭',
        tradeStatus: 'elevated',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 49,
        notes: [
            '⚠️ 49% reciprocal tariff rate',
            'One of the higher reciprocal rates',
        ],
    },
    {
        countryCode: 'PH',
        countryName: 'Philippines',
        flag: '🇵🇭',
        tradeStatus: 'normal',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 17,
        notes: [
            '17% reciprocal tariff rate',
            'Lower than many Asian alternatives',
        ],
    },
    {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        flag: '🇬🇧',
        tradeStatus: 'normal',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,
        notes: [
            '10% IEEPA reciprocal baseline applies',
            'No FTA with US',
        ],
    },
    {
        countryCode: 'TR',
        countryName: 'Turkey',
        flag: '🇹🇷',
        tradeStatus: 'normal',
        applicablePrograms: ['ieepa_reciprocal_baseline'],
        totalAdditionalRate: 10,
        notes: [
            '10% IEEPA reciprocal baseline applies',
            'Steel/Aluminum: Subject to Section 232',
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
    return allPrograms.filter(p => {
        // Check direct country match
        if (p.affectedCountries.includes(countryCode)) return true;
        
        // Check 'ALL' (universal programs)
        if (p.affectedCountries.includes('ALL')) {
            // USMCA countries may be exempt from universal baseline when goods are compliant
            // For now, include them but add warnings
            return true;
        }
        
        return false;
    });
}

/**
 * Get country-specific reciprocal tariff rate
 * These are the "reciprocal tariff" rates announced in April 2025
 * Some countries face higher rates than the 10% baseline
 */
export function getCountryReciprocalRate(countryCode: string): number {
    const reciprocalRates: Record<string, number> = {
        // Fentanyl-targeted + Reciprocal
        'CN': 145,  // Fentanyl 20% + Reciprocal 125% (on top of Section 301)
        'HK': 145,  // Same as China
        
        // USMCA - rates may be paused/active, show worst case
        'MX': 25,   // Fentanyl tariff (may be paused)
        'CA': 25,   // Fentanyl tariff (may be paused)
        
        // Higher reciprocal rates (country-specific)
        'VN': 46,
        'KH': 49,
        'BD': 37,
        'TH': 36,
        'ID': 32,
        'IN': 26,
        'MY': 24,
        'KR': 25,  // KORUS FTA but baseline applies
        'JP': 24,
        'TW': 32,
        'PH': 17,
        
        // EU countries
        'DE': 20, 'IT': 20, 'FR': 20, 'ES': 20, 'NL': 20, 'BE': 20, 'PL': 20,
        
        // Standard baseline
        'GB': 10,
        'SG': 10,  // Singapore FTA doesn't exempt from this
        'AU': 10,
        'IL': 10,
        'CL': 10,
        'CO': 10,
        'PE': 10,
    };
    
    // Default to 10% baseline for unlisted countries
    return reciprocalRates[countryCode] ?? 10;
}

/**
 * Get country profile
 */
export function getCountryProfile(countryCode: string): CountryTariffSummary | undefined {
    return COUNTRY_TARIFF_PROFILES.find(p => p.countryCode === countryCode);
}

/**
 * Check if a product is subject to Section 232 steel/aluminum tariffs
 * 
 * IMPORTANT: Section 232 covers RAW/SEMI-FINISHED steel, not consumer goods!
 * 
 * Per Proclamation 9705 (March 2018), Section 232 steel covers:
 * - Chapter 72: All (iron/steel in primary forms, semi-finished, flat-rolled, etc.)
 * - Chapter 73: Only SPECIFIC industrial/structural steel articles
 *   - 7301-7313: Structural steel, pipes, tubes, wire, etc.
 *   - Some 7317: Nails/tacks (industrial)
 *   - Some 7318: Screws/bolts (industrial fasteners)
 * 
 * NOT COVERED (finished consumer goods):
 * - 7314: Fencing wire cloth
 * - 7315: Chain
 * - 7316: Anchors
 * - 7319: Needles, pins
 * - 7320: Springs
 * - 7321: Stoves, ranges, cookers
 * - 7322: Radiators, air heaters
 * - 7323: HOUSEHOLD/KITCHEN ARTICLES (pots, pans, water bottles, etc.)
 * - 7324: Sanitary ware
 * - 7325: Other cast articles
 * - 7326: Other articles of iron/steel
 * 
 * Source: https://www.cbp.gov/trade/programs-administration/entry-summary/232-tariffs-aluminum-and-steel
 */
export function isSection232Product(htsCode: string): { steel: boolean; aluminum: boolean; auto: boolean } {
    const cleanCode = htsCode.replace(/\./g, '');
    const chapter = cleanCode.substring(0, 2);
    const heading = cleanCode.substring(0, 4);
    
    // Steel: Chapter 72 FULLY covered
    // Chapter 73: Only industrial/structural headings (NOT household goods)
    const section232SteelPrefixes = [
        '72',     // All of Chapter 72 (iron/steel primary forms)
        '7301',   // Sheet piling
        '7302',   // Railway track construction
        '7303',   // Tubes, pipes of cast iron
        '7304',   // Seamless tubes/pipes/hollow profiles
        '7305',   // Tubes/pipes > 406.4mm (welded)
        '7306',   // Other tubes/pipes (welded, riveted)
        '7307',   // Tube/pipe fittings
        '7308',   // Structures (bridges, towers, etc.)
        '7309',   // Reservoirs, tanks, vats > 300L
        '7310',   // Tanks, casks, drums < 300L
        '7311',   // Containers for compressed gas
        '7312',   // Stranded wire, ropes, cables
        '7313',   // Barbed wire, twisted hoop
        // 7314-7316: NOT covered (fencing, chain, anchors)
        // 7317-7318: PARTIAL coverage - only certain industrial fasteners
        // For simplicity, we exclude these as most consumer products are exempt
        // 7319-7326: NOT covered (consumer/household goods)
    ];
    
    const isSteel = section232SteelPrefixes.some(prefix => cleanCode.startsWith(prefix));
    
    // Aluminum: Chapter 76 (unwrought aluminum and certain articles)
    // Note: Some finished aluminum products may also be excluded
    const isAluminum = chapter === '76';
    
    // Auto: 8703, 8704 (passenger vehicles, light trucks)
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


