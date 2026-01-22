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
    Badge,
    message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    Search,
    FileText,
    ExternalLink,
    Info,
    CheckCircle,
    XCircle,
    Percent,
    ArrowRightLeft,
    Globe,
    BookOpen,
    Scale,
    Copy,
    RefreshCw,
} from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/shared';
import type { FtaRule, FtaAgreement } from '@/data/ftaRules';
import {
    getTariffShiftDescription,
    getRvcMethodDescription,
} from '@/data/ftaRules';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// Country options for FTA filtering
const FTA_COUNTRY_OPTIONS = [
    { value: 'MX', label: '🇲🇽 Mexico', flag: '🇲🇽', fta: 'USMCA' },
    { value: 'CA', label: '🇨🇦 Canada', flag: '🇨🇦', fta: 'USMCA' },
    { value: 'KR', label: '🇰🇷 South Korea', flag: '🇰🇷', fta: 'KORUS' },
    { value: 'AU', label: '🇦🇺 Australia', flag: '🇦🇺', fta: 'AUSFTA' },
    { value: 'SG', label: '🇸🇬 Singapore', flag: '🇸🇬', fta: 'SFTA' },
    { value: 'CL', label: '🇨🇱 Chile', flag: '🇨🇱', fta: 'CIFTA' },
    { value: 'CO', label: '🇨🇴 Colombia', flag: '🇨🇴', fta: 'CTPA' },
    { value: 'PE', label: '🇵🇪 Peru', flag: '🇵🇪', fta: 'PTPA' },
    { value: 'PA', label: '🇵🇦 Panama', flag: '🇵🇦', fta: 'PTPA' },
    { value: 'CR', label: '🇨🇷 Costa Rica', flag: '🇨🇷', fta: 'CAFTA-DR' },
    { value: 'DO', label: '🇩🇴 Dominican Republic', flag: '🇩🇴', fta: 'CAFTA-DR' },
    { value: 'SV', label: '🇸🇻 El Salvador', flag: '🇸🇻', fta: 'CAFTA-DR' },
    { value: 'GT', label: '🇬🇹 Guatemala', flag: '🇬🇹', fta: 'CAFTA-DR' },
    { value: 'HN', label: '🇭🇳 Honduras', flag: '🇭🇳', fta: 'CAFTA-DR' },
    { value: 'NI', label: '🇳🇮 Nicaragua', flag: '🇳🇮', fta: 'CAFTA-DR' },
    { value: 'MA', label: '🇲🇦 Morocco', flag: '🇲🇦', fta: 'MFTA' },
    { value: 'JO', label: '🇯🇴 Jordan', flag: '🇯🇴', fta: 'JFTA' },
    { value: 'BH', label: '🇧🇭 Bahrain', flag: '🇧🇭', fta: 'BFTA' },
    { value: 'OM', label: '🇴🇲 Oman', flag: '🇴🇲', fta: 'OFTA' },
    { value: 'IL', label: '🇮🇱 Israel', flag: '🇮🇱', fta: 'ILFTA' },
];

// FTA options for filtering
const FTA_OPTIONS = [
    { value: 'USMCA', label: 'USMCA (Mexico, Canada)' },
    { value: 'KORUS', label: 'Korea FTA' },
    { value: 'AUSFTA', label: 'Australia FTA' },
    { value: 'SFTA', label: 'Singapore FTA' },
    { value: 'CAFTA-DR', label: 'CAFTA-DR' },
    { value: 'CIFTA', label: 'Chile FTA' },
    { value: 'CTPA', label: 'Colombia TPA' },
    { value: 'PTPA', label: 'Peru TPA' },
    { value: 'MFTA', label: 'Morocco FTA' },
    { value: 'JFTA', label: 'Jordan FTA' },
    { value: 'BFTA', label: 'Bahrain FTA' },
    { value: 'OFTA', label: 'Oman FTA' },
    { value: 'ILFTA', label: 'Israel FTA' },
];

interface APIResponse {
    success: boolean;
    data: {
        rules: FtaRule[];
        ruleCount: number;
        countryHasFta?: boolean;
        applicableFtas?: FtaAgreement[];
        agreements?: FtaAgreement[];
    };
    filters: {
        htsCode: string | null;
        ftaCode: string | null;
        countryCode: string | null;
    };
    resources: {
        ustrFtas: string;
        cbpFtas: string;
        usitcHts: string;
    };
}

export const FTARulesLookup: React.FC = () => {
    const [htsCode, setHtsCode] = useState('');
    const [ftaCode, setFtaCode] = useState<string | undefined>();
    const [countryCode, setCountryCode] = useState<string | undefined>();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<APIResponse['data'] | null>(null);
    const [resources, setResources] = useState<APIResponse['resources'] | null>(null);
    const [selectedRule, setSelectedRule] = useState<FtaRule | null>(null);
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
            if (ftaCode) {
                params.set('ftaCode', ftaCode);
            }
            if (countryCode) {
                params.set('countryCode', countryCode);
            }
            params.set('includeAgreements', 'true');

            const response = await fetch(`/api/fta-rules?${params.toString()}`);
            const result: APIResponse = await response.json();

            if (result.success) {
                setData(result.data);
                setResources(result.resources);
            } else {
                setError('Failed to fetch FTA rules');
            }
        } catch (err) {
            console.error('Error fetching FTA rules:', err);
            setError('Failed to connect to the server');
        } finally {
            setLoading(false);
        }
    }, [htsCode, ftaCode, countryCode]);

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
    }, [htsCode, ftaCode, countryCode, handleSearch]);

    // Get rule type tag color
    const getRuleTypeColor = (ruleType: string) => {
        switch (ruleType) {
            case 'tariff_shift':
                return 'blue';
            case 'rvc':
                return 'green';
            case 'rvc_or_shift':
                return 'purple';
            case 'rvc_and_shift':
                return 'orange';
            case 'wholly_obtained':
                return 'cyan';
            case 'specific_process':
                return 'magenta';
            default:
                return 'default';
        }
    };

    // Get tariff shift tag color
    const getShiftColor = (shift: string) => {
        switch (shift) {
            case 'CC':
                return 'red';
            case 'CTH':
                return 'orange';
            case 'CTSH':
                return 'gold';
            case 'CTI':
                return 'lime';
            default:
                return 'default';
        }
    };

    // Format rule type for display
    const formatRuleType = (ruleType: string) => {
        return ruleType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    };

    // Copy rule text to clipboard
    const copyRuleText = (text: string) => {
        navigator.clipboard.writeText(text);
        messageApi.success('Rule text copied to clipboard');
    };

    // Table columns
    const columns: ColumnsType<FtaRule> = [
        {
            title: 'FTA',
            dataIndex: 'ftaCode',
            key: 'fta',
            width: 120,
            render: (ftaCode: string, record: FtaRule) => (
                <div>
                    <Tag color="blue" className="font-semibold">{ftaCode}</Tag>
                    <div className="text-xs text-slate-500 mt-1">{record.ftaName}</div>
                </div>
            ),
            filters: FTA_OPTIONS.map(fta => ({ text: fta.label, value: fta.value })),
            onFilter: (value, record) => record.ftaCode === value,
        },
        {
            title: 'HTS Prefix',
            dataIndex: 'htsPrefix',
            key: 'htsPrefix',
            width: 100,
            render: (prefix: string) => (
                <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">{prefix}</code>
            ),
        },
        {
            title: 'Product Category',
            dataIndex: 'htsDescription',
            key: 'description',
            ellipsis: true,
            render: (desc: string) => (
                <Tooltip title={desc}>
                    <span>{desc}</span>
                </Tooltip>
            ),
        },
        {
            title: 'Rule Type',
            dataIndex: 'ruleType',
            key: 'ruleType',
            width: 140,
            render: (ruleType: string) => (
                <Tag color={getRuleTypeColor(ruleType)}>
                    {formatRuleType(ruleType)}
                </Tag>
            ),
            filters: [
                { text: 'Tariff Shift', value: 'tariff_shift' },
                { text: 'RVC', value: 'rvc' },
                { text: 'RVC or Shift', value: 'rvc_or_shift' },
                { text: 'RVC and Shift', value: 'rvc_and_shift' },
            ],
            onFilter: (value, record) => record.ruleType === value,
        },
        {
            title: 'Requirements',
            key: 'requirements',
            width: 200,
            render: (_: unknown, record: FtaRule) => (
                <Space direction="vertical" size={2}>
                    {record.tariffShift && (
                        <Tag color={getShiftColor(record.tariffShift)}>
                            <ArrowRightLeft className="w-3 h-3 inline mr-1" />
                            {record.tariffShift}
                        </Tag>
                    )}
                    {record.rvcThreshold && (
                        <Tag color="green">
                            <Percent className="w-3 h-3 inline mr-1" />
                            {record.rvcThreshold}% RVC
                        </Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 100,
            render: (_: unknown, record: FtaRule) => (
                <Button
                    type="link"
                    size="small"
                    icon={<FileText className="w-4 h-4" />}
                    onClick={() => {
                        setSelectedRule(record);
                        setDetailModalOpen(true);
                    }}
                >
                    Details
                </Button>
            ),
        },
    ];

    // Render FTA eligibility status
    const renderFtaStatus = () => {
        if (!countryCode || !data) return null;

        const country = FTA_COUNTRY_OPTIONS.find(c => c.value === countryCode);
        if (!country) return null;

        if (data.countryHasFta && data.applicableFtas && data.applicableFtas.length > 0) {
            return (
                <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircle className="w-5 h-5 text-green-500" />}
                    message={
                        <span className="font-medium">
                            {country.flag} {country.label.split(' ').slice(1).join(' ')} has FTA preferential rates available
                        </span>
                    }
                    description={
                        <div className="mt-2">
                            <Text className="text-slate-600">Applicable agreements: </Text>
                            {data.applicableFtas.map(fta => (
                                <Tag key={fta.code} color="green" className="mr-1">
                                    {fta.name}
                                </Tag>
                            ))}
                        </div>
                    }
                    className="mb-4"
                />
            );
        } else {
            return (
                <Alert
                    type="warning"
                    showIcon
                    icon={<XCircle className="w-5 h-5 text-amber-500" />}
                    message={
                        <span className="font-medium">
                            {country.flag} {country.label.split(' ').slice(1).join(' ')} does not have an FTA with the US
                        </span>
                    }
                    description="Standard MFN (Most Favored Nation) duty rates apply."
                    className="mb-4"
                />
            );
        }
    };

    // Render external resources
    const renderResources = () => {
        if (!resources) return null;

        return (
            <Card size="small" className="mb-4">
                <div className="flex flex-wrap gap-4">
                    <Text className="text-slate-500 mr-2">External Resources:</Text>
                    <a
                        href={resources.ustrFtas}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                        <Globe className="w-4 h-4" />
                        USTR FTA Portal
                        <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                        href={resources.cbpFtas}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                        <FileText className="w-4 h-4" />
                        CBP FTA Resources
                        <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                        href={resources.usitcHts}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                        <BookOpen className="w-4 h-4" />
                        USITC HTS Database
                        <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </Card>
        );
    };

    // Rule detail modal
    const renderDetailModal = () => {
        if (!selectedRule) return null;

        return (
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Scale className="w-5 h-5 text-teal-600" />
                        <span>FTA Rule Details</span>
                    </div>
                }
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={[
                    <Button
                        key="copy"
                        icon={<Copy className="w-4 h-4" />}
                        onClick={() => copyRuleText(selectedRule.ruleText)}
                    >
                        Copy Rule Text
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setDetailModalOpen(false)}>
                        Close
                    </Button>,
                ]}
                width={700}
            >
                <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        <Tag color="blue" className="text-base px-3 py-1">
                            {selectedRule.ftaCode}
                        </Tag>
                        <Tag color="default" className="text-base px-3 py-1">
                            HTS {selectedRule.htsPrefix}
                        </Tag>
                        <Tag color={getRuleTypeColor(selectedRule.ruleType)} className="text-base px-3 py-1">
                            {formatRuleType(selectedRule.ruleType)}
                        </Tag>
                    </div>

                    {/* Product description */}
                    <Descriptions column={1} bordered size="small">
                        <Descriptions.Item label="Product Category">
                            {selectedRule.htsDescription || 'General chapter rule'}
                        </Descriptions.Item>
                        <Descriptions.Item label="FTA Agreement">
                            {selectedRule.ftaName}
                        </Descriptions.Item>
                        {selectedRule.annex && (
                            <Descriptions.Item label="Reference">
                                {selectedRule.annex}
                            </Descriptions.Item>
                        )}
                    </Descriptions>

                    {/* Rule requirements */}
                    <Card size="small" title="Rule Requirements" className="bg-slate-50">
                        <div className="space-y-3">
                            {/* Tariff Shift */}
                            {selectedRule.tariffShift && (
                                <div className="flex items-start gap-3">
                                    <ArrowRightLeft className="w-5 h-5 text-blue-500 mt-0.5" />
                                    <div>
                                        <Text strong>Tariff Shift: </Text>
                                        <Tag color={getShiftColor(selectedRule.tariffShift)}>
                                            {selectedRule.tariffShift}
                                        </Tag>
                                        <Paragraph className="text-slate-600 mt-1 mb-0 text-sm">
                                            {getTariffShiftDescription(selectedRule.tariffShift)}
                                        </Paragraph>
                                    </div>
                                </div>
                            )}

                            {/* RVC */}
                            {selectedRule.rvcThreshold && (
                                <div className="flex items-start gap-3">
                                    <Percent className="w-5 h-5 text-green-500 mt-0.5" />
                                    <div>
                                        <Text strong>Regional Value Content: </Text>
                                        <Tag color="green">{selectedRule.rvcThreshold}%</Tag>
                                        {selectedRule.rvcMethod && (
                                            <>
                                                <Text className="ml-2">using </Text>
                                                <Tag>{selectedRule.rvcMethod.replace('_', ' ')}</Tag>
                                            </>
                                        )}
                                        {selectedRule.rvcMethod && (
                                            <Paragraph className="text-slate-600 mt-1 mb-0 text-sm">
                                                {getRvcMethodDescription(selectedRule.rvcMethod)}
                                            </Paragraph>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Additional requirements */}
                            {selectedRule.additionalRequirements && selectedRule.additionalRequirements.length > 0 && (
                                <div className="flex items-start gap-3">
                                    <Info className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <div>
                                        <Text strong>Additional Requirements:</Text>
                                        <ul className="list-disc list-inside text-slate-600 mt-1 mb-0 text-sm">
                                            {selectedRule.additionalRequirements.map((req, idx) => (
                                                <li key={idx}>{req}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Official rule text */}
                    <Card size="small" title="Official Rule Text">
                        <Paragraph className="text-sm bg-slate-100 p-3 rounded font-mono whitespace-pre-wrap mb-0">
                            {selectedRule.ruleText}
                        </Paragraph>
                    </Card>

                    {/* Notes */}
                    {selectedRule.notes && (
                        <Alert
                            type="info"
                            showIcon
                            icon={<Info className="w-4 h-4" />}
                            message="Notes"
                            description={selectedRule.notes}
                        />
                    )}
                </div>
            </Modal>
        );
    };

    // Render content
    if (error) {
        return <ErrorState title="Error Loading FTA Rules" message={error} onRetry={fetchData} />;
    }

    return (
        <div className="space-y-4">
            {contextHolder}

            {/* Search and Filter Card */}
            <Card>
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Scale className="w-5 h-5 text-teal-600" />
                        <Title level={5} className="m-0">
                            FTA Rules of Origin Lookup
                        </Title>
                    </div>

                    <Paragraph className="text-slate-600 mb-4">
                        Search for Free Trade Agreement rules of origin by HTS code. These rules determine
                        whether your product qualifies for preferential duty rates under a specific FTA.
                    </Paragraph>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* HTS Code Search */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                HTS Code
                            </label>
                            <Input
                                placeholder="e.g., 8471 or 61"
                                prefix={<Search className="w-4 h-4 text-slate-400" />}
                                value={htsCode}
                                onChange={e => setHtsCode(e.target.value)}
                                allowClear
                                className="w-full"
                            />
                        </div>

                        {/* Country Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Country of Origin
                            </label>
                            <Select
                                placeholder="Select country"
                                value={countryCode}
                                onChange={setCountryCode}
                                options={FTA_COUNTRY_OPTIONS}
                                allowClear
                                showSearch
                                optionFilterProp="label"
                                className="w-full"
                            />
                        </div>

                        {/* FTA Filter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Free Trade Agreement
                            </label>
                            <Select
                                placeholder="All FTAs"
                                value={ftaCode}
                                onChange={setFtaCode}
                                options={FTA_OPTIONS}
                                allowClear
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                        <Button
                            icon={<RefreshCw className="w-4 h-4" />}
                            onClick={() => {
                                setHtsCode('');
                                setCountryCode(undefined);
                                setFtaCode(undefined);
                            }}
                        >
                            Clear Filters
                        </Button>
                        <Text className="text-slate-500">
                            {data?.ruleCount || 0} rules found
                        </Text>
                    </div>
                </div>
            </Card>

            {/* FTA Eligibility Status */}
            {renderFtaStatus()}

            {/* External Resources */}
            {renderResources()}

            {/* Results */}
            {loading ? (
                <LoadingState message="Loading FTA rules..." />
            ) : data?.rules && data.rules.length > 0 ? (
                <Card>
                    <Table
                        dataSource={data.rules}
                        columns={columns}
                        rowKey="id"
                        pagination={{
                            pageSize: 10,
                            showSizeChanger: true,
                            showTotal: (total, range) =>
                                `${range[0]}-${range[1]} of ${total} rules`,
                        }}
                        scroll={{ x: 800 }}
                        size="middle"
                    />
                </Card>
            ) : (
                <Card>
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div>
                                <Text className="text-slate-500">No FTA rules found</Text>
                                <br />
                                <Text className="text-slate-400 text-sm">
                                    {htsCode
                                        ? `No rules match HTS code "${htsCode}"`
                                        : 'Enter an HTS code to search for applicable rules'}
                                </Text>
                            </div>
                        }
                    />
                </Card>
            )}

            {/* Quick Reference Card */}
            <Card title="Understanding FTA Rules of Origin" size="small">
                <Collapse ghost>
                    <Panel
                        header={
                            <span className="font-medium">
                                <ArrowRightLeft className="w-4 h-4 inline mr-2" />
                                Tariff Shift Rules
                            </span>
                        }
                        key="shift"
                    >
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>
                                <Tag color="red">CC</Tag>
                                <strong>Change of Chapter:</strong> Non-originating materials must be classified
                                in a different 2-digit HTS chapter than the finished product.
                            </p>
                            <p>
                                <Tag color="orange">CTH</Tag>
                                <strong>Change of Tariff Heading:</strong> Non-originating materials must be
                                classified in a different 4-digit heading.
                            </p>
                            <p>
                                <Tag color="gold">CTSH</Tag>
                                <strong>Change of Tariff Subheading:</strong> Non-originating materials must be
                                classified in a different 6-digit subheading.
                            </p>
                        </div>
                    </Panel>

                    <Panel
                        header={
                            <span className="font-medium">
                                <Percent className="w-4 h-4 inline mr-2" />
                                Regional Value Content (RVC)
                            </span>
                        }
                        key="rvc"
                    >
                        <div className="space-y-2 text-sm text-slate-600">
                            <p>
                                RVC requires a minimum percentage of the product&apos;s value to originate from
                                FTA partner countries. Common methods include:
                            </p>
                            <ul className="list-disc list-inside">
                                <li>
                                    <strong>Transaction Value:</strong> Based on the price paid for the good
                                </li>
                                <li>
                                    <strong>Net Cost:</strong> Total cost minus royalties, sales promotion, and
                                    shipping
                                </li>
                                <li>
                                    <strong>Build-Down:</strong> (Adjusted Value - Non-Originating) / Adjusted
                                    Value
                                </li>
                                <li>
                                    <strong>Build-Up:</strong> Value of Originating Materials / Adjusted Value
                                </li>
                            </ul>
                        </div>
                    </Panel>

                    <Panel
                        header={
                            <span className="font-medium">
                                <Globe className="w-4 h-4 inline mr-2" />
                                US Free Trade Agreements
                            </span>
                        }
                        key="ftas"
                    >
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                            {data?.agreements?.map(fta => (
                                <div key={fta.code} className="flex items-center gap-2">
                                    <Badge status="success" />
                                    <span>{fta.name}</span>
                                    <span className="text-slate-400">
                                        ({fta.countries.join(', ')})
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </Collapse>
            </Card>

            {/* Detail Modal */}
            {renderDetailModal()}
        </div>
    );
};
