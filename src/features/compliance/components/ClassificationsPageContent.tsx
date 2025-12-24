'use client';

import React, { useState } from 'react';
import { Tabs, Button, Typography, Modal, Upload, message, Progress } from 'antd';
import { Plus, ArrowLeft, Upload as UploadIcon, FileSpreadsheet, History, Sparkles } from 'lucide-react';
import { ClassificationsTable } from '@/features/compliance/components/ClassificationsTable';
import ClassificationV5 from '@/features/compliance/components/ClassificationV5';
import { ClassificationResultDisplay } from '@/features/compliance/components/ClassificationResult';
import { SearchHistoryPanel } from '@/features/compliance/components/SearchHistoryPanel';
import { getClassificationById } from '@/services/classificationHistory';
import type { ClassificationResult } from '@/types/classification.types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

export const ClassificationsPageContent = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [viewingResult, setViewingResult] = useState<ClassificationResult | null>(null);
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [bulkResults, setBulkResults] = useState<{ success: number; failed: number } | null>(null);

    const handleViewClassification = (id: string) => {
        const result = getClassificationById(id);
        if (result) {
            setViewingResult(result);
        }
    };

    const handleBackToList = () => {
        setViewingResult(null);
    };

    const handleBulkUpload = async (file: File) => {
        setBulkProcessing(true);
        setBulkProgress(0);
        setBulkResults(null);

        try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/classify/bulk', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            // If streaming, handle progress
            const reader = response.body?.getReader();
            if (reader) {
                const decoder = new TextDecoder();
                let successCount = 0;
                let failedCount = 0;

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());
                    
                    for (const line of lines) {
                        try {
                            const event = JSON.parse(line);
                            if (event.type === 'progress') {
                                setBulkProgress(event.progress);
                            } else if (event.type === 'complete') {
                                successCount = event.success;
                                failedCount = event.failed;
                            }
                        } catch {
                            // Ignore parse errors
                        }
                    }
                }

                setBulkResults({ success: successCount, failed: failedCount });
            }

            message.success('Bulk import completed!');
        } catch (error) {
            console.error('Bulk upload error:', error);
            message.error('Failed to process bulk upload');
        } finally {
            setBulkProcessing(false);
        }

        return false; // Prevent default upload behavior
    };

    const items = [
        {
            key: '1',
            label: (
                <span className="flex items-center gap-2">
                    <Sparkles size={16} />
                    New Classification
                </span>
            ),
            children: <ClassificationV5 />,
        },
        {
            key: '2',
            label: (
                <span className="flex items-center gap-2">
                    <History size={16} />
                    Search History
                </span>
            ),
            children: <SearchHistoryPanel />,
        },
        {
            key: '3',
            label: 'Saved Products',
            children: viewingResult ? (
                <div>
                    <Button
                        type="text"
                        icon={<ArrowLeft size={16} />}
                        onClick={handleBackToList}
                        className="mb-4 text-teal-600 hover:text-teal-700"
                    >
                        Back to Saved Products
                    </Button>
                    <ClassificationResultDisplay
                        result={viewingResult}
                        onNewClassification={() => {
                            setViewingResult(null);
                            setActiveTab('1');
                        }}
                    />
                </div>
            ) : (
                <ClassificationsTable onViewClassification={handleViewClassification} />
            ),
        },
    ];

    return (
        <div className="w-full">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <Title level={2} className="!mb-1">Classifications</Title>
                    <Text type="secondary">Classify products, view history, and manage your product library.</Text>
                </div>
                <Button 
                    type="primary" 
                    icon={<UploadIcon size={18} />} 
                    className="bg-teal-600 w-full sm:w-auto"
                    onClick={() => setBulkModalOpen(true)}
                >
                    Bulk Import
                </Button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-100 w-full">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                    className="w-full [&_.ant-tabs-content]:w-full [&_.ant-tabs-tabpane]:w-full"
                />
            </div>

            {/* Bulk Import Modal */}
            <Modal
                open={bulkModalOpen}
                onCancel={() => {
                    if (!bulkProcessing) {
                        setBulkModalOpen(false);
                        setBulkResults(null);
                    }
                }}
                title={
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet size={20} className="text-teal-600" />
                        <span>Bulk Import Classifications</span>
                    </div>
                }
                footer={bulkResults ? (
                    <Button type="primary" onClick={() => {
                        setBulkModalOpen(false);
                        setBulkResults(null);
                        setActiveTab('2'); // Switch to history tab
                    }}>
                        View Results
                    </Button>
                ) : null}
                width={600}
            >
                {bulkResults ? (
                    <div className="text-center py-8">
                        <div className="text-6xl mb-4">✓</div>
                        <Title level={4}>Import Complete!</Title>
                        <div className="flex justify-center gap-8 mt-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{bulkResults.success}</div>
                                <div className="text-slate-500">Successful</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{bulkResults.failed}</div>
                                <div className="text-slate-500">Failed</div>
                            </div>
                        </div>
                    </div>
                ) : bulkProcessing ? (
                    <div className="text-center py-8">
                        <Progress type="circle" percent={bulkProgress} />
                        <div className="mt-4">
                            <Text>Processing classifications...</Text>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <Text className="block text-slate-600">
                            Upload a CSV file with your product data. We'll classify each product and save the results to your history.
                        </Text>

                        <Dragger
                            accept=".csv,.xlsx"
                            beforeUpload={handleBulkUpload}
                            showUploadList={false}
                            className="bg-slate-50 border-teal-200 hover:border-teal-400"
                        >
                            <p className="ant-upload-drag-icon">
                                <UploadIcon size={48} className="text-teal-600 mx-auto" />
                            </p>
                            <p className="ant-upload-text">
                                Drag & drop your CSV file here
                            </p>
                            <p className="ant-upload-hint">
                                Or click to browse. Supports CSV and Excel files.
                            </p>
                        </Dragger>

                        <div className="bg-slate-50 p-4 rounded-lg">
                            <Text strong className="block mb-2">Required CSV Columns:</Text>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• <code>product_description</code> - Product description (required)</li>
                                <li>• <code>product_name</code> - Product name (optional)</li>
                                <li>• <code>sku</code> - SKU or part number (optional)</li>
                                <li>• <code>country_of_origin</code> - 2-letter country code (optional)</li>
                                <li>• <code>material</code> - Material composition (optional)</li>
                                <li>• <code>intended_use</code> - Intended use (optional)</li>
                            </ul>
                        </div>

                        <Button 
                            type="link" 
                            className="p-0"
                            onClick={() => {
                                // Download sample CSV
                                const csv = `product_description,product_name,sku,country_of_origin,material,intended_use
"Men's cotton t-shirt, crew neck, short sleeve",Basic Tee,SKU-001,CN,100% cotton,casual wear
"Plastic phone case for iPhone, hard shell protective cover",iPhone Case,SKU-002,VN,ABS plastic,mobile phone protection
"Stainless steel water bottle, 500ml, double wall insulated",Hydro Bottle,SKU-003,CN,stainless steel,beverage container`;
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'bulk_classification_template.csv';
                                a.click();
                            }}
                        >
                            Download Sample Template
                        </Button>
                    </div>
                )}
            </Modal>
        </div>
    );
};
