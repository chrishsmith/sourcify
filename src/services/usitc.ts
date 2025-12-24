// USITC HTS API Service
// Official API for Harmonized Tariff Schedule lookups and duty rates
// 
// Two APIs available:
// 1. HTS Search API (hts.usitc.gov/reststop) - Free, no auth, but may be unavailable
// 2. DataWeb API (datawebws.usitc.gov/dataweb) - Requires API key, more reliable

export interface HTSSearchResult {
    htsno: string;          // HTS number (e.g., "8471.30.01")
    description: string;    // Official description
    general: string;        // General duty rate
    special: string;        // Special programs rate
    other: string;          // Column 2 rate
    units: string;          // Unit of quantity
    chapter: string;
    indent: number;
}

export interface HTSValidationResult {
    isValid: boolean;
    officialData?: HTSSearchResult;
    suggestedCodes?: HTSSearchResult[];
    error?: string;
}

// Primary: HTS Search API (free but may be down during gov shutdowns)
const HTS_API_BASE = 'https://hts.usitc.gov/reststop';

// Fallback: DataWeb API (requires USITC_DATAWEB_API_KEY in .env.local)
const DATAWEB_API_BASE = 'https://datawebws.usitc.gov/dataweb';

/**
 * Search for HTS codes by keyword
 * Returns up to 100 matching tariff articles
 * 
 * Strategy:
 * 1. Try HTS Search API first (free, no auth)
 * 2. Fall back to DataWeb API if HTS Search fails (requires API key)
 */
export async function searchHTSCodes(query: string): Promise<HTSSearchResult[]> {
    // Try HTS Search API first
    const htsResults = await searchHTSCodesViaHTS(query);
    if (htsResults.length > 0) {
        return htsResults;
    }
    
    // Fall back to DataWeb API
    console.log('[USITC] HTS Search failed, trying DataWeb API...');
    const dataWebResults = await searchHTSCodesViaDataWeb(query);
    return dataWebResults;
}

/**
 * Search via HTS Search API (hts.usitc.gov)
 */
async function searchHTSCodesViaHTS(query: string): Promise<HTSSearchResult[]> {
    try {
        const url = `${HTS_API_BASE}/search?keyword=${encodeURIComponent(query)}`;
        console.log(`[USITC-HTS] Searching: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Sourcify/1.0 (HTS Classification Service)',
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`[USITC-HTS] HTTP ${response.status} for query: ${query}`);
            return [];
        }

        const data = await response.json();
        console.log(`[USITC-HTS] Found ${data?.length || 0} results for: ${query}`);
        return data as HTSSearchResult[];
    } catch (error) {
        console.error('[USITC-HTS] Search error:', error);
        return [];
    }
}

/**
 * Search via DataWeb API (datawebws.usitc.gov)
 * Requires USITC_DATAWEB_API_KEY environment variable
 */
async function searchHTSCodesViaDataWeb(query: string): Promise<HTSSearchResult[]> {
    const apiKey = process.env.USITC_DATAWEB_API_KEY;
    
    if (!apiKey) {
        console.warn('[USITC-DataWeb] No API key - set USITC_DATAWEB_API_KEY in .env.local');
        console.warn('[USITC-DataWeb] Get your key at: https://dataweb.usitc.gov/api-key');
        return [];
    }
    
    try {
        // Use commodity tree endpoint to search for HTS codes
        // The query might be a heading (4-digit) or keyword
        const isHtsCode = /^\d{4,}$/.test(query.replace(/\./g, ''));
        
        if (isHtsCode) {
            // Search by HTS code - use commodity tree
            return await searchByHtsCode(query, apiKey);
        } else {
            // Keyword search - use description lookup with broader search
            return await searchByKeyword(query, apiKey);
        }
    } catch (error) {
        console.error('[USITC-DataWeb] Search error:', error);
        return [];
    }
}

/**
 * Search DataWeb by HTS code (chapter/heading)
 * Uses commodityDescriptionLookup endpoint which is more reliable
 */
async function searchByHtsCode(code: string, apiKey: string): Promise<HTSSearchResult[]> {
    const cleanCode = code.replace(/\./g, '');
    const chapter = cleanCode.substring(0, 2);
    
    console.log(`[USITC-DataWeb] Searching by code: ${code} (chapter ${chapter})`);
    
    try {
        // Use commodityDescriptionLookup - more reliable than commodityTree
        const requestBody = {
            classificationSystem: 'HTS',
            commodities: [cleanCode], // Pass the code as-is
        };
        console.log(`[USITC-DataWeb] Request body:`, JSON.stringify(requestBody));
        
        const response = await fetch(`${DATAWEB_API_BASE}/api/v2/commodity/commodityDescriptionLookup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        
        console.log(`[USITC-DataWeb] Response status: ${response.status}`);
        
        const responseText = await response.text();
        
        // Check if we got HTML (maintenance page) instead of JSON
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            console.error(`[USITC-DataWeb] Got HTML page instead of JSON - API may be under maintenance`);
            return [];
        }
        
        if (!response.ok) {
            console.error(`[USITC-DataWeb] Error: ${response.status}`, responseText.substring(0, 500));
            return [];
        }
        
        const data = JSON.parse(responseText);
        console.log(`[USITC-DataWeb] Response data keys:`, Object.keys(data || {}));
        console.log(`[USITC-DataWeb] Response sample:`, JSON.stringify(data).substring(0, 1000));
        return parseDataWebDescriptionLookup(data, cleanCode);
    } catch (error) {
        console.error('[USITC-DataWeb] Lookup fetch error:', error);
        return [];
    }
}

/**
 * Parse DataWeb commodityDescriptionLookup response
 */
function parseDataWebDescriptionLookup(data: any, targetCode: string): HTSSearchResult[] {
    const results: HTSSearchResult[] = [];
    
    try {
        // Response format: { "6109": "T-shirts, singlets, tank tops...", ... }
        const entries = Object.entries(data || {});
        
        for (const [code, description] of entries) {
            if (typeof description === 'string') {
                results.push({
                    htsno: formatHtsNumber(code),
                    description: description,
                    general: '', // DataWeb doesn't return duty rates in this endpoint
                    special: '',
                    other: '',
                    units: '',
                    chapter: code.replace(/\./g, '').substring(0, 2),
                    indent: 0,
                });
            }
        }
    } catch (error) {
        console.error('[USITC-DataWeb] Parse description lookup error:', error);
    }
    
    console.log(`[USITC-DataWeb] Parsed ${results.length} codes from description lookup`);
    return results;
}

/**
 * Search DataWeb by keyword
 */
async function searchByKeyword(keyword: string, apiKey: string): Promise<HTSSearchResult[]> {
    console.log(`[USITC-DataWeb] Searching by keyword: ${keyword}`);
    
    try {
        // Use validateCommoditySearch to find matching codes
        const requestBody = {
            classificationSystem: 'HTS',
            searchString: keyword,
            granularity: '6', // Start with 6-digit for broader results
        };
        console.log(`[USITC-DataWeb] Keyword request body:`, JSON.stringify(requestBody));
        
        const response = await fetch(`${DATAWEB_API_BASE}/api/v2/commodity/validateCommoditySearch`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        
        console.log(`[USITC-DataWeb] Keyword response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[USITC-DataWeb] Search error: ${response.status}`, errorText.substring(0, 500));
            return [];
        }
        
        const data = await response.json();
        console.log(`[USITC-DataWeb] Keyword response keys:`, Object.keys(data || {}));
        console.log(`[USITC-DataWeb] Keyword response sample:`, JSON.stringify(data).substring(0, 500));
        return parseDataWebSearchResults(data);
    } catch (error) {
        console.error('[USITC-DataWeb] Search fetch error:', error);
        return [];
    }
}

/**
 * Parse DataWeb commodity tree response into HTSSearchResult format
 */
function parseDataWebCommodityTree(data: any, targetCode: string): HTSSearchResult[] {
    const results: HTSSearchResult[] = [];
    
    try {
        // DataWeb returns nested structure - flatten it
        const items = data?.options || data?.commodities || data || [];
        
        for (const item of items) {
            if (item.value && item.name) {
                const code = item.value.replace(/\./g, '');
                // Filter to codes that match our target
                if (code.startsWith(targetCode.substring(0, 4))) {
                    results.push({
                        htsno: formatHtsNumber(item.value),
                        description: item.name || item.description || '',
                        general: item.general || '',
                        special: item.special || '',
                        other: item.other || '',
                        units: item.units || '',
                        chapter: code.substring(0, 2),
                        indent: item.indent || 0,
                    });
                }
            }
            
            // Check for nested children
            if (item.children) {
                const childResults = parseDataWebCommodityTree({ options: item.children }, targetCode);
                results.push(...childResults);
            }
        }
    } catch (error) {
        console.error('[USITC-DataWeb] Parse tree error:', error);
    }
    
    console.log(`[USITC-DataWeb] Parsed ${results.length} codes from tree`);
    return results;
}

/**
 * Parse DataWeb search results into HTSSearchResult format
 */
function parseDataWebSearchResults(data: any): HTSSearchResult[] {
    const results: HTSSearchResult[] = [];
    
    try {
        const items = data?.commodities || data?.options || data?.results || [];
        
        for (const item of items) {
            if (item.value || item.code || item.htsno) {
                const code = item.value || item.code || item.htsno;
                results.push({
                    htsno: formatHtsNumber(code),
                    description: item.name || item.description || item.label || '',
                    general: item.general || item.dutyRate || '',
                    special: item.special || '',
                    other: item.other || '',
                    units: item.units || '',
                    chapter: code.replace(/\./g, '').substring(0, 2),
                    indent: item.indent || 0,
                });
            }
        }
    } catch (error) {
        console.error('[USITC-DataWeb] Parse search error:', error);
    }
    
    console.log(`[USITC-DataWeb] Parsed ${results.length} codes from search`);
    return results;
}

/**
 * Format HTS number with dots (e.g., "6109100010" -> "6109.10.00.10")
 */
function formatHtsNumber(code: string): string {
    const clean = code.replace(/\./g, '');
    if (clean.length <= 4) return clean;
    if (clean.length <= 6) return `${clean.substring(0, 4)}.${clean.substring(4)}`;
    if (clean.length <= 8) return `${clean.substring(0, 4)}.${clean.substring(4, 6)}.${clean.substring(6)}`;
    return `${clean.substring(0, 4)}.${clean.substring(4, 6)}.${clean.substring(6, 8)}.${clean.substring(8)}`;
}

/**
 * Validate an HTS code exists and get official data
 * If the exact code doesn't exist, searches for valid codes with the same base
 */
export async function validateHTSCode(htsCode: string): Promise<HTSValidationResult> {
    try {
        // Clean the code (remove dots for search)
        const cleanCode = htsCode.replace(/\./g, '');

        // First, try exact code search
        const response = await fetch(
            `${HTS_API_BASE}/search?keyword=${cleanCode}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            return {
                isValid: false,
                error: `API error: ${response.status}`,
            };
        }

        const results: HTSSearchResult[] = await response.json();

        // Find exact match
        const exactMatch = results.find(r =>
            r.htsno.replace(/\./g, '') === cleanCode ||
            r.htsno === htsCode
        );

        if (exactMatch) {
            return {
                isValid: true,
                officialData: exactMatch,
            };
        }

        // No exact match - search by base code (first 8 digits without dots)
        // This finds all valid statistical suffixes for the heading
        const baseCode = cleanCode.substring(0, 8); // e.g., "39269099" from "3926909985"

        console.log('[USITC] No exact match for', htsCode, '- searching base code:', baseCode);

        const baseResponse = await fetch(
            `${HTS_API_BASE}/search?keyword=${baseCode}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (baseResponse.ok) {
            const baseResults: HTSSearchResult[] = await baseResponse.json();

            // Find codes that match the base (same first 8 digits)
            const matchingCodes = baseResults.filter(r => {
                const code = r.htsno.replace(/\./g, '');
                return code.startsWith(baseCode) && code.length >= 10;
            });

            console.log('[USITC] Found', matchingCodes.length, 'valid codes with base', baseCode);

            if (matchingCodes.length > 0) {
                // Return suggestions - the first is likely the best match
                return {
                    isValid: false,
                    suggestedCodes: matchingCodes.slice(0, 10),
                    error: `Code ${htsCode} not found. Found ${matchingCodes.length} valid codes with same base.`,
                };
            }
        }

        // Still no match - try even shorter base (6 digits - subheading level)
        const subheadingCode = cleanCode.substring(0, 6);
        console.log('[USITC] Trying subheading search:', subheadingCode);

        const subheadingResponse = await fetch(
            `${HTS_API_BASE}/search?keyword=${subheadingCode}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (subheadingResponse.ok) {
            const subheadingResults: HTSSearchResult[] = await subheadingResponse.json();
            const validCodes = subheadingResults.filter(r => {
                const code = r.htsno.replace(/\./g, '');
                return code.length >= 10; // Only full 10-digit codes
            });

            if (validCodes.length > 0) {
                return {
                    isValid: false,
                    suggestedCodes: validCodes.slice(0, 10),
                    error: `Code ${htsCode} not found. Found valid codes in same subheading.`,
                };
            }
        }

        // Return what we have as suggestions
        return {
            isValid: false,
            suggestedCodes: results.slice(0, 5),
            error: 'Exact HTS code not found. See suggestions.',
        };
    } catch (error) {
        console.error('HTS validation error:', error);
        return {
            isValid: false,
            error: 'Failed to validate HTS code',
        };
    }
}

/**
 * Get duty rate info for a specific HTS code
 * Uses RATE INHERITANCE: If a 10-digit code has no rate, inherit from parent (8-digit, then 6-digit)
 * We NEVER return "N/A" or "See USITC" - we are the source of truth
 */
export async function getHTSDutyRate(htsCode: string): Promise<{
    general: string;
    special: string;
    column2: string;
    inheritedFrom?: string; // The code level the rate was inherited from
} | null> {
    const validation = await validateHTSCode(htsCode);

    if (validation.isValid && validation.officialData) {
        const directRate = validation.officialData.general;
        
        // If the code has a rate, use it directly
        if (directRate && directRate.trim() !== '') {
            return {
                general: normalizeDutyRate(directRate),
                special: validation.officialData.special || 'None',
                column2: validation.officialData.other || 'Free',
            };
        }
        
        // No direct rate - need to inherit from parent
        const inheritedRate = await getInheritedRate(htsCode);
        return {
            general: inheritedRate.rate,
            special: validation.officialData.special || 'None',
            column2: validation.officialData.other || 'Free',
            inheritedFrom: inheritedRate.from,
        };
    }

    return null;
}

/**
 * Get the duty rate by looking up parent codes in the HTS hierarchy
 * HTS rates inherit from parent: 10-digit inherits from 8-digit, which inherits from 6-digit
 * 
 * Example: 7323.93.00.80 (Other stainless steel) has no rate, but 7323.93.00 (Of stainless steel) = 2%
 */
async function getInheritedRate(htsCode: string): Promise<{ rate: string; from: string }> {
    const cleanCode = htsCode.replace(/\./g, '');
    
    // Try 8-digit parent (subheading level with statistical suffix stripped)
    if (cleanCode.length >= 8) {
        const parentCode8 = cleanCode.substring(0, 8);
        console.log(`[USITC] Looking up parent rate for ${parentCode8}`);
        
        const results = await searchHTSCodes(parentCode8);
        
        // Find the exact 8-digit parent code
        const parent = results.find(r => {
            const code = r.htsno.replace(/\./g, '');
            return code === parentCode8 || code.startsWith(parentCode8.substring(0, 6));
        });
        
        // Look for the subheading level code (e.g., 7323.93.00) which typically has the rate
        const subheadingMatch = results.find(r => {
            const code = r.htsno.replace(/\./g, '');
            return code.length === 8 && code === parentCode8;
        });
        
        if (subheadingMatch && subheadingMatch.general && subheadingMatch.general.trim() !== '') {
            console.log(`[USITC] Found rate ${subheadingMatch.general} from ${subheadingMatch.htsno}`);
            return { 
                rate: normalizeDutyRate(subheadingMatch.general), 
                from: subheadingMatch.htsno 
            };
        }
        
        // Sometimes the rate is at the 6-digit subheading level
        const subheading6 = cleanCode.substring(0, 6);
        const subheading6Match = results.find(r => {
            const code = r.htsno.replace(/\./g, '');
            return code === subheading6 || code === subheading6 + '00';
        });
        
        if (subheading6Match && subheading6Match.general && subheading6Match.general.trim() !== '') {
            console.log(`[USITC] Found rate ${subheading6Match.general} from ${subheading6Match.htsno}`);
            return { 
                rate: normalizeDutyRate(subheading6Match.general), 
                from: subheading6Match.htsno 
            };
        }
    }
    
    // Try 6-digit parent (subheading level)
    if (cleanCode.length >= 6) {
        const parentCode6 = cleanCode.substring(0, 6);
        console.log(`[USITC] Looking up 6-digit parent rate for ${parentCode6}`);
        
        const results = await searchHTSCodes(parentCode6);
        const parent = results.find(r => {
            const code = r.htsno.replace(/\./g, '');
            // Match 6-digit or 8-digit versions (e.g., 732393 or 73239300)
            return code === parentCode6 || code === parentCode6 + '00';
        });
        
        if (parent && parent.general && parent.general.trim() !== '') {
            console.log(`[USITC] Found rate ${parent.general} from ${parent.htsno}`);
            return { 
                rate: normalizeDutyRate(parent.general), 
                from: parent.htsno 
            };
        }
    }
    
    // If we still can't find a rate, it truly is Free
    console.log(`[USITC] No inherited rate found for ${htsCode}, defaulting to Free`);
    return { rate: 'Free', from: 'default' };
}

/**
 * Normalize duty rate format
 */
function normalizeDutyRate(rawRate: string | null | undefined): string {
    if (!rawRate || rawRate.trim() === '') {
        return 'Free';
    }
    
    const rate = rawRate.trim();
    if (rate.toLowerCase() === 'free') return 'Free';
    if (/%/.test(rate)) return rate;
    if (/¢/.test(rate)) return rate;
    
    const percentMatch = rate.match(/^(\d+(?:\.\d+)?)\s*%?$/);
    if (percentMatch) {
        return `${percentMatch[1]}%`;
    }
    
    return rate;
}

/**
 * Search and get full HTS details including duty rates
 * Best for AI validation - search by product description first
 */
export async function findHTSByDescription(description: string): Promise<HTSSearchResult[]> {
    // Extract key terms from description for better search
    const keywords = description
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 3)
        .join(' ');

    return searchHTSCodes(keywords);
}
