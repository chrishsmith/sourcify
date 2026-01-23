'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Tabs, Button, Typography } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload as UploadIcon, History, Bookmark, Zap } from 'lucide-react';
import { ClassificationsTable } from '@/features/compliance/components/ClassificationsTable';
import ClassificationV10LayoutB from '@/features/compliance/components/ClassificationV10LayoutB';
import { ClassificationResultDisplay } from '@/features/compliance/components/ClassificationResult';
import { SearchHistoryPanel, ReClassifyInput } from '@/features/compliance/components/SearchHistoryPanel';
import { BulkClassificationContent } from '@/features/compliance/components/BulkClassificationContent';
import { getClassificationById } from '@/services/classification/history';
import type { ClassificationResult } from '@/types/classification.types';

const { Title, Text } = Typography;

export const ClassificationsPageContent = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Derive initial tab from URL params
    const initialTab = useMemo(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['classify', 'bulk', 'history', 'saved'].includes(tabParam)) {
            return tabParam;
        }
        return 'classify';
    }, [searchParams]);
    
    const [activeTab, setActiveTab] = useState(initialTab);
    const [viewingResult, setViewingResult] = useState<ClassificationResult | null>(null);
    
    // Sync activeTab when URL params change
    useEffect(() => {
        if (initialTab !== activeTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps
    
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
        setActiveTab('bulk');
        const params = new URLSearchParams(searchParams);
        params.set('tab', 'bulk');
        router.replace(`/dashboard/classifications?${params.toString()}`, { scroll: false });
    };
    
    const handleTabChange = (key: string) => {
        setActiveTab(key);
        const params = new URLSearchParams(searchParams);
        params.set('tab', key);
        router.replace(`/dashboard/classifications?${params.toString()}`, { scroll: false });
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
            key: 'bulk',
            label: (
                <span className="flex items-center gap-2">
                    <UploadIcon size={16} className="text-purple-500" />
                    Bulk
                </span>
            ),
            children: <BulkClassificationContent />,
        },
        {
            key: 'history',
            label: (
                <span className="flex items-center gap-2">
                    <History size={16} className="text-slate-500" />
                    History
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
                    onChange={handleTabChange}
                    items={items}
                    className="w-full [&_.ant-tabs-content]:w-full [&_.ant-tabs-tabpane]:w-full"
                />
            </div>
        </div>
    );
};
