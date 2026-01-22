'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Card,
    Input,
    Select,
    Button,
    Table,
    Tag,
    Modal,
    Descriptions,
    Typography,
    Empty,
    Badge,
    Space,
    Tooltip,
    Alert,
    Divider,
    message,
    Tabs,
    Upload,
    Progress,
} from 'antd';
import type { TableProps, UploadProps } from 'antd';
import {
    Search,
    AlertTriangle,
    User,
    Building2,
    Ship,
    Plane,
    HelpCircle,
    Globe,
    Calendar,
    FileText,
    CheckCircle2,
    Shield,
    RefreshCw,
    Copy,
    ExternalLink,
    Filter,
    X,
    Upload as UploadIcon,
    Download,
    FileSpreadsheet,
    Users,
    Check,
    XCircle,
} from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/shared';
import { exportToExcel, type ExcelColumn } from '@/services/exportService';

const { Title, Text, Paragraph } = Typography;

// Country options for filtering
const COUNTRY_OPTIONS = [
    { value: 'RU', label: '🇷🇺 Russia' },
    { value: 'CN', label: '🇨🇳 China' },
    { value: 'IR', label: '🇮🇷 Iran' },
    { value: 'KP', label: '🇰🇵 North Korea' },
    { value: 'CU', label: '🇨🇺 Cuba' },
    { value: 'SY', label: '🇸🇾 Syria' },
    { value: 'VE', label: '🇻🇪 Venezuela' },
    { value: 'BY', label: '🇧🇾 Belarus' },
    { value: 'MM', label: '🇲🇲 Myanmar' },
    { value: 'UA', label: '🇺🇦 Ukraine' },
    { value: 'AE', label: '🇦🇪 UAE' },
    { value: 'PK', label: '🇵🇰 Pakistan' },
    { value: 'IQ', label: '🇮🇶 Iraq' },
    { value: 'AF', label: '🇦🇫 Afghanistan' },
    { value: 'LB', label: '🇱🇧 Lebanon' },
    { value: 'YE', label: '🇾🇪 Yemen' },
    { value: 'SD', label: '🇸🇩 Sudan' },
];

// Entity type options
const ENTITY_TYPE_OPTIONS = [
    { value: 'individual', label: 'Individual', icon: <User size={14} /> },
    { value: 'entity', label: 'Entity/Company', icon: <Building2 size={14} /> },
    { value: 'vessel', label: 'Vessel', icon: <Ship size={14} /> },
    { value: 'aircraft', label: 'Aircraft', icon: <Plane size={14} /> },
];

// Source list display names and colors
const SOURCE_LIST_INFO: Record<string, { name: string; color: string; description: string }> = {
    ofac_sdn: { 
        name: 'OFAC SDN', 
        color: 'red',
        description: 'Office of Foreign Assets Control - Specially Designated Nationals List',
    },
    bis_entity_list: { 
        name: 'BIS Entity List', 
        color: 'orange',
        description: 'Bureau of Industry and Security - Entity List (export restrictions)',
    },
    bis_denied: { 
        name: 'BIS Denied Persons', 
        color: 'volcano',
        description: 'Bureau of Industry and Security - Denied Persons List (export privileges denied)',
    },
    ofac_consolidated: {
        name: 'OFAC Consolidated',
        color: 'magenta',
        description: 'OFAC Consolidated Non-SDN List',
    },
    bis_unverified: {
        name: 'BIS Unverified',
        color: 'gold',
        description: 'BIS Unverified List',
    },
    ddtc_debarred: {
        name: 'DDTC Debarred',
        color: 'purple',
        description: 'State Department ITAR Debarred Parties',
    },
    other: {
        name: 'Other',
        color: 'default',
        description: 'Other restricted party list',
    },
};

// Type for denied party from API
interface DeniedParty {
    id: string;
    name: string;
    aliases: string[];
    entityType: string;
    countryCode: string | null;
    countryName: string | null;
    addresses: string[];
    sourceList: string;
    sourceId: string | null;
    sourcePrograms: string[];
    remarks: string | null;
    federalRegister: string | null;
    isActive: boolean;
    listedDate: string | null;
}

interface SearchMeta {
    lastSyncByList: Record<string, string | null>;
    countsByList: Record<string, number>;
    availableLists: string[];
}

interface SearchResponse {
    success: boolean;
    data?: {
        items: DeniedParty[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
        query?: string;
        filters: {
            sourceList?: string;
            countryCode?: string;
            entityType?: string;
        };
        meta: SearchMeta;
    };
    error?: string;
}

// Batch screening types
interface PartyToScreen {
    rowNumber: number;
    name: string;
    country?: string;
}

interface ScreeningMatch {
    id: string;
    name: string;
    aliases: string[];
    entityType: string;
    countryCode: string | null;
    countryName: string | null;
    sourceList: string;
    sourceId: string | null;
    sourcePrograms: string[];
    remarks: string | null;
    matchScore: number;
    matchType: 'exact' | 'partial' | 'alias';
}

interface ScreeningResult {
    rowNumber: number;
    inputName: string;
    inputCountry?: string;
    status: 'clear' | 'match' | 'potential_match';
    matchCount: number;
    matches: ScreeningMatch[];
}

interface BatchScreeningResponse {
    success: boolean;
    data?: {
        totalScreened: number;
        matchesFound: number;
        clearCount: number;
        potentialMatchCount: number;
        results: ScreeningResult[];
        auditLogId: string;
        screeningDate: string;
        listsSearched: string[];
    };
    error?: string;
}

type BatchStage = 'idle' | 'preview' | 'processing' | 'complete';

export const DeniedPartySearch: React.FC = () => {
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [countryFilter, setCountryFilter] = useState<string | null>(null);
    const [entityTypeFilter, setEntityTypeFilter] = useState<string | null>(null);
    const [sourceListFilter, setSourceListFilter] = useState<string | null>(null);
    
    // Results state
    const [results, setResults] = useState<DeniedParty[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [meta, setMeta] = useState<SearchMeta | null>(null);
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [selectedParty, setSelectedParty] = useState<DeniedParty | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    
    // Batch screening state
    const [activeTab, setActiveTab] = useState<'search' | 'batch'>('search');
    const [batchStage, setBatchStage] = useState<BatchStage>('idle');
    const [partiesToScreen, setPartiesToScreen] = useState<PartyToScreen[]>([]);
    const [batchResults, setBatchResults] = useState<ScreeningResult[]>([]);
    const [batchSummary, setBatchSummary] = useState<{
        totalScreened: number;
        matchesFound: number;
        clearCount: number;
        potentialMatchCount: number;
        auditLogId: string;
        screeningDate: string;
        listsSearched: string[];
    } | null>(null);
    const [batchProgress, setBatchProgress] = useState(0);
    const [selectedBatchResult, setSelectedBatchResult] = useState<ScreeningResult | null>(null);
    const [batchDetailModalOpen, setBatchDetailModalOpen] = useState(false);
    
    // Message API
    const [messageApi, contextHolder] = message.useMessage();
    
    // Debounce timer ref
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Fetch results
    const fetchResults = useCallback(async (
        query: string,
        pageNum: number,
        size: number,
        country?: string | null,
        entityType?: string | null,
        sourceList?: string | null,
    ) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.set('q', query);
            if (country) params.set('countryCode', country);
            if (entityType) params.set('entityType', entityType);
            if (sourceList) params.set('sourceList', sourceList);
            params.set('page', pageNum.toString());
            params.set('pageSize', size.toString());
            
            const response = await fetch(`/api/denied-party?${params.toString()}`);
            const data: SearchResponse = await response.json();
            
            if (data.success && data.data) {
                setResults(data.data.items);
                setTotal(data.data.total);
                setMeta(data.data.meta);
                setHasSearched(true);
            } else {
                throw new Error(data.error || 'Failed to fetch results');
            }
        } catch (error) {
            console.error('Search error:', error);
            messageApi.error('Failed to search denied parties. Please try again.');
            setResults([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    }, [messageApi]);
    
    // Load initial data on mount
    useEffect(() => {
        fetchResults('', 1, pageSize, null, null, null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Handle search with debounce
    const handleSearch = useCallback(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            setPage(1);
            fetchResults(searchQuery, 1, pageSize, countryFilter, entityTypeFilter, sourceListFilter);
        }, 300);
    }, [searchQuery, pageSize, countryFilter, entityTypeFilter, sourceListFilter, fetchResults]);
    
    // Handle search button click
    const handleSearchClick = () => {
        setPage(1);
        fetchResults(searchQuery, 1, pageSize, countryFilter, entityTypeFilter, sourceListFilter);
    };
    
    // Handle filter changes
    const handleFilterChange = (
        country: string | null,
        entityType: string | null,
        sourceList: string | null,
    ) => {
        setCountryFilter(country);
        setEntityTypeFilter(entityType);
        setSourceListFilter(sourceList);
        setPage(1);
        fetchResults(searchQuery, 1, pageSize, country, entityType, sourceList);
    };
    
    // Handle pagination change
    const handleTableChange: TableProps<DeniedParty>['onChange'] = (pagination) => {
        const newPage = pagination.current || 1;
        const newPageSize = pagination.pageSize || 25;
        setPage(newPage);
        setPageSize(newPageSize);
        fetchResults(searchQuery, newPage, newPageSize, countryFilter, entityTypeFilter, sourceListFilter);
    };
    
    // Clear all filters
    const clearFilters = () => {
        setSearchQuery('');
        setCountryFilter(null);
        setEntityTypeFilter(null);
        setSourceListFilter(null);
        setPage(1);
        fetchResults('', 1, pageSize, null, null, null);
    };
    
    // View party details
    const viewDetails = (party: DeniedParty) => {
        setSelectedParty(party);
        setDetailModalOpen(true);
    };
    
    // Copy to clipboard
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        messageApi.success(`${label} copied to clipboard`);
    };
    
    // Get entity type icon
    const getEntityTypeIcon = (type: string) => {
        switch (type) {
            case 'individual': return <User size={14} className="text-blue-600" />;
            case 'entity': return <Building2 size={14} className="text-purple-600" />;
            case 'vessel': return <Ship size={14} className="text-cyan-600" />;
            case 'aircraft': return <Plane size={14} className="text-orange-600" />;
            default: return <HelpCircle size={14} className="text-slate-400" />;
        }
    };
    
    // Format date
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        } catch {
            return dateStr;
        }
    };
    
    // Get active filter count
    const activeFilterCount = [countryFilter, entityTypeFilter, sourceListFilter].filter(Boolean).length;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH SCREENING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Download CSV template
    const downloadTemplate = () => {
        const template = `name,country
"Acme Corporation",US
"John Smith",
"Global Trading LLC",CN
"Jane Doe",RU
"Test Company Inc",`;
        const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'denied_party_screening_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Parse CSV file
    const parseCSV = (csvText: string): PartyToScreen[] => {
        const lines = csvText.trim().split('\n');
        const parties: PartyToScreen[] = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Parse CSV line (handle quoted values)
            const values: string[] = [];
            let current = '';
            let inQuotes = false;
            
            for (const char of line) {
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            
            const name = values[0]?.replace(/^"|"$/g, '').trim();
            const country = values[1]?.replace(/^"|"$/g, '').trim();
            
            if (name) {
                parties.push({
                    rowNumber: i,
                    name,
                    country: country || undefined,
                });
            }
        }
        
        return parties;
    };
    
    // Handle file upload
    const handleFileUpload: UploadProps['beforeUpload'] = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const parties = parseCSV(text);
            
            if (parties.length === 0) {
                messageApi.error('No valid party names found in CSV');
                return;
            }
            
            if (parties.length > 1000) {
                messageApi.warning('Only first 1000 parties will be processed');
                setPartiesToScreen(parties.slice(0, 1000));
            } else {
                setPartiesToScreen(parties);
            }
            
            setBatchStage('preview');
        };
        reader.readAsText(file);
        return false; // Prevent default upload
    };
    
    // Process batch screening
    const processBatchScreening = async () => {
        setBatchStage('processing');
        setBatchProgress(0);
        
        try {
            // Simulate progress (actual API call is atomic)
            const progressInterval = setInterval(() => {
                setBatchProgress(prev => Math.min(prev + 10, 90));
            }, 200);
            
            const response = await fetch('/api/denied-party/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parties: partiesToScreen }),
            });
            
            clearInterval(progressInterval);
            setBatchProgress(100);
            
            const data: BatchScreeningResponse = await response.json();
            
            if (data.success && data.data) {
                setBatchResults(data.data.results);
                setBatchSummary({
                    totalScreened: data.data.totalScreened,
                    matchesFound: data.data.matchesFound,
                    clearCount: data.data.clearCount,
                    potentialMatchCount: data.data.potentialMatchCount,
                    auditLogId: data.data.auditLogId,
                    screeningDate: data.data.screeningDate,
                    listsSearched: data.data.listsSearched,
                });
                setBatchStage('complete');
                messageApi.success(`Screened ${data.data.totalScreened} parties successfully`);
            } else {
                throw new Error(data.error || 'Batch screening failed');
            }
        } catch (error) {
            console.error('Batch screening error:', error);
            messageApi.error('Failed to process batch screening. Please try again.');
            setBatchStage('preview');
        }
    };
    
    // Export batch results to Excel
    const exportBatchResults = () => {
        if (batchResults.length === 0) return;
        
        const exportData = batchResults.map(result => ({
            rowNumber: result.rowNumber,
            inputName: result.inputName,
            inputCountry: result.inputCountry || '',
            status: result.status === 'match' ? 'MATCH' : 
                    result.status === 'potential_match' ? 'POTENTIAL MATCH' : 'CLEAR',
            matchCount: result.matchCount,
            topMatchName: result.matches[0]?.name || '',
            topMatchScore: result.matches[0]?.matchScore || '',
            topMatchList: result.matches[0]?.sourceList || '',
            topMatchCountry: result.matches[0]?.countryName || '',
            allMatchNames: result.matches.map(m => m.name).join('; '),
            allMatchLists: result.matches.map(m => SOURCE_LIST_INFO[m.sourceList]?.name || m.sourceList).join('; '),
        }));
        
        const columns: ExcelColumn[] = [
            { key: 'rowNumber', header: 'Row #', width: 8 },
            { key: 'inputName', header: 'Screened Name', width: 30 },
            { key: 'inputCountry', header: 'Country Filter', width: 12 },
            { key: 'status', header: 'Status', width: 15 },
            { key: 'matchCount', header: '# Matches', width: 10 },
            { key: 'topMatchName', header: 'Top Match Name', width: 30 },
            { key: 'topMatchScore', header: 'Match Score', width: 12 },
            { key: 'topMatchList', header: 'Source List', width: 20 },
            { key: 'topMatchCountry', header: 'Match Country', width: 15 },
            { key: 'allMatchNames', header: 'All Match Names', width: 50 },
            { key: 'allMatchLists', header: 'All Source Lists', width: 30 },
        ];
        
        exportToExcel(exportData, columns, {
            filename: 'denied_party_screening_results',
            sheetName: 'Screening Results',
        });
        
        messageApi.success('Results exported to Excel');
    };
    
    // Reset batch screening
    const resetBatchScreening = () => {
        setBatchStage('idle');
        setPartiesToScreen([]);
        setBatchResults([]);
        setBatchSummary(null);
        setBatchProgress(0);
    };
    
    // View batch result details
    const viewBatchResultDetails = (result: ScreeningResult) => {
        setSelectedBatchResult(result);
        setBatchDetailModalOpen(true);
    };
    
    // Table columns
    const columns: TableProps<DeniedParty>['columns'] = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            width: 280,
            render: (name: string, record) => (
                <div>
                    <div className="flex items-center gap-2">
                        {getEntityTypeIcon(record.entityType)}
                        <span 
                            className="font-medium text-slate-900 cursor-pointer hover:text-teal-600"
                            onClick={() => viewDetails(record)}
                        >
                            {name}
                        </span>
                    </div>
                    {record.aliases.length > 0 && (
                        <Tooltip title={`Also known as: ${record.aliases.slice(0, 5).join(', ')}${record.aliases.length > 5 ? ` (+${record.aliases.length - 5} more)` : ''}`}>
                            <span className="text-xs text-slate-500">
                                +{record.aliases.length} alias{record.aliases.length > 1 ? 'es' : ''}
                            </span>
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: 'Source List',
            dataIndex: 'sourceList',
            key: 'sourceList',
            width: 150,
            render: (sourceList: string) => {
                const info = SOURCE_LIST_INFO[sourceList] || SOURCE_LIST_INFO.other;
                return (
                    <Tooltip title={info.description}>
                        <Tag color={info.color}>{info.name}</Tag>
                    </Tooltip>
                );
            },
        },
        {
            title: 'Country',
            dataIndex: 'countryName',
            key: 'country',
            width: 140,
            render: (countryName: string | null, record) => (
                countryName ? (
                    <span className="text-slate-700">
                        {record.countryCode && <span className="mr-1">{getCountryFlag(record.countryCode)}</span>}
                        {countryName}
                    </span>
                ) : (
                    <span className="text-slate-400">—</span>
                )
            ),
        },
        {
            title: 'Type',
            dataIndex: 'entityType',
            key: 'entityType',
            width: 100,
            render: (entityType: string) => (
                <span className="capitalize text-slate-600">{entityType}</span>
            ),
        },
        {
            title: 'Programs',
            dataIndex: 'sourcePrograms',
            key: 'programs',
            width: 150,
            render: (programs: string[]) => (
                programs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {programs.slice(0, 2).map((prog, idx) => (
                            <Tag key={idx} className="text-xs">{prog}</Tag>
                        ))}
                        {programs.length > 2 && (
                            <Tooltip title={programs.slice(2).join(', ')}>
                                <Tag className="text-xs">+{programs.length - 2}</Tag>
                            </Tooltip>
                        )}
                    </div>
                ) : (
                    <span className="text-slate-400">—</span>
                )
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (_, record) => (
                <Button 
                    type="link" 
                    size="small"
                    onClick={() => viewDetails(record)}
                >
                    Details
                </Button>
            ),
        },
    ];
    
    // Get country flag emoji
    const getCountryFlag = (code: string) => {
        try {
            return code
                .toUpperCase()
                .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
        } catch {
            return '';
        }
    };
    
    // Batch results table columns
    const batchColumns: TableProps<ScreeningResult>['columns'] = [
        {
            title: 'Row',
            dataIndex: 'rowNumber',
            key: 'rowNumber',
            width: 60,
        },
        {
            title: 'Screened Name',
            dataIndex: 'inputName',
            key: 'inputName',
            width: 220,
            render: (name: string, record) => (
                <div>
                    <span className="font-medium">{name}</span>
                    {record.inputCountry && (
                        <div className="text-xs text-slate-500 mt-0.5">
                            Filter: {getCountryFlag(record.inputCountry)} {record.inputCountry}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 140,
            render: (status: string) => {
                if (status === 'match') {
                    return (
                        <Tag color="red" icon={<XCircle size={12} className="mr-1" />}>
                            MATCH
                        </Tag>
                    );
                } else if (status === 'potential_match') {
                    return (
                        <Tag color="orange" icon={<AlertTriangle size={12} className="mr-1" />}>
                            POTENTIAL
                        </Tag>
                    );
                } else {
                    return (
                        <Tag color="green" icon={<Check size={12} className="mr-1" />}>
                            CLEAR
                        </Tag>
                    );
                }
            },
        },
        {
            title: 'Matches',
            dataIndex: 'matchCount',
            key: 'matchCount',
            width: 80,
            render: (count: number) => (
                count > 0 ? (
                    <Badge count={count} style={{ backgroundColor: '#ef4444' }} />
                ) : (
                    <span className="text-green-600">0</span>
                )
            ),
        },
        {
            title: 'Top Match',
            key: 'topMatch',
            width: 220,
            render: (_, record) => {
                if (record.matches.length === 0) {
                    return <span className="text-slate-400">—</span>;
                }
                const topMatch = record.matches[0];
                const listInfo = SOURCE_LIST_INFO[topMatch.sourceList] || SOURCE_LIST_INFO.other;
                return (
                    <div>
                        <div className="font-medium text-slate-800 truncate max-w-[200px]">
                            {topMatch.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Tag color={listInfo.color} className="text-xs !m-0">
                                {listInfo.name}
                            </Tag>
                            <span className="text-xs text-slate-500">
                                Score: {topMatch.matchScore}%
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Action',
            key: 'action',
            width: 90,
            render: (_, record) => (
                <Button 
                    type="link" 
                    size="small"
                    onClick={() => viewBatchResultDetails(record)}
                    disabled={record.matches.length === 0}
                >
                    {record.matches.length > 0 ? 'Details' : '—'}
                </Button>
            ),
        },
    ];
    
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {contextHolder}
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Title level={4} className="!mb-1">
                        <Shield className="inline-block mr-2 text-red-600" size={24} />
                        Denied Party Screening
                    </Title>
                    <Text type="secondary">
                        Search OFAC SDN, BIS Entity List, and other restricted party lists
                    </Text>
                </div>
                
                {/* List counts summary */}
                {meta && (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(meta.countsByList).map(([list, count]) => {
                            const info = SOURCE_LIST_INFO[list] || SOURCE_LIST_INFO.other;
                            return (
                                <Tooltip key={list} title={`${info.description}`}>
                                    <Tag color={info.color} className="text-xs">
                                        {info.name}: {count.toLocaleString()}
                                    </Tag>
                                </Tooltip>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {/* Tabs for Single Search and Batch Screening */}
            <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as 'search' | 'batch')}
                items={[
                    {
                        key: 'search',
                        label: (
                            <span className="flex items-center gap-2">
                                <Search size={16} />
                                Single Search
                            </span>
                        ),
                        children: (
                            <div className="space-y-6">
                                {/* Search Card */}
                                <Card className="shadow-sm">
                                    <div className="space-y-4">
                                        {/* Search Input Row */}
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Input
                                                placeholder="Search by name, company, or alias..."
                                                prefix={<Search size={16} className="text-slate-400" />}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onPressEnter={handleSearchClick}
                                                allowClear
                                                className="flex-1"
                                                size="large"
                                            />
                                            <Button 
                                                type="primary"
                                                size="large"
                                                icon={<Search size={16} />}
                                                onClick={handleSearchClick}
                                                loading={isLoading}
                                                className="bg-teal-600 hover:bg-teal-700"
                                            >
                                                Search
                                            </Button>
                                        </div>
                                        
                                        {/* Filters Row */}
                                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                            <div className="flex items-center gap-2 text-slate-600">
                                                <Filter size={16} />
                                                <span className="text-sm font-medium">Filters:</span>
                                            </div>
                                            
                                            <Select
                                                placeholder="Source List"
                                                value={sourceListFilter}
                                                onChange={(val) => handleFilterChange(countryFilter, entityTypeFilter, val)}
                                                allowClear
                                                className="w-full sm:w-48"
                                                options={[
                                                    { value: 'ofac_sdn', label: 'OFAC SDN' },
                                                    { value: 'bis_entity_list', label: 'BIS Entity List' },
                                                    { value: 'bis_denied', label: 'BIS Denied Persons' },
                                                ]}
                                            />
                                            
                                            <Select
                                                placeholder="Country"
                                                value={countryFilter}
                                                onChange={(val) => handleFilterChange(val, entityTypeFilter, sourceListFilter)}
                                                allowClear
                                                showSearch
                                                optionFilterProp="label"
                                                className="w-full sm:w-44"
                                                options={COUNTRY_OPTIONS}
                                            />
                                            
                                            <Select
                                                placeholder="Entity Type"
                                                value={entityTypeFilter}
                                                onChange={(val) => handleFilterChange(countryFilter, val, sourceListFilter)}
                                                allowClear
                                                className="w-full sm:w-40"
                                                options={ENTITY_TYPE_OPTIONS}
                                            />
                                            
                                            {activeFilterCount > 0 && (
                                                <Button 
                                                    type="text" 
                                                    size="small"
                                                    icon={<X size={14} />}
                                                    onClick={clearFilters}
                                                    className="text-slate-500"
                                                >
                                                    Clear ({activeFilterCount})
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                                
                                {/* Results Section */}
                                <Card className="shadow-sm">
                                    {isLoading ? (
                                        <LoadingState message="Searching denied party lists..." />
                                    ) : !hasSearched ? (
                                        <EmptyState
                                            icon="search"
                                            title="Search Denied Party Lists"
                                            description="Enter a name, company, or alias to search across OFAC, BIS, and other restricted party lists"
                                        />
                                    ) : results.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <CheckCircle2 className="mx-auto mb-4 text-green-500" size={48} />
                                            <Title level={4} className="!text-green-700 !mb-2">No Matches Found</Title>
                                            <Paragraph type="secondary" className="max-w-md mx-auto">
                                                {searchQuery ? (
                                                    <>No entries matching &quot;{searchQuery}&quot; were found in the denied party lists searched.</>
                                                ) : (
                                                    <>No entries found with the current filters.</>
                                                )}
                                            </Paragraph>
                                            
                                            {/* Lists searched info */}
                                            <div className="mt-6 p-4 bg-slate-50 rounded-lg max-w-md mx-auto">
                                                <div className="text-sm text-slate-600 font-medium mb-2">Lists Searched:</div>
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    {meta?.availableLists.map((list) => {
                                                        const info = SOURCE_LIST_INFO[list] || SOURCE_LIST_INFO.other;
                                                        return (
                                                            <Tag key={list} color={info.color}>
                                                                {info.name}
                                                            </Tag>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Results header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                                                <div className="flex items-center gap-2">
                                                    <AlertTriangle className="text-amber-500" size={20} />
                                                    <Text strong>
                                                        {total.toLocaleString()} {total === 1 ? 'match' : 'matches'} found
                                                    </Text>
                                                    {searchQuery && (
                                                        <Text type="secondary">
                                                            for &quot;{searchQuery}&quot;
                                                        </Text>
                                                    )}
                                                </div>
                                                
                                                <Text type="secondary" className="text-xs">
                                                    Results from: {meta?.availableLists.map(l => SOURCE_LIST_INFO[l]?.name || l).join(', ')}
                                                </Text>
                                            </div>
                                            
                                            {/* Warning banner */}
                                            <Alert
                                                type="warning"
                                                showIcon
                                                icon={<AlertTriangle size={16} />}
                                                message="Potential Match Alert"
                                                description="These results indicate potential matches with restricted party lists. Conduct additional due diligence before engaging in any transactions."
                                                className="mb-4"
                                            />
                                            
                                            {/* Results table */}
                                            <Table
                                                columns={columns}
                                                dataSource={results}
                                                rowKey="id"
                                                pagination={{
                                                    current: page,
                                                    pageSize: pageSize,
                                                    total: total,
                                                    showSizeChanger: true,
                                                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                                                    pageSizeOptions: ['25', '50', '100'],
                                                    responsive: true,
                                                }}
                                                onChange={handleTableChange}
                                                scroll={{ x: 800 }}
                                                className="denied-party-table"
                                            />
                                        </>
                                    )}
                                </Card>
                            </div>
                        ),
                    },
                    {
                        key: 'batch',
                        label: (
                            <span className="flex items-center gap-2">
                                <Users size={16} />
                                Batch Screening
                            </span>
                        ),
                        children: (
                            <div className="space-y-6">
                                <Card className="shadow-sm">
                                    {batchStage === 'idle' && (
                                        <div className="space-y-6">
                                            {/* Instructions */}
                                            <Alert
                                                type="info"
                                                message="Upload a CSV file with party names to screen"
                                                description="Screen multiple parties at once against OFAC SDN, BIS Entity List, and other restricted party lists. Maximum 1000 parties per batch."
                                                showIcon
                                            />
                                            
                                            {/* Template download */}
                                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-slate-50 rounded-lg">
                                                <div>
                                                    <Text strong className="block mb-1">CSV Template</Text>
                                                    <Text type="secondary" className="text-sm">
                                                        Download the template with required columns: name, country (optional)
                                                    </Text>
                                                </div>
                                                <Button 
                                                    icon={<Download size={16} />}
                                                    onClick={downloadTemplate}
                                                >
                                                    Download Template
                                                </Button>
                                            </div>
                                            
                                            {/* Upload area */}
                                            <Upload.Dragger
                                                accept=".csv"
                                                beforeUpload={handleFileUpload}
                                                showUploadList={false}
                                            >
                                                <p className="ant-upload-drag-icon">
                                                    <UploadIcon size={48} className="mx-auto text-slate-400" />
                                                </p>
                                                <p className="ant-upload-text">
                                                    Click or drag CSV file to upload
                                                </p>
                                                <p className="ant-upload-hint">
                                                    Supports single CSV file with party names. Maximum 1000 parties.
                                                </p>
                                            </Upload.Dragger>
                                        </div>
                                    )}
                                    
                                    {batchStage === 'preview' && (
                                        <div className="space-y-4">
                                            {/* Preview header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div>
                                                    <Title level={5} className="!mb-1">
                                                        <FileSpreadsheet className="inline mr-2" size={20} />
                                                        Preview: {partiesToScreen.length} parties to screen
                                                    </Title>
                                                    <Text type="secondary" className="text-sm">
                                                        Review the first 5 rows before processing
                                                    </Text>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button onClick={resetBatchScreening}>
                                                        Cancel
                                                    </Button>
                                                    <Button 
                                                        type="primary"
                                                        icon={<Shield size={16} />}
                                                        onClick={processBatchScreening}
                                                        className="bg-teal-600 hover:bg-teal-700"
                                                    >
                                                        Start Screening
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            {/* Preview table */}
                                            <Table
                                                columns={[
                                                    { title: 'Row', dataIndex: 'rowNumber', key: 'rowNumber', width: 60 },
                                                    { title: 'Name', dataIndex: 'name', key: 'name' },
                                                    { title: 'Country Filter', dataIndex: 'country', key: 'country', render: (c: string) => c || '—' },
                                                ]}
                                                dataSource={partiesToScreen.slice(0, 5)}
                                                rowKey="rowNumber"
                                                pagination={false}
                                                size="small"
                                            />
                                            
                                            {partiesToScreen.length > 5 && (
                                                <Text type="secondary" className="text-sm">
                                                    ...and {partiesToScreen.length - 5} more parties
                                                </Text>
                                            )}
                                        </div>
                                    )}
                                    
                                    {batchStage === 'processing' && (
                                        <div className="py-12 text-center">
                                            <Progress
                                                type="circle"
                                                percent={batchProgress}
                                                status="active"
                                                strokeColor="#14b8a6"
                                            />
                                            <div className="mt-6">
                                                <Title level={4} className="!mb-2">Screening in Progress</Title>
                                                <Text type="secondary">
                                                    Processing {partiesToScreen.length} parties against all denied party lists...
                                                </Text>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {batchStage === 'complete' && batchSummary && (
                                        <div className="space-y-6">
                                            {/* Summary header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                <div>
                                                    <Title level={5} className="!mb-1">
                                                        <CheckCircle2 className="inline mr-2 text-green-600" size={20} />
                                                        Screening Complete
                                                    </Title>
                                                    <Text type="secondary" className="text-sm">
                                                        Screened {batchSummary.totalScreened} parties on {new Date(batchSummary.screeningDate).toLocaleString()}
                                                    </Text>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button onClick={resetBatchScreening}>
                                                        New Screening
                                                    </Button>
                                                    <Button 
                                                        type="primary"
                                                        icon={<FileSpreadsheet size={16} />}
                                                        onClick={exportBatchResults}
                                                    >
                                                        Export to Excel
                                                    </Button>
                                                </div>
                                            </div>
                                            
                                            {/* Summary stats */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="p-4 bg-slate-50 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-slate-700">
                                                        {batchSummary.totalScreened}
                                                    </div>
                                                    <div className="text-sm text-slate-500">Total Screened</div>
                                                </div>
                                                <div className="p-4 bg-red-50 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-red-600">
                                                        {batchSummary.matchesFound}
                                                    </div>
                                                    <div className="text-sm text-red-600">Matches</div>
                                                </div>
                                                <div className="p-4 bg-amber-50 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-amber-600">
                                                        {batchSummary.potentialMatchCount}
                                                    </div>
                                                    <div className="text-sm text-amber-600">Potential</div>
                                                </div>
                                                <div className="p-4 bg-green-50 rounded-lg text-center">
                                                    <div className="text-2xl font-bold text-green-600">
                                                        {batchSummary.clearCount}
                                                    </div>
                                                    <div className="text-sm text-green-600">Clear</div>
                                                </div>
                                            </div>
                                            
                                            {/* Warning if matches found */}
                                            {(batchSummary.matchesFound > 0 || batchSummary.potentialMatchCount > 0) && (
                                                <Alert
                                                    type="warning"
                                                    showIcon
                                                    icon={<AlertTriangle size={16} />}
                                                    message={`${batchSummary.matchesFound} match${batchSummary.matchesFound !== 1 ? 'es' : ''} and ${batchSummary.potentialMatchCount} potential match${batchSummary.potentialMatchCount !== 1 ? 'es' : ''} found`}
                                                    description="Review the results below and conduct additional due diligence before engaging in any transactions with matched parties."
                                                />
                                            )}
                                            
                                            {/* Audit log reference */}
                                            <div className="text-xs text-slate-500 flex items-center gap-2">
                                                <FileText size={12} />
                                                Audit Log ID: <code className="bg-slate-100 px-2 py-0.5 rounded">{batchSummary.auditLogId}</code>
                                            </div>
                                            
                                            {/* Results table */}
                                            <Divider />
                                            <Table
                                                columns={batchColumns}
                                                dataSource={batchResults}
                                                rowKey="rowNumber"
                                                pagination={{
                                                    pageSize: 25,
                                                    showSizeChanger: true,
                                                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
                                                    pageSizeOptions: ['25', '50', '100'],
                                                }}
                                                scroll={{ x: 800 }}
                                                rowClassName={(record) => 
                                                    record.status === 'match' ? 'bg-red-50' : 
                                                    record.status === 'potential_match' ? 'bg-amber-50' : ''
                                                }
                                            />
                                        </div>
                                    )}
                                </Card>
                            </div>
                        ),
                    },
                ]}
            />
            
            {/* Last sync info */}
            {meta && Object.keys(meta.lastSyncByList).length > 0 && (
                <div className="text-xs text-slate-500 text-center">
                    Last sync: {Object.entries(meta.lastSyncByList)
                        .filter(([, date]) => date)
                        .map(([list, date]) => `${SOURCE_LIST_INFO[list]?.name || list} (${formatDate(date)})`)
                        .join(' • ')
                    }
                </div>
            )}
            
            {/* Detail Modal (Single Search) */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        {selectedParty && getEntityTypeIcon(selectedParty.entityType)}
                        <span>Party Details</span>
                    </div>
                }
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setDetailModalOpen(false)}>
                        Close
                    </Button>,
                    <Button
                        key="copy"
                        type="primary"
                        icon={<Copy size={14} />}
                        onClick={() => selectedParty && copyToClipboard(selectedParty.name, 'Name')}
                    >
                        Copy Name
                    </Button>,
                ]}
                width={700}
            >
                {selectedParty && (
                    <div className="space-y-6">
                        {/* Warning badge */}
                        <Alert
                            type="error"
                            showIcon
                            icon={<AlertTriangle size={16} />}
                            message="This party appears on a restricted party list"
                            description={SOURCE_LIST_INFO[selectedParty.sourceList]?.description || 'Restricted party list'}
                        />
                        
                        {/* Basic info */}
                        <Descriptions column={1} bordered size="small">
                            <Descriptions.Item label="Name">
                                <span className="font-semibold">{selectedParty.name}</span>
                            </Descriptions.Item>
                            
                            {selectedParty.aliases.length > 0 && (
                                <Descriptions.Item label="Aliases">
                                    <div className="flex flex-wrap gap-1">
                                        {selectedParty.aliases.map((alias, idx) => (
                                            <Tag key={idx}>{alias}</Tag>
                                        ))}
                                    </div>
                                </Descriptions.Item>
                            )}
                            
                            <Descriptions.Item label="Entity Type">
                                <div className="flex items-center gap-2">
                                    {getEntityTypeIcon(selectedParty.entityType)}
                                    <span className="capitalize">{selectedParty.entityType}</span>
                                </div>
                            </Descriptions.Item>
                            
                            <Descriptions.Item label="Source List">
                                <Tag color={SOURCE_LIST_INFO[selectedParty.sourceList]?.color || 'default'}>
                                    {SOURCE_LIST_INFO[selectedParty.sourceList]?.name || selectedParty.sourceList}
                                </Tag>
                            </Descriptions.Item>
                            
                            {selectedParty.countryName && (
                                <Descriptions.Item label="Country">
                                    {selectedParty.countryCode && (
                                        <span className="mr-2">{getCountryFlag(selectedParty.countryCode)}</span>
                                    )}
                                    {selectedParty.countryName}
                                </Descriptions.Item>
                            )}
                            
                            {selectedParty.sourceId && (
                                <Descriptions.Item label="Source ID">
                                    <code className="bg-slate-100 px-2 py-0.5 rounded text-sm">
                                        {selectedParty.sourceId}
                                    </code>
                                </Descriptions.Item>
                            )}
                        </Descriptions>
                        
                        {/* Programs */}
                        {selectedParty.sourcePrograms.length > 0 && (
                            <div>
                                <Text strong className="block mb-2">Sanction Programs:</Text>
                                <div className="flex flex-wrap gap-2">
                                    {selectedParty.sourcePrograms.map((program, idx) => (
                                        <Tag key={idx} color="red">{program}</Tag>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Addresses */}
                        {selectedParty.addresses.length > 0 && (
                            <div>
                                <Text strong className="block mb-2">
                                    <Globe size={14} className="inline mr-2" />
                                    Known Addresses:
                                </Text>
                                <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                                    {selectedParty.addresses.map((addr, idx) => (
                                        <li key={idx}>{addr}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {/* Remarks */}
                        {selectedParty.remarks && (
                            <div>
                                <Text strong className="block mb-2">
                                    <FileText size={14} className="inline mr-2" />
                                    Remarks:
                                </Text>
                                <Paragraph className="text-sm text-slate-600 bg-slate-50 p-3 rounded">
                                    {selectedParty.remarks}
                                </Paragraph>
                            </div>
                        )}
                        
                        {/* Listed date and Federal Register */}
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            {selectedParty.listedDate && (
                                <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    Listed: {formatDate(selectedParty.listedDate)}
                                </div>
                            )}
                            {selectedParty.federalRegister && (
                                <div className="flex items-center gap-1">
                                    <FileText size={14} />
                                    Federal Register: {selectedParty.federalRegister}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Batch Result Detail Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Users size={20} />
                        <span>Screening Result Details</span>
                    </div>
                }
                open={batchDetailModalOpen}
                onCancel={() => setBatchDetailModalOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setBatchDetailModalOpen(false)}>
                        Close
                    </Button>,
                ]}
                width={800}
            >
                {selectedBatchResult && (
                    <div className="space-y-6">
                        {/* Screened party info */}
                        <div className="p-4 bg-slate-50 rounded-lg">
                            <Text type="secondary" className="text-xs block mb-1">Screened Party</Text>
                            <Text strong className="text-lg">{selectedBatchResult.inputName}</Text>
                            {selectedBatchResult.inputCountry && (
                                <div className="mt-1">
                                    <Tag>Country Filter: {getCountryFlag(selectedBatchResult.inputCountry)} {selectedBatchResult.inputCountry}</Tag>
                                </div>
                            )}
                        </div>
                        
                        {/* Status badge */}
                        {selectedBatchResult.status === 'match' ? (
                            <Alert
                                type="error"
                                showIcon
                                icon={<XCircle size={16} />}
                                message={`${selectedBatchResult.matchCount} match${selectedBatchResult.matchCount !== 1 ? 'es' : ''} found`}
                                description="This party has been identified on one or more restricted party lists. Do not proceed with transactions until cleared by your compliance team."
                            />
                        ) : selectedBatchResult.status === 'potential_match' ? (
                            <Alert
                                type="warning"
                                showIcon
                                icon={<AlertTriangle size={16} />}
                                message={`${selectedBatchResult.matchCount} potential match${selectedBatchResult.matchCount !== 1 ? 'es' : ''} found`}
                                description="This party may match entries on restricted party lists. Review the matches below and conduct additional due diligence."
                            />
                        ) : (
                            <Alert
                                type="success"
                                showIcon
                                icon={<CheckCircle2 size={16} />}
                                message="No matches found"
                                description="This party was not found on any of the screened restricted party lists."
                            />
                        )}
                        
                        {/* Matches list */}
                        {selectedBatchResult.matches.length > 0 && (
                            <div className="space-y-4">
                                <Text strong>Match Details:</Text>
                                {selectedBatchResult.matches.map((match, idx) => {
                                    const listInfo = SOURCE_LIST_INFO[match.sourceList] || SOURCE_LIST_INFO.other;
                                    return (
                                        <div key={idx} className="p-4 border rounded-lg">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {getEntityTypeIcon(match.entityType)}
                                                        <Text strong>{match.name}</Text>
                                                        <Tag color={listInfo.color}>{listInfo.name}</Tag>
                                                    </div>
                                                    
                                                    {match.aliases.length > 0 && (
                                                        <div className="text-sm text-slate-600 mb-2">
                                                            <span className="font-medium">Aliases: </span>
                                                            {match.aliases.slice(0, 3).join(', ')}
                                                            {match.aliases.length > 3 && ` (+${match.aliases.length - 3} more)`}
                                                        </div>
                                                    )}
                                                    
                                                    {match.countryName && (
                                                        <div className="text-sm text-slate-600 mb-2">
                                                            <span className="font-medium">Country: </span>
                                                            {match.countryCode && getCountryFlag(match.countryCode)} {match.countryName}
                                                        </div>
                                                    )}
                                                    
                                                    {match.sourcePrograms.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {match.sourcePrograms.slice(0, 4).map((prog, i) => (
                                                                <Tag key={i} color="red" className="text-xs">{prog}</Tag>
                                                            ))}
                                                            {match.sourcePrograms.length > 4 && (
                                                                <Tag className="text-xs">+{match.sourcePrograms.length - 4} more</Tag>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="text-right">
                                                    <div className={`text-lg font-bold ${
                                                        match.matchScore >= 90 ? 'text-red-600' :
                                                        match.matchScore >= 70 ? 'text-amber-600' : 'text-slate-600'
                                                    }`}>
                                                        {match.matchScore}%
                                                    </div>
                                                    <div className="text-xs text-slate-500">Match Score</div>
                                                    <Tag className="mt-1 text-xs">
                                                        {match.matchType === 'exact' ? 'Exact' :
                                                         match.matchType === 'alias' ? 'Alias' : 'Partial'}
                                                    </Tag>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};
