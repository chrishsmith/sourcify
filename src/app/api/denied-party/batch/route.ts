/**
 * Batch Denied Party Screening API
 * 
 * POST /api/denied-party/batch - Screen multiple parties at once
 * 
 * Accepts a list of party names and screens them against all denied party lists.
 * Creates an audit log entry and returns results with match details.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UsageFeature } from '@prisma/client';

interface PartyToScreen {
    rowNumber: number;
    name: string;
    country?: string;
}

interface ScreeningMatch {
    id: string;
    name: string;
    aliases: string[];
    entityType: string;
    countryCode: string | null;
    countryName: string | null;
    sourceList: string;
    sourceId: string | null;
    sourcePrograms: string[];
    remarks: string | null;
    matchScore: number; // 0-100 based on match quality
    matchType: 'exact' | 'partial' | 'alias';
}

interface ScreeningResult {
    rowNumber: number;
    inputName: string;
    inputCountry?: string;
    status: 'clear' | 'match' | 'potential_match';
    matchCount: number;
    matches: ScreeningMatch[];
}

interface BatchScreeningResponse {
    success: boolean;
    data?: {
        totalScreened: number;
        matchesFound: number;
        clearCount: number;
        potentialMatchCount: number;
        results: ScreeningResult[];
        auditLogId: string;
        screeningDate: string;
        listsSearched: string[];
    };
    error?: string;
}

/**
 * Calculate match score based on how the name was found
 */
function calculateMatchScore(inputName: string, foundName: string, matchType: 'exact' | 'partial' | 'alias'): number {
    const normalizedInput = inputName.toLowerCase().trim();
    const normalizedFound = foundName.toLowerCase().trim();
    
    if (normalizedInput === normalizedFound) {
        return 100; // Exact match
    }
    
    if (matchType === 'alias') {
        return 85; // Alias match
    }
    
    // Calculate partial match score based on similarity
    const words1 = normalizedInput.split(/\s+/);
    const words2 = normalizedFound.split(/\s+/);
    const commonWords = words1.filter(w => words2.includes(w));
    const score = (commonWords.length / Math.max(words1.length, words2.length)) * 100;
    
    return Math.round(Math.min(score + 10, 80)); // Cap partial at 80
}

/**
 * Screen a single party name against all lists
 */
async function screenParty(party: PartyToScreen): Promise<ScreeningResult> {
    const normalizedName = party.name.trim();
    
    if (!normalizedName) {
        return {
            rowNumber: party.rowNumber,
            inputName: party.name,
            inputCountry: party.country,
            status: 'clear',
            matchCount: 0,
            matches: [],
        };
    }
    
    // Build query for name and alias search
    const whereConditions: {
        isActive: boolean;
        OR: { name?: { contains: string; mode: 'insensitive' }; aliases?: { hasSome: string[] } }[];
        countryCode?: string;
    } = {
        isActive: true,
        OR: [
            { name: { contains: normalizedName, mode: 'insensitive' } },
            { aliases: { hasSome: [normalizedName] } },
        ],
    };
    
    // Add country filter if provided
    if (party.country) {
        whereConditions.countryCode = party.country.toUpperCase();
    }
    
    const matches = await prisma.deniedParty.findMany({
        where: whereConditions,
        take: 10, // Limit matches per party
    });
    
    // Transform matches and calculate scores
    const screeningMatches: ScreeningMatch[] = matches.map(match => {
        // Determine match type
        let matchType: 'exact' | 'partial' | 'alias' = 'partial';
        if (match.name.toLowerCase() === normalizedName.toLowerCase()) {
            matchType = 'exact';
        } else if (match.aliases.some(alias => 
            alias.toLowerCase().includes(normalizedName.toLowerCase()) ||
            normalizedName.toLowerCase().includes(alias.toLowerCase())
        )) {
            matchType = 'alias';
        }
        
        const matchScore = calculateMatchScore(normalizedName, match.name, matchType);
        
        return {
            id: match.id,
            name: match.name,
            aliases: match.aliases,
            entityType: match.entityType,
            countryCode: match.countryCode,
            countryName: match.countryName,
            sourceList: match.sourceList,
            sourceId: match.sourceId,
            sourcePrograms: match.sourcePrograms,
            remarks: match.remarks,
            matchScore,
            matchType,
        };
    });
    
    // Sort by match score descending
    screeningMatches.sort((a, b) => b.matchScore - a.matchScore);
    
    // Determine status based on match quality
    let status: 'clear' | 'match' | 'potential_match' = 'clear';
    if (screeningMatches.length > 0) {
        const topScore = screeningMatches[0].matchScore;
        if (topScore >= 90) {
            status = 'match';
        } else if (topScore >= 60) {
            status = 'potential_match';
        }
    }
    
    return {
        rowNumber: party.rowNumber,
        inputName: party.name,
        inputCountry: party.country,
        status,
        matchCount: screeningMatches.length,
        matches: screeningMatches,
    };
}

/**
 * POST /api/denied-party/batch
 * Screen multiple parties at once
 * 
 * Body: {
 *   parties: Array<{ rowNumber: number, name: string, country?: string }>
 *   userId?: string (for audit log)
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse<BatchScreeningResponse>> {
    try {
        const body = await request.json();
        const { parties, userId } = body as {
            parties: PartyToScreen[];
            userId?: string;
        };
        
        if (!parties || !Array.isArray(parties) || parties.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No parties provided for screening' },
                { status: 400 }
            );
        }
        
        if (parties.length > 1000) {
            return NextResponse.json(
                { success: false, error: 'Maximum 1000 parties can be screened at once' },
                { status: 400 }
            );
        }
        
        // Screen all parties
        const results: ScreeningResult[] = [];
        for (const party of parties) {
            const result = await screenParty(party);
            results.push(result);
        }
        
        // Calculate summary stats
        const totalScreened = results.length;
        const matchesFound = results.filter(r => r.status === 'match').length;
        const potentialMatchCount = results.filter(r => r.status === 'potential_match').length;
        const clearCount = results.filter(r => r.status === 'clear').length;
        
        // Get lists searched
        const listsSearched = await prisma.deniedParty.groupBy({
            by: ['sourceList'],
            where: { isActive: true },
        });
        
        // Create audit log entry
        const auditLog = await prisma.usageLog.create({
            data: {
                userId: userId || 'anonymous',
                feature: UsageFeature.batch_screening,
                metadata: {
                    totalScreened,
                    matchesFound,
                    potentialMatchCount,
                    clearCount,
                    partyNames: parties.slice(0, 10).map(p => p.name), // Sample of first 10
                    listsSearched: listsSearched.map(l => l.sourceList),
                },
                success: true,
            },
        });
        
        return NextResponse.json({
            success: true,
            data: {
                totalScreened,
                matchesFound,
                clearCount,
                potentialMatchCount,
                results,
                auditLogId: auditLog.id,
                screeningDate: new Date().toISOString(),
                listsSearched: listsSearched.map(l => l.sourceList),
            },
        });
    } catch (error) {
        console.error('[API] Batch screening error:', error);
        
        // Try to create failed audit log
        try {
            await prisma.usageLog.create({
                data: {
                    userId: 'anonymous',
                    feature: UsageFeature.batch_screening,
                    metadata: { error: String(error) },
                    success: false,
                    errorCode: 'BATCH_SCREENING_FAILED',
                },
            });
        } catch {
            // Ignore audit log errors
        }
        
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Failed to process batch screening' 
            },
            { status: 500 }
        );
    }
}
