'use client';

import React, { useState, useRef } from 'react';
import { 
    Card, Typography, Button, Upload, Table, Progress, Space, 
    Tag, Tooltip, Alert, message, Empty, Spin 
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { 
    Upload as UploadIcon, 
    FileSpreadsheet, 
    Download, 
    CheckCircle, 
    XCircle, 
    AlertTriangle,
    Trash2,
    Play,
    FileText,
    RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportToExcel, ExportPresets } from '@/services/exportService';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ParsedRow {
    rowNumber: number;
    productDescription: string;
    productName?: string;
    sku?: string;
    countryOfOrigin?: string;
    material?: string;
    intendedUse?: string;
}

interface ClassificationResultRow extends ParsedRow {
    status: 'pending' | 'processing' | 'success' | 'error';
    htsCode?: string;
    htsCodeFormatted?: string;
    htsDescription?: string;
    confidence?: number;
    effectiveRate?: string;
    error?: string;
}

type ProcessingState = 'idle' | 'preview' | 'processing' | 'complete';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const BulkClassificationContent: React.FC = () => {
    const [state, setState] = useState<ProcessingState>('idle');
    const [file, setFile] = useState<File | null>(null);
    const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
    const [allRows, setAllRows] = useState<ClassificationResultRow[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0, percent: 0 });
    const [stats, setStats] = useState({ success: 0, failed: 0 });
    const [messageApi, contextHolder] = message.useMessage();
    const abortControllerRef = useRef<AbortController | null>(null);

    // Parse CSV content into rows
    const parseCSV = (content: string): ParsedRow[] => {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];

        // Parse headers - normalize them
        const headers = lines[0].split(',').map(h => 
            h.trim().toLowerCase().replace(/['"]/g, '').replace(/\s+/g, '_')
        );

        const rows: ParsedRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values: string[] = [];
            let current = '';
            let inQuotes = false;

            for (const char of lines[i]) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/^["']|["']$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/^["']|["']$/g, ''));

            if (values.length >= headers.length) {
                const rowData: Record<string, string> = {};
                headers.forEach((header, idx) => {
                    rowData[header] = values[idx] || '';
                });

                const description = rowData.product_description || rowData.description || rowData.productdescription;
                
                if (description && description.length >= 5) {
                    rows.push({
                        rowNumber: i + 1,
                        productDescription: description,
                        productName: rowData.product_name || rowData.name || rowData.productname || undefined,
                        sku: rowData.sku || rowData.product_sku || rowData.part_number || undefined,
                        countryOfOrigin: rowData.country_of_origin || rowData.country || rowData.origin || undefined,
                        material: rowData.material || rowData.material_composition || rowData.materials || undefined,
                        intendedUse: rowData.intended_use || rowData.use || rowData.intendeduse || undefined,
                    });
                }
            }
        }

        return rows;
    };

    // Handle file selection
    const handleFileSelect = async (uploadFile: UploadFile) => {
        const rawFile = uploadFile.originFileObj || uploadFile as unknown as File;
        if (!rawFile) return false;

        setFile(rawFile);
        
        try {
            const content = await rawFile.text();
            const parsed = parseCSV(content);
            
            if (parsed.length === 0) {
                messageApi.error('No valid rows found in the file. Make sure it has a product_description column.');
                return false;
            }

            setPreviewRows(parsed.slice(0, 5));
            setAllRows(parsed.map(row => ({ ...row, status: 'pending' })));
            setState('preview');
            messageApi.success(`Found ${parsed.length} products to classify`);
        } catch (error) {
            console.error('File parse error:', error);
            messageApi.error('Failed to parse file. Please check the format.');
        }

        return false; // Prevent default upload
    };

    // Start bulk classification
    const handleStartClassification = async () => {
        if (allRows.length === 0) return;

        setState('processing');
        setProgress({ current: 0, total: allRows.length, percent: 0 });
        setStats({ success: 0, failed: 0 });

        abortControllerRef.current = new AbortController();

        let successCount = 0;
        let failedCount = 0;

        // Process rows one by one (could batch but streaming gives better UX)
        for (let i = 0; i < allRows.length; i++) {
            if (abortControllerRef.current?.signal.aborted) break;

            const row = allRows[i];
            
            // Update status to processing
            setAllRows(prev => prev.map((r, idx) => 
                idx === i ? { ...r, status: 'processing' } : r
            ));

            try {
                const response = await fetch('/api/classify-v10', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: row.productDescription,
                        origin: row.countryOfOrigin,
                        material: row.material,
                        saveToHistory: true,
                    }),
                    signal: abortControllerRef.current?.signal,
                });

                if (!response.ok) {
                    throw new Error('Classification failed');
                }

                const data = await response.json();

                if (data.success && data.primary) {
                    successCount++;
                    setAllRows(prev => prev.map((r, idx) => 
                        idx === i ? { 
                            ...r, 
                            status: 'success',
                            htsCode: data.primary.htsCode,
                            htsCodeFormatted: data.primary.htsCodeFormatted,
                            htsDescription: data.primary.shortDescription,
                            confidence: data.primary.confidence,
                            effectiveRate: data.primary.duty?.effective,
                        } : r
                    ));
                } else {
                    throw new Error(data.error || 'No classification found');
                }
            } catch (error) {
                if (abortControllerRef.current?.signal.aborted) break;
                
                failedCount++;
                setAllRows(prev => prev.map((r, idx) => 
                    idx === i ? { 
                        ...r, 
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Classification failed'
                    } : r
                ));
            }

            // Update progress
            const current = i + 1;
            setProgress({ 
                current, 
                total: allRows.length, 
                percent: Math.round((current / allRows.length) * 100) 
            });
            setStats({ success: successCount, failed: failedCount });
        }

        setState('complete');
        messageApi.success(`Bulk classification complete! ${successCount} successful, ${failedCount} failed.`);
    };

    // Cancel processing
    const handleCancel = () => {
        abortControllerRef.current?.abort();
        setState('complete');
        messageApi.warning('Classification cancelled');
    };

    // Reset to start over
    const handleReset = () => {
        setFile(null);
        setPreviewRows([]);
        setAllRows([]);
        setProgress({ current: 0, total: 0, percent: 0 });
        setStats({ success: 0, failed: 0 });
        setState('idle');
    };

    // Download CSV template
    const handleDownloadTemplate = () => {
        const csv = `product_description,product_name,sku,country_of_origin,material,intended_use
"Men's cotton t-shirt, crew neck, short sleeve",Basic Tee,SKU-001,CN,100% cotton,casual wear
"Plastic phone case for iPhone, hard shell protective cover",iPhone Case,SKU-002,VN,ABS plastic,mobile phone protection
"Stainless steel water bottle, 500ml, double wall insulated",Hydro Bottle,SKU-003,CN,stainless steel,beverage container
"Leather wallet, bifold, men's accessory",Classic Wallet,SKU-004,IN,genuine leather,personal accessory
"Ceramic coffee mug with handle, 12oz capacity",Morning Mug,SKU-005,CN,ceramic,beverage container`;
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk_classification_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Export results to Excel using the export service
    const handleExportExcel = () => {
        // Transform status for export
        const exportData = allRows.map(row => ({
            ...row,
            status: row.status === 'success' ? 'Success' : row.status === 'error' ? 'Error' : 'Pending',
        }));

        exportToExcel(
            exportData as Record<string, unknown>[],
            ExportPresets.classificationResults,
            {
                filename: 'classification_results',
                sheetName: 'Classification Results',
            }
        );
        
        messageApi.success('Results exported to Excel!');
    };

    // Preview columns
    const previewColumns = [
        { 
            title: 'Row', 
            dataIndex: 'rowNumber', 
            key: 'row', 
            width: 60,
        },
        { 
            title: 'Description', 
            dataIndex: 'productDescription', 
            key: 'description',
            ellipsis: true,
        },
        { 
            title: 'Name', 
            dataIndex: 'productName', 
            key: 'name',
            width: 150,
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
        { 
            title: 'Country', 
            dataIndex: 'countryOfOrigin', 
            key: 'country',
            width: 80,
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
    ];

    // Results columns
    const resultsColumns = [
        { 
            title: 'Row', 
            dataIndex: 'rowNumber', 
            key: 'row', 
            width: 60,
            fixed: 'left' as const,
        },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            width: 100,
            fixed: 'left' as const,
            render: (status: string) => {
                if (status === 'success') {
                    return <Tag icon={<CheckCircle size={12} />} color="success">Success</Tag>;
                }
                if (status === 'error') {
                    return <Tag icon={<XCircle size={12} />} color="error">Failed</Tag>;
                }
                if (status === 'processing') {
                    return <Tag icon={<Spin size="small" />} color="processing">Processing</Tag>;
                }
                return <Tag color="default">Pending</Tag>;
            },
        },
        { 
            title: 'Description', 
            dataIndex: 'productDescription', 
            key: 'description',
            width: 250,
            ellipsis: true,
        },
        { 
            title: 'HTS Code', 
            dataIndex: 'htsCodeFormatted', 
            key: 'htsCode',
            width: 130,
            render: (code: string, record: ClassificationResultRow) => code ? (
                <Tooltip title={record.htsDescription}>
                    <span className="font-mono text-teal-700 font-medium">{code}</span>
                </Tooltip>
            ) : <Text type="secondary">-</Text>,
        },
        { 
            title: 'Confidence', 
            dataIndex: 'confidence', 
            key: 'confidence',
            width: 100,
            render: (conf: number) => conf ? (
                <Tag color={conf >= 80 ? 'green' : conf >= 60 ? 'gold' : 'orange'}>
                    {Math.round(conf)}%
                </Tag>
            ) : <Text type="secondary">-</Text>,
        },
        { 
            title: 'Duty Rate', 
            dataIndex: 'effectiveRate', 
            key: 'dutyRate',
            width: 100,
            render: (rate: string) => rate || <Text type="secondary">-</Text>,
        },
        { 
            title: 'Country', 
            dataIndex: 'countryOfOrigin', 
            key: 'country',
            width: 80,
            render: (text: string) => text || <Text type="secondary">-</Text>,
        },
        { 
            title: 'Error', 
            dataIndex: 'error', 
            key: 'error',
            width: 200,
            ellipsis: true,
            render: (error: string) => error ? (
                <Tooltip title={error}>
                    <Text type="danger" className="text-sm">{error}</Text>
                </Tooltip>
            ) : null,
        },
    ];

    return (
        <>
            {contextHolder}
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                    <div>
                        <Title level={2} className="!mb-1 flex items-center gap-3">
                            <FileSpreadsheet size={28} className="text-teal-600" />
                            Bulk Classification
                        </Title>
                        <Text type="secondary">
                            Upload a CSV file to classify multiple products at once using AI.
                        </Text>
                    </div>
                    {state !== 'idle' && (
                        <Button 
                            icon={<RefreshCw size={16} />} 
                            onClick={handleReset}
                            disabled={state === 'processing'}
                        >
                            Start Over
                        </Button>
                    )}
                </div>

                {/* Step 1: Upload */}
                {state === 'idle' && (
                    <Card className="border-slate-200">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                                    1
                                </div>
                                <Title level={4} className="!mb-0">Upload Your File</Title>
                            </div>

                            <Dragger
                                accept=".csv"
                                beforeUpload={(file) => handleFileSelect(file as unknown as UploadFile)}
                                showUploadList={false}
                                className="bg-slate-50 border-2 border-dashed border-slate-200 hover:border-teal-400 transition-colors"
                            >
                                <p className="ant-upload-drag-icon">
                                    <UploadIcon size={48} className="text-teal-600 mx-auto" />
                                </p>
                                <p className="ant-upload-text text-lg">
                                    Drag & drop your CSV file here
                                </p>
                                <p className="ant-upload-hint text-slate-500">
                                    Or click to browse. Maximum 500 products per file.
                                </p>
                            </Dragger>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-4 rounded-lg">
                                    <Text strong className="block mb-2">Required Columns:</Text>
                                    <ul className="text-sm text-slate-600 space-y-1 list-none pl-0">
                                        <li>• <code className="bg-slate-200 px-1 rounded">product_description</code> - Product description</li>
                                    </ul>
                                    <Text strong className="block mt-4 mb-2">Optional Columns:</Text>
                                    <ul className="text-sm text-slate-600 space-y-1 list-none pl-0">
                                        <li>• <code className="bg-slate-200 px-1 rounded">product_name</code> - Product name</li>
                                        <li>• <code className="bg-slate-200 px-1 rounded">sku</code> - SKU or part number</li>
                                        <li>• <code className="bg-slate-200 px-1 rounded">country_of_origin</code> - 2-letter code (CN, VN)</li>
                                        <li>• <code className="bg-slate-200 px-1 rounded">material</code> - Material composition</li>
                                        <li>• <code className="bg-slate-200 px-1 rounded">intended_use</code> - Intended use</li>
                                    </ul>
                                </div>

                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <Text strong className="block mb-2 text-amber-800">Tips for Best Results</Text>
                                            <ul className="text-sm text-amber-700 space-y-1 list-none pl-0">
                                                <li>• Include material composition when possible</li>
                                                <li>• Use 2-letter country codes (CN, VN, MX)</li>
                                                <li>• More detail = better classification</li>
                                                <li>• Each row takes ~3-5 seconds to classify</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Button 
                                type="link" 
                                icon={<Download size={16} />}
                                onClick={handleDownloadTemplate}
                                className="p-0"
                            >
                                Download Sample Template (CSV)
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Step 2: Preview */}
                {state === 'preview' && (
                    <Card className="border-slate-200">
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold flex-shrink-0">
                                        2
                                    </div>
                                    <Title level={4} className="!mb-0">Preview & Confirm</Title>
                                </div>
                                <Tag color="blue" className="text-sm self-start sm:self-auto">
                                    <FileText size={14} className="inline mr-1" />
                                    <span className="max-w-[150px] sm:max-w-none truncate inline-block">{file?.name}</span>
                                </Tag>
                            </div>

                            <Alert
                                message={`Found ${allRows.length} products to classify`}
                                description={`Estimated time: ${Math.ceil(allRows.length * 4 / 60)} - ${Math.ceil(allRows.length * 6 / 60)} minutes`}
                                type="info"
                                showIcon
                            />

                            <div>
                                <Text strong className="block mb-2">Preview (first 5 rows):</Text>
                                <Table
                                    dataSource={previewRows}
                                    columns={previewColumns}
                                    rowKey="rowNumber"
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: 500 }}
                                    className="border border-slate-200 rounded-lg"
                                />
                                {allRows.length > 5 && (
                                    <Text type="secondary" className="block mt-2 text-center">
                                        ... and {allRows.length - 5} more rows
                                    </Text>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button 
                                    type="primary" 
                                    size="large"
                                    icon={<Play size={18} />}
                                    onClick={handleStartClassification}
                                    className="bg-teal-600 hover:bg-teal-700"
                                >
                                    Start Classification ({allRows.length} products)
                                </Button>
                                <Button 
                                    size="large"
                                    icon={<Trash2 size={16} />}
                                    onClick={handleReset}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 3: Processing */}
                {state === 'processing' && (
                    <Card className="border-slate-200">
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                    <Spin size="small" />
                                </div>
                                <Title level={4} className="!mb-0">Classifying Products...</Title>
                            </div>

                            <div className="text-center py-4">
                                <Progress 
                                    type="circle" 
                                    percent={progress.percent} 
                                    size={120}
                                    strokeColor="#0d9488"
                                />
                                <div className="mt-4">
                                    <Text className="text-lg">
                                        Processing {progress.current} of {progress.total}
                                    </Text>
                                </div>
                                <div className="flex justify-center gap-8 mt-4">
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-green-600">{stats.success}</div>
                                        <div className="text-slate-500 text-sm">Successful</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-xl font-bold text-red-600">{stats.failed}</div>
                                        <div className="text-slate-500 text-sm">Failed</div>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center">
                                <Button 
                                    danger 
                                    onClick={handleCancel}
                                >
                                    Cancel Processing
                                </Button>
                            </div>

                            {/* Live results table */}
                            <div>
                                <Text strong className="block mb-2">Live Results:</Text>
                                <Table
                                    dataSource={allRows}
                                    columns={resultsColumns}
                                    rowKey="rowNumber"
                                    pagination={{ pageSize: 10 }}
                                    size="small"
                                    scroll={{ x: 1200 }}
                                    className="border border-slate-200 rounded-lg"
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* Step 4: Complete */}
                {state === 'complete' && (
                    <div className="space-y-6">
                        <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 to-white">
                            <div className="text-center py-4">
                                <CheckCircle size={64} className="text-green-600 mx-auto mb-4" />
                                <Title level={3} className="!mb-2">Classification Complete!</Title>
                                <Paragraph className="text-slate-600">
                                    Successfully classified {stats.success} of {allRows.length} products.
                                </Paragraph>
                                <div className="flex justify-center gap-8 mt-4">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-green-600">{stats.success}</div>
                                        <div className="text-slate-500">Successful</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
                                        <div className="text-slate-500">Failed</div>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <Button 
                                        type="primary" 
                                        size="large"
                                        icon={<Download size={18} />}
                                        onClick={handleExportExcel}
                                        className="bg-teal-600 hover:bg-teal-700"
                                    >
                                        Download Results (Excel)
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        <Card className="border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <Title level={4} className="!mb-0">Classification Results</Title>
                                <Space>
                                    <Button 
                                        icon={<Download size={16} />}
                                        onClick={handleExportExcel}
                                    >
                                        Export Excel
                                    </Button>
                                </Space>
                            </div>

                            {stats.failed > 0 && (
                                <Alert
                                    message={`${stats.failed} products failed to classify`}
                                    description="Check the 'Error' column for details. You can try classifying failed products individually."
                                    type="warning"
                                    showIcon
                                    className="mb-4"
                                />
                            )}

                            <Table
                                dataSource={allRows}
                                columns={resultsColumns}
                                rowKey="rowNumber"
                                pagination={{ pageSize: 20, showSizeChanger: true }}
                                size="small"
                                scroll={{ x: 1200 }}
                                className="border border-slate-200 rounded-lg"
                                rowClassName={(record) => 
                                    record.status === 'error' ? 'bg-red-50' : ''
                                }
                            />
                        </Card>
                    </div>
                )}

                {/* Empty state fallback */}
                {state === 'idle' && allRows.length === 0 && (
                    <Card className="border-slate-200">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="No products to classify yet"
                        >
                            <Button type="primary" onClick={handleDownloadTemplate}>
                                Download Template to Get Started
                            </Button>
                        </Empty>
                    </Card>
                )}
            </div>
        </>
    );
};

export default BulkClassificationContent;
