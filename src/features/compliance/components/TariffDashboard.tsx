'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Typography, Button, Alert, Space } from 'antd';
import { TrendingUp, AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

const { Text } = Typography;

interface AlertRecord {
    key: string;
    product: string;
    origin: string;
    change: string;
    oldRate: string;
    newRate: string;
    impact: string;
    severity: 'high' | 'medium' | 'low';
}

export default function TariffDashboard() {
    // Mock Data
    const alerts: AlertRecord[] = [
        {
            key: '1',
            product: 'Aluminum Alloy Sheets',
            origin: 'China',
            change: 'Section 301 Update',
            oldRate: '0%',
            newRate: '25%',
            impact: '+$12,500/yr',
            severity: 'high',
        },
        {
            key: '2',
            product: 'Cotton T-Shirts',
            origin: 'Vietnam',
            change: 'Normal Trade Relations',
            oldRate: '16.5%',
            newRate: '16.5%',
            impact: '$0',
            severity: 'low',
        },
        {
            key: '3',
            product: 'Electric Motors',
            origin: 'Germany',
            change: 'EU Steel/Alu Dispute',
            oldRate: '2.5%',
            newRate: '2.5%',
            impact: 'Watchlist',
            severity: 'medium',
        },
    ];

    const columns = [
        { title: 'Product', dataIndex: 'product', key: 'product', render: (t: string) => <Text strong>{t}</Text> },
        { title: 'Origin', dataIndex: 'origin', key: 'origin' },
        { title: 'Policy Change', dataIndex: 'change', key: 'change' },
        {
            title: 'Rate Impact',
            key: 'rate',
            render: (_: unknown, r: AlertRecord) => (
                <Space orientation="vertical" size={0}>
                    <Text delete type="secondary" className="text-xs">{r.oldRate}</Text>
                    <Text strong type={r.severity === 'high' ? 'danger' : undefined}>{r.newRate}</Text>
                </Space>
            )
        },
        {
            title: 'Est. Cost',
            dataIndex: 'impact',
            key: 'impact',
            render: (t: string, r: AlertRecord) => <Text type={r.severity === 'high' ? 'danger' : undefined}>{t}</Text>
        },
        {
            title: 'Status',
            key: 'action',
            render: (_: unknown, r: AlertRecord) => {
                if (r.severity === 'high') return <Tag icon={<AlertTriangle size={12} />} color="error">Action Req.</Tag>;
                if (r.severity === 'medium') return <Tag color="warning">Monitor</Tag>;
                return <Tag color="success">Stable</Tag>;
            }
        }
    ];

    return (
        <div className="space-y-6">
            <Alert
                title="Critical Policy Update: United States Section 301"
                description="New exclusions expire on Dec 31st. Review your aluminum imports immediately."
                type="error"
                showIcon
                icon={<ShieldAlert size={20} />}
                action={
                    <Button size="small" danger ghost>
                        Review Impacts
                    </Button>
                }
            />

            <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                    <Card variant="borderless" className="shadow-sm">
                        <Statistic
                            title="projected Cost Increase"
                            value={12500}
                            precision={2}
                            prefix="$"
                            styles={{ content: { color: '#EF4444' } }}
                            suffix={<TrendingUp size={16} className="text-red-500 ml-1" />}
                        />
                        <Text type="secondary" className="text-xs">Based on current open orders</Text>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card variant="borderless" className="shadow-sm">
                        <Statistic
                            title="Monitored Products"
                            value={142}
                            prefix={<ShieldAlert size={16} className="text-teal-600 mr-2" />}
                        />
                        <Text type="secondary" className="text-xs">All active classifications</Text>
                    </Card>
                </Col>
                <Col xs={24} md={8}>
                    <Card variant="borderless" className="shadow-sm">
                        <Statistic
                            title="FTA Opportunities"
                            value={3}
                            prefix={<ArrowRight size={16} className="text-teal-600 mr-2" />}
                            styles={{ content: { color: '#0D9488' } }}
                        />
                        <Text type="secondary" className="text-xs">Potential savings found</Text>
                    </Card>
                </Col>
            </Row>

            <Card title="Tariff Watchlist" variant="borderless" className="shadow-sm">
                <Table dataSource={alerts} columns={columns} pagination={false} />
            </Card>
        </div>
    );
};
