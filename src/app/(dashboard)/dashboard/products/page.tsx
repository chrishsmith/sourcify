'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { Typography, Tabs, Badge, Skeleton, Card } from 'antd';
import { FolderOpen, Bell, AlertTriangle, BarChart3 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ClassificationsTable } from '@/features/compliance/components/ClassificationsTable';
import { TariffMonitoringTab } from '@/features/sourcing/components/TariffMonitoringTab';
import { ProductDetailDrawer } from '@/features/sourcing/components/ProductDetailDrawer';

const { Title, Paragraph } = Typography;

function MyProductsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Derive initial tab from URL params
    const initialTab = useMemo(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && ['all', 'monitored', 'alerts', 'analysis'].includes(tabParam)) {
            return tabParam;
        }
        return 'all';
    }, [searchParams]);
    
    const [activeTab, setActiveTab] = useState(initialTab);
    const [monitoredCount, setMonitoredCount] = useState(0);
    const [alertCount, setAlertCount] = useState(0);
    const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    
    // Sync activeTab when URL params change (e.g., browser back/forward)
    useEffect(() => {
        if (initialTab !== activeTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Fetch stats for badges
    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch('/api/saved-products?includeStats=true&limit=1');
                if (response.ok) {
                    const data = await response.json();
                    setMonitoredCount(data.stats?.monitoredProducts || 0);
                    setAlertCount(data.stats?.rateIncreases || 0);
                }
            } catch {
                // Silently fail
            }
        }
        fetchStats();
    }, []);
    
    const handleTabChange = (key: string) => {
        setActiveTab(key);
        // Update URL without navigation
        const params = new URLSearchParams(searchParams);
        params.set('tab', key);
        router.replace(`/dashboard/products?${params.toString()}`, { scroll: false });
    };
    
    const handleViewProduct = (productId: string) => {
        setSelectedProductId(productId);
        setDrawerOpen(true);
    };
    
    const handleAnalyzeProduct = (htsCode: string, country: string) => {
        router.push(`/dashboard/sourcing?hts=${htsCode}&from=${country}`);
    };
    
    const handleFindSuppliers = (htsCode: string, country: string) => {
        router.push(`/dashboard/sourcing?hts=${htsCode}&from=${country}&tab=suppliers`);
    };
    
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        setSelectedProductId(null);
    };
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-slate-200 pb-4">
                <Title level={2} className="mb-2">My Products</Title>
                <Paragraph className="text-slate-600 mb-0">
                    Manage your product catalog, monitor tariff changes, and optimize your portfolio.
                </Paragraph>
            </div>
            
            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                items={[
                    {
                        key: 'all',
                        label: (
                            <span className="flex items-center gap-2">
                                <FolderOpen size={16} />
                                All Products
                            </span>
                        ),
                        children: (
                            <ClassificationsTable 
                                onViewClassification={handleViewProduct}
                            />
                        ),
                    },
                    {
                        key: 'monitored',
                        label: (
                            <span className="flex items-center gap-2">
                                <Bell size={16} />
                                Monitored
                                {monitoredCount > 0 && (
                                    <Badge 
                                        count={monitoredCount} 
                                        size="small"
                                        style={{ backgroundColor: '#0d9488' }}
                                    />
                                )}
                            </span>
                        ),
                        children: (
                            <TariffMonitoringTab
                                onViewProduct={handleViewProduct}
                                onAnalyzeProduct={handleAnalyzeProduct}
                            />
                        ),
                    },
                    {
                        key: 'alerts',
                        label: (
                            <span className="flex items-center gap-2">
                                <AlertTriangle size={16} />
                                Alerts
                                {alertCount > 0 && (
                                    <Badge 
                                        count={alertCount} 
                                        size="small"
                                        style={{ backgroundColor: '#f59e0b' }}
                                    />
                                )}
                            </span>
                        ),
                        children: (
                            <AlertsPlaceholder alertCount={alertCount} />
                        ),
                    },
                    {
                        key: 'analysis',
                        label: (
                            <span className="flex items-center gap-2">
                                <BarChart3 size={16} />
                                Portfolio Analysis
                                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                                    Pro
                                </span>
                            </span>
                        ),
                        children: (
                            <PortfolioAnalysisPlaceholder />
                        ),
                    },
                ]}
            />
            
            {/* Product Detail Drawer */}
            <ProductDetailDrawer
                open={drawerOpen}
                productId={selectedProductId}
                onClose={handleCloseDrawer}
                onAnalyze={handleAnalyzeProduct}
                onFindSuppliers={handleFindSuppliers}
            />
        </div>
    );
}

// Placeholder for Alerts tab (will show products with rate changes)
function AlertsPlaceholder({ alertCount }: { alertCount: number }) {
    if (alertCount === 0) {
        return (
            <Card className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
                    <Bell size={32} className="text-emerald-600" />
                </div>
                <Title level={4} className="mb-2">No Active Alerts</Title>
                <Paragraph className="text-slate-600 max-w-md mx-auto">
                    All your monitored products have stable tariff rates. 
                    We&apos;ll notify you here when rates change.
                </Paragraph>
            </Card>
        );
    }
    
    return (
        <Card className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                <AlertTriangle size={32} className="text-amber-600" />
            </div>
            <Title level={4} className="mb-2">{alertCount} Products Need Attention</Title>
            <Paragraph className="text-slate-600 max-w-md mx-auto mb-4">
                Some of your monitored products have experienced rate changes. 
                Check the Monitored tab for details.
            </Paragraph>
            <a 
                href="/dashboard/products?tab=monitored" 
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
                View Monitored Products
            </a>
        </Card>
    );
}

// Placeholder for Portfolio Analysis (Pro feature)
function PortfolioAnalysisPlaceholder() {
    return (
        <Card className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
                <BarChart3 size={32} className="text-amber-600" />
            </div>
            <Title level={4} className="mb-2">Portfolio Analysis</Title>
            <Paragraph className="text-slate-600 max-w-md mx-auto mb-6">
                Get AI-powered insights across your entire product catalog. 
                Identify savings opportunities, optimize classifications, and 
                generate executive reports.
            </Paragraph>
            <div className="space-y-2 text-left max-w-sm mx-auto mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">✓</span>
                    Identify top 5 savings opportunities
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">✓</span>
                    Country diversification recommendations
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs">✓</span>
                    Export PDF savings reports
                </div>
            </div>
            <a 
                href="/pricing" 
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
                Upgrade to Pro
            </a>
        </Card>
    );
}

function MyProductsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 pb-4">
                <Skeleton.Input active style={{ width: 200, height: 32 }} />
                <Skeleton.Input active style={{ width: 400, height: 20, marginTop: 8 }} />
            </div>
            <Card>
                <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
        </div>
    );
}

export default function MyProductsPage() {
    return (
        <Suspense fallback={<MyProductsSkeleton />}>
            <MyProductsContent />
        </Suspense>
    );
}

