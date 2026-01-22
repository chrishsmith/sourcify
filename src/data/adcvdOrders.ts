/**
 * AD/CVD (Anti-Dumping / Countervailing Duty) Warning Data
 * 
 * This module provides warnings for HTS codes that may be subject to AD/CVD orders.
 * Since AD/CVD rates are manufacturer-specific and change frequently, we only provide
 * warnings rather than exact rates.
 * 
 * Data sources:
 * - ITC AD/CVD Orders: https://www.usitc.gov/trade_remedy/documents/orders.xls
 * - CBP AD/CVD Search: https://aceservices.cbp.dhs.gov/adcvdweb
 * - ITA Searchable Database: https://www.trade.gov/data-visualization/adcvd-orders-searchable-database
 */

// HTS chapters/headings commonly subject to AD/CVD orders
// This is not exhaustive - there are 500+ active orders

export interface ADCVDOrderInfo {
    htsPrefix: string;           // HTS prefix to match (chapter, heading, or subheading)
    productCategory: string;     // Human-readable category
    commonCountries: string[];   // Countries with active orders
    orderCount: number;          // Approximate number of active orders
    dutyRange?: string;          // Estimated duty range (e.g., "20%-265%")
    caseNumbers?: string[];      // Example case numbers for reference
    notes?: string;              // Additional notes
}

const ADCVD_ORDER_PREFIXES: ADCVDOrderInfo[] = [
    // Steel Products - Most heavily covered
    {
        htsPrefix: '7208',
        productCategory: 'Hot-Rolled Steel',
        commonCountries: ['CN', 'RU', 'BR', 'JP', 'KR', 'TW', 'TR', 'UA'],
        orderCount: 15,
        dutyRange: '20%-265%',
        caseNumbers: ['A-570-865', 'A-421-807'],
        notes: 'Hot-rolled flat products. Multiple orders by country and mill.',
    },
    {
        htsPrefix: '7209',
        productCategory: 'Cold-Rolled Steel',
        commonCountries: ['CN', 'JP', 'KR', 'RU', 'BR', 'IN'],
        orderCount: 12,
        dutyRange: '15%-522%',
        caseNumbers: ['A-570-970', 'A-580-881'],
        notes: 'Cold-rolled carbon steel flat products.',
    },
    {
        htsPrefix: '7210',
        productCategory: 'Coated Steel Products',
        commonCountries: ['CN', 'IN', 'KR', 'TW'],
        orderCount: 8,
        dutyRange: '10%-210%',
        caseNumbers: ['A-570-959'],
        notes: 'Includes galvanized, corrosion-resistant steel.',
    },
    {
        htsPrefix: '7211',
        productCategory: 'Flat-Rolled Steel',
        commonCountries: ['CN', 'JP', 'KR'],
        orderCount: 6,
        dutyRange: '25%-180%',
        notes: 'Flat-rolled products not elsewhere specified.',
    },
    {
        htsPrefix: '7213',
        productCategory: 'Steel Wire Rod',
        commonCountries: ['CN', 'TR', 'UA', 'MD', 'BY'],
        orderCount: 10,
        dutyRange: '15%-145%',
        caseNumbers: ['A-570-012', 'A-489-501'],
        notes: 'Carbon and alloy steel wire rod.',
    },
    {
        htsPrefix: '7219',
        productCategory: 'Stainless Steel Sheet',
        commonCountries: ['CN', 'JP', 'KR', 'TW', 'DE'],
        orderCount: 8,
        dutyRange: '15%-76%',
        caseNumbers: ['A-570-042'],
        notes: 'Stainless steel sheet and strip.',
    },
    {
        htsPrefix: '7304',
        productCategory: 'Steel Pipes & Tubes (Seamless)',
        commonCountries: ['CN', 'VN', 'KR', 'IN', 'TR'],
        orderCount: 20,
        dutyRange: '30%-500%+',
        caseNumbers: ['A-570-956', 'A-552-817'],
        notes: 'OCTG and other seamless steel pipes. Highly scrutinized.',
    },
    {
        htsPrefix: '7306',
        productCategory: 'Steel Pipes & Tubes (Welded)',
        commonCountries: ['CN', 'KR', 'TW', 'TR', 'IN', 'VN'],
        orderCount: 18,
        dutyRange: '20%-450%',
        caseNumbers: ['A-570-910', 'A-580-876'],
        notes: 'Welded carbon steel pipes, including line pipe.',
    },
    {
        htsPrefix: '7318',
        productCategory: 'Steel Fasteners (Screws, Bolts)',
        commonCountries: ['CN', 'TW', 'IN'],
        orderCount: 5,
        dutyRange: '25%-118%',
        caseNumbers: ['A-570-963'],
        notes: 'Carbon steel bolts, nuts, screws from China.',
    },

    // Aluminum Products
    {
        htsPrefix: '7604',
        productCategory: 'Aluminum Extrusions',
        commonCountries: ['CN'],
        orderCount: 2,
        dutyRange: '30%-376%',
        caseNumbers: ['A-570-967', 'C-570-968'],
        notes: 'Major order covering most aluminum extrusions from China.',
    },
    {
        htsPrefix: '7606',
        productCategory: 'Aluminum Sheet',
        commonCountries: ['CN'],
        orderCount: 2,
        dutyRange: '50%-100%',
        caseNumbers: ['A-570-053'],
        notes: 'Common alloy aluminum sheet.',
    },
    {
        htsPrefix: '7607',
        productCategory: 'Aluminum Foil',
        commonCountries: ['CN'],
        orderCount: 2,
        dutyRange: '40%-229%',
        caseNumbers: ['A-570-053'],
        notes: 'Household and converter aluminum foil.',
    },

    // Solar & Renewable Energy
    {
        htsPrefix: '8541.40',
        productCategory: 'Solar Cells & Modules',
        commonCountries: ['CN', 'TW', 'MY', 'TH', 'VN', 'KH'],
        orderCount: 6,
        dutyRange: '15%-250%',
        caseNumbers: ['A-570-979', 'A-583-853'],
        notes: 'Crystalline silicon photovoltaic cells and modules. Significant circumvention concerns.',
    },

    // Tires
    {
        htsPrefix: '4011.20',
        productCategory: 'Truck & Bus Tires',
        commonCountries: ['CN'],
        orderCount: 2,
        dutyRange: '20%-100%',
        caseNumbers: ['A-570-016'],
        notes: 'Off-the-road tires including truck and bus.',
    },
    {
        htsPrefix: '4011.10',
        productCategory: 'Passenger Vehicle Tires',
        commonCountries: ['CN', 'KR', 'TW', 'TH', 'VN'],
        orderCount: 5,
        dutyRange: '10%-87%',
        caseNumbers: ['A-570-912'],
        notes: 'Passenger vehicle and light truck tires.',
    },

    // Wood Products
    {
        htsPrefix: '4407',
        productCategory: 'Softwood Lumber',
        commonCountries: ['CA'],
        orderCount: 2,
        dutyRange: '5%-24%',
        caseNumbers: ['A-122-857', 'C-122-858'],
        notes: 'Long-running dispute with Canada. Rates vary by producer.',
    },
    {
        htsPrefix: '4412',
        productCategory: 'Plywood & Hardwood',
        commonCountries: ['CN'],
        orderCount: 2,
        dutyRange: '15%-184%',
        caseNumbers: ['A-570-051'],
        notes: 'Hardwood plywood products.',
    },

    // Chemicals
    {
        htsPrefix: '2904',
        productCategory: 'Organic Chemicals',
        commonCountries: ['CN'],
        orderCount: 3,
        dutyRange: '20%-135%',
        notes: 'Various organic chemical compounds.',
    },

    // Paper Products
    {
        htsPrefix: '4810',
        productCategory: 'Coated Paper',
        commonCountries: ['CN', 'ID'],
        orderCount: 4,
        dutyRange: '10%-135%',
        caseNumbers: ['A-570-958'],
        notes: 'Glossy and coated paper suitable for high-quality print.',
    },

    // Appliances & Machinery
    {
        htsPrefix: '8418',
        productCategory: 'Refrigerators & Freezers',
        commonCountries: ['KR', 'MX'],
        orderCount: 2,
        dutyRange: '5%-80%',
        caseNumbers: ['A-580-868'],
        notes: 'Bottom mount refrigerators from Korea.',
    },
    {
        htsPrefix: '8450',
        productCategory: 'Washing Machines',
        commonCountries: ['CN', 'KR', 'MX', 'VN'],
        orderCount: 4,
        dutyRange: '10%-132%',
        caseNumbers: ['A-580-867', 'A-570-928'],
        notes: 'Large residential washers. Circumvention orders from multiple countries.',
    },
];

/**
 * Check if an HTS code may be subject to AD/CVD orders
 */
export function checkADCVDWarning(htsCode: string, countryOfOrigin?: string): {
    hasWarning: boolean;
    warning?: {
        productCategory: string;
        message: string;
        affectedCountries: string[];
        lookupUrl: string;
        isCountryAffected: boolean;
    };
} {
    const cleanCode = htsCode.replace(/\./g, '');

    // Find matching order prefix
    const matchingOrder = ADCVD_ORDER_PREFIXES.find(order => {
        const prefix = order.htsPrefix.replace(/\./g, '');
        return cleanCode.startsWith(prefix);
    });

    if (!matchingOrder) {
        return { hasWarning: false };
    }

    const isCountryAffected = countryOfOrigin
        ? matchingOrder.commonCountries.includes(countryOfOrigin)
        : false;

    const countryNames = matchingOrder.commonCountries
        .slice(0, 4)
        .map(code => getCountryName(code))
        .join(', ');

    return {
        hasWarning: true,
        warning: {
            productCategory: matchingOrder.productCategory,
            message: isCountryAffected
                ? `This product category (${matchingOrder.productCategory}) has active AD/CVD orders from your origin country. Additional manufacturer-specific duties of 10% to 500%+ may apply.`
                : `This product category (${matchingOrder.productCategory}) has AD/CVD orders from ${countryNames}. If sourcing from these countries, additional duties may apply.`,
            affectedCountries: matchingOrder.commonCountries,
            lookupUrl: 'https://aceservices.cbp.dhs.gov/adcvdweb',
            isCountryAffected,
        },
    };
}

/**
 * Get country name from code
 */
function getCountryName(code: string): string {
    const names: Record<string, string> = {
        'CN': 'China',
        'RU': 'Russia',
        'BR': 'Brazil',
        'JP': 'Japan',
        'KR': 'South Korea',
        'TW': 'Taiwan',
        'TR': 'Turkey',
        'UA': 'Ukraine',
        'IN': 'India',
        'VN': 'Vietnam',
        'TH': 'Thailand',
        'MY': 'Malaysia',
        'CA': 'Canada',
        'MX': 'Mexico',
        'DE': 'Germany',
        'ID': 'Indonesia',
        'MD': 'Moldova',
        'BY': 'Belarus',
        'KH': 'Cambodia',
    };
    return names[code] || code;
}

/**
 * Get high-level AD/CVD exposure by chapter
 */
export function getChapterADCVDRisk(chapter: string): 'high' | 'medium' | 'low' | 'none' {
    const highRiskChapters = ['72', '73']; // Iron & Steel
    const mediumRiskChapters = ['76', '85', '40', '44', '48']; // Aluminum, Electrical, Rubber, Wood, Paper

    if (highRiskChapters.includes(chapter)) return 'high';
    if (mediumRiskChapters.includes(chapter)) return 'medium';

    // Check if any prefix matches this chapter
    const hasOrders = ADCVD_ORDER_PREFIXES.some(order =>
        order.htsPrefix.startsWith(chapter)
    );

    return hasOrders ? 'low' : 'none';
}

/**
 * Get all AD/CVD orders in the database
 */
export function getAllADCVDOrders(): ADCVDOrderInfo[] {
    return [...ADCVD_ORDER_PREFIXES];
}

/**
 * Get AD/CVD orders that affect a specific country
 */
export function getADCVDOrdersByCountry(countryCode: string): ADCVDOrderInfo[] {
    return ADCVD_ORDER_PREFIXES.filter(order =>
        order.commonCountries.includes(countryCode.toUpperCase())
    );
}

/**
 * Get AD/CVD orders matching an HTS code prefix
 */
export function getADCVDOrdersByHTS(htsCode: string): ADCVDOrderInfo[] {
    const cleanCode = htsCode.replace(/\./g, '');
    
    return ADCVD_ORDER_PREFIXES.filter(order => {
        const prefix = order.htsPrefix.replace(/\./g, '');
        // Check if HTS starts with order prefix OR order prefix starts with HTS
        return cleanCode.startsWith(prefix) || prefix.startsWith(cleanCode);
    });
}

/**
 * Get countries with most AD/CVD orders
 */
export function getTopADCVDCountries(limit = 10): Array<{ code: string; name: string; orderCount: number }> {
    const countryOrderCounts: Record<string, number> = {};
    
    for (const order of ADCVD_ORDER_PREFIXES) {
        for (const country of order.commonCountries) {
            countryOrderCounts[country] = (countryOrderCounts[country] || 0) + order.orderCount;
        }
    }
    
    const sorted = Object.entries(countryOrderCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
    
    return sorted.map(([code, count]) => ({
        code,
        name: getCountryName(code),
        orderCount: count,
    }));
}

/**
 * Get product categories with highest AD/CVD exposure
 */
export function getHighestRiskCategories(): ADCVDOrderInfo[] {
    return [...ADCVD_ORDER_PREFIXES]
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 10);
}
