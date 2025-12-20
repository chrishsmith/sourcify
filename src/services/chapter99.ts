/**
 * Chapter 99 Live Tariff Service
 * 
 * Chapter 99 of the HTS contains all "temporary modifications" including:
 * - Section 301 tariffs (9903.88.xx)
 * - IEEPA tariffs (9903.01.xx)
 * - Section 232 tariffs (9903.80.xx, 9903.85.xx)
 * 
 * This service fetches LIVE rates from the USITC API to ensure accuracy.
 */

import { searchHTSCodes, type HTSSearchResult } from './usitc';

// ═══════════════════════════════════════════════════════════════════════════
// CHAPTER 99 CODE PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

export interface Chapter99Program {
    prefix: string;           // HTS prefix (e.g., "9903.88")
    name: string;             // Human-readable name
    type: 'section_301' | 'ieepa' | 'section_232' | 'other';
    affectedCountries: string[];
    notes: string[];
}

// Known Chapter 99 program prefixes
export const CHAPTER_99_PROGRAMS: Chapter99Program[] = [
    // Section 301 - China tariffs
    { prefix: '9903.88.01', name: 'Section 301 List 1', type: 'section_301', affectedCountries: ['CN'], notes: ['25% on $34B of Chinese goods'] },
    { prefix: '9903.88.02', name: 'Section 301 List 2', type: 'section_301', affectedCountries: ['CN'], notes: ['25% on $16B of Chinese goods'] },
    { prefix: '9903.88.03', name: 'Section 301 List 3', type: 'section_301', affectedCountries: ['CN'], notes: ['25% on $200B of Chinese goods'] },
    { prefix: '9903.88.15', name: 'Section 301 List 4A', type: 'section_301', affectedCountries: ['CN'], notes: ['7.5% on consumer goods'] },
    { prefix: '9903.88.16', name: 'Section 301 List 4B/2024', type: 'section_301', affectedCountries: ['CN'], notes: ['Strategic products (EVs, Solar, etc.)'] },
    
    // IEEPA - Emergency tariffs
    { prefix: '9903.01.24', name: 'IEEPA Fentanyl (China)', type: 'ieepa', affectedCountries: ['CN', 'HK'], notes: ['Emergency tariff on China'] },
    { prefix: '9903.01.25', name: 'IEEPA Reciprocal (China)', type: 'ieepa', affectedCountries: ['CN', 'HK'], notes: ['Reciprocal tariff on China'] },
    { prefix: '9903.01.26', name: 'IEEPA Fentanyl (Mexico)', type: 'ieepa', affectedCountries: ['MX'], notes: ['Emergency tariff on Mexico'] },
    { prefix: '9903.01.27', name: 'IEEPA Fentanyl (Canada)', type: 'ieepa', affectedCountries: ['CA'], notes: ['Emergency tariff on Canada'] },
    
    // Section 232 - National security
    { prefix: '9903.80', name: 'Section 232 Steel', type: 'section_232', affectedCountries: ['ALL'], notes: ['Steel products'] },
    { prefix: '9903.85', name: 'Section 232 Aluminum', type: 'section_232', affectedCountries: ['ALL'], notes: ['Aluminum products'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// LIVE RATE FETCHING
// ═══════════════════════════════════════════════════════════════════════════

export interface LiveTariffRate {
    htsCode: string;
    description: string;
    rate: string;
    numericRate: number | null;
    effectiveDate?: string;
    source: 'usitc_api' | 'cached';
    fetchedAt: Date;
}

// Cache for API results (refresh every hour)
const rateCache = new Map<string, { data: LiveTariffRate; expires: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch live rate for a specific Chapter 99 code from USITC API
 */
export async function fetchLiveChapter99Rate(htsCode: string): Promise<LiveTariffRate | null> {
    const cleanCode = htsCode.replace(/\./g, '');
    
    // Check cache first
    const cached = rateCache.get(cleanCode);
    if (cached && cached.expires > Date.now()) {
        console.log(`[Chapter99] Cache hit for ${htsCode}`);
        return { ...cached.data, source: 'cached' };
    }
    
    console.log(`[Chapter99] Fetching live rate for ${htsCode}...`);
    
    try {
        // Search USITC API for the Chapter 99 code
        const results = await searchHTSCodes(cleanCode);
        
        // Find exact match
        const match = results.find(r => 
            r.htsno.replace(/\./g, '') === cleanCode ||
            r.htsno === htsCode
        );
        
        if (match) {
            const rate = parseRateFromUSITC(match.general);
            const liveRate: LiveTariffRate = {
                htsCode: match.htsno,
                description: match.description,
                rate: match.general || 'N/A',
                numericRate: rate,
                source: 'usitc_api',
                fetchedAt: new Date(),
            };
            
            // Cache the result
            rateCache.set(cleanCode, {
                data: liveRate,
                expires: Date.now() + CACHE_TTL,
            });
            
            console.log(`[Chapter99] Found: ${match.htsno} = ${match.general}`);
            return liveRate;
        }
        
        console.log(`[Chapter99] No match found for ${htsCode}`);
        return null;
    } catch (error) {
        console.error(`[Chapter99] API error for ${htsCode}:`, error);
        return null;
    }
}

/**
 * Fetch all rates for a Chapter 99 program (e.g., all Section 301 codes)
 */
export async function fetchProgramRates(programPrefix: string): Promise<LiveTariffRate[]> {
    console.log(`[Chapter99] Fetching rates for program: ${programPrefix}`);
    
    try {
        const results = await searchHTSCodes(programPrefix.replace(/\./g, ''));
        
        const rates: LiveTariffRate[] = results
            .filter(r => r.htsno.startsWith(programPrefix.substring(0, 4))) // Same heading
            .map(r => ({
                htsCode: r.htsno,
                description: r.description,
                rate: r.general || 'N/A',
                numericRate: parseRateFromUSITC(r.general),
                source: 'usitc_api' as const,
                fetchedAt: new Date(),
            }));
        
        console.log(`[Chapter99] Found ${rates.length} codes for ${programPrefix}`);
        return rates;
    } catch (error) {
        console.error(`[Chapter99] Error fetching program rates:`, error);
        return [];
    }
}

/**
 * Fetch current IEEPA rates for a country
 */
export async function fetchIEEPARatesForCountry(countryCode: string): Promise<{
    fentanyl: LiveTariffRate | null;
    reciprocal: LiveTariffRate | null;
}> {
    // Map countries to their IEEPA codes
    const ieepaCodes: Record<string, { fentanyl?: string; reciprocal?: string }> = {
        'CN': { fentanyl: '9903.01.24', reciprocal: '9903.01.25' },
        'HK': { fentanyl: '9903.01.24', reciprocal: '9903.01.25' },
        'MX': { fentanyl: '9903.01.26' },
        'CA': { fentanyl: '9903.01.27' },
    };
    
    const codes = ieepaCodes[countryCode];
    if (!codes) {
        return { fentanyl: null, reciprocal: null };
    }
    
    const [fentanyl, reciprocal] = await Promise.all([
        codes.fentanyl ? fetchLiveChapter99Rate(codes.fentanyl) : Promise.resolve(null),
        codes.reciprocal ? fetchLiveChapter99Rate(codes.reciprocal) : Promise.resolve(null),
    ]);
    
    return { fentanyl, reciprocal };
}

/**
 * Get all applicable Chapter 99 additional duties for an HTS code and country
 * Returns LIVE rates from USITC API
 */
export async function getLiveAdditionalDuties(
    htsCode: string,
    countryOfOrigin: string
): Promise<{
    section301: LiveTariffRate | null;
    ieepaFentanyl: LiveTariffRate | null;
    ieepaReciprocal: LiveTariffRate | null;
    section232Steel: LiveTariffRate | null;
    section232Aluminum: LiveTariffRate | null;
    totalAdditional: number;
    dataFreshness: string;
}> {
    console.log(`[Chapter99] Getting live duties for ${htsCode} from ${countryOfOrigin}`);
    
    let section301: LiveTariffRate | null = null;
    let ieepaFentanyl: LiveTariffRate | null = null;
    let ieepaReciprocal: LiveTariffRate | null = null;
    let section232Steel: LiveTariffRate | null = null;
    let section232Aluminum: LiveTariffRate | null = null;
    
    // China/HK - Check all programs
    if (countryOfOrigin === 'CN' || countryOfOrigin === 'HK') {
        // Check Section 301 (need to determine which list applies)
        // For now, we'll check List 3 as it covers most products
        const [s301, ieepa] = await Promise.all([
            fetchLiveChapter99Rate('9903.88.03'), // List 3 (most common)
            fetchIEEPARatesForCountry(countryOfOrigin),
        ]);
        
        section301 = s301;
        ieepaFentanyl = ieepa.fentanyl;
        ieepaReciprocal = ieepa.reciprocal;
    }
    
    // Mexico/Canada - IEEPA only (if active)
    if (countryOfOrigin === 'MX' || countryOfOrigin === 'CA') {
        const ieepa = await fetchIEEPARatesForCountry(countryOfOrigin);
        ieepaFentanyl = ieepa.fentanyl;
    }
    
    // Check Section 232 for steel/aluminum products
    const cleanCode = htsCode.replace(/\./g, '');
    const chapter = cleanCode.substring(0, 2);
    
    if (chapter === '72' || cleanCode.startsWith('73')) {
        // Steel product
        section232Steel = await fetchLiveChapter99Rate('9903.80.01');
    }
    
    if (chapter === '76') {
        // Aluminum product
        section232Aluminum = await fetchLiveChapter99Rate('9903.85.01');
    }
    
    // Calculate total
    const totalAdditional = [
        section301?.numericRate,
        ieepaFentanyl?.numericRate,
        ieepaReciprocal?.numericRate,
        section232Steel?.numericRate,
        section232Aluminum?.numericRate,
    ].reduce((sum, rate) => sum + (rate || 0), 0);
    
    const newestFetch = [section301, ieepaFentanyl, ieepaReciprocal, section232Steel, section232Aluminum]
        .filter(Boolean)
        .map(r => r!.fetchedAt)
        .sort((a, b) => b.getTime() - a.getTime())[0];
    
    return {
        section301,
        ieepaFentanyl,
        ieepaReciprocal,
        section232Steel,
        section232Aluminum,
        totalAdditional,
        dataFreshness: newestFetch 
            ? `Live data as of ${newestFetch.toLocaleString()}`
            : 'Using cached/default rates',
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parse numeric rate from USITC rate string
 */
function parseRateFromUSITC(rateStr: string | undefined): number | null {
    if (!rateStr) return null;
    
    // Handle "Free"
    if (rateStr.toLowerCase() === 'free') return 0;
    
    // Handle percentage (e.g., "25%", "7.5%")
    const pctMatch = rateStr.match(/(\d+(?:\.\d+)?)\s*%/);
    if (pctMatch) {
        return parseFloat(pctMatch[1]);
    }
    
    // Handle dollar amounts (e.g., "$0.50/kg")
    // These are specific rates, return null for ad valorem calculation
    if (rateStr.includes('$')) {
        return null;
    }
    
    return null;
}

/**
 * Clear the rate cache (for testing/refresh)
 */
export function clearRateCache(): void {
    rateCache.clear();
    console.log('[Chapter99] Cache cleared');
}

/**
 * Get cache status
 */
export function getCacheStatus(): { entries: number; oldestEntry: Date | null } {
    let oldest: Date | null = null;
    
    for (const [, value] of rateCache) {
        const fetchedAt = value.data.fetchedAt;
        if (!oldest || fetchedAt < oldest) {
            oldest = fetchedAt;
        }
    }
    
    return {
        entries: rateCache.size,
        oldestEntry: oldest,
    };
}


