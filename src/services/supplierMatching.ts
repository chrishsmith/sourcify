/**
 * Product-Supplier Matching Engine
 * 
 * Given an HTS code or product description, find relevant suppliers.
 * Uses multiple matching criteria:
 * - HTS chapter/code alignment
 * - Material compatibility
 * - Certification requirements
 * - Volume/MOQ matching
 * - Country preferences (FTA, tariff optimization)
 */

import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatchCriteria {
    htsCode?: string;
    productDescription?: string;
    materials?: string[];
    requiredCertifications?: string[];
    preferredCountries?: string[];
    excludeCountries?: string[];
    minOrderQuantity?: number;
    maxLeadDays?: number;
    preferFTA?: boolean;           // Prefer suppliers from FTA countries
    minVerificationScore?: number;
}

export interface SupplierMatch {
    supplierId: string;
    supplierName: string;
    countryCode: string;
    countryName: string;
    matchScore: number;            // 0-100
    matchReasons: string[];
    scores: {
        htsMatch: number;
        materialMatch: number;
        certificationMatch: number;
        locationMatch: number;
        verificationMatch: number;
    };
    supplier: {
        tier: string;
        verificationScore: number | null;
        certifications: string[];
        minOrderValue: number | null;
        typicalLeadDays: number | null;
        overallScore: number | null;
    };
}

export interface MatchResult {
    criteria: MatchCriteria;
    matches: SupplierMatch[];
    totalFound: number;
    searchTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCHING WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = {
    hts: 0.35,              // HTS code match is most important
    material: 0.20,         // Material compatibility
    certification: 0.15,    // Certification requirements
    location: 0.15,         // Country/FTA preferences
    verification: 0.15,     // Supplier verification score
};

// FTA countries (duty-free or reduced tariffs to USA)
const FTA_COUNTRIES = new Set([
    'CA', 'MX',             // USMCA
    'KR',                   // KORUS FTA
    'AU',                   // Australia FTA
    'CO', 'PE', 'PA', 'CL', // Latin America FTAs
    'MA', 'JO', 'BH', 'OM', // Middle East FTAs
    'SG', 'IL',             // Other FTAs
]);

// High-tariff countries (Section 301, IEEPA)
const HIGH_TARIFF_COUNTRIES = new Set([
    'CN',  // Section 301 + IEEPA
]);

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate HTS code match score
 */
function calculateHtsScore(
    supplierHtsChapters: string[],
    supplierSpecializations: Array<{ htsCode: string; shipmentCount: number }>,
    targetHts?: string
): number {
    if (!targetHts) return 50; // Neutral if no target
    
    const targetChapter = targetHts.substring(0, 2);
    const targetHeading = targetHts.substring(0, 4);
    const target6 = targetHts.substring(0, 6);
    
    // Check specializations (from actual shipment data)
    for (const spec of supplierSpecializations) {
        if (spec.htsCode === target6) return 100;           // Exact 6-digit match
        if (spec.htsCode.startsWith(targetHeading)) return 90;  // Heading match
        if (spec.htsCode.startsWith(targetChapter)) return 75;  // Chapter match
    }
    
    // Check general HTS chapters
    if (supplierHtsChapters.includes(targetChapter)) return 60;
    
    // Check if any related chapters
    const relatedChapters = getRelatedChapters(targetChapter);
    const hasRelated = supplierHtsChapters.some(c => relatedChapters.includes(c));
    if (hasRelated) return 40;
    
    return 0;
}

/**
 * Calculate material compatibility score
 */
function calculateMaterialScore(
    supplierMaterials: string[],
    requiredMaterials?: string[]
): number {
    if (!requiredMaterials || requiredMaterials.length === 0) return 50;
    if (supplierMaterials.length === 0) return 20;
    
    const supplierLower = supplierMaterials.map(m => m.toLowerCase());
    const requiredLower = requiredMaterials.map(m => m.toLowerCase());
    
    let matchCount = 0;
    for (const req of requiredLower) {
        const hasMatch = supplierLower.some(s => 
            s.includes(req) || req.includes(s)
        );
        if (hasMatch) matchCount++;
    }
    
    const matchRatio = matchCount / requiredLower.length;
    return Math.round(matchRatio * 100);
}

/**
 * Calculate certification match score
 */
function calculateCertificationScore(
    supplierCerts: string[],
    requiredCerts?: string[]
): number {
    if (!requiredCerts || requiredCerts.length === 0) return 50;
    if (supplierCerts.length === 0) return 0;
    
    const supplierLower = supplierCerts.map(c => c.toLowerCase());
    const requiredLower = requiredCerts.map(c => c.toLowerCase());
    
    let matchCount = 0;
    for (const req of requiredLower) {
        const hasMatch = supplierLower.some(s => 
            s.includes(req) || req.includes(s)
        );
        if (hasMatch) matchCount++;
    }
    
    // All required certs must be present for high score
    if (matchCount === requiredLower.length) return 100;
    
    // Partial matches get proportional score
    const matchRatio = matchCount / requiredLower.length;
    return Math.round(matchRatio * 80);
}

/**
 * Calculate location preference score
 */
function calculateLocationScore(
    countryCode: string,
    preferredCountries?: string[],
    excludeCountries?: string[],
    preferFTA?: boolean
): number {
    // Excluded countries get 0
    if (excludeCountries?.includes(countryCode)) return 0;
    
    // Preferred countries get 100
    if (preferredCountries?.includes(countryCode)) return 100;
    
    let score = 50; // Base score
    
    // FTA preference
    if (preferFTA && FTA_COUNTRIES.has(countryCode)) {
        score += 40;
    }
    
    // Penalty for high-tariff countries
    if (HIGH_TARIFF_COUNTRIES.has(countryCode)) {
        score -= 20;
    }
    
    return Math.max(0, Math.min(100, score));
}

/**
 * Calculate verification score component
 */
function calculateVerificationScore(
    tier: string,
    overallScore: number | null,
    minRequired?: number
): number {
    const score = overallScore || 0;
    
    // Below minimum requirement
    if (minRequired && score < minRequired) return 0;
    
    // Tier bonuses
    let tierBonus = 0;
    switch (tier) {
        case 'PREMIUM': tierBonus = 30; break;
        case 'VERIFIED': tierBonus = 20; break;
        case 'BASIC': tierBonus = 10; break;
    }
    
    // Combined score
    return Math.min(100, score * 0.7 + tierBonus);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN MATCHING FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Find matching suppliers for given criteria
 */
export async function findMatchingSuppliers(
    criteria: MatchCriteria,
    limit: number = 20
): Promise<MatchResult> {
    const startTime = Date.now();
    
    // Build base query
    const whereClause: Record<string, unknown> = {};
    
    // Country filters
    if (criteria.excludeCountries?.length) {
        whereClause.countryCode = { notIn: criteria.excludeCountries };
    }
    
    if (criteria.preferredCountries?.length && !criteria.preferFTA) {
        whereClause.countryCode = { in: criteria.preferredCountries };
    }
    
    // Verification filter
    if (criteria.minVerificationScore) {
        whereClause.overallScore = { gte: criteria.minVerificationScore };
    }
    
    // Lead time filter
    if (criteria.maxLeadDays) {
        whereClause.typicalLeadDays = { lte: criteria.maxLeadDays };
    }
    
    // Get suppliers with specializations
    const suppliers = await prisma.supplier.findMany({
        where: whereClause,
        include: {
            htsSpecializations: {
                select: {
                    htsCode: true,
                    shipmentCount: true,
                },
            },
            verification: {
                select: {
                    verificationScore: true,
                },
            },
        },
    });
    
    // Score each supplier
    const matches: SupplierMatch[] = [];
    
    for (const supplier of suppliers) {
        const htsScore = calculateHtsScore(
            supplier.htsChapters,
            supplier.htsSpecializations,
            criteria.htsCode
        );
        
        const materialScore = calculateMaterialScore(
            supplier.materials,
            criteria.materials
        );
        
        const certScore = calculateCertificationScore(
            supplier.certifications,
            criteria.requiredCertifications
        );
        
        const locationScore = calculateLocationScore(
            supplier.countryCode,
            criteria.preferredCountries,
            criteria.excludeCountries,
            criteria.preferFTA
        );
        
        const verificationScore = calculateVerificationScore(
            supplier.tier,
            supplier.overallScore,
            criteria.minVerificationScore
        );
        
        // Skip if critical criteria not met
        if (locationScore === 0) continue;
        if (certScore === 0 && criteria.requiredCertifications?.length) continue;
        
        // Calculate weighted overall score
        const overallScore = Math.round(
            htsScore * WEIGHTS.hts +
            materialScore * WEIGHTS.material +
            certScore * WEIGHTS.certification +
            locationScore * WEIGHTS.location +
            verificationScore * WEIGHTS.verification
        );
        
        // Build match reasons
        const reasons: string[] = [];
        if (htsScore >= 75) reasons.push('Strong HTS match');
        else if (htsScore >= 50) reasons.push('HTS chapter match');
        if (materialScore >= 70) reasons.push('Material expertise');
        if (certScore >= 80) reasons.push('All certifications');
        else if (certScore >= 50) reasons.push('Partial certifications');
        if (FTA_COUNTRIES.has(supplier.countryCode)) reasons.push('FTA country');
        if (supplier.tier === 'PREMIUM') reasons.push('Premium supplier');
        else if (supplier.tier === 'VERIFIED') reasons.push('Verified supplier');
        
        matches.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            countryCode: supplier.countryCode,
            countryName: supplier.countryName,
            matchScore: overallScore,
            matchReasons: reasons,
            scores: {
                htsMatch: htsScore,
                materialMatch: materialScore,
                certificationMatch: certScore,
                locationMatch: locationScore,
                verificationMatch: verificationScore,
            },
            supplier: {
                tier: supplier.tier,
                verificationScore: supplier.verification?.verificationScore || null,
                certifications: supplier.certifications,
                minOrderValue: supplier.minOrderValue,
                typicalLeadDays: supplier.typicalLeadDays,
                overallScore: supplier.overallScore,
            },
        });
    }
    
    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Apply limit
    const topMatches = matches.slice(0, limit);
    
    return {
        criteria,
        matches: topMatches,
        totalFound: matches.length,
        searchTime: Date.now() - startTime,
    };
}

/**
 * Find suppliers for a classified product
 */
export async function findSuppliersForProduct(
    htsCode: string,
    options: {
        materials?: string[];
        certifications?: string[];
        preferFTA?: boolean;
        excludeChina?: boolean;
        limit?: number;
    } = {}
): Promise<MatchResult> {
    const criteria: MatchCriteria = {
        htsCode,
        materials: options.materials,
        requiredCertifications: options.certifications,
        preferFTA: options.preferFTA ?? true,
        excludeCountries: options.excludeChina ? ['CN'] : undefined,
    };
    
    return findMatchingSuppliers(criteria, options.limit || 20);
}

/**
 * Get supplier recommendations for cost optimization
 */
export async function getSourcingAlternatives(
    currentHtsCode: string,
    currentCountry: string,
    options: {
        minSavingsPercent?: number;
        requireVerified?: boolean;
    } = {}
): Promise<{
    current: { country: string; avgCost: number | null };
    alternatives: Array<{
        country: string;
        avgCost: number;
        savingsPercent: number;
        supplierCount: number;
        topSuppliers: SupplierMatch[];
    }>;
}> {
    const hts6 = currentHtsCode.replace(/\./g, '').substring(0, 6);
    
    // Get current country cost
    const currentCost = await prisma.htsCostByCountry.findUnique({
        where: {
            htsCode_countryCode: {
                htsCode: hts6,
                countryCode: currentCountry,
            },
        },
    });
    
    // Get alternative country costs
    const alternatives = await prisma.htsCostByCountry.findMany({
        where: {
            htsCode: hts6,
            countryCode: { not: currentCountry },
            confidenceScore: { gte: 30 },
        },
        orderBy: { avgUnitValue: 'asc' },
    });
    
    const result: {
        current: { country: string; avgCost: number | null };
        alternatives: Array<{
            country: string;
            avgCost: number;
            savingsPercent: number;
            supplierCount: number;
            topSuppliers: SupplierMatch[];
        }>;
    } = {
        current: {
            country: currentCountry,
            avgCost: currentCost?.avgUnitValue || null,
        },
        alternatives: [],
    };
    
    const baselineCost = currentCost?.avgUnitValue;
    
    for (const alt of alternatives) {
        // Calculate savings
        const savingsPercent = baselineCost
            ? Math.round((1 - alt.avgUnitValue / baselineCost) * 100)
            : 0;
        
        // Skip if doesn't meet minimum savings
        if (options.minSavingsPercent && savingsPercent < options.minSavingsPercent) {
            continue;
        }
        
        // Find suppliers in this country
        const supplierResult = await findMatchingSuppliers({
            htsCode: hts6,
            preferredCountries: [alt.countryCode],
            minVerificationScore: options.requireVerified ? 40 : undefined,
        }, 5);
        
        result.alternatives.push({
            country: alt.countryCode,
            avgCost: alt.avgUnitValue,
            savingsPercent,
            supplierCount: supplierResult.totalFound,
            topSuppliers: supplierResult.matches,
        });
    }
    
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get related HTS chapters (for broader matching)
 */
function getRelatedChapters(chapter: string): string[] {
    const relationships: Record<string, string[]> = {
        '61': ['62', '63'],     // Knit apparel ↔ Woven apparel ↔ Textiles
        '62': ['61', '63'],
        '63': ['61', '62'],
        '84': ['85', '90'],     // Machinery ↔ Electronics ↔ Instruments
        '85': ['84', '90'],
        '90': ['84', '85'],
        '39': ['40'],           // Plastics ↔ Rubber
        '40': ['39'],
        '72': ['73', '74'],     // Iron/Steel ↔ Articles ↔ Copper
        '73': ['72', '74'],
        '94': ['44'],           // Furniture ↔ Wood
        '44': ['94'],
    };
    
    return relationships[chapter] || [];
}


