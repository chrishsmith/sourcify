/**
 * V10 Classification API Endpoint
 * 
 * Target: <2 second response time
 * 
 * POST /api/classify-v10
 * Body: { description, origin?, destination?, material? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { classifyV10, generateJustification, ClassifyV10Input } from '@/services/classificationEngineV10';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';

export const maxDuration = 30; // seconds
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      description, 
      origin, 
      destination = 'US', 
      material,
      generateJustificationFlag = false,
      saveToHistory = true,
    } = body;
    
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }
    
    console.log('[API V10] Classifying:', description.slice(0, 100));
    
    // Get user session (optional - anonymous users can still classify)
    let userId: string | undefined;
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      userId = session?.user?.id;
    } catch {
      // Session not available - that's okay
    }
    
    // Run classification
    const input: ClassifyV10Input = {
      description: description.trim(),
      origin: origin?.toUpperCase(),
      destination: destination?.toUpperCase() || 'US',
      material,
    };
    
    const result = await classifyV10(input);
    
    // Generate justification if requested (adds ~1-2s)
    let justification = null;
    if (generateJustificationFlag && result.primary) {
      justification = await generateJustification(description, result.primary.htsCode, result);
    }
    
    // Save to history if user is logged in
    if (saveToHistory && userId && result.primary) {
      try {
        await prisma.searchHistory.create({
          data: {
            userId,
            productDescription: description,
            htsCode: result.primary.htsCode,
            htsDescription: result.primary.shortDescription,
            confidence: result.primary.confidence,
            countryOfOrigin: origin || null,
            baseDutyRate: result.primary.duty?.baseMfn || null,
            effectiveRate: result.primary.duty?.effective ? parseFloat(result.primary.duty.effective) : null,
            hasAdditionalDuties: result.primary.duty?.additional ? true : false,
            fullResult: JSON.parse(JSON.stringify({
              version: 'v10',
              timing: result.timing,
              primary: result.primary,
              alternatives: result.alternatives,
              detectedMaterial: result.detectedMaterial,
            })),
          },
        });
      } catch (err) {
        console.error('[API V10] Failed to save history:', err);
        // Don't fail the request for history errors
      }
    }
    
    const totalTime = Date.now() - startTime;
    console.log(`[API V10] Complete in ${totalTime}ms (engine: ${result.timing.total}ms)`);
    
    return NextResponse.json({
      success: result.success,
      
      // Timing
      timing: {
        ...result.timing,
        apiTotal: totalTime,
      },
      
      // Primary result
      primary: result.primary ? {
        htsCode: result.primary.htsCode,
        htsCodeFormatted: result.primary.htsCodeFormatted,
        confidence: result.primary.confidence,
        
        path: result.primary.path,
        fullDescription: result.primary.fullDescription,
        shortDescription: result.primary.shortDescription,
        
        duty: result.primary.duty,
        
        isOther: result.primary.isOther,
        otherExclusions: result.primary.otherExclusions,
        
        scoringFactors: result.primary.scoringFactors,
      } : null,
      
      // Alternatives
      alternatives: result.alternatives,
      showMore: result.showMore,
      
      // Detection info
      detectedMaterial: result.detectedMaterial,
      detectedChapters: result.detectedChapters,
      searchTerms: result.searchTerms,
      
      // Clarification needed (low confidence)
      needsClarification: result.needsClarification,
      
      // Conditional classification (value/size/weight dependent)
      conditionalClassification: result.conditionalClassification,
      
      // Justification (if requested)
      justification,
    });
    
  } catch (error) {
    console.error('[API V10] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Classification failed',
        timing: { apiTotal: Date.now() - startTime },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/classify-v10?description=...&origin=...
 * Convenience endpoint for simple queries
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const description = searchParams.get('description');
  const origin = searchParams.get('origin');
  const destination = searchParams.get('destination') || 'US';
  const material = searchParams.get('material');
  
  if (!description) {
    return NextResponse.json(
      { success: false, error: 'Description query parameter is required' },
      { status: 400 }
    );
  }
  
  // Forward to POST handler
  const body = { description, origin, destination, material, saveToHistory: false };
  const mockRequest = new NextRequest(request.url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  
  return POST(mockRequest);
}

