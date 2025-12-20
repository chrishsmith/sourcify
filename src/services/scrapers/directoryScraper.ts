/**
 * Business Directory Scraper
 * 
 * Scrapes supplier data from business directories.
 * Sources: ThomasNet, Kompass, Alibaba, GlobalSources
 * 
 * Used for supplier discovery and verification.
 */

import { prisma } from '@/lib/db';
import {
    RawSupplierRecord,
    ScraperConfig,
    ScraperResult,
    ScraperError,
    DEFAULT_SCRAPER_CONFIG,
    DataSource,
    normalizeCountryCode,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECTORY SCRAPER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const DIRECTORY_SCRAPER_CONFIG: ScraperConfig = {
    ...DEFAULT_SCRAPER_CONFIG,
    name: 'directory_scraper',
    rateLimit: 10,
    requestDelay: 5000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCRAPER INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

export interface DirectoryScraperOptions {
    /** Directories to scrape */
    sources?: DataSource[];
    /** Product categories to search */
    productCategories?: string[];
    /** Countries to filter by */
    countries?: string[];
    /** Maximum records per source */
    maxRecordsPerSource?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCRAPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scrape supplier records from business directories
 */
export async function scrapeDirectories(
    options: DirectoryScraperOptions = {}
): Promise<ScraperResult<RawSupplierRecord>> {
    const startTime = Date.now();
    const records: RawSupplierRecord[] = [];
    const errors: ScraperError[] = [];
    
    const sources = options.sources || [
        DataSource.THOMASNET,
        DataSource.KOMPASS,
        DataSource.ALIBABA,
    ];
    
    console.log(`[Directory Scraper] Starting scrape from sources:`, sources);
    
    for (const source of sources) {
        try {
            // In production, call real APIs/scrapers
            // For now, use simulated data
            const sourceRecords = await getSimulatedDirectoryData(source, options);
            records.push(...sourceRecords);
            console.log(`[Directory Scraper] Got ${sourceRecords.length} records from ${source}`);
        } catch (error) {
            errors.push({
                message: error instanceof Error ? error.message : 'Unknown error',
                code: 'SCRAPE_ERROR',
                details: { source },
            });
        }
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
 * Save supplier records to database with deduplication
 */
export async function saveSupplierRecords(
    records: RawSupplierRecord[]
): Promise<{ saved: number; updated: number; errors: number }> {
    let saved = 0;
    let updated = 0;
    let errorCount = 0;
    
    for (const record of records) {
        try {
            const normalizedCountry = normalizeCountryCode(record.countryCode);
            const slug = generateSlug(record.name, normalizedCountry);
            
            // Check if supplier exists by slug
            const existing = await prisma.supplier.findUnique({
                where: { slug },
            });
            
            if (existing) {
                // Update existing supplier with new data source info
                await prisma.supplier.update({
                    where: { slug },
                    data: {
                        dataSource: record.dataSource,
                        lastScrapedAt: new Date(),
                        // Only update if we have better data
                        description: record.description || existing.description,
                        website: record.website || existing.website,
                        email: record.email || existing.email,
                        phone: record.phone || existing.phone,
                    },
                });
                updated++;
            } else {
                // Create new supplier
                await prisma.supplier.create({
                    data: {
                        name: record.name,
                        slug,
                        description: record.description,
                        website: record.website,
                        email: record.email,
                        phone: record.phone,
                        countryCode: normalizedCountry,
                        countryName: record.countryName || getCountryName(normalizedCountry),
                        region: record.region,
                        city: record.city,
                        address: record.address,
                        productCategories: record.productCategories || [],
                        htsChapters: mapCategoriesToHtsChapters(record.productCategories || []),
                        materials: record.materials || [],
                        certifications: record.certifications || [],
                        yearEstablished: record.yearEstablished,
                        employeeCount: mapEmployeeCount(record.employeeCount),
                        dataSource: record.dataSource,
                        lastScrapedAt: new Date(),
                        tier: 'UNVERIFIED',
                    },
                });
                saved++;
            }
        } catch (error) {
            console.error(`[Directory Scraper] Error saving supplier:`, error);
            errorCount++;
        }
    }
    
    console.log(`[Directory Scraper] Saved ${saved}, updated ${updated}, errors ${errorCount}`);
    return { saved, updated, errors: errorCount };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATED DATA (For Development)
// ═══════════════════════════════════════════════════════════════════════════════

async function getSimulatedDirectoryData(
    source: DataSource,
    options: DirectoryScraperOptions
): Promise<RawSupplierRecord[]> {
    const maxRecords = options.maxRecordsPerSource || 50;
    const records: RawSupplierRecord[] = [];
    
    // Industry/category data
    const industries = [
        {
            category: 'Electronics',
            materials: ['PCB', 'Plastic', 'Aluminum', 'Copper'],
            certifications: ['ISO 9001', 'UL Listed', 'CE', 'FCC'],
        },
        {
            category: 'Textiles',
            materials: ['Cotton', 'Polyester', 'Nylon', 'Wool'],
            certifications: ['GOTS', 'Oeko-Tex', 'BSCI', 'WRAP'],
        },
        {
            category: 'Plastics',
            materials: ['ABS', 'PP', 'PE', 'PVC', 'Silicone'],
            certifications: ['ISO 9001', 'FDA Approved', 'BPA Free'],
        },
        {
            category: 'Metal Fabrication',
            materials: ['Steel', 'Aluminum', 'Brass', 'Copper'],
            certifications: ['ISO 9001', 'IATF 16949', 'AS9100'],
        },
        {
            category: 'Furniture',
            materials: ['Wood', 'Metal', 'Fabric', 'Leather'],
            certifications: ['FSC', 'ISO 9001', 'BIFMA'],
        },
        {
            category: 'Footwear',
            materials: ['Leather', 'Rubber', 'EVA', 'Synthetic'],
            certifications: ['LWG', 'ISO 9001', 'BSCI'],
        },
    ];
    
    // Country-specific data
    const countryData = [
        { code: 'CN', name: 'China', regions: ['Guangdong', 'Zhejiang', 'Jiangsu', 'Shandong'], weight: 40 },
        { code: 'VN', name: 'Vietnam', regions: ['Ho Chi Minh', 'Hanoi', 'Da Nang'], weight: 15 },
        { code: 'IN', name: 'India', regions: ['Maharashtra', 'Tamil Nadu', 'Gujarat'], weight: 12 },
        { code: 'MX', name: 'Mexico', regions: ['Nuevo León', 'Jalisco', 'Baja California'], weight: 10 },
        { code: 'TH', name: 'Thailand', regions: ['Bangkok', 'Chonburi', 'Samut Prakan'], weight: 8 },
        { code: 'TR', name: 'Turkey', regions: ['Istanbul', 'Izmir', 'Bursa'], weight: 5 },
        { code: 'ID', name: 'Indonesia', regions: ['Jakarta', 'Surabaya', 'Bandung'], weight: 5 },
        { code: 'BD', name: 'Bangladesh', regions: ['Dhaka', 'Chittagong', 'Gazipur'], weight: 5 },
    ];
    
    // Generate records
    for (let i = 0; i < maxRecords; i++) {
        const industry = industries[Math.floor(Math.random() * industries.length)];
        const country = weightedRandomSelect(countryData);
        
        const companyPrefixes = {
            'CN': ['Shenzhen', 'Dongguan', 'Guangzhou', 'Ningbo', 'Shanghai'],
            'VN': ['Viet', 'Hanoi', 'Saigon', 'Delta', 'Pacific'],
            'IN': ['Mumbai', 'Delhi', 'Chennai', 'Bangalore', 'Ahmedabad'],
            'MX': ['Monterrey', 'Guadalajara', 'Tijuana', 'Juarez', 'Mexico'],
            'TH': ['Bangkok', 'Thai', 'Siam', 'Eastern', 'Central'],
            'TR': ['Istanbul', 'Anatolian', 'Aegean', 'Turkish', 'Marmara'],
            'ID': ['Jakarta', 'Indo', 'Java', 'Pacific', 'Sumatra'],
            'BD': ['Dhaka', 'Bengal', 'Delta', 'Eastern', 'Bangladeshi'],
        };
        
        const suffixes = ['Manufacturing Co', 'Industries Ltd', 'Trading Corp', 'Export Co', 'Group', 'Enterprise'];
        
        const prefix = (companyPrefixes[country.code as keyof typeof companyPrefixes] || ['Global'])[
            Math.floor(Math.random() * 5)
        ];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        const industryWord = industry.category.split(' ')[0];
        
        const name = `${prefix} ${industryWord} ${suffix}`;
        const region = country.regions[Math.floor(Math.random() * country.regions.length)];
        
        // Random subset of certifications
        const numCerts = Math.floor(Math.random() * 4);
        const certifications = shuffleArray([...industry.certifications]).slice(0, numCerts);
        
        records.push({
            name,
            countryCode: country.code,
            countryName: country.name,
            region,
            city: region,
            address: `${Math.floor(Math.random() * 999) + 1} Industrial Park, ${region}`,
            website: `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`,
            email: `info@${name.toLowerCase().replace(/\s+/g, '')}.com`,
            phone: `+${getCountryPhoneCode(country.code)}${Math.floor(Math.random() * 900000000) + 100000000}`,
            description: `Leading ${industry.category.toLowerCase()} manufacturer specializing in high-quality products for export. ${Math.floor(Math.random() * 20) + 5}+ years of experience.`,
            productCategories: [industry.category],
            materials: shuffleArray([...industry.materials]).slice(0, 3),
            certifications,
            employeeCount: ['1-50', '51-200', '201-500', '501-1000', '1000+'][Math.floor(Math.random() * 5)],
            yearEstablished: 2024 - Math.floor(Math.random() * 30) - 5,
            dataSource: source,
            sourceRecordId: `${source}_${Date.now()}_${i}`,
        });
    }
    
    // Filter by options
    let filtered = records;
    
    if (options.productCategories?.length) {
        filtered = filtered.filter(r =>
            r.productCategories?.some(cat =>
                options.productCategories!.some(oc =>
                    cat.toLowerCase().includes(oc.toLowerCase())
                )
            )
        );
    }
    
    if (options.countries?.length) {
        filtered = filtered.filter(r =>
            options.countries!.includes(r.countryCode)
        );
    }
    
    return filtered;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function generateSlug(name: string, countryCode: string): string {
    const base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    return `${base}-${countryCode.toLowerCase()}`;
}

function getCountryName(code: string): string {
    const names: Record<string, string> = {
        'CN': 'China', 'VN': 'Vietnam', 'IN': 'India', 'MX': 'Mexico',
        'TH': 'Thailand', 'ID': 'Indonesia', 'BD': 'Bangladesh', 'TR': 'Turkey',
        'TW': 'Taiwan', 'KR': 'South Korea', 'JP': 'Japan', 'DE': 'Germany',
        'IT': 'Italy', 'PL': 'Poland', 'GB': 'United Kingdom',
    };
    return names[code] || code;
}

function getCountryPhoneCode(code: string): string {
    const codes: Record<string, string> = {
        'CN': '86', 'VN': '84', 'IN': '91', 'MX': '52',
        'TH': '66', 'ID': '62', 'BD': '880', 'TR': '90',
    };
    return codes[code] || '1';
}

function mapEmployeeCount(count?: string): 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE' | undefined {
    if (!count) return undefined;
    if (count.includes('1000+') || count.includes('1001')) return 'ENTERPRISE';
    if (count.includes('500') || count.includes('501')) return 'LARGE';
    if (count.includes('200') || count.includes('201') || count.includes('51')) return 'MEDIUM';
    return 'SMALL';
}

function mapCategoriesToHtsChapters(categories: string[]): string[] {
    const mapping: Record<string, string[]> = {
        'Electronics': ['84', '85', '90'],
        'Textiles': ['52', '54', '61', '62', '63'],
        'Plastics': ['39'],
        'Metal Fabrication': ['72', '73', '74', '76'],
        'Furniture': ['94'],
        'Footwear': ['64'],
        'Toys': ['95'],
        'Machinery': ['84'],
    };
    
    const chapters = new Set<string>();
    for (const cat of categories) {
        const mapped = mapping[cat];
        if (mapped) {
            mapped.forEach(ch => chapters.add(ch));
        }
    }
    return Array.from(chapters);
}

function weightedRandomSelect<T extends { weight: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    for (const item of items) {
        random -= item.weight;
        if (random <= 0) return item;
    }
    return items[items.length - 1];
}

function shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scrape directories and save to database in one step
 */
export async function scrapeAndSaveDirectories(
    options: DirectoryScraperOptions = {}
): Promise<{
    scraped: number;
    saved: number;
    updated: number;
    errors: number;
    durationMs: number;
}> {
    const startTime = Date.now();
    
    const result = await scrapeDirectories(options);
    
    if (result.data.length === 0) {
        return {
            scraped: 0,
            saved: 0,
            updated: 0,
            errors: result.errors.length,
            durationMs: Date.now() - startTime,
        };
    }
    
    const saveResult = await saveSupplierRecords(result.data);
    
    return {
        scraped: result.data.length,
        saved: saveResult.saved,
        updated: saveResult.updated,
        errors: saveResult.errors + result.errors.length,
        durationMs: Date.now() - startTime,
    };
}
