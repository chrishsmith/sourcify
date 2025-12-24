/**
 * API: Classification Engine V5 - "Infer First, Ask Later"
 * POST /api/classify-v5
 * 
 * Full classification with transparency about what was stated vs assumed.
 * Now saves to SearchHistory for persistence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { classifyProductV5, ClassificationV5Result, ClassificationV5Input } from '@/services/classificationEngineV5';
import { generateJustification, generateQuickJustification } from '@/services/justificationGenerator';
import { 
  convertV5ResultToClassificationResult, 
  convertV5InputToClassificationInput,
  extractEffectiveRateFromV5,
} from '@/services/classificationV5Adapter';
import { saveSearchToHistory } from '@/services/searchHistory';

/**
 * Extract intermediate HTS groupings from classification context
 * These are the "indent" groupings like "Men's or boys':" that don't have their own code
 * 
 * This data comes from the HTS database - captured during Excel import from indent rows
 */
function extractContextPath(result: ClassificationV5Result): { groupings: string[]; fullPath: string } | null {
  if (!result.bestMatch || !result.hierarchy.statistical) {
    return null;
  }
  
  // Get parentGroupings from the statistical code (populated during HTS import)
  const storedGroupings = (result.hierarchy.statistical as any).parentGroupings as string[] | undefined;
  
  if (storedGroupings && storedGroupings.length > 0) {
    return {
      groupings: storedGroupings,
      fullPath: storedGroupings.join(' › '),
    };
  }
  
  // No groupings stored - return null (don't guess)
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, material, use, origin, value, userAnswers, saveToHistory = true } = body;
    
    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }
    
    console.log('[Classify V5] Starting classification for:', description);
    
    // Get user session (optional - anonymous users can still classify)
    let userId: string | undefined;
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });
      userId = session?.user?.id;
    } catch {
      // Anonymous user - continue without userId
    }
    
    // Build V5 input
    const v5Input: ClassificationV5Input = {
      description,
      material,
      use,
      origin,
      value,
      userAnswers,
    };
    
    // Run classification
    const result = await classifyProductV5(v5Input);
    
    // Generate justification
    const justification = generateJustification(result);
    const quickJustification = generateQuickJustification(result);
    
    // Extract context path for intermediate HTS groupings
    const contextPath = extractContextPath(result);
    
    // Save to search history (if classification was successful and saveToHistory is true)
    let searchHistoryId: string | undefined;
    if (saveToHistory && result.bestMatch) {
      try {
        // Convert to standard format for storage
        const classificationResult = convertV5ResultToClassificationResult(result, v5Input);
        const classificationInput = convertV5InputToClassificationInput(v5Input);
        
        searchHistoryId = await saveSearchToHistory(
          classificationInput,
          classificationResult,
          userId,
          { searchType: 'SINGLE' }
        );
        
        console.log('[Classify V5] Saved to history:', searchHistoryId);
      } catch (saveError) {
        // Don't fail the request if saving fails
        console.error('[Classify V5] Failed to save to history:', saveError);
      }
    }
    
    return NextResponse.json({
      success: true,
      
      // Primary result
      classification: result.bestMatch ? {
        htsCode: result.bestMatch.htsCodeFormatted,
        description: result.bestMatch.description,
        generalRate: result.bestMatch.generalRate,
        confidence: Math.round(result.bestMatch.confidence * 100),
        confidenceLabel: result.bestMatch.confidenceLabel,
      } : null,
      
      // Full hierarchy
      hierarchy: result.hierarchy,
      
      // Context path - intermediate HTS groupings like "Men's or boys'" 
      contextPath,
      
      // Transparency - CRUCIAL for user trust
      transparency: {
        whatYouToldUs: result.transparency.stated,
        whatWeInferred: result.transparency.inferred,
        whatWeAssumed: result.transparency.assumed,
      },
      
      // Duty range if uncertain
      dutyRange: result.dutyRange,
      
      // Optional questions - NOT forced
      questions: result.optionalQuestions.length > 0 ? {
        note: "You don't need to answer these - they're optional refinements",
        items: result.optionalQuestions.map(q => ({
          id: q.attributeKey,
          question: q.question,
          options: q.options,
          impact: q.impact,
          currentAssumption: q.currentAssumption,
          dutyImpact: q.potentialDutyChange,
        })),
      } : null,
      
      // Alternatives
      alternatives: result.alternatives.slice(0, 5).map(alt => ({
        htsCode: alt.htsCodeFormatted,
        description: alt.description,
        rate: alt.generalRate,
        matchReasons: alt.matchReasons,
      })),
      
      // Justification
      justification: {
        quick: quickJustification,
        summary: justification.summary,
        confidence: justification.confidenceExplanation,
        caveats: justification.caveats,
        refinementSuggestions: justification.refinementSuggestions,
        fullTextAvailable: true,
      },
      
      // Database reference (for history, save, monitor)
      searchHistoryId,
      
      // V5 raw result (for save functionality)
      v5Result: {
        inferenceResult: result.inferenceResult,
        bestMatch: result.bestMatch,
        effectiveRate: extractEffectiveRateFromV5(result),
      },
      
      // Meta
      processingTimeMs: result.processingTimeMs,
      searchTermsUsed: result.searchTermsUsed,
    });
    
  } catch (error) {
    console.error('[Classify V5] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

