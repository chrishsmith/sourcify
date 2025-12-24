/**
 * Bill of Lading (BOL) Scraper
 * 
 * Scrapes US import records from public sources.
 * Primary data source for deriving HTS costs by country.
 * 
 * Data sources:
 * - Public CBP data (when available)
 * - ImportGenius-style aggregators (API if available)
 * - Simulated data for development
 */

import { prisma } from '@/lib/db';
import {
    RawShipmentRecord,
    ScraperConfig,
    ScraperResult,
    ScraperError,
    DEFAULT_SCRAPER_CONFIG,
    DataSource,
    normalizeCountryCode,
    normalizeHtsCode,
    calculateUnitValue,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// BOL SCRAPER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const BOL_SCRAPER_CONFIG: ScraperConfig = {
    ...DEFAULT_SCRAPER_CONFIG,
    name: 'bol_scraper',
    rateLimit: 20,
    requestDelay: 3000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface BolScraperOptions {
    /** HTS codes to filter by (optional) */
    htsCodes?: string[];
    /** Countries to filter by (optional) */
    countries?: string[];
    /** Start date for shipments */
    startDate?: Date;
    /** End date for shipments */
    endDate?: Date;
    /** Maximum records to fetch */
    maxRecords?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCRAPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scrape BOL records from configured sources
 */
export async function scrapeBolRecords(
    options: BolScraperOptions = {}
): Promise<ScraperResult<RawShipmentRecord>> {
    const startTime = Date.now();
    const records: RawShipmentRecord[] = [];
    const errors: ScraperError[] = [];
    
    console.log(`[BOL Scraper] Starting scrape with options:`, options);
    
    try {
        // In production, this would call real APIs
        // For now, we use simulated data based on real patterns
        const simulatedRecords = await getSimulatedBolData(options);
        records.push(...simulatedRecords);
        
        console.log(`[BOL Scraper] Retrieved ${records.length} records`);
    } catch (error) {
        errors.push({
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'SCRAPE_ERROR',
        });
    }
    
    return {
        success: errors.length === 0,
        data: records,
        errors,
        stats: {
            totalRecords: records.length,
            successCount: records.length,
            errorCount: errors.length,
            durationMs: Date.now() - startTime,
        },
    };
}

/**
 * Save scraped BOL records to database
 */
export async function saveBolRecords(
    records: RawShipmentRecord[]
): Promise<{ saved: number; errors: number }> {
    let saved = 0;
    let errorCount = 0;
    
    for (const record of records) {
        try {
            const normalizedHts = normalizeHtsCode(record.htsCode);
            const normalizedCountry = normalizeCountryCode(record.shipperCountry);
            const unitValue = calculateUnitValue(record.declaredValue, record.quantity);
            
            await prisma.shipmentRecord.upsert({
                where: {
                    dataSource_sourceRecordId: {
                        dataSource: record.dataSource,
                        sourceRecordId: record.sourceRecordId || `${record.billOfLading || Date.now()}`,
                    },
                },
                create: {
                    billOfLading: record.billOfLading,
                    masterBol: record.masterBol,
                    shipperName: record.shipperName,
                    shipperCountry: normalizedCountry,
                    shipperAddress: record.shipperAddress,
                    consigneeName: record.consigneeName,
                    consigneeAddress: record.consigneeAddress,
                    htsCode: normalizedHts,
                    productDescription: record.productDescription,
                    quantity: record.quantity,
                    quantityUnit: record.quantityUnit,
                    declaredValue: record.declaredValue,
                    weight: record.weight,
                    weightUnit: record.weightUnit,
                    portOfLading: record.portOfLading,
                    portOfUnlading: record.portOfUnlading,
                    carrier: record.carrier,
                    vesselName: record.vesselName,
                    arrivalDate: record.arrivalDate,
                    dataSource: record.dataSource,
                    sourceRecordId: record.sourceRecordId,
                    unitValue,
                },
                update: {
                    declaredValue: record.declaredValue,
                    quantity: record.quantity,
                    unitValue,
                },
            });
            saved++;
        } catch (error) {
            console.error(`[BOL Scraper] Error saving record:`, error);
            errorCount++;
        }
    }
    
    console.log(`[BOL Scraper] Saved ${saved} records, ${errorCount} errors`);
    return { saved, errors: errorCount };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATED DATA (For Development)
// In production, replace with actual API calls
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate simulated BOL data based on real patterns
 * This represents the kind of data we'd get from real sources
 */
async function getSimulatedBolData(
    options: BolScraperOptions
): Promise<RawShipmentRecord[]> {
    const records: RawShipmentRecord[] = [];
    const maxRecords = options.maxRecords || 1000;
    
    // Realistic product/HTS combinations
    const productData = [
        // Plastics (Chapter 39)
        { hts: '3926909910', desc: 'Plastic ear plugs', minPrice: 0.05, maxPrice: 0.20 },
        { hts: '3926909990', desc: 'Other plastic articles', minPrice: 0.10, maxPrice: 2.00 },
        { hts: '3923210000', desc: 'Plastic bags', minPrice: 0.01, maxPrice: 0.10 },
        { hts: '3924100000', desc: 'Plastic tableware', minPrice: 0.15, maxPrice: 1.50 },
        
        // Electronics (Chapter 85)
        { hts: '8518300000', desc: 'Headphones', minPrice: 2.00, maxPrice: 25.00 },
        { hts: '8517620000', desc: 'Networking equipment', minPrice: 10.00, maxPrice: 150.00 },
        { hts: '8504400000', desc: 'Power adapters', minPrice: 1.00, maxPrice: 8.00 },
        { hts: '8544420000', desc: 'Electrical cables', minPrice: 0.50, maxPrice: 5.00 },
        
        // Textiles (Chapter 61-62)
        { hts: '6109100000', desc: 'Cotton t-shirts', minPrice: 1.50, maxPrice: 6.00 },
        { hts: '6110200000', desc: 'Cotton sweaters', minPrice: 4.00, maxPrice: 15.00 },
        { hts: '6203420000', desc: 'Cotton trousers', minPrice: 5.00, maxPrice: 20.00 },
        { hts: '6204620000', desc: 'Cotton pants womens', minPrice: 5.00, maxPrice: 18.00 },
        
        // Footwear (Chapter 64)
        { hts: '6402910000', desc: 'Rubber/plastic footwear', minPrice: 3.00, maxPrice: 15.00 },
        { hts: '6403990000', desc: 'Leather footwear', minPrice: 8.00, maxPrice: 40.00 },
        
        // Machinery (Chapter 84)
        { hts: '8471300000', desc: 'Laptop computers', minPrice: 150.00, maxPrice: 500.00 },
        { hts: '8443320000', desc: 'Printers', minPrice: 25.00, maxPrice: 150.00 },
        
        // Furniture (Chapter 94)
        { hts: '9403600000', desc: 'Wooden furniture', minPrice: 20.00, maxPrice: 200.00 },
        { hts: '9401800000', desc: 'Other seats', minPrice: 15.00, maxPrice: 100.00 },
        
        // Toys (Chapter 95)
        { hts: '9503000000', desc: 'Toys', minPrice: 0.50, maxPrice: 20.00 },
        { hts: '9506990000', desc: 'Sporting goods', minPrice: 2.00, maxPrice: 50.00 },
    ];
    
    // Country distribution (weighted by real import volumes)
    const countries = [
        { code: 'CN', name: 'China', weight: 40, ports: ['Shanghai', 'Shenzhen', 'Ningbo'] },
        { code: 'VN', name: 'Vietnam', weight: 15, ports: ['Ho Chi Minh', 'Hai Phong'] },
        { code: 'IN', name: 'India', weight: 8, ports: ['Mumbai', 'Chennai'] },
        { code: 'MX', name: 'Mexico', weight: 10, ports: ['Manzanillo', 'Veracruz'] },
        { code: 'TW', name: 'Taiwan', weight: 6, ports: ['Kaohsiung', 'Taipei'] },
        { code: 'TH', name: 'Thailand', weight: 5, ports: ['Bangkok', 'Laem Chabang'] },
        { code: 'ID', name: 'Indonesia', weight: 4, ports: ['Jakarta', 'Surabaya'] },
        { code: 'BD', name: 'Bangladesh', weight: 4, ports: ['Chittagong', 'Dhaka'] },
        { code: 'KR', name: 'South Korea', weight: 4, ports: ['Busan', 'Incheon'] },
        { code: 'DE', name: 'Germany', weight: 2, ports: ['Hamburg', 'Bremen'] },
        { code: 'IT', name: 'Italy', weight: 2, ports: ['Genoa', 'Naples'] },
    ];
    
    // US ports
    const usPorts = ['Los Angeles', 'Long Beach', 'New York', 'Savannah', 'Seattle', 'Houston'];
    
    // US importers (fictional but realistic)
    const importers = [
        'ABC Trading Co',
        'Global Imports LLC',
        'American Supply Corp',
        'Continental Distributors',
        'Pacific Rim Trading',
        'Eastwest Commerce Inc',
        'Prime Wholesale Group',
        'National Sourcing Partners',
    ];
    
    // Generate records
    for (let i = 0; i < maxRecords; i++) {
        // Pick product
        const product = productData[Math.floor(Math.random() * productData.length)];
        
        // Pick country (weighted)
        const country = weightedRandomSelect(countries);
        
        // Calculate price with country adjustment
        const countryPriceMultiplier = getCountryPriceMultiplier(country.code);
        const basePrice = product.minPrice + Math.random() * (product.maxPrice - product.minPrice);
        const adjustedPrice = basePrice * countryPriceMultiplier;
        
        // Generate quantity (log-normal distribution for realistic spread)
        const quantity = Math.floor(Math.exp(Math.random() * 4 + 3)); // ~20 to ~8000
        const value = Math.round(quantity * adjustedPrice * 100) / 100;
        
        // Generate supplier name
        const supplierPrefix = country.code === 'CN' ? 
            ['Guangdong', 'Shenzhen', 'Ningbo', 'Dongguan', 'Zhejiang'][Math.floor(Math.random() * 5)] :
            country.name;
        const supplierSuffix = ['Trading Co', 'Manufacturing', 'Industries', 'Export Co', 'Ltd'][Math.floor(Math.random() * 5)];
        const supplierName = `${supplierPrefix} ${product.desc.split(' ')[0]} ${supplierSuffix}`;
        
        // Generate date within last 12 months
        const arrivalDate = new Date();
        arrivalDate.setDate(arrivalDate.getDate() - Math.floor(Math.random() * 365));
        
        records.push({
            billOfLading: `BOL${Date.now()}${i}`,
            shipperName: supplierName,
            shipperCountry: country.code,
            shipperAddress: `${Math.floor(Math.random() * 999) + 1} Industrial Zone, ${country.ports[0]}`,
            consigneeName: importers[Math.floor(Math.random() * importers.length)],
            consigneeAddress: `${Math.floor(Math.random() * 9999) + 1} Commerce Blvd`,
            htsCode: product.hts,
            productDescription: product.desc,
            quantity,
            quantityUnit: 'PCS',
            declaredValue: value,
            weight: quantity * (0.1 + Math.random() * 2),
            weightUnit: 'KG',
            portOfLading: country.ports[Math.floor(Math.random() * country.ports.length)],
            portOfUnlading: usPorts[Math.floor(Math.random() * usPorts.length)],
            arrivalDate,
            dataSource: DataSource.CBP_PUBLIC,
            sourceRecordId: `SIM${Date.now()}${i}`,
        });
    }
    
    // Filter by options if provided
    let filtered = records;
    
    if (options.htsCodes?.length) {
        filtered = filtered.filter(r => 
            options.htsCodes!.some(hts => r.htsCode.startsWith(normalizeHtsCode(hts)))
        );
    }
    
    if (options.countries?.length) {
        filtered = filtered.filter(r => 
            options.countries!.includes(r.shipperCountry)
        );
    }
    
    if (options.startDate) {
        filtered = filtered.filter(r => 
            r.arrivalDate && r.arrivalDate >= options.startDate!
        );
    }
    
    if (options.endDate) {
        filtered = filtered.filter(r => 
            r.arrivalDate && r.arrivalDate <= options.endDate!
        );
    }
    
    return filtered;
}

/**
 * Weighted random selection
 */
function weightedRandomSelect<T extends { weight: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of items) {
        random -= item.weight;
        if (random <= 0) return item;
    }
    
    return items[items.length - 1];
}

/**
 * Get price multiplier by country (cheaper manufacturing = lower prices)
 */
function getCountryPriceMultiplier(countryCode: string): number {
    const multipliers: Record<string, number> = {
        'CN': 1.0,      // Baseline
        'VN': 0.85,     // Cheaper
        'BD': 0.70,     // Cheapest for textiles
        'IN': 0.80,
        'ID': 0.85,
        'TH': 0.95,
        'MX': 1.10,     // Slightly more expensive
        'TW': 1.30,     // Higher quality/price
        'KR': 1.40,
        'DE': 2.50,     // Premium
        'IT': 2.20,
    };
    
    return multipliers[countryCode] || 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPE AND SAVE CONVENIENCE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scrape BOL records and save to database in one step
 */
export async function scrapeAndSaveBolRecords(
    options: BolScraperOptions = {}
): Promise<{
    scraped: number;
    saved: number;
    errors: number;
    durationMs: number;
}> {
    const startTime = Date.now();
    
    const result = await scrapeBolRecords(options);
    
    if (result.data.length === 0) {
        return {
            scraped: 0,
            saved: 0,
            errors: result.errors.length,
            durationMs: Date.now() - startTime,
        };
    }
    
    const saveResult = await saveBolRecords(result.data);
    
    return {
        scraped: result.data.length,
        saved: saveResult.saved,
        errors: saveResult.errors + result.errors.length,
        durationMs: Date.now() - startTime,
    };
}


