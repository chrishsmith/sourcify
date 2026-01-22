'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Card,
    Input,
    Select,
    Button,
    Typography,
    Row,
    Col,
    Statistic,
    Tag,
    Space,
    DatePicker,
    Tooltip,
    message,
    Spin,
    Alert,
    Segmented,
} from 'antd';
import {
    TrendingUp,
    TrendingDown,
    Globe,
    DollarSign,
    Package,
    Download,
    RefreshCw,
    Info,
    BarChart3,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    Legend,
    Area,
    AreaChart,
} from 'recharts';
import { exportToExcel, ExcelColumn } from '@/services/exportService';
import { formatHtsCode } from '@/utils/htsFormatting';

const { Title, Text, Paragraph } = Typography;

// Common HTS chapters for quick selection
const POPULAR_CHAPTERS = [
    { value: '6109', label: '6109 - T-shirts, Cotton/MMF' },
    { value: '8471', label: '8471 - Computers & Parts' },
    { value: '8517', label: '8517 - Telephones & Parts' },
    { value: '8528', label: '8528 - Monitors & TVs' },
    { value: '9403', label: '9403 - Furniture' },
    { value: '6402', label: '6402 - Footwear, Rubber/Plastic' },
    { value: '7210', label: '7210 - Flat-rolled Steel' },
    { value: '8708', label: '8708 - Auto Parts' },
    { value: '3926', label: '3926 - Plastics Articles' },
    { value: '8541', label: '8541 - Semiconductors' },
];

// Country options for filtering
const COUNTRY_OPTIONS = [
    { value: 'CN', label: 'China' },
    { value: 'VN', label: 'Vietnam' },
    { value: 'IN', label: 'India' },
    { value: 'MX', label: 'Mexico' },
    { value: 'TH', label: 'Thailand' },
    { value: 'BD', label: 'Bangladesh' },
    { value: 'ID', label: 'Indonesia' },
    { value: 'TW', label: 'Taiwan' },
    { value: 'KR', label: 'South Korea' },
    { value: 'JP', label: 'Japan' },
    { value: 'DE', label: 'Germany' },
    { value: 'IT', label: 'Italy' },
    { value: 'CA', label: 'Canada' },
    { value: 'MY', label: 'Malaysia' },
    { value: 'PH', label: 'Philippines' },
];

// Chart colors
const CHART_COLORS = ['#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1', '#F0FDFA'];
const PIE_COLORS = ['#0D9488', '#0891B2', '#0284C7', '#6366F1', '#8B5CF6', '#A1A1AA'];

interface TradeStatsData {
    success: boolean;
    htsCode: string;
    htsPrefix: string;
    years: number[];
    dataSource: string;
    summary: {
        totalImportValue: number;
        totalQuantity: number;
        topSourceCountry: string;
        topSourceValue: number;
        yoyGrowth: number;
        countryCount: number;
    };
    importsByCountry: Array<{
        countryCode: string;
        countryName: string;
        totalValue: number;
        totalQuantity: number;
        quantityUnit: string;
        avgUnitValue: number;
        marketShare: number;
        growth: number;
    }>;
    trendData: Array<{ year: number; value: number; quantity: number }>;
    pieData: Array<{ name: string; value: number; percentage: number }>;
    metadata: {
        generatedAt: string;
        note: string;
    };
}

// Format large numbers for display
function formatValue(value: number): string {
    if (value >= 1000000000) {
        return `$${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
}

// Format quantity with units
function formatQuantity(value: number): string {
    if (value >= 1000000000) {
        return `${(value / 1000000000).toFixed(1)}B`;
    }
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
}

// Custom tooltip for bar chart
const BarChartTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { countryName: string; growth: number } }> }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-slate-900">{data.countryName}</p>
                <p className="text-sm text-slate-600">
                    Value: {formatValue(payload[0].value)}
                </p>
                <p className="text-sm" style={{ color: data.growth >= 0 ? '#10B981' : '#EF4444' }}>
                    Growth: {data.growth >= 0 ? '+' : ''}{data.growth}%
                </p>
            </div>
        );
    }
    return null;
};

// Custom tooltip for line chart
const LineChartTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: { year: number } }> }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-3 border border-slate-200">
                <p className="font-semibold text-slate-900">{payload[0].payload.year}</p>
                {payload.map((entry, index) => (
                    <p key={index} className="text-sm text-slate-600">
                        {entry.name}: {formatValue(entry.value)}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export const TradeStatsDashboard: React.FC = () => {
    const [htsCode, setHtsCode] = useState('6109');
    const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
    const [data, setData] = useState<TradeStatsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chartView, setChartView] = useState<'bar' | 'pie' | 'trend'>('bar');
    
    // Fetch trade statistics
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams({ htsCode });
            if (selectedCountries.length > 0) {
                params.append('countries', selectedCountries.join(','));
            }
            
            const response = await fetch(`/api/trade-stats?${params}`);
            const result = await response.json();
            
            if (result.success) {
                setData(result);
            } else {
                setError(result.error || 'Failed to fetch trade statistics');
            }
        } catch (err) {
            setError('Failed to connect to trade statistics API');
            console.error('[TradeStats] Fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [htsCode, selectedCountries]);
    
    // Initial fetch on mount
    useEffect(() => {
        fetchData();
    }, []);
    
    // Handle search
    const handleSearch = () => {
        fetchData();
    };
    
    // Export data to Excel
    const handleExport = () => {
        if (!data) return;
        
        const columns: ExcelColumn[] = [
            { key: 'countryCode', header: 'Country Code', width: 12 },
            { key: 'countryName', header: 'Country Name', width: 20 },
            { key: 'totalValue', header: 'Import Value ($)', width: 18, transform: (v) => v as number },
            { key: 'totalQuantity', header: 'Quantity', width: 15, transform: (v) => v as number },
            { key: 'quantityUnit', header: 'Unit', width: 12 },
            { key: 'avgUnitValue', header: 'Avg Unit Value ($)', width: 15 },
            { key: 'marketShare', header: 'Market Share (%)', width: 15 },
            { key: 'growth', header: 'YoY Growth (%)', width: 15 },
        ];
        
        exportToExcel(
            data.importsByCountry as unknown as Record<string, unknown>[],
            columns,
            { filename: `trade-stats-${data.htsPrefix}`, sheetName: 'Import Statistics' }
        );
        
        message.success('Export downloaded successfully');
    };
    
    // Prepare bar chart data (top 10)
    const barChartData = useMemo(() => {
        if (!data) return [];
        return data.importsByCountry.slice(0, 10).map(item => ({
            ...item,
            shortName: item.countryCode,
            displayValue: item.totalValue / 1000000 // Convert to millions
        }));
    }, [data]);
    
    // Render stat cards
    const renderStatCards = () => {
        if (!data) return null;
        const { summary } = data;
        
        const stats = [
            {
                title: 'Total Import Value',
                value: formatValue(summary.totalImportValue),
                prefix: <DollarSign size={20} />,
                color: '#0D9488',
                bg: 'bg-teal-50/50',
            },
            {
                title: 'Top Source',
                value: summary.topSourceCountry,
                subtitle: formatValue(summary.topSourceValue),
                prefix: <Globe size={20} />,
                color: '#0891B2',
                bg: 'bg-cyan-50/50',
            },
            {
                title: 'YoY Growth',
                value: `${summary.yoyGrowth >= 0 ? '+' : ''}${summary.yoyGrowth}%`,
                prefix: summary.yoyGrowth >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
                color: summary.yoyGrowth >= 0 ? '#10B981' : '#EF4444',
                bg: summary.yoyGrowth >= 0 ? 'bg-emerald-50/50' : 'bg-red-50/50',
            },
            {
                title: 'Source Countries',
                value: summary.countryCount.toString(),
                prefix: <Package size={20} />,
                color: '#6366F1',
                bg: 'bg-indigo-50/50',
            },
        ];
        
        return (
            <Row gutter={[16, 16]} className="mb-6">
                {stats.map((stat, idx) => (
                    <Col xs={12} sm={12} md={6} key={idx}>
                        <div className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg shadow-slate-200/30 rounded-2xl p-4 md:p-5 h-full relative overflow-hidden">
                            <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${stat.bg} blur-xl`} />
                            <div className="relative z-10">
                                <div className={`p-2 rounded-lg ${stat.bg} inline-block mb-2`}>
                                    <span style={{ color: stat.color }}>{stat.prefix}</span>
                                </div>
                                <Text className="text-slate-500 text-xs md:text-sm block">{stat.title}</Text>
                                <div className="font-bold text-lg md:text-xl text-slate-900">{stat.value}</div>
                                {stat.subtitle && (
                                    <Text className="text-slate-500 text-xs">{stat.subtitle}</Text>
                                )}
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>
        );
    };
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <Title level={2} style={{ margin: 0, color: '#0F172A' }}>Trade Statistics</Title>
                    <Text className="text-slate-500">
                        Analyze U.S. import data by HTS code, country, and time period
                    </Text>
                </div>
                <Space className="flex-shrink-0">
                    <Button 
                        icon={<Download size={16} />}
                        onClick={handleExport}
                        disabled={!data}
                    >
                        <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Button 
                        icon={<RefreshCw size={16} />}
                        onClick={handleSearch}
                        loading={loading}
                    >
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                </Space>
            </div>
            
            {/* Filters */}
            <Card className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-2xl">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <Text className="text-slate-600 text-sm mb-1.5 block">HTS Code</Text>
                        <Select
                            showSearch
                            value={htsCode}
                            onChange={setHtsCode}
                            placeholder="Enter HTS code or select chapter"
                            className="w-full"
                            size="large"
                            options={POPULAR_CHAPTERS}
                            filterOption={(input, option) =>
                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) ||
                                (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </div>
                    <div className="flex-1 w-full">
                        <Text className="text-slate-600 text-sm mb-1.5 block">Country Filter (optional)</Text>
                        <Select
                            mode="multiple"
                            allowClear
                            value={selectedCountries}
                            onChange={setSelectedCountries}
                            placeholder="All countries"
                            className="w-full"
                            size="large"
                            options={COUNTRY_OPTIONS}
                            maxTagCount={2}
                        />
                    </div>
                    <Button 
                        type="primary" 
                        size="large"
                        onClick={handleSearch}
                        loading={loading}
                        className="bg-teal-600 hover:bg-teal-700 w-full md:w-auto"
                    >
                        Analyze
                    </Button>
                </div>
            </Card>
            
            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-20">
                    <Spin size="large" />
                </div>
            )}
            
            {/* Error State */}
            {error && !loading && (
                <Alert
                    type="error"
                    message="Failed to Load Data"
                    description={error}
                    showIcon
                    action={
                        <Button size="small" onClick={handleSearch}>
                            Retry
                        </Button>
                    }
                />
            )}
            
            {/* Data Display */}
            {data && !loading && !error && (
                <>
                    {/* Data source indicator */}
                    {data.dataSource === 'Sample Data' && (
                        <Alert
                            type="info"
                            message={
                                <span className="flex items-center gap-2">
                                    <Info size={16} />
                                    Showing sample data for demonstration. Set USITC_DATAWEB_API_KEY for live data.
                                </span>
                            }
                            className="mb-4"
                            closable
                        />
                    )}
                    
                    {/* Summary Stats */}
                    {renderStatCards()}
                    
                    {/* Main Charts */}
                    <Row gutter={[16, 16]}>
                        {/* Top Import Sources - Bar Chart */}
                        <Col xs={24} lg={16}>
                            <Card 
                                className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-2xl"
                                title={
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">Top 10 Import Sources</span>
                                        <Segmented
                                            options={[
                                                { value: 'bar', icon: <BarChart3 size={16} /> },
                                                { value: 'trend', icon: <LineChartIcon size={16} /> },
                                            ]}
                                            value={chartView === 'pie' ? 'bar' : chartView}
                                            onChange={(v) => setChartView(v as 'bar' | 'trend')}
                                            size="small"
                                        />
                                    </div>
                                }
                            >
                                <div className="h-[350px]">
                                    {chartView === 'bar' ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={barChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                                <XAxis 
                                                    type="number" 
                                                    tickFormatter={(v) => `$${v}M`}
                                                    fontSize={12}
                                                />
                                                <YAxis 
                                                    type="category" 
                                                    dataKey="countryName" 
                                                    width={85}
                                                    fontSize={12}
                                                    tickLine={false}
                                                />
                                                <RechartsTooltip content={<BarChartTooltip />} />
                                                <Bar 
                                                    dataKey="displayValue" 
                                                    fill="#0D9488"
                                                    radius={[0, 4, 4, 0]}
                                                >
                                                    {barChartData.map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={data.trendData} margin={{ left: 10, right: 30 }}>
                                                <defs>
                                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="year" fontSize={12} />
                                                <YAxis 
                                                    tickFormatter={(v) => formatValue(v)}
                                                    fontSize={12}
                                                    width={70}
                                                />
                                                <RechartsTooltip content={<LineChartTooltip />} />
                                                <Area 
                                                    type="monotone" 
                                                    dataKey="value" 
                                                    stroke="#0D9488" 
                                                    strokeWidth={2}
                                                    fill="url(#colorValue)"
                                                    name="Import Value"
                                                />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </Card>
                        </Col>
                        
                        {/* Market Share - Pie Chart */}
                        <Col xs={24} lg={8}>
                            <Card 
                                className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-2xl"
                                title={<span className="font-semibold">Market Share</span>}
                            >
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.pieData}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={2}
                                                dataKey="value"
                                                nameKey="name"
                                                label={({ name, percentage }) => `${name}: ${percentage}%`}
                                                labelLine={{ stroke: '#94A3B8', strokeWidth: 1 }}
                                            >
                                                {data.pieData.map((entry, index) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                formatter={(value: number) => formatValue(value)}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                    
                    {/* Growth Comparison Table */}
                    <Card 
                        className="bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-2xl mt-6"
                        title={<span className="font-semibold">Year-over-Year Growth by Country</span>}
                    >
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Country</th>
                                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Import Value</th>
                                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Market Share</th>
                                        <th className="text-right py-3 px-4 font-semibold text-slate-700">Avg Unit Value</th>
                                        <th className="text-right py-3 px-4 font-semibold text-slate-700">YoY Growth</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.importsByCountry.map((item, index) => (
                                        <tr key={item.countryCode} className="border-b border-slate-100 hover:bg-slate-50/50">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{getCountryFlag(item.countryCode)}</span>
                                                    <div>
                                                        <span className="font-medium text-slate-900">{item.countryName}</span>
                                                        <span className="text-slate-400 ml-1 text-xs">({item.countryCode})</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono">
                                                {formatValue(item.totalValue)}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <Tag color={index < 3 ? 'cyan' : 'default'} className="rounded-full">
                                                    {item.marketShare}%
                                                </Tag>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                                                ${item.avgUnitValue.toFixed(2)}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <span 
                                                    className={`inline-flex items-center gap-1 font-medium ${
                                                        item.growth >= 0 ? 'text-emerald-600' : 'text-red-500'
                                                    }`}
                                                >
                                                    {item.growth >= 0 ? (
                                                        <ArrowUpRight size={14} />
                                                    ) : (
                                                        <ArrowDownRight size={14} />
                                                    )}
                                                    {item.growth >= 0 ? '+' : ''}{item.growth}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                    
                    {/* Metadata */}
                    <div className="text-center text-slate-400 text-xs mt-4">
                        HTS: {formatHtsCode(data.htsPrefix)} | Generated: {new Date(data.metadata.generatedAt).toLocaleString()} | Source: {data.dataSource}
                    </div>
                </>
            )}
        </div>
    );
};

// Helper function to get country flag emoji
function getCountryFlag(countryCode: string): string {
    const flags: Record<string, string> = {
        CN: '🇨🇳',
        VN: '🇻🇳',
        IN: '🇮🇳',
        MX: '🇲🇽',
        TH: '🇹🇭',
        BD: '🇧🇩',
        ID: '🇮🇩',
        TW: '🇹🇼',
        KR: '🇰🇷',
        JP: '🇯🇵',
        DE: '🇩🇪',
        IT: '🇮🇹',
        CA: '🇨🇦',
        MY: '🇲🇾',
        PH: '🇵🇭',
        PK: '🇵🇰',
        TR: '🇹🇷',
        GB: '🇬🇧',
        FR: '🇫🇷',
        BR: '🇧🇷',
        KH: '🇰🇭',
        NL: '🇳🇱',
    };
    return flags[countryCode] || '🌐';
}

export default TradeStatsDashboard;
