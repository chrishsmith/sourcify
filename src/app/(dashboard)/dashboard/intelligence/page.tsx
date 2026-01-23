'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Tabs } from 'antd';
import { useSearchParams, useRouter } from 'next/navigation';
import { TradeStatsDashboard } from '@/features/intelligence/components/TradeStatsDashboard';
import { Lock } from 'lucide-react';
import { SourcingRecommendations } from '@/features/sourcing/components/SourcingRecommendations';

// Tab key mapping for URL params
const TAB_KEY_MAP: Record<string, string> = {
    'trade-stats': 'trade-stats',
    'sourcing': 'sourcing',
};

export default function IntelligencePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    // Derive initial tab from URL params
    const initialTab = useMemo(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && TAB_KEY_MAP[tabParam]) {
            return TAB_KEY_MAP[tabParam];
        }
        return 'trade-stats'; // Default to trade stats
    }, [searchParams]);
    
    const [activeTab, setActiveTab] = useState(initialTab);
    
    // Sync activeTab when URL params change (e.g., browser back/forward)
    useEffect(() => {
        if (initialTab !== activeTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps
    
    const handleTabChange = (key: string) => {
        setActiveTab(key);
        // Update URL without navigation
        const params = new URLSearchParams(searchParams);
        params.set('tab', key);
        router.replace(`/dashboard/intelligence?${params.toString()}`, { scroll: false });
    };
    
    // TODO: Get user tier from session for Pro feature gating
    const userTier = 'free'; // Will be replaced with actual tier check
    const isPro = userTier !== 'free';
    
    const tabItems = [
        {
            key: 'trade-stats',
            label: 'Trade Stats',
            children: <TradeStatsDashboard />,
        },
        {
            key: 'sourcing',
            label: (
                <span className="flex items-center gap-2">
                    Sourcing
                    {!isPro && <Lock size={14} className="text-amber-500" />}
                </span>
            ),
            children: isPro ? (
                <SourcingRecommendations />
            ) : (
                <div className="p-8 text-center">
                    <Lock size={48} className="mx-auto mb-4 text-amber-500" />
                    <h3 className="text-lg font-semibold mb-2">Sourcing Intelligence is a Pro Feature</h3>
                    <p className="text-slate-600 mb-4">
                        Upgrade to Pro to discover suppliers, compare countries, and optimize your sourcing strategy.
                    </p>
                    <button
                        onClick={() => router.push('/pricing')}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                    >
                        Upgrade to Pro
                    </button>
                </div>
            ),
        },
    ];
    
    return (
        <div className="w-full">
            <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                items={tabItems}
                className="w-full [&_.ant-tabs-content]:w-full [&_.ant-tabs-tabpane]:w-full"
            />
        </div>
    );
}
