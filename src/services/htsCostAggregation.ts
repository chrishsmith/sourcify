/**
 * HTS Cost Aggregation Engine
 * 
 * THE CORE ENGINE for deriving manufacturing costs from actual import data.
 * Aggregates shipment records into HTS cost by country data.
 */

import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface CostAggregationResult {
    htsCode: string;
    countryCode: string;
    countryName: string;
    avgUnitValue: number;
    medianUnitValue: number;
    minUnitValue: number;
    maxUnitValue: number;
    stdDeviation: number;
    shipmentCount: number;
    totalQuantity: number;
    totalValue: number;
    confidenceScore: number;
    oldestShipment: Date | null;
    newestShipment: Date | null;
}

export interface AggregationStats {
    htsCodesProcessed: number;
    countriesProcessed: number;
    totalRecordsCreated: number;
    totalRecordsUpdated: number;
    durationMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICAL FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate median of an array
 */
function calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
    if (values.length < 2) return 0;
    
    const squareDiffs = values.map(value => {
        const diff = value - mean;
        return diff * diff;
    });
    
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquareDiff);
}

/**
 * Remove outliers using IQR method
 */
function removeOutliers(values: number[]): number[] {
    if (values.length < 4) return values;
    
    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(v => v >= lowerBound && v <= upperBound);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate confidence score based on data quality
 */
function calculateConfidenceScore(
    shipmentCount: number,
    totalQuantity: number,
    newestShipment: Date | null,
    stdDeviation: number,
    avgValue: number
): number {
    let score = 0;
    
    // Volume factor (up to 40 points)
    // 1 shipment = 5, 10 = 20, 50 = 30, 100+ = 40
    score += Math.min(40, shipmentCount * 2);
    
    // Quantity factor (up to 20 points)
    // More total units = more reliable average
    if (totalQuantity >= 10000) score += 20;
    else if (totalQuantity >= 1000) score += 15;
    else if (totalQuantity >= 100) score += 10;
    else score += 5;
    
    // Recency factor (up to 25 points)
    if (newestShipment) {
        const daysSince = (Date.now() - newestShipment.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 90) score += 25;
        else if (daysSince < 180) score += 20;
        else if (daysSince < 365) score += 10;
        else score += 5;
    }
    
    // Consistency factor (up to 15 points)
    // Low coefficient of variation = more consistent pricing
    if (avgValue > 0) {
        const cv = stdDeviation / avgValue; // Coefficient of variation
        if (cv < 0.2) score += 15;         // Very consistent
        else if (cv < 0.4) score += 10;    // Reasonably consistent
        else if (cv < 0.6) score += 5;     // Some variation
        // High variation = 0 bonus
    }
    
    return Math.min(100, score);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN AGGREGATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Aggregate costs for a specific HTS code across all countries
 */
export async function aggregateHtsCosts(
    htsCode: string
): Promise<CostAggregationResult[]> {
    // Normalize HTS code to 6 digits (subheading level)
    const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
    
    // Get all shipments for this HTS code
    const shipments = await prisma.shipmentRecord.findMany({
        where: {
            htsCode: { startsWith: hts6 },
            unitValue: { not: null, gt: 0 },
        },
        select: {
            shipperCountry: true,
            unitValue: true,
            quantity: true,
            declaredValue: true,
            arrivalDate: true,
        },
    });
    
    if (shipments.length === 0) {
        return [];
    }
    
    // Group by country
    const byCountry = new Map<string, typeof shipments>();
    for (const shipment of shipments) {
        const country = shipment.shipperCountry;
        if (!byCountry.has(country)) {
            byCountry.set(country, []);
        }
        byCountry.get(country)!.push(shipment);
    }
    
    const results: CostAggregationResult[] = [];
    
    for (const [countryCode, countryShipments] of byCountry) {
        // Extract unit values
        const unitValues = countryShipments
            .map(s => s.unitValue)
            .filter((v): v is number => v !== null && v > 0);
        
        if (unitValues.length === 0) continue;
        
        // Remove outliers
        const cleanedValues = removeOutliers(unitValues);
        
        // Calculate statistics
        const sum = cleanedValues.reduce((a, b) => a + b, 0);
        const avg = sum / cleanedValues.length;
        const median = calculateMedian(cleanedValues);
        const stdDev = calculateStdDev(cleanedValues, avg);
        
        // Get min/max
        const min = Math.min(...cleanedValues);
        const max = Math.max(...cleanedValues);
        
        // Get totals
        const totalQuantity = countryShipments
            .reduce((sum, s) => sum + (s.quantity || 0), 0);
        const totalValue = countryShipments
            .reduce((sum, s) => sum + (s.declaredValue || 0), 0);
        
        // Get date range
        const dates = countryShipments
            .map(s => s.arrivalDate)
            .filter((d): d is Date => d !== null)
            .sort((a, b) => a.getTime() - b.getTime());
        
        const oldestShipment = dates[0] || null;
        const newestShipment = dates[dates.length - 1] || null;
        
        // Calculate confidence
        const confidence = calculateConfidenceScore(
            countryShipments.length,
            totalQuantity,
            newestShipment,
            stdDev,
            avg
        );
        
        results.push({
            htsCode: hts6,
            countryCode,
            countryName: getCountryName(countryCode),
            avgUnitValue: Math.round(avg * 100) / 100,
            medianUnitValue: Math.round(median * 100) / 100,
            minUnitValue: Math.round(min * 100) / 100,
            maxUnitValue: Math.round(max * 100) / 100,
            stdDeviation: Math.round(stdDev * 100) / 100,
            shipmentCount: countryShipments.length,
            totalQuantity,
            totalValue,
            confidenceScore: confidence,
            oldestShipment,
            newestShipment,
        });
    }
    
    // Sort by confidence descending
    results.sort((a, b) => b.confidenceScore - a.confidenceScore);
    
    return results;
}

/**
 * Save aggregated costs to database
 */
export async function saveAggregatedCosts(
    results: CostAggregationResult[]
): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;
    
    for (const result of results) {
        const existing = await prisma.htsCostByCountry.findUnique({
            where: {
                htsCode_countryCode: {
                    htsCode: result.htsCode,
                    countryCode: result.countryCode,
                },
            },
        });
        
        if (existing) {
            await prisma.htsCostByCountry.update({
                where: { id: existing.id },
                data: {
                    avgUnitValue: result.avgUnitValue,
                    medianUnitValue: result.medianUnitValue,
                    minUnitValue: result.minUnitValue,
                    maxUnitValue: result.maxUnitValue,
                    stdDeviation: result.stdDeviation,
                    shipmentCount: result.shipmentCount,
                    totalQuantity: result.totalQuantity,
                    totalValue: result.totalValue,
                    confidenceScore: result.confidenceScore,
                    oldestShipment: result.oldestShipment,
                    newestShipment: result.newestShipment,
                    lastCalculated: new Date(),
                },
            });
            updated++;
        } else {
            await prisma.htsCostByCountry.create({
                data: {
                    htsCode: result.htsCode,
                    countryCode: result.countryCode,
                    countryName: result.countryName,
                    avgUnitValue: result.avgUnitValue,
                    medianUnitValue: result.medianUnitValue,
                    minUnitValue: result.minUnitValue,
                    maxUnitValue: result.maxUnitValue,
                    stdDeviation: result.stdDeviation,
                    shipmentCount: result.shipmentCount,
                    totalQuantity: result.totalQuantity,
                    totalValue: result.totalValue,
                    confidenceScore: result.confidenceScore,
                    oldestShipment: result.oldestShipment,
                    newestShipment: result.newestShipment,
                },
            });
            created++;
        }
    }
    
    return { created, updated };
}

/**
 * Aggregate costs for all HTS codes in the database
 */
export async function aggregateAllHtsCosts(): Promise<AggregationStats> {
    const startTime = Date.now();
    
    console.log('[Cost Aggregation] Starting full aggregation...');
    
    // Get distinct HTS codes (6-digit level)
    const htsCodes = await prisma.shipmentRecord.findMany({
        distinct: ['htsCode'],
        select: { htsCode: true },
    });
    
    // Get unique 6-digit codes
    const uniqueHts6 = [...new Set(
        htsCodes.map(h => h.htsCode.substring(0, 6))
    )];
    
    console.log(`[Cost Aggregation] Processing ${uniqueHts6.length} HTS codes...`);
    
    let totalCreated = 0;
    let totalUpdated = 0;
    const countries = new Set<string>();
    
    for (const hts of uniqueHts6) {
        const results = await aggregateHtsCosts(hts);
        
        for (const r of results) {
            countries.add(r.countryCode);
        }
        
        if (results.length > 0) {
            const { created, updated } = await saveAggregatedCosts(results);
            totalCreated += created;
            totalUpdated += updated;
        }
    }
    
    const stats: AggregationStats = {
        htsCodesProcessed: uniqueHts6.length,
        countriesProcessed: countries.size,
        totalRecordsCreated: totalCreated,
        totalRecordsUpdated: totalUpdated,
        durationMs: Date.now() - startTime,
    };
    
    console.log(`[Cost Aggregation] Complete:`, stats);
    
    return stats;
}

/**
 * Get cost data for a specific HTS code
 */
export async function getHtsCostData(
    htsCode: string
): Promise<{
    htsCode: string;
    countries: Array<{
        countryCode: string;
        countryName: string;
        avgUnitValue: number;
        confidenceScore: number;
        shipmentCount: number;
        effectiveTariff: number | null;
        landedCostEstimate: number | null;
    }>;
}> {
    const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
    
    const costs = await prisma.htsCostByCountry.findMany({
        where: {
            htsCode: { startsWith: hts6 },
        },
        orderBy: { confidenceScore: 'desc' },
    });
    
    return {
        htsCode: hts6,
        countries: costs.map(c => ({
            countryCode: c.countryCode,
            countryName: c.countryName,
            avgUnitValue: c.avgUnitValue,
            confidenceScore: c.confidenceScore,
            shipmentCount: c.shipmentCount,
            effectiveTariff: c.effectiveTariff,
            landedCostEstimate: c.effectiveTariff !== null 
                ? c.avgUnitValue * (1 + c.effectiveTariff / 100)
                : null,
        })),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function getCountryName(code: string): string {
    const names: Record<string, string> = {
        'CN': 'China', 'VN': 'Vietnam', 'IN': 'India', 'MX': 'Mexico',
        'TH': 'Thailand', 'ID': 'Indonesia', 'BD': 'Bangladesh', 'TR': 'Turkey',
        'TW': 'Taiwan', 'KR': 'South Korea', 'JP': 'Japan', 'DE': 'Germany',
        'IT': 'Italy', 'PL': 'Poland', 'GB': 'United Kingdom', 'MY': 'Malaysia',
        'PH': 'Philippines', 'PK': 'Pakistan', 'KH': 'Cambodia', 'EG': 'Egypt',
        'BR': 'Brazil', 'CA': 'Canada', 'FR': 'France', 'ES': 'Spain',
    };
    return names[code] || code;
}


