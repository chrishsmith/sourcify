/**
 * AI Chapter Selector - The Robust Solution
 * 
 * Instead of hardcoded patterns, this uses AI to select the appropriate
 * HTS chapter by reading actual chapter descriptions from the database.
 * 
 * @module aiChapterSelector
 * @created December 27, 2025
 */

import { prisma } from '@/lib/db';
import { getXAIClient } from '@/lib/xai';

// Cache chapter descriptions to avoid repeated DB calls
let chapterCache: { code: string; description: string }[] | null = null;

/**
 * Get all HTS chapter descriptions from database
 */
async function getChapterDescriptions(): Promise<{ code: string; description: string }[]> {
  if (chapterCache) return chapterCache;
  
  const chapters = await prisma.htsCode.findMany({
    where: { level: 'chapter' },
    select: { code: true, description: true },
    orderBy: { code: 'asc' },
  });
  
  chapterCache = chapters.map(c => ({
    code: c.code.padStart(2, '0'),
    description: c.description,
  }));
  
  return chapterCache;
}

/**
 * Get all headings for a specific chapter from database
 */
async function getHeadingsForChapter(chapter: string): Promise<{ code: string; description: string }[]> {
  const headings = await prisma.htsCode.findMany({
    where: { 
      level: 'heading',
      chapter: chapter.padStart(2, '0'),
    },
    select: { code: true, codeFormatted: true, description: true },
    orderBy: { code: 'asc' },
  });
  
  return headings.map(h => ({
    code: h.code,
    description: h.description,
  }));
}

export interface ProductInfo {
  description: string;
  material?: string;
  use?: string;
  productType?: string;
}

export interface ChapterSelection {
  chapter: string;
  chapterName: string;
  confidence: number;
  reasoning: string;
}

export interface HeadingSelection {
  heading: string;
  headingName: string;
  confidence: number;
  reasoning: string;
}

/**
 * Use AI to select the most appropriate HTS chapter for a product.
 * This is the core of the robust solution - AI reads actual HTS data.
 */
export async function selectChapterWithAI(product: ProductInfo): Promise<ChapterSelection> {
  const xai = getXAIClient();
  const chapters = await getChapterDescriptions();
  
  // Format chapters for the prompt
  const chapterList = chapters
    .map(c => `${c.code}: ${c.description}`)
    .join('\n');
  
  const prompt = `You are a U.S. Customs HTS classification expert.

PRODUCT TO CLASSIFY:
"${product.description}"
${product.material ? `Material: ${product.material}` : ''}
${product.use ? `Use: ${product.use}` : ''}

YOUR TASK: Select the SINGLE most appropriate HTS chapter for this product.

HTS CHAPTERS:
${chapterList}

CLASSIFICATION RULES:
1. Match the product's PRIMARY FUNCTION and NATURE to the chapter description
2. Electronics/electrical equipment → Chapter 84 or 85
3. Textiles/clothing → Chapters 50-63
4. Plastics → Chapter 39 (only if NOT a more specific chapter applies)
5. Metals → Chapters 72-83 based on metal type
6. The chapter description should DIRECTLY describe what the product IS

IMPORTANT: Many products could fit multiple chapters. Choose based on:
- What the product IS (function/purpose) over what it's made of (material)
- Electrical/electronic items go to 84/85 even if made of plastic
- Furniture goes to 94 regardless of material
- Toys go to 95 regardless of material

Return ONLY this JSON (no other text):
{
  "chapter": "XX",
  "reasoning": "Brief explanation of why this chapter",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an HTS classification expert. Return ONLY valid JSON. Select the chapter that best matches the product\'s primary function and nature.' 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON in AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const chapterCode = parsed.chapter?.toString().padStart(2, '0') || '99';
    const chapterInfo = chapters.find(c => c.code === chapterCode);
    
    return {
      chapter: chapterCode,
      chapterName: chapterInfo?.description || 'Unknown',
      confidence: parsed.confidence || 0.7,
      reasoning: parsed.reasoning || 'AI selection',
    };
  } catch (error) {
    console.error('[AIChapterSelector] Error:', error);
    // Fallback to chapter 99 (special classification provisions)
    return {
      chapter: '99',
      chapterName: 'Special classification provisions',
      confidence: 0.3,
      reasoning: 'Fallback due to error',
    };
  }
}

/**
 * Use AI to select the most appropriate heading within a chapter.
 * When material is known, also searches subheadings for material-specific codes.
 * NO HARDCODING - uses generic string matching against HTS descriptions.
 */
export async function selectHeadingWithAI(
  chapter: string, 
  product: ProductInfo
): Promise<HeadingSelection> {
  const xai = getXAIClient();
  
  // If material is known, search ALL levels (heading + subheading) for material match
  // This is generic - works for ANY material against ANY HTS description
  const hasMaterial = product.material && product.material !== 'unknown';
  
  const codes = await prisma.htsCode.findMany({
    where: { 
      chapter: chapter.padStart(2, '0'),
      level: hasMaterial ? { in: ['heading', 'subheading'] } : 'heading',
    },
    select: { code: true, codeFormatted: true, description: true, level: true },
    orderBy: { code: 'asc' },
  });
  
  if (codes.length === 0) {
    throw new Error(`No codes found for chapter ${chapter}`);
  }
  
  // GENERIC material matching - no hardcoded materials or chapters
  // Simply checks if the HTS description mentions the material
  if (hasMaterial) {
    const materialLower = product.material!.toLowerCase();
    
    // Generic patterns that work for ANY material
    const materialPatterns = [
      `of ${materialLower}`,           // "Of cotton", "Of wool", "Of silk"
      `${materialLower},`,             // "Cotton, knitted"
      `${materialLower} `,             // "Cotton blend"
      `: ${materialLower}`,            // ": cotton"
    ];
    
    for (const code of codes) {
      const descLower = code.description.toLowerCase();
      
      // Check if ANY pattern matches - completely generic
      const matches = materialPatterns.some(pattern => descLower.includes(pattern));
      
      if (matches) {
        console.log(`[AIChapterSelector] Material match: "${product.material}" found in ${code.codeFormatted} - "${code.description}"`);
        return {
          heading: code.code,
          headingName: code.description,
          confidence: 0.95,
          reasoning: `Material "${product.material}" found in HTS description`,
        };
      }
    }
    
    console.log(`[AIChapterSelector] No direct material match for "${product.material}" - falling back to AI`);
  }
  
  // Filter to just headings for AI selection
  const headings = codes.filter(c => c.level === 'heading');
  
  if (headings.length === 0) {
    throw new Error(`No headings found for chapter ${chapter}`);
  }
  
  // Format headings for the prompt
  const headingList = headings
    .map(h => `${h.code}: ${h.description}`)
    .join('\n');
  
  const prompt = `You are a U.S. Customs HTS classification expert.

PRODUCT TO CLASSIFY:
"${product.description}"
${product.material ? `Material: ${product.material}` : ''}
${product.use ? `Use: ${product.use}` : ''}

CHAPTER: ${chapter}

YOUR TASK: Select the SINGLE most appropriate heading within this chapter.

HEADINGS IN CHAPTER ${chapter}:
${headingList}

CLASSIFICATION RULES:
1. Select the MOST SPECIFIC heading that matches the product
2. Avoid catch-all "Other" headings if a specific one matches
3. Read each heading description carefully
4. Match product function/type to heading description

Return ONLY this JSON (no other text):
{
  "heading": "XXXX",
  "reasoning": "Brief explanation of why this heading",
  "confidence": 0.0-1.0
}`;

  try {
    const response = await xai.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are an HTS classification expert. Return ONLY valid JSON. Select the most specific heading that matches the product.' 
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });
    
    const content = response.choices[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('No JSON in AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    const headingCode = parsed.heading?.toString() || headings[0].code;
    const headingInfo = headings.find(h => h.code === headingCode || h.code.startsWith(headingCode));
    
    return {
      heading: headingInfo?.code || headingCode,
      headingName: headingInfo?.description || 'Unknown',
      confidence: parsed.confidence || 0.7,
      reasoning: parsed.reasoning || 'AI selection',
    };
  } catch (error) {
    console.error('[AIChapterSelector] Heading selection error:', error);
    // Fallback to first heading
    return {
      heading: headings[0].code,
      headingName: headings[0].description,
      confidence: 0.4,
      reasoning: 'Fallback to first heading due to error',
    };
  }
}

/**
 * Full AI-driven chapter and heading selection.
 * This is the main entry point for robust classification routing.
 */
export async function selectChapterAndHeading(product: ProductInfo): Promise<{
  chapter: ChapterSelection;
  heading: HeadingSelection;
}> {
  console.log('[AIChapterSelector] Selecting chapter for:', product.description);
  
  // Step 1: AI selects chapter
  const chapter = await selectChapterWithAI(product);
  console.log('[AIChapterSelector] Selected chapter:', chapter.chapter, '-', chapter.chapterName);
  
  // Step 2: AI selects heading within that chapter
  const heading = await selectHeadingWithAI(chapter.chapter, product);
  console.log('[AIChapterSelector] Selected heading:', heading.heading, '-', heading.headingName);
  
  return { chapter, heading };
}

