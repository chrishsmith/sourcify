/**
 * Supplier Verification Scoring Engine
 * 
 * Calculates verification scores for suppliers based on:
 * - Data source presence (BOL, directories, trade shows)
 * - Shipment history volume
 * - Certifications
 * - Website verification
 */

import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface VerificationScore {
    overallScore: number;           // 0-100
    dataSourceCount: number;        // How many sources mention this supplier
    shipmentVolume: number;         // Annual shipment count
    certificationScore: number;     // Quality certifications (0-100)
    tradeShowPresence: number;      // Industry presence (0-100)
    recencyScore: number;           // How recent is the data (0-100)
    breakdown: VerificationBreakdown;
}

export interface VerificationBreakdown {
    bolScore: number;
    directoryScore: number;
    tradeShowScore: number;
    certificationScore: number;
    websiteScore: number;
    recencyScore: number;
}

export interface VerificationInput {
    supplierId: string;
    bolShipmentCount?: number;
    bolFirstSeen?: Date;
    bolLastSeen?: Date;
    foundInDirectory?: boolean;
    directorySource?: string;
    foundInTradeShow?: boolean;
    tradeShowName?: string;
    certifications?: string[];
    website?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING WEIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

const WEIGHTS = {
    bol: 0.35,              // BOL presence is strongest signal
    directory: 0.20,        // Directory listing adds credibility
    tradeShow: 0.15,        // Trade show presence shows legitimacy
    certification: 0.15,    // Certifications indicate quality
    website: 0.05,          // Basic web presence
    recency: 0.10,          // Recent activity matters
};

// Premium certifications get higher scores
const CERTIFICATION_VALUES: Record<string, number> = {
    // Quality Management
    'ISO 9001': 15,
    'ISO 14001': 12,
    'ISO 45001': 10,
    'IATF 16949': 18,       // Automotive
    'AS9100': 18,           // Aerospace
    'ISO 13485': 18,        // Medical devices
    
    // Social Compliance
    'BSCI': 12,
    'SEDEX': 12,
    'SA8000': 15,
    'WRAP': 10,
    'Fair Trade': 10,
    
    // Industry Specific
    'GOTS': 12,             // Organic textiles
    'GRS': 10,              // Recycled content
    'Oeko-Tex': 10,
    'LWG': 10,              // Leather
    'FSC': 10,              // Wood/paper
    
    // Product Safety
    'UL Listed': 12,
    'CE': 10,
    'FCC': 8,
    'FDA Registered': 15,
    'FDA Approved': 15,
    'BPA Free': 5,
    
    // Default
    'default': 5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SCORING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate BOL score based on shipment history
 */
function calculateBolScore(shipmentCount: number, lastSeen?: Date): number {
    if (shipmentCount === 0) return 0;
    
    // Base score from volume (logarithmic scale)
    // 1 shipment = 20, 10 = 50, 100 = 70, 1000 = 90
    const volumeScore = Math.min(90, 20 + Math.log10(shipmentCount) * 25);
    
    // Recency bonus
    let recencyBonus = 0;
    if (lastSeen) {
        const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 90) recencyBonus = 10;
        else if (daysSince < 180) recencyBonus = 5;
    }
    
    return Math.min(100, volumeScore + recencyBonus);
}

/**
 * Calculate directory presence score
 */
function calculateDirectoryScore(
    foundInDirectory: boolean,
    directorySource?: string
): number {
    if (!foundInDirectory) return 0;
    
    // Premium directories get higher scores
    const premiumSources = ['thomasnet', 'kompass', 'dnb'];
    const isPremium = directorySource && 
        premiumSources.some(s => directorySource.toLowerCase().includes(s));
    
    return isPremium ? 85 : 65;
}

/**
 * Calculate trade show presence score
 */
function calculateTradeShowScore(
    foundInTradeShow: boolean,
    tradeShowName?: string,
    tradeShowYear?: number
): number {
    if (!foundInTradeShow) return 0;
    
    // Major trade shows get higher scores
    const majorShows = ['canton fair', 'ces', 'magic', 'ispo', 'ambiente'];
    const isMajor = tradeShowName && 
        majorShows.some(s => tradeShowName.toLowerCase().includes(s));
    
    let score = isMajor ? 80 : 60;
    
    // Recent shows get bonus
    if (tradeShowYear) {
        const currentYear = new Date().getFullYear();
        if (tradeShowYear >= currentYear - 1) score += 15;
        else if (tradeShowYear >= currentYear - 2) score += 10;
    }
    
    return Math.min(100, score);
}

/**
 * Calculate certification score
 */
function calculateCertificationScore(certifications: string[]): number {
    if (!certifications || certifications.length === 0) return 0;
    
    let totalPoints = 0;
    
    for (const cert of certifications) {
        // Find matching certification value
        const upperCert = cert.toUpperCase();
        let points = CERTIFICATION_VALUES['default'];
        
        for (const [key, value] of Object.entries(CERTIFICATION_VALUES)) {
            if (upperCert.includes(key.toUpperCase())) {
                points = Math.max(points, value);
                break;
            }
        }
        
        totalPoints += points;
    }
    
    // Cap at 100, with diminishing returns
    // 1 cert ~20-25, 3 certs ~50, 5+ certs ~80-100
    return Math.min(100, totalPoints);
}

/**
 * Calculate website verification score
 */
async function calculateWebsiteScore(website?: string | null): Promise<number> {
    if (!website) return 0;
    
    // In production, we would:
    // - Check if domain is valid
    // - Check SSL certificate
    // - Check domain age
    // - Verify contact info exists
    
    // For now, basic checks
    let score = 30; // Base score for having a website
    
    // Has HTTPS
    if (website.startsWith('https://')) score += 20;
    
    // Has proper domain (not free hosting)
    const freeHosting = ['wix.com', 'weebly.com', 'wordpress.com', 'blogspot.'];
    const hasFreeHosting = freeHosting.some(h => website.includes(h));
    if (!hasFreeHosting) score += 20;
    
    // Has company-specific domain (not just country TLD)
    const hasProperDomain = /\.[a-z]{2,4}$/.test(website);
    if (hasProperDomain) score += 15;
    
    return Math.min(100, score);
}

/**
 * Calculate recency score based on last activity
 */
function calculateRecencyScore(lastSeen?: Date): number {
    if (!lastSeen) return 0;
    
    const daysSince = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince < 30) return 100;
    if (daysSince < 90) return 85;
    if (daysSince < 180) return 70;
    if (daysSince < 365) return 50;
    if (daysSince < 730) return 30;
    return 10;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VERIFICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate full verification score for a supplier
 */
export async function calculateVerificationScore(
    supplierId: string
): Promise<VerificationScore> {
    // Get supplier data
    const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        include: {
            verification: true,
            htsSpecializations: true,
        },
    });
    
    if (!supplier) {
        throw new Error(`Supplier not found: ${supplierId}`);
    }
    
    // Get shipment stats
    const shipmentStats = await prisma.shipmentRecord.aggregate({
        where: {
            shipperName: supplier.name,
            shipperCountry: supplier.countryCode,
        },
        _count: true,
        _max: { arrivalDate: true },
        _min: { arrivalDate: true },
    });
    
    // Calculate individual scores
    const bolScore = calculateBolScore(
        shipmentStats._count,
        shipmentStats._max.arrivalDate || undefined
    );
    
    const directoryScore = calculateDirectoryScore(
        supplier.verification?.foundInDirectory || false,
        supplier.verification?.directorySource || undefined
    );
    
    const tradeShowScore = calculateTradeShowScore(
        supplier.verification?.foundInTradeShow || false,
        supplier.verification?.tradeShowName || undefined,
        supplier.verification?.tradeShowYear || undefined
    );
    
    const certificationScore = calculateCertificationScore(supplier.certifications);
    
    const websiteScore = await calculateWebsiteScore(supplier.website);
    
    const recencyScore = calculateRecencyScore(
        shipmentStats._max.arrivalDate || supplier.verification?.bolLastSeen || undefined
    );
    
    // Calculate weighted overall score
    const overallScore = Math.round(
        bolScore * WEIGHTS.bol +
        directoryScore * WEIGHTS.directory +
        tradeShowScore * WEIGHTS.tradeShow +
        certificationScore * WEIGHTS.certification +
        websiteScore * WEIGHTS.website +
        recencyScore * WEIGHTS.recency
    );
    
    // Count data sources
    let dataSourceCount = 0;
    if (shipmentStats._count > 0) dataSourceCount++;
    if (supplier.verification?.foundInDirectory) dataSourceCount++;
    if (supplier.verification?.foundInTradeShow) dataSourceCount++;
    if (supplier.verification?.foundInCertDb) dataSourceCount++;
    
    return {
        overallScore,
        dataSourceCount,
        shipmentVolume: shipmentStats._count,
        certificationScore,
        tradeShowPresence: tradeShowScore,
        recencyScore,
        breakdown: {
            bolScore,
            directoryScore,
            tradeShowScore,
            certificationScore,
            websiteScore,
            recencyScore,
        },
    };
}

/**
 * Update supplier verification record in database
 */
export async function updateSupplierVerification(
    supplierId: string
): Promise<void> {
    const score = await calculateVerificationScore(supplierId);
    
    // Get shipment data for the supplier
    const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
    });
    
    if (!supplier) return;
    
    const shipmentStats = await prisma.shipmentRecord.aggregate({
        where: {
            shipperName: supplier.name,
            shipperCountry: supplier.countryCode,
        },
        _count: true,
        _max: { arrivalDate: true },
        _min: { arrivalDate: true },
    });
    
    // Upsert verification record
    await prisma.supplierVerification.upsert({
        where: { supplierId },
        create: {
            supplierId,
            foundInBol: shipmentStats._count > 0,
            bolShipmentCount: shipmentStats._count,
            bolFirstSeen: shipmentStats._min.arrivalDate,
            bolLastSeen: shipmentStats._max.arrivalDate,
            verificationScore: score.overallScore,
            verificationDate: new Date(),
        },
        update: {
            foundInBol: shipmentStats._count > 0,
            bolShipmentCount: shipmentStats._count,
            bolFirstSeen: shipmentStats._min.arrivalDate,
            bolLastSeen: shipmentStats._max.arrivalDate,
            verificationScore: score.overallScore,
            verificationDate: new Date(),
        },
    });
    
    // Update supplier tier based on score
    let tier: 'UNVERIFIED' | 'BASIC' | 'VERIFIED' | 'PREMIUM' = 'UNVERIFIED';
    if (score.overallScore >= 80 && score.dataSourceCount >= 3) {
        tier = 'PREMIUM';
    } else if (score.overallScore >= 60 && score.dataSourceCount >= 2) {
        tier = 'VERIFIED';
    } else if (score.overallScore >= 40 || score.dataSourceCount >= 1) {
        tier = 'BASIC';
    }
    
    await prisma.supplier.update({
        where: { id: supplierId },
        data: {
            tier,
            isVerified: tier !== 'UNVERIFIED',
            verificationDate: new Date(),
            overallScore: score.overallScore,
        },
    });
}

/**
 * Run verification for all suppliers
 */
export async function verifyAllSuppliers(): Promise<{
    total: number;
    verified: number;
    premium: number;
    basic: number;
    unverified: number;
}> {
    const suppliers = await prisma.supplier.findMany({
        select: { id: true },
    });
    
    let verified = 0;
    let premium = 0;
    let basic = 0;
    let unverified = 0;
    
    console.log(`[Verification] Processing ${suppliers.length} suppliers...`);
    
    for (const supplier of suppliers) {
        try {
            await updateSupplierVerification(supplier.id);
            
            const updated = await prisma.supplier.findUnique({
                where: { id: supplier.id },
                select: { tier: true },
            });
            
            switch (updated?.tier) {
                case 'PREMIUM': premium++; break;
                case 'VERIFIED': verified++; break;
                case 'BASIC': basic++; break;
                default: unverified++; break;
            }
        } catch (error) {
            console.error(`[Verification] Error for ${supplier.id}:`, error);
            unverified++;
        }
    }
    
    console.log(`[Verification] Complete: ${premium} premium, ${verified} verified, ${basic} basic, ${unverified} unverified`);
    
    return {
        total: suppliers.length,
        verified,
        premium,
        basic,
        unverified,
    };
}

/**
 * Get verification details for display
 */
export async function getVerificationDetails(supplierId: string): Promise<{
    score: VerificationScore;
    badges: string[];
    trustLevel: string;
    summary: string;
}> {
    const score = await calculateVerificationScore(supplierId);
    
    // Generate badges
    const badges: string[] = [];
    if (score.breakdown.bolScore >= 60) badges.push('Import Verified');
    if (score.breakdown.directoryScore >= 60) badges.push('Directory Listed');
    if (score.breakdown.tradeShowScore >= 60) badges.push('Trade Show Exhibitor');
    if (score.breakdown.certificationScore >= 50) badges.push('Certified');
    if (score.recencyScore >= 70) badges.push('Active');
    
    // Determine trust level
    let trustLevel = 'Low';
    if (score.overallScore >= 80) trustLevel = 'Very High';
    else if (score.overallScore >= 60) trustLevel = 'High';
    else if (score.overallScore >= 40) trustLevel = 'Medium';
    
    // Generate summary
    const summaryParts: string[] = [];
    if (score.shipmentVolume > 0) {
        summaryParts.push(`${score.shipmentVolume} verified shipments to USA`);
    }
    if (score.dataSourceCount > 1) {
        summaryParts.push(`Found in ${score.dataSourceCount} data sources`);
    }
    
    const summary = summaryParts.length > 0 
        ? summaryParts.join('. ') + '.'
        : 'Limited verification data available.';
    
    return { score, badges, trustLevel, summary };
}
