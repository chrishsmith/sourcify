/**
 * AI Sourcing Advisor
 * 
 * Leverages Grok AI to generate strategic sourcing recommendations.
 * Analyzes cost data, tariffs, suppliers, and market conditions
 * to provide actionable advice.
 */

import { getXAIClient } from '@/lib/xai';
import { compareLandedCosts, LandedCostBreakdown } from './landedCost';
import { findMatchingSuppliers, SupplierMatch } from './supplierMatching';
import { syncImportStatsToDatabase } from './usitcDataWeb';
import { prisma } from '@/lib/db';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SourcingRecommendation {
    htsCode: string;
    productDescription?: string;
    
    // Current state
    currentSourcing: {
        country: string;
        estimatedCost: number;
        tariffRate: number;
    } | null;
    
    // Recommended alternatives
    alternatives: SourcingAlternative[];
    
    // AI-generated insights
    aiInsights: {
        summary: string;
        recommendations: string[];
        risks: string[];
        opportunities: string[];
    };
    
    // Metadata
    analysisDate: Date;
    dataConfidence: 'high' | 'medium' | 'low';
}

export interface SourcingAlternative {
    country: string;
    countryCode: string;
    landedCost: number;
    savingsPercent: number | null;
    tariffRate: number;
    hasFTA: boolean;
    ftaName?: string;
    topSuppliers: Array<{
        name: string;
        tier: string;
        matchScore: number;
    }>;
    tradeoffs: string[];
    confidence: number;
}

export interface SourcingAnalysisInput {
    htsCode: string;
    productDescription?: string;
    currentCountry?: string;
    materials?: string[];
    requiredCertifications?: string[];
    annualVolume?: number;
    prioritizeFTA?: boolean;
    excludeCountries?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

const SOURCING_ANALYSIS_PROMPT = `You are a senior supply chain strategist analyzing sourcing options for a US importer.

PRODUCT DETAILS:
- HTS Code: {htsCode}
- Description: {description}
- Materials: {materials}
- Annual Volume: {volume} units

CURRENT SOURCING (if any):
{currentSourcing}

ALTERNATIVE OPTIONS (ranked by landed cost):
{alternatives}

SUPPLIER AVAILABILITY:
{supplierInfo}

MARKET CONTEXT (December 2025):
- Section 301 tariffs apply to China (7.5-100% depending on product)
- IEEPA Fentanyl: China faces 20%, Mexico/Canada may face 25% (status varies)
- IEEPA Reciprocal: China faces 125%+ additional
- ⚠️ CRITICAL: 10% IEEPA baseline applies to NEARLY ALL countries INCLUDING FTA partners!
  - Singapore FTA: Still faces 10% IEEPA despite FTA
  - KORUS FTA (Korea): Still faces 10%+ IEEPA
  - Only USMCA (Mexico/Canada) may be exempt for compliant goods
- Some countries have higher reciprocal rates: Vietnam 46%, Cambodia 49%, Thailand 36%, India 26%
- Lead times from Asia: 3-5 weeks; from Mexico: 1 week

TASK:
Provide a strategic sourcing analysis with:
1. A concise summary (2-3 sentences) of the best sourcing strategy
2. Top 3 specific, actionable recommendations
3. Key risks to consider
4. Opportunities for cost optimization

Consider: total landed cost, tariff exposure, supply chain resilience, quality, lead times, FTA benefits.

OUTPUT JSON ONLY:
{
  "summary": "Brief strategic summary...",
  "recommendations": [
    "Specific recommendation 1...",
    "Specific recommendation 2...",
    "Specific recommendation 3..."
  ],
  "risks": [
    "Risk 1...",
    "Risk 2..."
  ],
  "opportunities": [
    "Opportunity 1...",
    "Opportunity 2..."
  ]
}`;

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate comprehensive sourcing recommendations
 */
export async function generateSourcingRecommendations(
    input: SourcingAnalysisInput
): Promise<SourcingRecommendation> {
    console.log('[Sourcing Advisor] Analyzing:', input.htsCode);
    
    const hts6 = input.htsCode.replace(/\./g, '').substring(0, 6);
    
    // Check if we have data, if not, sync from USITC DataWeb
    const existingData = await prisma.htsCostByCountry.count({
        where: { htsCode: hts6 },
    });
    
    if (existingData === 0) {
        console.log('[Sourcing Advisor] No data found, syncing from USITC DataWeb...');
        try {
            const syncResult = await syncImportStatsToDatabase(hts6, prisma);
            console.log(`[Sourcing Advisor] Synced ${syncResult.synced} countries`);
        } catch (error) {
            console.error('[Sourcing Advisor] Data sync failed:', error);
        }
    }
    
    // Get landed cost comparison
    const costComparison = await compareLandedCosts(input.htsCode, {
        excludeCountries: input.excludeCountries,
        minConfidence: 25,
    });
    
    // Get supplier matches for top countries
    const topCountries = costComparison.countries.slice(0, 8);
    const suppliersByCountry = new Map<string, SupplierMatch[]>();
    
    for (const country of topCountries) {
        const suppliers = await findMatchingSuppliers({
            htsCode: input.htsCode,
            materials: input.materials,
            requiredCertifications: input.requiredCertifications,
            preferredCountries: [country.countryCode],
        }, 5);
        
        suppliersByCountry.set(country.countryCode, suppliers.matches);
    }
    
    // Get current sourcing info
    let currentSourcing: SourcingRecommendation['currentSourcing'] = null;
    if (input.currentCountry) {
        const current = costComparison.countries.find(
            c => c.countryCode === input.currentCountry
        );
        if (current) {
            currentSourcing = {
                country: current.country,
                estimatedCost: current.totalLandedCost,
                tariffRate: current.tariffs.effectiveRate,
            };
        }
    }
    
    // Build alternatives
    const alternatives: SourcingAlternative[] = topCountries.map(country => {
        const suppliers = suppliersByCountry.get(country.countryCode) || [];
        const tradeoffs = generateTradeoffs(country, input.currentCountry);
        
        return {
            country: country.country,
            countryCode: country.countryCode,
            landedCost: country.totalLandedCost,
            savingsPercent: country.savingsPercent,
            tariffRate: country.tariffs.effectiveRate,
            hasFTA: country.tariffs.ftaDiscount > 0,
            ftaName: getFtaName(country.countryCode),
            topSuppliers: suppliers.slice(0, 3).map(s => ({
                name: s.supplierName,
                tier: s.supplier.tier,
                matchScore: s.matchScore,
            })),
            tradeoffs,
            confidence: country.productCostConfidence,
        };
    });
    
    // Generate AI insights
    const aiInsights = await generateAIInsights(
        input,
        currentSourcing,
        alternatives,
        suppliersByCountry
    );
    
    // Determine data confidence
    const avgConfidence = alternatives.reduce((sum, a) => sum + a.confidence, 0) / 
        (alternatives.length || 1);
    const dataConfidence: 'high' | 'medium' | 'low' = 
        avgConfidence >= 60 ? 'high' : avgConfidence >= 35 ? 'medium' : 'low';
    
    return {
        htsCode: input.htsCode,
        productDescription: input.productDescription,
        currentSourcing,
        alternatives,
        aiInsights,
        analysisDate: new Date(),
        dataConfidence,
    };
}

/**
 * Generate AI-powered insights using Grok
 */
async function generateAIInsights(
    input: SourcingAnalysisInput,
    currentSourcing: SourcingRecommendation['currentSourcing'],
    alternatives: SourcingAlternative[],
    suppliersByCountry: Map<string, SupplierMatch[]>
): Promise<SourcingRecommendation['aiInsights']> {
    try {
        const xai = getXAIClient();
        
        // Format current sourcing
        const currentText = currentSourcing
            ? `Currently sourcing from ${currentSourcing.country} at ~$${currentSourcing.estimatedCost.toFixed(2)}/unit (${currentSourcing.tariffRate}% tariff)`
            : 'No current sourcing specified';
        
        // Format alternatives
        const altText = alternatives.slice(0, 5).map((alt, i) => {
            const savingsText = alt.savingsPercent !== null 
                ? ` (${alt.savingsPercent > 0 ? '+' : ''}${alt.savingsPercent}% vs current)` 
                : '';
            const ftaText = alt.hasFTA ? ` [${alt.ftaName}]` : '';
            return `${i + 1}. ${alt.country}${ftaText}: $${alt.landedCost.toFixed(2)}/unit, ${alt.tariffRate}% tariff${savingsText}`;
        }).join('\n');
        
        // Format supplier info
        const supplierText = Array.from(suppliersByCountry.entries())
            .slice(0, 5)
            .map(([country, suppliers]) => {
                const count = suppliers.length;
                const verified = suppliers.filter(s => s.supplier.tier !== 'UNVERIFIED').length;
                return `- ${country}: ${count} suppliers (${verified} verified)`;
            }).join('\n');
        
        // Build prompt
        const prompt = SOURCING_ANALYSIS_PROMPT
            .replace('{htsCode}', input.htsCode)
            .replace('{description}', input.productDescription || 'Not specified')
            .replace('{materials}', input.materials?.join(', ') || 'Not specified')
            .replace('{volume}', input.annualVolume?.toLocaleString() || 'Not specified')
            .replace('{currentSourcing}', currentText)
            .replace('{alternatives}', altText)
            .replace('{supplierInfo}', supplierText);
        
        const completion = await xai.chat.completions.create({
            model: 'grok-3-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert supply chain strategist. Provide concise, actionable sourcing advice. Output valid JSON only.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' },
        });
        
        const responseText = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(responseText);
        
        return {
            summary: parsed.summary || 'Analysis complete.',
            recommendations: parsed.recommendations || [],
            risks: parsed.risks || [],
            opportunities: parsed.opportunities || [],
        };
        
    } catch (error) {
        console.error('[Sourcing Advisor] AI analysis failed:', error);
        
        // Fallback to rule-based insights
        return generateFallbackInsights(currentSourcing, alternatives);
    }
}

/**
 * Generate fallback insights without AI
 */
function generateFallbackInsights(
    currentSourcing: SourcingRecommendation['currentSourcing'],
    alternatives: SourcingAlternative[]
): SourcingRecommendation['aiInsights'] {
    const recommendations: string[] = [];
    const risks: string[] = [];
    const opportunities: string[] = [];
    
    // Find best options
    const cheapest = alternatives[0];
    const ftaOptions = alternatives.filter(a => a.hasFTA);
    const verifiedOptions = alternatives.filter(a => 
        a.topSuppliers.some(s => s.tier === 'VERIFIED' || s.tier === 'PREMIUM')
    );
    
    // Generate recommendations
    if (cheapest) {
        recommendations.push(
            `Consider ${cheapest.country} for lowest landed cost at $${cheapest.landedCost.toFixed(2)}/unit`
        );
    }
    
    if (ftaOptions.length > 0 && ftaOptions[0].countryCode !== cheapest?.countryCode) {
        recommendations.push(
            `${ftaOptions[0].country} offers duty-free access via ${ftaOptions[0].ftaName}, reducing tariff risk`
        );
    }
    
    if (currentSourcing && cheapest && cheapest.savingsPercent && cheapest.savingsPercent > 10) {
        recommendations.push(
            `Switching from ${currentSourcing.country} to ${cheapest.country} could save ~${cheapest.savingsPercent}%`
        );
    }
    
    // Generate risks
    if (alternatives.some(a => a.countryCode === 'CN')) {
        risks.push('China sourcing subject to Section 301 tariffs and potential future increases');
    }
    
    if (alternatives.every(a => a.confidence < 50)) {
        risks.push('Limited historical trade data - cost estimates may vary');
    }
    
    risks.push('Currency fluctuations can impact actual landed costs');
    
    // Generate opportunities
    if (ftaOptions.length > 0) {
        opportunities.push(
            `Leverage FTA agreements (${ftaOptions.map(f => f.ftaName).filter(Boolean).join(', ')}) for duty elimination`
        );
    }
    
    if (verifiedOptions.length > 0) {
        opportunities.push(
            `${verifiedOptions.length} countries have verified suppliers ready to quote`
        );
    }
    
    // Generate summary
    let summary = `Analysis identified ${alternatives.length} sourcing options. `;
    if (cheapest) {
        summary += `${cheapest.country} offers the lowest landed cost. `;
    }
    if (ftaOptions.length > 0) {
        summary += `${ftaOptions.length} FTA countries provide tariff-free options.`;
    }
    
    return {
        summary,
        recommendations,
        risks,
        opportunities,
    };
}

/**
 * Generate tradeoff descriptions for a country
 */
function generateTradeoffs(
    country: LandedCostBreakdown,
    currentCountry?: string
): string[] {
    const tradeoffs: string[] = [];
    
    // Transit time
    if (country.transitDays > 30) {
        tradeoffs.push(`Longer lead time (${country.transitDays} days)`);
    } else if (country.transitDays < 14) {
        tradeoffs.push(`Fast delivery (${country.transitDays} days)`);
    }
    
    // Tariff exposure
    if (country.tariffs.effectiveRate > 25) {
        tradeoffs.push(`High tariff exposure (${country.tariffs.effectiveRate}%)`);
    } else if (country.tariffs.section301 > 0) {
        tradeoffs.push('Subject to Section 301 tariffs');
    }
    
    // FTA benefit
    if (country.tariffs.ftaDiscount > 0) {
        tradeoffs.push('FTA eliminates base duties');
    }
    
    // Data quality
    if (country.dataQuality === 'low') {
        tradeoffs.push('Limited pricing data');
    }
    
    return tradeoffs;
}

/**
 * Get FTA name for a country
 */
function getFtaName(countryCode: string): string | undefined {
    const ftaNames: Record<string, string> = {
        'CA': 'USMCA',
        'MX': 'USMCA',
        'KR': 'KORUS FTA',
        'AU': 'Australia FTA',
        'SG': 'Singapore FTA',
        'CL': 'Chile FTA',
        'CO': 'Colombia TPA',
        'PE': 'Peru TPA',
        'PA': 'Panama TPA',
        'IL': 'Israel FTA',
        'JO': 'Jordan FTA',
        'MA': 'Morocco FTA',
    };
    return ftaNames[countryCode];
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUICK ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get quick sourcing suggestion for a product
 */
export async function getQuickSourcingSuggestion(
    htsCode: string,
    currentCountry?: string
): Promise<{
    bestOption: string;
    savings: string;
    reason: string;
}> {
    const comparison = await compareLandedCosts(htsCode, { minConfidence: 30 });
    
    if (comparison.countries.length === 0) {
        return {
            bestOption: 'Insufficient data',
            savings: 'N/A',
            reason: 'No cost data available for this HTS code',
        };
    }
    
    const best = comparison.countries[0];
    const current = currentCountry
        ? comparison.countries.find(c => c.countryCode === currentCountry)
        : null;
    
    const savings = current && best.countryCode !== currentCountry
        ? `${Math.round((1 - best.totalLandedCost / current.totalLandedCost) * 100)}%`
        : 'N/A';
    
    let reason = `Lowest landed cost at $${best.totalLandedCost.toFixed(2)}/unit`;
    if (best.tariffs.ftaDiscount > 0) {
        reason += ` with ${getFtaName(best.countryCode)} duty-free access`;
    }
    
    return {
        bestOption: best.country,
        savings,
        reason,
    };
}





