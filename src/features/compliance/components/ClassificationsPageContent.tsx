'use client';

import React from 'react';
import { Tabs, Button, Typography, Row, Col } from 'antd';
import { Plus } from 'lucide-react';
import { ClassificationsTable } from '@/features/compliance/components/ClassificationsTable';
import { ClassificationForm } from '@/features/compliance/components/ClassificationForm';

const { Title, Text } = Typography;

export const ClassificationsPageContent = () => {
    const items = [
        {
            key: '1',
            label: 'My Classifications',
            children: <ClassificationsTable />,
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
                <Tabs defaultActiveKey="1" items={items} />
            </div>
        </div>
    );
};
