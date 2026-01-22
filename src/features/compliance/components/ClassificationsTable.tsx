'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Tag, Button, Typography, Input, Dropdown, message, Modal } from 'antd';
import { LoadingState, EmptyState, SearchEmptyState } from '@/components/shared';
import type { MenuProps } from 'antd';
import { Search, RefreshCw, Clock, Globe, MoreHorizontal, Eye, Trash2, Star, Bell, Plus } from 'lucide-react';
import { ClassificationResultDisplay } from './ClassificationResult';
import { formatHtsCode } from '@/utils/htsFormatting';
import Link from 'next/link';

const { Text, Paragraph } = Typography;

interface SavedProduct {
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
}

interface SavedProductDetail extends SavedProduct {
    materialComposition: string | null;
    intendedUse: string | null;
    latestClassification: unknown;
}

interface ClassificationsTableProps {
    onViewClassification?: (id: string) => void;
}

export const ClassificationsTable: React.FC<ClassificationsTableProps> = ({ onViewClassification }) => {
    const [products, setProducts] = useState<SavedProduct[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    
    // Detail modal
    const [selectedProduct, setSelectedProduct] = useState<SavedProductDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const fetchProducts = useCallback(async (pageNum: number = 1, search?: string) => {
        setLoading(true);
        try {
            const offset = (pageNum - 1) * pageSize;
            const params = new URLSearchParams({
                limit: pageSize.toString(),
                offset: offset.toString(),
            });
            if (search) params.set('search', search);
            
            const response = await fetch(`/api/saved-products?${params}`);
            
            if (!response.ok) {
                if (response.status === 401) {
                    setProducts([]);
                    setTotal(0);
                    return;
                }
                throw new Error('Failed to fetch');
            }

            const data = await response.json();
            setProducts(data.items || []);
            setTotal(data.total || 0);
        } catch (error) {
            console.error('Failed to fetch saved products:', error);
            message.error('Failed to load saved products');
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    // Debounce timer ref
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchProducts(page, searchQuery);
    }, [page, fetchProducts]);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, []);

    const handleSearch = (value: string) => {
        setSearchQuery(value);
        
        // Clear existing debounce timer
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }
        
        // Debounce the search API call (300ms)
        searchDebounceRef.current = setTimeout(() => {
            setPage(1);
            fetchProducts(1, value);
        }, 300);
    };

    const handleViewDetail = useCallback(async (id: string) => {
        // If external handler is provided (drawer from parent), use that instead of internal modal
        if (onViewClassification) {
            onViewClassification(id);
            return;
        }
        
        // Otherwise use internal modal
        setDetailLoading(true);
        setShowDetailModal(true);
        
        try {
            const response = await fetch(`/api/saved-products/${id}`);
            if (!response.ok) throw new Error('Failed to fetch');
            
            const detail = await response.json();
            setSelectedProduct(detail);
        } catch (error) {
            console.error('Failed to fetch product detail:', error);
            message.error('Failed to load product details');
            setShowDetailModal(false);
        } finally {
            setDetailLoading(false);
        }
    }, [onViewClassification]);

    const handleDelete = useCallback(async (id: string, productName: string) => {
        Modal.confirm({
            title: 'Delete Product',
            content: `Are you sure you want to delete "${productName}"? This action cannot be undone.`,
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const response = await fetch(`/api/saved-products/${id}`, {
                        method: 'DELETE',
                    });
                    
                    if (!response.ok) throw new Error('Failed to delete');
                    
                    // Immediately update UI
                    setProducts(prev => prev.filter(p => p.id !== id));
                    setTotal(prev => prev - 1);
                    message.success('Product deleted');
                } catch (error) {
                    console.error('Failed to delete product:', error);
                    message.error('Failed to delete product');
                }
            },
        });
    }, []);

    const handleToggleFavorite = useCallback(async (id: string, currentValue: boolean) => {
        try {
            const response = await fetch(`/api/saved-products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFavorite: !currentValue }),
            });
            
            if (!response.ok) throw new Error('Failed to update');
            
            // Update UI
            setProducts(prev => prev.map(p => 
                p.id === id ? { ...p, isFavorite: !currentValue } : p
            ));
            message.success(currentValue ? 'Removed from favorites' : 'Added to favorites');
        } catch (error) {
            console.error('Failed to update product:', error);
            message.error('Failed to update product');
        }
    }, []);

    const handleToggleMonitor = useCallback(async (id: string, currentValue: boolean) => {
        try {
            const response = await fetch(`/api/saved-products/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isMonitored: !currentValue }),
            });
            
            if (!response.ok) throw new Error('Failed to update');
            
            // Update UI
            setProducts(prev => prev.map(p => 
                p.id === id ? { ...p, isMonitored: !currentValue } : p
            ));
            message.success(currentValue ? 'Stopped monitoring' : 'Started monitoring for tariff changes');
        } catch (error) {
            console.error('Failed to update product:', error);
            message.error('Failed to update product');
        }
    }, []);

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

    const getConfidenceColor = (rate: number | null) => {
        if (rate === null) return 'default';
        if (rate <= 5) return 'green';
        if (rate <= 15) return 'gold';
        return 'red';
    };

    const columns = [
        {
            title: 'Product',
            key: 'product',
            width: '35%',
            render: (_: unknown, record: SavedProduct) => (
                <div
                    className="cursor-pointer hover:text-teal-600 transition-colors"
                    onClick={() => handleViewDetail(record.id)}
                >
                    <div className="flex items-center gap-2">
                        <Text strong className="block text-slate-900 line-clamp-1 hover:text-teal-600">
                            {record.name}
                        </Text>
                        {record.isFavorite && <Star size={14} className="text-amber-500 fill-amber-500" />}
                        {record.isMonitored && <Bell size={14} className="text-teal-500" />}
                    </div>
                    <Paragraph 
                        ellipsis={{ rows: 1 }} 
                        className="text-slate-500 text-xs mb-0 mt-0.5"
                    >
                        {record.description}
                    </Paragraph>
                    <div className="flex items-center gap-3 mt-1">
                        {record.sku && (
                            <Text type="secondary" className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                {record.sku}
                            </Text>
                        )}
                        {record.countryOfOrigin && (
                            <div className="flex items-center gap-1">
                                <Globe size={12} className="text-slate-400" />
                                <Text type="secondary" className="text-xs">{record.countryOfOrigin}</Text>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'HTS Code',
            dataIndex: 'htsCode',
            key: 'htsCode',
            width: '15%',
            render: (code: string, record: SavedProduct) => (
                <Tag
                    color="blue"
                    className="font-mono text-sm px-3 py-1 cursor-pointer"
                    onClick={() => handleViewDetail(record.id)}
                >
                    {formatHtsCode(code)}
                </Tag>
            ),
        },
        {
            title: 'Description',
            dataIndex: 'htsDescription',
            key: 'htsDescription',
            width: '25%',
            render: (text: string, record: SavedProduct) => (
                <Text
                    className="text-slate-600 text-sm line-clamp-2 cursor-pointer hover:text-teal-600"
                    onClick={() => handleViewDetail(record.id)}
                >
                    {text}
                </Text>
            ),
        },
        {
            title: 'Duty Rate',
            key: 'dutyRate',
            width: '12%',
            render: (_: unknown, record: SavedProduct) => (
                <Tag color={getConfidenceColor(record.effectiveDutyRate)} className="m-0">
                    {record.effectiveDutyRate !== null 
                        ? `${record.effectiveDutyRate}%` 
                        : record.baseDutyRate || '—'
                    }
                </Tag>
            ),
        },
        {
            title: 'Date Saved',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: '13%',
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
            width: '5%',
            render: (_: unknown, record: SavedProduct) => {
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
                    {
                        key: 'favorite',
                        label: record.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
                        icon: <Star size={14} className={record.isFavorite ? 'fill-amber-500 text-amber-500' : ''} />,
                        onClick: (e) => {
                            e.domEvent.stopPropagation();
                            handleToggleFavorite(record.id, record.isFavorite);
                        },
                    },
                    {
                        key: 'monitor',
                        label: record.isMonitored ? 'Stop Monitoring' : 'Monitor for Changes',
                        icon: <Bell size={14} className={record.isMonitored ? 'text-teal-500' : ''} />,
                        onClick: (e) => {
                            e.domEvent.stopPropagation();
                            handleToggleMonitor(record.id, record.isMonitored);
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
                            handleDelete(record.id, record.name);
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

    if (loading && products.length === 0) {
        return <LoadingState message="Loading your products..." />;
    }

    return (
        <div>
            {/* Search and Refresh Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between mb-4">
                <Input
                    placeholder="Search by HTS code, description, or product..."
                    prefix={<Search size={16} className="text-slate-400" />}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    allowClear
                    className="w-full sm:max-w-md"
                />
                <Button
                    icon={<RefreshCw size={14} />}
                    onClick={() => fetchProducts(page, searchQuery)}
                    loading={loading}
                    className="flex-shrink-0"
                >
                    Refresh
                </Button>
            </div>

            {products.length === 0 && !loading ? (
                searchQuery ? (
                    <SearchEmptyState 
                        searchTerm={searchQuery} 
                        onClear={() => handleSearch('')} 
                    />
                ) : (
                    <EmptyState
                        icon="products"
                        title="No products saved yet"
                        description="Save products from your classifications to track them here."
                        action={{
                            label: "Classify a Product",
                            href: "/dashboard/classify",
                            icon: <Plus size={16} />,
                        }}
                    />
                )
            ) : (
                <Table
                    dataSource={products.map(p => ({ ...p, key: p.id }))}
                    columns={columns}
                    loading={loading}
                    scroll={{ x: 800 }}
                    pagination={{
                        current: page,
                        pageSize,
                        total,
                        onChange: setPage,
                        showSizeChanger: true,
                        pageSizeOptions: ['5', '10', '25', '50'],
                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} products`,
                        responsive: true,
                    }}
                    className="border border-slate-100 rounded-xl overflow-hidden"
                    rowClassName="hover:bg-slate-50 cursor-pointer"
                    onRow={(record) => ({
                        onClick: () => handleViewDetail(record.id),
                    })}
                />
            )}

            {/* Detail Modal */}
            <Modal
                open={showDetailModal}
                onCancel={() => {
                    setShowDetailModal(false);
                    setSelectedProduct(null);
                }}
                width={1000}
                footer={null}
                title={
                    <div className="flex items-center gap-2">
                        <Eye size={20} className="text-teal-600" />
                        <span>Product Details</span>
                    </div>
                }
            >
                {detailLoading ? (
                    <LoadingState message="Loading product details..." />
                ) : selectedProduct?.latestClassification ? (
                    <ClassificationResultDisplay 
                        result={selectedProduct.latestClassification as never}
                        onNewClassification={() => setShowDetailModal(false)}
                    />
                ) : selectedProduct ? (
                    <div className="text-center py-8">
                        <Text type="secondary">
                            No classification data available for this product.
                        </Text>
                    </div>
                ) : null}
            </Modal>
        </div>
    );
};
