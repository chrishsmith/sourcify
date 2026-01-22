/**
 * HTS Code History API
 * Provides lookup for HTS code changes over time
 * 
 * GET /api/hts-history?code=8471.30.0100 - Find changes for a specific code
 * GET /api/hts-history?year=2024 - Get all changes for a year
 * GET /api/hts-history?chapter=85 - Get all changes for a chapter
 * GET /api/hts-history - Get all changes
 */

import { NextResponse } from 'next/server';
import {
  HTS_CODE_CHANGES,
  findCurrentCode,
  findCodeHistory,
  getChangesByYear,
  getChangesByChapter,
  getAvailableYears,
  getAffectedChapters,
  type HtsCodeChange,
  type HtsCodeMapping,
} from '@/data/htsCodeChanges';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const year = searchParams.get('year');
    const chapter = searchParams.get('chapter');
    const direction = searchParams.get('direction') || 'both'; // 'forward', 'backward', 'both'
    
    // If a specific code is requested
    if (code) {
      const normalizedCode = code.replace(/\./g, '');
      
      // Find what this code maps to now (if it was old)
      const forwardMappings = findCurrentCode(code);
      
      // Find what this code used to be (if it's current)
      const backwardMappings = findCodeHistory(code);
      
      // Find all changes involving this code
      const relatedChanges = HTS_CODE_CHANGES.filter(change => {
        const oldMatch = change.oldCodes.some(c => 
          c.replace(/\./g, '').startsWith(normalizedCode) ||
          normalizedCode.startsWith(c.replace(/\./g, ''))
        );
        const newMatch = change.newCodes.some(c => 
          c.replace(/\./g, '').startsWith(normalizedCode) ||
          normalizedCode.startsWith(c.replace(/\./g, ''))
        );
        return oldMatch || newMatch;
      });
      
      return NextResponse.json({
        success: true,
        code: code,
        normalizedCode: normalizedCode,
        forward: direction !== 'backward' ? forwardMappings : [],
        backward: direction !== 'forward' ? backwardMappings : [],
        relatedChanges: relatedChanges,
        hasChanges: forwardMappings.length > 0 || backwardMappings.length > 0 || relatedChanges.length > 0
      });
    }
    
    // If filtering by year
    if (year) {
      const yearNum = parseInt(year);
      if (isNaN(yearNum)) {
        return NextResponse.json(
          { success: false, error: 'Invalid year format' },
          { status: 400 }
        );
      }
      
      const changes = getChangesByYear(yearNum);
      return NextResponse.json({
        success: true,
        year: yearNum,
        changes: changes,
        count: changes.length
      });
    }
    
    // If filtering by chapter
    if (chapter) {
      const changes = getChangesByChapter(chapter);
      return NextResponse.json({
        success: true,
        chapter: chapter,
        changes: changes,
        count: changes.length
      });
    }
    
    // Return all changes with metadata
    const sortedChanges = [...HTS_CODE_CHANGES].sort((a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
    );
    
    return NextResponse.json({
      success: true,
      changes: sortedChanges,
      count: sortedChanges.length,
      meta: {
        availableYears: getAvailableYears(),
        affectedChapters: getAffectedChapters(),
        changeTypes: ['split', 'merge', 'rename', 'added', 'deleted', 'rate_change', 'description_update']
      }
    });
    
  } catch (error) {
    console.error('HTS History API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve HTS history data' },
      { status: 500 }
    );
  }
}
