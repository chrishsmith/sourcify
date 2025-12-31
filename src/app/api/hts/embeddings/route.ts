/**
 * HTS Embeddings API
 * 
 * GET /api/hts/embeddings - Get embedding stats
 * POST /api/hts/embeddings - Generate embeddings for HTS codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  generateAllEmbeddings, 
  getEmbeddingStats,
  searchHtsBySemantic,
} from '@/services/htsEmbeddings';

export const maxDuration = 300; // 5 minutes for embedding generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/hts/embeddings
 * Returns stats about embedding coverage
 */
export async function GET() {
  try {
    const stats = await getEmbeddingStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Embeddings API] Error getting stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get embedding stats' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hts/embeddings
 * Generate embeddings for HTS codes
 * 
 * Body: { action: 'generate' | 'test', forceRegenerate?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, forceRegenerate = false, query } = body;
    
    if (action === 'test' && query) {
      // Test semantic search
      console.log(`[Embeddings API] Testing semantic search: "${query}"`);
      const startTime = Date.now();
      
      const results = await searchHtsBySemantic(query, { limit: 10 });
      
      const elapsed = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        query,
        timing: `${elapsed}ms`,
        results: results.map(r => ({
          code: r.codeFormatted,
          description: r.description,
          chapter: r.chapter,
          similarity: Math.round(r.similarity * 100) / 100,
        })),
      });
    }
    
    if (action === 'generate') {
      console.log(`[Embeddings API] Starting embedding generation (force: ${forceRegenerate})`);
      
      // Start generation (this can take a while)
      const result = await generateAllEmbeddings({
        forceRegenerate,
        onProgress: (processed, total) => {
          // Progress is logged in the service
        },
      });
      
      return NextResponse.json({
        success: true,
        message: 'Embedding generation complete',
        result,
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action. Use "generate" or "test".' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('[Embeddings API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

