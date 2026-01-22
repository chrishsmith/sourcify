'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, Button, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload as UploadIcon, History, Bookmark, Zap } from 'lucide-react';
import { ClassificationsTable } from '@/features/compliance/components/ClassificationsTable';
import ClassificationV10LayoutB from '@/features/compliance/components/ClassificationV10LayoutB';
import { ClassificationResultDisplay } from '@/features/compliance/components/ClassificationResult';
import { SearchHistoryPanel, ReClassifyInput } from '@/features/compliance/components/SearchHistoryPanel';
import { getClassificationById } from '@/services/classification/history';
import type { ClassificationResult } from '@/types/classification.types';

const { Title, Text } = Typography;

export const ClassificationsPageContent = () => {
    const [activeTab, setActiveTab] = useState('classify');
    const [viewingResult, setViewingResult] = useState<ClassificationResult | null>(null);
    const router = useRouter();
    
    // Re-classify state
    const [reClassifyInput, setReClassifyInput] = useState<ReClassifyInput | null>(null);
    const [autoClassify, setAutoClassify] = useState(false);

    const handleViewClassification = (id: string) => {
        const result = getClassificationById(id);
        if (result) {
            setViewingResult(result);
        }
    };

    const handleBackToList = () => {
        setViewingResult(null);
    };

    const handleBulkClassify = () => {
        router.push('/dashboard/classify/bulk');
    };

    const handleReClassify = useCallback((input: ReClassifyInput) => {
        setReClassifyInput(input);
        setAutoClassify(true);
        setActiveTab('classify');
    }, []);

    const handleClassifyComplete = useCallback(() => {
        // Reset auto-classify flag after classification is done
        setAutoClassify(false);
    }, []);

    const items = [
        {
            key: 'classify',
            label: (
                <span className="flex items-center gap-2">
                    <Zap size={16} className="text-cyan-500" />
                    Classify
                </span>
            ),
            children: (
                <ClassificationV10LayoutB 
                    initialDescription={reClassifyInput?.description}
                    initialOrigin={reClassifyInput?.countryOfOrigin}
                    initialMaterial={reClassifyInput?.materialComposition}
                    autoClassify={autoClassify}
                    onClassifyComplete={handleClassifyComplete}
                />
            ),
        },
        {
            key: 'history',
            label: (
                <span className="flex items-center gap-2">
                    <History size={16} className="text-slate-500" />
                    Search History
                </span>
            ),
            children: <SearchHistoryPanel onReClassify={handleReClassify} />,
        },
        {
            key: 'saved',
            label: (
                <span className="flex items-center gap-2">
                    <Bookmark size={16} className="text-amber-500" />
                    Saved Products
                </span>
            ),
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
                            setActiveTab('classify');
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
                    onClick={handleBulkClassify}
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
        </div>
    );
};
