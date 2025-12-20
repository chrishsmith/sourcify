'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Table,
    Card,
    Typography,
    Tag,
    Button,
    Input,
    Space,
    Tooltip,
    Badge,
    Empty,
    Skeleton,
    Dropdown,
    Modal,
    message,
    Statistic,
    Row,
    Col,
    Progress,
    Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    Bell,
    BellOff,
    Star,
    StarOff,
    Search,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    Eye,
    MoreHorizontal,
    RefreshCw,
    Filter,
    Download,
    Plus,
    ChevronRight,
    Shield,
    Clock,
    Zap,
} from 'lucide-react';
import { getCountryName } from '@/components/shared';

const { Text, Title, Paragraph } = Typography;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MonitoredProduct {
    id: string;
    name: string;
    description: string;
    sku: string | null;
    htsCode: string;
    htsDescription: string;
    countryOfOrigin: string | null;
    baseDutyRate: string | null;
    effectiveDutyRate: number | null;
    isMonitored: boolean;
    isFavorite: boolean;
    createdAt: string;
    updatedAt: string;
    // Enriched tariff data from registry
    tariffData?: {
        currentRate: number;
        previousRate: number | null;
        changePercent: number | null;
        breakdown: Array<{
            program: string;
            rate: number;
            description: string;
        }>;
        warnings: string[];
        hasFta: boolean;
        ftaName: string | null;
        tradeStatus: 'normal' | 'elevated' | 'restricted' | 'sanctioned';
        lastUpdated: string;
    };
    // Alert info
    alertInfo?: {
        hasActiveAlert: boolean;
        lastTriggered: string | null;
        alertCount: number;
    };
}

interface MonitoringStats {
    totalProducts: number;
    monitoredProducts: number;
    productsWithAlerts: number;
    avgTariffRate: number;
    rateIncreases: number;
    rateDecreases: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE CHANGE INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

const RateChangeIndicator: React.FC<{
    currentRate: number;
    previousRate: number | null;
    changePercent: number | null;
}> = ({ currentRate, previousRate, changePercent }) => {
    if (previousRate === null || changePercent === null || Math.abs(changePercent) < 0.1) {
        return (
            <div className="flex items-center gap-1.5">
                <span className="font-mono font-semibold text-slate-800">
                    {currentRate.toFixed(1)}%
                </span>
                <Minus size={14} className="text-slate-400" />
            </div>
        );
    }

    const isIncrease = changePercent > 0;
    const color = isIncrease ? 'text-red-600' : 'text-emerald-600';
    const bgColor = isIncrease ? 'bg-red-50' : 'bg-emerald-50';
    const Icon = isIncrease ? TrendingUp : TrendingDown;

    return (
        <Tooltip
            title={
                <div>
                    <div>Previous: {previousRate.toFixed(1)}%</div>
                    <div>Current: {currentRate.toFixed(1)}%</div>
                    <div className={isIncrease ? 'text-red-300' : 'text-emerald-300'}>
                        {isIncrease ? '+' : ''}{changePercent.toFixed(1)}% change
                    </div>
                </div>
            }
        >
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${bgColor}`}>
                <span className={`font-mono font-semibold ${color}`}>
                    {currentRate.toFixed(1)}%
                </span>
                <div className={`flex items-center ${color}`}>
                    <Icon size={14} />
                    <span className="text-xs ml-0.5">
                        {Math.abs(changePercent).toFixed(1)}%
                    </span>
                </div>
            </div>
        </Tooltip>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TARIFF BREAKDOWN CELL
// ═══════════════════════════════════════════════════════════════════════════════

const TariffBreakdownCell: React.FC<{
    breakdown: Array<{ program: string; rate: number; description: string }>;
    warnings: string[];
}> = ({ breakdown, warnings }) => {
    const activePrograms = breakdown.filter(b => b.rate > 0);

    if (activePrograms.length === 0) {
        return <Text type="secondary">Base duty only</Text>;
    }

    return (
        <div className="space-y-1">
            {activePrograms.slice(0, 2).map((item, i) => (
                <Tooltip key={i} title={item.description}>
                    <Tag
                        color={
                            item.program.includes('301') ? 'red' :
                            item.program.includes('IEEPA') ? 'orange' :
                            item.program.includes('232') ? 'purple' :
                            item.program.includes('FTA') ? 'green' :
                            'default'
                        }
                        className="text-xs"
                    >
                        {item.program.length > 20 ? item.program.slice(0, 20) + '...' : item.program}
                        <span className="ml-1 opacity-75">+{item.rate}%</span>
                    </Tag>
                </Tooltip>
            ))}
            {activePrograms.length > 2 && (
                <Tooltip
                    title={
                        <div>
                            {activePrograms.slice(2).map((item, i) => (
                                <div key={i}>{item.program}: +{item.rate}%</div>
                            ))}
                        </div>
                    }
                >
                    <Tag className="text-xs">+{activePrograms.length - 2} more</Tag>
                </Tooltip>
            )}
            {warnings.length > 0 && (
                <Tooltip title={warnings.join('; ')}>
                    <AlertTriangle size={14} className="text-amber-500 ml-1" />
                </Tooltip>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATS HEADER
// ═══════════════════════════════════════════════════════════════════════════════

const StatsHeader: React.FC<{ stats: MonitoringStats | null; loading: boolean }> = ({
    stats,
    loading,
}) => {
    if (loading) {
        return (
            <Row gutter={[16, 16]} className="mb-6">
                {[1, 2, 3, 4].map(i => (
                    <Col xs={12} md={6} key={i}>
                        <Card size="small">
                            <Skeleton active paragraph={{ rows: 1 }} />
                        </Card>
                    </Col>
                ))}
            </Row>
        );
    }

    if (!stats) return null;

    return (
        <Row gutter={[16, 16]} className="mb-6">
            <Col xs={12} md={6}>
                <Card size="small" className="border-l-4 border-l-teal-500">
                    <Statistic
                        title={
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <Bell size={14} />
                                Monitored
                            </span>
                        }
                        value={stats.monitoredProducts}
                        suffix={<span className="text-slate-400 text-sm">/ {stats.totalProducts}</span>}
                        valueStyle={{ color: '#0d9488', fontSize: '24px' }}
                    />
                </Card>
            </Col>
            <Col xs={12} md={6}>
                <Card size="small" className="border-l-4 border-l-amber-500">
                    <Statistic
                        title={
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <AlertTriangle size={14} />
                                With Alerts
                            </span>
                        }
                        value={stats.productsWithAlerts}
                        valueStyle={{ color: '#f59e0b', fontSize: '24px' }}
                    />
                </Card>
            </Col>
            <Col xs={12} md={6}>
                <Card size="small" className="border-l-4 border-l-red-500">
                    <Statistic
                        title={
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <TrendingUp size={14} />
                                Rate Increases
                            </span>
                        }
                        value={stats.rateIncreases}
                        valueStyle={{ color: '#ef4444', fontSize: '24px' }}
                    />
                </Card>
            </Col>
            <Col xs={12} md={6}>
                <Card size="small" className="border-l-4 border-l-emerald-500">
                    <Statistic
                        title={
                            <span className="flex items-center gap-1.5 text-slate-600">
                                <TrendingDown size={14} />
                                Rate Decreases
                            </span>
                        }
                        value={stats.rateDecreases}
                        valueStyle={{ color: '#10b981', fontSize: '24px' }}
                    />
                </Card>
            </Col>
        </Row>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
    onViewProduct?: (productId: string) => void;
    onAnalyzeProduct?: (htsCode: string, countryCode: string) => void;
}

export const TariffMonitoringTab: React.FC<Props> = ({
    onViewProduct,
    onAnalyzeProduct,
}) => {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<MonitoredProduct[]>([]);
    const [stats, setStats] = useState<MonitoringStats | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showMonitoredOnly, setShowMonitoredOnly] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch products with enriched tariff data
    const fetchProducts = useCallback(async () => {
        try {
            const params = new URLSearchParams({
                monitoredOnly: showMonitoredOnly.toString(),
                includeStats: 'true',
                includeTariffData: 'true',
                ...(searchQuery && { search: searchQuery }),
            });

            const response = await fetch(`/api/saved-products?${params}`);
            if (!response.ok) throw new Error('Failed to fetch products');

            const data = await response.json();
            setProducts(data.items || []);
            
            if (data.stats) {
                setStats({
                    totalProducts: data.stats.totalProducts || 0,
                    monitoredProducts: data.stats.monitoredProducts || 0,
                    productsWithAlerts: 0, // TODO: Calculate from alerts
                    avgTariffRate: 0, // TODO: Calculate average
                    rateIncreases: 0, // TODO: Count from tariff data
                    rateDecreases: 0, // TODO: Count from tariff data
                });
            }
        } catch (error) {
            console.error('[TariffMonitoring] Error:', error);
            messageApi.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [showMonitoredOnly, searchQuery, messageApi]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    // Toggle monitoring status
    const handleToggleMonitoring = async (product: MonitoredProduct) => {
        try {
            const response = await fetch(`/api/saved-products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isMonitored: !product.isMonitored }),
            });

            if (!response.ok) throw new Error('Failed to update product');

            setProducts(prev =>
                prev.map(p =>
                    p.id === product.id
                        ? { ...p, isMonitored: !p.isMonitored }
                        : p
                )
            );

            messageApi.success(
                product.isMonitored
                    ? 'Monitoring disabled'
                    : 'Monitoring enabled'
            );
        } catch (error) {
            messageApi.error('Failed to update monitoring status');
        }
    };

    // Toggle favorite status
    const handleToggleFavorite = async (product: MonitoredProduct) => {
        try {
            const response = await fetch(`/api/saved-products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: !product.isFavorite }),
            });

            if (!response.ok) throw new Error('Failed to update product');

            setProducts(prev =>
                prev.map(p =>
                    p.id === product.id
                        ? { ...p, isFavorite: !p.isFavorite }
                        : p
                )
            );
        } catch (error) {
            messageApi.error('Failed to update favorite status');
        }
    };

    // Refresh tariff data
    const handleRefreshTariffs = async () => {
        setRefreshing(true);
        try {
            // This would call an API to refresh tariff data from registry
            await fetchProducts();
            messageApi.success('Tariff data refreshed');
        } catch (error) {
            messageApi.error('Failed to refresh tariff data');
        } finally {
            setRefreshing(false);
        }
    };

    // Table columns
    const columns: ColumnsType<MonitoredProduct> = [
        {
            title: '',
            key: 'favorite',
            width: 40,
            render: (_, record) => (
                <Button
                    type="text"
                    size="small"
                    icon={
                        record.isFavorite ? (
                            <Star size={16} className="text-amber-500 fill-amber-500" />
                        ) : (
                            <Star size={16} className="text-slate-300" />
                        )
                    }
                    onClick={() => handleToggleFavorite(record)}
                />
            ),
        },
        {
            title: 'Product',
            key: 'product',
            render: (_, record) => (
                <div>
                    <div className="flex items-center gap-2">
                        <Text strong className="text-slate-900">
                            {record.name.length > 35 
                                ? record.name.slice(0, 35) + '...' 
                                : record.name}
                        </Text>
                        {record.isMonitored && (
                            <Badge status="processing" />
                        )}
                    </div>
                    <Text type="secondary" className="text-xs">
                        {record.sku && <span className="mr-2">SKU: {record.sku}</span>}
                        {record.countryOfOrigin && (
                            <span>From: {getCountryName(record.countryOfOrigin)}</span>
                        )}
                    </Text>
                </div>
            ),
            ellipsis: true,
        },
        {
            title: 'HTS Code',
            dataIndex: 'htsCode',
            width: 140,
            render: (code: string, record) => (
                <Tooltip title={record.htsDescription}>
                    <Tag className="font-mono cursor-help">{code}</Tag>
                </Tooltip>
            ),
        },
        {
            title: 'Country',
            dataIndex: 'countryOfOrigin',
            width: 130,
            render: (code: string | null, record) => {
                if (!code) return <Text type="secondary">—</Text>;
                
                const tradeStatus = record.tariffData?.tradeStatus;
                const statusColor = 
                    tradeStatus === 'elevated' ? 'orange' :
                    tradeStatus === 'restricted' ? 'red' :
                    tradeStatus === 'sanctioned' ? 'volcano' :
                    undefined;
                
                return (
                    <div className="flex items-center gap-1.5">
                        <span>{getCountryName(code)}</span>
                        {record.tariffData?.hasFta && (
                            <Tooltip title={record.tariffData.ftaName}>
                                <Shield size={14} className="text-emerald-500" />
                            </Tooltip>
                        )}
                        {statusColor && (
                            <Tag color={statusColor} className="text-xs ml-1">
                                {tradeStatus?.toUpperCase()}
                            </Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Effective Rate',
            key: 'rate',
            width: 150,
            render: (_, record) => {
                if (!record.tariffData) {
                    return record.effectiveDutyRate !== null ? (
                        <span className="font-mono">{record.effectiveDutyRate.toFixed(1)}%</span>
                    ) : (
                        <Text type="secondary">—</Text>
                    );
                }

                return (
                    <RateChangeIndicator
                        currentRate={record.tariffData.currentRate}
                        previousRate={record.tariffData.previousRate}
                        changePercent={record.tariffData.changePercent}
                    />
                );
            },
            sorter: (a, b) => {
                const rateA = a.tariffData?.currentRate ?? a.effectiveDutyRate ?? 0;
                const rateB = b.tariffData?.currentRate ?? b.effectiveDutyRate ?? 0;
                return rateA - rateB;
            },
        },
        {
            title: 'Tariff Programs',
            key: 'breakdown',
            width: 200,
            responsive: ['lg'],
            render: (_, record) => {
                if (!record.tariffData?.breakdown) {
                    return <Text type="secondary">—</Text>;
                }
                return (
                    <TariffBreakdownCell
                        breakdown={record.tariffData.breakdown}
                        warnings={record.tariffData.warnings || []}
                    />
                );
            },
        },
        {
            title: 'Alerts',
            key: 'alerts',
            width: 80,
            render: (_, record) => {
                const alertCount = record.alertInfo?.alertCount ?? 0;
                
                if (alertCount === 0) {
                    return <Text type="secondary">—</Text>;
                }

                return (
                    <Tooltip title={`${alertCount} alert${alertCount !== 1 ? 's' : ''} triggered`}>
                        <Badge count={alertCount} size="small">
                            <Zap size={18} className="text-amber-500" />
                        </Badge>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Last Updated',
            key: 'updated',
            width: 120,
            responsive: ['xl'],
            render: (_, record) => {
                const date = record.tariffData?.lastUpdated || record.updatedAt;
                const formattedDate = new Date(date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                });
                return (
                    <Tooltip title={new Date(date).toLocaleString()}>
                        <span className="flex items-center gap-1 text-slate-500 text-sm">
                            <Clock size={12} />
                            {formattedDate}
                        </span>
                    </Tooltip>
                );
            },
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            fixed: 'right',
            render: (_, record) => (
                <Space>
                    <Tooltip title={record.isMonitored ? 'Stop monitoring' : 'Start monitoring'}>
                        <Button
                            type="text"
                            size="small"
                            icon={
                                record.isMonitored ? (
                                    <BellOff size={16} className="text-slate-400" />
                                ) : (
                                    <Bell size={16} className="text-teal-500" />
                                )
                            }
                            onClick={() => handleToggleMonitoring(record)}
                        />
                    </Tooltip>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'view',
                                    icon: <Eye size={14} />,
                                    label: 'View Details',
                                    onClick: () => onViewProduct?.(record.id),
                                },
                                {
                                    key: 'analyze',
                                    icon: <TrendingDown size={14} />,
                                    label: 'Analyze Sourcing',
                                    onClick: () => onAnalyzeProduct?.(
                                        record.htsCode,
                                        record.countryOfOrigin || 'CN'
                                    ),
                                },
                                { type: 'divider' },
                                {
                                    key: 'delete',
                                    icon: <AlertTriangle size={14} />,
                                    label: 'Remove',
                                    danger: true,
                                },
                            ],
                        }}
                        trigger={['click']}
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<MoreHorizontal size={16} />}
                        />
                    </Dropdown>
                </Space>
            ),
        },
    ];

    // Empty state
    if (!loading && products.length === 0 && !searchQuery) {
        return (
            <div className="py-12">
                {contextHolder}
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <div className="space-y-2">
                            <Text className="text-slate-600 block">
                                No products being monitored yet
                            </Text>
                            <Paragraph type="secondary" className="text-sm">
                                Save products from your classifications or sourcing analysis
                                <br />
                                to start tracking tariff changes.
                            </Paragraph>
                        </div>
                    }
                >
                    <Button
                        type="primary"
                        icon={<Plus size={16} />}
                        className="bg-teal-600"
                        onClick={() => {
                            // Navigate to classification page
                            window.location.href = '/dashboard/classifications';
                        }}
                    >
                        Classify a Product
                    </Button>
                </Empty>
            </div>
        );
    }

    return (
        <div>
            {contextHolder}

            {/* Stats Header */}
            <StatsHeader stats={stats} loading={loading} />

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input
                    placeholder="Search products, HTS codes, SKUs..."
                    prefix={<Search size={16} className="text-slate-400" />}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="flex-1 max-w-md"
                    allowClear
                />
                <Space>
                    <Button
                        type={showMonitoredOnly ? 'primary' : 'default'}
                        icon={<Bell size={14} />}
                        onClick={() => setShowMonitoredOnly(!showMonitoredOnly)}
                        className={showMonitoredOnly ? 'bg-teal-600' : ''}
                    >
                        Monitored Only
                    </Button>
                    <Button
                        icon={<RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />}
                        onClick={handleRefreshTariffs}
                        loading={refreshing}
                    >
                        Refresh Rates
                    </Button>
                </Space>
            </div>

            {/* Info Alert */}
            {!loading && products.some(p => p.tariffData?.warnings?.length) && (
                <Alert
                    type="warning"
                    message="Tariff Alerts Active"
                    description="Some products have elevated tariff rates or pending changes. Review the warnings for details."
                    showIcon
                    icon={<AlertTriangle size={18} />}
                    className="mb-4"
                    closable
                />
            )}

            {/* Table */}
            <Card className="shadow-sm" bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={products}
                    rowKey="id"
                    loading={loading}
                    pagination={{
                        pageSize: 20,
                        showSizeChanger: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} of ${total} products`,
                    }}
                    scroll={{ x: 1000 }}
                    size="middle"
                    rowClassName={(record) => {
                        if (record.tariffData?.tradeStatus === 'elevated') {
                            return 'bg-orange-50/50';
                        }
                        if (record.tariffData?.changePercent && record.tariffData.changePercent > 0) {
                            return 'bg-red-50/30';
                        }
                        return '';
                    }}
                />
            </Card>

            {/* Data Freshness Note */}
            <div className="mt-4 text-center">
                <Text type="secondary" className="text-xs">
                    Tariff data from USITC & Federal Register. Rates updated daily.
                    <Button type="link" size="small" className="text-xs p-0 ml-1">
                        Learn more
                    </Button>
                </Text>
            </div>
        </div>
    );
};

export default TariffMonitoringTab;

