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
 */

// HTS chapters/headings commonly subject to AD/CVD orders
// This is not exhaustive - there are 500+ active orders

interface ADCVDOrderInfo {
    htsPrefix: string;           // HTS prefix to match (chapter, heading, or subheading)
    productCategory: string;     // Human-readable category
    commonCountries: string[];   // Countries with active orders
    orderCount: number;          // Approximate number of active orders
}

const ADCVD_ORDER_PREFIXES: ADCVDOrderInfo[] = [
    // Steel Products - Most heavily covered
    {
        htsPrefix: '7208',
        productCategory: 'Hot-Rolled Steel',
        commonCountries: ['CN', 'RU', 'BR', 'JP', 'KR', 'TW', 'TR', 'UA'],
        orderCount: 15,
    },
    {
        htsPrefix: '7209',
        productCategory: 'Cold-Rolled Steel',
        commonCountries: ['CN', 'JP', 'KR', 'RU', 'BR', 'IN'],
        orderCount: 12,
    },
    {
        htsPrefix: '7210',
        productCategory: 'Coated Steel Products',
        commonCountries: ['CN', 'IN', 'KR', 'TW'],
        orderCount: 8,
    },
    {
        htsPrefix: '7211',
        productCategory: 'Flat-Rolled Steel',
        commonCountries: ['CN', 'JP', 'KR'],
        orderCount: 6,
    },
    {
        htsPrefix: '7213',
        productCategory: 'Steel Wire Rod',
        commonCountries: ['CN', 'TR', 'UA', 'MD', 'BY'],
        orderCount: 10,
    },
    {
        htsPrefix: '7219',
        productCategory: 'Stainless Steel Sheet',
        commonCountries: ['CN', 'JP', 'KR', 'TW', 'DE'],
        orderCount: 8,
    },
    {
        htsPrefix: '7304',
        productCategory: 'Steel Pipes & Tubes',
        commonCountries: ['CN', 'VN', 'KR', 'IN', 'TR'],
        orderCount: 20,
    },
    {
        htsPrefix: '7306',
        productCategory: 'Steel Pipes & Tubes (Welded)',
        commonCountries: ['CN', 'KR', 'TW', 'TR', 'IN', 'VN'],
        orderCount: 18,
    },
    {
        htsPrefix: '7318',
        productCategory: 'Steel Fasteners (Screws, Bolts)',
        commonCountries: ['CN', 'TW', 'IN'],
        orderCount: 5,
    },

    // Aluminum Products
    {
        htsPrefix: '7604',
        productCategory: 'Aluminum Extrusions',
        commonCountries: ['CN'],
        orderCount: 2,
    },
    {
        htsPrefix: '7606',
        productCategory: 'Aluminum Sheet',
        commonCountries: ['CN'],
        orderCount: 2,
    },
    {
        htsPrefix: '7607',
        productCategory: 'Aluminum Foil',
        commonCountries: ['CN'],
        orderCount: 2,
    },

    // Solar & Renewable Energy
    {
        htsPrefix: '8541.40',
        productCategory: 'Solar Cells & Modules',
        commonCountries: ['CN', 'TW', 'MY', 'TH', 'VN', 'KH'],
        orderCount: 6,
    },

    // Tires
    {
        htsPrefix: '4011.20',
        productCategory: 'Truck & Bus Tires',
        commonCountries: ['CN'],
        orderCount: 2,
    },
    {
        htsPrefix: '4011.10',
        productCategory: 'Passenger Vehicle Tires',
        commonCountries: ['CN', 'KR', 'TW', 'TH', 'VN'],
        orderCount: 5,
    },

    // Wood Products
    {
        htsPrefix: '4407',
        productCategory: 'Softwood Lumber',
        commonCountries: ['CA'],
        orderCount: 2,
    },
    {
        htsPrefix: '4412',
        productCategory: 'Plywood & Hardwood',
        commonCountries: ['CN'],
        orderCount: 2,
    },

    // Chemicals
    {
        htsPrefix: '2904',
        productCategory: 'Organic Chemicals',
        commonCountries: ['CN'],
        orderCount: 3,
    },

    // Paper Products
    {
        htsPrefix: '4810',
        productCategory: 'Coated Paper',
        commonCountries: ['CN', 'ID'],
        orderCount: 4,
    },

    // Appliances & Machinery
    {
        htsPrefix: '8418',
        productCategory: 'Refrigerators & Freezers',
        commonCountries: ['KR', 'MX'],
        orderCount: 2,
    },
    {
        htsPrefix: '8450',
        productCategory: 'Washing Machines',
        commonCountries: ['CN', 'KR', 'MX', 'VN'],
        orderCount: 4,
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
