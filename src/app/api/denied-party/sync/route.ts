/**
 * Denied Party List Sync API
 * 
 * Supports multiple restricted party lists:
 * - OFAC SDN (Specially Designated Nationals)
 * - BIS Entity List (Bureau of Industry and Security)
 * - BIS Denied Persons List
 * 
 * POST /api/denied-party/sync - Trigger a sync (specify list via query param or body)
 * GET /api/denied-party/sync - Get sync status and history
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  syncOFACSDNList, 
  getLastSyncInfo as getOFACLastSyncInfo, 
  getSyncHistory as getOFACSyncHistory 
} from '@/services/compliance/ofac-service';
import {
  syncBISEntityList,
  syncBISDeniedPersons,
  syncAllBISLists,
  getLastBISSyncInfo,
  getBISSyncHistory,
} from '@/services/compliance/bis-service';
import { DeniedPartyList } from '@prisma/client';

type SupportedList = 'ofac_sdn' | 'bis_entity_list' | 'bis_denied' | 'all';

/**
 * Format sync log for API response
 */
function formatSyncLog(log: {
  id: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  totalRecords: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: unknown;
  durationMs: number | null;
  fileChecksum: string | null;
  lastModified: Date | null;
  sourceList?: DeniedPartyList;
}) {
  return {
    id: log.id,
    status: log.status,
    sourceList: log.sourceList,
    startedAt: log.startedAt,
    completedAt: log.completedAt,
    totalRecords: log.totalRecords,
    recordsCreated: log.recordsCreated,
    recordsUpdated: log.recordsUpdated,
    recordsDeleted: log.recordsDeleted,
    errors: log.errors,
    durationMs: log.durationMs,
    fileChecksum: log.fileChecksum,
    lastModified: log.lastModified,
  };
}

/**
 * GET /api/denied-party/sync
 * Get the current sync status and history for all or specific lists
 * 
 * Query params:
 * - list: Filter by list (ofac_sdn, bis_entity_list, bis_denied) - default: all
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const listFilter = searchParams.get('list') as SupportedList | null;

    // Gather info for requested lists
    const listData: Record<string, {
      lastSync: unknown;
      totalEntries: number;
      syncHistory: unknown[];
    }> = {};

    // OFAC SDN
    if (!listFilter || listFilter === 'all' || listFilter === 'ofac_sdn') {
      const [ofacInfo, ofacHistory] = await Promise.all([
        getOFACLastSyncInfo(),
        getOFACSyncHistory(5),
      ]);
      listData.ofac_sdn = {
        lastSync: ofacInfo.lastSync ? formatSyncLog({ ...ofacInfo.lastSync, sourceList: 'ofac_sdn' }) : null,
        totalEntries: ofacInfo.totalEntries,
        syncHistory: ofacHistory.map(log => formatSyncLog({ ...log, sourceList: 'ofac_sdn' })),
      };
    }

    // BIS Entity List
    if (!listFilter || listFilter === 'all' || listFilter === 'bis_entity_list') {
      const [bisElInfo, bisElHistory] = await Promise.all([
        getLastBISSyncInfo('bis_entity_list'),
        getBISSyncHistory('bis_entity_list', 5),
      ]);
      listData.bis_entity_list = {
        lastSync: bisElInfo.lastSync ? formatSyncLog({ ...bisElInfo.lastSync, sourceList: 'bis_entity_list' }) : null,
        totalEntries: bisElInfo.totalEntries,
        syncHistory: bisElHistory.map(log => formatSyncLog({ ...log, sourceList: 'bis_entity_list' })),
      };
    }

    // BIS Denied Persons
    if (!listFilter || listFilter === 'all' || listFilter === 'bis_denied') {
      const [bisDpInfo, bisDpHistory] = await Promise.all([
        getLastBISSyncInfo('bis_denied'),
        getBISSyncHistory('bis_denied', 5),
      ]);
      listData.bis_denied = {
        lastSync: bisDpInfo.lastSync ? formatSyncLog({ ...bisDpInfo.lastSync, sourceList: 'bis_denied' }) : null,
        totalEntries: bisDpInfo.totalEntries,
        syncHistory: bisDpHistory.map(log => formatSyncLog({ ...log, sourceList: 'bis_denied' })),
      };
    }

    // Calculate totals
    const totalActiveEntries = Object.values(listData).reduce((sum, data) => sum + data.totalEntries, 0);

    return NextResponse.json({
      success: true,
      data: {
        lists: listData,
        totalActiveEntries,
        availableLists: ['ofac_sdn', 'bis_entity_list', 'bis_denied'],
      },
    });
  } catch (error) {
    console.error('[API] Denied party sync status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get sync status' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/denied-party/sync
 * Trigger a sync of denied party lists
 * 
 * Query params or body:
 * - list: Which list to sync (ofac_sdn, bis_entity_list, bis_denied, all)
 *         Default: 'ofac_sdn' for backward compatibility
 * 
 * Examples:
 * - POST /api/denied-party/sync?list=ofac_sdn
 * - POST /api/denied-party/sync?list=bis_entity_list
 * - POST /api/denied-party/sync?list=bis_denied
 * - POST /api/denied-party/sync?list=all
 * 
 * This operation can take several minutes as it downloads and processes thousands of entries.
 * In production, this would ideally be run as a background job.
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let listType: SupportedList = 'ofac_sdn'; // Default for backward compatibility

    // Check query param first
    const queryList = searchParams.get('list') as SupportedList | null;
    if (queryList) {
      listType = queryList;
    } else {
      // Try to get from request body
      try {
        const body = await request.json();
        if (body.list) {
          listType = body.list as SupportedList;
        }
      } catch {
        // No body or invalid JSON - use default
      }
    }

    // Validate list type
    const validLists: SupportedList[] = ['ofac_sdn', 'bis_entity_list', 'bis_denied', 'all'];
    if (!validLists.includes(listType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid list type: ${listType}. Valid options: ${validLists.join(', ')}`,
        },
        { status: 400 }
      );
    }

    console.log(`[API] Starting sync for: ${listType}`);

    const results: Record<string, {
      success: boolean;
      totalRecords: number;
      recordsCreated: number;
      recordsUpdated: number;
      recordsDeleted: number;
      durationMs: number;
      errors?: string[];
    }> = {};

    // Sync requested list(s)
    if (listType === 'ofac_sdn' || listType === 'all') {
      console.log('[API] Syncing OFAC SDN...');
      const result = await syncOFACSDNList();
      results.ofac_sdn = {
        success: result.success,
        totalRecords: result.totalRecords,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsDeleted: result.recordsDeleted,
        durationMs: result.durationMs,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    }

    if (listType === 'bis_entity_list' || listType === 'all') {
      console.log('[API] Syncing BIS Entity List...');
      const result = await syncBISEntityList();
      results.bis_entity_list = {
        success: result.success,
        totalRecords: result.totalRecords,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsDeleted: result.recordsDeleted,
        durationMs: result.durationMs,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    }

    if (listType === 'bis_denied' || listType === 'all') {
      console.log('[API] Syncing BIS Denied Persons...');
      const result = await syncBISDeniedPersons();
      results.bis_denied = {
        success: result.success,
        totalRecords: result.totalRecords,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsDeleted: result.recordsDeleted,
        durationMs: result.durationMs,
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    }

    // Check overall success
    const allSuccessful = Object.values(results).every(r => r.success);
    const totalRecords = Object.values(results).reduce((sum, r) => sum + r.totalRecords, 0);
    const totalCreated = Object.values(results).reduce((sum, r) => sum + r.recordsCreated, 0);
    const totalUpdated = Object.values(results).reduce((sum, r) => sum + r.recordsUpdated, 0);
    const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.recordsDeleted, 0);
    const totalDuration = Object.values(results).reduce((sum, r) => sum + r.durationMs, 0);

    if (allSuccessful) {
      return NextResponse.json({
        success: true,
        message: `Sync completed successfully for: ${Object.keys(results).join(', ')}`,
        data: {
          results,
          totals: {
            totalRecords,
            recordsCreated: totalCreated,
            recordsUpdated: totalUpdated,
            recordsDeleted: totalDeleted,
            durationMs: totalDuration,
          },
        },
      });
    } else {
      const failedLists = Object.entries(results)
        .filter(([, r]) => !r.success)
        .map(([name]) => name);

      return NextResponse.json(
        {
          success: false,
          error: `Sync failed for: ${failedLists.join(', ')}`,
          data: { results },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Denied party sync error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to sync denied party lists' 
      },
      { status: 500 }
    );
  }
}
