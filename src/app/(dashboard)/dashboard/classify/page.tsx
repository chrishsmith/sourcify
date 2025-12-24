'use client';

import React from 'react';
import { Typography, Breadcrumb, Tag } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Sparkles, Brain } from 'lucide-react';
import Link from 'next/link';
import ClassificationV5 from '@/features/compliance/components/ClassificationV5';

const { Title, Text } = Typography;

export default function ClassifyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
            <div className="p-6 md:p-8">
                {/* Breadcrumb */}
                <Breadcrumb
                    className="mb-6"
                    items={[
                        {
                            title: (
                                <Link href="/dashboard">
                                    <HomeOutlined />
                                </Link>
                            ),
                        },
                        { title: 'Classification' },
                    ]}
                />
                
                {/* Header */}
                <div className="mb-8 text-center max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles className="w-8 h-8 text-blue-500" />
                        <Title level={1} className="!mb-0">
                            HTS Classification
                        </Title>
                    </div>
                    
                    <Text type="secondary" className="text-base">
                        Describe your product and get accurate HTS codes with duty estimates.
                        <br />
                        AI infers what it can, shows you what was assumed, asks only what matters.
                    </Text>
                    
                    {/* Feature Pills */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        <Tag className="px-3 py-1" color="purple">
                            <Brain className="w-3 h-3 inline mr-1" />
                            AI Inference
                        </Tag>
                        <Tag className="px-3 py-1" color="purple">
                            👁️ Full Transparency
                        </Tag>
                        <Tag className="px-3 py-1" color="purple">
                            📦 Local HTS Database
                        </Tag>
                    </div>
                </div>
                
                {/* V5 Classification Component */}
                <ClassificationV5 />
                
                {/* Footer Info */}
                <div className="mt-12 text-center text-sm text-gray-500 max-w-xl mx-auto">
                    <Text type="secondary">
                        Classifications are based on the Harmonized Tariff Schedule (HTS) and use
                        official USITC data. Always verify with a licensed customs broker for
                        binding rulings.
                    </Text>
                </div>
            </div>
        </div>
    );
}
