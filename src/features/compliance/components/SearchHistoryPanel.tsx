'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, 
    Table, 
    Tag, 
    Button, 
    Typography, 
    Empty,
    Skeleton,
    Badge,
    Modal,
    Descriptions,
    Statistic,
    Row,
    Col,
    message,
    Dropdown,
    Tooltip,
} from 'antd';
import type { MenuProps } from 'antd';
import { 
    History, 
    Eye, 
    Trash2, 
    TrendingUp, 
    Globe, 
    AlertTriangle,
    RefreshCw,
    ChevronRight,
    MoreHorizontal,
} from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import { ClassificationResultDisplay } from './ClassificationResult';

const { Title, Text, Paragraph } = Typography;

interface SearchHistoryItem {
    id: string;
    productName: string | null;
    productDescription: string;
    countryOfOrigin: string | null;
    materialComposition: string | null;
    htsCode: string;
    htsDescription: string;
    confidence: number;
    baseDutyRate: string | null;
    effectiveRate: number | null;
    hasAdditionalDuties: boolean;
    createdAt: string;
}

interface SearchHistoryDetail extends SearchHistoryItem {
    productSku: string | null;
    intendedUse: string | null;
    fullResult: unknown;
}

interface SearchStats {
    totalSearches: number;
    uniqueHtsCodes: number;
    avgConfidence: number;
    searchesThisMonth: number;
}

export const SearchHistoryPanel: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<SearchHistoryItem[]>([]);
    const [stats, setStats] = useState<SearchStats | null>(null);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    
    // Modal state
    const [selectedSearch, setSelectedSearch] = useState<SearchHistoryDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const fetchHistory = async (pageNum: number = 1) => {
        setLoading(true);
        try {
            const offset = (pageNum - 1) * pageSize;
            const response = await fetch(
                `/api/search-history?limit=${pageSize}&offset=${offset}&includeStats=${pageNum === 1}`
            );
            
            if (!response.ok) {
                if (response.status === 401) {
                    setItems([]);
                    setTotal(0);
                    return;
                }
                throw new Error('Failed to fetch');
            }

            const data = await response.json();
            setItems(data.items);
            setTotal(data.total);
            if (data.stats) {
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Failed to fetch history:', error);
            message.error('Failed to load search history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory(page);
    }, [page]);

    const handleViewDetail = useCallback(async (id: string) => {
        setDetailLoading(true);
        setShowDetailModal(true);
        
        try {
            const response = await fetch(`/api/search-history/${id}`);
            if (!response.ok) throw new Error('Failed to fetch');
            
            const detail = await response.json();
            setSelectedSearch(detail);
        } catch (error) {
            console.error('Failed to fetch detail:', error);
            message.error('Failed to load search details');
            setShowDetailModal(false);
        } finally {
            setDetailLoading(false);
        }
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/search-history/${id}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) throw new Error('Failed to delete');
            
            // Immediately update UI
            setItems(prev => prev.filter(item => item.id !== id));
            setTotal(prev => prev - 1);
            message.success('Search removed from history');
        } catch (error) {
            console.error('Failed to delete:', error);
            message.error('Failed to delete search');
        }
    }, []);

    const columns: ColumnsType<SearchHistoryItem> = [
        {
            title: 'Product',
            key: 'product',
            width: '30%',
            render: (_, record) => (
                <div>
                    <Text strong className="block text-slate-800">
                        {record.productName || 'Untitled Search'}
                    </Text>
                    <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        className="text-slate-500 text-xs mb-0 mt-1"
                    >
                        {record.productDescription}
                    </Paragraph>
                </div>
            ),
        },
        {
            title: 'HTS Code',
            dataIndex: 'htsCode',
            key: 'htsCode',
            width: '15%',
            render: (code: string) => (
                <Tag color="blue" className="font-mono text-sm">
                    {code}
                </Tag>
            ),
        },
        {
            title: 'Origin',
            dataIndex: 'countryOfOrigin',
            key: 'countryOfOrigin',
            width: '10%',
            render: (country: string | null) => (
                country ? (
                    <div className="flex items-center gap-1">
                        <Globe size={14} className="text-slate-400" />
                        <Text className="text-slate-600">{country}</Text>
                    </div>
                ) : (
                    <Text type="secondary">—</Text>
                )
            ),
        },
        {
            title: 'Duty Rate',
            key: 'dutyRate',
            width: '15%',
            render: (_, record) => (
                <div>
                    <Text strong className="text-slate-800">
                        {record.effectiveRate !== null 
                            ? `${record.effectiveRate}%` 
                            : record.baseDutyRate || '—'
                        }
                    </Text>
                    {record.hasAdditionalDuties && (
                        <Tooltip title="Has additional duties (Section 301, IEEPA, etc.)">
                            <AlertTriangle 
                                size={14} 
                                className="text-amber-500 ml-1 inline-block" 
                            />
                        </Tooltip>
                    )}
                </div>
            ),
        },
        {
            title: 'Confidence',
            dataIndex: 'confidence',
            key: 'confidence',
            width: '10%',
            render: (confidence: number) => (
                <Badge 
                    color={confidence >= 85 ? 'green' : confidence >= 70 ? 'gold' : 'red'}
                    text={`${confidence}%`}
                />
            ),
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: '12%',
            render: (date: string) => (
                <Text type="secondary" className="text-xs">
                    {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </Text>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: '5%',
            render: (_, record) => {
                const menuItems: MenuProps['items'] = [
                    {
                        key: 'view',
                        label: 'View Details',
                        icon: <Eye size={14} />,
                        onClick: (e) => {
                            e.domEvent.stopPropagation();
                            handleViewDetail(record.id);
                        },
                    },
                    { type: 'divider' },
                    {
                        key: 'delete',
                        label: 'Delete',
                        icon: <Trash2 size={14} />,
                        danger: true,
                        onClick: (e) => {
                            e.domEvent.stopPropagation();
                            handleDelete(record.id);
                        },
                    },
                ];
                
                return (
                    <Dropdown 
                        menu={{ items: menuItems }} 
                        trigger={['click']}
                        placement="bottomRight"
                    >
                        <Button
                            type="text"
                            size="small"
                            icon={<MoreHorizontal size={16} className="text-slate-500" />}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </Dropdown>
                );
            },
        },
    ];

    if (loading && items.length === 0) {
        return (
            <Card className="shadow-sm border-slate-200">
                <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            {stats && (
                <Row gutter={[16, 16]}>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="text-center border-slate-200">
                            <Statistic 
                                title="Total Searches" 
                                value={stats.totalSearches}
                                prefix={<History size={16} className="text-teal-600" />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="text-center border-slate-200">
                            <Statistic 
                                title="Unique HTS Codes" 
                                value={stats.uniqueHtsCodes}
                                prefix={<Tag size={16} className="text-blue-600" />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="text-center border-slate-200">
                            <Statistic 
                                title="Avg Confidence" 
                                value={stats.avgConfidence}
                                suffix="%"
                                prefix={<TrendingUp size={16} className="text-green-600" />}
                            />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card size="small" className="text-center border-slate-200">
                            <Statistic 
                                title="This Month" 
                                value={stats.searchesThisMonth}
                                prefix={<RefreshCw size={16} className="text-purple-600" />}
                            />
                        </Card>
                    </Col>
                </Row>
            )}

            {/* History Table */}
            <Card 
                className="shadow-sm border-slate-200"
                title={
                    <div className="flex items-center gap-2">
                        <History size={20} className="text-teal-600" />
                        <span>Classification History</span>
                    </div>
                }
                extra={
                    <Button 
                        type="text" 
                        icon={<RefreshCw size={16} />}
                        onClick={() => fetchHistory(page)}
                        loading={loading}
                    >
                        Refresh
                    </Button>
                }
            >
                {items.length === 0 ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="text-center">
                                <Text type="secondary">No classification history yet</Text>
                                <br />
                                <Text type="secondary" className="text-xs">
                                    Your searches will appear here after you classify products
                                </Text>
                            </div>
                        }
                    />
                ) : (
                    <Table
                        columns={columns}
                        dataSource={items}
                        rowKey="id"
                        loading={loading}
                        pagination={{
                            current: page,
                            pageSize,
                            total,
                            onChange: setPage,
                            showSizeChanger: false,
                            showTotal: (total) => `${total} searches`,
                        }}
                        size="middle"
                        rowClassName="hover:bg-slate-50/50 cursor-pointer"
                        onRow={(record) => ({
                            onClick: () => handleViewDetail(record.id),
                        })}
                    />
                )}
            </Card>

            {/* Detail Modal */}
            <Modal
                open={showDetailModal}
                onCancel={() => {
                    setShowDetailModal(false);
                    setSelectedSearch(null);
                }}
                width={1000}
                footer={null}
                title={
                    <div className="flex items-center gap-2">
                        <Eye size={20} className="text-teal-600" />
                        <span>Classification Details</span>
                    </div>
                }
            >
                {detailLoading ? (
                    <Skeleton active paragraph={{ rows: 10 }} />
                ) : selectedSearch ? (
                    <div className="space-y-6">
                        {/* Input Summary */}
                        <Card size="small" className="bg-slate-50 border-slate-200">
                            <Title level={5} className="mb-4">Search Input</Title>
                            <Descriptions column={{ xs: 1, sm: 2 }} size="small">
                                <Descriptions.Item label="Product Name">
                                    {selectedSearch.productName || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="SKU">
                                    {selectedSearch.productSku || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Country of Origin">
                                    {selectedSearch.countryOfOrigin || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Material">
                                    {selectedSearch.materialComposition || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Intended Use" span={2}>
                                    {selectedSearch.intendedUse || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Description" span={2}>
                                    {selectedSearch.productDescription}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        {/* Full Result */}
                        {selectedSearch.fullResult && (
                            <ClassificationResultDisplay 
                                result={selectedSearch.fullResult as never}
                                onNewClassification={() => setShowDetailModal(false)}
                            />
                        )}

                        {/* Upsell: Find Cheaper Suppliers */}
                        <Card className="bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Title level={5} className="text-teal-800 mb-1">
                                        💡 Find Cheaper Suppliers
                                    </Title>
                                    <Text className="text-teal-700">
                                        Discover manufacturers in other countries that could reduce your total landed cost.
                                    </Text>
                                </div>
                                <Button 
                                    type="primary" 
                                    className="bg-teal-600"
                                    icon={<ChevronRight size={18} />}
                                    iconPosition="end"
                                >
                                    Explore Suppliers
                                </Button>
                            </div>
                        </Card>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};

export default SearchHistoryPanel;


