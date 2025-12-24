'use client';

import React, { useState } from 'react';
import { Typography, Breadcrumb, Tag, Tooltip, Segmented } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { Sparkles, Zap, FlaskConical, ArrowRight, Brain } from 'lucide-react';
import Link from 'next/link';
import GuidedClassificationForm from '@/features/compliance/components/GuidedClassificationForm';
import ClassificationFlowV2 from '@/features/compliance/components/ClassificationFlowV2';
import ClassificationV5 from '@/features/compliance/components/ClassificationV5';

const { Title, Text } = Typography;

export default function GuidedClassificationPage() {
    const [version, setVersion] = useState<'v2' | 'v4' | 'v5'>('v5');
    
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
                        <Tooltip title={
                            version === 'v5' ? "V5: Infer first, ask later. Full transparency." :
                            version === 'v2' ? "V2: Questions first, then results." : 
                            "V4: Results first with optional refinement."
                        }>
                            <Tag color={version === 'v5' ? 'purple' : version === 'v2' ? 'green' : 'blue'} className="ml-2">
                                {version === 'v5' ? <Brain className="w-3 h-3 inline mr-1" /> : <FlaskConical className="w-3 h-3 inline mr-1" />}
                                {version.toUpperCase()}
                            </Tag>
                        </Tooltip>
                    </div>
                    
                    <Text type="secondary" className="text-base">
                        Describe your product and get accurate HTS codes with duty estimates.
                        <br />
                        {version === 'v5'
                            ? 'AI infers what it can, shows you what was assumed, asks only what matters.'
                            : version === 'v2' 
                            ? 'Questions first to find the perfect code, or browse all options.'
                            : 'Our smart engine detects ambiguity and guides you to the right code.'
                        }
                    </Text>
                    
                    {/* Version Toggle */}
                    <div className="mt-4 flex justify-center">
                        <Segmented
                            value={version}
                            onChange={(val) => setVersion(val as 'v2' | 'v4' | 'v5')}
                            options={[
                                { 
                                    label: (
                                        <span className="flex items-center gap-1">
                                            <Brain className="w-3 h-3" />
                                            V5 (Infer First)
                                        </span>
                                    ), 
                                    value: 'v5' 
                                },
                                { 
                                    label: (
                                        <span className="flex items-center gap-1">
                                            <ArrowRight className="w-3 h-3" />
                                            V2 (Questions First)
                                        </span>
                                    ), 
                                    value: 'v2' 
                                },
                                { 
                                    label: (
                                        <span className="flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            V4 (Results First)
                                        </span>
                                    ), 
                                    value: 'v4' 
                                },
                            ]}
                        />
                    </div>
                    
                    {/* Feature Pills */}
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {version === 'v5' ? (
                            <>
                                <Tag className="px-3 py-1" color="purple">
                                    🧠 AI Inference
                                </Tag>
                                <Tag className="px-3 py-1" color="purple">
                                    👁️ Full Transparency
                                </Tag>
                                <Tag className="px-3 py-1" color="purple">
                                    📦 Local HTS Database
                                </Tag>
                            </>
                        ) : version === 'v2' ? (
                            <>
                                <Tag className="px-3 py-1">
                                    🎯 Identify Category First
                                </Tag>
                                <Tag className="px-3 py-1">
                                    ❓ Smart Questions
                                </Tag>
                                <Tag className="px-3 py-1">
                                    📊 Grouped Code View
                                </Tag>
                            </>
                        ) : (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
                
                {/* Main Form - Based on Version */}
                {version === 'v5' ? <ClassificationV5 /> : 
                 version === 'v2' ? <ClassificationFlowV2 /> : 
                 <GuidedClassificationForm />}
                
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


