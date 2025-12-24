/**
 * HTS Revision Checker Service
 * 
 * Checks USITC for new HTS revisions and determines if we need to sync.
 * Only triggers a full sync when there's actually a new version available.
 * 
 * USITC publishes:
 * - Annual editions (January 1st)
 * - Mid-year revisions (as needed, typically 1-3 per year)
 * - Emergency modifications (rare, usually via Federal Register)
 * 
 * @see docs/ARCHITECTURE_HTS_CLASSIFICATION.md
 */

import { prisma } from '@/lib/db';
import { RevisionStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface UsitcRevisionInfo {
  year: number;
  revisionNumber: number;
  revisionId: string;          // "2025-basic-rev1"
  publishedDate: Date | null;
  effectiveDate: Date | null;
  downloadUrl: string | null;
  description: string;
}

export interface RevisionCheckResult {
  currentRevision: string | null;     // What we have
  latestRevision: string | null;      // What's available
  needsUpdate: boolean;
  availableRevisions: UsitcRevisionInfo[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// USITC API INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check USITC for the latest HTS revision info
 * 
 * USITC HTS API: https://hts.usitc.gov/api
 * - /current endpoint returns info about the current HTS
 */
export async function checkUsitcForLatestRevision(): Promise<UsitcRevisionInfo | null> {
  try {
    // USITC API endpoint for current HTS info
    // Note: This endpoint may have rate limits
    const response = await fetch('https://hts.usitc.gov/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '',  // Empty query to just get metadata
        queryType: 'htsno',
        htsno: '01', // Just checking chapter 01 to get revision info
      }),
    });
    
    if (!response.ok) {
      console.error(`[HTS Revision] USITC API returned ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    // Extract revision info from response headers or data
    // USITC typically includes revision info in their API responses
    const revisionMatch = data.htsData?.title?.match(/(\d{4}).*?(?:Rev(?:ision)?\.?\s*(\d+))?/i);
    
    if (revisionMatch) {
      const year = parseInt(revisionMatch[1], 10);
      const revisionNumber = revisionMatch[2] ? parseInt(revisionMatch[2], 10) : 1;
      
      return {
        year,
        revisionNumber,
        revisionId: `${year}-basic-rev${revisionNumber}`,
        publishedDate: null, // Would need to scrape USITC site for this
        effectiveDate: null,
        downloadUrl: `https://hts.usitc.gov/current`,
        description: data.htsData?.title || `${year} HTS Revision ${revisionNumber}`,
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('[HTS Revision] Error checking USITC:', error);
    return null;
  }
}

/**
 * Alternative: Check USITC website for revision info
 * More reliable than API, uses the public HTS page
 */
export async function scrapeUsitcRevisionInfo(): Promise<UsitcRevisionInfo | null> {
  try {
    // Fetch the main HTS page
    const response = await fetch('https://hts.usitc.gov/', {
      headers: {
        'User-Agent': 'Sourcify-HTS-Checker/1.0',
      },
    });
    
    if (!response.ok) {
      console.error(`[HTS Revision] USITC website returned ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // Look for revision info in the page
    // USITC typically shows "2025 HTSA Basic Edition" or similar
    const revisionMatch = html.match(
      /(\d{4})\s+HTS(?:A|US)?\s+(?:Basic\s+)?(?:Edition|Rev(?:ision)?\.?\s*(\d+)?)/i
    );
    
    // Look for effective date
    const dateMatch = html.match(
      /effective\s+(?:as\s+of\s+)?(\w+\s+\d+,?\s+\d{4})/i
    );
    
    if (revisionMatch) {
      const year = parseInt(revisionMatch[1], 10);
      const revisionNumber = revisionMatch[2] ? parseInt(revisionMatch[2], 10) : 1;
      
      let effectiveDate: Date | null = null;
      if (dateMatch) {
        try {
          effectiveDate = new Date(dateMatch[1]);
        } catch {
          // Ignore date parsing errors
        }
      }
      
      return {
        year,
        revisionNumber,
        revisionId: `${year}-basic-rev${revisionNumber}`,
        publishedDate: null,
        effectiveDate,
        downloadUrl: 'https://hts.usitc.gov/',
        description: `${year} HTSA ${revisionNumber > 1 ? `Revision ${revisionNumber}` : 'Basic Edition'}`,
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('[HTS Revision] Error scraping USITC:', error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get our currently synced revision
 */
export async function getCurrentRevision(): Promise<string | null> {
  const current = await prisma.htsRevision.findFirst({
    where: { status: 'current' },
    orderBy: { syncedAt: 'desc' },
  });
  
  return current?.revisionId || null;
}

/**
 * Record a newly discovered revision
 */
export async function recordAvailableRevision(info: UsitcRevisionInfo): Promise<void> {
  await prisma.htsRevision.upsert({
    where: { revisionId: info.revisionId },
    create: {
      revisionId: info.revisionId,
      year: info.year,
      revisionNumber: info.revisionNumber,
      sourceUrl: info.downloadUrl,
      publishedDate: info.publishedDate,
      effectiveDate: info.effectiveDate,
      status: 'available',
      notes: info.description,
    },
    update: {
      sourceUrl: info.downloadUrl,
      publishedDate: info.publishedDate,
      effectiveDate: info.effectiveDate,
      notes: info.description,
    },
  });
}

/**
 * Mark a revision as currently synced
 */
export async function markRevisionAsCurrent(
  revisionId: string,
  totalCodes: number
): Promise<void> {
  // First, mark any existing 'current' revision as 'superseded'
  await prisma.htsRevision.updateMany({
    where: { status: 'current' },
    data: { status: 'superseded' },
  });
  
  // Then mark the new revision as current
  await prisma.htsRevision.update({
    where: { revisionId },
    data: {
      status: 'current',
      syncedAt: new Date(),
      totalCodes,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CHECK FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if we need to update our HTS database
 * 
 * Returns:
 * - What revision we currently have
 * - What revision is available
 * - Whether we need to sync
 */
export async function checkForHtsUpdates(): Promise<RevisionCheckResult> {
  console.log('[HTS Revision] Checking for updates...');
  
  // Get our current revision
  const currentRevision = await getCurrentRevision();
  console.log(`[HTS Revision] Current revision: ${currentRevision || 'none'}`);
  
  // Check USITC for latest
  // Try API first, fall back to scraping
  let latestInfo = await checkUsitcForLatestRevision();
  
  if (!latestInfo) {
    console.log('[HTS Revision] API check failed, trying scrape...');
    latestInfo = await scrapeUsitcRevisionInfo();
  }
  
  if (!latestInfo) {
    console.log('[HTS Revision] Could not determine latest USITC revision');
    return {
      currentRevision,
      latestRevision: null,
      needsUpdate: false,
      availableRevisions: [],
    };
  }
  
  console.log(`[HTS Revision] Latest available: ${latestInfo.revisionId}`);
  
  // Record this revision
  await recordAvailableRevision(latestInfo);
  
  // Determine if we need to update
  const needsUpdate = !currentRevision || currentRevision !== latestInfo.revisionId;
  
  if (needsUpdate) {
    console.log('[HTS Revision] Update available!');
  } else {
    console.log('[HTS Revision] Already up to date');
  }
  
  // Get all known revisions
  const allRevisions = await prisma.htsRevision.findMany({
    orderBy: [{ year: 'desc' }, { revisionNumber: 'desc' }],
    take: 10,
  });
  
  return {
    currentRevision,
    latestRevision: latestInfo.revisionId,
    needsUpdate,
    availableRevisions: allRevisions.map(r => ({
      year: r.year,
      revisionNumber: r.revisionNumber,
      revisionId: r.revisionId,
      publishedDate: r.publishedDate,
      effectiveDate: r.effectiveDate,
      downloadUrl: r.sourceUrl,
      description: r.notes || `${r.year} HTS Rev ${r.revisionNumber}`,
    })),
  };
}

/**
 * Simple version comparison
 * Returns true if revision B is newer than revision A
 */
export function isNewerRevision(a: string | null, b: string): boolean {
  if (!a) return true;  // No current revision means we need anything
  
  // Parse revision IDs like "2025-basic-rev1" or "2024-basic-rev3"
  const parseRevision = (id: string) => {
    const match = id.match(/(\d{4})-\w+-rev(\d+)/);
    if (!match) return { year: 0, rev: 0 };
    return { year: parseInt(match[1], 10), rev: parseInt(match[2], 10) };
  };
  
  const parsedA = parseRevision(a);
  const parsedB = parseRevision(b);
  
  if (parsedB.year > parsedA.year) return true;
  if (parsedB.year === parsedA.year && parsedB.rev > parsedA.rev) return true;
  
  return false;
}

