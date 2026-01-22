/**
 * HTS Hierarchy Service
 * 
 * Fetches the FULL hierarchical path for an HTS code from USITC
 * Returns all parent descriptions from Chapter → Heading → Subheading → Code
 * Now includes sibling codes at each level for optional exploration
 */

import { searchHTSCodes, type HTSSearchResult } from '@/services/usitc';

export interface HTSSibling {
    code: string;
    description: string;
    dutyRate?: string;
}

export interface HTSHierarchyLevel {
    level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
    code: string;
    description: string;
    indent: number;
    dutyRate?: string;
    /** Sibling codes at this level (alternative classifications) */
    siblings?: HTSSibling[];
    /** Quick count for UI indicator */
    siblingCount?: number;
}

export interface HTSHierarchy {
    fullCode: string;
    levels: HTSHierarchyLevel[];
    humanReadablePath: string;
    shortPath: string;
}

/**
 * Chapter descriptions (hardcoded for speed - these rarely change)
 */
export const CHAPTER_DESCRIPTIONS: Record<string, string> = {
    '01': 'Live Animals',
    '02': 'Meat and Edible Meat Offal',
    '03': 'Fish and Crustaceans',
    '04': 'Dairy Produce; Eggs; Honey',
    '05': 'Products of Animal Origin',
    '06': 'Live Trees and Plants',
    '07': 'Edible Vegetables',
    '08': 'Edible Fruit and Nuts',
    '09': 'Coffee, Tea, Spices',
    '10': 'Cereals',
    '11': 'Milling Industry Products',
    '12': 'Oil Seeds and Oleaginous Fruits',
    '13': 'Lac; Gums; Resins',
    '14': 'Vegetable Plaiting Materials',
    '15': 'Animal or Vegetable Fats and Oils',
    '16': 'Preparations of Meat or Fish',
    '17': 'Sugars and Sugar Confectionery',
    '18': 'Cocoa and Cocoa Preparations',
    '19': 'Preparations of Cereals',
    '20': 'Preparations of Vegetables',
    '21': 'Miscellaneous Edible Preparations',
    '22': 'Beverages, Spirits, Vinegar',
    '23': 'Food Industry Residues',
    '24': 'Tobacco and Tobacco Products',
    '25': 'Salt; Sulfur; Earths; Stone',
    '26': 'Ores, Slag, and Ash',
    '27': 'Mineral Fuels, Oils',
    '28': 'Inorganic Chemicals',
    '29': 'Organic Chemicals',
    '30': 'Pharmaceutical Products',
    '31': 'Fertilizers',
    '32': 'Tanning or Dyeing Extracts',
    '33': 'Essential Oils; Perfumery',
    '34': 'Soap; Waxes; Polishes',
    '35': 'Albuminoidal Substances; Glues',
    '36': 'Explosives; Matches',
    '37': 'Photographic or Cinematographic',
    '38': 'Miscellaneous Chemical Products',
    '39': 'Plastics and Articles Thereof',
    '40': 'Rubber and Articles Thereof',
    '41': 'Raw Hides and Skins; Leather',
    '42': 'Leather Articles; Travel Goods',
    '43': 'Furskins and Artificial Fur',
    '44': 'Wood and Articles of Wood',
    '45': 'Cork and Articles of Cork',
    '46': 'Manufactures of Straw',
    '47': 'Pulp of Wood',
    '48': 'Paper and Paperboard',
    '49': 'Printed Books, Newspapers',
    '50': 'Silk',
    '51': 'Wool, Fine Animal Hair',
    '52': 'Cotton',
    '53': 'Other Vegetable Textile Fibers',
    '54': 'Man-Made Filaments',
    '55': 'Man-Made Staple Fibers',
    '56': 'Wadding, Felt, Nonwovens',
    '57': 'Carpets and Textile Floor Coverings',
    '58': 'Special Woven Fabrics',
    '59': 'Impregnated Textile Fabrics',
    '60': 'Knitted or Crocheted Fabrics',
    '61': 'Apparel, Knitted or Crocheted',
    '62': 'Apparel, Not Knitted',
    '63': 'Other Made Up Textile Articles',
    '64': 'Footwear, Gaiters',
    '65': 'Headgear and Parts Thereof',
    '66': 'Umbrellas, Walking Sticks',
    '67': 'Prepared Feathers; Artificial Flowers',
    '68': 'Articles of Stone, Plaster, Cement',
    '69': 'Ceramic Products',
    '70': 'Glass and Glassware',
    '71': 'Precious Metals, Jewelry',
    '72': 'Iron and Steel',
    '73': 'Articles of Iron or Steel',
    '74': 'Copper and Articles Thereof',
    '75': 'Nickel and Articles Thereof',
    '76': 'Aluminum and Articles Thereof',
    '78': 'Lead and Articles Thereof',
    '79': 'Zinc and Articles Thereof',
    '80': 'Tin and Articles Thereof',
    '81': 'Other Base Metals; Cermets',
    '82': 'Tools, Cutlery',
    '83': 'Miscellaneous Articles of Base Metal',
    '84': 'Nuclear Reactors, Boilers, Machinery',
    '85': 'Electrical Machinery and Equipment',
    '86': 'Railway Locomotives',
    '87': 'Vehicles Other Than Railway',
    '88': 'Aircraft, Spacecraft',
    '89': 'Ships, Boats',
    '90': 'Optical, Medical, Measuring Instruments',
    '91': 'Clocks and Watches',
    '92': 'Musical Instruments',
    '93': 'Arms and Ammunition',
    '94': 'Furniture; Bedding; Lamps',
    '95': 'Toys, Games, Sports Equipment',
    '96': 'Miscellaneous Manufactured Articles',
    '97': 'Works of Art, Antiques',
    '98': 'Special Classification Provisions',
    '99': 'Special Import Provisions',
};

/**
 * Check if a code is a direct ancestor of the target code
 * e.g., "7323" is an ancestor of "73239300", but "7324" is not
 */
function isDirectAncestor(ancestorCode: string, targetCode: string): boolean {
    const cleanAncestor = ancestorCode.replace(/\./g, '');
    const cleanTarget = targetCode.replace(/\./g, '');
    return cleanTarget.startsWith(cleanAncestor) && cleanAncestor.length < cleanTarget.length;
}

/**
 * Group codes by their parent prefix to find siblings
 */
function groupCodesByParent(codes: HTSSearchResult[], parentLength: number): Map<string, HTSSearchResult[]> {
    const groups = new Map<string, HTSSearchResult[]>();
    for (const code of codes) {
        const cleanCode = code.htsno.replace(/\./g, '');
        if (cleanCode.length <= parentLength) continue;
        const parent = cleanCode.substring(0, parentLength);
        if (!groups.has(parent)) {
            groups.set(parent, []);
        }
        groups.get(parent)!.push(code);
    }
    return groups;
}

/**
 * Fetch the full HTS hierarchy for a given code
 * Returns direct lineage path with optional siblings at each level
 */
export async function getHTSHierarchy(htsCode: string): Promise<HTSHierarchy> {
    const cleanCode = htsCode.replace(/\./g, '');
    const chapter = cleanCode.substring(0, 2);
    const heading = cleanCode.substring(0, 4);
    const subheading6 = cleanCode.substring(0, 6);
    
    const levels: HTSHierarchyLevel[] = [];
    
    // Level 1: Chapter (always available from our hardcoded list)
    levels.push({
        level: 'chapter',
        code: chapter,
        description: CHAPTER_DESCRIPTIONS[chapter] || `Chapter ${chapter}`,
        indent: 0,
    });
    
    // Fetch hierarchy from USITC
    try {
        const headingResults = await searchHTSCodes(heading);
        const subheadingResults = await searchHTSCodes(subheading6);
        const fullResults = await searchHTSCodes(htsCode);
        
        // Combine all results and dedupe
        const allCodes = [...headingResults, ...subheadingResults, ...fullResults];
        const uniqueCodes = allCodes.filter((c, i, arr) => 
            arr.findIndex(x => x.htsno === c.htsno) === i
        );
        
        // Find the heading (4-digit) - this is the direct ancestor
        const headingMatch = uniqueCodes.find(r => {
            const code = r.htsno.replace(/\./g, '');
            return code === heading;
        });
        
        // Find heading-level siblings (other 4-digit codes in same chapter)
        const headingSiblings = uniqueCodes
            .filter(r => {
                const code = r.htsno.replace(/\./g, '');
                return code.length === 4 && 
                       code.startsWith(chapter) && 
                       code !== heading;
            })
            .map(r => ({
                code: r.htsno,
                description: cleanDescription(r.description),
                dutyRate: r.general,
            }));
        
        if (headingMatch) {
            levels.push({
                level: 'heading',
                code: formatHTSCode(heading),
                description: cleanDescription(headingMatch.description),
                indent: 1,
                siblings: headingSiblings.length > 0 ? headingSiblings : undefined,
                siblingCount: headingSiblings.length || undefined,
            });
        }
        
        // Find subheading (6-digit) that's a direct ancestor
        const subheadingMatch = uniqueCodes.find(r => {
            const code = r.htsno.replace(/\./g, '');
            return code === subheading6 || 
                   (code.length === 6 && isDirectAncestor(code, cleanCode));
        });
        
        // Find 6-digit siblings (same heading parent)
        const subheadingSiblings = uniqueCodes
            .filter(r => {
                const code = r.htsno.replace(/\./g, '');
                return code.length === 6 && 
                       code.startsWith(heading) && 
                       code !== subheading6 &&
                       !isDirectAncestor(code, cleanCode);
            })
            .map(r => ({
                code: r.htsno,
                description: cleanDescription(r.description),
                dutyRate: r.general,
            }));
        
        if (subheadingMatch) {
            levels.push({
                level: 'subheading',
                code: subheadingMatch.htsno,
                description: cleanDescription(subheadingMatch.description),
                indent: 2,
                siblings: subheadingSiblings.length > 0 ? subheadingSiblings : undefined,
                siblingCount: subheadingSiblings.length || undefined,
            });
        }
        
        // Find 8-digit tariff line that's a direct ancestor
        const tariffLine8 = cleanCode.substring(0, 8);
        const tariffLineMatch = uniqueCodes.find(r => {
            const code = r.htsno.replace(/\./g, '');
            return code.length === 8 && isDirectAncestor(code, cleanCode);
        });
        
        // Find 8-digit siblings (same 6-digit parent)
        const tariffLineSiblings = uniqueCodes
            .filter(r => {
                const code = r.htsno.replace(/\./g, '');
                return code.length === 8 && 
                       code.startsWith(subheading6) && 
                       code !== tariffLine8 &&
                       !isDirectAncestor(code, cleanCode);
            })
            .map(r => ({
                code: r.htsno,
                description: cleanDescription(r.description),
                dutyRate: r.general,
            }));
        
        if (tariffLineMatch && tariffLineMatch.htsno.replace(/\./g, '') !== cleanCode) {
            levels.push({
                level: 'tariff_line',
                code: tariffLineMatch.htsno,
                description: cleanDescription(tariffLineMatch.description),
                indent: 3,
                dutyRate: tariffLineMatch.general,
                siblings: tariffLineSiblings.length > 0 ? tariffLineSiblings : undefined,
                siblingCount: tariffLineSiblings.length || undefined,
            });
        }
        
        // Add the final code (10-digit statistical suffix)
        const finalMatch = uniqueCodes.find(r => 
            r.htsno.replace(/\./g, '') === cleanCode
        );
        
        // Find 10-digit siblings (same 8-digit parent)
        const statisticalSiblings = uniqueCodes
            .filter(r => {
                const code = r.htsno.replace(/\./g, '');
                return code.length === 10 && 
                       code.startsWith(tariffLine8) && 
                       code !== cleanCode;
            })
            .map(r => ({
                code: r.htsno,
                description: cleanDescription(r.description),
                dutyRate: r.general,
            }));
        
        if (finalMatch) {
            levels.push({
                level: 'statistical',
                code: finalMatch.htsno,
                description: cleanDescription(finalMatch.description),
                indent: 4,
                dutyRate: finalMatch.general,
                siblings: statisticalSiblings.length > 0 ? statisticalSiblings : undefined,
                siblingCount: statisticalSiblings.length || undefined,
            });
        }
        
    } catch (error) {
        console.error('[Hierarchy] Failed to fetch hierarchy:', error);
    }
    
    // Sort levels by code length (hierarchy order)
    levels.sort((a, b) => a.code.replace(/\./g, '').length - b.code.replace(/\./g, '').length);
    
    // Build human-readable path
    const humanReadablePath = levels.map(l => l.description).join(' → ');
    const shortPath = levels.slice(0, 3).map(l => l.description).join(' → ');
    
    return {
        fullCode: htsCode,
        levels,
        humanReadablePath,
        shortPath,
    };
}

/**
 * Format an HTS code with dots
 */
function formatHTSCode(code: string): string {
    const clean = code.replace(/\./g, '');
    if (clean.length <= 4) return clean;
    if (clean.length <= 6) return `${clean.substring(0, 4)}.${clean.substring(4)}`;
    if (clean.length <= 8) return `${clean.substring(0, 4)}.${clean.substring(4, 6)}.${clean.substring(6)}`;
    return `${clean.substring(0, 4)}.${clean.substring(4, 6)}.${clean.substring(6, 8)}.${clean.substring(8)}`;
}

/**
 * Clean up description text
 */
function cleanDescription(desc: string): string {
    // Remove trailing colons and clean up
    let clean = desc.trim();
    if (clean.endsWith(':')) clean = clean.slice(0, -1);
    
    // Capitalize first letter
    if (clean.length > 0) {
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);
    }
    
    return clean;
}

/**
 * Build a full breadcrumb string for display
 */
export function buildBreadcrumb(hierarchy: HTSHierarchy): string {
    return hierarchy.levels.map((level, index) => {
        const prefix = index === 0 ? '' : ' › ';
        const codeDisplay = level.level === 'chapter' 
            ? `Ch. ${level.code}` 
            : level.code;
        return `${prefix}${codeDisplay}: ${level.description}`;
    }).join('');
}

/**
 * Format hierarchy for UI display with proper indentation
 */
export function formatHierarchyForUI(hierarchy: HTSHierarchy): {
    breadcrumb: string;
    levels: { code: string; description: string; isLeaf: boolean; dutyRate?: string }[];
} {
    return {
        breadcrumb: hierarchy.humanReadablePath,
        levels: hierarchy.levels.map((level, index) => ({
            code: level.level === 'chapter' ? `Chapter ${level.code}` : level.code,
            description: level.description,
            isLeaf: index === hierarchy.levels.length - 1,
            dutyRate: level.dutyRate,
        })),
    };
}


