// USITC HTS API Service
// Official API for Harmonized Tariff Schedule lookups and duty rates
// Base URL: https://hts.usitc.gov/reststop

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

const HTS_API_BASE = 'https://hts.usitc.gov/reststop';

/**
 * Search for HTS codes by keyword
 * Returns up to 100 matching tariff articles
 */
export async function searchHTSCodes(query: string): Promise<HTSSearchResult[]> {
    try {
        const response = await fetch(
            `${HTS_API_BASE}/search?keyword=${encodeURIComponent(query)}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`HTS API error: ${response.status}`);
        }

        const data = await response.json();
        return data as HTSSearchResult[];
    } catch (error) {
        console.error('HTS search error:', error);
        return [];
    }
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
 */
export async function getHTSDutyRate(htsCode: string): Promise<{
    general: string;
    special: string;
    column2: string;
} | null> {
    const validation = await validateHTSCode(htsCode);

    if (validation.isValid && validation.officialData) {
        return {
            general: validation.officialData.general || 'N/A',
            special: validation.officialData.special || 'N/A',
            column2: validation.officialData.other || 'N/A',
        };
    }

    return null;
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
