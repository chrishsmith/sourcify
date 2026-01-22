/**
 * Classification API V6 - TRUE Dynamic Tree Navigation
 *
 * POST /api/classify-v6
 * GET /api/classify-v6?q=product+description&material=plastic
 *
 * This endpoint uses the V6 "Atlas" classification engine with:
 * - ZERO hardcoded product→code mappings
 * - Dynamic tree navigation using HTS database descriptions
 * - Carve-out checking at each level
 *
 * The HTS descriptions ARE the classification rules.
 *
 * @module api/classify-v6
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyProductV6 } from '@/services/classification/engine-v6';

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

    console.log('[API V6] Classifying:', description);

    const result = await classifyProductV6({
      description,
      material,
      use,
      countryOfOrigin,
      value,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API V6] Error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for quick testing
 *
 * GET /api/classify-v6?q=indoor+planter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const description = searchParams.get('q') || searchParams.get('description');
    const material = searchParams.get('material');
    const use = searchParams.get('use');

    if (!description) {
      return NextResponse.json({
        message: 'V6 "Atlas" Classification API - TRUE Dynamic Tree Navigation',
        version: '6.0',
        philosophy: 'ZERO hardcoded product→code mappings. HTS descriptions ARE the rules.',
        features: [
          'Dynamic tree navigation using database descriptions',
          'Carve-out checking at each level',
          'GRI-aware decision making',
          'No separate hardcoded rules - uses actual HTS text',
        ],
        usage: 'GET /api/classify-v6?q=product+description&material=optional',
        testProducts: [
          { query: 'indoor planter', expected: '3924.90.56.50' },
          { query: 'mens cotton t-shirt', expected: '6109.10.XX' },
          { query: 'stainless steel water bottle 500ml', expected: '7323.XX' },
          { query: 'silicone phone case', expected: '4202.XX' },
          { query: 'rubber finger ring', expected: '7117.XX' },
          { query: 'usb-c charging cable', expected: '8544.XX' },
          { query: 'polyester fleece blanket', expected: '6301.40.XX' },
          { query: 'plastic toy car for kids', expected: '9503.XX' },
          { query: 'led light bulb e26 base', expected: '8539.50.XX' },
        ],
      });
    }

    console.log('[API V6] Quick test:', description);

    const result = await classifyProductV6({
      description,
      material: material || undefined,
      use: use || undefined,
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('[API V6] Error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}