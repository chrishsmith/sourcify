/**
 * HTS Hierarchy Service
 * 
 * Fetches the FULL hierarchical path for an HTS code from USITC
 * Returns all parent descriptions from Chapter → Heading → Subheading → Code
 */

import { searchHTSCodes, type HTSSearchResult } from './usitc';

export interface HTSHierarchyLevel {
    level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
    code: string;
    description: string;
    indent: number;
    dutyRate?: string;
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
 * Fetch the full HTS hierarchy for a given code
 */
export async function getHTSHierarchy(htsCode: string): Promise<HTSHierarchy> {
    const cleanCode = htsCode.replace(/\./g, '');
    const chapter = cleanCode.substring(0, 2);
    const heading = cleanCode.substring(0, 4);
    const subheading6 = cleanCode.substring(0, 6);
    const tariffLine = cleanCode.substring(0, 8);
    
    const levels: HTSHierarchyLevel[] = [];
    
    // Level 1: Chapter (always available from our hardcoded list)
    levels.push({
        level: 'chapter',
        code: chapter,
        description: CHAPTER_DESCRIPTIONS[chapter] || `Chapter ${chapter}`,
        indent: 0,
    });
    
    // Fetch hierarchy from USITC
    // Search for the heading to get parent descriptions
    try {
        const headingResults = await searchHTSCodes(heading);
        const subheadingResults = await searchHTSCodes(subheading6);
        const fullResults = await searchHTSCodes(htsCode);
        
        // Find heading description (4-digit)
        const headingMatch = headingResults.find(r => {
            const code = r.htsno.replace(/\./g, '');
            return code === heading || code.startsWith(heading) && code.length === 4;
        });
        
        if (headingMatch) {
            levels.push({
                level: 'heading',
                code: formatHTSCode(heading),
                description: cleanDescription(headingMatch.description),
                indent: headingMatch.indent || 1,
            });
        } else {
            // Fallback: use first result that matches the heading
            const fallbackHeading = headingResults.find(r => r.htsno.startsWith(heading.substring(0, 2)));
            if (fallbackHeading && fallbackHeading.indent === 0) {
                levels.push({
                    level: 'heading',
                    code: formatHTSCode(heading),
                    description: cleanDescription(fallbackHeading.description),
                    indent: 1,
                });
            }
        }
        
        // Find intermediate subheadings (indented items between heading and our code)
        const allCodes = [...headingResults, ...subheadingResults, ...fullResults];
        const uniqueCodes = allCodes.filter((c, i, arr) => 
            arr.findIndex(x => x.htsno === c.htsno) === i
        );
        
        // Sort by code length (shorter = more general)
        const sortedCodes = uniqueCodes
            .filter(c => {
                const code = c.htsno.replace(/\./g, '');
                return code.startsWith(heading) && code.length < cleanCode.length;
            })
            .sort((a, b) => a.htsno.length - b.htsno.length);
        
        // Add intermediate levels (subheadings)
        for (const code of sortedCodes) {
            const codeClean = code.htsno.replace(/\./g, '');
            // Skip if we already have this level
            if (levels.find(l => l.code.replace(/\./g, '') === codeClean)) continue;
            // Skip if too short (heading level)
            if (codeClean.length <= 4) continue;
            
            levels.push({
                level: codeClean.length <= 6 ? 'subheading' : 'tariff_line',
                code: code.htsno,
                description: cleanDescription(code.description),
                indent: code.indent || (codeClean.length - 4) / 2 + 1,
            });
        }
        
        // Add the final code if not already present
        const finalMatch = fullResults.find(r => 
            r.htsno.replace(/\./g, '') === cleanCode
        );
        
        if (finalMatch && !levels.find(l => l.code.replace(/\./g, '') === cleanCode)) {
            levels.push({
                level: 'statistical',
                code: finalMatch.htsno,
                description: cleanDescription(finalMatch.description),
                indent: finalMatch.indent || 4,
                dutyRate: finalMatch.general,
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


