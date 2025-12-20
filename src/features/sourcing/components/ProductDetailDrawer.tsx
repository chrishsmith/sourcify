'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Drawer,
    Typography,
    Tag,
    Button,
    Skeleton,
    Descriptions,
    Divider,
    Progress,
    Timeline,
    Space,
    Card,
    Tooltip,
    Empty,
    message,
    Statistic,
    Row,
    Col,
    Switch,
    Alert,
} from 'antd';
import {
    Bell,
    BellOff,
    Star,
    StarOff,
    TrendingUp,
    TrendingDown,
    Minus,
    AlertTriangle,
    Edit3,
    ExternalLink,
    Shield,
    Clock,
    Globe,
    Package,
    DollarSign,
    ChevronRight,
    Search,
    Users,
    Copy,
    Check,
    RefreshCw,
    Info,
    MapPin,
} from 'lucide-react';
import { getCountryName } from '@/components/shared';
import { ClassificationPath } from '@/features/compliance/components/ClassificationPath';
import { useHTSHierarchy } from '@/hooks/useHTSHierarchy';

const { Text, Title, Paragraph } = Typography;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface TariffBreakdownItem {
    program: string;
    rate: number;
    description: string;
}

interface ProductDetail {
    id: string;
    name: string;
    description: string | null;
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
    tariffData?: {
        currentRate: number;
        previousRate: number | null;
        changePercent: number | null;
        breakdown: TariffBreakdownItem[];
        warnings: string[];
        hasFta: boolean;
        ftaName: string | null;
        tradeStatus: 'normal' | 'elevated' | 'restricted' | 'sanctioned';
        lastUpdated: string;
    };
    alertInfo?: {
        hasActiveAlert: boolean;
        lastTriggered: string | null;
        alertCount: number;
    };
    // Alert history
    alertEvents?: Array<{
        id: string;
        previousRate: number;
        newRate: number;
        changeReason: string;
        createdAt: string;
    }>;
}

interface SourcingAlternative {
    countryCode: string;
    countryName: string;
    effectiveRate: number;
    savings: number; // Annual savings vs current
    savingsPercent: number;
    hasFta: boolean;
    ftaName: string | null;
    tradeStatus: 'normal' | 'elevated' | 'restricted' | 'sanctioned';
    supplierCount?: number;
}

interface ProductDetailDrawerProps {
    open: boolean;
    productId: string | null;
    onClose: () => void;
    onProductUpdate?: () => void;
    onAnalyze?: (htsCode: string, country: string) => void;
    onFindSuppliers?: (htsCode: string, country: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const TradeStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config: Record<string, { color: string; bg: string; label: string }> = {
        normal: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'Normal Trade' },
        elevated: { color: 'text-amber-700', bg: 'bg-amber-100', label: 'Elevated Tariffs' },
        restricted: { color: 'text-red-700', bg: 'bg-red-100', label: 'Restricted' },
        sanctioned: { color: 'text-red-800', bg: 'bg-red-200', label: 'Sanctioned' },
    };
    const c = config[status] || config.normal;
    return (
        <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.color} ${c.bg}`}>
            {c.label}
        </span>
    );
};

const RateChangeIndicator: React.FC<{
    currentRate: number;
    previousRate: number | null;
    changePercent: number | null;
    size?: 'small' | 'large';
}> = ({ currentRate, previousRate, changePercent, size = 'small' }) => {
    const isLarge = size === 'large';
    
    if (previousRate === null || changePercent === null || Math.abs(changePercent) < 0.1) {
        return (
            <div className="flex items-center gap-2">
                <span className={`font-mono font-bold ${isLarge ? 'text-2xl' : 'text-lg'} text-slate-800`}>
                    {currentRate.toFixed(1)}%
                </span>
                {!isLarge && <Minus size={16} className="text-slate-400" />}
            </div>
        );
    }

    const isIncrease = changePercent > 0;
    const color = isIncrease ? 'text-red-600' : 'text-emerald-600';
    const bgColor = isIncrease ? 'bg-red-50' : 'bg-emerald-50';
    const Icon = isIncrease ? TrendingUp : TrendingDown;

    return (
        <div className={`flex items-center gap-2 ${isLarge ? 'px-3 py-2 rounded-lg' : 'px-2 py-1 rounded-md'} ${bgColor}`}>
            <span className={`font-mono font-bold ${isLarge ? 'text-2xl' : 'text-lg'} ${color}`}>
                {currentRate.toFixed(1)}%
            </span>
            <div className={`flex items-center ${color}`}>
                <Icon size={isLarge ? 20 : 16} />
                <span className={`${isLarge ? 'text-base' : 'text-sm'} ml-1 font-medium`}>
                    {isIncrease ? '+' : ''}{changePercent.toFixed(1)}%
                </span>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const ProductDetailDrawer: React.FC<ProductDetailDrawerProps> = ({
    open,
    productId,
    onClose,
    onProductUpdate,
    onAnalyze,
    onFindSuppliers,
}) => {
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [alternatives, setAlternatives] = useState<SourcingAlternative[]>([]);
    const [alternativesLoading, setAlternativesLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [updating, setUpdating] = useState(false);
    
    // Use shared hook for HTS hierarchy (direct lineage only)
    const { hierarchy, loading: hierarchyLoading } = useHTSHierarchy(product?.htsCode);

    // Fetch product details
    const fetchProduct = useCallback(async () => {
        if (!productId) return;
        
        setLoading(true);
        try {
            const response = await fetch(`/api/saved-products/${productId}`);
            if (!response.ok) throw new Error('Failed to fetch product');
            
            const data = await response.json();
            setProduct(data);
        } catch (error) {
            console.error('Failed to fetch product:', error);
            message.error('Failed to load product details');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    // Fetch sourcing alternatives
    const fetchAlternatives = useCallback(async () => {
        if (!product?.htsCode) return;
        
        setAlternativesLoading(true);
        try {
            const response = await fetch(`/api/sourcing/hts-costs?htsCode=${product.htsCode}`);
            if (!response.ok) throw new Error('Failed to fetch alternatives');
            
            const data = await response.json();
            
            // Transform and calculate savings vs current country
            const currentRate = product.tariffData?.currentRate || 0;
            const sortedAlternatives: SourcingAlternative[] = (data.countries || [])
                .map((c: { countryCode: string; countryName: string; effectiveRate: number; hasFta?: boolean; ftaName?: string; tradeStatus?: string; supplierCount?: number }) => ({
                    ...c,
                    savings: currentRate - c.effectiveRate,
                    savingsPercent: currentRate > 0 ? ((currentRate - c.effectiveRate) / currentRate) * 100 : 0,
                }))
                .filter((c: SourcingAlternative) => c.countryCode !== product.countryOfOrigin)
                .sort((a: SourcingAlternative, b: SourcingAlternative) => a.effectiveRate - b.effectiveRate)
                .slice(0, 5);
            
            setAlternatives(sortedAlternatives);
        } catch (error) {
            console.error('Failed to fetch alternatives:', error);
        } finally {
            setAlternativesLoading(false);
        }
    }, [product?.htsCode, product?.tariffData?.currentRate, product?.countryOfOrigin]);

    useEffect(() => {
        if (open && productId) {
            fetchProduct();
        }
    }, [open, productId, fetchProduct]);

    useEffect(() => {
        if (product?.htsCode) {
            fetchAlternatives();
        }
    }, [product?.htsCode, fetchAlternatives]);

    // Toggle monitoring
    const handleToggleMonitoring = async () => {
        if (!product) return;
        
        setUpdating(true);
        try {
            const response = await fetch(`/api/saved-products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isMonitored: !product.isMonitored }),
            });
            
            if (!response.ok) throw new Error('Failed to update');
            
            setProduct(prev => prev ? { ...prev, isMonitored: !prev.isMonitored } : null);
            onProductUpdate?.();
            message.success(product.isMonitored ? 'Monitoring disabled' : 'Monitoring enabled');
        } catch (error) {
            message.error('Failed to update monitoring status');
        } finally {
            setUpdating(false);
        }
    };

    // Toggle favorite
    const handleToggleFavorite = async () => {
        if (!product) return;
        
        setUpdating(true);
        try {
            const response = await fetch(`/api/saved-products/${product.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: !product.isFavorite }),
            });
            
            if (!response.ok) throw new Error('Failed to update');
            
            setProduct(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null);
            onProductUpdate?.();
        } catch (error) {
            message.error('Failed to update favorite status');
        } finally {
            setUpdating(false);
        }
    };

    // Copy HTS code
    const handleCopyHts = () => {
        if (!product?.htsCode) return;
        navigator.clipboard.writeText(product.htsCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Format HTS code for display
    const formatHtsCode = (code: string) => {
        const clean = code.replace(/\./g, '');
        if (clean.length >= 10) {
            return `${clean.slice(0, 4)}.${clean.slice(4, 6)}.${clean.slice(6, 10)}`;
        }
        return code;
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={640}
            title={null}
            styles={{ body: { padding: 0 } }}
        >
            {loading ? (
                <div className="p-6">
                    <Skeleton active paragraph={{ rows: 15 }} />
                </div>
            ) : !product ? (
                <div className="p-6">
                    <Empty description="Product not found" />
                </div>
            ) : (
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-5">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                                <Title level={4} className="!text-white !mb-1 flex items-center gap-2">
                                    <Package size={20} className="text-teal-400" />
                                    {product.name}
                                </Title>
                                {product.sku && (
                                    <Text className="text-slate-400 text-sm">SKU: {product.sku}</Text>
                                )}
                            </div>
                            <Space>
                                <Tooltip title={product.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={product.isFavorite 
                                            ? <Star size={18} className="text-yellow-400 fill-yellow-400" />
                                            : <StarOff size={18} className="text-slate-400" />
                                        }
                                        onClick={handleToggleFavorite}
                                        loading={updating}
                                        className="!text-white hover:!bg-slate-700"
                                    />
                                </Tooltip>
                            </Space>
                        </div>
                        
                        {/* HTS Code */}
                        <div className="flex items-center gap-3 mb-3">
                            <Tag 
                                className="font-mono text-sm px-3 py-1 bg-teal-900/50 border-teal-700 text-teal-300"
                            >
                                HTS {formatHtsCode(product.htsCode)}
                            </Tag>
                            <Tooltip title={copied ? 'Copied!' : 'Copy HTS code'}>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={copied ? <Check size={14} /> : <Copy size={14} />}
                                    onClick={handleCopyHts}
                                    className="!text-slate-400 hover:!text-white"
                                />
                            </Tooltip>
                        </div>
                        
                        {/* Origin Country */}
                        {product.countryOfOrigin && (
                            <div className="flex items-center gap-2 text-slate-300">
                                <Globe size={14} />
                                <span>{getCountryName(product.countryOfOrigin)}</span>
                                {product.tariffData && (
                                    <TradeStatusBadge status={product.tariffData.tradeStatus} />
                                )}
                            </div>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto">
                        {/* Current Rate Section */}
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center justify-between mb-3">
                                <Text type="secondary" className="uppercase text-xs tracking-wide font-medium">
                                    Current Effective Rate
                                </Text>
                                {product.tariffData?.lastUpdated && (
                                    <Tooltip title="Last synced from registry">
                                        <div className="flex items-center gap-1 text-xs text-slate-400">
                                            <Clock size={12} />
                                            {new Date(product.tariffData.lastUpdated).toLocaleString()}
                                        </div>
                                    </Tooltip>
                                )}
                            </div>
                            
                            {product.tariffData ? (
                                <RateChangeIndicator
                                    currentRate={product.tariffData.currentRate}
                                    previousRate={product.tariffData.previousRate}
                                    changePercent={product.tariffData.changePercent}
                                    size="large"
                                />
                            ) : (
                                <Text className="text-2xl font-bold font-mono text-slate-800">
                                    {product.effectiveDutyRate !== null 
                                        ? `${product.effectiveDutyRate.toFixed(1)}%` 
                                        : product.baseDutyRate || '—'
                                    }
                                </Text>
                            )}
                        </div>

                        {/* Classification Path - Direct Lineage Only (no siblings) */}
                        <div className="px-6 py-4 border-b border-slate-100">
                            {hierarchyLoading ? (
                                <Skeleton active paragraph={{ rows: 3 }} />
                            ) : hierarchy ? (
                                <ClassificationPath 
                                    hierarchy={hierarchy} 
                                    allowExpansion={false}
                                    compact={true}
                                />
                            ) : null}
                        </div>

                        {/* Tariff Breakdown */}
                        {product.tariffData && product.tariffData.breakdown.length > 0 && (
                            <div className="px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield size={16} className="text-slate-500" />
                                    <Text strong>Rate Breakdown</Text>
                                </div>
                                
                                <div className="space-y-2">
                                    {product.tariffData.breakdown.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Tag
                                                    color={
                                                        item.program.includes('301') ? 'red' :
                                                        item.program.includes('IEEPA') ? 'orange' :
                                                        item.program.includes('232') ? 'purple' :
                                                        item.program.includes('MFN') || item.program.includes('Base') ? 'blue' :
                                                        item.program.includes('FTA') ? 'green' :
                                                        'default'
                                                    }
                                                    className="m-0"
                                                >
                                                    {item.program}
                                                </Tag>
                                                <Tooltip title={item.description}>
                                                    <Info size={14} className="text-slate-400 cursor-help" />
                                                </Tooltip>
                                            </div>
                                            <span className="font-mono font-semibold text-slate-700">
                                                {item.rate > 0 ? '+' : ''}{item.rate.toFixed(1)}%
                                            </span>
                                        </div>
                                    ))}
                                    
                                    {/* Total */}
                                    <div className="flex items-center justify-between py-2 px-3 bg-slate-900 text-white rounded-lg mt-3">
                                        <span className="font-medium">Total Effective Rate</span>
                                        <span className="font-mono font-bold text-lg">
                                            {product.tariffData.currentRate.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Warnings */}
                                {product.tariffData.warnings.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {product.tariffData.warnings.map((warning, idx) => (
                                            <Alert
                                                key={idx}
                                                type="warning"
                                                message={warning}
                                                showIcon
                                                icon={<AlertTriangle size={14} />}
                                                className="text-sm"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Rate History */}
                        {product.alertEvents && product.alertEvents.length > 0 && (
                            <div className="px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <Clock size={16} className="text-slate-500" />
                                    <Text strong>Rate History</Text>
                                </div>
                                
                                <Timeline
                                    items={product.alertEvents.map(event => {
                                        const isIncrease = event.newRate > event.previousRate;
                                        return {
                                            color: isIncrease ? 'red' : 'green',
                                            dot: isIncrease 
                                                ? <TrendingUp size={14} className="text-red-500" />
                                                : <TrendingDown size={14} className="text-emerald-500" />,
                                            children: (
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-mono font-medium ${isIncrease ? 'text-red-600' : 'text-emerald-600'}`}>
                                                            {event.previousRate.toFixed(1)}% → {event.newRate.toFixed(1)}%
                                                        </span>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${isIncrease ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {isIncrease ? '+' : ''}{(event.newRate - event.previousRate).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                    <Text type="secondary" className="text-xs block mt-0.5">
                                                        {event.changeReason}
                                                    </Text>
                                                    <Text type="secondary" className="text-xs">
                                                        {new Date(event.createdAt).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </Text>
                                                </div>
                                            ),
                                        };
                                    })}
                                />
                            </div>
                        )}

                        {/* Sourcing Alternatives */}
                        <div className="px-6 py-4 border-b border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-500" />
                                    <Text strong>Sourcing Alternatives</Text>
                                </div>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={<RefreshCw size={14} />}
                                    onClick={fetchAlternatives}
                                    loading={alternativesLoading}
                                >
                                    Refresh
                                </Button>
                            </div>
                            
                            {alternativesLoading ? (
                                <Skeleton active paragraph={{ rows: 3 }} />
                            ) : alternatives.length === 0 ? (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No alternative countries found"
                                />
                            ) : (
                                <div className="space-y-2">
                                    {alternatives.map((alt, idx) => (
                                        <div
                                            key={alt.countryCode}
                                            className={`flex items-center justify-between py-3 px-4 rounded-lg border ${
                                                alt.savings > 0 
                                                    ? 'bg-emerald-50 border-emerald-200' 
                                                    : 'bg-slate-50 border-slate-200'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
                                                    <span className="text-lg">{idx + 1}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <Text strong>{alt.countryName}</Text>
                                                        <Text type="secondary" className="text-xs">
                                                            ({alt.countryCode})
                                                        </Text>
                                                        {alt.hasFta && (
                                                            <Tag color="green" className="text-xs m-0">
                                                                {alt.ftaName || 'FTA'}
                                                            </Tag>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="font-mono text-sm">
                                                            {alt.effectiveRate.toFixed(1)}% duty
                                                        </span>
                                                        {alt.savings > 0 && (
                                                            <span className="text-xs text-emerald-600 font-medium">
                                                                Save {alt.savings.toFixed(1)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <Space>
                                                {onAnalyze && (
                                                    <Tooltip title="Full cost analysis">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<Search size={14} />}
                                                            onClick={() => onAnalyze(product.htsCode, alt.countryCode)}
                                                        />
                                                    </Tooltip>
                                                )}
                                                {onFindSuppliers && (
                                                    <Tooltip title="Find suppliers">
                                                        <Button
                                                            type="text"
                                                            size="small"
                                                            icon={<Users size={14} />}
                                                            onClick={() => onFindSuppliers(product.htsCode, alt.countryCode)}
                                                        />
                                                    </Tooltip>
                                                )}
                                            </Space>
                                        </div>
                                    ))}
                                    
                                    {/* View More Link */}
                                    {onAnalyze && (
                                        <Button
                                            type="link"
                                            className="w-full text-center mt-2"
                                            icon={<ChevronRight size={14} />}
                                            iconPosition="end"
                                            onClick={() => onAnalyze(product.htsCode, product.countryOfOrigin || 'CN')}
                                        >
                                            View full cost comparison
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Alert Settings */}
                        <div className="px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Bell size={16} className="text-slate-500" />
                                <Text strong>Alert Settings</Text>
                            </div>
                            
                            <Card size="small" className="bg-slate-50 border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {product.isMonitored ? (
                                            <Bell size={20} className="text-teal-600" />
                                        ) : (
                                            <BellOff size={20} className="text-slate-400" />
                                        )}
                                        <div>
                                            <Text strong className="block">
                                                Tariff Rate Monitoring
                                            </Text>
                                            <Text type="secondary" className="text-xs">
                                                {product.isMonitored 
                                                    ? 'You will be notified when rates change' 
                                                    : 'Enable to receive rate change alerts'
                                                }
                                            </Text>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={product.isMonitored}
                                        onChange={handleToggleMonitoring}
                                        loading={updating}
                                    />
                                </div>
                                
                                {product.alertInfo && product.alertInfo.alertCount > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200">
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <Statistic
                                                    title="Total Alerts"
                                                    value={product.alertInfo.alertCount}
                                                    className="!text-sm"
                                                />
                                            </Col>
                                            {product.alertInfo.lastTriggered && (
                                                <Col span={12}>
                                                    <Statistic
                                                        title="Last Alert"
                                                        value={new Date(product.alertInfo.lastTriggered).toLocaleDateString()}
                                                        className="!text-sm"
                                                    />
                                                </Col>
                                            )}
                                        </Row>
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-slate-200 px-6 py-4 bg-white">
                        <Space className="w-full" style={{ justifyContent: 'flex-end' }}>
                            {onFindSuppliers && product.countryOfOrigin && (
                                <Button
                                    icon={<Users size={14} />}
                                    onClick={() => onFindSuppliers(product.htsCode, product.countryOfOrigin!)}
                                >
                                    Find Suppliers
                                </Button>
                            )}
                            {onAnalyze && product.countryOfOrigin && (
                                <Button
                                    type="primary"
                                    icon={<Search size={14} />}
                                    className="bg-teal-600 hover:bg-teal-700"
                                    onClick={() => onAnalyze(product.htsCode, product.countryOfOrigin!)}
                                >
                                    Analyze Costs
                                </Button>
                            )}
                        </Space>
                    </div>
                </div>
            )}
        </Drawer>
    );
};

export default ProductDetailDrawer;

