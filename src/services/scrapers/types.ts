/**
 * Scraper Types and Interfaces
 * Common types used across all scrapers
 */

// ═══════════════════════════════════════════════════════════════════════════════
// RAW DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw shipment record from BOL data
 */
export interface RawShipmentRecord {
    // Shipment identification
    billOfLading?: string;
    masterBol?: string;
    
    // Parties
    shipperName: string;
    shipperCountry: string;
    shipperAddress?: string;
    consigneeName: string;
    consigneeAddress?: string;
    
    // Product details
    htsCode: string;
    productDescription?: string;
    quantity?: number;
    quantityUnit?: string;
    declaredValue?: number;
    weight?: number;
    weightUnit?: string;
    
    // Logistics
    portOfLading?: string;
    portOfUnlading?: string;
    carrier?: string;
    vesselName?: string;
    arrivalDate?: Date;
    
    // Metadata
    dataSource: string;
    sourceRecordId?: string;
}

/**
 * Raw supplier record from directory/trade show
 */
export interface RawSupplierRecord {
    name: string;
    countryCode: string;
    countryName?: string;
    region?: string;
    city?: string;
    address?: string;
    
    website?: string;
    email?: string;
    phone?: string;
    
    description?: string;
    productCategories?: string[];
    materials?: string[];
    certifications?: string[];
    
    employeeCount?: string;
    yearEstablished?: number;
    
    dataSource: string;
    sourceUrl?: string;
    sourceRecordId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScraperConfig {
    /** Name of the scraper */
    name: string;
    /** Rate limit: requests per minute */
    rateLimit: number;
    /** Delay between requests in ms */
    requestDelay: number;
    /** Max retries on failure */
    maxRetries: number;
    /** Timeout for requests in ms */
    timeout: number;
    /** User agent string */
    userAgent: string;
}

export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
    name: 'default',
    rateLimit: 30,
    requestDelay: 2000,
    maxRetries: 3,
    timeout: 30000,
    userAgent: 'Mozilla/5.0 (compatible; SourceifyBot/1.0; +https://sourcify.com/bot)',
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPER RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ScraperResult<T> {
    success: boolean;
    data: T[];
    errors: ScraperError[];
    stats: {
        totalRecords: number;
        successCount: number;
        errorCount: number;
        durationMs: number;
    };
}

export interface ScraperError {
    message: string;
    code?: string;
    recordId?: string;
    details?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATA SOURCE ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum DataSource {
    // BOL Sources
    CBP_PUBLIC = 'cbp_public',
    IMPORT_GENIUS = 'importgenius',
    PANJIVA = 'panjiva',
    
    // Directory Sources
    THOMASNET = 'thomasnet',
    KOMPASS = 'kompass',
    ALIBABA = 'alibaba',
    GLOBAL_SOURCES = 'globalsources',
    
    // Trade Shows
    CANTON_FAIR = 'canton_fair',
    CES = 'ces',
    MAGIC = 'magic',
    
    // Certifications
    ISO = 'iso',
    BSCI = 'bsci',
    SEDEX = 'sedex',
    
    // Other
    MANUAL = 'manual',
    API = 'api',
}

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTRY CODES
// ═══════════════════════════════════════════════════════════════════════════════

export const COUNTRY_CODES: Record<string, string> = {
    'China': 'CN',
    'Vietnam': 'VN',
    'India': 'IN',
    'Mexico': 'MX',
    'Taiwan': 'TW',
    'Thailand': 'TH',
    'Indonesia': 'ID',
    'Malaysia': 'MY',
    'Bangladesh': 'BD',
    'Philippines': 'PH',
    'South Korea': 'KR',
    'Japan': 'JP',
    'Germany': 'DE',
    'Italy': 'IT',
    'Turkey': 'TR',
    'Brazil': 'BR',
    'Canada': 'CA',
    'United Kingdom': 'GB',
    'France': 'FR',
    'Spain': 'ES',
    'Poland': 'PL',
    'Pakistan': 'PK',
    'Cambodia': 'KH',
    'Sri Lanka': 'LK',
    'Egypt': 'EG',
    'Morocco': 'MA',
    'South Africa': 'ZA',
    'Colombia': 'CO',
    'Peru': 'PE',
    'Chile': 'CL',
};

/**
 * Normalize country name to ISO 2-letter code
 */
export function normalizeCountryCode(country: string): string {
    if (!country) return 'XX';
    
    // Already a 2-letter code
    if (country.length === 2 && country === country.toUpperCase()) {
        return country;
    }
    
    // Look up in map
    const normalized = country.trim();
    if (COUNTRY_CODES[normalized]) {
        return COUNTRY_CODES[normalized];
    }
    
    // Try case-insensitive lookup
    const lower = normalized.toLowerCase();
    for (const [name, code] of Object.entries(COUNTRY_CODES)) {
        if (name.toLowerCase() === lower) {
            return code;
        }
    }
    
    // Return first 2 letters as fallback
    return normalized.substring(0, 2).toUpperCase();
}

/**
 * Normalize HTS code format (remove dots, ensure proper length)
 */
export function normalizeHtsCode(hts: string): string {
    if (!hts) return '';
    
    // Remove non-numeric characters except dots
    let cleaned = hts.replace(/[^0-9.]/g, '');
    
    // Remove dots for consistent storage
    cleaned = cleaned.replace(/\./g, '');
    
    // Pad to at least 6 digits (subheading level)
    if (cleaned.length < 6) {
        cleaned = cleaned.padEnd(6, '0');
    }
    
    return cleaned;
}

/**
 * Calculate unit value from declared value and quantity
 */
export function calculateUnitValue(value?: number, quantity?: number): number | undefined {
    if (!value || !quantity || quantity === 0) {
        return undefined;
    }
    return Math.round((value / quantity) * 100) / 100; // Round to 2 decimal places
}





