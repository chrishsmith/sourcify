/**
 * HTS Import Service
 * 
 * Parses USITC Excel HTS publications and loads them into our database.
 * 
 * USITC HTS Excel files are available at: https://hts.usitc.gov/
 * Download the "Complete HTS" Excel file and place in /data/hts/raw/
 * 
 * @see docs/ARCHITECTURE_HTS_CLASSIFICATION.md
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '@/lib/db';
import { HtsLevel, SyncStatus } from '@prisma/client';
import {
  normalizeHtsCode,
  formatHtsCode,
  getHtsLevel,
  getParentCode,
  parseHtsCode,
  parseAdValoremRate,
  parseSpecificRate,
} from './htsDatabase';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ParsedHtsRow {
  code: string;
  codeFormatted: string;
  level: HtsLevel;
  parentCode: string | null;
  chapter: string;
  heading: string | null;
  subheading: string | null;
  description: string;
  indent: number;
  generalRate: string | null;
  specialRates: string | null;
  column2Rate: string | null;
  units: string | null;
  adValoremRate: number | null;
  specificRate: number | null;
  specificUnit: string | null;
  keywords: string[];
  parentGroupings: string[];  // Intermediate indent groupings from HTS structure
}

interface ImportResult {
  success: boolean;
  totalRecords: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: { row: number; error: string }[];
  durationMs: number;
}

interface ExcelRow {
  // Column names vary by USITC file version, we handle multiple formats
  'HTS Number'?: string;
  'HTS_Number'?: string;
  'htsno'?: string;
  'Indent'?: number;
  'indent'?: number;
  'Description'?: string;
  'description'?: string;
  'Unit of Quantity'?: string;
  'units'?: string;
  'General Rate of Duty'?: string;
  'general'?: string;
  'Special Rate of Duty'?: string;
  'special'?: string;
  'Column 2 Rate of Duty'?: string;
  'other'?: string;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract searchable keywords from HTS description
 */
function extractKeywords(description: string, chapter: string): string[] {
  // Common words to exclude
  const stopWords = new Set([
    'of', 'the', 'and', 'or', 'with', 'for', 'in', 'on', 'at', 'to', 'by',
    'other', 'parts', 'thereof', 'nesoi', 'not', 'elsewhere', 'specified',
    'including', 'including', 'whether', 'whether', 'not', 'valued', 'over',
    'under', 'more', 'less', 'than', 'per', 'each', 'but', 'if', 'an', 'a',
  ]);
  
  // Clean and split description
  const cleaned = description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')  // Remove special characters
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();
  
  const words = cleaned.split(' ').filter(word => 
    word.length > 2 && 
    !stopWords.has(word) &&
    !/^\d+$/.test(word)  // Exclude pure numbers
  );
  
  // Dedupe
  const unique = [...new Set(words)];
  
  // Add chapter-specific keywords
  const chapterKeywords = CHAPTER_KEYWORDS[chapter] || [];
  
  return [...unique, ...chapterKeywords].slice(0, 20);  // Limit to 20 keywords
}

// Chapter-specific keywords to add (helps with search)
const CHAPTER_KEYWORDS: Record<string, string[]> = {
  '61': ['apparel', 'clothing', 'garment', 'knit', 'knitted'],
  '62': ['apparel', 'clothing', 'garment', 'woven'],
  '64': ['footwear', 'shoes', 'boots'],
  '84': ['machinery', 'mechanical', 'machine'],
  '85': ['electrical', 'electronics', 'electronic'],
  '39': ['plastic', 'plastics'],
  '40': ['rubber'],
  '73': ['iron', 'steel', 'metal'],
  '94': ['furniture'],
  '95': ['toys', 'games', 'sports'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Track indent groupings during parsing
 * These are the intermediate text lines like "Men's or boys':" that group statistical codes
 */
interface IndentGrouping {
  indent: number;
  text: string;
}

/**
 * Determine if a row is a grouping header (intermediate text, not an actual code)
 * Grouping rows typically:
 * - Have description text ending with ":"
 * - Have no duty rates or units
 * - Are at specific indent levels
 */
function isGroupingRow(row: ExcelRow): boolean {
  const description = String(row['Description'] || row['description'] || '').trim();
  const generalRate = String(row['General Rate of Duty'] || row['general'] || row['General'] || '').trim();
  const units = String(row['Unit of Quantity'] || row['units'] || row['Units'] || '').trim();
  
  // Grouping rows typically have description ending with ":" and no rates/units
  const endsWithColon = description.endsWith(':');
  const hasNoRate = !generalRate || generalRate === '';
  const hasNoUnits = !units || units === '';
  
  return endsWithColon && hasNoRate && hasNoUnits;
}

/**
 * Clean grouping text for display
 * "Men's or boys':" → "Men's or boys'"
 */
function cleanGroupingText(text: string): string {
  return text.replace(/:$/, '').trim();
}

/**
 * Read and parse USITC HTS Excel file
 */
export async function parseHtsExcelFile(filePath: string): Promise<ParsedHtsRow[]> {
  console.log(`[HTS Import] Reading Excel file: ${filePath}`);
  
  // Check if file exists
  try {
    const stats = fs.statSync(filePath);
    console.log(`[HTS Import] File exists, size: ${stats.size} bytes`);
  } catch (statErr) {
    console.error(`[HTS Import] Cannot stat file:`, statErr);
    throw new Error(`Cannot access file ${filePath}`);
  }
  
  // Read the Excel file
  let workbook;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    console.log(`[HTS Import] Read ${fileBuffer.length} bytes, parsing...`);
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (readErr) {
    console.error(`[HTS Import] Cannot read/parse file:`, readErr);
    throw new Error(`Cannot parse Excel file: ${readErr instanceof Error ? readErr.message : 'Unknown error'}`);
  }
  
  // USITC files typically have one main sheet
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`[HTS Import] Found ${rows.length} rows in sheet: ${sheetName}`);
  
  // Log first row to help debug column names
  if (rows.length > 0) {
    console.log(`[HTS Import] Column names: ${Object.keys(rows[0]).join(', ')}`);
  }
  
  const parsed: ParsedHtsRow[] = [];
  
  // Track current indent groupings as we parse
  // This is a stack where each entry is an indent level and its grouping text
  const groupingStack: IndentGrouping[] = [];
  let currentTariffLine = ''; // Track current 8-digit code for grouping context
  
  for (const row of rows) {
    const indent = Number(row['Indent'] || row['indent'] || 0);
    const htsNumber = row['HTS Number'] || row['HTS_Number'] || row['htsno'] || row['HTS No.'];
    const description = String(row['Description'] || row['description'] || '').trim();
    
    // Check if this is a grouping row (intermediate text without actual code)
    if (isGroupingRow(row) && description) {
      // Pop any groupings at same or higher indent level
      while (groupingStack.length > 0 && groupingStack[groupingStack.length - 1].indent >= indent) {
        groupingStack.pop();
      }
      
      // Push this grouping onto the stack
      groupingStack.push({
        indent,
        text: cleanGroupingText(description),
      });
      
      console.log(`[HTS Import] Found grouping at indent ${indent}: "${cleanGroupingText(description)}"`);
      continue; // Don't add grouping rows as HTS codes
    }
    
    // Track tariff line changes to reset groupings appropriately
    if (htsNumber && typeof htsNumber === 'string') {
      const code = normalizeHtsCode(htsNumber);
      const level = getHtsLevel(code);
      
      // If we hit a new tariff line (8-digit), clear groupings for the new context
      if (level === 'tariff_line' && code !== currentTariffLine) {
        currentTariffLine = code;
        // Clear groupings when we enter a new tariff line context
        groupingStack.length = 0;
      }
    }
    
    // Parse the actual HTS code row
    const parsedRow = parseExcelRow(row, groupingStack);
    if (parsedRow) {
      parsed.push(parsedRow);
    }
  }
  
  console.log(`[HTS Import] Successfully parsed ${parsed.length} HTS codes`);
  
  // Log some stats about groupings
  const withGroupings = parsed.filter(p => p.parentGroupings.length > 0);
  console.log(`[HTS Import] ${withGroupings.length} codes have parent groupings`);
  
  return parsed;
}

/**
 * Parse a single Excel row into our HTS format
 */
function parseExcelRow(row: ExcelRow, groupingStack: IndentGrouping[] = []): ParsedHtsRow | null {
  // Get HTS number (handle different column names)
  const htsNumber = row['HTS Number'] || row['HTS_Number'] || row['htsno'] || row['HTS No.'];
  
  if (!htsNumber || typeof htsNumber !== 'string') {
    return null;  // Skip rows without HTS number
  }
  
  // Clean and normalize the code
  const code = normalizeHtsCode(htsNumber);
  
  // Skip invalid codes (too short or invalid format)
  if (code.length < 2 || !/^\d+$/.test(code)) {
    return null;
  }
  
  // Parse hierarchy
  const { chapter, heading, subheading } = parseHtsCode(code);
  
  // Get description
  const description = String(
    row['Description'] || row['description'] || ''
  ).trim();
  
  if (!description) {
    return null;  // Skip rows without description
  }
  
  // Get indent level
  const indent = Number(row['Indent'] || row['indent'] || 0);
  
  // Get duty rates
  const generalRate = String(
    row['General Rate of Duty'] || row['general'] || row['General'] || ''
  ).trim() || null;
  
  const specialRates = String(
    row['Special Rate of Duty'] || row['special'] || row['Special'] || ''
  ).trim() || null;
  
  const column2Rate = String(
    row['Column 2 Rate of Duty'] || row['other'] || row['Column 2'] || ''
  ).trim() || null;
  
  // Get units
  const units = String(
    row['Unit of Quantity'] || row['units'] || row['Units'] || ''
  ).trim() || null;
  
  // Parse rates
  const adValoremRate = parseAdValoremRate(generalRate);
  const specificParsed = parseSpecificRate(generalRate);
  
  // Extract keywords
  const keywords = extractKeywords(description, chapter);
  
  // Get parent groupings from the current stack
  // Only include groupings that are at a lower indent level than this row
  const parentGroupings = groupingStack
    .filter(g => g.indent < indent)
    .map(g => g.text);
  
  return {
    code,
    codeFormatted: formatHtsCode(code),
    level: getHtsLevel(code),
    parentCode: getParentCode(code),
    chapter,
    heading,
    subheading,
    description,
    indent,
    generalRate,
    specialRates,
    column2Rate,
    units,
    adValoremRate,
    specificRate: specificParsed?.amount || null,
    specificUnit: specificParsed?.unit || null,
    keywords,
    parentGroupings,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE IMPORT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Import parsed HTS data into database
 */
export async function importHtsToDatabase(
  parsedRows: ParsedHtsRow[],
  options: {
    sourceFile: string;
    sourceRevision: string;
  }
): Promise<ImportResult> {
  const startTime = Date.now();
  const errors: { row: number; error: string }[] = [];
  let recordsCreated = 0;
  let recordsUpdated = 0;
  
  // Create sync log entry
  const syncLog = await prisma.htsSyncLog.create({
    data: {
      sourceFile: options.sourceFile,
      sourceRevision: options.sourceRevision,
      status: 'running',
      totalRecords: parsedRows.length,
    },
  });
  
  console.log(`[HTS Import] Starting import of ${parsedRows.length} records...`);
  
  try {
    // Process in smaller batches for remote DB (Neon)
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(parsedRows.length / BATCH_SIZE);
    
    for (let i = 0; i < parsedRows.length; i += BATCH_SIZE) {
      const batch = parsedRows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      
      console.log(`[HTS Import] Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`);
      
      // Use upsert for each row (no transaction needed, more reliable for remote DB)
      for (const row of batch) {
        try {
          await prisma.htsCode.upsert({
            where: { code: row.code },
            create: {
              code: row.code,
              codeFormatted: row.codeFormatted,
              level: row.level,
              parentCode: row.parentCode,
              chapter: row.chapter,
              heading: row.heading,
              subheading: row.subheading,
              description: row.description,
              indent: row.indent,
              generalRate: row.generalRate,
              specialRates: row.specialRates,
              column2Rate: row.column2Rate,
              units: row.units,
              adValoremRate: row.adValoremRate,
              specificRate: row.specificRate,
              specificUnit: row.specificUnit,
              keywords: row.keywords,
              parentGroupings: row.parentGroupings,  // Indent groupings from HTS
              sourceRevision: options.sourceRevision,
            },
            update: {
              codeFormatted: row.codeFormatted,
              level: row.level,
              parentCode: row.parentCode,
              chapter: row.chapter,
              heading: row.heading,
              subheading: row.subheading,
              description: row.description,
              indent: row.indent,
              generalRate: row.generalRate,
              specialRates: row.specialRates,
              column2Rate: row.column2Rate,
              units: row.units,
              adValoremRate: row.adValoremRate,
              specificRate: row.specificRate,
              specificUnit: row.specificUnit,
              keywords: row.keywords,
              parentGroupings: row.parentGroupings,  // Indent groupings from HTS
              lastSynced: new Date(),
              sourceRevision: options.sourceRevision,
            },
          });
          recordsCreated++; // Count all as "processed"
        } catch (error) {
          errors.push({
            row: i + batch.indexOf(row),
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      
      // Log progress every 10 batches
      if (batchNum % 10 === 0 || batchNum === totalBatches) {
        console.log(`[HTS Import] Progress: ${Math.round((batchNum / totalBatches) * 100)}% complete`);
      }
    }
    
    const durationMs = Date.now() - startTime;
    
    // Update sync log
    await prisma.htsSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'completed',
        recordsCreated,
        recordsUpdated,
        errors: errors.length > 0 ? errors : undefined,
        completedAt: new Date(),
        durationMs,
      },
    });
    
    console.log(`[HTS Import] Import completed in ${durationMs}ms`);
    console.log(`[HTS Import] Created: ${recordsCreated}, Updated: ${recordsUpdated}, Errors: ${errors.length}`);
    
    return {
      success: true,
      totalRecords: parsedRows.length,
      recordsCreated,
      recordsUpdated,
      errors,
      durationMs,
    };
    
  } catch (error) {
    // Update sync log with failure
    await prisma.htsSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        errors: [{ error: error instanceof Error ? error.message : String(error) }],
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
      },
    });
    
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN IMPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full import pipeline: read Excel → parse → load to database
 */
export async function runHtsImport(
  excelFilePath: string,
  revision: string = 'Unknown'
): Promise<ImportResult> {
  console.log(`[HTS Import] Starting full import pipeline`);
  console.log(`[HTS Import] Source file: ${excelFilePath}`);
  console.log(`[HTS Import] Revision: ${revision}`);
  
  // Parse the Excel file
  const parsed = await parseHtsExcelFile(excelFilePath);
  
  // Import to database
  const result = await importHtsToDatabase(parsed, {
    sourceFile: path.basename(excelFilePath),
    sourceRevision: revision,
  });
  
  return result;
}

/**
 * Import from default location
 * Looks for most recent .xlsx file in /data/hts/raw/
 */
export async function runHtsImportFromDefault(): Promise<ImportResult> {
  const rawDir = path.join(process.cwd(), 'data', 'hts', 'raw');
  
  if (!fs.existsSync(rawDir)) {
    throw new Error(`HTS raw directory not found: ${rawDir}`);
  }
  
  // Find the most recent .xlsx file
  const files = fs.readdirSync(rawDir)
    .filter(f => f.endsWith('.xlsx'))
    .map(f => ({
      name: f,
      path: path.join(rawDir, f),
      mtime: fs.statSync(path.join(rawDir, f)).mtime,
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
  
  if (files.length === 0) {
    throw new Error(`No .xlsx files found in ${rawDir}. Please download the HTS Excel file from https://hts.usitc.gov/ and place it in this directory.`);
  }
  
  const latestFile = files[0];
  console.log(`[HTS Import] Using file: ${latestFile.name}`);
  
  // Extract revision from filename if possible (e.g., "hts_2025_rev1.xlsx")
  const revisionMatch = latestFile.name.match(/(\d{4}).*?(rev\d+)?/i);
  const revision = revisionMatch 
    ? `${revisionMatch[1]} ${revisionMatch[2] || ''}`.trim()
    : latestFile.name;
  
  return runHtsImport(latestFile.path, revision);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export parsed HTS to JSON file (for debugging/reference)
 */
export async function exportHtsToJson(outputPath: string): Promise<void> {
  const codes = await prisma.htsCode.findMany({
    orderBy: { code: 'asc' },
  });
  
  fs.writeFileSync(outputPath, JSON.stringify(codes, null, 2));
  console.log(`[HTS Export] Exported ${codes.length} codes to ${outputPath}`);
}

/**
 * Get import history
 */
export async function getHtsImportHistory(limit: number = 10) {
  return prisma.htsSyncLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

