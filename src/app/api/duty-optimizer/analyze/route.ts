/**
 * Duty Optimizer API - Analyze Product
 * 
 * PRO feature: Exhaustive HTS code analysis to find all applicable codes
 * and potential duty savings.
 * 
 * @route POST /api/duty-optimizer/analyze
 */

import { NextResponse } from 'next/server';
import { optimizeDuty, DutyOptimizerInput } from '@/services/dutyOptimizer';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // Check authentication (skip in development for testing)
    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev) {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      
      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }
      
      // TODO: Check user tier - this is a PRO feature
      // const user = await prisma.user.findUnique({
      //   where: { id: session.user.id },
      //   select: { tier: true }
      // });
      // if (user?.tier !== 'PRO' && user?.tier !== 'BUSINESS' && user?.tier !== 'ENTERPRISE') {
      //   return NextResponse.json(
      //     { success: false, error: 'This feature requires a PRO subscription' },
      //     { status: 403 }
      //   );
      // }
    }
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.productDescription || typeof body.productDescription !== 'string') {
      return NextResponse.json(
        { success: false, error: 'productDescription is required' },
        { status: 400 }
      );
    }
    
    if (!body.countryOfOrigin || typeof body.countryOfOrigin !== 'string') {
      return NextResponse.json(
        { success: false, error: 'countryOfOrigin is required' },
        { status: 400 }
      );
    }
    
    // Build input
    const input: DutyOptimizerInput = {
      productDescription: body.productDescription.trim(),
      countryOfOrigin: body.countryOfOrigin.toUpperCase(),
      unitValue: body.unitValue ? parseFloat(body.unitValue) : undefined,
      intendedUse: body.intendedUse,
      materialComposition: body.materialComposition,
      maxResults: body.maxResults ? Math.min(parseInt(body.maxResults), 50) : 20,
    };
    
    console.log(`[API] Duty optimizer request:`, {
      product: input.productDescription.substring(0, 50) + '...',
      country: input.countryOfOrigin,
      user: isDev ? 'dev-user' : 'authenticated',
    });
    
    // Run optimization
    const result = await optimizeDuty(input);
    
    const totalTime = Date.now() - startTime;
    console.log(`[API] Duty optimizer complete: ${totalTime}ms, ${result.applicableCodes.length} codes found`);
    
    return NextResponse.json({
      ...result,
      apiProcessingTimeMs: totalTime,
    });
    
  } catch (error) {
    console.error('[API] Duty optimizer error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

