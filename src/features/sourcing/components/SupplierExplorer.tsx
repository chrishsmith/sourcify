'use client';

import React, { useState } from 'react';
import { Input, Card, List, Tag, Button, Rate, Space, Avatar, Typography, Badge, Row, Col } from 'antd';
import { Search, MapPin, Building2, Zap, Filter } from 'lucide-react';

const { Text, Title, Paragraph } = Typography;

interface Supplier {
    id: string;
    name: string;
    country: string;
    matchScore: number;
    tier: string;
    tags: string[];
    description: string;
}

const mockSuppliers: Supplier[] = [
    {
        id: '1',
        name: 'Dongguan Tex-Pro Manufacturing',
        country: 'China',
        matchScore: 94,
        tier: 'Tier 1',
        tags: ['ISO 9001', 'Cotton', 'Fast Turnaround'],
        description: 'Specializes in high-volume cotton knits with automated cutting lines.',
    },
    {
        id: '2',
        name: 'Viet-Style Garment Co.',
        country: 'Vietnam',
        matchScore: 88,
        tier: 'Tier 1',
        tags: ['Eco-Certified', 'Duty Free', 'Low MOQ'],
        description: 'Sustainable production facility focusing on organic materials.',
    },
    {
        id: '3',
        name: 'Ankara Textiles Ltd.',
        country: 'Turkey',
        matchScore: 82,
        tier: 'Tier 2',
        tags: ['Near-Shore', 'High Quality', 'Denim'],
        description: 'Premium textile mill supplying major European brands.',
    },
];

export const SupplierExplorer: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <div className="space-y-6">
            {/* Search Area */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="max-w-2xl mx-auto">
                    <Title level={3} className="text-center mb-6 text-slate-800">Find Verified Suppliers</Title>
                    <div className="flex gap-2">
                        <Input
                            size="large"
                            placeholder="Search by product, material, or HTS code..."
                            prefix={<Search className="text-slate-400" size={18} />}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="rounded-lg"
                        />
                        <Button size="large" icon={<Filter size={18} />}>Filters</Button>
                        <Button type="primary" size="large" className="bg-teal-600">Search</Button>
                    </div>
                    <div className="mt-3 text-center">
                        <Text type="secondary" className="text-xs">
                            Popular: <Tag>Cotton T-Shirt</Tag> <Tag>PCB Board</Tag> <Tag>Aluminum</Tag>
                        </Text>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <Row gutter={[16, 16]}>
                {mockSuppliers.map(supplier => (
                    <Col xs={24} md={12} xl={8} key={supplier.id}>
                        <Card
                            hoverable
                            variant="borderless"
                            className="h-full shadow-sm hover:shadow-md transition-shadow"
                            actions={[
                                <Button key="contact" type="link">Contact</Button>,
                                <Button key="save" type="link">Save Profile</Button>
                            ]}
                        >
                            <Card.Meta
                                avatar={<Avatar shape="square" size={48} icon={<Building2 size={24} />} className="bg-slate-100 text-slate-500" />}
                                title={
                                    <div className="flex justify-between items-start">
                                        <span className="truncate pr-2" title={supplier.name}>{supplier.name}</span>
                                        <Badge count={`${supplier.matchScore}% Match`} style={{ backgroundColor: '#0D9488' }} />
                                    </div>
                                }
                                description={
                                    <div className="space-y-3 mt-2">
                                        <div className="flex items-center text-xs text-slate-500">
                                            <MapPin size={12} className="mr-1" /> {supplier.country}
                                            <span className="mx-2">•</span>
                                            <Zap size={12} className="mr-1 text-amber-500" /> {supplier.tier}
                                        </div>
                                        <Paragraph ellipsis={{ rows: 2 }} className="text-slate-600 text-sm mb-0">
                                            {supplier.description}
                                        </Paragraph>
                                        <div className="flex flex-wrap gap-1">
                                            {supplier.tags.map(tag => <Tag key={tag} className="text-xs m-0">{tag}</Tag>)}
                                        </div>
                                    </div>
                                }
                            />
                        </Card>
                    </Col>
                ))}

                {/* Mock "Load More" */}
                <Col xs={24}>
                    <div className="text-center py-8">
                        <Text type="secondary">Showing 3 of 11,204 results</Text>
                    </div>
                </Col>
            </Row>
        </div>
    );
};


