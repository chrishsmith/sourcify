/**
 * Classification API V7 - GRI-Aware Hierarchical Classification
 * 
 * POST /api/classify-v7
 * GET /api/classify-v7?q=product+description&material=plastic
 * 
 * This endpoint uses the V7 "Atlas Pro" classification engine with:
 * - GRI (General Rules of Interpretation) awareness
 * - Function-over-material routing
 * - Household vs industrial distinction
 * - Material-specific textile routing
 * 
 * @module api/classify-v7
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyProductV7 } from '@/services/classificationEngineV7';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { description, material, use, countryOfOrigin, value } = body;
    
    if (!description) {
      return NextResponse.json(
        { error: 'Product description is required' },
        { status: 400 }
      );
    }
    
    console.log('[API V7] Classifying:', description);
    
    const result = await classifyProductV7({
      description,
      material,
      use,
      countryOfOrigin,
      value,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API V7] Error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for quick testing
 * 
 * GET /api/classify-v7?q=silicone+phone+case
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const description = searchParams.get('q') || searchParams.get('description');
    const material = searchParams.get('material');
    const use = searchParams.get('use');
    
    if (!description) {
      return NextResponse.json({
        message: 'V7 "Atlas Pro" Classification API - GRI Aware',
        version: '7.0',
        features: [
          'GRI (General Rules of Interpretation) awareness',
          'Function-over-material routing',
          'Household vs industrial distinction',
          'Material-specific textile routing',
        ],
        usage: 'GET /api/classify-v7?q=product+description&material=optional',
        testProducts: [
          { query: 'indoor planter', expected: '3924.90.56.50' },
          { query: 'mens cotton t-shirt', expected: '6109.10.00.XX' },
          { query: 'stainless steel water bottle 500ml', expected: '7323.93.00.XX' },
          { query: 'silicone phone case', expected: '4202.99.90.XX' },
          { query: 'rubber finger ring', expected: '7117.90.XX.XX' },
          { query: 'usb-c charging cable', expected: '8544.42.XX.XX' },
          { query: 'polyester fleece blanket', expected: '6301.40.XX.XX' },
          { query: 'plastic toy car for kids', expected: '9503.00.XX.XX' },
          { query: 'led light bulb e26 base', expected: '8539.50.XX.XX' },
        ],
      });
    }
    
    console.log('[API V7] Quick test:', description);
    
    const result = await classifyProductV7({
      description,
      material: material || undefined,
      use: use || undefined,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API V7] Error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



