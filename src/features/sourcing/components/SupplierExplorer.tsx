'use client';

import React, { useState, useEffect } from 'react';
import { Input, Card, Tag, Button, Avatar, Typography, Row, Col, Select, Skeleton, Empty, Drawer, Descriptions, Statistic, Alert } from 'antd';
import { Search, MapPin, Building2, CheckCircle, Star, ArrowLeft } from 'lucide-react';
import { getCountryName, COUNTRIES, LoadingState, EmptyState } from '@/components/shared';

const { Text, Title, Paragraph } = Typography;

interface Supplier {
    id: string;
    name: string;
    slug: string;
    description: string;
    website?: string;
    countryCode: string;
    countryName: string;
    region?: string;
    city?: string;
    productCategories: string[];
    htsChapters: string[];
    materials: string[];
    certifications: string[];
    isVerified: boolean;
    tier: string;
    reliabilityScore: number;
    qualityScore: number;
    communicationScore: number;
    overallScore: number;
    costTier: string;
    minOrderValue?: number;
    typicalLeadDays?: number;
    employeeCount?: string;
}

interface CountryFilter {
    code: string;
    name: string;
    count: number;
}

interface SupplierExplorerProps {
    /** Pre-populate country filter */
    initialCountry?: string;
    /** Pre-populate search with HTS code */
    initialHtsCode?: string;
    /** Show back button to return to analysis */
    onBack?: () => void;
    /** Context label for filtered view */
    filterContext?: string;
}

export const SupplierExplorer: React.FC<SupplierExplorerProps> = ({
    initialCountry,
    initialHtsCode,
    onBack,
    filterContext,
}) => {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState(initialHtsCode || '');
    const [countryFilter, setCountryFilter] = useState<string | undefined>(initialCountry);
    const [countries, setCountries] = useState<CountryFilter[]>([]);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.set('q', searchTerm);
            if (countryFilter) params.set('country', countryFilter);
            params.set('verifiedOnly', 'true');
            params.set('limit', '20');

            const response = await fetch(`/api/suppliers?${params.toString()}`);
            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            setSuppliers(data.suppliers);
            setTotal(data.total);
            setCountries(data.filters?.countries || []);
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount and when filters change
    useEffect(() => {
        fetchSuppliers();
    }, [countryFilter]);
    
    // Also fetch when initial props change
    useEffect(() => {
        if (initialCountry !== undefined) {
            setCountryFilter(initialCountry);
        }
        if (initialHtsCode !== undefined) {
            setSearchTerm(initialHtsCode);
        }
    }, [initialCountry, initialHtsCode]);

    const handleSearch = () => {
        fetchSuppliers();
    };
    
    const handleClearFilters = () => {
        setCountryFilter(undefined);
        setSearchTerm('');
    };

    const getTierLabel = (tier: string) => {
        switch (tier) {
            case 'PREMIUM': return { label: 'Premium', color: 'gold' };
            case 'VERIFIED': return { label: 'Verified', color: 'green' };
            case 'BASIC': return { label: 'Basic', color: 'blue' };
            default: return { label: 'Unverified', color: 'default' };
        }
    };

    const getCostLabel = (costTier: string) => {
        switch (costTier) {
            case 'LOW': return { label: '$ Low Cost', color: 'green' };
            case 'MEDIUM': return { label: '$$ Medium', color: 'gold' };
            case 'HIGH': return { label: '$$$ Premium', color: 'red' };
            default: return { label: 'Unknown', color: 'default' };
        }
    };
    
    const isFiltered = !!initialCountry || !!initialHtsCode;

    return (
        <div className="space-y-6">
            {/* Back Button + Filter Context */}
            {isFiltered && (
                <Alert
                    type="info"
                    message={
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {onBack && (
                                    <Button 
                                        type="text" 
                                        icon={<ArrowLeft size={16} />} 
                                        onClick={onBack}
                                        className="p-0 h-auto mr-2"
                                    >
                                        Back to Analysis
                                    </Button>
                                )}
                                <span>
                                    Showing suppliers in <strong>{getCountryName(initialCountry || '')}</strong>
                                    {initialHtsCode && <> for HTS <strong>{initialHtsCode}</strong></>}
                                </span>
                            </div>
                            <Button type="link" size="small" onClick={handleClearFilters}>
                                Clear Filters
                            </Button>
                        </div>
                    }
                    className="mb-4"
                />
            )}
            
            {/* Hero Search Area */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-8 rounded-2xl border border-teal-100">
                <div className="max-w-2xl mx-auto">
                    <Title level={3} className="text-center mb-2 text-slate-800">Find Verified Suppliers</Title>
                    <Text className="text-center block mb-6 text-slate-600">
                        Connect with vetted manufacturers from around the world
                    </Text>
                    <div className="flex gap-2">
                        <Input
                            size="large"
                            placeholder="Search by product, material, or HTS code..."
                            prefix={<Search className="text-slate-400" size={18} />}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            onPressEnter={handleSearch}
                            className="rounded-lg"
                        />
                        <Select
                            size="large"
                            placeholder="Country"
                            allowClear
                            style={{ width: 180 }}
                            value={countryFilter}
                            onChange={setCountryFilter}
                            options={
                                countries.length > 0
                                    ? countries.map(c => ({
                                        value: c.code,
                                        label: `${c.name} (${c.count})`,
                                    }))
                                    : COUNTRIES.map(c => ({
                                        value: c.value,
                                        label: c.label,
                                    }))
                            }
                        />
                        <Button 
                            type="primary" 
                            size="large" 
                            className="bg-teal-600"
                            onClick={handleSearch}
                            loading={loading}
                        >
                            Search
                        </Button>
                    </div>
                    {!isFiltered && (
                        <div className="mt-3 text-center">
                            <Text type="secondary" className="text-xs">
                                Popular: 
                                <Tag className="ml-2 cursor-pointer" onClick={() => { setSearchTerm('Cotton'); handleSearch(); }}>Cotton</Tag>
                                <Tag className="cursor-pointer" onClick={() => { setSearchTerm('Electronics'); handleSearch(); }}>Electronics</Tag>
                                <Tag className="cursor-pointer" onClick={() => { setSearchTerm('Leather'); handleSearch(); }}>Leather</Tag>
                            </Text>
                        </div>
                    )}
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <Row gutter={[16, 16]}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Col xs={24} md={12} xl={8} key={i}>
                            <Card className="h-full"><Skeleton active /></Card>
                        </Col>
                    ))}
                </Row>
            ) : suppliers.length === 0 ? (
                <Empty
                    description={
                        <div className="text-center">
                            <Text type="secondary">No suppliers found</Text>
                            <br />
                            <Text type="secondary" className="text-xs">
                                Try adjusting your search criteria
                            </Text>
                            {isFiltered && (
                                <Button type="link" onClick={handleClearFilters} className="mt-2">
                                    Clear all filters
                                </Button>
                            )}
                        </div>
                    }
                />
            ) : (
                <>
                    <div className="flex justify-between items-center">
                        <Text type="secondary">{total} verified suppliers found</Text>
                    </div>

                    <Row gutter={[16, 16]}>
                        {suppliers.map(supplier => {
                            const tierInfo = getTierLabel(supplier.tier);
                            const costInfo = getCostLabel(supplier.costTier);

                            return (
                                <Col xs={24} md={12} xl={8} key={supplier.id}>
                                    <Card
                                        hoverable
                                        className="h-full shadow-sm hover:shadow-md transition-shadow border-slate-100"
                                        onClick={() => setSelectedSupplier(supplier)}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-3">
                                                <Avatar 
                                                    shape="square" 
                                                    size={48} 
                                                    icon={<Building2 size={24} />} 
                                                    className="bg-slate-100 text-slate-500 shrink-0" 
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <Text strong className="truncate block">{supplier.name}</Text>
                                                        {supplier.isVerified && (
                                                            <CheckCircle size={14} className="text-green-500 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <MapPin size={12} className="text-slate-400" />
                                                        <Text type="secondary" className="text-xs">
                                                            {supplier.city || supplier.region}, {supplier.countryName}
                                                        </Text>
                                                    </div>
                                                </div>
                                            </div>

                                            <Paragraph 
                                                ellipsis={{ rows: 2 }} 
                                                className="text-slate-600 text-sm mb-0"
                                            >
                                                {supplier.description}
                                            </Paragraph>

                                            <div className="flex items-center gap-3 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Star size={12} className="text-amber-500" />
                                                    <span>{supplier.overallScore?.toFixed(0)}</span>
                                                </div>
                                                <Tag color={tierInfo.color} className="m-0">{tierInfo.label}</Tag>
                                                <Tag color={costInfo.color} className="m-0">{costInfo.label}</Tag>
                                            </div>

                                            <div className="flex flex-wrap gap-1">
                                                {supplier.certifications?.slice(0, 3).map(cert => (
                                                    <Tag key={cert} className="text-xs m-0 bg-slate-50">{cert}</Tag>
                                                ))}
                                                {(supplier.certifications?.length || 0) > 3 && (
                                                    <Tag className="text-xs m-0">+{supplier.certifications.length - 3}</Tag>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </>
            )}

            {/* Supplier Detail Drawer */}
            <Drawer
                title={
                    <div className="flex items-center gap-3">
                        <Avatar shape="square" size={40} icon={<Building2 />} className="bg-teal-100 text-teal-600" />
                        <div>
                            <Text strong>{selectedSupplier?.name}</Text>
                            <div className="flex items-center gap-2">
                                <MapPin size={12} className="text-slate-400" />
                                <Text type="secondary" className="text-xs">
                                    {selectedSupplier?.countryName}
                                </Text>
                            </div>
                        </div>
                    </div>
                }
                open={!!selectedSupplier}
                onClose={() => setSelectedSupplier(null)}
                size="large"
            >
                {selectedSupplier && (
                    <div className="space-y-6">
                        <Paragraph>{selectedSupplier.description}</Paragraph>

                        <Row gutter={[16, 16]}>
                            <Col span={8}>
                                <Statistic 
                                    title="Quality" 
                                    value={selectedSupplier.qualityScore} 
                                    suffix="/100"
                                    valueStyle={{ color: '#0D9488' }}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic 
                                    title="Reliability" 
                                    value={selectedSupplier.reliabilityScore} 
                                    suffix="/100"
                                    valueStyle={{ color: '#0D9488' }}
                                />
                            </Col>
                            <Col span={8}>
                                <Statistic 
                                    title="Response" 
                                    value={selectedSupplier.communicationScore} 
                                    suffix="/100"
                                    valueStyle={{ color: '#0D9488' }}
                                />
                            </Col>
                        </Row>

                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Location">
                                {[selectedSupplier.city, selectedSupplier.region, selectedSupplier.countryName]
                                    .filter(Boolean).join(', ')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Min Order">
                                {selectedSupplier.minOrderValue 
                                    ? `$${selectedSupplier.minOrderValue.toLocaleString()}`
                                    : 'Contact for MOQ'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Lead Time">
                                {selectedSupplier.typicalLeadDays 
                                    ? `${selectedSupplier.typicalLeadDays} days`
                                    : 'Varies'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Categories">
                                {selectedSupplier.productCategories?.join(', ')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Materials">
                                {selectedSupplier.materials?.join(', ')}
                            </Descriptions.Item>
                        </Descriptions>

                        <div>
                            <Text strong className="block mb-2">Certifications</Text>
                            <div className="flex flex-wrap gap-1">
                                {selectedSupplier.certifications?.map(cert => (
                                    <Tag key={cert} color="green">{cert}</Tag>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button type="primary" className="flex-1 bg-teal-600">
                                Request Quote
                            </Button>
                            <Button className="flex-1">
                                Save Supplier
                            </Button>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
};
