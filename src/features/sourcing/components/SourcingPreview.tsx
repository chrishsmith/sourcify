'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Tag, Button, Skeleton, Tooltip } from 'antd';
import { TrendingDown, ArrowRight, Globe, Sparkles, Users, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

const { Text } = Typography;

interface SourcingAlternative {
    code: string;
    name: string;
    flag: string;
    landedCost: number;
    effectiveTariff: number;
    savingsPercent: number;
    savingsAmount: number;
    supplierCount: number;
    hasFTA: boolean;
    ftaName?: string;
    isRecommended: boolean;
}

interface QuickSourcingData {
    htsCode: string;
    currentCountry: {
        code: string;
        name: string;
        flag: string;
        landedCost: number;
        effectiveTariff: number;
    } | null;
    alternatives: SourcingAlternative[];
    totalCountries: number;
    potentialSavings: {
        percent: number;
        perUnit: number;
        annual?: number;
    } | null;
}

interface SourcingPreviewProps {
    htsCode: string;
    countryOfOrigin?: string;
    productDescription?: string;
    className?: string;
}

export const SourcingPreview: React.FC<SourcingPreviewProps> = ({
    htsCode,
    countryOfOrigin,
    className = '',
}) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<QuickSourcingData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!htsCode) {
                setLoading(false);
                return;
            }
            
            setLoading(true);
            setError(null);
            
            try {
                const params = new URLSearchParams({ hts: htsCode });
                if (countryOfOrigin) params.set('from', countryOfOrigin);
                
                console.log('[SourcingPreview] Fetching:', `/api/sourcing/quick?${params.toString()}`);
                
                const response = await fetch(`/api/sourcing/quick?${params.toString()}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch sourcing data');
                }
                
                const result = await response.json();
                console.log('[SourcingPreview] Data received:', result);
                setData(result.data);
            } catch (err) {
                console.error('[SourcingPreview] Error:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };
        
        fetchData();
    }, [htsCode, countryOfOrigin]);

    const handleViewFullAnalysis = () => {
        const params = new URLSearchParams({ hts: htsCode });
        if (countryOfOrigin) params.set('from', countryOfOrigin);
        router.push(`/dashboard/sourcing?${params.toString()}`);
    };

    // Loading state
    if (loading) {
        return (
            <Card className={`border-2 border-dashed border-indigo-200 bg-indigo-50/30 ${className}`}>
                <div className="flex items-center gap-3">
                    <Skeleton.Avatar active size={40} shape="square" />
                    <div className="flex-1">
                        <Skeleton.Input active size="small" style={{ width: 200, marginBottom: 4 }} />
                        <Skeleton.Input active size="small" style={{ width: 300 }} />
                    </div>
                </div>
            </Card>
        );
    }

    // Has data with savings opportunities
    const hasAlternatives = data && data.alternatives && data.alternatives.length > 0;
    const topAlternatives = hasAlternatives 
        ? data!.alternatives.filter(a => a.savingsPercent > 0).slice(0, 3)
        : [];
    const hasSavings = topAlternatives.length > 0;

    // Always show the card - either with savings or as a CTA to explore
    return (
        <Card 
            className={`border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${className}`}
            style={{ marginBottom: 24 }}
            onClick={handleViewFullAnalysis}
        >
            {hasSavings ? (
                // Has savings - show detailed preview
                <>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                                <TrendingDown className="text-green-600" size={18} />
                            </div>
                            <div>
                                <Text strong className="text-green-800 block text-sm">
                                    💰 Save up to {data!.potentialSavings?.percent || topAlternatives[0]?.savingsPercent}% on landed costs
                                </Text>
                            </div>
                        </div>
                        <ArrowRight className="text-indigo-400" size={18} />
                    </div>

                    {/* Compact Alternative Pills */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {topAlternatives.map((alt) => (
                            <div
                                key={alt.code}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                                    alt.isRecommended 
                                        ? 'bg-green-100 border border-green-300' 
                                        : 'bg-white border border-slate-200'
                                }`}
                            >
                                <span>{alt.flag}</span>
                                <span className="font-medium text-slate-700">{alt.name}</span>
                                <Tag color="green" className="m-0 text-xs border-0">
                                    -{alt.savingsPercent}%
                                </Tag>
                                {alt.hasFTA && (
                                    <Tooltip title={alt.ftaName}>
                                        <Tag color="blue" className="m-0 text-xs">FTA</Tag>
                                    </Tooltip>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                        <Text type="secondary" className="text-xs">
                            <Globe size={12} className="inline mr-1" />
                            {data!.totalCountries} countries • Click to explore
                        </Text>
                        <Button
                            type="primary"
                            size="small"
                            className="bg-indigo-600"
                            icon={<ArrowRight size={14} />}
                            iconPosition="end"
                        >
                            Full Analysis
                        </Button>
                    </div>
                </>
            ) : (
                // No data yet - show explore CTA
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Search className="text-indigo-600" size={20} />
                        </div>
                        <div>
                            <Text strong className="text-indigo-900 block">
                                Explore Sourcing Options
                            </Text>
                            <Text type="secondary" className="text-sm">
                                Compare costs across 20+ countries for HTS {htsCode.substring(0, 6)}
                            </Text>
                        </div>
                    </div>
                    <Button
                        type="primary"
                        className="bg-indigo-600"
                        icon={<ArrowRight size={14} />}
                        iconPosition="end"
                    >
                        Analyze
                    </Button>
                </div>
            )}
        </Card>
    );
};

export default SourcingPreview;





