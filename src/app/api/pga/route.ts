/**
 * PGA (Partner Government Agency) Requirements API
 * 
 * GET /api/pga
 * Query params:
 *   - htsCode: HTS code to look up (required for lookup mode)
 *   - search: Search term for flags/agencies
 *   - flagCode: Specific flag code to get details
 *   - agencyCode: Get all flags for an agency
 * 
 * Returns PGA requirements, flags, and agency information
 */

import { NextResponse } from 'next/server';
import {
    getPGARequirements,
    getAllAgencies,
    getAllPGAFlags,
    getPGAFlagByCode,
    getFlagsByAgency,
    searchPGAFlags,
    getChaptersWithPGA,
    PGA_AGENCIES,
    type PGAAgency,
    type PGAFlag,
} from '@/data/pgaFlags';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const htsCode = searchParams.get('htsCode');
        const search = searchParams.get('search');
        const flagCode = searchParams.get('flagCode');
        const agencyCode = searchParams.get('agencyCode');

        // If requesting a specific flag
        if (flagCode) {
            const flag = getPGAFlagByCode(flagCode);
            if (!flag) {
                return NextResponse.json(
                    { success: false, error: `PGA flag ${flagCode} not found` },
                    { status: 404 }
                );
            }
            const agency = PGA_AGENCIES[flag.agency];
            return NextResponse.json({
                success: true,
                data: {
                    flag,
                    agency,
                },
            });
        }

        // If requesting flags for an agency
        if (agencyCode) {
            const agency = PGA_AGENCIES[agencyCode.toUpperCase()];
            if (!agency) {
                return NextResponse.json(
                    { success: false, error: `Agency ${agencyCode} not found` },
                    { status: 404 }
                );
            }
            const flags = getFlagsByAgency(agencyCode);
            return NextResponse.json({
                success: true,
                data: {
                    agency,
                    flags,
                },
            });
        }

        // If searching for flags
        if (search) {
            const flags = searchPGAFlags(search);
            const agencyCodes = [...new Set(flags.map(f => f.agency))];
            const agencies = agencyCodes
                .map(code => PGA_AGENCIES[code])
                .filter((a): a is PGAAgency => a !== undefined);

            return NextResponse.json({
                success: true,
                data: {
                    flags,
                    agencies,
                    count: flags.length,
                },
                query: { search },
            });
        }

        // If looking up by HTS code
        if (htsCode) {
            const cleanCode = htsCode.replace(/\./g, '');
            
            if (cleanCode.length < 2) {
                return NextResponse.json(
                    { success: false, error: 'HTS code must be at least 2 digits' },
                    { status: 400 }
                );
            }

            const result = getPGARequirements(cleanCode);
            
            if (!result) {
                return NextResponse.json({
                    success: true,
                    data: {
                        htsCode: cleanCode,
                        chapter: cleanCode.slice(0, 2),
                        agencies: [],
                        flags: [],
                        flagsByAgency: [],
                        summary: {
                            totalFlags: 0,
                            totalAgencies: 0,
                            requiresLicense: false,
                            requiresFiling: false,
                            licenseFlags: 0,
                            filingFlags: 0,
                        },
                        requirementLevel: 'none',
                        message: 'No PGA requirements found for this HTS code',
                    },
                    query: { htsCode },
                });
            }

            // Determine requirement level
            let requirementLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
            if (result.flags.length > 0) {
                const hasLicense = result.flags.some(f => f.requirements?.some(r => 
                    r.toLowerCase().includes('license') || 
                    r.toLowerCase().includes('permit') ||
                    r.toLowerCase().includes('registration')
                ));
                const flagCount = result.flags.length;
                
                if (hasLicense && flagCount >= 3) {
                    requirementLevel = 'high';
                } else if (hasLicense || flagCount >= 2) {
                    requirementLevel = 'medium';
                } else {
                    requirementLevel = 'low';
                }
            }

            // Group flags by agency for easier display
            const flagsByAgency: Record<string, { agency: PGAAgency; flags: PGAFlag[] }> = {};
            for (const flag of result.flags) {
                const agency = PGA_AGENCIES[flag.agency];
                if (agency) {
                    if (!flagsByAgency[flag.agency]) {
                        flagsByAgency[flag.agency] = { agency, flags: [] };
                    }
                    flagsByAgency[flag.agency].flags.push(flag);
                }
            }

            // Summary information
            const hasLicense = result.flags.some(f => f.requirements?.some(r => 
                r.toLowerCase().includes('license') || 
                r.toLowerCase().includes('permit') ||
                r.toLowerCase().includes('registration')
            ));
            const hasFiling = result.flags.some(f => f.requirements?.some(r => 
                r.toLowerCase().includes('file') || 
                r.toLowerCase().includes('notice') ||
                r.toLowerCase().includes('declaration')
            ));
            
            const summary = {
                totalFlags: result.flags.length,
                totalAgencies: result.agencies.length,
                requiresLicense: hasLicense,
                requiresFiling: hasFiling,
                licenseFlags: result.flags.filter(f => f.requirements?.some(r => 
                    r.toLowerCase().includes('license') || 
                    r.toLowerCase().includes('permit') ||
                    r.toLowerCase().includes('registration')
                )).length,
                filingFlags: result.flags.filter(f => f.requirements?.some(r => 
                    r.toLowerCase().includes('file') || 
                    r.toLowerCase().includes('notice') ||
                    r.toLowerCase().includes('declaration')
                )).length,
            };

            return NextResponse.json({
                success: true,
                data: {
                    htsCode: cleanCode,
                    chapter: result.chapter,
                    chapterName: result.chapterName,
                    agencies: result.agencies,
                    flags: result.flags,
                    flagsByAgency: Object.values(flagsByAgency),
                    summary,
                    requirementLevel,
                    notes: result.notes,
                    message: `Found ${result.flags.length} PGA requirement(s) from ${result.agencies.length} agency(ies)`,
                },
                query: { htsCode },
            });
        }

        // Default: return all agencies, chapters info, and summary
        const agencies = getAllAgencies();
        const allFlags = getAllPGAFlags();
        const chapters = getChaptersWithPGA();

        // Create agency summary
        const agencySummary = agencies.map(agency => ({
            code: agency.code,
            name: agency.name,
            flagCount: getFlagsByAgency(agency.code.split('/')[0]).length,
        }));

        return NextResponse.json({
            success: true,
            data: {
                agencies,
                agencySummary,
                chapters,
                totalAgencies: agencies.length,
                totalFlags: allFlags.length,
            },
            resources: {
                acePGA: 'https://www.cbp.gov/trade/ace/features-and-benefits',
                pgaInfo: 'https://www.cbp.gov/trade/partner-government-agencies',
            },
        });
    } catch (error) {
        console.error('PGA API error:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: error instanceof Error ? error.message : 'Unknown error occurred' 
            },
            { status: 500 }
        );
    }
}
