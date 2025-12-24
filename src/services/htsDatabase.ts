/**
 * HTS Database Service
 * 
 * Provides fast, local queries against our HTS code database.
 * Data is synced from USITC Excel publications.
 * 
 * @see docs/ARCHITECTURE_HTS_CLASSIFICATION.md
 */

import { prisma } from '@/lib/db';
import { HtsLevel, Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface HtsCodeResult {
  code: string;
  codeFormatted: string;
  level: HtsLevel;
  description: string;
  indent: number;
  generalRate: string | null;
  specialRates: string | null;
  column2Rate: string | null;
  units: string | null;
  adValoremRate: number | null;
  specificRate: number | null;
  keywords: string[];
}

export interface HtsHierarchyNode {
  code: string;
  codeFormatted: string;
  level: HtsLevel;
  description: string;
  generalRate: string | null;
  children?: HtsHierarchyNode[];
}

export interface HtsSearchResult {
  code: string;
  codeFormatted: string;
  level: HtsLevel;
  description: string;
  generalRate: string | null;
  matchScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE FORMATTING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Remove dots from HTS code for storage/comparison
 * "6109.10.00.12" → "6109100012"
 */
export function normalizeHtsCode(code: string): string {
  return code.replace(/\./g, '').replace(/\s/g, '');
}

/**
 * Format HTS code with dots for display
 * "6109100012" → "6109.10.00.12"
 */
export function formatHtsCode(code: string): string {
  const clean = normalizeHtsCode(code);
  
  if (clean.length <= 2) return clean;                                    // Chapter: "61"
  if (clean.length <= 4) return clean;                                    // Heading: "6109"
  if (clean.length <= 6) return `${clean.slice(0, 4)}.${clean.slice(4)}`; // Subheading: "6109.10"
  if (clean.length <= 8) return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6)}`; // Tariff line: "6109.10.00"
  
  // Statistical suffix: "6109.10.00.12"
  return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 8)}.${clean.slice(8)}`;
}

/**
 * Determine HTS level from code length
 */
export function getHtsLevel(code: string): HtsLevel {
  const clean = normalizeHtsCode(code);
  
  if (clean.length <= 2) return 'chapter';
  if (clean.length <= 4) return 'heading';
  if (clean.length <= 6) return 'subheading';
  if (clean.length <= 8) return 'tariff_line';
  return 'statistical';
}

/**
 * Extract parent code from HTS code
 * "6109100012" → "61091000"
 * "61091000" → "610910"
 */
export function getParentCode(code: string): string | null {
  const clean = normalizeHtsCode(code);
  
  if (clean.length <= 2) return null;       // Chapter has no parent
  if (clean.length <= 4) return clean.slice(0, 2);  // Heading → Chapter
  if (clean.length <= 6) return clean.slice(0, 4);  // Subheading → Heading
  if (clean.length <= 8) return clean.slice(0, 6);  // Tariff line → Subheading
  return clean.slice(0, 8);                 // Statistical → Tariff line
}

/**
 * Extract hierarchy components from code
 */
export function parseHtsCode(code: string): {
  chapter: string;
  heading: string | null;
  subheading: string | null;
  tariffLine: string | null;
  statistical: string | null;
} {
  const clean = normalizeHtsCode(code);
  
  return {
    chapter: clean.slice(0, 2),
    heading: clean.length >= 4 ? clean.slice(0, 4) : null,
    subheading: clean.length >= 6 ? clean.slice(0, 6) : null,
    tariffLine: clean.length >= 8 ? clean.slice(0, 8) : null,
    statistical: clean.length >= 10 ? clean : null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE PARSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse duty rate string to extract ad valorem percentage
 * "16.5%" → 16.5
 * "Free" → 0
 * "2.4¢/kg + 5.6%" → 5.6
 * "5%" → 5
 */
export function parseAdValoremRate(rateString: string | null): number | null {
  if (!rateString) return null;
  
  const cleaned = rateString.trim().toLowerCase();
  
  if (cleaned === 'free') return 0;
  
  // Look for percentage pattern
  const percentMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    return parseFloat(percentMatch[1]);
  }
  
  return null;
}

/**
 * Parse specific duty (per-unit) from rate string
 * "2.4¢/kg" → { amount: 0.024, unit: "kg" }
 * "5.3¢/doz" → { amount: 0.053, unit: "doz" }
 */
export function parseSpecificRate(rateString: string | null): { amount: number; unit: string } | null {
  if (!rateString) return null;
  
  // Look for cent pattern: "X.X¢/unit" or "X.X cents/unit"
  const centMatch = rateString.match(/(\d+(?:\.\d+)?)\s*[¢c](?:ents?)?\s*\/?\s*(\w+)/i);
  if (centMatch) {
    return {
      amount: parseFloat(centMatch[1]) / 100,  // Convert cents to dollars
      unit: centMatch[2],
    };
  }
  
  // Look for dollar pattern: "$X.XX/unit"
  const dollarMatch = rateString.match(/\$\s*(\d+(?:\.\d+)?)\s*\/?\s*(\w+)/i);
  if (dollarMatch) {
    return {
      amount: parseFloat(dollarMatch[1]),
      unit: dollarMatch[2],
    };
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEARCH HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate search variations dynamically - NO HARDCODING
 * Handles hyphen/space/no-space variations automatically
 * Also extracts individual words for better matching
 * 
 * "Men's T-shirt" → ["men's t-shirt", "t-shirt", "tshirt", "shirt", ...]
 */
function generateSearchVariations(query: string): string[] {
  const variations = new Set<string>();
  const q = query.toLowerCase().trim();
  
  // Original query
  variations.add(q);
  
  // Version with hyphens removed
  variations.add(q.replace(/-/g, ''));
  
  // Version with spaces removed  
  variations.add(q.replace(/\s+/g, ''));
  
  // Version with hyphens → spaces
  variations.add(q.replace(/-/g, ' '));
  
  // Version with spaces → hyphens
  variations.add(q.replace(/\s+/g, '-'));
  
  // Extract individual words (important for "Men's T-shirt" → "t-shirt")
  const words = q.split(/[\s]+/).filter(w => w.length > 1);
  for (const word of words) {
    // Add each word
    variations.add(word);
    // Handle hyphenated words
    variations.add(word.replace(/-/g, ''));
    variations.add(word.replace(/-/g, ' '));
    // Try t-shirt variations
    if (word.length > 2 && !word.includes('-')) {
      variations.add(word[0] + '-' + word.slice(1));
    }
  }
  
  // Remove possessive markers (men's → men)
  const withoutPossessive = q.replace(/'s\b/g, '');
  if (withoutPossessive !== q) {
    variations.add(withoutPossessive);
  }
  
  return Array.from(variations).filter(v => v.length > 1);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get HTS code by exact code
 */
export async function getHtsCode(code: string): Promise<HtsCodeResult | null> {
  const normalized = normalizeHtsCode(code);
  
  const result = await prisma.htsCode.findUnique({
    where: { code: normalized },
  });
  
  return result;
}

/**
 * Get all HTS codes under a parent (children)
 */
export async function getHtsChildren(parentCode: string): Promise<HtsCodeResult[]> {
  const normalized = normalizeHtsCode(parentCode);
  
  const results = await prisma.htsCode.findMany({
    where: { parentCode: normalized },
    orderBy: { code: 'asc' },
  });
  
  return results;
}

/**
 * Get the full hierarchy (ancestors) for an HTS code
 */
export async function getHtsHierarchy(code: string): Promise<HtsCodeResult[]> {
  const normalized = normalizeHtsCode(code);
  const parsed = parseHtsCode(normalized);
  
  // Build list of ancestor codes
  const ancestorCodes: string[] = [];
  
  if (parsed.chapter) ancestorCodes.push(parsed.chapter);
  if (parsed.heading) ancestorCodes.push(parsed.heading);
  if (parsed.subheading) ancestorCodes.push(parsed.subheading);
  if (parsed.tariffLine) ancestorCodes.push(parsed.tariffLine);
  if (parsed.statistical) ancestorCodes.push(parsed.statistical);
  
  const results = await prisma.htsCode.findMany({
    where: {
      code: { in: ancestorCodes },
    },
    orderBy: { code: 'asc' },
  });
  
  return results;
}

/**
 * Get siblings (codes at same level with same parent)
 */
export async function getHtsSiblings(code: string): Promise<HtsCodeResult[]> {
  const normalized = normalizeHtsCode(code);
  const parentCode = getParentCode(normalized);
  
  if (!parentCode) return [];
  
  const results = await prisma.htsCode.findMany({
    where: {
      parentCode,
      code: { not: normalized },
    },
    orderBy: { code: 'asc' },
  });
  
  return results;
}

/**
 * Search HTS codes by keyword or description
 */
export async function searchHtsCodes(
  query: string,
  options: {
    limit?: number;
    level?: HtsLevel | HtsLevel[];
    chapter?: string;
  } = {}
): Promise<HtsSearchResult[]> {
  const { limit = 50, level, chapter } = options;
  
  const queryLower = query.toLowerCase().trim();
  
  // Generate search variations dynamically (e.g., "tshirt" → ["tshirt", "t-shirt", "t shirt"])
  const searchVariations = generateSearchVariations(queryLower);
  
  // Extract keywords from all variations
  const queryWords = searchVariations
    .flatMap(v => v.split(/[\s-]+/))
    .filter(w => w.length > 2);
  const uniqueWords = [...new Set(queryWords)];
  
  // Build where clause
  const where: Prisma.HtsCodeWhereInput = {
    AND: [
      // Filter by level if specified
      level ? { level: Array.isArray(level) ? { in: level } : level } : {},
      // Filter by chapter if specified
      chapter ? { chapter } : {},
      // Search in description or keywords
      {
        OR: [
          // Description contains any variation
          ...searchVariations.map(v => ({ 
            description: { contains: v, mode: 'insensitive' as const } 
          })),
          // Keywords match
          { keywords: { hasSome: uniqueWords } },
        ],
      },
    ],
  };
  
  const results = await prisma.htsCode.findMany({
    where,
    take: limit,
    orderBy: [
      { level: 'asc' },  // Prefer higher-level codes first
      { code: 'asc' },
    ],
  });
  
  // Calculate match scores
  return results.map(result => {
    let matchScore = 0;
    
    // Exact description match
    if (result.description.toLowerCase().includes(queryLower)) {
      matchScore += 50;
    }
    
    // Keyword matches
    const keywordMatches = queryWords.filter(word => 
      result.keywords.some(kw => kw.toLowerCase().includes(word))
    );
    matchScore += keywordMatches.length * 20;
    
    // Prefer statistical-level codes (most specific)
    if (result.level === 'statistical') matchScore += 10;
    else if (result.level === 'tariff_line') matchScore += 5;
    
    return {
      code: result.code,
      codeFormatted: result.codeFormatted,
      level: result.level,
      description: result.description,
      generalRate: result.generalRate,
      matchScore,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find HTS codes by chapter
 */
export async function getHtsCodesByChapter(
  chapter: string,
  options: {
    level?: HtsLevel | HtsLevel[];
    limit?: number;
  } = {}
): Promise<HtsCodeResult[]> {
  const { level, limit } = options;
  
  const results = await prisma.htsCode.findMany({
    where: {
      chapter: chapter.padStart(2, '0'),
      ...(level ? { level: Array.isArray(level) ? { in: level } : level } : {}),
    },
    orderBy: { code: 'asc' },
    take: limit,
  });
  
  return results;
}

/**
 * Get all codes that start with a prefix
 */
export async function getHtsCodesByPrefix(prefix: string): Promise<HtsCodeResult[]> {
  const normalized = normalizeHtsCode(prefix);
  
  const results = await prisma.htsCode.findMany({
    where: {
      code: { startsWith: normalized },
    },
    orderBy: { code: 'asc' },
  });
  
  return results;
}

/**
 * Get database statistics
 */
export async function getHtsDatabaseStats(): Promise<{
  totalCodes: number;
  byLevel: Record<HtsLevel, number>;
  lastSynced: Date | null;
  sourceRevision: string | null;
}> {
  const [total, byLevel, lastSync] = await Promise.all([
    prisma.htsCode.count(),
    prisma.htsCode.groupBy({
      by: ['level'],
      _count: true,
    }),
    prisma.htsSyncLog.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
    }),
  ]);
  
  const levelCounts = byLevel.reduce((acc, item) => {
    acc[item.level] = item._count;
    return acc;
  }, {} as Record<HtsLevel, number>);
  
  return {
    totalCodes: total,
    byLevel: levelCounts,
    lastSynced: lastSync?.completedAt || null,
    sourceRevision: lastSync?.sourceRevision || null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREE BUILDING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a complete tree for a heading
 * Useful for showing all possible codes under a heading
 */
export async function buildHtsTree(headingCode: string): Promise<HtsHierarchyNode | null> {
  const normalized = normalizeHtsCode(headingCode);
  
  // Get the root node
  const root = await prisma.htsCode.findUnique({
    where: { code: normalized },
  });
  
  if (!root) return null;
  
  // Get all descendants
  const descendants = await prisma.htsCode.findMany({
    where: {
      code: { startsWith: normalized },
    },
    orderBy: { code: 'asc' },
  });
  
  // Build tree structure
  const nodeMap = new Map<string, HtsHierarchyNode>();
  
  // Create nodes for all items
  for (const item of descendants) {
    nodeMap.set(item.code, {
      code: item.code,
      codeFormatted: item.codeFormatted,
      level: item.level,
      description: item.description,
      generalRate: item.generalRate,
      children: [],
    });
  }
  
  // Build parent-child relationships
  for (const item of descendants) {
    const node = nodeMap.get(item.code)!;
    const parentCode = item.parentCode;
    
    if (parentCode && nodeMap.has(parentCode)) {
      nodeMap.get(parentCode)!.children!.push(node);
    }
  }
  
  // Return the root node (with populated children)
  return nodeMap.get(normalized) || null;
}

