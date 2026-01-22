/**
 * HTS Database Sync API
 * 
 * Smart sync that only updates when USITC has a new revision.
 * 
 * GET /api/hts/sync - Get database stats, current revision, check for updates
 * POST /api/hts/sync - Run import (only if needed, or force=true)
 * POST /api/hts/sync?force=true - Force import even if up-to-date
 * POST /api/hts/sync?file=filename.xlsx - Import from specific file
 */

import { NextRequest, NextResponse } from 'next/server';
import { runHtsImportFromDefault, getHtsImportHistory } from '@/services/hts/import';
import { getHtsDatabaseStats } from '@/services/hts/database';
import { checkForHtsUpdates, markRevisionAsCurrent } from '@/services/hts/revision-checker';

export async function GET() {
  try {
    const [stats, history, updateCheck] = await Promise.all([
      getHtsDatabaseStats(),
      getHtsImportHistory(10),
      checkForHtsUpdates(),
    ]);
    
    return NextResponse.json({
      success: true,
      database: {
        ...stats,
        currentRevision: updateCheck.currentRevision,
        latestAvailable: updateCheck.latestRevision,
        needsUpdate: updateCheck.needsUpdate,
      },
      availableRevisions: updateCheck.availableRevisions,
      importHistory: history,
    });
  } catch (error) {
    console.error('[HTS Sync API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const specificFile = searchParams.get('file');
    const force = searchParams.get('force') === 'true';
    
    // Check if we actually need to update (unless forced)
    if (!force && !specificFile) {
      const updateCheck = await checkForHtsUpdates();
      
      if (!updateCheck.needsUpdate) {
        return NextResponse.json({
          success: true,
          message: 'Already up to date',
          currentRevision: updateCheck.currentRevision,
          latestRevision: updateCheck.latestRevision,
          hint: 'Use ?force=true to force a re-import',
        });
      }
      
      console.log(`[HTS Sync API] Update needed: ${updateCheck.currentRevision} → ${updateCheck.latestRevision}`);
    }
    
    console.log('[HTS Sync API] Starting HTS import...');
    
    let result;
    let revisionId: string | undefined;
    
    if (specificFile) {
      // Import specific file
      const { runHtsImport } = await import('@/services/hts/import');
      const filePath = `${process.cwd()}/data/hts/raw/${specificFile}`;
      result = await runHtsImport(filePath, specificFile);
      revisionId = specificFile;
    } else {
      // Import from default location (most recent .xlsx)
      result = await runHtsImportFromDefault();
      
      // Get the revision ID from the result or update check
      const updateCheck = await checkForHtsUpdates();
      revisionId = updateCheck.latestRevision || undefined;
    }
    
    // Mark this revision as current
    if (revisionId && result.success) {
      await markRevisionAsCurrent(revisionId, result.totalRecords);
    }
    
    return NextResponse.json({
      success: true,
      message: `HTS import completed`,
      revision: revisionId,
      result: {
        totalRecords: result.totalRecords,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        errorCount: result.errors.length,
        durationMs: result.durationMs,
        durationFormatted: `${(result.durationMs / 1000).toFixed(1)}s`,
      },
      errors: result.errors.length > 0 ? result.errors.slice(0, 10) : undefined,
    });
    
  } catch (error) {
    console.error('[HTS Sync API] Import failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        hint: error instanceof Error && error.message.includes('not found')
          ? 'Download the HTS Excel file from https://hts.usitc.gov/ and place it in /data/hts/raw/'
          : undefined,
      },
      { status: 500 }
    );
  }
}

