/**
 * Classification API V8 "Arbiter" - Ask Upfront, Classify with Confidence
 * 
 * POST /api/classify-v8
 * GET /api/classify-v8?q=product+description&material=plastic
 * 
 * This endpoint uses the V8 "Arbiter" classification engine with:
 * - Ask upfront: Critical questions asked BEFORE classification
 * - Function over material: Cases, toys, jewelry bypass material chapters
 * - Decision tree routing: Deterministic chapter/heading selection
 * - Carve-out detection: Avoids misclassifying into specific product codes
 * 
 * TWO-PHASE FLOW:
 * 1. First call may return { needsInput: true, questions: [...] }
 * 2. Second call with answers returns final classification
 * 
 * @module api/classify-v8
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyProductV8 } from '@/services/classificationEngineV8';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { description, material, use, countryOfOrigin, value, answers } = body;
    
    if (!description) {
      return NextResponse.json(
        { error: 'Product description is required' },
        { status: 400 }
      );
    }
    
    console.log('[API V8] Classifying:', description);
    if (answers) {
      console.log('[API V8] With answers:', answers);
    }
    
    const result = await classifyProductV8({
      description,
      material,
      use,
      countryOfOrigin,
      value,
      answers,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API V8] Error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for quick testing
 * 
 * GET /api/classify-v8?q=indoor+planter
 * GET /api/classify-v8?q=indoor+planter&material=ceramic
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const description = searchParams.get('q') || searchParams.get('description');
    const material = searchParams.get('material');
    const use = searchParams.get('use');
    
    // Parse answers from query string (e.g., &answer_material=plastic)
    const answers: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key.startsWith('answer_')) {
        const answerKey = key.replace('answer_', '');
        answers[answerKey] = value;
      }
    }
    
    if (!description) {
      return NextResponse.json({
        message: 'V8 "Arbiter" Classification API - Ask Upfront, Classify with Confidence',
        version: '8.0',
        philosophy: 'Ask critical questions BEFORE classification to achieve high confidence.',
        features: [
          'Ask upfront: Questions before classification when needed',
          'Function over material: Cases, toys, jewelry bypass material chapters',
          'Decision tree routing: Deterministic chapter/heading selection',
          'Carve-out detection: Avoids specific product codes for general items',
          'High confidence: 90%+ confidence when all info is provided',
        ],
        usage: {
          basic: 'GET /api/classify-v8?q=product+description',
          withMaterial: 'GET /api/classify-v8?q=indoor+planter&material=ceramic',
          withAnswers: 'GET /api/classify-v8?q=indoor+planter&answer_material=ceramic',
        },
        twoPhaseFlow: [
          '1. POST with { description } → may return { needsInput: true, questions: [...] }',
          '2. POST with { description, answers: { material: "ceramic" } } → returns final classification',
        ],
        testProducts: [
          { query: 'silicone phone case', expected: '4202.99.90.XX', rule: 'Function: case for carrying' },
          { query: 'rubber finger ring', expected: '7117.90.XX.XX', rule: 'Function: jewelry/adornment' },
          { query: 'indoor planter', expected: 'ASKS material question', rule: 'Material-driven' },
          { query: 'indoor planter&material=plastic', expected: '3924.90.56.XX', rule: 'Plastic household' },
          { query: 'indoor planter&material=ceramic', expected: '6912.00.XX.XX', rule: 'Ceramic household' },
          { query: 'mens cotton t-shirt', expected: '6109.10.00.XX', rule: 'Apparel: cotton knit' },
          { query: 'polyester fleece blanket', expected: '6301.40.XX.XX', rule: 'Textile: synthetic' },
          { query: 'plastic toy car for kids', expected: '9503.00.XX.XX', rule: 'Function: toy' },
          { query: 'led light bulb e26 base', expected: '8539.50.XX.XX', rule: 'Function: lighting' },
          { query: 'usb-c charging cable', expected: '8544.42.XX.XX', rule: 'Function: cable' },
          { query: 'stainless steel water bottle 500ml', expected: '7323.93.00.XX', rule: 'Steel household' },
        ],
      });
    }
    
    console.log('[API V8] Quick test:', description);
    
    const result = await classifyProductV8({
      description,
      material: material || undefined,
      use: use || undefined,
      answers: Object.keys(answers).length > 0 ? answers : undefined,
    });
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('[API V8] Error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

