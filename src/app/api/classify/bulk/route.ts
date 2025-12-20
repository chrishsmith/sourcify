/**
 * Bulk Classification API
 * 
 * Accepts a CSV file and classifies each row.
 * Returns a streaming response with progress updates.
 */

import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { classifyProduct } from '@/services/classificationEngine';
import { getEffectiveTariff, convertToLegacyFormat } from '@/services/tariffRegistry';
import { saveSearchToHistory } from '@/services/searchHistory';
import { prisma } from '@/lib/db';
import type { ClassificationInput } from '@/types/classification.types';

// Parse CSV content
function parseCSV(content: string): Record<string, string>[] {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => 
        h.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_')
    );

    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (const char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (values.length === headers.length) {
            const row: Record<string, string> = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx]?.replace(/^["']|["']$/g, '') || '';
            });
            rows.push(row);
        }
    }

    return rows;
}

// Map CSV row to ClassificationInput
function mapRowToInput(row: Record<string, string>): ClassificationInput | null {
    const description = row.product_description || row.description || row.productdescription;
    
    if (!description || description.length < 10) {
        return null;
    }

    return {
        productName: row.product_name || row.name || row.productname || undefined,
        productSku: row.sku || row.product_sku || row.part_number || undefined,
        productDescription: description,
        classificationType: 'import',
        countryOfOrigin: row.country_of_origin || row.country || row.origin || undefined,
        materialComposition: row.material || row.material_composition || row.materials || undefined,
        intendedUse: row.intended_use || row.use || row.intendeduse || undefined,
    };
}

// Parse base MFN rate string to numeric percentage
function parseBaseMfnRate(rateStr: string): number {
    if (!rateStr || rateStr.toLowerCase() === 'free') return 0;
    const pctMatch = rateStr.match(/(\d+(?:\.\d+)?)\s*%?/);
    if (pctMatch) return parseFloat(pctMatch[1]);
    return 0;
}

// Country code mapping
function getCountryCode(countryOfOrigin?: string): string | null {
    if (!countryOfOrigin) return null;
    if (/^[A-Z]{2}$/.test(countryOfOrigin)) return countryOfOrigin;

    const mappings: Record<string, string> = {
        'china': 'CN', 'cn': 'CN',
        'vietnam': 'VN', 'vn': 'VN',
        'mexico': 'MX', 'mx': 'MX',
        'india': 'IN', 'in': 'IN',
        'germany': 'DE', 'de': 'DE',
        'japan': 'JP', 'jp': 'JP',
        'south korea': 'KR', 'korea': 'KR', 'kr': 'KR',
        'taiwan': 'TW', 'tw': 'TW',
        'thailand': 'TH', 'th': 'TH',
        'canada': 'CA', 'ca': 'CA',
    };

    return mappings[countryOfOrigin.toLowerCase()] || null;
}

export async function POST(request: NextRequest) {
    try {
        // Get authenticated user
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        const userId = session?.user?.id;

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return new Response(JSON.stringify({ error: 'No file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Read file content
        const content = await file.text();
        const rows = parseCSV(content);

        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: 'No valid rows found in CSV' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Create batch record
        let batchId: string | undefined;
        try {
            const batch = await prisma.bulkImportBatch.create({
                data: {
                    userId: userId || 'anonymous',
                    fileName: file.name,
                    totalRows: rows.length,
                    status: 'PROCESSING',
                    startedAt: new Date(),
                },
            });
            batchId = batch.id;
        } catch (e) {
            console.warn('[Bulk] Failed to create batch record:', e);
            // Continue without batch tracking
        }

        // Create streaming response
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                let successCount = 0;
                let failedCount = 0;
                const errors: { row: number; error: string }[] = [];

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const input = mapRowToInput(row);

                    if (!input) {
                        failedCount++;
                        errors.push({ row: i + 2, error: 'Invalid or missing product description' });
                        continue;
                    }

                    try {
                        // Classify the product
                        const result = await classifyProduct(input);

                        // Calculate effective tariff from registry if country provided
                        const countryCode = getCountryCode(input.countryOfOrigin);
                        if (countryCode) {
                            try {
                                const baseMfnRate = parseBaseMfnRate(result.dutyRate.generalRate);
                                const registryResult = await getEffectiveTariff(
                                    countryCode,
                                    result.htsCode.code,
                                    { baseMfnRate }
                                );
                                result.effectiveTariff = convertToLegacyFormat(
                                    registryResult,
                                    result.htsCode.code,
                                    result.htsCode.description,
                                    countryCode
                                );
                            } catch (e) {
                                console.warn('[Bulk] Failed to calculate tariff for row', i + 2, e);
                            }
                        }

                        // Save to history
                        await saveSearchToHistory(input, result, userId, {
                            searchType: 'BULK_CSV',
                            batchId,
                        });

                        successCount++;
                    } catch (error) {
                        failedCount++;
                        errors.push({ 
                            row: i + 2, 
                            error: error instanceof Error ? error.message : 'Classification failed' 
                        });
                    }

                    // Send progress update
                    const progress = Math.round(((i + 1) / rows.length) * 100);
                    controller.enqueue(encoder.encode(
                        JSON.stringify({ type: 'progress', progress, processed: i + 1, total: rows.length }) + '\n'
                    ));
                }

                // Update batch record
                if (batchId) {
                    try {
                        await prisma.bulkImportBatch.update({
                            where: { id: batchId },
                            data: {
                                status: 'COMPLETED',
                                processedRows: rows.length,
                                successCount,
                                errorCount: failedCount,
                                errors: errors.length > 0 ? errors : undefined,
                                completedAt: new Date(),
                            },
                        });
                    } catch (e) {
                        console.warn('[Bulk] Failed to update batch record:', e);
                    }
                }

                // Send completion
                controller.enqueue(encoder.encode(
                    JSON.stringify({ 
                        type: 'complete', 
                        success: successCount, 
                        failed: failedCount,
                        batchId,
                        errors: errors.slice(0, 10), // First 10 errors
                    }) + '\n'
                ));

                controller.close();
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Transfer-Encoding': 'chunked',
            },
        });
    } catch (error) {
        console.error('[Bulk] Error:', error);
        return new Response(JSON.stringify({ error: 'Bulk classification failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}


