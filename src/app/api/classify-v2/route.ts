/**
 * Classification API V2
 * 
 * A cleaner classification flow with three phases:
 * - UNDERSTAND: Identify category, show rate range, list variables
 * - ALL: Return all possible codes grouped with country tariffs separate
 * - ANSWER: Process user answers and return specific result
 * 
 * Endpoint: POST /api/classify-v2
 * 
 * @see docs/DESIGN_CLASSIFICATION_FLOW_V2.md
 */

import { NextRequest, NextResponse } from 'next/server';
import {
    classifyV2,
    type ClassificationInputV2,
    type ClassificationPhase,
    type ClassificationResponseV2,
} from '@/services/classificationFlowV2';

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ClassifyV2Request extends ClassificationInputV2 {
    phase: ClassificationPhase;
    answeredQuestions?: Record<string, string>;
}

interface ClassifyV2ApiResponse {
    success: boolean;
    data?: ClassificationResponseV2;
    error?: string;
    meta?: {
        processingTime: number;
        phase: ClassificationPhase | 'result';
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest): Promise<NextResponse<ClassifyV2ApiResponse>> {
    const startTime = Date.now();
    
    try {
        const body = await request.json() as ClassifyV2Request;
        
        // Validate required fields
        if (!body.productDescription || body.productDescription.trim().length < 2) {
            return NextResponse.json({
                success: false,
                error: 'Product description is required (minimum 2 characters)',
            }, { status: 400 });
        }
        
        if (!body.countryOfOrigin) {
            return NextResponse.json({
                success: false,
                error: 'Country of origin is required',
            }, { status: 400 });
        }
        
        // Default to 'understand' phase if not specified
        const phase = body.phase || 'understand';
        
        // Validate phase
        if (!['understand', 'all', 'all-tree', 'answer'].includes(phase)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid phase. Must be: understand, all, all-tree, or answer',
            }, { status: 400 });
        }
        
        console.log('[API-V2] Request:', {
            description: body.productDescription.substring(0, 50),
            country: body.countryOfOrigin,
            phase,
            hasAnswers: !!body.answeredQuestions,
        });
        
        // Run classification
        const result = await classifyV2(
            {
                productDescription: body.productDescription,
                materialComposition: body.materialComposition,
                countryOfOrigin: body.countryOfOrigin,
                intendedUse: body.intendedUse,
                unitValue: body.unitValue,
            },
            phase,
            body.answeredQuestions
        );
        
        const processingTime = Date.now() - startTime;
        console.log(`[API-V2] Complete in ${processingTime}ms, phase: ${result.phase}`);
        
        return NextResponse.json({
            success: true,
            data: result,
            meta: {
                processingTime,
                phase: result.phase,
            },
        });
        
    } catch (error) {
        console.error('[API-V2] Error:', error);
        
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Classification failed',
        }, { status: 500 });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET HANDLER - API DOCUMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        name: 'Classification API V2',
        version: '2.0.0',
        description: 'Three-phase classification flow: understand → questions/all → result',
        documentation: '/docs/DESIGN_CLASSIFICATION_FLOW_V2.md',
        
        endpoints: {
            'POST /api/classify-v2': {
                description: 'Classify a product with the three-phase flow',
                
                requestBody: {
                    productDescription: {
                        type: 'string',
                        required: true,
                        description: 'Description of the product to classify',
                    },
                    countryOfOrigin: {
                        type: 'string',
                        required: true,
                        description: 'ISO 2-letter country code (e.g., CN, VN, MX)',
                    },
                    materialComposition: {
                        type: 'string',
                        required: false,
                        description: 'Primary material (e.g., cotton, stainless steel)',
                    },
                    intendedUse: {
                        type: 'string',
                        required: false,
                        description: 'How the product will be used',
                    },
                    unitValue: {
                        type: 'number',
                        required: false,
                        description: 'Unit value in USD for duty estimation',
                    },
                    phase: {
                        type: 'string',
                        required: false,
                        default: 'understand',
                        enum: ['understand', 'all', 'answer'],
                        description: 'Which phase of the flow to execute',
                    },
                    answeredQuestions: {
                        type: 'Record<string, string>',
                        required: false,
                        description: 'User answers to classification questions (for phase=answer)',
                    },
                },
                
                responses: {
                    '200': {
                        description: 'Classification successful',
                        schema: {
                            success: true,
                            data: '{ phase, ... } // Response varies by phase',
                            meta: { processingTime: 'number', phase: 'string' },
                        },
                    },
                    '400': {
                        description: 'Invalid request',
                        schema: { success: false, error: 'string' },
                    },
                    '500': {
                        description: 'Server error',
                        schema: { success: false, error: 'string' },
                    },
                },
            },
        },
        
        phases: {
            understand: {
                description: 'Identify product category, show rate range, list decision variables',
                response: {
                    phase: 'understand',
                    category: '{ name, description, chapters, confidence, ... }',
                    rateRange: '{ min, max, minCode, maxCode }',
                    countryAdditions: '{ total, breakdown: [...] }',
                    variables: '[{ id, question, impact, options }]',
                    possibleCodeCount: 'number',
                },
            },
            all: {
                description: 'Return all possible codes grouped by category',
                response: {
                    phase: 'all',
                    category: '{ ... }',
                    codeGroups: '[{ groupName, codes: [{ htsCode, baseRate, isLowest }] }]',
                    countryAdditions: '{ total, breakdown, example }',
                    tip: 'string | undefined',
                },
            },
            answer: {
                description: 'Process user answers and return specific classification',
                response: {
                    phase: 'result',
                    htsCode: '{ code, description, chapter, heading }',
                    confidence: 'number',
                    matchedCriteria: '[{ variable, value, source }]',
                    dutyBreakdown: '{ baseRate, additions, totalRate, perUnitExample }',
                    alternatives: '[{ htsCode, baseRate, ... }]',
                    hierarchy: '[{ code, description, level }]',
                },
            },
        },
        
        examples: {
            understand: {
                request: {
                    productDescription: 'cotton t-shirt',
                    countryOfOrigin: 'CN',
                    phase: 'understand',
                },
                response: {
                    success: true,
                    data: {
                        phase: 'understand',
                        category: { name: 'T-shirt', chapters: ['61'], confidence: 90 },
                        rateRange: { min: 16.5, max: 32 },
                        variables: [{ id: 'fiber', question: 'Is this cotton or synthetic?' }],
                        possibleCodeCount: 5,
                    },
                },
            },
            all: {
                request: {
                    productDescription: 'cotton t-shirt',
                    countryOfOrigin: 'CN',
                    phase: 'all',
                },
                response: {
                    success: true,
                    data: {
                        phase: 'all',
                        codeGroups: [
                            {
                                groupName: 'Knit (Chapter 61)',
                                codes: [
                                    { htsCode: '6109.10.00', baseRate: 16.5, isLowest: true },
                                ],
                            },
                        ],
                        countryAdditions: { total: 55, breakdown: ['Section 301: 25%', '...'] },
                    },
                },
            },
            answer: {
                request: {
                    productDescription: 'cotton t-shirt',
                    countryOfOrigin: 'CN',
                    phase: 'answer',
                    answeredQuestions: { fiber: 'cotton', construction: 'knit' },
                },
                response: {
                    success: true,
                    data: {
                        phase: 'result',
                        htsCode: { code: '6109.10.00.04', description: 'T-shirts, knit, cotton' },
                        confidence: 95,
                        dutyBreakdown: { baseRate: 16.5, totalRate: 71.5 },
                    },
                },
            },
        },
    });
}


