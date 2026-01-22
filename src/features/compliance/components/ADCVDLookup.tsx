'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    Card, 
    Input, 
    Select, 
    Button, 
    Table, 
    Tag, 
    Alert, 
    Typography, 
    Space, 
    Tooltip, 
    Empty,
    Modal,
    Descriptions,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
    Search, 
    AlertTriangle, 
    ExternalLink, 
    FileText, 
    Shield, 
    ShieldAlert,
    ShieldCheck,
    ShieldX,
    Info,
    MapPin,
    Package,
    CircleDollarSign,
    Copy,
    RefreshCw,
} from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/shared';
import type { ADCVDOrderInfo } from '@/data/adcvdOrders';

const { Title, Text, Paragraph } = Typography;

// Country options for filtering
const COUNTRY_OPTIONS = [
    { value: 'CN', label: '🇨🇳 China', flag: '🇨🇳' },
    { value: 'CA', label: '🇨🇦 Canada', flag: '🇨🇦' },
    { value: 'KR', label: '🇰🇷 South Korea', flag: '🇰🇷' },
    { value: 'JP', label: '🇯🇵 Japan', flag: '🇯🇵' },
    { value: 'TW', label: '🇹🇼 Taiwan', flag: '🇹🇼' },
    { value: 'VN', label: '🇻🇳 Vietnam', flag: '🇻🇳' },
    { value: 'IN', label: '🇮🇳 India', flag: '🇮🇳' },
    { value: 'TR', label: '🇹🇷 Turkey', flag: '🇹🇷' },
    { value: 'BR', label: '🇧🇷 Brazil', flag: '🇧🇷' },
    { value: 'RU', label: '🇷🇺 Russia', flag: '🇷🇺' },
    { value: 'TH', label: '🇹🇭 Thailand', flag: '🇹🇭' },
    { value: 'MY', label: '🇲🇾 Malaysia', flag: '🇲🇾' },
    { value: 'ID', label: '🇮🇩 Indonesia', flag: '🇮🇩' },
    { value: 'MX', label: '🇲🇽 Mexico', flag: '🇲🇽' },
    { value: 'UA', label: '🇺🇦 Ukraine', flag: '🇺🇦' },
    { value: 'DE', label: '🇩🇪 Germany', flag: '🇩🇪' },
];

interface APIResponse {
    success: boolean;
    data: {
        orders: ADCVDOrderInfo[];
        warning: {
            productCategory: string;
            message: string;
            affectedCountries: string[];
            lookupUrl: string;
            isCountryAffected: boolean;
        } | null;
        riskLevel: 'high' | 'medium' | 'low' | 'none';
        summary: {
            totalOrders: number;
            matchedPrefixes: number;
            affectedCountries: string[];
            isCountryAffected: boolean;
        };
        resources: {
            cbpLookup: string;
            itcOrders: string;
            itaSearch: string;
        };
    };
    filters: {
        htsCode: string | null;
        countryCode: string | null;
        search: string | null;
    };
}

export const ADCVDLookup: React.FC = () => {
    const [htsCode, setHtsCode] = useState('');
    const [countryCode, setCountryCode] = useState<string | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<APIResponse['data'] | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<ADCVDOrderInfo | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    
    const [messageApi, contextHolder] = message.useMessage();
    const debounceTimer = useRef<NodeJS.Timeout | undefined>(undefined);

    // Fetch data from API
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            if (htsCode.trim()) {
                params.set('htsCode', htsCode.trim().replace(/\./g, ''));
            }
            if (countryCode) {
                params.set('countryCode', countryCode);
            }
            if (searchTerm.trim()) {
                params.set('search', searchTerm.trim());
            }
            
            const response = await fetch(`/api/adcvd?${params.toString()}`);
            const result: APIResponse = await response.json();
            
            if (result.success) {
                setData(result.data);
            } else {
                setError('Failed to fetch ADD/CVD data');
            }
        } catch (err) {
            console.error('Error fetching ADD/CVD data:', err);
            setError('Failed to connect to the server');
        } finally {
            setLoading(false);
        }
    }, [htsCode, countryCode, searchTerm]);

    // Initial load
    useEffect(() => {
        fetchData();
    }, []);

    // Debounced search
    const handleSearch = useCallback(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
            fetchData();
        }, 300);
    }, [fetchData]);

    // Trigger search on input changes
    useEffect(() => {
        handleSearch();
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [htsCode, countryCode, searchTerm, handleSearch]);

    // Get risk level color and icon
    const getRiskDisplay = (level: 'high' | 'medium' | 'low' | 'none') => {
        switch (level) {
            case 'high':
                return { 
                    color: 'red', 
                    icon: <ShieldX className="w-5 h-5" />, 
                    text: 'High Risk',
                    bgClass: 'bg-red-50 border-red-200',
                };
            case 'medium':
                return { 
                    color: 'orange', 
                    icon: <ShieldAlert className="w-5 h-5" />, 
                    text: 'Medium Risk',
                    bgClass: 'bg-amber-50 border-amber-200',
                };
            case 'low':
                return { 
                    color: 'gold', 
                    icon: <Shield className="w-5 h-5" />, 
                    text: 'Low Risk',
                    bgClass: 'bg-yellow-50 border-yellow-200',
                };
            default:
                return { 
                    color: 'green', 
                    icon: <ShieldCheck className="w-5 h-5" />, 
                    text: 'No Known Orders',
                    bgClass: 'bg-green-50 border-green-200',
                };
        }
    };

    // Get country flag
    const getCountryFlag = (code: string): string => {
        const country = COUNTRY_OPTIONS.find(c => c.value === code);
        if (country) return country.flag;
        // Generate flag emoji from country code
        return code
            .toUpperCase()
            .split('')
            .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
            .join('');
    };

    // Copy text to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        messageApi.success('Copied to clipboard');
    };

    // Table columns
    const columns: ColumnsType<ADCVDOrderInfo> = [
        {
            title: 'HTS Prefix',
            dataIndex: 'htsPrefix',
            key: 'htsPrefix',
            width: 120,
            render: (text) => (
                <Tag 
                    className="font-mono cursor-pointer hover:bg-slate-100"
                    onClick={() => copyToClipboard(text)}
                >
                    {text}
                </Tag>
            ),
        },
        {
            title: 'Product Category',
            dataIndex: 'productCategory',
            key: 'productCategory',
            render: (text, record) => (
                <div>
                    <Text strong>{text}</Text>
                    {record.notes && (
                        <Tooltip title={record.notes}>
                            <Info className="inline-block ml-2 w-4 h-4 text-slate-400 cursor-help" />
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: 'Affected Countries',
            dataIndex: 'commonCountries',
            key: 'commonCountries',
            render: (countries: string[]) => (
                <div className="flex flex-wrap gap-1">
                    {countries.slice(0, 4).map(code => (
                        <Tooltip key={code} title={COUNTRY_OPTIONS.find(c => c.value === code)?.label.replace(/^.+\s/, '') || code}>
                            <span className="text-lg cursor-default">
                                {getCountryFlag(code)}
                            </span>
                        </Tooltip>
                    ))}
                    {countries.length > 4 && (
                        <Tooltip title={countries.slice(4).map(c => COUNTRY_OPTIONS.find(o => o.value === c)?.label.replace(/^.+\s/, '') || c).join(', ')}>
                            <Tag className="text-xs">+{countries.length - 4}</Tag>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: 'Est. Duty Range',
            dataIndex: 'dutyRange',
            key: 'dutyRange',
            width: 140,
            render: (text) => (
                <Tag color="red" className="font-semibold">{text || 'Varies'}</Tag>
            ),
        },
        {
            title: 'Orders',
            dataIndex: 'orderCount',
            key: 'orderCount',
            width: 80,
            sorter: (a, b) => b.orderCount - a.orderCount,
            render: (count) => (
                <Text className="font-mono">{count}</Text>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 100,
            render: (_, record) => (
                <Button 
                    type="link" 
                    size="small"
                    onClick={() => {
                        setSelectedOrder(record);
                        setDetailModalOpen(true);
                    }}
                >
                    Details
                </Button>
            ),
        },
    ];

    const riskDisplay = data ? getRiskDisplay(data.riskLevel) : null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {contextHolder}
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Title level={3} className="!mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                        ADD/CVD Lookup
                    </Title>
                    <Text className="text-slate-500">
                        Check Antidumping and Countervailing Duty exposure by HTS code or country
                    </Text>
                </div>
                <Button 
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={fetchData}
                    loading={loading}
                >
                    Refresh
                </Button>
            </div>

            {/* Search & Filters */}
            <Card className="shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            HTS Code
                        </label>
                        <Input
                            placeholder="Enter HTS code (e.g., 7208)"
                            prefix={<Package className="w-4 h-4 text-slate-400" />}
                            value={htsCode}
                            onChange={(e) => setHtsCode(e.target.value)}
                            className="font-mono"
                            allowClear
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Country of Origin
                        </label>
                        <Select
                            placeholder="Select country"
                            options={COUNTRY_OPTIONS}
                            value={countryCode}
                            onChange={setCountryCode}
                            allowClear
                            className="w-full"
                            showSearch
                            filterOption={(input, option) =>
                                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Product Search
                        </label>
                        <Input
                            placeholder="Search products..."
                            prefix={<Search className="w-4 h-4 text-slate-400" />}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            allowClear
                        />
                    </div>
                </div>
            </Card>

            {/* Risk Assessment Banner */}
            {data && htsCode && riskDisplay && (
                <Alert
                    type={data.riskLevel === 'none' ? 'success' : data.riskLevel === 'high' ? 'error' : 'warning'}
                    showIcon
                    icon={riskDisplay.icon}
                    message={
                        <span className="font-semibold">
                            {data.riskLevel === 'none' 
                                ? 'No Known ADD/CVD Orders'
                                : `ADD/CVD Exposure: ${riskDisplay.text}`
                            }
                        </span>
                    }
                    description={
                        data.warning ? (
                            <div className="mt-2">
                                <Paragraph className="!mb-2">{data.warning.message}</Paragraph>
                                {data.warning.isCountryAffected && (
                                    <Tag color="red" className="font-semibold">
                                        ⚠️ Your origin country has active orders
                                    </Tag>
                                )}
                            </div>
                        ) : data.riskLevel !== 'none' ? (
                            <div className="mt-2">
                                <Text>
                                    {data.summary.matchedPrefixes} product category(ies) found with approximately {data.summary.totalOrders} active orders.
                                </Text>
                            </div>
                        ) : (
                            <Text>
                                No ADD/CVD orders were found for this HTS code prefix. Always verify with CBP.
                            </Text>
                        )
                    }
                />
            )}

            {/* Warning for country filter */}
            {data && !htsCode && countryCode && data.orders.length > 0 && (
                <Alert
                    type="warning"
                    showIcon
                    message={
                        <span>
                            <strong>{data.summary.totalOrders} Active ADD/CVD Orders</strong> affect imports from {
                                COUNTRY_OPTIONS.find(c => c.value === countryCode)?.label.replace(/^.+\s/, '') || countryCode
                            }
                        </span>
                    }
                    description="Review the products below to identify potential duty exposure."
                />
            )}

            {/* Error State */}
            {error && (
                <ErrorState
                    title="Error Loading Data"
                    message={error}
                    onRetry={fetchData}
                    type="error"
                />
            )}

            {/* Loading State */}
            {loading && <LoadingState message="Loading ADD/CVD orders..." />}

            {/* Results Table */}
            {!loading && data && (
                <Card 
                    title={
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <span>
                                {data.orders.length > 0 
                                    ? `${data.orders.length} Product Categories with AD/CVD Orders`
                                    : 'No Matching Orders'
                                }
                            </span>
                            <Space>
                                <Tag color="blue">{data.summary.totalOrders} Total Orders</Tag>
                                <Tag color="purple">{data.summary.affectedCountries.length} Countries</Tag>
                            </Space>
                        </div>
                    }
                    className="shadow-sm"
                >
                    {data.orders.length > 0 ? (
                        <Table
                            columns={columns}
                            dataSource={data.orders}
                            rowKey="htsPrefix"
                            pagination={{ 
                                pageSize: 10,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '25', '50'],
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                            }}
                            scroll={{ x: 800 }}
                            size="middle"
                        />
                    ) : (
                        <Empty
                            description={
                                <div className="text-center">
                                    <Text className="text-slate-500">
                                        No ADD/CVD orders match your search criteria.
                                    </Text>
                                    {(htsCode || countryCode || searchTerm) && (
                                        <div className="mt-2">
                                            <Button 
                                                type="link" 
                                                onClick={() => {
                                                    setHtsCode('');
                                                    setCountryCode(undefined);
                                                    setSearchTerm('');
                                                }}
                                            >
                                                Clear filters
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            }
                        />
                    )}
                </Card>
            )}

            {/* External Resources */}
            {data && (
                <Card 
                    title={
                        <span className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Official Resources
                        </span>
                    }
                    className="shadow-sm"
                    size="small"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <a 
                            href={data.resources.cbpLookup}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                        >
                            <div className="bg-blue-100 p-2 rounded-lg">
                                <Search className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <Text strong className="block">CBP AD/CVD Search</Text>
                                <Text className="text-xs text-slate-500">Look up exact duty rates</Text>
                            </div>
                        </a>
                        <a 
                            href={data.resources.itcOrders}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                        >
                            <div className="bg-green-100 p-2 rounded-lg">
                                <FileText className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <Text strong className="block">ITC Orders List</Text>
                                <Text className="text-xs text-slate-500">Download Excel spreadsheet</Text>
                            </div>
                        </a>
                        <a 
                            href={data.resources.itaSearch}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                        >
                            <div className="bg-purple-100 p-2 rounded-lg">
                                <CircleDollarSign className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <Text strong className="block">ITA Searchable Database</Text>
                                <Text className="text-xs text-slate-500">Commerce Department tool</Text>
                            </div>
                        </a>
                    </div>
                </Card>
            )}

            {/* Disclaimer */}
            <Alert
                type="info"
                showIcon
                icon={<Info className="w-4 h-4" />}
                message="Important Disclaimer"
                description={
                    <Text className="text-slate-600">
                        ADD/CVD rates are <strong>manufacturer-specific</strong> and can range from 0% to 500%+. 
                        The information shown here identifies products with known orders, but actual duty rates 
                        depend on the specific manufacturer and CBP's current deposit rates. Always verify 
                        rates with a licensed customs broker or CBP before importing.
                    </Text>
                }
            />

            {/* Detail Modal */}
            <Modal
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={[
                    <Button 
                        key="cbp" 
                        type="primary"
                        icon={<ExternalLink className="w-4 h-4" />}
                        href={data?.resources.cbpLookup}
                        target="_blank"
                    >
                        Look Up Rates at CBP
                    </Button>,
                    <Button key="close" onClick={() => setDetailModalOpen(false)}>
                        Close
                    </Button>,
                ]}
                title={
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        ADD/CVD Order Details
                    </div>
                }
                width={640}
            >
                {selectedOrder && (
                    <div className="space-y-4">
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Product Category">
                                <Text strong>{selectedOrder.productCategory}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="HTS Prefix">
                                <Tag 
                                    className="font-mono cursor-pointer"
                                    onClick={() => copyToClipboard(selectedOrder.htsPrefix)}
                                >
                                    {selectedOrder.htsPrefix}
                                    <Copy className="w-3 h-3 ml-1 inline" />
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Estimated Duty Range">
                                <Tag color="red" className="font-semibold text-base">
                                    {selectedOrder.dutyRange || 'Varies by manufacturer'}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Active Orders">
                                <Text strong>{selectedOrder.orderCount}</Text> order(s)
                            </Descriptions.Item>
                            <Descriptions.Item label="Countries with Orders">
                                <div className="flex flex-wrap gap-2">
                                    {selectedOrder.commonCountries.map(code => (
                                        <Tag key={code} color="blue">
                                            {getCountryFlag(code)} {
                                                COUNTRY_OPTIONS.find(c => c.value === code)?.label.replace(/^.+\s/, '') || code
                                            }
                                        </Tag>
                                    ))}
                                </div>
                            </Descriptions.Item>
                            {selectedOrder.caseNumbers && selectedOrder.caseNumbers.length > 0 && (
                                <Descriptions.Item label="Example Case Numbers">
                                    <div className="flex flex-wrap gap-1">
                                        {selectedOrder.caseNumbers.map(cn => (
                                            <Tag key={cn} className="font-mono text-xs">{cn}</Tag>
                                        ))}
                                    </div>
                                </Descriptions.Item>
                            )}
                            {selectedOrder.notes && (
                                <Descriptions.Item label="Notes">
                                    <Text>{selectedOrder.notes}</Text>
                                </Descriptions.Item>
                            )}
                        </Descriptions>

                        <Alert
                            type="warning"
                            showIcon
                            message="Rates Are Manufacturer-Specific"
                            description={
                                <div className="text-sm">
                                    <p>ADD/CVD rates vary significantly:</p>
                                    <ul className="list-disc ml-4 mt-1">
                                        <li>Known manufacturers have specific rates</li>
                                        <li>New/unknown suppliers get "all others" rate</li>
                                        <li>Rates change with annual reviews</li>
                                        <li>Cash deposits required at entry</li>
                                    </ul>
                                </div>
                            }
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};
