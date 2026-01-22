/**
 * BIS Restricted Party Lists Service
 * 
 * Downloads, parses, and stores the BIS restricted party lists:
 * - Entity List: Companies/individuals subject to export restrictions
 * - Denied Persons List: Persons denied export privileges
 * 
 * Source: Bureau of Industry and Security (BIS)
 * - https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern
 * 
 * Note: BIS data format may change. URLs and parsing logic may need updates.
 * Alternative source: Trade.gov Consolidated Screening List API
 */

import { prisma } from '@/lib/db';
import { DeniedPartyList, DeniedPartyType, SyncStatus } from '@prisma/client';
import crypto from 'crypto';

// BIS data URLs
// Note: BIS website structure changes frequently. These URLs may need updating.
const BIS_URLS = {
  // Entity List - CSV format
  entityList: 'https://www.bis.doc.gov/index.php/documents/regulations-docs/2326-supplement-no-4-to-part-744-entity-list-4',
  // Denied Persons List - typically available as text/CSV
  deniedPersons: 'https://www.bis.doc.gov/index.php/component/docman/?task=doc_download&gid=731',
};

// Alternative: Trade.gov Consolidated Screening List API (includes BIS data)
const TRADE_GOV_CSL_URL = 'https://api.trade.gov/static/consolidated_screening_list/consolidated.json';

interface SyncResult {
  success: boolean;
  totalRecords: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: string[];
  durationMs: number;
}

interface ParsedBISEntry {
  sourceId: string;
  name: string;
  aliases: string[];
  entityType: DeniedPartyType;
  country: string | null;
  countryCode: string | null;
  addresses: string[];
  federalRegister: string | null;
  remarks: string | null;
  listedDate: Date | null;
}

/**
 * Download file from URL and return as text
 */
async function downloadFile(url: string): Promise<{ content: string; lastModified: Date | null }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Sourcify Trade Intelligence Platform',
      'Accept': 'application/json, text/csv, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  const lastModifiedHeader = response.headers.get('last-modified');
  const lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

  return { content, lastModified };
}

/**
 * Download the Trade.gov Consolidated Screening List (JSON)
 * This includes BIS Entity List and Denied Persons data
 */
async function downloadConsolidatedList(): Promise<{ content: unknown[]; lastModified: Date | null }> {
  const response = await fetch(TRADE_GOV_CSL_URL, {
    headers: {
      'User-Agent': 'Sourcify Trade Intelligence Platform',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download consolidated list: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const lastModifiedHeader = response.headers.get('last-modified');
  const lastModified = lastModifiedHeader ? new Date(lastModifiedHeader) : null;

  // The consolidated list has a "results" array
  const results = Array.isArray(data) ? data : (data.results || []);

  return { content: results, lastModified };
}

/**
 * Parse CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Extract country code from country name
 */
function getCountryCode(countryName: string | null): string | null {
  if (!countryName) return null;
  
  const name = countryName.toLowerCase().trim();
  
  const countryMap: Record<string, string> = {
    'russia': 'RU',
    'russian federation': 'RU',
    'china': 'CN',
    "people's republic of china": 'CN',
    "china (mainland)": 'CN',
    'iran': 'IR',
    'iran, islamic republic of': 'IR',
    'north korea': 'KP',
    "korea, democratic people's republic of": 'KP',
    "korea, north": 'KP',
    'cuba': 'CU',
    'syria': 'SY',
    'syrian arab republic': 'SY',
    'venezuela': 'VE',
    'belarus': 'BY',
    'myanmar': 'MM',
    'burma': 'MM',
    'pakistan': 'PK',
    'united arab emirates': 'AE',
    'uae': 'AE',
    'hong kong': 'HK',
    'macau': 'MO',
    'taiwan': 'TW',
    'singapore': 'SG',
    'india': 'IN',
    'turkey': 'TR',
    'turkiye': 'TR',
    'saudi arabia': 'SA',
    'israel': 'IL',
    'japan': 'JP',
    'south korea': 'KR',
    'korea, republic of': 'KR',
    'korea, south': 'KR',
    'canada': 'CA',
    'mexico': 'MX',
    'brazil': 'BR',
    'united states': 'US',
    'usa': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'germany': 'DE',
    'france': 'FR',
    'italy': 'IT',
    'spain': 'ES',
    'netherlands': 'NL',
    'belgium': 'BE',
    'switzerland': 'CH',
    'austria': 'AT',
    'poland': 'PL',
    'ukraine': 'UA',
    'egypt': 'EG',
    'iraq': 'IQ',
    'afghanistan': 'AF',
    'lebanon': 'LB',
    'libya': 'LY',
    'sudan': 'SD',
    'yemen': 'YE',
    'somalia': 'SO',
    'zimbabwe': 'ZW',
  };

  return countryMap[name] || null;
}

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  
  // Try ISO format first
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }
  
  // Try MM/DD/YYYY format
  const parts = trimmed.split('/');
  if (parts.length === 3) {
    const [month, day, year] = parts;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  return null;
}

/**
 * Calculate MD5 checksum of content
 */
function calculateChecksum(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Parse BIS Entity List from Trade.gov consolidated data
 * Filters for source: "Entity List (EL) - Bureau of Industry and Security"
 */
function parseBISEntityListFromConsolidated(entries: unknown[]): ParsedBISEntry[] {
  const results: ParsedBISEntry[] = [];
  
  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    
    // Filter for BIS Entity List
    const source = String(e.source || '').toLowerCase();
    if (!source.includes('entity list') || !source.includes('bureau of industry')) {
      continue;
    }
    
    // Generate a stable source ID
    const name = String(e.name || '');
    const sourceId = e.id ? String(e.id) : `bis_el_${crypto.createHash('md5').update(name).digest('hex').slice(0, 12)}`;
    
    // Parse alt names
    const aliases: string[] = [];
    if (e.alt_names) {
      const altStr = String(e.alt_names);
      aliases.push(...altStr.split(/[;|]/).map(a => a.trim()).filter(Boolean));
    }
    
    // Build addresses
    const addresses: string[] = [];
    if (e.addresses && Array.isArray(e.addresses)) {
      for (const addr of e.addresses as Record<string, unknown>[]) {
        const parts = [
          addr.address,
          addr.city,
          addr.state,
          addr.postal_code,
          addr.country,
        ].filter(Boolean).map(String);
        if (parts.length > 0) {
          addresses.push(parts.join(', '));
        }
      }
    }
    
    // Determine entity type
    let entityType: DeniedPartyType = 'entity';
    const type = String(e.type || '').toLowerCase();
    if (type.includes('individual') || type.includes('person')) {
      entityType = 'individual';
    } else if (type.includes('vessel')) {
      entityType = 'vessel';
    } else if (type.includes('aircraft')) {
      entityType = 'aircraft';
    }
    
    // Get country
    const country = e.country ? String(e.country) : 
      (e.addresses && Array.isArray(e.addresses) && e.addresses.length > 0) 
        ? String((e.addresses[0] as Record<string, unknown>).country || '') 
        : null;
    
    results.push({
      sourceId,
      name,
      aliases,
      entityType,
      country,
      countryCode: getCountryCode(country),
      addresses,
      federalRegister: e.federal_register_notice ? String(e.federal_register_notice) : null,
      remarks: e.remarks ? String(e.remarks) : null,
      listedDate: parseDate(e.start_date as string),
    });
  }
  
  return results;
}

/**
 * Parse BIS Denied Persons from Trade.gov consolidated data
 * Filters for source: "Denied Persons List (DPL) - Bureau of Industry and Security"
 */
function parseBISDeniedPersonsFromConsolidated(entries: unknown[]): ParsedBISEntry[] {
  const results: ParsedBISEntry[] = [];
  
  for (const entry of entries) {
    const e = entry as Record<string, unknown>;
    
    // Filter for BIS Denied Persons
    const source = String(e.source || '').toLowerCase();
    if (!source.includes('denied persons') || !source.includes('bureau of industry')) {
      continue;
    }
    
    // Generate a stable source ID
    const name = String(e.name || '');
    const sourceId = e.id ? String(e.id) : `bis_dp_${crypto.createHash('md5').update(name).digest('hex').slice(0, 12)}`;
    
    // Parse alt names
    const aliases: string[] = [];
    if (e.alt_names) {
      const altStr = String(e.alt_names);
      aliases.push(...altStr.split(/[;|]/).map(a => a.trim()).filter(Boolean));
    }
    
    // Build addresses
    const addresses: string[] = [];
    if (e.addresses && Array.isArray(e.addresses)) {
      for (const addr of e.addresses as Record<string, unknown>[]) {
        const parts = [
          addr.address,
          addr.city,
          addr.state,
          addr.postal_code,
          addr.country,
        ].filter(Boolean).map(String);
        if (parts.length > 0) {
          addresses.push(parts.join(', '));
        }
      }
    }
    
    // Denied persons are typically individuals
    let entityType: DeniedPartyType = 'individual';
    const type = String(e.type || '').toLowerCase();
    if (type.includes('entity') || type.includes('company') || type.includes('organization')) {
      entityType = 'entity';
    }
    
    // Get country
    const country = e.country ? String(e.country) : 
      (e.addresses && Array.isArray(e.addresses) && e.addresses.length > 0) 
        ? String((e.addresses[0] as Record<string, unknown>).country || '') 
        : null;
    
    results.push({
      sourceId,
      name,
      aliases,
      entityType,
      country,
      countryCode: getCountryCode(country),
      addresses,
      federalRegister: e.federal_register_notice ? String(e.federal_register_notice) : null,
      remarks: e.remarks ? String(e.remarks) : 
        (e.standard_order ? `Standard Order: ${e.standard_order}` : null),
      listedDate: parseDate(e.start_date as string),
    });
  }
  
  return results;
}

/**
 * Get the last sync info for a specific BIS list
 */
export async function getLastBISSyncInfo(sourceList: 'bis_entity_list' | 'bis_denied') {
  const lastSync = await prisma.deniedPartySyncLog.findFirst({
    where: {
      sourceList,
      status: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const totalEntries = await prisma.deniedParty.count({
    where: {
      sourceList,
      isActive: true,
    },
  });

  return {
    lastSync,
    totalEntries,
  };
}

/**
 * Get sync history for a specific BIS list
 */
export async function getBISSyncHistory(sourceList: 'bis_entity_list' | 'bis_denied', limit = 10) {
  return prisma.deniedPartySyncLog.findMany({
    where: { sourceList },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Process entries into the database
 */
async function processEntries(
  entries: ParsedBISEntry[],
  sourceList: DeniedPartyList,
  syncLogId: string,
  errors: string[]
): Promise<{ created: number; updated: number; deleted: number }> {
  let recordsCreated = 0;
  let recordsUpdated = 0;

  // Get existing source IDs for this list
  const existingEntries = await prisma.deniedParty.findMany({
    where: { sourceList },
    select: { id: true, sourceId: true },
  });
  const existingSourceIds = new Set(existingEntries.map(e => e.sourceId));
  const processedSourceIds = new Set<string>();

  // Process entries in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);

    for (const entry of batch) {
      try {
        processedSourceIds.add(entry.sourceId);
        const isExisting = existingSourceIds.has(entry.sourceId);

        await prisma.deniedParty.upsert({
          where: {
            sourceList_sourceId: {
              sourceList,
              sourceId: entry.sourceId,
            },
          },
          create: {
            name: entry.name,
            aliases: entry.aliases,
            entityType: entry.entityType,
            countryCode: entry.countryCode,
            countryName: entry.country,
            addresses: entry.addresses,
            identifiers: undefined,
            sourceList,
            sourceId: entry.sourceId,
            sourcePrograms: [],
            remarks: entry.remarks,
            federalRegister: entry.federalRegister,
            isActive: true,
            listedDate: entry.listedDate,
            lastUpdated: new Date(),
          },
          update: {
            name: entry.name,
            aliases: entry.aliases,
            entityType: entry.entityType,
            countryCode: entry.countryCode,
            countryName: entry.country,
            addresses: entry.addresses,
            remarks: entry.remarks,
            federalRegister: entry.federalRegister,
            isActive: true,
            lastUpdated: new Date(),
          },
        });

        if (isExisting) {
          recordsUpdated++;
        } else {
          recordsCreated++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to process entry ${entry.sourceId}: ${errorMessage}`);
      }
    }
  }

  // Mark entries not in the latest download as inactive
  const idsToDeactivate = existingEntries
    .filter(e => e.sourceId && !processedSourceIds.has(e.sourceId))
    .map(e => e.id);

  let recordsDeleted = 0;
  if (idsToDeactivate.length > 0) {
    await prisma.deniedParty.updateMany({
      where: { id: { in: idsToDeactivate } },
      data: { isActive: false, delistedDate: new Date() },
    });
    recordsDeleted = idsToDeactivate.length;
  }

  return { created: recordsCreated, updated: recordsUpdated, deleted: recordsDeleted };
}

/**
 * Main sync function for BIS Entity List
 */
export async function syncBISEntityList(): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const sourceList: DeniedPartyList = 'bis_entity_list';

  // Create sync log entry
  const syncLog = await prisma.deniedPartySyncLog.create({
    data: {
      sourceList,
      sourceUrl: TRADE_GOV_CSL_URL,
      status: 'running',
    },
  });

  try {
    console.log('[BIS] Starting Entity List sync...');

    // Download consolidated screening list
    const { content: rawEntries, lastModified } = await downloadConsolidatedList();

    console.log('[BIS] Downloaded consolidated list');

    // Calculate checksum
    const checksum = calculateChecksum(JSON.stringify(rawEntries));

    // Parse BIS Entity List entries
    const entries = parseBISEntityListFromConsolidated(rawEntries);

    console.log(`[BIS] Parsed ${entries.length} Entity List entries`);

    // Process entries
    const { created, updated, deleted } = await processEntries(entries, sourceList, syncLog.id, errors);

    const durationMs = Date.now() - startTime;

    // Update sync log
    await prisma.deniedPartySyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        totalRecords: entries.length,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsDeleted: deleted,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
        durationMs,
        fileChecksum: checksum,
        lastModified,
      },
    });

    console.log(`[BIS] Entity List sync completed: ${created} created, ${updated} updated, ${deleted} deactivated`);

    return {
      success: true,
      totalRecords: entries.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsDeleted: deleted,
      errors,
      durationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const durationMs = Date.now() - startTime;

    await prisma.deniedPartySyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        errors: [errorMessage],
        completedAt: new Date(),
        durationMs,
      },
    });

    console.error('[BIS] Entity List sync failed:', errorMessage);

    return {
      success: false,
      totalRecords: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [errorMessage],
      durationMs,
    };
  }
}

/**
 * Main sync function for BIS Denied Persons List
 */
export async function syncBISDeniedPersons(): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const sourceList: DeniedPartyList = 'bis_denied';

  // Create sync log entry
  const syncLog = await prisma.deniedPartySyncLog.create({
    data: {
      sourceList,
      sourceUrl: TRADE_GOV_CSL_URL,
      status: 'running',
    },
  });

  try {
    console.log('[BIS] Starting Denied Persons List sync...');

    // Download consolidated screening list
    const { content: rawEntries, lastModified } = await downloadConsolidatedList();

    console.log('[BIS] Downloaded consolidated list');

    // Calculate checksum
    const checksum = calculateChecksum(JSON.stringify(rawEntries));

    // Parse BIS Denied Persons entries
    const entries = parseBISDeniedPersonsFromConsolidated(rawEntries);

    console.log(`[BIS] Parsed ${entries.length} Denied Persons entries`);

    // Process entries
    const { created, updated, deleted } = await processEntries(entries, sourceList, syncLog.id, errors);

    const durationMs = Date.now() - startTime;

    // Update sync log
    await prisma.deniedPartySyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        totalRecords: entries.length,
        recordsCreated: created,
        recordsUpdated: updated,
        recordsDeleted: deleted,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
        durationMs,
        fileChecksum: checksum,
        lastModified,
      },
    });

    console.log(`[BIS] Denied Persons sync completed: ${created} created, ${updated} updated, ${deleted} deactivated`);

    return {
      success: true,
      totalRecords: entries.length,
      recordsCreated: created,
      recordsUpdated: updated,
      recordsDeleted: deleted,
      errors,
      durationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const durationMs = Date.now() - startTime;

    await prisma.deniedPartySyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        errors: [errorMessage],
        completedAt: new Date(),
        durationMs,
      },
    });

    console.error('[BIS] Denied Persons sync failed:', errorMessage);

    return {
      success: false,
      totalRecords: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsDeleted: 0,
      errors: [errorMessage],
      durationMs,
    };
  }
}

/**
 * Sync both BIS lists
 */
export async function syncAllBISLists(): Promise<{
  entityList: SyncResult;
  deniedPersons: SyncResult;
}> {
  console.log('[BIS] Starting full BIS lists sync...');
  
  const [entityList, deniedPersons] = await Promise.all([
    syncBISEntityList(),
    syncBISDeniedPersons(),
  ]);

  console.log('[BIS] Full sync completed');

  return { entityList, deniedPersons };
}
