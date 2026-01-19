import { NextRequest, NextResponse } from 'next/server';
import { classifyProductV9 } from '@/services/classificationEngineV9';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, answers } = body;

    if (!description) {
      return NextResponse.json(
        { error: 'Product description is required' },
        { status: 400 }
      );
    }

    console.log(`[API V9] Classifying: ${description}`);
    if (answers) {
      console.log(`[API V9] With answers:`, answers);
    }

    const result = await classifyProductV9(description, answers);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API V9] Classification error:', error);
    return NextResponse.json(
      { error: 'Classification failed', details: String(error) },
      { status: 500 }
    );
  }
}


