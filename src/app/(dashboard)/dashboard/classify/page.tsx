'use client';

import React from 'react';
import { Typography, Breadcrumb, Space, Tag, Tooltip } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Sparkles, Zap, FlaskConical } from 'lucide-react';
import Link from 'next/link';
import GuidedClassificationForm from '@/features/compliance/components/GuidedClassificationForm';

const { Title, Text } = Typography;

export default function GuidedClassificationPage() {
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
                        { title: 'Guided' },
                    ]}
                />
                
                {/* Header */}
                <div className="mb-8 text-center max-w-2xl mx-auto">
                    <div className="flex items-center justify-center gap-2 mb-3">
                        <Sparkles className="w-8 h-8 text-blue-500" />
                        <Title level={1} className="!mb-0">
                            HTS Classification
                        </Title>
                        <Tooltip title="This is the enhanced V4 classification engine with guided questions">
                            <Tag color="blue" className="ml-2">
                                <FlaskConical className="w-3 h-3 inline mr-1" />
                                V4 Beta
                            </Tag>
                        </Tooltip>
                    </div>
                    
                    <Text type="secondary" className="text-base">
                        Describe your product and get accurate HTS codes with duty estimates.
                        <br />
                        Our smart engine detects ambiguity and guides you to the right code.
                    </Text>
                    
                    {/* Feature Pills */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        <Tag className="px-3 py-1">
                            <Zap className="w-3 h-3 inline mr-1 text-yellow-500" />
                            Instant Duty Ranges
                        </Tag>
                        <Tag className="px-3 py-1">
                            🎯 Smart Questions
                        </Tag>
                        <Tag className="px-3 py-1">
                            📋 Transparent Assumptions
                        </Tag>
                    </div>
                </div>
                
                {/* Main Form */}
                <GuidedClassificationForm />
                
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

