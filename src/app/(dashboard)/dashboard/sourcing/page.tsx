'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Typography, Tabs, Input, Button, Card, Select, Skeleton } from 'antd';
import { Search, Globe, TrendingDown, Users } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SupplierExplorer } from '@/features/sourcing/components/SupplierExplorer';
import { SourcingRecommendations } from '@/features/sourcing/components/SourcingRecommendations';

const { Title, Text, Paragraph } = Typography;

// Inner component that uses useSearchParams
function SourcingPageContent() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('analyze');
    const [htsCode, setHtsCode] = useState('');
    const [currentCountry, setCurrentCountry] = useState<string | undefined>();
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [isFromNavigation, setIsFromNavigation] = useState(false);
    
    // Handle URL parameters on mount
    useEffect(() => {
        const htsParam = searchParams.get('hts');
        const fromParam = searchParams.get('from');
        
        if (htsParam) {
            setHtsCode(htsParam);
            if (fromParam) {
                setCurrentCountry(fromParam);
            }
            // Auto-trigger analysis when coming from classification result
            setShowAnalysis(true);
            setIsFromNavigation(true);
        }
    }, [searchParams]);
    
    const handleAnalyze = () => {
        if (htsCode.trim()) {
            setShowAnalysis(true);
            setIsFromNavigation(false);
        }
    };
    
    const countries = [
        { value: 'CN', label: 'China' },
        { value: 'VN', label: 'Vietnam' },
        { value: 'IN', label: 'India' },
        { value: 'MX', label: 'Mexico' },
        { value: 'TH', label: 'Thailand' },
        { value: 'BD', label: 'Bangladesh' },
        { value: 'ID', label: 'Indonesia' },
        { value: 'TW', label: 'Taiwan' },
        { value: 'KR', label: 'South Korea' },
    ];
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
                <Title level={2} className="mb-2">Sourcing Intelligence</Title>
                <Paragraph className="text-slate-600 mb-0">
                    Find cost-effective suppliers and optimize your supply chain with AI-powered recommendations.
                </Paragraph>
            </div>
            
            {/* Navigation Context Banner */}
            {isFromNavigation && htsCode && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">🔍</span>
                        <div>
                            <Text strong className="text-indigo-900 block">
                                Analyzing sourcing options for HTS {htsCode}
                            </Text>
                            {currentCountry && (
                                <Text type="secondary" className="text-sm">
                                    Currently sourcing from {countries.find(c => c.value === currentCountry)?.label || currentCountry}
                                </Text>
                            )}
                        </div>
                    </div>
                    <Button 
                        type="link" 
                        onClick={() => {
                            setIsFromNavigation(false);
                            setShowAnalysis(false);
                            setHtsCode('');
                            setCurrentCountry(undefined);
                        }}
                    >
                        Start New Search
                    </Button>
                </div>
            )}
            
            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'analyze',
                        label: (
                            <span className="flex items-center gap-2">
                                <TrendingDown size={16} />
                                Cost Analysis
                            </span>
                        ),
                        children: (
                            <div className="space-y-6">
                                {/* Analysis Input - Hide when navigated from classification */}
                                {!isFromNavigation && (
                                    <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100">
                                        <div className="max-w-2xl mx-auto">
                                            <Title level={4} className="text-center mb-4">
                                                Analyze Sourcing Options
                                            </Title>
                                            <Text className="block text-center text-slate-600 mb-6">
                                                Enter an HTS code to compare landed costs across countries and find the best suppliers.
                                            </Text>
                                            
                                            <div className="flex flex-col sm:flex-row gap-3">
                                                <Input
                                                    size="large"
                                                    placeholder="Enter HTS code (e.g., 3926.90.9910)"
                                                    value={htsCode}
                                                    onChange={e => setHtsCode(e.target.value)}
                                                    prefix={<Search className="text-slate-400" size={18} />}
                                                    className="flex-1"
                                                    onPressEnter={handleAnalyze}
                                                />
                                                <Select
                                                    size="large"
                                                    placeholder="Current source country"
                                                    allowClear
                                                    style={{ width: 180 }}
                                                    options={countries}
                                                    value={currentCountry}
                                                    onChange={setCurrentCountry}
                                                />
                                                <Button
                                                    type="primary"
                                                    size="large"
                                                    className="bg-teal-600"
                                                    onClick={handleAnalyze}
                                                >
                                                    Analyze
                                                </Button>
                                            </div>
                                            
                                            <div className="mt-3 text-center">
                                                <Text type="secondary" className="text-xs">
                                                    Examples: 
                                                    <Button 
                                                        type="link" 
                                                        size="small"
                                                        onClick={() => { setHtsCode('3926.90'); setCurrentCountry('CN'); }}
                                                    >
                                                        Plastic articles
                                                    </Button>
                                                    <Button 
                                                        type="link" 
                                                        size="small"
                                                        onClick={() => { setHtsCode('6109.10'); setCurrentCountry('BD'); }}
                                                    >
                                                        Cotton t-shirts
                                                    </Button>
                                                    <Button 
                                                        type="link" 
                                                        size="small"
                                                        onClick={() => { setHtsCode('8518.30'); setCurrentCountry('CN'); }}
                                                    >
                                                        Headphones
                                                    </Button>
                                                </Text>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                                
                                {/* Analysis Results */}
                                {showAnalysis && htsCode && (
                                    <SourcingRecommendations
                                        htsCode={htsCode}
                                        currentCountry={currentCountry}
                                    />
                                )}
                                
                                {/* Quick Stats - Only show when no analysis */}
                                {!showAnalysis && !isFromNavigation && (
                                    <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
                                        <Card className="text-center" style={{ flex: 1 }}>
                                            <Globe className="mx-auto text-teal-500 mb-3" size={40} />
                                            <Title level={4} className="mb-2">20+ Countries</Title>
                                            <Text type="secondary">
                                                Compare costs across major manufacturing regions
                                            </Text>
                                        </Card>
                                        <Card className="text-center" style={{ flex: 1 }}>
                                            <TrendingDown className="mx-auto text-emerald-500 mb-3" size={40} />
                                            <Title level={4} className="mb-2">Real Cost Data</Title>
                                            <Text type="secondary">
                                                Pricing derived from actual import records
                                            </Text>
                                        </Card>
                                        <Card className="text-center" style={{ flex: 1 }}>
                                            <Users className="mx-auto text-blue-500 mb-3" size={40} />
                                            <Title level={4} className="mb-2">Verified Suppliers</Title>
                                            <Text type="secondary">
                                                Connect with pre-screened manufacturers
                                            </Text>
                                        </Card>
                                    </div>
                                )}
                            </div>
                        ),
                    },
                    {
                        key: 'suppliers',
                        label: (
                            <span className="flex items-center gap-2">
                                <Users size={16} />
                                Find Suppliers
                            </span>
                        ),
                        children: <SupplierExplorer />,
                    },
                ]}
            />
        </div>
    );
}

// Loading fallback
function SourcingPageSkeleton() {
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <Skeleton.Input active style={{ width: 300, height: 32 }} />
                <Skeleton.Input active style={{ width: 500, height: 20, marginTop: 8 }} />
            </div>
            <Card>
                <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
        </div>
    );
}

// Main export with Suspense boundary
export default function SourcingPage() {
    return (
        <Suspense fallback={<SourcingPageSkeleton />}>
            <SourcingPageContent />
        </Suspense>
    );
}
