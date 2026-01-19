/**
 * Duty Optimizer API - Teaser
 * 
 * Shows a preview of potential savings for free users after classification.
 * Doesn't reveal details, just indicates if optimization is possible.
 * 
 * @route POST /api/duty-optimizer/teaser
 */

import { NextResponse } from 'next/server';
import { getOptimizerTeaser } from '@/services/dutyOptimizer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.htsCode || typeof body.htsCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'htsCode is required' },
        { status: 400 }
      );
    }
    
    if (typeof body.currentRate !== 'number') {
      return NextResponse.json(
        { success: false, error: 'currentRate is required' },
        { status: 400 }
      );
    }
    
    if (!body.countryOfOrigin || typeof body.countryOfOrigin !== 'string') {
      return NextResponse.json(
        { success: false, error: 'countryOfOrigin is required' },
        { status: 400 }
      );
    }
    
    const teaser = await getOptimizerTeaser(
      body.htsCode,
      body.currentRate,
      body.countryOfOrigin.toUpperCase()
    );
    
    return NextResponse.json({
      success: true,
      ...teaser,
    });
    
  } catch (error) {
    console.error('[API] Teaser error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}


