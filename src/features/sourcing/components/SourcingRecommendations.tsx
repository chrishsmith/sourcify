'use client';

import React, { useState } from 'react';
import { 
    Card, 
    Typography, 
    Tag, 
    Button, 
    Spin, 
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
} from 'antd';
import { 
    TrendingDown, 
    Globe, 
    Shield, 
    AlertTriangle, 
    Lightbulb,
    Ship,
    DollarSign,
    CheckCircle,
    Info,
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
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const SourcingRecommendations: React.FC<Props> = ({
    htsCode,
    productDescription,
    currentCountry,
    materials,
    onSupplierSelect,
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
        return (
            <Card className="text-center py-12">
                <Spin size="large" />
                <Text className="block mt-4 text-slate-500">
                    Analyzing sourcing options...
                </Text>
            </Card>
        );
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
                            title="Potential Savings"
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
                    columns={[
                        {
                            title: 'Country',
                            dataIndex: 'country',
                            render: (country: string, record: SourcingAlternative) => (
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{country}</span>
                                    {record.hasFTA && (
                                        <Tooltip title={record.ftaName}>
                                            <Tag color="green" className="text-xs m-0">FTA</Tag>
                                        </Tooltip>
                                    )}
                                </div>
                            ),
                        },
                        {
                            title: 'Landed Cost',
                            dataIndex: 'landedCost',
                            render: (cost: number) => (
                                <span className="font-mono">${cost.toFixed(2)}</span>
                            ),
                            sorter: (a, b) => a.landedCost - b.landedCost,
                            defaultSortOrder: 'ascend',
                        },
                        {
                            title: 'Tariff',
                            dataIndex: 'tariffRate',
                            render: (rate: number) => (
                                <span className={rate > 25 ? 'text-red-500' : ''}>
                                    {rate.toFixed(1)}%
                                </span>
                            ),
                        },
                        {
                            title: 'vs China',
                            dataIndex: 'savingsPercent',
                            render: (savings: number | null) => {
                                if (savings === null) return '-';
                                const color = savings > 0 ? 'green' : savings < 0 ? 'red' : 'default';
                                return (
                                    <Tag color={color}>
                                        {savings > 0 ? '+' : ''}{savings}%
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
                            width: 100,
                        },
                        {
                            title: 'Suppliers',
                            dataIndex: 'topSuppliers',
                            render: (suppliers: SourcingAlternative['topSuppliers']) => (
                                <Badge count={suppliers.length} size="small" />
                            ),
                            width: 80,
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
                            <span className="font-medium">{alt.country}</span>
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
                            
                            {/* Top Suppliers */}
                            {alt.topSuppliers.length > 0 && (
                                <div>
                                    <Text strong className="block mb-2">Top Suppliers</Text>
                                    <div className="space-y-2">
                                        {alt.topSuppliers.map((s, i) => (
                                            <div 
                                                key={i} 
                                                className="flex justify-between items-center p-2 bg-slate-50 rounded"
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
