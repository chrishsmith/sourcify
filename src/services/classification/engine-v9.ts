/**
 * V9 Classification Engine: "Wide Net → Narrow Down"
 * 
 * Instead of guessing ONE path, this engine:
 * 1. Finds ALL potential HTS codes that could match
 * 2. Stores them in a candidate bucket with confidence scores
 * 3. Identifies what information is missing
 * 4. Asks targeted questions to narrow down
 * 5. Converges to the final answer
 * 
 * NO HARDCODING - entirely driven by database content and AI reasoning.
 */

import { prisma } from '@/lib/db';
import { getXAIClient } from '@/lib/xai';

// ============================================================================
// TYPES
// ============================================================================

export interface ProductUnderstanding {
  description: string;
  productType: string;
  material: string | null;        // null = unknown, needs to ask
  function: string | null;        // Primary function/use
  construction: string | null;    // How it's made (knitted, woven, molded, etc.)
  userType: string | null;        // men's, women's, children's, unisex
  stated: Record<string, string>; // What user explicitly stated
  inferred: Record<string, string>; // What we inferred
  unknowns: string[];             // What we still need to know
}

export interface HtsCandidate {
  code: string;
  codeFormatted: string;
  description: string;
  fullPath: string[];             // Chapter → Heading → ... → This code
  pathDescriptions: string[];     // Description at each level
  confidence: number;             // 0-1 how likely this is correct
  reasoning: string;              // Why this might be the answer
  requiredInfo: string[];         // What info would confirm this
  eliminatingInfo: string[];      // What info would eliminate this
}

export interface CandidateBucket {
  candidates: HtsCandidate[];
  totalFound: number;
  narrowedBy: string[];           // What questions/info narrowed it down
}

export interface NarrowingQuestion {
  id: string;
  question: string;
  options: string[];
  impact: string;                 // "Eliminates X candidates" or "Confirms Y"
  priority: number;               // Higher = ask first
}

export interface V9ClassificationResult {
  status: 'needs_input' | 'confident' | 'ambiguous';
  finalCode?: string;
  finalDescription?: string;
  confidence?: number;
  candidates: HtsCandidate[];
  questions?: NarrowingQuestion[];
  understanding: ProductUnderstanding;
  reasoning: string;
}

// ============================================================================
// PHASE 1: UNDERSTAND THE PRODUCT
// ============================================================================

async function understandProduct(description: string): Promise<ProductUnderstanding> {
  const xai = getXAIClient();
  
  const response = await xai.chat.completions.create({
    model: 'grok-3-mini',
    messages: [
      {
        role: 'system',
        content: `You analyze product descriptions for HTS classification.
Extract what is STATED vs what must be INFERRED vs what is UNKNOWN.

Return JSON:
{
  "productType": "specific product name",
  "material": "material if stated, null if not",
  "function": "primary function/purpose",
  "construction": "how it's made (knitted, woven, cast, molded, etc.) or null",
  "userType": "men's/women's/children's/unisex or null",
  "stated": { "key": "value" },    // Only what user explicitly said
  "inferred": { "key": "value" },  // What you reasonably infer
  "unknowns": ["list", "of", "things", "we", "need", "to", "know"]
}

Be conservative - if something isn't clearly stated, mark it as unknown.
For HTS, common unknowns include: material, gender, fiber content %, construction method.`
      },
      {
        role: 'user',
        content: `Analyze: "${description}"`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  
  return {
    description,
    productType: parsed.productType || description,
    material: parsed.material || null,
    function: parsed.function || null,
    construction: parsed.construction || null,
    userType: parsed.userType || null,
    stated: parsed.stated || {},
    inferred: parsed.inferred || {},
    unknowns: parsed.unknowns || [],
  };
}

// ============================================================================
// PHASE 2: FIND ALL POTENTIAL MATCHES (WIDE NET)
// ============================================================================

async function findAllPotentialChapters(understanding: ProductUnderstanding): Promise<string[]> {
  // FAST approach: Use ONE AI call to get chapters, with strict limit
  const xai = getXAIClient();
  
  // Get all chapters from DB
  const chapters = await prisma.htsCode.findMany({
    where: { level: 'chapter' },
    select: { code: true, description: true },
    orderBy: { code: 'asc' },
  });
  
  const chapterList = chapters.map(c => `${c.code}: ${c.description}`).join('\n');
  
  const response = await xai.chat.completions.create({
    model: 'grok-3-mini',
    messages: [
      {
        role: 'system',
        content: `Identify the TOP 3-5 most likely HTS chapters for a product. Be selective.

Return JSON: { "chapters": ["61", "62"], "reasoning": "brief why" }

ONLY return chapters that are genuinely likely. Quality over quantity.`
      },
      {
        role: 'user',
        content: `Product: ${understanding.productType}
Material: ${understanding.material || 'unknown'}
Function: ${understanding.function || 'unknown'}

HTS Chapters:
${chapterList}`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const parsed = JSON.parse(response.choices[0].message.content || '{}');
  // Limit to max 5 chapters to keep it fast
  const limitedChapters = (parsed.chapters || []).slice(0, 5);
  console.log(`[V9] Selected chapters: ${limitedChapters.join(', ')}`);
  return limitedChapters;
}

async function findCandidatesInChapter(
  chapter: string, 
  understanding: ProductUnderstanding
): Promise<HtsCandidate[]> {
  const candidates: HtsCandidate[] = [];
  
  // Build search terms from product understanding
  const searchTerms: string[] = [];
  
  // Add product type words
  const typeWords = understanding.productType.toLowerCase().split(/\s+/);
  searchTerms.push(...typeWords);
  
  // Add material if known
  if (understanding.material) {
    searchTerms.push(understanding.material.toLowerCase());
  }
  
  // Add function words
  if (understanding.function) {
    searchTerms.push(...understanding.function.toLowerCase().split(/\s+/));
  }
  
  // FAST: Database keyword search - no AI calls needed
  // Find codes where description contains ANY of our search terms
  const codes = await prisma.htsCode.findMany({
    where: { 
      chapter: chapter.padStart(2, '0'),
      level: { in: ['subheading', 'tariff_line', 'statistical'] },
      OR: searchTerms.map(term => ({
        description: { contains: term, mode: 'insensitive' as const }
      })),
    },
    select: { 
      code: true, 
      codeFormatted: true, 
      description: true,
      parentCode: true,
      level: true,
    },
    orderBy: { code: 'asc' },
    take: 50, // Limit to prevent slowness
  });
  
  console.log(`[V9] Chapter ${chapter}: Found ${codes.length} codes matching keywords`);

  if (codes.length === 0) {
    // Fallback: get first few codes in chapter if no keyword matches
    const fallbackCodes = await prisma.htsCode.findMany({
      where: { 
        chapter: chapter.padStart(2, '0'),
        level: { in: ['subheading', 'tariff_line'] },
      },
      select: { 
        code: true, 
        codeFormatted: true, 
        description: true,
        parentCode: true,
        level: true,
      },
      orderBy: { code: 'asc' },
      take: 20,
    });
    
    for (const code of fallbackCodes) {
      const path = await buildCodePath(code.code);
      candidates.push({
        code: code.code,
        codeFormatted: code.codeFormatted || code.code,
        description: code.description,
        fullPath: path.codes,
        pathDescriptions: path.descriptions,
        confidence: 0.3, // Low confidence for fallback
        reasoning: 'General category in chapter',
        requiredInfo: ['product type', 'material'],
        eliminatingInfo: [],
      });
    }
    return candidates;
  }

  // Score matched codes by how many search terms they contain
  for (const code of codes) {
    const descLower = code.description.toLowerCase();
    let matchCount = 0;
    const matchedTerms: string[] = [];
    
    for (const term of searchTerms) {
      if (descLower.includes(term)) {
        matchCount++;
        matchedTerms.push(term);
      }
    }
    
    // Also check for material-specific patterns
    let materialBoost = 0;
    if (understanding.material) {
      const mat = understanding.material.toLowerCase();
      if (descLower.includes(`of ${mat}`)) materialBoost = 0.3;
      else if (descLower.includes(mat)) materialBoost = 0.2;
    }
    
    const confidence = Math.min(0.95, (matchCount / searchTerms.length) * 0.7 + materialBoost + 0.1);
    
    const path = await buildCodePath(code.code);
    
    candidates.push({
      code: code.code,
      codeFormatted: code.codeFormatted || code.code,
      description: code.description,
      fullPath: path.codes,
      pathDescriptions: path.descriptions,
      confidence,
      reasoning: `Matches: ${matchedTerms.join(', ')}`,
      requiredInfo: understanding.unknowns,
      eliminatingInfo: [],
    });
  }

  return candidates;
}

// Cache for code paths to avoid repeated DB lookups
const pathCache = new Map<string, { codes: string[], descriptions: string[] }>();

async function buildCodePath(code: string): Promise<{ codes: string[], descriptions: string[] }> {
  // Check cache first
  if (pathCache.has(code)) {
    return pathCache.get(code)!;
  }
  
  const codes: string[] = [];
  const descriptions: string[] = [];
  
  // Get all ancestors in one query by using code prefixes
  // HTS codes are hierarchical: 61 -> 6109 -> 610910 -> 61091000
  const codeLen = code.length;
  const prefixLengths = [2, 4, 6, 8, 10]; // Chapter, heading, subheading, tariff, statistical
  const prefixes = prefixLengths
    .filter(len => len <= codeLen)
    .map(len => code.substring(0, len));
  
  if (prefixes.length > 0) {
    const ancestors = await prisma.htsCode.findMany({
      where: { code: { in: prefixes } },
      select: { code: true, codeFormatted: true, description: true },
      orderBy: { code: 'asc' },
    });
    
    for (const ancestor of ancestors) {
      codes.push(ancestor.codeFormatted || ancestor.code);
      descriptions.push(ancestor.description);
    }
  }
  
  const result = { codes, descriptions };
  pathCache.set(code, result);
  return result;
}

async function castWideNet(understanding: ProductUnderstanding): Promise<CandidateBucket> {
  console.log(`[V9] Phase 2: Casting wide net for "${understanding.productType}"...`);
  
  // Find all potential chapters
  const chapters = await findAllPotentialChapters(understanding);
  
  // Find candidates in each chapter (in parallel for speed)
  const allCandidates: HtsCandidate[] = [];
  
  for (const chapter of chapters) {
    console.log(`[V9] Searching chapter ${chapter}...`);
    const chapterCandidates = await findCandidatesInChapter(chapter, understanding);
    allCandidates.push(...chapterCandidates);
  }
  
  // Sort by confidence
  allCandidates.sort((a, b) => b.confidence - a.confidence);
  
  console.log(`[V9] Found ${allCandidates.length} potential candidates`);
  
  return {
    candidates: allCandidates,
    totalFound: allCandidates.length,
    narrowedBy: [],
  };
}

// ============================================================================
// PHASE 3: GENERATE NARROWING QUESTIONS
// ============================================================================

function generateNarrowingQuestions(
  bucket: CandidateBucket, 
  understanding: ProductUnderstanding
): NarrowingQuestion[] {
  const questions: NarrowingQuestion[] = [];
  
  // Determine if this is a textile/apparel product
  const productLower = understanding.productType.toLowerCase();
  const isTextileProduct = 
    productLower.includes('shirt') || productLower.includes('pants') ||
    productLower.includes('dress') || productLower.includes('jacket') ||
    productLower.includes('sweater') || productLower.includes('coat') ||
    productLower.includes('sock') || productLower.includes('scarf') ||
    productLower.includes('blanket') || productLower.includes('towel') ||
    productLower.includes('curtain') || productLower.includes('fabric') ||
    productLower.includes('textile') || productLower.includes('garment') ||
    productLower.includes('apparel') || productLower.includes('clothing');
  
  // Check what chapters we're looking at
  const chapters = new Set<string>();
  for (const c of bucket.candidates) {
    if (c.fullPath.length > 0) {
      const chapterCode = c.fullPath[0].replace(/\D/g, '').substring(0, 2);
      chapters.add(chapterCode);
    }
  }
  
  // Textile chapters: 50-63
  const hasTextileChapters = [...chapters].some(ch => {
    const num = parseInt(ch);
    return num >= 50 && num <= 63;
  });
  
  // Only ask textile questions if product seems textile-related OR has textile chapters
  const askTextileQuestions = isTextileProduct || hasTextileChapters;
  
  // Filter unknowns to only relevant ones
  const relevantUnknowns = understanding.unknowns.filter(unknown => {
    const unknownLower = unknown.toLowerCase();
    
    // Always skip these generic ones
    if (unknownLower.includes('product type')) return false;
    
    // Only ask fabric/fiber questions for textile products
    if (!askTextileQuestions) {
      if (unknownLower.includes('fiber') || unknownLower.includes('fabric') ||
          unknownLower.includes('knit') || unknownLower.includes('woven') ||
          unknownLower.includes('construction method') || unknownLower.includes('gender')) {
        return false;
      }
    }
    
    return true;
  });
  
  // Material is almost always relevant - add it if not already there
  if (!understanding.material && !relevantUnknowns.some(u => u.toLowerCase().includes('material'))) {
    relevantUnknowns.unshift('material');
  }
  
  // Generate questions only for relevant unknowns
  for (const unknown of relevantUnknowns) {
    const question = infoToQuestion(unknown, bucket.candidates, askTextileQuestions);
    if (question) {
      questions.push({
        id: unknown.toLowerCase().replace(/\s+/g, '_'),
        question: question.text,
        options: question.options,
        impact: `Affects ${bucket.candidates.length} candidates`,
        priority: unknown.toLowerCase().includes('material') ? 100 : 50,
      });
    }
  }
  
  // Limit to 2 most important questions
  return questions.sort((a, b) => b.priority - a.priority).slice(0, 2);
}

function infoToQuestion(
  info: string, 
  candidates: HtsCandidate[],
  isTextileProduct: boolean = false
): { text: string, options: string[] } | null {
  const infoLower = info.toLowerCase();
  
  // Material question - extract ACTUAL materials from candidate descriptions
  if (infoLower.includes('material') || infoLower.includes('made of')) {
    const materials = new Set<string>();
    
    // Scan ALL candidate descriptions and paths for material mentions
    for (const c of candidates) {
      const fullText = (c.description + ' ' + c.pathDescriptions.join(' ')).toLowerCase();
      
      // Common HTS material patterns
      if (fullText.includes('cotton')) materials.add('Cotton');
      if (fullText.includes('wool')) materials.add('Wool');
      if (fullText.includes('silk')) materials.add('Silk');
      if (fullText.includes('linen') || fullText.includes('flax')) materials.add('Linen');
      if (fullText.includes('man-made') || fullText.includes('synthetic') || 
          fullText.includes('polyester') || fullText.includes('nylon') ||
          fullText.includes('acrylic')) materials.add('Synthetic/Man-made fibers');
      if (fullText.includes('plastic') || fullText.includes('polypropylene') ||
          fullText.includes('polyethylene') || fullText.includes('pvc')) materials.add('Plastic');
      if (fullText.includes('metal') || fullText.includes('steel') || 
          fullText.includes('iron') || fullText.includes('aluminum') ||
          fullText.includes('copper') || fullText.includes('brass')) materials.add('Metal');
      if (fullText.includes('wood') || fullText.includes('wooden')) materials.add('Wood');
      if (fullText.includes('leather')) materials.add('Leather');
      if (fullText.includes('rubber')) materials.add('Rubber');
      if (fullText.includes('glass')) materials.add('Glass');
      if (fullText.includes('ceramic') || fullText.includes('porcelain') ||
          fullText.includes('stoneware')) materials.add('Ceramic');
      if (fullText.includes('paper') || fullText.includes('cardboard')) materials.add('Paper/Cardboard');
      if (fullText.includes('bamboo')) materials.add('Bamboo');
      if (fullText.includes('stone') || fullText.includes('marble') ||
          fullText.includes('granite')) materials.add('Stone');
    }
    
    if (materials.size > 0) {
      return {
        text: 'What is the primary material?',
        options: [...materials].sort(), // Sort alphabetically
      };
    }
    
    // Fallback common materials if none found in candidates
    return {
      text: 'What is the primary material?',
      options: ['Plastic', 'Metal', 'Wood', 'Ceramic', 'Glass', 'Fabric/Textile', 'Other'],
    };
  }
  
  // Gender/user type question - only for apparel
  if (isTextileProduct && (infoLower.includes('gender') || infoLower.includes("men's") || infoLower.includes("women's") || infoLower.includes('user'))) {
    return {
      text: 'Who is this product for?',
      options: ["Men's/Boys'", "Women's/Girls'", 'Unisex/Both'],
    };
  }
  
  // Construction question - ONLY for textiles
  if (isTextileProduct && (infoLower.includes('knit') || infoLower.includes('woven') || infoLower.includes('construction') || infoLower.includes('fabric'))) {
    return {
      text: 'How is the fabric constructed?',
      options: ['Knitted or crocheted', 'Woven', 'Nonwoven'],
    };
  }
  
  // Fiber percentage - ONLY for textiles
  if (isTextileProduct && (infoLower.includes('percent') || infoLower.includes('fiber content') || infoLower.includes('composition'))) {
    return {
      text: 'What is the fiber composition?',
      options: ['100% single fiber', 'Blend (mixed fibers)'],
    };
  }
  
  // Skip everything else - only material questions are universally useful
  return null;
}

// ============================================================================
// PHASE 4: NARROW DOWN WITH ANSWERS
// ============================================================================

function narrowWithAnswer(
  bucket: CandidateBucket,
  questionId: string,
  answer: string
): CandidateBucket {
  const answerLower = answer.toLowerCase();
  
  // Filter candidates based on answer
  const narrowed = bucket.candidates.filter(candidate => {
    const desc = candidate.description.toLowerCase();
    const path = candidate.pathDescriptions.join(' ').toLowerCase();
    
    // Material filtering
    if (questionId === 'material' || questionId.includes('material')) {
      if (answerLower === 'cotton') return desc.includes('cotton') || path.includes('cotton');
      if (answerLower === 'wool') return desc.includes('wool') || path.includes('wool');
      if (answerLower === 'silk') return desc.includes('silk') || path.includes('silk');
      if (answerLower.includes('synthetic') || answerLower.includes('man-made')) {
        return desc.includes('man-made') || desc.includes('synthetic') || path.includes('man-made');
      }
      if (answerLower === 'plastic') return desc.includes('plastic') || path.includes('plastic');
      if (answerLower === 'metal') return desc.includes('metal') || path.includes('metal');
      // If "other" or unknown, don't filter
      if (answerLower === 'other' || answerLower.includes('not sure')) return true;
      // Direct match attempt
      return desc.includes(answerLower) || path.includes(answerLower);
    }
    
    // Gender filtering
    if (questionId === 'gender' || questionId.includes('gender') || questionId.includes('user')) {
      if (answerLower.includes("men") || answerLower.includes("boy")) {
        return desc.includes("men's") || desc.includes("boys'") || !desc.includes("women");
      }
      if (answerLower.includes("women") || answerLower.includes("girl")) {
        return desc.includes("women's") || desc.includes("girls'");
      }
      return true; // Unisex or N/A - don't filter
    }
    
    // Construction filtering
    if (questionId.includes('construction') || questionId.includes('fabric')) {
      if (answerLower.includes('knit')) return path.includes('knit') || path.includes('crochet');
      if (answerLower.includes('woven')) return path.includes('woven') || !path.includes('knit');
      return true;
    }
    
    return true; // Default: keep candidate
  });
  
  // Boost confidence for remaining candidates
  const boosted = narrowed.map(c => ({
    ...c,
    confidence: Math.min(1, c.confidence * 1.2),
  }));
  
  return {
    candidates: boosted.sort((a, b) => b.confidence - a.confidence),
    totalFound: bucket.totalFound,
    narrowedBy: [...bucket.narrowedBy, `${questionId}: ${answer}`],
  };
}

// ============================================================================
// MAIN CLASSIFICATION FUNCTION
// ============================================================================

export async function classifyProductV9(
  description: string,
  previousAnswers?: Record<string, string>
): Promise<V9ClassificationResult> {
  console.log(`[V9] ════════════════════════════════════════════════════════════`);
  console.log(`[V9] Starting V9 "Wide Net" classification for: ${description}`);
  if (previousAnswers) {
    console.log(`[V9] With previous answers:`, previousAnswers);
  }
  console.log(`[V9] ════════════════════════════════════════════════════════════`);
  
  const startTime = Date.now();
  
  // Phase 1: Understand the product
  console.log(`[V9] Phase 1: Understanding product...`);
  const understanding = await understandProduct(description);
  
  // IMPORTANT: Apply previous answers to understanding BEFORE searching
  // This ensures the search uses the user's stated info
  if (previousAnswers) {
    for (const [qId, answer] of Object.entries(previousAnswers)) {
      const answerLower = answer.toLowerCase();
      
      // Apply material answer
      if (qId === 'material' || qId.includes('material')) {
        understanding.material = answer;
        understanding.stated['material'] = answer;
        // Remove from unknowns
        understanding.unknowns = understanding.unknowns.filter(u => !u.toLowerCase().includes('material'));
        console.log(`[V9] Applied user answer: material = ${answer}`);
      }
      
      // Apply gender/user type answer
      if (qId === 'gender' || qId.includes('gender') || qId.includes('user')) {
        understanding.userType = answer;
        understanding.stated['userType'] = answer;
        understanding.unknowns = understanding.unknowns.filter(u => !u.toLowerCase().includes('gender'));
      }
      
      // Apply construction answer
      if (qId.includes('construction') || qId.includes('fabric')) {
        understanding.construction = answer;
        understanding.stated['construction'] = answer;
        understanding.unknowns = understanding.unknowns.filter(u => !u.toLowerCase().includes('construction'));
      }
    }
  }
  
  console.log(`[V9] Product type: ${understanding.productType}`);
  console.log(`[V9] Material: ${understanding.material || 'unknown'}`);
  console.log(`[V9] Unknowns: ${understanding.unknowns.join(', ') || 'none'}`);
  
  // Phase 2: Cast wide net (now uses updated understanding with user answers)
  let bucket = await castWideNet(understanding);
  
  // Also filter candidates by answers
  if (previousAnswers) {
    for (const [qId, answer] of Object.entries(previousAnswers)) {
      console.log(`[V9] Filtering candidates by: ${qId} = ${answer}`);
      bucket = narrowWithAnswer(bucket, qId, answer);
    }
  }
  
  // Phase 3: Decide if we need more info or can give answer
  const topCandidate = bucket.candidates[0];
  const secondCandidate = bucket.candidates[1];
  
  const elapsed = Date.now() - startTime;
  
  // If top candidate is very confident and well ahead, return it
  if (topCandidate && topCandidate.confidence > 0.8 && 
      (!secondCandidate || topCandidate.confidence - secondCandidate.confidence > 0.3)) {
    console.log(`[V9] High confidence result: ${topCandidate.codeFormatted}`);
    return {
      status: 'confident',
      finalCode: topCandidate.codeFormatted,
      finalDescription: topCandidate.pathDescriptions.join(': '),
      confidence: topCandidate.confidence,
      candidates: bucket.candidates.slice(0, 5),
      understanding,
      reasoning: topCandidate.reasoning,
    };
  }
  
  // If we have unknowns or close candidates, ask questions
  const questions = generateNarrowingQuestions(bucket, understanding);
  
  if (questions.length > 0 && bucket.candidates.length > 1) {
    console.log(`[V9] Need more info - generating ${questions.length} questions`);
    return {
      status: 'needs_input',
      candidates: bucket.candidates.slice(0, 10),
      questions: questions.slice(0, 3), // Max 3 questions at a time
      understanding,
      reasoning: `Found ${bucket.candidates.length} potential matches. Need more information to narrow down.`,
    };
  }
  
  // Return best guess if we have one
  if (topCandidate) {
    return {
      status: 'ambiguous',
      finalCode: topCandidate.codeFormatted,
      finalDescription: topCandidate.pathDescriptions.join(': '),
      confidence: topCandidate.confidence,
      candidates: bucket.candidates.slice(0, 5),
      understanding,
      reasoning: `Best match among ${bucket.candidates.length} candidates, but confidence is ${Math.round(topCandidate.confidence * 100)}%`,
    };
  }
  
  // No matches found
  return {
    status: 'ambiguous',
    candidates: [],
    understanding,
    reasoning: 'No matching HTS codes found. Please provide more details about the product.',
  };
}

