/**
 * OFAC SDN List Service
 * 
 * Downloads, parses, and stores the OFAC Specially Designated Nationals list.
 * Source: https://www.treasury.gov/ofac/downloads/
 * 
 * SDN List formats available:
 * - CSV: https://www.treasury.gov/ofac/downloads/sdn.csv
 * - XML: https://www.treasury.gov/ofac/downloads/sdn.xml
 * - Alternative names: https://www.treasury.gov/ofac/downloads/alt.csv
 * - Addresses: https://www.treasury.gov/ofac/downloads/add.csv
 * - Comments: https://www.treasury.gov/ofac/downloads/sdn_comments.csv
 */

import { prisma } from '@/lib/db';
import { DeniedPartyList, DeniedPartyType, SyncStatus } from '@prisma/client';
import crypto from 'crypto';

// OFAC CSV download URLs
const OFAC_URLS = {
  sdn: 'https://www.treasury.gov/ofac/downloads/sdn.csv',
  alt: 'https://www.treasury.gov/ofac/downloads/alt.csv', 
  add: 'https://www.treasury.gov/ofac/downloads/add.csv',
  comments: 'https://www.treasury.gov/ofac/downloads/sdn_comments.csv',
};

// Entity type mapping from OFAC codes
const ENTITY_TYPE_MAP: Record<string, DeniedPartyType> = {
  'individual': 'individual',
  '-0-': 'individual', // OFAC uses -0- for individuals
  'entity': 'entity',
  'vessel': 'vessel',
  'aircraft': 'aircraft',
};

// Parse result interfaces
interface ParsedSDNEntry {
  sourceId: string;
  name: string;
  entityType: DeniedPartyType;
  programs: string[];
  remarks: string | null;
}

interface ParsedAltName {
  sourceId: string;
  altName: string;
  altType: string;
}

interface ParsedAddress {
  sourceId: string;
  address: string;
  city: string | null;
  stateOrProvince: string | null;
  postalCode: string | null;
  country: string | null;
}

interface SyncResult {
  success: boolean;
  totalRecords: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: string[];
  durationMs: number;
}

/**
 * Download file from URL and return as text
 */
async function downloadFile(url: string): Promise<{ content: string; lastModified: Date | null }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Sourcify Trade Intelligence Platform',
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
 * Parse the main SDN CSV file
 * Columns: ent_num, SDN_Name, SDN_Type, Program, Title, Call_Sign, Vess_type, Tonnage, GRT, Vess_flag, Vess_owner, Remarks
 */
function parseSDNCSV(content: string): ParsedSDNEntry[] {
  const lines = content.split('\n').filter(line => line.trim());
  const entries: ParsedSDNEntry[] = [];

  for (const line of lines) {
    const fields = parseCSVLine(line);
    
    // Skip header row or invalid lines
    if (fields.length < 4 || fields[0] === 'ent_num') continue;

    const [entNum, sdnName, sdnType, program, _title, _callSign, _vessType, _tonnage, _grt, _vessFlag, _vessOwner, remarks] = fields;

    // Determine entity type
    let entityType: DeniedPartyType = 'unknown';
    const typeStr = (sdnType || '').toLowerCase().trim();
    if (typeStr === 'individual' || typeStr === '-0-') {
      entityType = 'individual';
    } else if (typeStr === 'entity' || typeStr === '') {
      entityType = 'entity';
    } else if (typeStr.includes('vessel')) {
      entityType = 'vessel';
    } else if (typeStr.includes('aircraft')) {
      entityType = 'aircraft';
    }

    // Parse programs (comma-separated in the CSV)
    const programs = program ? program.split(';').map(p => p.trim()).filter(Boolean) : [];

    entries.push({
      sourceId: entNum,
      name: sdnName || '',
      entityType,
      programs,
      remarks: remarks || null,
    });
  }

  return entries;
}

/**
 * Parse the alternate names CSV file
 * Columns: ent_num, alt_num, alt_type, alt_name, alt_remarks
 */
function parseAltNamesCSV(content: string): Map<string, ParsedAltName[]> {
  const lines = content.split('\n').filter(line => line.trim());
  const aliasMap = new Map<string, ParsedAltName[]>();

  for (const line of lines) {
    const fields = parseCSVLine(line);
    
    // Skip header or invalid lines
    if (fields.length < 4 || fields[0] === 'ent_num') continue;

    const [entNum, _altNum, altType, altName] = fields;

    if (!aliasMap.has(entNum)) {
      aliasMap.set(entNum, []);
    }

    aliasMap.get(entNum)!.push({
      sourceId: entNum,
      altName: altName || '',
      altType: altType || '',
    });
  }

  return aliasMap;
}

/**
 * Parse the addresses CSV file
 * Columns: ent_num, add_num, Address, City/State/Province/Postal Code, Country, add_remarks
 */
function parseAddressesCSV(content: string): Map<string, ParsedAddress[]> {
  const lines = content.split('\n').filter(line => line.trim());
  const addressMap = new Map<string, ParsedAddress[]>();

  for (const line of lines) {
    const fields = parseCSVLine(line);
    
    // Skip header or invalid lines
    if (fields.length < 5 || fields[0] === 'ent_num') continue;

    const [entNum, _addNum, address, cityStatePostal, country] = fields;

    if (!addressMap.has(entNum)) {
      addressMap.set(entNum, []);
    }

    // Try to parse city/state/postal
    let city: string | null = null;
    let stateOrProvince: string | null = null;
    let postalCode: string | null = null;

    if (cityStatePostal) {
      // OFAC format varies, just store the whole thing
      city = cityStatePostal;
    }

    addressMap.get(entNum)!.push({
      sourceId: entNum,
      address: address || '',
      city,
      stateOrProvince,
      postalCode,
      country: country || null,
    });
  }

  return addressMap;
}

/**
 * Extract country code from country name
 * Simple mapping for common countries; can be expanded
 */
function getCountryCode(countryName: string | null): string | null {
  if (!countryName) return null;
  
  const name = countryName.toLowerCase().trim();
  
  // Common country name to code mappings
  const countryMap: Record<string, string> = {
    'russia': 'RU',
    'russian federation': 'RU',
    'china': 'CN',
    "people's republic of china": 'CN',
    'iran': 'IR',
    'iran, islamic republic of': 'IR',
    'north korea': 'KP',
    "korea, democratic people's republic of": 'KP',
    'cuba': 'CU',
    'syria': 'SY',
    'syrian arab republic': 'SY',
    'venezuela': 'VE',
    'belarus': 'BY',
    'myanmar': 'MM',
    'burma': 'MM',
    'libya': 'LY',
    'sudan': 'SD',
    'iraq': 'IQ',
    'yemen': 'YE',
    'somalia': 'SO',
    'zimbabwe': 'ZW',
    'ukraine': 'UA',
    'united states': 'US',
    'usa': 'US',
    'united kingdom': 'GB',
    'uk': 'GB',
    'germany': 'DE',
    'france': 'FR',
    'mexico': 'MX',
    'canada': 'CA',
    'brazil': 'BR',
    'india': 'IN',
    'pakistan': 'PK',
    'afghanistan': 'AF',
    'united arab emirates': 'AE',
    'uae': 'AE',
    'saudi arabia': 'SA',
    'lebanon': 'LB',
    'turkey': 'TR',
  };

  return countryMap[name] || null;
}

/**
 * Parse identifiers from remarks field
 * OFAC puts IDs in remarks like: "DOB 01 Jan 1970; Passport ABC123 (Iran)..."
 */
function parseIdentifiers(remarks: string | null): Array<{ type: string; value: string; country?: string }> {
  if (!remarks) return [];

  const identifiers: Array<{ type: string; value: string; country?: string }> = [];
  
  // Common identifier patterns
  const patterns: Array<{ pattern: RegExp; type: string }> = [
    { pattern: /DOB\s+([^;]+)/gi, type: 'Date of Birth' },
    { pattern: /POB\s+([^;]+)/gi, type: 'Place of Birth' },
    { pattern: /Passport\s+([A-Z0-9-]+)(?:\s*\(([^)]+)\))?/gi, type: 'Passport' },
    { pattern: /National ID No\.\s+([A-Z0-9-]+)(?:\s*\(([^)]+)\))?/gi, type: 'National ID' },
    { pattern: /Tax ID No\.\s+([A-Z0-9-]+)(?:\s*\(([^)]+)\))?/gi, type: 'Tax ID' },
    { pattern: /alt\. Passport\s+([A-Z0-9-]+)(?:\s*\(([^)]+)\))?/gi, type: 'Passport' },
  ];

  for (const { pattern, type } of patterns) {
    let match;
    while ((match = pattern.exec(remarks)) !== null) {
      const identifier: { type: string; value: string; country?: string } = {
        type,
        value: match[1].trim(),
      };
      if (match[2]) {
        identifier.country = match[2].trim();
      }
      identifiers.push(identifier);
    }
  }

  return identifiers;
}

/**
 * Calculate MD5 checksum of content
 */
function calculateChecksum(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Get the last sync info for OFAC SDN
 */
export async function getLastSyncInfo() {
  const lastSync = await prisma.deniedPartySyncLog.findFirst({
    where: {
      sourceList: 'ofac_sdn',
      status: 'completed',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const totalEntries = await prisma.deniedParty.count({
    where: {
      sourceList: 'ofac_sdn',
      isActive: true,
    },
  });

  return {
    lastSync,
    totalEntries,
  };
}

/**
 * Main sync function - downloads and processes the OFAC SDN list
 */
export async function syncOFACSDNList(): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Create sync log entry
  const syncLog = await prisma.deniedPartySyncLog.create({
    data: {
      sourceList: 'ofac_sdn',
      sourceUrl: OFAC_URLS.sdn,
      status: 'running',
    },
  });

  try {
    console.log('[OFAC] Starting SDN list sync...');

    // Download all CSV files in parallel
    const [sdnData, altData, addData] = await Promise.all([
      downloadFile(OFAC_URLS.sdn),
      downloadFile(OFAC_URLS.alt),
      downloadFile(OFAC_URLS.add),
    ]);

    console.log('[OFAC] Downloaded SDN files');

    // Calculate checksum to detect changes
    const checksum = calculateChecksum(sdnData.content);

    // Parse all files
    const sdnEntries = parseSDNCSV(sdnData.content);
    const aliasMap = parseAltNamesCSV(altData.content);
    const addressMap = parseAddressesCSV(addData.content);

    console.log(`[OFAC] Parsed ${sdnEntries.length} SDN entries`);

    // Track statistics
    let recordsCreated = 0;
    let recordsUpdated = 0;

    // Get existing source IDs for this list
    const existingEntries = await prisma.deniedParty.findMany({
      where: { sourceList: 'ofac_sdn' },
      select: { id: true, sourceId: true },
    });
    const existingSourceIds = new Set(existingEntries.map(e => e.sourceId));
    const processedSourceIds = new Set<string>();

    // Process entries in batches for performance
    const BATCH_SIZE = 100;
    for (let i = 0; i < sdnEntries.length; i += BATCH_SIZE) {
      const batch = sdnEntries.slice(i, i + BATCH_SIZE);

      for (const entry of batch) {
        try {
          processedSourceIds.add(entry.sourceId);

          // Get aliases for this entry
          const aliases = aliasMap.get(entry.sourceId)?.map(a => a.altName) || [];

          // Get addresses and determine country
          const addresses = addressMap.get(entry.sourceId) || [];
          const addressStrings = addresses.map(a => {
            const parts = [a.address, a.city, a.country].filter(Boolean);
            return parts.join(', ');
          });

          // Get country from first address
          const primaryCountry = addresses[0]?.country || null;
          const countryCode = getCountryCode(primaryCountry);

          // Parse identifiers from remarks
          const identifiers = parseIdentifiers(entry.remarks);

          // Upsert the entry
          const isExisting = existingSourceIds.has(entry.sourceId);

          await prisma.deniedParty.upsert({
            where: {
              sourceList_sourceId: {
                sourceList: 'ofac_sdn',
                sourceId: entry.sourceId,
              },
            },
            create: {
              name: entry.name,
              aliases,
              entityType: entry.entityType,
              countryCode,
              countryName: primaryCountry,
              addresses: addressStrings,
              identifiers: identifiers.length > 0 ? identifiers : undefined,
              sourceList: 'ofac_sdn',
              sourceId: entry.sourceId,
              sourcePrograms: entry.programs,
              remarks: entry.remarks,
              isActive: true,
              lastUpdated: new Date(),
            },
            update: {
              name: entry.name,
              aliases,
              entityType: entry.entityType,
              countryCode,
              countryName: primaryCountry,
              addresses: addressStrings,
              identifiers: identifiers.length > 0 ? identifiers : undefined,
              sourcePrograms: entry.programs,
              remarks: entry.remarks,
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

    const durationMs = Date.now() - startTime;

    // Update sync log with results
    await prisma.deniedPartySyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        totalRecords: sdnEntries.length,
        recordsCreated,
        recordsUpdated,
        recordsDeleted,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
        durationMs,
        fileChecksum: checksum,
        lastModified: sdnData.lastModified,
      },
    });

    console.log(`[OFAC] Sync completed: ${recordsCreated} created, ${recordsUpdated} updated, ${recordsDeleted} deactivated`);

    return {
      success: true,
      totalRecords: sdnEntries.length,
      recordsCreated,
      recordsUpdated,
      recordsDeleted,
      errors,
      durationMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const durationMs = Date.now() - startTime;

    // Update sync log with failure
    await prisma.deniedPartySyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        errors: [errorMessage],
        completedAt: new Date(),
        durationMs,
      },
    });

    console.error('[OFAC] Sync failed:', errorMessage);

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
 * Search denied parties by name (fuzzy matching)
 */
export async function searchDeniedParties(query: string, options?: {
  sourceList?: DeniedPartyList;
  countryCode?: string;
  entityType?: DeniedPartyType;
  limit?: number;
}) {
  const { sourceList, countryCode, entityType, limit = 50 } = options || {};

  // Build where clause
  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (sourceList) {
    where.sourceList = sourceList;
  }

  if (countryCode) {
    where.countryCode = countryCode;
  }

  if (entityType) {
    where.entityType = entityType;
  }

  // Search by name or alias using case-insensitive contains
  where.OR = [
    { name: { contains: query, mode: 'insensitive' } },
    { aliases: { has: query } },
  ];

  const results = await prisma.deniedParty.findMany({
    where,
    take: limit,
    orderBy: { name: 'asc' },
  });

  return results;
}

/**
 * Get denied party by ID
 */
export async function getDeniedPartyById(id: string) {
  return prisma.deniedParty.findUnique({
    where: { id },
  });
}

/**
 * Get all denied parties with pagination
 */
export async function getDeniedParties(options?: {
  sourceList?: DeniedPartyList;
  page?: number;
  pageSize?: number;
}) {
  const { sourceList, page = 1, pageSize = 50 } = options || {};

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (sourceList) {
    where.sourceList = sourceList;
  }

  const [items, total] = await Promise.all([
    prisma.deniedParty.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { name: 'asc' },
    }),
    prisma.deniedParty.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get sync history for OFAC SDN
 */
export async function getSyncHistory(limit = 10) {
  return prisma.deniedPartySyncLog.findMany({
    where: { sourceList: 'ofac_sdn' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
