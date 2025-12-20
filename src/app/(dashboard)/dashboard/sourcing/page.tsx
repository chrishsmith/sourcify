'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Typography, Tabs, Input, Button, Card, Select, Skeleton, Steps, message } from 'antd';
import { Search, TrendingDown, Users, Package, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { SupplierExplorer } from '@/features/sourcing/components/SupplierExplorer';
import { SourcingRecommendations } from '@/features/sourcing/components/SourcingRecommendations';
import { ProductInputForm, ProductInputValues, COUNTRIES, getCountryName } from '@/components/shared';

const { Title, Text, Paragraph } = Typography;

// Loading steps for classification
const LOADING_STEPS = [
    { title: 'Classifying', description: 'Finding HTS code' },
    { title: 'Analyzing', description: 'Comparing sourcing options' },
    { title: 'Complete', description: 'Ready' },
];

function SourcingPageContent() {
    const searchParams = useSearchParams();
    const [messageApi, contextHolder] = message.useMessage();
    
    const [activeTab, setActiveTab] = useState('analyze');
    const [htsCode, setHtsCode] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [currentCountry, setCurrentCountry] = useState<string | undefined>();
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [isFromNavigation, setIsFromNavigation] = useState(false);
    const [inputMode, setInputMode] = useState<'hts' | 'describe'>('hts');
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    
    // Supplier explorer filter state
    const [supplierFilterCountry, setSupplierFilterCountry] = useState<string | undefined>();
    const [supplierFilterHts, setSupplierFilterHts] = useState<string | undefined>();
    
    // Handle URL parameters on mount
    useEffect(() => {
        const htsParam = searchParams.get('hts');
        const fromParam = searchParams.get('from');
        const descParam = searchParams.get('desc');
        
        if (htsParam) {
            setHtsCode(htsParam);
            if (fromParam) {
                setCurrentCountry(fromParam);
            }
            if (descParam) {
                setProductDescription(descParam);
            }
            setShowAnalysis(true);
            setIsFromNavigation(true);
        }
    }, [searchParams]);
    
    const handleAnalyzeHts = () => {
        if (htsCode.trim()) {
            setShowAnalysis(true);
            setIsFromNavigation(false);
        }
    };
    
    // Handle product description submission - classify first, then show sourcing
    const handleProductSubmit = async (values: ProductInputValues) => {
        setLoading(true);
        setLoadingStep(0);
        
        try {
            // Step 1: Classify the product
            const response = await fetch('/api/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productDescription: values.productDescription,
                    countryOfOrigin: values.countryOfOrigin,
                    materialComposition: values.materialComposition,
                    intendedUse: values.intendedUse,
                    classificationType: 'import',
                }),
            });
            
            if (!response.ok) {
                throw new Error('Classification failed');
            }
            
            const result = await response.json();
            setLoadingStep(1);
            
            // Brief pause to show progress
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Step 2: Set up sourcing analysis with the classified HTS code
            setHtsCode(result.htsCode.code);
            setCurrentCountry(values.countryOfOrigin);
            setProductDescription(values.productDescription);
            
            setLoadingStep(2);
            await new Promise(resolve => setTimeout(resolve, 300));
            
            setShowAnalysis(true);
            setIsFromNavigation(false);
            messageApi.success(`Classified as HTS ${result.htsCode.code}`);
        } catch (error) {
            console.error('Error:', error);
            messageApi.error('Classification failed. Please try again.');
        } finally {
            setLoading(false);
            setLoadingStep(0);
        }
    };
    
    const handleReset = () => {
        setIsFromNavigation(false);
        setShowAnalysis(false);
        setHtsCode('');
        setCurrentCountry(undefined);
        setProductDescription('');
        setInputMode('hts');
    };
    
    // Handle "Explore Suppliers" click from SourcingRecommendations
    const handleExploreSuppliers = (countryCode: string, hts: string) => {
        setSupplierFilterCountry(countryCode);
        setSupplierFilterHts(hts);
        setActiveTab('suppliers');
    };
    
    // Clear supplier filters when switching back to analyze tab
    const handleTabChange = (key: string) => {
        setActiveTab(key);
        if (key === 'analyze') {
            // Keep filters but allow user to see them when they return
        }
    };
    
    // Loading state
    if (loading) {
        return (
            <div className="space-y-6">
                {contextHolder}
                <div className="border-b border-slate-200 pb-4">
                    <Title level={2} className="mb-2">Sourcing Intelligence</Title>
                </div>
                <Card className="max-w-lg mx-auto">
                    <div className="py-6 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-teal-100 mb-4">
                            <Loader2 size={28} className="text-teal-600 animate-spin" />
                        </div>
                        <Title level={4} className="m-0 text-slate-900">
                            Analyzing Your Product
                        </Title>
                        <Steps
                            current={loadingStep}
                            size="small"
                            items={LOADING_STEPS.map((step, idx) => ({
                                title: step.title,
                                description: step.description,
                                icon: idx === loadingStep && idx < 2 ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : idx < loadingStep ? (
                                    <CheckCircle size={14} className="text-green-500" />
                                ) : undefined,
                            }))}
                            className="mt-6"
                        />
                    </div>
                </Card>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            {contextHolder}
            
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
                                    Currently sourcing from {getCountryName(currentCountry)}
                                </Text>
                            )}
                        </div>
                    </div>
                    <Button type="link" onClick={handleReset}>
                        Start New Search
                    </Button>
                </div>
            )}
            
            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
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
                            <div>
                                {/* Analysis Input - Hide when navigated from classification */}
                                {!isFromNavigation && !showAnalysis && (
                                    <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100" style={{ marginBottom: 24 }}>
                                        <div className="max-w-2xl mx-auto">
                                            <Title level={4} className="text-center mb-2">
                                                Analyze Sourcing Options
                                            </Title>
                                            
                                            {/* Toggle between input modes */}
                                            <div className="flex justify-center mb-6">
                                                <div className="inline-flex rounded-lg bg-white/70 p-1">
                                                    <Button
                                                        type={inputMode === 'hts' ? 'primary' : 'text'}
                                                        size="small"
                                                        onClick={() => setInputMode('hts')}
                                                        icon={<Search size={14} />}
                                                    >
                                                        I have an HTS code
                                                    </Button>
                                                    <Button
                                                        type={inputMode === 'describe' ? 'primary' : 'text'}
                                                        size="small"
                                                        onClick={() => setInputMode('describe')}
                                                        icon={<Package size={14} />}
                                                    >
                                                        Describe my product
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            {inputMode === 'hts' ? (
                                                <>
                                                    <Text className="block text-center text-slate-600 mb-4">
                                                        Enter an HTS code to compare landed costs across countries.
                                                    </Text>
                                                    
                                                    <div className="flex flex-col sm:flex-row gap-3">
                                                        <Input
                                                            size="large"
                                                            placeholder="Enter HTS code (e.g., 3926.90.9910)"
                                                            value={htsCode}
                                                            onChange={e => setHtsCode(e.target.value)}
                                                            prefix={<Search className="text-slate-400" size={18} />}
                                                            className="flex-1"
                                                            onPressEnter={handleAnalyzeHts}
                                                        />
                                                        <Select
                                                            size="large"
                                                            placeholder="Current source"
                                                            allowClear
                                                            style={{ width: 180 }}
                                                            options={COUNTRIES.map(c => ({ value: c.value, label: c.label }))}
                                                            value={currentCountry}
                                                            onChange={setCurrentCountry}
                                                        />
                                                        <Button
                                                            type="primary"
                                                            size="large"
                                                            className="bg-teal-600"
                                                            onClick={handleAnalyzeHts}
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
                                                </>
                                            ) : (
                                                <div className="bg-white rounded-lg p-6">
                                                    <ProductInputForm
                                                        onSubmit={handleProductSubmit}
                                                        loading={loading}
                                                        submitText="Analyze Sourcing Options"
                                                        submitIcon={<Sparkles size={18} />}
                                                        requireCountry={false}
                                                        showAiInfo={false}
                                                        variant="compact"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </Card>
                                )}
                                
                                {/* Analysis Results */}
                                {showAnalysis && htsCode && (
                                    <>
                                        {!isFromNavigation && (
                                            <div style={{ marginBottom: 16 }}>
                                                <Button type="link" onClick={handleReset} className="p-0">
                                                    ← Back to search
                                                </Button>
                                            </div>
                                        )}
                                        <SourcingRecommendations
                                            htsCode={htsCode}
                                            currentCountry={currentCountry}
                                            productDescription={productDescription}
                                            onExploreSuppliers={handleExploreSuppliers}
                                        />
                                    </>
                                )}
                                
                                {/* Quick Stats - Only show when no analysis */}
                                {!showAnalysis && !isFromNavigation && (
                                    <div style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
                                        <Card className="text-center" style={{ flex: 1 }}>
                                            <TrendingDown className="mx-auto text-teal-500 mb-3" size={40} />
                                            <Title level={4} className="mb-2">20+ Countries</Title>
                                            <Text type="secondary">
                                                Compare costs across major manufacturing regions
                                            </Text>
                                        </Card>
                                        <Card className="text-center" style={{ flex: 1 }}>
                                            <Search className="mx-auto text-emerald-500 mb-3" size={40} />
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
                                {supplierFilterCountry && (
                                    <span className="ml-1 w-2 h-2 rounded-full bg-teal-500" />
                                )}
                            </span>
                        ),
                        children: (
                            <SupplierExplorer
                                initialCountry={supplierFilterCountry}
                                initialHtsCode={supplierFilterHts}
                                onBack={() => {
                                    setSupplierFilterCountry(undefined);
                                    setSupplierFilterHts(undefined);
                                    setActiveTab('analyze');
                                }}
                            />
                        ),
                    },
                ]}
            />
        </div>
    );
}

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

export default function SourcingPage() {
    return (
        <Suspense fallback={<SourcingPageSkeleton />}>
            <SourcingPageContent />
        </Suspense>
    );
}
