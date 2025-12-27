/**
 * HTS Code Detail API
 * 
 * Get details for a specific HTS code including hierarchy and siblings.
 * 
 * GET /api/hts/6109100012 - Get code details
 * GET /api/hts/6109100012?include=hierarchy,siblings,children - Include related data
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getHtsCode, 
  getHtsHierarchy, 
  getHtsSiblings, 
  getHtsChildren,
  formatHtsCode,
  normalizeHtsCode,
} from '@/services/htsDatabase';

interface RouteParams {
  params: Promise<{ code: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { code: rawCode } = await params;
    const code = normalizeHtsCode(rawCode);
    
    // Get the main code
    const htsCode = await getHtsCode(code);
    
    if (!htsCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: `HTS code not found: ${formatHtsCode(code)}`,
          hint: 'Make sure the HTS database has been synced. Run POST /api/hts/sync'
        },
        { status: 404 }
      );
    }
    
    // Parse include options
    const { searchParams } = new URL(request.url);
    const includeParam = searchParams.get('include') || '';
    const includes = new Set(includeParam.split(',').map(s => s.trim().toLowerCase()));
    
    // Build response
    const response: Record<string, unknown> = {
      success: true,
      code: htsCode,
    };
    
    // Include hierarchy (ancestors) if requested
    if (includes.has('hierarchy') || includes.has('all')) {
      response.hierarchy = await getHtsHierarchy(code);
    }
    
    // Include siblings if requested
    if (includes.has('siblings') || includes.has('all')) {
      response.siblings = await getHtsSiblings(code);
    }
    
    // Include children if requested
    if (includes.has('children') || includes.has('all')) {
      response.children = await getHtsChildren(code);
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[HTS Code API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



