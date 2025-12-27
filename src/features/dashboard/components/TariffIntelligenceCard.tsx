'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Tag, Button, Skeleton, Tooltip, Badge, Progress } from 'antd';
import {
    Bell,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    ChevronRight,
    RefreshCw,
    Shield,
    Zap,
    Globe,
} from 'lucide-react';
import Link from 'next/link';

const { Text, Title } = Typography;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TariffSummary {
    monitoredProducts: number;
    alertsTriggered: number;
    rateChanges: {
        increases: number;
        decreases: number;
        unchanged: number;
    };
    topImpacts: Array<{
        id: string;
        productName: string;
        htsCode: string;
        countryCode: string;
        previousRate: number;
        currentRate: number;
        changePercent: number;
    }>;
    tradeStatusSummary: {
        elevated: number;
        normal: number;
        restricted: number;
    };
    avgEffectiveRate: number;
    lastUpdated: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SKELETON
// ═══════════════════════════════════════════════════════════════════════════════

const TariffCardSkeleton: React.FC = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <Skeleton.Input active style={{ width: 180, height: 24 }} />
            <Skeleton.Button active size="small" />
        </div>
        <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="text-center">
                    <Skeleton.Input active style={{ width: 40, height: 32 }} className="block mx-auto" />
                    <Skeleton.Input active style={{ width: 60, height: 14, marginTop: 4 }} className="block mx-auto" />
                </div>
            ))}
        </div>
        <div className="space-y-2">
            {[1, 2].map(i => (
                <Skeleton active key={i} paragraph={{ rows: 1 }} title={false} />
            ))}
        </div>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// RATE CHANGE MINI INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

const RateChangeMini: React.FC<{
    previousRate: number;
    currentRate: number;
    changePercent: number;
}> = ({ previousRate, currentRate, changePercent }) => {
    const isIncrease = changePercent > 0;
    const Icon = isIncrease ? TrendingUp : TrendingDown;
    const color = isIncrease ? 'text-red-500' : 'text-emerald-500';
    const bgColor = isIncrease ? 'bg-red-50' : 'bg-emerald-50';

    return (
        <Tooltip
            title={
                <div className="text-xs">
                    <div>Previous: {previousRate.toFixed(1)}%</div>
                    <div>Current: {currentRate.toFixed(1)}%</div>
                </div>
            }
        >
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${bgColor}`}>
                <Icon size={12} className={color} />
                <span className={`text-xs font-medium ${color}`}>
                    {Math.abs(changePercent).toFixed(0)}%
                </span>
            </span>
        </Tooltip>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
    className?: string;
}

export const TariffIntelligenceCard: React.FC<Props> = ({ className }) => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<TariffSummary | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchSummary = async () => {
        try {
            // Fetch monitored products with tariff data
            const response = await fetch(
                '/api/saved-products?monitoredOnly=true&includeTariffData=true&includeStats=true&limit=50'
            );
            
            if (!response.ok) throw new Error('Failed to fetch tariff data');
            
            const data = await response.json();
            const items = data.items || [];
            
            // Process the data to create summary
            let increases = 0;
            let decreases = 0;
            let unchanged = 0;
            let totalRate = 0;
            let rateCount = 0;
            const topImpacts: TariffSummary['topImpacts'] = [];
            const tradeStatus = { elevated: 0, normal: 0, restricted: 0 };
            
            for (const item of items) {
                if (item.tariffData) {
                    const change = item.tariffData.changePercent;
                    
                    if (change !== null) {
                        if (change > 0.1) {
                            increases++;
                            topImpacts.push({
                                id: item.id,
                                productName: item.name,
                                htsCode: item.htsCode,
                                countryCode: item.countryOfOrigin || 'XX',
                                previousRate: item.tariffData.previousRate || 0,
                                currentRate: item.tariffData.currentRate,
                                changePercent: change,
                            });
                        } else if (change < -0.1) {
                            decreases++;
                        } else {
                            unchanged++;
                        }
                    }
                    
                    totalRate += item.tariffData.currentRate;
                    rateCount++;
                    
                    // Track trade status
                    if (item.tariffData.tradeStatus === 'elevated') tradeStatus.elevated++;
                    else if (item.tariffData.tradeStatus === 'restricted') tradeStatus.restricted++;
                    else tradeStatus.normal++;
                }
            }
            
            // Sort by impact (largest increases first)
            topImpacts.sort((a, b) => b.changePercent - a.changePercent);
            
            setSummary({
                monitoredProducts: data.stats?.monitoredProducts || items.length,
                alertsTriggered: 0, // TODO: Fetch from alerts API
                rateChanges: { increases, decreases, unchanged },
                topImpacts: topImpacts.slice(0, 3),
                tradeStatusSummary: tradeStatus,
                avgEffectiveRate: rateCount > 0 ? totalRate / rateCount : 0,
                lastUpdated: new Date().toISOString(),
            });
        } catch (err) {
            console.error('[TariffIntelligenceCard] Error:', err);
            setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchSummary();
    };

    // Show skeleton while loading
    if (loading) {
        return (
            <Card className={className}>
                <TariffCardSkeleton />
            </Card>
        );
    }

    // Show error state
    if (error || !summary) {
        return (
            <Card className={className}>
                <div className="text-center py-4">
                    <AlertTriangle size={24} className="text-amber-500 mx-auto mb-2" />
                    <Text type="secondary">Unable to load tariff intelligence</Text>
                    <Button type="link" size="small" onClick={handleRefresh}>
                        Retry
                    </Button>
                </div>
            </Card>
        );
    }

    // Calculate health score (simple heuristic)
    const healthScore = Math.max(0, 100 - (summary.rateChanges.increases * 10) - (summary.tradeStatusSummary.elevated * 5));
    const healthColor = healthScore >= 70 ? '#10b981' : healthScore >= 40 ? '#f59e0b' : '#ef4444';

    return (
        <Card 
            className={`${className} overflow-hidden`}
            styles={{ body: { padding: 0 } }}
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-teal-100 rounded-lg">
                            <Bell size={18} className="text-teal-600" />
                        </div>
                        <div>
                            <Title level={5} className="m-0 text-slate-800">Tariff Intelligence</Title>
                            <Text type="secondary" className="text-xs">
                                Monitoring {summary.monitoredProducts} products
                            </Text>
                        </div>
                    </div>
                    <Button
                        type="text"
                        size="small"
                        icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
                        onClick={handleRefresh}
                    />
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="flex items-center justify-center gap-1">
                            <TrendingUp size={14} className="text-red-500" />
                            <span className="text-xl font-bold text-slate-800">
                                {summary.rateChanges.increases}
                            </span>
                        </div>
                        <Text type="secondary" className="text-xs">Increases</Text>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1">
                            <TrendingDown size={14} className="text-emerald-500" />
                            <span className="text-xl font-bold text-slate-800">
                                {summary.rateChanges.decreases}
                            </span>
                        </div>
                        <Text type="secondary" className="text-xs">Decreases</Text>
                    </div>
                    <div>
                        <div className="flex items-center justify-center gap-1">
                            <AlertTriangle size={14} className="text-amber-500" />
                            <span className="text-xl font-bold text-slate-800">
                                {summary.tradeStatusSummary.elevated}
                            </span>
                        </div>
                        <Text type="secondary" className="text-xs">Elevated Risk</Text>
                    </div>
                </div>
            </div>

            {/* Top Impacts */}
            <div className="px-6 py-4">
                {summary.topImpacts.length > 0 ? (
                    <div className="space-y-3">
                        <Text type="secondary" className="text-xs uppercase tracking-wide font-medium">
                            Recent Rate Changes
                        </Text>
                        {summary.topImpacts.map((impact, idx) => (
                            <div
                                key={impact.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 border border-red-100"
                            >
                                <div className="flex-1 min-w-0">
                                    <Text className="block truncate text-sm font-medium text-slate-700">
                                        {impact.productName}
                                    </Text>
                                    <Text type="secondary" className="text-xs">
                                        {impact.htsCode} • {impact.countryCode}
                                    </Text>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-red-600 font-semibold">
                                        {impact.currentRate.toFixed(1)}%
                                    </span>
                                    <RateChangeMini
                                        previousRate={impact.previousRate}
                                        currentRate={impact.currentRate}
                                        changePercent={impact.changePercent}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <Shield size={32} className="text-emerald-400 mx-auto mb-2" />
                        <Text className="block text-emerald-700 font-medium">All Clear</Text>
                        <Text type="secondary" className="text-xs">
                            No significant rate changes detected
                        </Text>
                    </div>
                )}
            </div>

            {/* Portfolio Health */}
            <div className="px-6 py-4 border-t border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between mb-2">
                    <Text type="secondary" className="text-xs font-medium">Portfolio Health</Text>
                    <Text style={{ color: healthColor }} className="text-sm font-bold">
                        {healthScore}%
                    </Text>
                </div>
                <Progress
                    percent={healthScore}
                    showInfo={false}
                    strokeColor={healthColor}
                    trailColor="#e2e8f0"
                    size={['100%', 6]}
                />
                <div className="flex items-center justify-between mt-2">
                    <Text type="secondary" className="text-xs">
                        Avg Rate: {summary.avgEffectiveRate.toFixed(1)}%
                    </Text>
                    <Text type="secondary" className="text-xs">
                        Updated: {new Date(summary.lastUpdated).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}
                    </Text>
                </div>
            </div>

            {/* Footer CTA */}
            <Link href="/dashboard/sourcing?tab=monitoring">
                <div className="px-6 py-3 bg-teal-600 hover:bg-teal-700 transition-colors cursor-pointer flex items-center justify-between">
                    <Text className="text-white font-medium">View All Monitored Products</Text>
                    <ChevronRight size={18} className="text-white/80" />
                </div>
            </Link>
        </Card>
    );
};

export default TariffIntelligenceCard;





