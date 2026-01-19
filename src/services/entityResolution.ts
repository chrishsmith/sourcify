/**
 * Entity Resolution Service
 * 
 * Handles deduplication and matching of suppliers across different data sources.
 * Uses fuzzy matching algorithms to identify potential duplicates.
 */

import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatchCandidate {
    id: string;
    name: string;
    countryCode: string;
    city?: string | null;
    website?: string | null;
}

export interface MatchResult {
    candidate: MatchCandidate;
    scores: {
        nameScore: number;
        locationScore: number;
        websiteScore: number;
        overallScore: number;
    };
    isMatch: boolean;
}

export interface DeduplicationResult {
    totalSuppliers: number;
    duplicateGroups: DuplicateGroup[];
    mergedCount: number;
}

export interface DuplicateGroup {
    primaryId: string;
    primaryName: string;
    duplicates: {
        id: string;
        name: string;
        matchScore: number;
    }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRING SIMILARITY ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    return matrix[b.length][a.length];
}

/**
 * Calculate Jaro-Winkler similarity (0-1, higher is more similar)
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;
    
    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);
    
    let matches = 0;
    let transpositions = 0;
    
    // Find matches
    for (let i = 0; i < s1.length; i++) {
        const start = Math.max(0, i - matchWindow);
        const end = Math.min(i + matchWindow + 1, s2.length);
        
        for (let j = start; j < end; j++) {
            if (s2Matches[j] || s1[i] !== s2[j]) continue;
            s1Matches[i] = true;
            s2Matches[j] = true;
            matches++;
            break;
        }
    }
    
    if (matches === 0) return 0;
    
    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
        if (!s1Matches[i]) continue;
        while (!s2Matches[k]) k++;
        if (s1[i] !== s2[k]) transpositions++;
        k++;
    }
    
    const jaro = (
        matches / s1.length +
        matches / s2.length +
        (matches - transpositions / 2) / matches
    ) / 3;
    
    // Calculate common prefix (up to 4 chars)
    let prefix = 0;
    for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
        if (s1[i] === s2[i]) prefix++;
        else break;
    }
    
    // Jaro-Winkler (p = 0.1 is standard scaling factor)
    return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculate normalized Levenshtein similarity (0-1)
 */
export function normalizedLevenshtein(a: string, b: string): number {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - levenshteinDistance(a, b) / maxLen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAME NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common company suffixes to normalize/remove
 */
const COMPANY_SUFFIXES = [
    'co', 'co.', 'company', 'corp', 'corp.', 'corporation',
    'inc', 'inc.', 'incorporated', 'llc', 'l.l.c.', 'ltd', 'ltd.',
    'limited', 'gmbh', 'ag', 'sa', 'srl', 'bv', 'nv', 'plc',
    'pty', 'pvt', 'private', 'group', 'holdings', 'international',
    'intl', 'trading', 'trading co', 'manufacturing', 'mfg',
    'industries', 'industrial', 'enterprise', 'enterprises',
    'import', 'export', 'im/ex', 'factory', 'works',
];

/**
 * Normalize a company name for comparison
 */
export function normalizeCompanyName(name: string): string {
    let normalized = name.toLowerCase().trim();
    
    // Remove special characters except spaces
    normalized = normalized.replace(/[^\w\s]/g, ' ');
    
    // Remove common suffixes
    for (const suffix of COMPANY_SUFFIXES) {
        const regex = new RegExp(`\\b${suffix}\\b`, 'gi');
        normalized = normalized.replace(regex, '');
    }
    
    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
}

/**
 * Extract domain from website URL
 */
export function extractDomain(url?: string | null): string | null {
    if (!url) return null;
    
    try {
        let domain = url.toLowerCase();
        domain = domain.replace(/^https?:\/\//, '');
        domain = domain.replace(/^www\./, '');
        domain = domain.split('/')[0];
        domain = domain.split('?')[0];
        return domain;
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCHING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate name similarity score (0-100)
 */
export function calculateNameScore(name1: string, name2: string): number {
    const norm1 = normalizeCompanyName(name1);
    const norm2 = normalizeCompanyName(name2);
    
    // Exact match after normalization
    if (norm1 === norm2) return 100;
    
    // Use Jaro-Winkler for similarity
    const jw = jaroWinklerSimilarity(norm1, norm2);
    
    // Also check if one contains the other (common for parent/subsidiary)
    const containsBonus = norm1.includes(norm2) || norm2.includes(norm1) ? 0.1 : 0;
    
    return Math.min(100, Math.round((jw + containsBonus) * 100));
}

/**
 * Calculate location similarity score (0-100)
 */
export function calculateLocationScore(
    country1: string,
    city1?: string | null,
    country2?: string,
    city2?: string | null
): number {
    // Different countries = no match
    if (country1 !== country2) return 0;
    
    // Same country, no city info = partial match
    if (!city1 || !city2) return 50;
    
    // Same country, check city
    const cityNorm1 = city1.toLowerCase().trim();
    const cityNorm2 = city2.toLowerCase().trim();
    
    if (cityNorm1 === cityNorm2) return 100;
    
    // Fuzzy city match
    const citySimilarity = jaroWinklerSimilarity(cityNorm1, cityNorm2);
    return Math.round(50 + citySimilarity * 50);
}

/**
 * Calculate website similarity score (0-100)
 */
export function calculateWebsiteScore(
    website1?: string | null,
    website2?: string | null
): number {
    const domain1 = extractDomain(website1);
    const domain2 = extractDomain(website2);
    
    // No websites to compare
    if (!domain1 || !domain2) return 0;
    
    // Exact domain match
    if (domain1 === domain2) return 100;
    
    // Similar domains
    const similarity = jaroWinklerSimilarity(domain1, domain2);
    return Math.round(similarity * 100);
}

/**
 * Find potential matches for a supplier
 */
export async function findPotentialMatches(
    supplier: MatchCandidate,
    threshold: number = 70
): Promise<MatchResult[]> {
    // Get candidates from same country
    const candidates = await prisma.supplier.findMany({
        where: {
            countryCode: supplier.countryCode,
            id: { not: supplier.id },
        },
        select: {
            id: true,
            name: true,
            countryCode: true,
            city: true,
            website: true,
        },
    });
    
    const results: MatchResult[] = [];
    
    for (const candidate of candidates) {
        const nameScore = calculateNameScore(supplier.name, candidate.name);
        const locationScore = calculateLocationScore(
            supplier.countryCode,
            supplier.city,
            candidate.countryCode,
            candidate.city
        );
        const websiteScore = calculateWebsiteScore(supplier.website, candidate.website);
        
        // Weighted overall score
        // Name is most important, then website (if both have one), then location
        const hasWebsite = supplier.website && candidate.website;
        const overallScore = hasWebsite
            ? nameScore * 0.5 + websiteScore * 0.3 + locationScore * 0.2
            : nameScore * 0.7 + locationScore * 0.3;
        
        results.push({
            candidate,
            scores: {
                nameScore,
                locationScore,
                websiteScore,
                overallScore: Math.round(overallScore),
            },
            isMatch: overallScore >= threshold,
        });
    }
    
    // Sort by overall score descending
    results.sort((a, b) => b.scores.overallScore - a.scores.overallScore);
    
    // Return only potential matches
    return results.filter(r => r.scores.overallScore >= threshold * 0.7);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEDUPLICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find all duplicate supplier groups
 */
export async function findDuplicateGroups(
    threshold: number = 80
): Promise<DuplicateGroup[]> {
    const suppliers = await prisma.supplier.findMany({
        select: {
            id: true,
            name: true,
            countryCode: true,
            city: true,
            website: true,
        },
        orderBy: { createdAt: 'asc' }, // Older records are primary
    });
    
    const processed = new Set<string>();
    const groups: DuplicateGroup[] = [];
    
    for (const supplier of suppliers) {
        if (processed.has(supplier.id)) continue;
        
        const matches = await findPotentialMatches(supplier, threshold);
        const duplicates = matches
            .filter(m => m.isMatch && !processed.has(m.candidate.id))
            .map(m => ({
                id: m.candidate.id,
                name: m.candidate.name,
                matchScore: m.scores.overallScore,
            }));
        
        if (duplicates.length > 0) {
            groups.push({
                primaryId: supplier.id,
                primaryName: supplier.name,
                duplicates,
            });
            
            // Mark all as processed
            processed.add(supplier.id);
            duplicates.forEach(d => processed.add(d.id));
        }
    }
    
    return groups;
}

/**
 * Merge duplicate suppliers into primary
 * - Keeps the oldest record as primary
 * - Combines data from all duplicates
 * - Updates references (shipments, matches, etc.)
 */
export async function mergeDuplicates(
    group: DuplicateGroup
): Promise<void> {
    const primary = await prisma.supplier.findUnique({
        where: { id: group.primaryId },
    });
    
    if (!primary) return;
    
    for (const duplicate of group.duplicates) {
        const dup = await prisma.supplier.findUnique({
            where: { id: duplicate.id },
            include: {
                verification: true,
                htsSpecializations: true,
            },
        });
        
        if (!dup) continue;
        
        // Merge certifications
        const mergedCerts = [...new Set([
            ...primary.certifications,
            ...dup.certifications,
        ])];
        
        // Merge materials
        const mergedMaterials = [...new Set([
            ...primary.materials,
            ...dup.materials,
        ])];
        
        // Merge HTS chapters
        const mergedChapters = [...new Set([
            ...primary.htsChapters,
            ...dup.htsChapters,
        ])];
        
        // Merge product categories
        const mergedCategories = [...new Set([
            ...primary.productCategories,
            ...dup.productCategories,
        ])];
        
        // Update primary with merged data
        await prisma.supplier.update({
            where: { id: group.primaryId },
            data: {
                certifications: mergedCerts,
                materials: mergedMaterials,
                htsChapters: mergedChapters,
                productCategories: mergedCategories,
                // Keep better data where available
                website: primary.website || dup.website,
                email: primary.email || dup.email,
                phone: primary.phone || dup.phone,
                description: primary.description || dup.description,
                // Take higher scores
                overallScore: Math.max(primary.overallScore || 0, dup.overallScore || 0),
                reliabilityScore: Math.max(primary.reliabilityScore || 0, dup.reliabilityScore || 0),
                qualityScore: Math.max(primary.qualityScore || 0, dup.qualityScore || 0),
            },
        });
        
        // Move HTS specializations to primary
        await prisma.supplierHtsSpecialization.updateMany({
            where: { supplierId: duplicate.id },
            data: { supplierId: group.primaryId },
        });
        
        // Delete duplicate
        await prisma.supplier.delete({
            where: { id: duplicate.id },
        });
    }
}

/**
 * Run full deduplication process
 */
export async function runDeduplication(
    threshold: number = 80,
    dryRun: boolean = false
): Promise<DeduplicationResult> {
    console.log('[Entity Resolution] Finding duplicate groups...');
    
    const totalSuppliers = await prisma.supplier.count();
    const groups = await findDuplicateGroups(threshold);
    
    console.log(`[Entity Resolution] Found ${groups.length} duplicate groups`);
    
    let mergedCount = 0;
    
    if (!dryRun) {
        for (const group of groups) {
            await mergeDuplicates(group);
            mergedCount += group.duplicates.length;
        }
        console.log(`[Entity Resolution] Merged ${mergedCount} duplicates`);
    }
    
    return {
        totalSuppliers,
        duplicateGroups: groups,
        mergedCount,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIER LINKING (Connect BOL data to suppliers)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Link shipment records to suppliers based on shipper name matching
 */
export async function linkShipmentsToSuppliers(
    minScore: number = 75
): Promise<{ linked: number; unlinked: number }> {
    // Get distinct shipper names from shipments
    const shipperNames = await prisma.shipmentRecord.findMany({
        distinct: ['shipperName', 'shipperCountry'],
        select: {
            shipperName: true,
            shipperCountry: true,
        },
    });
    
    let linked = 0;
    let unlinked = 0;
    
    for (const shipper of shipperNames) {
        // Find best matching supplier
        const suppliers = await prisma.supplier.findMany({
            where: { countryCode: shipper.shipperCountry },
            select: { id: true, name: true, countryCode: true },
        });
        
        let bestMatch: { id: string; score: number } | null = null;
        
        for (const supplier of suppliers) {
            const score = calculateNameScore(shipper.shipperName, supplier.name);
            if (score >= minScore && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { id: supplier.id, score };
            }
        }
        
        if (bestMatch) {
            // Update supplier's HTS specializations based on shipments
            const shipments = await prisma.shipmentRecord.findMany({
                where: {
                    shipperName: shipper.shipperName,
                    shipperCountry: shipper.shipperCountry,
                },
                select: {
                    htsCode: true,
                    quantity: true,
                    declaredValue: true,
                    arrivalDate: true,
                },
            });
            
            // Group by HTS code
            const htsSummary = new Map<string, {
                count: number;
                totalQty: number;
                totalValue: number;
                lastDate: Date | null;
            }>();
            
            for (const shipment of shipments) {
                const hts = shipment.htsCode.substring(0, 6); // Use 6-digit level
                const current = htsSummary.get(hts) || {
                    count: 0,
                    totalQty: 0,
                    totalValue: 0,
                    lastDate: null,
                };
                
                current.count++;
                current.totalQty += shipment.quantity || 0;
                current.totalValue += shipment.declaredValue || 0;
                if (shipment.arrivalDate && (!current.lastDate || shipment.arrivalDate > current.lastDate)) {
                    current.lastDate = shipment.arrivalDate;
                }
                
                htsSummary.set(hts, current);
            }
            
            // Create/update HTS specializations
            for (const [hts, summary] of htsSummary) {
                await prisma.supplierHtsSpecialization.upsert({
                    where: {
                        supplierId_htsCode: {
                            supplierId: bestMatch.id,
                            htsCode: hts,
                        },
                    },
                    create: {
                        supplierId: bestMatch.id,
                        htsCode: hts,
                        shipmentCount: summary.count,
                        totalQuantity: summary.totalQty,
                        totalValue: summary.totalValue,
                        avgUnitValue: summary.totalQty > 0 
                            ? summary.totalValue / summary.totalQty 
                            : null,
                        lastShipment: summary.lastDate,
                    },
                    update: {
                        shipmentCount: { increment: summary.count },
                        totalQuantity: { increment: summary.totalQty },
                        totalValue: { increment: summary.totalValue },
                        lastShipment: summary.lastDate,
                    },
                });
            }
            
            linked++;
        } else {
            unlinked++;
        }
    }
    
    console.log(`[Entity Resolution] Linked ${linked} shippers, ${unlinked} unlinked`);
    return { linked, unlinked };
}





