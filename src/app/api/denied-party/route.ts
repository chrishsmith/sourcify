/**
 * Denied Party API
 * 
 * GET /api/denied-party - List/search denied parties from all lists
 * 
 * Supported lists:
 * - ofac_sdn: OFAC Specially Designated Nationals
 * - bis_entity_list: BIS Entity List
 * - bis_denied: BIS Denied Persons List
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { DeniedPartyList, DeniedPartyType } from '@prisma/client';

/**
 * GET /api/denied-party
 * List or search denied parties across all lists
 * 
 * Query params:
 * - q: Search query (searches name and aliases)
 * - sourceList: Filter by source list (ofac_sdn, bis_entity_list, bis_denied)
 * - countryCode: Filter by country (ISO 2-letter code)
 * - entityType: Filter by entity type (individual, entity, vessel, aircraft)
 * - page: Page number (default 1)
 * - pageSize: Items per page (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const query = searchParams.get('q');
    const sourceList = searchParams.get('sourceList') as DeniedPartyList | null;
    const countryCode = searchParams.get('countryCode');
    const entityType = searchParams.get('entityType') as DeniedPartyType | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50')));

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      isActive: true,
    };

    if (sourceList) {
      where.sourceList = sourceList;
    }

    if (countryCode) {
      where.countryCode = countryCode;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    // If there's a search query, add name/alias search
    if (query && query.trim().length > 0) {
      where.OR = [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { aliases: { has: query.trim() } },
      ];
    }

    // Get total count
    const total = await prisma.deniedParty.count({ where });

    // Get paginated results
    const items = await prisma.deniedParty.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [
        { sourceList: 'asc' },
        { name: 'asc' },
      ],
    });

    // Get last sync info for each list
    const lastSyncs = await prisma.deniedPartySyncLog.findMany({
      where: {
        status: 'completed',
      },
      orderBy: {
        createdAt: 'desc',
      },
      distinct: ['sourceList'],
      take: 10,
    });

    const lastSyncByList = lastSyncs.reduce((acc, sync) => {
      acc[sync.sourceList] = sync.completedAt;
      return acc;
    }, {} as Record<string, Date | null>);

    // Get counts by source list
    const countsByList = await prisma.deniedParty.groupBy({
      by: ['sourceList'],
      where: { isActive: true },
      _count: { id: true },
    });

    const listCounts = countsByList.reduce((acc, item) => {
      acc[item.sourceList] = item._count.id;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map(party => ({
          id: party.id,
          name: party.name,
          aliases: party.aliases,
          entityType: party.entityType,
          countryCode: party.countryCode,
          countryName: party.countryName,
          addresses: party.addresses,
          sourceList: party.sourceList,
          sourceId: party.sourceId,
          sourcePrograms: party.sourcePrograms,
          remarks: party.remarks,
          federalRegister: party.federalRegister,
          isActive: party.isActive,
          listedDate: party.listedDate,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        query: query || undefined,
        filters: {
          sourceList: sourceList || undefined,
          countryCode: countryCode || undefined,
          entityType: entityType || undefined,
        },
        meta: {
          lastSyncByList,
          countsByList: listCounts,
          availableLists: ['ofac_sdn', 'bis_entity_list', 'bis_denied'],
        },
      },
    });
  } catch (error) {
    console.error('[API] Denied party list error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch denied parties' 
      },
      { status: 500 }
    );
  }
}
