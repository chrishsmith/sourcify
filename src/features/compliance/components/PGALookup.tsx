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
    Collapse,
    Divider,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { 
    Search, 
    FileCheck, 
    ExternalLink, 
    Building2, 
    Shield, 
    ShieldCheck,
    ShieldAlert,
    ShieldQuestion,
    Info,
    Package,
    Copy,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    ListChecks,
    Sparkles,
    BookOpen,
} from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/shared';
import type { PGAFlag, PGAAgency, HtsChapterPGA } from '@/data/pgaFlags';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Agency icons mapping
const AGENCY_ICONS: Record<string, React.ReactNode> = {
    FDA: '🏥',
    EPA: '🌿',
    CPSC: '👶',
    'USDA/APHIS': '🌾',
    'USDA/FSIS': '🥩',
    FWS: '🦅',
    TTB: '🍷',
    'DOT/NHTSA': '🚗',
    DEA: '💊',
    FCC: '📻',
    ATF: '🔫',
    NRC: '☢️',
    NMFS: '🐟',
};

// Agency colors for tags
const AGENCY_COLORS: Record<string, string> = {
    FDA: 'blue',
    EPA: 'green',
    CPSC: 'purple',
    'USDA/APHIS': 'gold',
    'USDA/FSIS': 'orange',
    FWS: 'cyan',
    TTB: 'magenta',
    'DOT/NHTSA': 'red',
    DEA: 'volcano',
    FCC: 'geekblue',
    ATF: 'lime',
    NRC: 'yellow',
    NMFS: 'default',
};

interface APIResponse {
    success: boolean;
    data: {
        htsCode?: string;
        chapter?: string;
        chapterName?: string;
        notes?: string;
        flags?: PGAFlag[];
        agencies?: PGAAgency[];
        allFlags?: PGAFlag[];
        allAgencies?: PGAAgency[];
        flagsByAgency?: Record<string, PGAFlag[]>;
        chaptersWithPGA?: HtsChapterPGA[];
        summary?: {
            totalFlags: number;
            totalAgencies: number;
            requiresLicense?: boolean;
            requiresFiling?: boolean;
        };
        requirementLevel?: 'high' | 'medium' | 'low' | 'none';
        message?: string;
    };
}

export const PGALookup: React.FC = () => {
    const [htsCode, setHtsCode] = useState('');
    const [selectedAgency, setSelectedAgency] = useState<string | undefined>();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<APIResponse['data'] | null>(null);
    const [selectedFlag, setSelectedFlag] = useState<PGAFlag | null>(null);
    const [selectedAgencyDetail, setSelectedAgencyDetail] = useState<PGAAgency | null>(null);
    const [flagModalOpen, setFlagModalOpen] = useState(false);
    const [agencyModalOpen, setAgencyModalOpen] = useState(false);
    
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
            if (selectedAgency) {
                params.set('agency', selectedAgency);
            }
            if (searchTerm.trim()) {
                params.set('search', searchTerm.trim());
            }
            
            const response = await fetch(`/api/pga?${params.toString()}`);
            const result: APIResponse = await response.json();
            
            if (result.success) {
                setData(result.data);
            } else {
                setError('Failed to fetch PGA data');
            }
        } catch (err) {
            console.error('Error fetching PGA data:', err);
            setError('Failed to connect to the server');
        } finally {
            setLoading(false);
        }
    }, [htsCode, selectedAgency, searchTerm]);

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
    }, [htsCode, selectedAgency, searchTerm, handleSearch]);

    // Copy text to clipboard
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        messageApi.success('Copied to clipboard');
    };

    // Get agency icon
    const getAgencyIcon = (code: string): React.ReactNode => {
        return AGENCY_ICONS[code] || <Building2 className="w-4 h-4" />;
    };

    // Get agency color
    const getAgencyColor = (code: string): string => {
        return AGENCY_COLORS[code] || 'default';
    };

    // Agency options for filter dropdown
    const agencyOptions = data?.allAgencies?.map(agency => ({
        value: agency.code,
        label: (
            <span className="flex items-center gap-2">
                <span>{AGENCY_ICONS[agency.code] || '🏛️'}</span>
                <span>{agency.code}</span>
            </span>
        ),
    })) || [];

    // PGA flag table columns
    const flagColumns: ColumnsType<PGAFlag> = [
        {
            title: 'Flag Code',
            dataIndex: 'code',
            key: 'code',
            width: 100,
            render: (text) => (
                <Tag 
                    className="font-mono font-bold cursor-pointer hover:bg-slate-100"
                    onClick={() => copyToClipboard(text)}
                >
                    {text}
                </Tag>
            ),
        },
        {
            title: 'Agency',
            dataIndex: 'agency',
            key: 'agency',
            width: 120,
            render: (text) => {
                const agencyInfo = data?.allAgencies?.find(a => a.code === text);
                return (
                    <Tag 
                        color={getAgencyColor(text)}
                        className="cursor-pointer"
                        onClick={() => {
                            if (agencyInfo) {
                                setSelectedAgencyDetail(agencyInfo);
                                setAgencyModalOpen(true);
                            }
                        }}
                    >
                        <span className="mr-1">{getAgencyIcon(text)}</span>
                        {text}
                    </Tag>
                );
            },
        },
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div>
                    <Text strong className="block">{text.replace(`${record.agency} - `, '')}</Text>
                    <Text className="text-slate-500 text-xs line-clamp-1">{record.description}</Text>
                </div>
            ),
        },
        {
            title: 'Common Products',
            dataIndex: 'commonProducts',
            key: 'commonProducts',
            width: 200,
            render: (products: string[]) => (
                <div className="flex flex-wrap gap-1">
                    {products.slice(0, 2).map(product => (
                        <Tag key={product} className="text-xs">{product}</Tag>
                    ))}
                    {products.length > 2 && (
                        <Tooltip title={products.slice(2).join(', ')}>
                            <Tag className="text-xs">+{products.length - 2}</Tag>
                        </Tooltip>
                    )}
                </div>
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
                        setSelectedFlag(record);
                        setFlagModalOpen(true);
                    }}
                >
                    Details
                </Button>
            ),
        },
    ];

    // Get flags to display - API returns flags directly in data for HTS lookup
    const htsFlags = htsCode ? data?.flags : null;
    const displayFlags = htsFlags || data?.allFlags || [];

    // Check if HTS code has requirements (API returns flags array directly)
    const hasHtsRequirements = htsCode && data?.flags && data.flags.length > 0;
    const noHtsRequirements = htsCode && data?.flags !== undefined && data.flags.length === 0;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {contextHolder}
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Title level={3} className="!mb-1 flex items-center gap-2">
                        <FileCheck className="w-6 h-6 text-teal-600" />
                        PGA Requirements Lookup
                    </Title>
                    <Text className="text-slate-500">
                        Look up Partner Government Agency requirements by HTS code
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
                            HTS Code (10-digit)
                        </label>
                        <Input
                            placeholder="e.g., 8541400010"
                            prefix={<Package className="w-4 h-4 text-slate-400" />}
                            value={htsCode}
                            onChange={(e) => setHtsCode(e.target.value)}
                            className="font-mono"
                            allowClear
                        />
                        <Text className="text-xs text-slate-400 mt-1 block">
                            Enter any HTS code to see agency requirements
                        </Text>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Filter by Agency
                        </label>
                        <Select
                            placeholder="All agencies"
                            options={agencyOptions}
                            value={selectedAgency}
                            onChange={(value) => {
                                setSelectedAgency(value);
                                setHtsCode(''); // Clear HTS when filtering by agency
                            }}
                            allowClear
                            className="w-full"
                            showSearch
                            filterOption={(input, option) => {
                                const label = option?.value as string;
                                return label?.toLowerCase().includes(input.toLowerCase()) || false;
                            }}
                        />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Search Flags
                        </label>
                        <Input
                            placeholder="Search by flag code, name, or product..."
                            prefix={<Search className="w-4 h-4 text-slate-400" />}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setHtsCode(''); // Clear HTS when searching
                                setSelectedAgency(undefined);
                            }}
                            allowClear
                        />
                    </div>
                </div>
            </Card>

            {/* HTS Code Requirements Result */}
            {htsCode && data && (
                <Card className="shadow-sm">
                    <div className="flex items-start gap-4">
                        {hasHtsRequirements ? (
                            <div className="bg-amber-100 p-3 rounded-full">
                                <ShieldAlert className="w-6 h-6 text-amber-600" />
                            </div>
                        ) : noHtsRequirements ? (
                            <div className="bg-green-100 p-3 rounded-full">
                                <ShieldCheck className="w-6 h-6 text-green-600" />
                            </div>
                        ) : (
                            <div className="bg-slate-100 p-3 rounded-full">
                                <ShieldQuestion className="w-6 h-6 text-slate-600" />
                            </div>
                        )}
                        <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <Text strong className="text-lg">
                                    Chapter {data.chapter}: {data?.chapterName || 'Unknown Chapter'}
                                </Text>
                                <Tag className="font-mono">{htsCode.replace(/\./g, '')}</Tag>
                            </div>
                            
                            {hasHtsRequirements ? (
                                <>
                                    <Alert
                                        type="warning"
                                        showIcon
                                        message={
                                            <span className="font-semibold">
                                                PGA Requirements Apply
                                            </span>
                                        }
                                        description={
                                            <div className="mt-2">
                                                <Text>
                                                    This HTS code has requirements from {data?.agencies?.length || 0} agency(ies):
                                                </Text>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {data?.agencies?.map(agency => (
                                                        <Tag 
                                                            key={agency.code} 
                                                            color={getAgencyColor(agency.code)}
                                                            className="cursor-pointer"
                                                            onClick={() => {
                                                                setSelectedAgencyDetail(agency);
                                                                setAgencyModalOpen(true);
                                                            }}
                                                        >
                                                            <span className="mr-1">{getAgencyIcon(agency.code)}</span>
                                                            {agency.name}
                                                        </Tag>
                                                    ))}
                                                </div>
                                                {data?.notes && (
                                                    <div className="mt-3 p-2 bg-amber-50 rounded">
                                                        <Text className="text-amber-800">
                                                            <Info className="w-4 h-4 inline mr-1" />
                                                            {data.notes}
                                                        </Text>
                                                    </div>
                                                )}
                                            </div>
                                        }
                                    />
                                    
                                    {/* Applicable Flags */}
                                    <div className="mt-4">
                                        <Text strong className="block mb-2">
                                            <ListChecks className="w-4 h-4 inline mr-1" />
                                            Applicable PGA Flags ({data?.flags?.length || 0})
                                        </Text>
                                        <div className="space-y-2">
                                            {data?.flags?.map(flag => (
                                                <div 
                                                    key={flag.code}
                                                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-teal-300 cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        setSelectedFlag(flag);
                                                        setFlagModalOpen(true);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Tag className="font-mono font-bold">{flag.code}</Tag>
                                                            <Text strong>{flag.name.replace(`${flag.agency} - `, '')}</Text>
                                                        </div>
                                                        <Button type="link" size="small">View Details</Button>
                                                    </div>
                                                    <Text className="text-slate-500 text-sm block mt-1">
                                                        {flag.description}
                                                    </Text>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : noHtsRequirements ? (
                                <Alert
                                    type="success"
                                    showIcon
                                    message={
                                        <span className="font-semibold">
                                            No Known PGA Requirements
                                        </span>
                                    }
                                    description={
                                        <Text>
                                            This HTS chapter does not have common PGA flag requirements in our database. 
                                            However, specific subheadings may still have requirements. 
                                            Always verify with the actual ACE PGA Appendix for official determinations.
                                        </Text>
                                    }
                                />
                            ) : (
                                <Alert
                                    type="info"
                                    showIcon
                                    message="Checking requirements..."
                                />
                            )}
                        </div>
                    </div>
                </Card>
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
            {loading && <LoadingState message="Loading PGA requirements..." />}

            {/* PGA Flags Reference Table */}
            {!loading && !htsCode && data && (
                <Card 
                    title={
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                {searchTerm ? `Search Results: "${searchTerm}"` : selectedAgency ? `${selectedAgency} Flags` : 'Common PGA Flag Codes'}
                            </span>
                            <Space>
                                <Tag color="blue">{displayFlags.length} Flags</Tag>
                                <Tag color="purple">{data.allAgencies?.length || data.agencies?.length || 0} Agencies</Tag>
                            </Space>
                        </div>
                    }
                    className="shadow-sm"
                >
                    {displayFlags.length > 0 ? (
                        <Table
                            columns={flagColumns}
                            dataSource={displayFlags}
                            rowKey="code"
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
                                        No PGA flags match your search criteria.
                                    </Text>
                                    {(searchTerm || selectedAgency) && (
                                        <div className="mt-2">
                                            <Button 
                                                type="link" 
                                                onClick={() => {
                                                    setSearchTerm('');
                                                    setSelectedAgency(undefined);
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

            {/* Agency Reference Cards */}
            {!loading && !htsCode && !searchTerm && !selectedAgency && data?.allAgencies && (
                <Card 
                    title={
                        <span className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Partner Government Agencies
                        </span>
                    }
                    className="shadow-sm"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.allAgencies.map(agency => (
                            <div 
                                key={agency.code}
                                className="p-4 rounded-lg border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer"
                                onClick={() => {
                                    setSelectedAgencyDetail(agency);
                                    setAgencyModalOpen(true);
                                }}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{getAgencyIcon(agency.code)}</span>
                                    <div>
                                        <Text strong className="block">{agency.code}</Text>
                                        <Text className="text-xs text-slate-500">{agency.name}</Text>
                                    </div>
                                </div>
                                <Text className="text-slate-600 text-sm line-clamp-2">
                                    {agency.description}
                                </Text>
                                <div className="mt-2 flex items-center gap-2">
                                    <Tag color={getAgencyColor(agency.code)}>
                                        {data.flagsByAgency?.[agency.code]?.length || 0} flags
                                    </Tag>
                                    <a 
                                        href={agency.website} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-xs text-teal-600 hover:text-teal-800 flex items-center gap-1"
                                    >
                                        Website <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* External Resources */}
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
                        href="https://www.cbp.gov/trade/ace/catair/appendix-pga"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                    >
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <FileCheck className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <Text strong className="block">ACE PGA Appendix</Text>
                            <Text className="text-xs text-slate-500">Official CBP reference</Text>
                        </div>
                    </a>
                    <a 
                        href="https://www.cbp.gov/trade/ace/catair/pga-message-sets"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                    >
                        <div className="bg-green-100 p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <Text strong className="block">PGA Message Sets</Text>
                            <Text className="text-xs text-slate-500">Technical specifications</Text>
                        </div>
                    </a>
                    <a 
                        href="https://www.cbp.gov/trade/partner-government-agencies"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-colors"
                    >
                        <div className="bg-purple-100 p-2 rounded-lg">
                            <Building2 className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <Text strong className="block">CBP PGA Portal</Text>
                            <Text className="text-xs text-slate-500">Agency coordination info</Text>
                        </div>
                    </a>
                </div>
            </Card>

            {/* Disclaimer */}
            <Alert
                type="info"
                showIcon
                icon={<Info className="w-4 h-4" />}
                message="Important Disclaimer"
                description={
                    <Text className="text-slate-600">
                        PGA requirements are determined by the specific <strong>10-digit HTS code</strong> of your product, 
                        not just the chapter. This tool provides general guidance based on chapter-level requirements. 
                        Always verify requirements using the official ACE PGA Appendix and consult with your customs broker 
                        for accurate compliance information. Requirements may change without notice.
                    </Text>
                }
            />

            {/* Flag Detail Modal */}
            <Modal
                open={flagModalOpen}
                onCancel={() => setFlagModalOpen(false)}
                footer={[
                    <Button 
                        key="agency-site" 
                        type="primary"
                        icon={<ExternalLink className="w-4 h-4" />}
                        href={data?.allAgencies?.find(a => a.code === selectedFlag?.agency)?.website}
                        target="_blank"
                    >
                        Visit Agency Website
                    </Button>,
                    <Button key="close" onClick={() => setFlagModalOpen(false)}>
                        Close
                    </Button>,
                ]}
                title={
                    <div className="flex items-center gap-2">
                        <Tag className="font-mono font-bold text-lg">{selectedFlag?.code}</Tag>
                        <span>{selectedFlag?.name.replace(`${selectedFlag?.agency} - `, '')}</span>
                    </div>
                }
                width={640}
            >
                {selectedFlag && (
                    <div className="space-y-4">
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Flag Code">
                                <Tag 
                                    className="font-mono cursor-pointer"
                                    onClick={() => copyToClipboard(selectedFlag.code)}
                                >
                                    {selectedFlag.code}
                                    <Copy className="w-3 h-3 ml-1 inline" />
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Agency">
                                <Tag color={getAgencyColor(selectedFlag.agency)}>
                                    <span className="mr-1">{getAgencyIcon(selectedFlag.agency)}</span>
                                    {selectedFlag.agency}
                                </Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label="Description">
                                <Text>{selectedFlag.description}</Text>
                            </Descriptions.Item>
                        </Descriptions>

                        <div>
                            <Text strong className="block mb-2">
                                <ListChecks className="w-4 h-4 inline mr-1" />
                                Requirements
                            </Text>
                            <div className="bg-slate-50 p-3 rounded-lg">
                                <ul className="list-disc ml-4 space-y-1">
                                    {selectedFlag.requirements.map((req, idx) => (
                                        <li key={idx}>
                                            <Text>{req}</Text>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div>
                            <Text strong className="block mb-2">
                                <Package className="w-4 h-4 inline mr-1" />
                                Common Products
                            </Text>
                            <div className="flex flex-wrap gap-2">
                                {selectedFlag.commonProducts.map(product => (
                                    <Tag key={product} color="blue">{product}</Tag>
                                ))}
                            </div>
                        </div>

                        <Alert
                            type="info"
                            showIcon
                            message="Compliance Reminder"
                            description={
                                <Text className="text-sm">
                                    Requirements vary by specific HTS code and product type. 
                                    Consult the agency directly or work with a licensed customs broker 
                                    to ensure full compliance.
                                </Text>
                            }
                        />
                    </div>
                )}
            </Modal>

            {/* Agency Detail Modal */}
            <Modal
                open={agencyModalOpen}
                onCancel={() => setAgencyModalOpen(false)}
                footer={[
                    <Button 
                        key="website" 
                        type="primary"
                        icon={<ExternalLink className="w-4 h-4" />}
                        href={selectedAgencyDetail?.website}
                        target="_blank"
                    >
                        Visit Agency Import Portal
                    </Button>,
                    <Button 
                        key="filter" 
                        onClick={() => {
                            if (selectedAgencyDetail) {
                                setSelectedAgency(selectedAgencyDetail.code);
                                setAgencyModalOpen(false);
                            }
                        }}
                    >
                        Show All Flags
                    </Button>,
                    <Button key="close" onClick={() => setAgencyModalOpen(false)}>
                        Close
                    </Button>,
                ]}
                title={
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">{selectedAgencyDetail ? getAgencyIcon(selectedAgencyDetail.code) : null}</span>
                        <div>
                            <Text strong className="block">{selectedAgencyDetail?.code}</Text>
                            <Text className="text-slate-500">{selectedAgencyDetail?.name}</Text>
                        </div>
                    </div>
                }
                width={640}
            >
                {selectedAgencyDetail && (
                    <div className="space-y-4">
                        <Paragraph>
                            {selectedAgencyDetail.description}
                        </Paragraph>

                        <Divider />

                        <div>
                            <Text strong className="block mb-2">
                                <ListChecks className="w-4 h-4 inline mr-1" />
                                PGA Flags for this Agency
                            </Text>
                            <div className="space-y-2">
                                {data?.flagsByAgency?.[selectedAgencyDetail.code]?.map(flag => (
                                    <div 
                                        key={flag.code}
                                        className="p-2 bg-slate-50 rounded hover:bg-slate-100 cursor-pointer transition-colors flex items-center justify-between"
                                        onClick={() => {
                                            setSelectedFlag(flag);
                                            setAgencyModalOpen(false);
                                            setFlagModalOpen(true);
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Tag className="font-mono">{flag.code}</Tag>
                                            <Text>{flag.name.replace(`${flag.agency} - `, '')}</Text>
                                        </div>
                                        <Button type="link" size="small">Details</Button>
                                    </div>
                                )) || (
                                    <Text className="text-slate-500">No flags found for this agency</Text>
                                )}
                            </div>
                        </div>

                        <Alert
                            type="warning"
                            showIcon
                            message="Contact the Agency"
                            description={
                                <div className="text-sm">
                                    <Text>
                                        For specific import requirements, permits, and compliance guidance, 
                                        contact {selectedAgencyDetail.code} directly through their import portal.
                                    </Text>
                                    <div className="mt-2">
                                        <a 
                                            href={selectedAgencyDetail.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                                        >
                                            {selectedAgencyDetail.website.replace('https://', '').replace('http://', '').split('/')[0]}
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};
