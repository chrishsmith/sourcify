'use client';

import React, { useState } from 'react';
import { Tabs, Button, Typography, Row, Col } from 'antd';
import { Plus, ArrowLeft } from 'lucide-react';
import { ClassificationsTable } from '@/features/compliance/components/ClassificationsTable';
import { ClassificationForm } from '@/features/compliance/components/ClassificationForm';
import { ClassificationResultDisplay } from '@/features/compliance/components/ClassificationResult';
import { getClassificationById } from '@/services/classificationHistory';
import type { ClassificationResult } from '@/types/classification.types';

const { Title, Text } = Typography;

export const ClassificationsPageContent = () => {
    const [activeTab, setActiveTab] = useState('1');
    const [viewingResult, setViewingResult] = useState<ClassificationResult | null>(null);

    const handleViewClassification = (id: string) => {
        const result = getClassificationById(id);
        if (result) {
            setViewingResult(result);
        }
    };

    const handleBackToList = () => {
        setViewingResult(null);
    };

    const items = [
        {
            key: '1',
            label: 'My Classifications',
            children: viewingResult ? (
                <div>
                    <Button
                        type="text"
                        icon={<ArrowLeft size={16} />}
                        onClick={handleBackToList}
                        className="mb-4 text-teal-600 hover:text-teal-700"
                    >
                        Back to My Classifications
                    </Button>
                    <ClassificationResultDisplay
                        result={viewingResult}
                        onNewClassification={() => {
                            setViewingResult(null);
                            setActiveTab('2');
                        }}
                    />
                </div>
            ) : (
                <ClassificationsTable onViewClassification={handleViewClassification} />
            ),
        },
        {
            key: '2',
            label: 'New Classification',
            children: (
                <Row justify="center">
                    <Col xs={24} lg={16}>
                        <ClassificationForm />
                    </Col>
                </Row>
            ),
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={2} style={{ margin: 0 }}>Classifications</Title>
                    <Text type="secondary">Manage standardizing your product library.</Text>
                </div>
                <Button type="primary" icon={<Plus size={18} />} className="bg-teal-600">
                    Bulk Import
                </Button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={items}
                />
            </div>
        </div>
    );
};
