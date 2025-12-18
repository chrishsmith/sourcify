'use client';

import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Typography, Tooltip, Empty, Input, Popconfirm, message } from 'antd';
import { Eye, Download, Trash2, Search, RefreshCw, Clock, Globe } from 'lucide-react';
import { getClassificationHistory, deleteClassification, searchClassificationHistory, type StoredClassification } from '@/services/classificationHistory';

const { Text } = Typography;

export const ClassificationsTable: React.FC = () => {
    const [history, setHistory] = useState<StoredClassification[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Load history on mount and when search changes
    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = () => {
        setLoading(true);
        // Small delay to allow localStorage to sync
        setTimeout(() => {
            const data = searchQuery
                ? searchClassificationHistory(searchQuery)
                : getClassificationHistory();
            setHistory(data);
            setLoading(false);
        }, 100);
    };

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        if (value) {
            setHistory(searchClassificationHistory(value));
        } else {
            setHistory(getClassificationHistory());
        }
    };

    const handleDelete = (id: string) => {
        deleteClassification(id);
        loadHistory();
        message.success('Classification deleted');
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'green';
        if (confidence >= 70) return 'gold';
        return 'red';
    };

    const columns = [
        {
            title: 'Product Description',
            dataIndex: 'productDescription',
            key: 'productDescription',
            width: '35%',
            render: (text: string, record: StoredClassification) => (
                <div>
                    <Text strong className="block text-slate-900 line-clamp-2">{text}...</Text>
                    {record.countryOfOrigin && (
                        <div className="flex items-center gap-1 mt-1">
                            <Globe size={12} className="text-slate-400" />
                            <Text type="secondary" className="text-xs">{record.countryOfOrigin}</Text>
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'HTS Code',
            dataIndex: 'htsCode',
            key: 'htsCode',
            width: '15%',
            render: (code: string) => (
                <Tag color="blue" className="font-mono text-sm px-3 py-1">{code}</Tag>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            width: '25%',
            render: (text: string) => (
                <Text className="text-slate-600 text-sm line-clamp-2">{text}</Text>
            ),
        },
        {
            title: 'Confidence',
            dataIndex: 'confidence',
            key: 'confidence',
            width: '12%',
            render: (val: number) => (
                <div className="flex items-center gap-2">
                    <div className="w-12 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${val >= 90 ? 'bg-green-500' : val >= 70 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${val}%` }}
                        />
                    </div>
                    <Tag color={getConfidenceColor(val)} className="m-0">{val}%</Tag>
                </div>
            ),
        },
        {
            title: 'Date',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: '15%',
            render: (date: string) => (
                <div className="flex items-center gap-1 text-slate-500">
                    <Clock size={12} />
                    <Text type="secondary" className="text-xs">{formatDate(date)}</Text>
                </div>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: '8%',
            render: (_: unknown, record: StoredClassification) => (
                <Space>
                    <Tooltip title="View Details">
                        <Button
                            type="text"
                            size="small"
                            icon={<Eye size={14} className="text-slate-400" />}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Delete classification?"
                        description="This cannot be undone."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Delete"
                        cancelText="Cancel"
                    >
                        <Tooltip title="Delete">
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<Trash2 size={14} />}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div>
            {/* Search and Refresh Bar */}
            <div className="flex items-center justify-between mb-4">
                <Input
                    placeholder="Search by HTS code, description, or product..."
                    prefix={<Search size={16} className="text-slate-400" />}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    allowClear
                    className="max-w-md"
                />
                <Button
                    icon={<RefreshCw size={14} />}
                    onClick={loadHistory}
                    loading={loading}
                >
                    Refresh
                </Button>
            </div>

            {history.length === 0 && !loading ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        searchQuery
                            ? "No classifications match your search"
                            : "No classifications yet"
                    }
                >
                    {!searchQuery && (
                        <Text type="secondary" className="block">
                            Create your first classification in the "New Classification" tab
                        </Text>
                    )}
                </Empty>
            ) : (
                <Table
                    dataSource={history.map(h => ({ ...h, key: h.id }))}
                    columns={columns}
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        pageSizeOptions: ['5', '10', '25', '50'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} classifications`
                    }}
                    className="border border-slate-100 rounded-xl overflow-hidden"
                    rowClassName="hover:bg-slate-50"
                />
            )}
        </div>
    );
};
