/**
 * HTS Embeddings Service
 * 
 * Generates and manages hierarchical embeddings for HTS codes.
 * Uses OpenAI's text-embedding-3-small (1536 dimensions) for semantic search.
 * 
 * Key Innovation: Hierarchical Context
 * Instead of just embedding "Mugs and steins", we embed:
 * "CERAMIC PRODUCTS | Tableware, kitchenware, household articles | Mugs and steins | 
 *  drinking, cup, mug, coffee, tea, beverage"
 * 
 * This captures material, function, AND specific product in one embedding.
 * 
 * @module htsEmbeddings
 * @created December 30, 2025
 */

import { prisma } from '@/lib/db';
import OpenAI from 'openai';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 100; // Process 100 codes at a time

// Chapter descriptions for context (top-level of HTS)
const CHAPTER_CONTEXT: Record<string, string> = {
  '39': 'PLASTICS AND ARTICLES THEREOF',
  '40': 'RUBBER AND ARTICLES THEREOF',
  '42': 'LEATHER ARTICLES, SADDLERY, TRAVEL GOODS, HANDBAGS',
  '44': 'WOOD AND ARTICLES OF WOOD',
  '48': 'PAPER AND PAPERBOARD',
  '50': 'SILK',
  '51': 'WOOL AND FINE ANIMAL HAIR',
  '52': 'COTTON',
  '54': 'MAN-MADE FILAMENTS',
  '55': 'MAN-MADE STAPLE FIBERS',
  '61': 'KNITTED OR CROCHETED APPAREL',
  '62': 'WOVEN APPAREL (NOT KNITTED)',
  '63': 'TEXTILE ARTICLES, WORN CLOTHING',
  '64': 'FOOTWEAR, GAITERS',
  '69': 'CERAMIC PRODUCTS',
  '70': 'GLASS AND GLASSWARE',
  '71': 'JEWELRY, PRECIOUS METALS',
  '72': 'IRON AND STEEL',
  '73': 'ARTICLES OF IRON OR STEEL',
  '74': 'COPPER AND ARTICLES THEREOF',
  '76': 'ALUMINUM AND ARTICLES THEREOF',
  '84': 'MACHINERY, MECHANICAL APPLIANCES',
  '85': 'ELECTRICAL MACHINERY AND EQUIPMENT',
  '87': 'VEHICLES',
  '90': 'OPTICAL, MEASURING, MEDICAL INSTRUMENTS',
  '94': 'FURNITURE, BEDDING, LIGHTING',
  '95': 'TOYS, GAMES, SPORTS EQUIPMENT',
  '96': 'MISCELLANEOUS MANUFACTURED ARTICLES',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface HtsCodeForEmbedding {
  code: string;
  codeFormatted: string;
  level: string;
  description: string;
  chapter: string;
  heading: string | null;
  keywords: string[];
  parentGroupings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIERARCHICAL CONTEXT BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build rich hierarchical context for an HTS code
 * This is the KEY INNOVATION - we embed the full semantic context, not just the description
 */
export async function buildHierarchicalContext(code: HtsCodeForEmbedding): Promise<string> {
  const parts: string[] = [];
  
  // 1. Chapter context (material/category)
  const chapterDesc = CHAPTER_CONTEXT[code.chapter];
  if (chapterDesc) {
    parts.push(chapterDesc);
  }
  
  // 2. Parent groupings (inherited descriptions from HTS structure)
  if (code.parentGroupings && code.parentGroupings.length > 0) {
    // Filter out very short groupings and "Other:"
    const meaningfulGroupings = code.parentGroupings.filter(g => 
      g.length > 5 && !g.toLowerCase().startsWith('other')
    );
    if (meaningfulGroupings.length > 0) {
      parts.push(meaningfulGroupings.join(', '));
    }
  }
  
  // 3. Heading description (if we have it)
  if (code.heading) {
    const headingCode = await prisma.htsCode.findFirst({
      where: { code: code.heading, level: 'heading' },
      select: { description: true },
    });
    if (headingCode?.description) {
      parts.push(headingCode.description);
    }
  }
  
  // 4. The code's own description
  parts.push(code.description);
  
  // 5. Keywords (synonyms and related terms)
  if (code.keywords && code.keywords.length > 0) {
    parts.push(code.keywords.join(', '));
  }
  
  // Combine into a rich context string
  const context = parts.join(' | ');
  
  return context;
}

/**
 * Get or create OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required for embeddings');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Generate embedding for a single text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 */
async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });
  return response.data.map(d => d.embedding);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EMBEDDING GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate embeddings for all HTS codes that don't have them yet
 */
export async function generateAllEmbeddings(options: {
  forceRegenerate?: boolean;
  onProgress?: (processed: number, total: number) => void;
} = {}): Promise<{ processed: number; errors: number }> {
  const { forceRegenerate = false, onProgress } = options;
  
  console.log('[Embeddings] Starting embedding generation with OpenAI...');
  
  // Get codes that need embeddings
  // Note: embeddingGeneratedAt is managed via raw SQL, so we check for null embedding
  const totalCodes = await prisma.htsCode.count({
    where: { level: { in: ['tariff_line', 'statistical'] } },
  });
  
  // Check how many already have embeddings
  const withEmbeddings = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM hts_code 
    WHERE embedding IS NOT NULL 
    AND level IN ('tariff_line', 'statistical')
  `.then(r => Number(r[0].count));
  
  const needsEmbeddings = forceRegenerate ? totalCodes : totalCodes - withEmbeddings;
  console.log(`[Embeddings] Total codes: ${totalCodes}, Already embedded: ${withEmbeddings}, Need embeddings: ${needsEmbeddings}`);
  
  if (needsEmbeddings === 0) {
    console.log('[Embeddings] All codes already have embeddings!');
    return { processed: 0, errors: 0 };
  }
  
  let processed = 0;
  let errors = 0;
  
  // Process in batches
  while (processed < needsEmbeddings) {
    // Get batch of codes without embeddings
    let batch: HtsCodeForEmbedding[];
    
    if (forceRegenerate) {
      batch = await prisma.htsCode.findMany({
        where: { level: { in: ['tariff_line', 'statistical'] } },
        select: {
          code: true,
          codeFormatted: true,
          level: true,
          description: true,
          chapter: true,
          heading: true,
          keywords: true,
          parentGroupings: true,
        },
        take: BATCH_SIZE,
        skip: processed,
      }) as HtsCodeForEmbedding[];
    } else {
      // Get codes without embeddings using raw SQL
      const codesWithoutEmbeddings = await prisma.$queryRaw<{ code: string }[]>`
        SELECT code FROM hts_code 
        WHERE embedding IS NULL 
        AND level IN ('tariff_line', 'statistical')
        LIMIT ${BATCH_SIZE}
      `;
      
      if (codesWithoutEmbeddings.length === 0) break;
      
      batch = await prisma.htsCode.findMany({
        where: { code: { in: codesWithoutEmbeddings.map(c => c.code) } },
        select: {
          code: true,
          codeFormatted: true,
          level: true,
          description: true,
          chapter: true,
          heading: true,
          keywords: true,
          parentGroupings: true,
        },
      }) as HtsCodeForEmbedding[];
    }
    
    if (batch.length === 0) break;
    
    // Build contexts for batch
    const contexts: string[] = [];
    for (const code of batch) {
      try {
        const context = await buildHierarchicalContext(code);
        contexts.push(context);
      } catch (err) {
        console.error(`[Embeddings] Error building context for ${code.code}:`, err);
        contexts.push(code.description); // Fallback to just description
      }
    }
    
    // Generate embeddings for batch
    try {
      const embeddings = await generateEmbeddingsBatch(contexts);
      
      // Store embeddings in database
      for (let i = 0; i < batch.length; i++) {
        const code = batch[i];
        const embedding = embeddings[i];
        const context = contexts[i];
        
        // Use raw SQL to store vector (Prisma doesn't support pgvector natively)
        await prisma.$executeRaw`
          UPDATE hts_code 
          SET 
            embedding = ${embedding}::vector,
            embedding_context = ${context},
            embedding_generated_at = NOW()
          WHERE code = ${code.code}
        `;
      }
      
      processed += batch.length;
      
      if (onProgress) {
        onProgress(processed, needsEmbeddings);
      }
      
      console.log(`[Embeddings] Processed ${processed}/${needsEmbeddings} (${Math.round(processed/needsEmbeddings*100)}%)`);
      
    } catch (err) {
      console.error(`[Embeddings] Batch error:`, err);
      errors += batch.length;
      processed += batch.length;
    }
    
    // Rate limiting - OpenAI allows ~3000 requests/minute for embeddings
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`[Embeddings] Complete! Processed: ${processed}, Errors: ${errors}`);
  
  return { processed, errors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC SEARCH
// ═══════════════════════════════════════════════════════════════════════════════

export interface SemanticSearchResult {
  code: string;
  codeFormatted: string;
  level: string;
  description: string;
  chapter: string;
  heading: string | null;
  generalRate: string | null;
  similarity: number;
}

/**
 * Search HTS codes by semantic similarity to a query
 */
export async function searchHtsBySemantic(
  query: string,
  options: {
    limit?: number;
    minSimilarity?: number;
    chapters?: string[];
  } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 20, minSimilarity = 0.3, chapters } = options;
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  // Use pgvector for similarity search
  let results: SemanticSearchResult[];
  
  if (chapters && chapters.length > 0) {
    results = await prisma.$queryRaw<SemanticSearchResult[]>`
      SELECT 
        code,
        "codeFormatted",
        level::TEXT,
        description,
        chapter,
        heading,
        "generalRate",
        1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
      FROM hts_code
      WHERE embedding IS NOT NULL
        AND level IN ('tariff_line', 'statistical')
        AND chapter = ANY(${chapters})
        AND 1 - (embedding <=> ${queryEmbedding}::vector) > ${minSimilarity}
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;
  } else {
    results = await prisma.$queryRaw<SemanticSearchResult[]>`
      SELECT 
        code,
        "codeFormatted",
        level::TEXT,
        description,
        chapter,
        heading,
        "generalRate",
        1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
      FROM hts_code
      WHERE embedding IS NOT NULL
        AND level IN ('tariff_line', 'statistical')
        AND 1 - (embedding <=> ${queryEmbedding}::vector) > ${minSimilarity}
      ORDER BY embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;
  }
  
  return results;
}

/**
 * Dual-path search: Material + Function
 * Runs two parallel searches and finds the intersection
 * 
 * When preferredHeadings are provided, prioritize results from those headings
 * This helps guide classification to ARTICLES (containers, tableware) not RAW MATERIALS (vegetables, plants)
 */
export async function dualPathSearch(
  materialQuery: string | null,
  functionQuery: string,
  options: { limit?: number; preferredHeadings?: string[] } = {}
): Promise<SemanticSearchResult[]> {
  const { limit = 20, preferredHeadings = [] } = options;
  
  // If we have preferred headings, search within those first
  if (preferredHeadings.length > 0) {
    // Convert headings to chapters for filtering (e.g., "3924" → "39")
    const preferredChapters = [...new Set(preferredHeadings.map(h => h.slice(0, 2)))];
    
    console.log(`[dualPathSearch] Searching in preferred chapters: ${preferredChapters.join(', ')}`);
    
    // Search with chapter restriction
    const headingResults = await searchHtsBySemantic(functionQuery, {
      limit: limit * 2, // Get more candidates to filter
      minSimilarity: 0.35,
      chapters: preferredChapters,
    });
    
    // If we got good results from preferred headings, filter further
    if (headingResults.length > 0) {
      // Boost results that are in the exact preferred headings
      const boostedResults = headingResults.map(r => {
        const heading = r.code.slice(0, 4);
        const isPreferred = preferredHeadings.some(ph => heading.startsWith(ph.slice(0, 4)));
        return {
          ...r,
          similarity: isPreferred ? r.similarity * 1.2 : r.similarity, // 20% boost for exact heading match
        };
      });
      
      // Sort by boosted similarity
      boostedResults.sort((a, b) => b.similarity - a.similarity);
      
      console.log(`[dualPathSearch] Found ${boostedResults.length} results in preferred chapters`);
      return boostedResults.slice(0, limit);
    }
  }
  
  // Standard dual-path search
  const [materialResults, functionResults] = await Promise.all([
    materialQuery 
      ? searchHtsBySemantic(`${materialQuery} material products`, { limit: 30 })
      : Promise.resolve([]),
    searchHtsBySemantic(functionQuery, { limit: 30 }),
  ]);
  
  // If we have material results, find intersection with function results
  if (materialResults.length > 0) {
    const materialChapters = [...new Set(materialResults.map(r => r.chapter))];
    
    // Re-search function query limited to material-relevant chapters
    const intersectionResults = await searchHtsBySemantic(functionQuery, {
      limit,
      chapters: materialChapters,
    });
    
    if (intersectionResults.length > 0) {
      return intersectionResults;
    }
  }
  
  // Fallback to function-only results
  return functionResults.slice(0, limit);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMBEDDING STATS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getEmbeddingStats(): Promise<{
  totalCodes: number;
  withEmbeddings: number;
  pendingEmbeddings: number;
  coverage: string;
}> {
  const [total, withEmbeddings] = await Promise.all([
    prisma.htsCode.count({
      where: { level: { in: ['tariff_line', 'statistical'] } },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM hts_code 
      WHERE embedding IS NOT NULL 
      AND level IN ('tariff_line', 'statistical')
    `.then(r => Number(r[0].count)),
  ]);
  
  const pending = total - withEmbeddings;
  const coverage = total > 0 ? `${Math.round(withEmbeddings / total * 100)}%` : '0%';
  
  return {
    totalCodes: total,
    withEmbeddings,
    pendingEmbeddings: pending,
    coverage,
  };
}
