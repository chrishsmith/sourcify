/**
 * API: Test Inference Engine V5
 * POST /api/classify-v5/infer
 * 
 * Tests the attribute extraction without full classification
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  extractProductAttributes, 
  getAttributeSummary,
  hasHighImpactUncertainty 
} from '@/services/inferenceEngineV5';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, material, use, origin } = body;
    
    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }
    
    console.log('[Inference V5] Extracting attributes for:', description);
    
    const result = await extractProductAttributes(description, {
      material,
      use,
      origin,
    });
    
    const summary = getAttributeSummary(result);
    const hasUncertainty = hasHighImpactUncertainty(result);
    
    return NextResponse.json({
      success: true,
      product: result.product,
      attributes: {
        all: result.attributes,
        htsRelevant: result.htsAttributes,
      },
      summary: {
        stated: summary.stated,
        inferred: summary.inferred,
        assumed: summary.assumed,
      },
      suggestedChapters: result.suggestedChapters,
      searchTerms: result.searchTerms,
      questions: {
        hasHighImpact: hasUncertainty,
        potential: result.potentialQuestions,
      },
      processingTimeMs: result.processingTimeMs,
    });
    
  } catch (error) {
    console.error('[Inference V5] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}




