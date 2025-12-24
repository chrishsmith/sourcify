/**
 * HTS Search API
 * 
 * Search HTS codes by keyword or description.
 * 
 * GET /api/hts/search?q=tshirt&level=statistical&chapter=61&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchHtsCodes } from '@/services/htsDatabase';
import { HtsLevel } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Query must be at least 2 characters' },
        { status: 400 }
      );
    }
    
    // Parse optional filters
    const levelParam = searchParams.get('level');
    const level = levelParam 
      ? levelParam.split(',') as HtsLevel[]
      : undefined;
    
    const chapter = searchParams.get('chapter') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    const results = await searchHtsCodes(query, {
      level,
      chapter,
      limit: Math.min(limit, 100), // Cap at 100
    });
    
    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      results,
    });
    
  } catch (error) {
    console.error('[HTS Search API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

