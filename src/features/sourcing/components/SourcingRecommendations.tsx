'use client';

import React, { useState } from 'react';
import { 
    Card, 
    Typography, 
    Tag, 
    Button, 
    Alert, 
    Statistic, 
    Row, 
    Col,
    Table,
    Progress,
    Tooltip,
    Collapse,
    Badge,
    Empty,
    Skeleton,
} from 'antd';
import { 
    TrendingDown, 
    Globe, 
    Shield, 
    AlertTriangle, 
    Lightbulb,
    DollarSign,
    CheckCircle,
    Info,
    Users,
    ArrowRight,
} from 'lucide-react';

const { Text, Title, Paragraph } = Typography;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SourcingAlternative {
    country: string;
    countryCode: string;
    landedCost: number;
    savingsPercent: number | null;
    tariffRate: number;
    hasFTA: boolean;
    ftaName?: string;
    topSuppliers: Array<{
        name: string;
        tier: string;
        matchScore: number;
    }>;
    tradeoffs: string[];
    confidence: number;
}

interface SourcingRecommendation {
    htsCode: string;
    productDescription?: string;
    currentSourcing: {
        country: string;
        estimatedCost: number;
        tariffRate: number;
    } | null;
    alternatives: SourcingAlternative[];
    aiInsights: {
        summary: string;
        recommendations: string[];
        risks: string[];
        opportunities: string[];
    };
    analysisDate: Date;
    dataConfidence: 'high' | 'medium' | 'low';
}

interface Props {
    htsCode: string;
    productDescription?: string;
    currentCountry?: string;
    materials?: string[];
    onSupplierSelect?: (supplierId: string) => void;
    onExploreSuppliers?: (countryCode: string, htsCode: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADING
// ═══════════════════════════════════════════════════════════════════════════════

const SourcingLoadingSkeleton: React.FC = () => (
    <div>
        {/* Header Skeleton */}
        <div className="flex justify-between items-start" style={{ marginBottom: 24 }}>
            <div>
                <Skeleton.Input active style={{ width: 200, height: 28 }} />
                <Skeleton.Input active style={{ width: 300, height: 20, marginTop: 8 }} />
            </div>
            <Skeleton.Button active style={{ width: 100 }} />
        </div>
        
        {/* AI Summary Skeleton */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100" style={{ marginBottom: 24 }}>
            <div className="flex gap-3">
                <Skeleton.Avatar active size={24} />
                <div className="flex-1">
                    <Skeleton.Input active style={{ width: 150, height: 20 }} />
                    <Skeleton active paragraph={{ rows: 2 }} title={false} className="mt-2" />
                </div>
            </div>
        </Card>
        
        {/* Quick Stats Skeleton */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[1, 2, 3, 4].map(i => (
                <Col xs={12} md={6} key={i}>
                    <Card size="small">
                        <Skeleton active paragraph={{ rows: 1 }} />
                    </Card>
                </Col>
            ))}
        </Row>
        
        {/* Table Skeleton */}
        <Card size="small" style={{ marginBottom: 24 }}>
            <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const SourcingRecommendations: React.FC<Props> = ({
    htsCode,
    productDescription,
    currentCountry,
    materials,
    onSupplierSelect,
    onExploreSuppliers,
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recommendations, setRecommendations] = useState<SourcingRecommendation | null>(null);
    
    const fetchRecommendations = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/sourcing/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    htsCode,
                    productDescription,
                    currentCountry,
                    materials,
                    prioritizeFTA: true,
                }),
            });
            
            if (!response.ok) throw new Error('Failed to fetch recommendations');
            
            const data = await response.json();
            setRecommendations(data.data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };
    
    // Fetch on mount or when inputs change
    React.useEffect(() => {
        if (htsCode) {
            fetchRecommendations();
        }
    }, [htsCode, currentCountry]);
    
    if (loading) {
        return <SourcingLoadingSkeleton />;
    }
    
    if (error) {
        return (
            <Alert
                type="error"
                message="Analysis Failed"
                description={error}
                action={
                    <Button onClick={fetchRecommendations} size="small">
                        Retry
                    </Button>
                }
            />
        );
    }
    
    if (!recommendations) {
        return (
            <Empty
                description="No sourcing data available"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
        );
    }
    
    const { alternatives, aiInsights, currentSourcing, dataConfidence } = recommendations;
    const bestOption = alternatives[0];
    
    // Find current country in alternatives for comparison highlighting
    const currentCountryData = alternatives.find(a => a.countryCode === currentCountry);
    
    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-start" style={{ marginBottom: 24 }}>
                <div>
                    <Title level={4} className="mb-1">
                        Sourcing Analysis
                    </Title>
                    <Text type="secondary">
                        HTS {htsCode} {productDescription && `• ${productDescription}`}
                    </Text>
                </div>
                <Tag color={
                    dataConfidence === 'high' ? 'green' :
                    dataConfidence === 'medium' ? 'gold' : 'default'
                }>
                    {dataConfidence.toUpperCase()} CONFIDENCE
                </Tag>
            </div>
            
            {/* Current Source Highlight (if provided) */}
            {currentCountry && currentCountryData && (
                <Card 
                    className="border-2 border-orange-200 bg-orange-50/50" 
                    size="small"
                    style={{ marginBottom: 24 }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <Globe size={20} className="text-orange-600" />
                            </div>
                            <div>
                                <Text type="secondary" className="text-xs uppercase tracking-wide">Current Source</Text>
                                <Text strong className="block">{currentCountryData.country}</Text>
                            </div>
                        </div>
                        <div className="text-right">
                            <Text type="secondary" className="text-xs block">Landed Cost</Text>
                            <Text strong className="text-lg">${currentCountryData.landedCost.toFixed(2)}</Text>
                        </div>
                        <div className="text-right">
                            <Text type="secondary" className="text-xs block">Tariff Rate</Text>
                            <Text strong className={currentCountryData.tariffRate > 25 ? 'text-red-500 text-lg' : 'text-lg'}>
                                {currentCountryData.tariffRate.toFixed(1)}%
                            </Text>
                        </div>
                    </div>
                </Card>
            )}
            
            {/* AI Summary */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100" style={{ marginBottom: 24 }}>
                <div className="flex gap-3">
                    <Lightbulb className="text-blue-500 shrink-0" size={24} />
                    <div>
                        <Text strong className="block mb-1">AI Recommendation</Text>
                        <Paragraph className="mb-0 text-slate-700">
                            {aiInsights.summary}
                        </Paragraph>
                    </div>
                </div>
            </Card>
            
            {/* Quick Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title="Best Option"
                            value={bestOption?.country || 'N/A'}
                            prefix={<Globe size={16} />}
                            valueStyle={{ fontSize: '18px' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title="Lowest Cost"
                            value={bestOption?.landedCost || 0}
                            prefix={<DollarSign size={16} />}
                            precision={2}
                            valueStyle={{ fontSize: '18px', color: '#10b981' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title={currentCountry ? `vs ${currentCountryData?.country || 'Current'}` : 'Potential Savings'}
                            value={bestOption?.savingsPercent || 0}
                            suffix="%"
                            prefix={<TrendingDown size={16} />}
                            valueStyle={{ 
                                fontSize: '18px',
                                color: (bestOption?.savingsPercent || 0) > 0 ? '#10b981' : undefined,
                            }}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small">
                        <Statistic
                            title="FTA Options"
                            value={alternatives.filter(a => a.hasFTA).length}
                            prefix={<Shield size={16} />}
                            valueStyle={{ fontSize: '18px' }}
                        />
                    </Card>
                </Col>
            </Row>
            
            {/* Country Comparison Table */}
            <Card title="Cost by Country" size="small" style={{ marginBottom: 24 }}>
                <Table
                    dataSource={alternatives}
                    rowKey="countryCode"
                    pagination={false}
                    size="small"
                    rowClassName={(record) => {
                        if (record.countryCode === currentCountry) {
                            return 'bg-orange-50';
                        }
                        if (record === bestOption) {
                            return 'bg-green-50';
                        }
                        return '';
                    }}
                    columns={[
                        {
                            title: 'Country',
                            dataIndex: 'country',
                            render: (country: string, record: SourcingAlternative) => (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{country}</span>
                                    {record.countryCode === currentCountry && (
                                        <Tag color="orange" className="text-xs m-0">CURRENT</Tag>
                                    )}
                                    {record === bestOption && record.countryCode !== currentCountry && (
                                        <Tag color="green" className="text-xs m-0">BEST</Tag>
                                    )}
                                    {record.hasFTA && (
                                        <Tooltip title={record.ftaName}>
                                            <Tag color="blue" className="text-xs m-0">FTA</Tag>
                                        </Tooltip>
                                    )}
                                </div>
                            ),
                        },
                        {
                            title: 'Landed Cost',
                            dataIndex: 'landedCost',
                            render: (cost: number, record: SourcingAlternative) => (
                                <span className={`font-mono ${record === bestOption ? 'text-green-600 font-bold' : ''}`}>
                                    ${cost.toFixed(2)}
                                </span>
                            ),
                            sorter: (a, b) => a.landedCost - b.landedCost,
                            defaultSortOrder: 'ascend',
                        },
                        {
                            title: 'Tariff',
                            dataIndex: 'tariffRate',
                            render: (rate: number) => (
                                <span className={rate > 25 ? 'text-red-500 font-medium' : ''}>
                                    {rate.toFixed(1)}%
                                </span>
                            ),
                            responsive: ['md'],
                        },
                        {
                            title: currentCountry ? `vs ${currentCountryData?.country || 'Current'}` : 'Savings',
                            dataIndex: 'savingsPercent',
                            render: (savings: number | null, record: SourcingAlternative) => {
                                if (record.countryCode === currentCountry) {
                                    return <Text type="secondary">—</Text>;
                                }
                                if (savings === null) return '-';
                                const color = savings > 0 ? 'green' : savings < 0 ? 'red' : 'default';
                                return (
                                    <Tag color={color} className="font-medium">
                                        {savings > 0 ? '↓' : savings < 0 ? '↑' : ''} {Math.abs(savings)}%
                                    </Tag>
                                );
                            },
                        },
                        {
                            title: 'Confidence',
                            dataIndex: 'confidence',
                            render: (conf: number) => (
                                <Progress 
                                    percent={conf} 
                                    size="small" 
                                    showInfo={false}
                                    strokeColor={conf >= 60 ? '#10b981' : conf >= 40 ? '#f59e0b' : '#ef4444'}
                                />
                            ),
                            width: 80,
                            responsive: ['lg'],
                        },
                        {
                            title: 'Suppliers',
                            key: 'suppliers',
                            render: (_: unknown, record: SourcingAlternative) => (
                                <Button 
                                    type="link" 
                                    size="small"
                                    className="p-0 h-auto flex items-center gap-1"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onExploreSuppliers?.(record.countryCode, htsCode);
                                    }}
                                >
                                    <Users size={14} />
                                    <span>{record.topSuppliers.length}</span>
                                    <ArrowRight size={12} />
                                </Button>
                            ),
                            width: 90,
                        },
                    ]}
                />
            </Card>
            
            {/* AI Insights Panels */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Recommendations */}
                <Col xs={24} md={12}>
                    <Card 
                        title={
                            <span className="flex items-center gap-2">
                                <CheckCircle size={16} className="text-green-500" />
                                Recommendations
                            </span>
                        }
                        size="small"
                        className="h-full"
                    >
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            {aiInsights.recommendations.map((rec, i) => (
                                <li key={i} className="text-slate-700">{rec}</li>
                            ))}
                        </ul>
                    </Card>
                </Col>
                
                {/* Risks */}
                <Col xs={24} md={12}>
                    <Card 
                        title={
                            <span className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-amber-500" />
                                Risks to Consider
                            </span>
                        }
                        size="small"
                        className="h-full"
                    >
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            {aiInsights.risks.map((risk, i) => (
                                <li key={i} className="text-slate-700">{risk}</li>
                            ))}
                        </ul>
                    </Card>
                </Col>
            </Row>
            
            {/* Opportunities */}
            {aiInsights.opportunities.length > 0 && (
                <Card 
                    title={
                        <span className="flex items-center gap-2">
                            <Lightbulb size={16} className="text-blue-500" />
                            Opportunities
                        </span>
                    }
                    size="small"
                    style={{ marginBottom: 24 }}
                >
                    <ul className="list-disc list-inside space-y-2 text-sm">
                        {aiInsights.opportunities.map((opp, i) => (
                            <li key={i} className="text-slate-700">{opp}</li>
                        ))}
                    </ul>
                </Card>
            )}
            
            {/* Detailed Country Breakdowns */}
            <Collapse
                items={alternatives.slice(0, 5).map(alt => ({
                    key: alt.countryCode,
                    label: (
                        <div className="flex justify-between items-center w-full pr-4">
                            <div className="flex items-center gap-2">
                                <span className="font-medium">{alt.country}</span>
                                {alt.countryCode === currentCountry && (
                                    <Tag color="orange" className="text-xs m-0">CURRENT</Tag>
                                )}
                            </div>
                            <span className="text-slate-500">${alt.landedCost.toFixed(2)}/unit</span>
                        </div>
                    ),
                    children: (
                        <div className="space-y-4">
                            {/* Cost Breakdown */}
                            <div>
                                <Text strong className="block mb-2">Cost Breakdown</Text>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>Tariff Rate:</div>
                                    <div className="text-right">{alt.tariffRate.toFixed(1)}%</div>
                                    <div>FTA Status:</div>
                                    <div className="text-right">
                                        {alt.hasFTA ? (
                                            <Tag color="green">{alt.ftaName}</Tag>
                                        ) : (
                                            <Tag>No FTA</Tag>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tradeoffs */}
                            {alt.tradeoffs.length > 0 && (
                                <div>
                                    <Text strong className="block mb-2">Trade-offs</Text>
                                    <div className="flex flex-wrap gap-1">
                                        {alt.tradeoffs.map((t, i) => (
                                            <Tag key={i} className="text-xs">{t}</Tag>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Top Suppliers with CTA */}
                            {alt.topSuppliers.length > 0 && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <Text strong>Top Suppliers</Text>
                                        <Button 
                                            type="link" 
                                            size="small"
                                            onClick={() => onExploreSuppliers?.(alt.countryCode, htsCode)}
                                            className="p-0 h-auto"
                                        >
                                            View All <ArrowRight size={14} className="ml-1" />
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {alt.topSuppliers.slice(0, 3).map((s, i) => (
                                            <div 
                                                key={i} 
                                                className="flex justify-between items-center p-2 bg-slate-50 rounded cursor-pointer hover:bg-slate-100"
                                                onClick={() => onSupplierSelect?.(s.name)}
                                            >
                                                <div>
                                                    <Text className="block">{s.name}</Text>
                                                    <Tag 
                                                        color={
                                                            s.tier === 'PREMIUM' ? 'gold' :
                                                            s.tier === 'VERIFIED' ? 'green' : 'default'
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {s.tier}
                                                    </Tag>
                                                </div>
                                                <div className="text-right">
                                                    <Text type="secondary" className="text-xs">
                                                        Match: {s.matchScore}%
                                                    </Text>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ),
                }))}
                style={{ marginBottom: 24 }}
            />
            
            {/* Data Note */}
            <Alert
                type="info"
                message="Data Source"
                description="Cost estimates are derived from actual US import records. Confidence levels indicate data availability. Always verify with supplier quotes before making sourcing decisions."
                showIcon
                icon={<Info size={16} />}
            />
        </div>
    );
};

export default SourcingRecommendations;





