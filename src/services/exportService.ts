/**
 * Export Service
 * 
 * Reusable utilities for exporting data to Excel and CSV formats.
 * Uses SheetJS (xlsx) library for Excel generation.
 */

import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Column configuration for Excel export
 */
export interface ExcelColumn {
    /** The key in the data object to use for this column */
    key: string;
    /** The header text to display in Excel */
    header: string;
    /** Column width in characters (default: auto) */
    width?: number;
    /** Optional transform function for the value */
    transform?: (value: unknown, row: Record<string, unknown>) => string | number;
}

/**
 * Options for Excel export
 */
export interface ExcelExportOptions {
    /** Sheet name (default: 'Sheet1') */
    sheetName?: string;
    /** Filename without extension (default: 'export') */
    filename?: string;
    /** Whether to include timestamp in filename (default: true) */
    includeTimestamp?: boolean;
}

/**
 * Options for CSV export
 */
export interface CSVExportOptions {
    /** Filename without extension (default: 'export') */
    filename?: string;
    /** Whether to include timestamp in filename (default: true) */
    includeTimestamp?: boolean;
    /** Delimiter character (default: ',') */
    delimiter?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate filename with optional timestamp
 */
function generateFilename(
    baseName: string, 
    extension: string, 
    includeTimestamp: boolean
): string {
    const timestamp = includeTimestamp 
        ? `_${new Date().toISOString().split('T')[0]}` 
        : '';
    return `${baseName}${timestamp}.${extension}`;
}

/**
 * Transform data array using column configuration
 */
function transformData(
    data: Record<string, unknown>[],
    columns: ExcelColumn[]
): Record<string, string | number>[] {
    return data.map(row => {
        const transformed: Record<string, string | number> = {};
        columns.forEach(col => {
            const value = row[col.key];
            if (col.transform) {
                transformed[col.header] = col.transform(value, row);
            } else if (value === null || value === undefined) {
                transformed[col.header] = '';
            } else if (typeof value === 'object') {
                transformed[col.header] = JSON.stringify(value);
            } else {
                transformed[col.header] = String(value);
            }
        });
        return transformed;
    });
}

/**
 * Escape CSV value (handles quotes, commas, newlines)
 */
function escapeCSVValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    const stringValue = String(value);
    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
}

/**
 * Trigger browser download of a file
 */
function downloadFile(content: BlobPart, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export data to Excel file
 * 
 * @param data - Array of objects to export
 * @param columns - Column configuration defining headers and formatting
 * @param options - Export options (filename, sheet name, etc.)
 * 
 * @example
 * ```typescript
 * const data = [
 *   { name: 'Widget', htsCode: '8471300100', dutyRate: 0.05 },
 *   { name: 'Gadget', htsCode: '8471300200', dutyRate: 0.03 }
 * ];
 * 
 * const columns: ExcelColumn[] = [
 *   { key: 'name', header: 'Product Name', width: 30 },
 *   { key: 'htsCode', header: 'HTS Code', width: 15 },
 *   { key: 'dutyRate', header: 'Duty Rate', width: 12, transform: (v) => `${(v as number * 100).toFixed(2)}%` }
 * ];
 * 
 * exportToExcel(data, columns, { filename: 'products' });
 * ```
 */
export function exportToExcel(
    data: Record<string, unknown>[],
    columns: ExcelColumn[],
    options: ExcelExportOptions = {}
): void {
    const {
        sheetName = 'Sheet1',
        filename = 'export',
        includeTimestamp = true
    } = options;

    // Transform data using column configuration
    const exportData = transformData(data, columns);

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    worksheet['!cols'] = columns.map(col => ({
        wch: col.width || Math.max(col.header.length, 10)
    }));

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate filename and trigger download
    const outputFilename = generateFilename(filename, 'xlsx', includeTimestamp);
    XLSX.writeFile(workbook, outputFilename);
}

/**
 * Export data to Excel with simple headers (auto-detect columns from data keys)
 * 
 * @param data - Array of objects to export
 * @param options - Export options
 * 
 * @example
 * ```typescript
 * const data = [
 *   { name: 'Widget', htsCode: '8471300100' },
 *   { name: 'Gadget', htsCode: '8471300200' }
 * ];
 * 
 * exportToExcelSimple(data, { filename: 'products' });
 * // Uses object keys as headers: 'name', 'htsCode'
 * ```
 */
export function exportToExcelSimple(
    data: Record<string, unknown>[],
    options: ExcelExportOptions = {}
): void {
    if (data.length === 0) {
        console.warn('exportToExcelSimple: No data to export');
        return;
    }

    // Auto-generate columns from data keys
    const keys = Object.keys(data[0]);
    const columns: ExcelColumn[] = keys.map(key => ({
        key,
        header: key
            .replace(/([A-Z])/g, ' $1') // Add space before capitals
            .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
            .trim()
    }));

    exportToExcel(data, columns, options);
}

// ═══════════════════════════════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Export data to CSV file
 * 
 * @param data - Array of objects to export
 * @param options - Export options (filename, delimiter, etc.)
 * 
 * @example
 * ```typescript
 * const data = [
 *   { name: 'Widget', htsCode: '8471300100' },
 *   { name: 'Gadget', htsCode: '8471300200' }
 * ];
 * 
 * exportToCSV(data, { filename: 'products' });
 * ```
 */
export function exportToCSV(
    data: Record<string, unknown>[],
    options: CSVExportOptions = {}
): void {
    const {
        filename = 'export',
        includeTimestamp = true,
        delimiter = ','
    } = options;

    if (data.length === 0) {
        console.warn('exportToCSV: No data to export');
        return;
    }

    // Get headers from first row
    const headers = Object.keys(data[0]);

    // Build CSV content
    const csvContent = [
        // Header row
        headers.join(delimiter),
        // Data rows
        ...data.map(row => 
            headers.map(header => escapeCSVValue(row[header])).join(delimiter)
        )
    ].join('\n');

    // Generate filename and trigger download
    const outputFilename = generateFilename(filename, 'csv', includeTimestamp);
    downloadFile(csvContent, outputFilename, 'text/csv;charset=utf-8;');
}

/**
 * Export data to CSV with custom column configuration
 * 
 * @param data - Array of objects to export
 * @param columns - Column configuration (uses same format as Excel for consistency)
 * @param options - Export options
 * 
 * @example
 * ```typescript
 * const columns: ExcelColumn[] = [
 *   { key: 'name', header: 'Product Name' },
 *   { key: 'htsCode', header: 'HTS Code' },
 *   { key: 'dutyRate', header: 'Duty Rate', transform: (v) => `${(v as number * 100).toFixed(2)}%` }
 * ];
 * 
 * exportToCSVWithColumns(data, columns, { filename: 'products' });
 * ```
 */
export function exportToCSVWithColumns(
    data: Record<string, unknown>[],
    columns: ExcelColumn[],
    options: CSVExportOptions = {}
): void {
    const {
        filename = 'export',
        includeTimestamp = true,
        delimiter = ','
    } = options;

    // Transform data using column configuration
    const transformedData = transformData(data, columns);

    // Get headers from column config
    const headers = columns.map(col => col.header);

    // Build CSV content
    const csvContent = [
        // Header row
        headers.map(h => escapeCSVValue(h)).join(delimiter),
        // Data rows
        ...transformedData.map(row => 
            headers.map(header => escapeCSVValue(row[header])).join(delimiter)
        )
    ].join('\n');

    // Generate filename and trigger download
    const outputFilename = generateFilename(filename, 'csv', includeTimestamp);
    downloadFile(csvContent, outputFilename, 'text/csv;charset=utf-8;');
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESETS FOR COMMON EXPORT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard column configurations for common data types
 */
export const ExportPresets = {
    /**
     * Columns for classification results export
     */
    classificationResults: [
        { key: 'rowNumber', header: 'Row #', width: 6 },
        { key: 'productName', header: 'Product Name', width: 20 },
        { key: 'sku', header: 'SKU', width: 12 },
        { key: 'productDescription', header: 'Description', width: 40 },
        { key: 'countryOfOrigin', header: 'Country', width: 8 },
        { key: 'material', header: 'Material', width: 15 },
        { key: 'status', header: 'Status', width: 10 },
        { key: 'htsCodeFormatted', header: 'HTS Code', width: 15 },
        { key: 'htsDescription', header: 'HTS Description', width: 40 },
        { 
            key: 'confidence', 
            header: 'Confidence', 
            width: 12,
            transform: (v: unknown) => v ? `${Math.round(v as number)}%` : ''
        },
        { key: 'effectiveRate', header: 'Effective Duty Rate', width: 15 },
        { key: 'error', header: 'Error', width: 30 },
    ] as ExcelColumn[],

    /**
     * Columns for saved products export
     */
    savedProducts: [
        { key: 'name', header: 'Product Name', width: 30 },
        { key: 'description', header: 'Description', width: 50 },
        { key: 'htsCode', header: 'HTS Code', width: 15 },
        { key: 'countryOfOrigin', header: 'Country of Origin', width: 15 },
        { key: 'effectiveDutyRate', header: 'Duty Rate', width: 12 },
        { 
            key: 'createdAt', 
            header: 'Date Added', 
            width: 12,
            transform: (v: unknown) => v ? new Date(v as string).toLocaleDateString() : ''
        },
        { key: 'category', header: 'Category', width: 15 },
        { 
            key: 'isFavorite', 
            header: 'Favorite', 
            width: 10,
            transform: (v: unknown) => v ? 'Yes' : 'No'
        },
        { 
            key: 'isMonitored', 
            header: 'Monitored', 
            width: 10,
            transform: (v: unknown) => v ? 'Yes' : 'No'
        },
    ] as ExcelColumn[],

    /**
     * Columns for search history export
     */
    searchHistory: [
        { key: 'query', header: 'Product Description', width: 50 },
        { key: 'htsCode', header: 'HTS Code', width: 15 },
        { key: 'htsDescription', header: 'HTS Description', width: 40 },
        { key: 'confidence', header: 'Confidence', width: 12 },
        { key: 'countryOfOrigin', header: 'Country', width: 10 },
        { 
            key: 'createdAt', 
            header: 'Date', 
            width: 12,
            transform: (v: unknown) => v ? new Date(v as string).toLocaleDateString() : ''
        },
    ] as ExcelColumn[],

    /**
     * Columns for landed cost scenarios export
     */
    landedCost: [
        { key: 'productValue', header: 'Product Value', width: 15 },
        { key: 'htsCode', header: 'HTS Code', width: 15 },
        { key: 'countryOfOrigin', header: 'Country', width: 12 },
        { key: 'baseDuty', header: 'Base Duty', width: 12 },
        { key: 'additionalDuties', header: 'Additional Duties', width: 15 },
        { key: 'fees', header: 'Fees (MPF/HMF)', width: 15 },
        { key: 'totalDuty', header: 'Total Duty', width: 12 },
        { key: 'landedCost', header: 'Landed Cost', width: 15 },
    ] as ExcelColumn[],
};

/**
 * Quick export functions using presets
 */
export const QuickExport = {
    /**
     * Export classification results to Excel
     */
    classificationResults: (data: Record<string, unknown>[], filename = 'classification_results') => {
        exportToExcel(data, ExportPresets.classificationResults, { filename });
    },

    /**
     * Export saved products to Excel
     */
    savedProducts: (data: Record<string, unknown>[], filename = 'saved_products') => {
        exportToExcel(data, ExportPresets.savedProducts, { filename });
    },

    /**
     * Export search history to Excel
     */
    searchHistory: (data: Record<string, unknown>[], filename = 'search_history') => {
        exportToExcel(data, ExportPresets.searchHistory, { filename });
    },

    /**
     * Export landed cost scenarios to Excel
     */
    landedCost: (data: Record<string, unknown>[], filename = 'landed_cost') => {
        exportToExcel(data, ExportPresets.landedCost, { filename });
    },
};
