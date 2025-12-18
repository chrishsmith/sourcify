'use client';

import React from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Tag, Progress } from 'antd';
import { ShieldCheck, TrendingDown, DollarSign, Globe, ArrowUpRight } from 'lucide-react';

const { Title, Text } = Typography;

export const DashboardOverview = () => {

    // Mock Data
    const stats = [
        { title: 'Total Savings', value: '$124,500', prefix: <DollarSign size={20} />, color: '#10B981', trend: '+12%', bg: 'bg-emerald-50/50' },
        { title: 'Active Classifications', value: '1,284', prefix: <ShieldCheck size={20} />, color: '#0D9488', trend: '+5%', bg: 'bg-teal-50/50' },
        { title: 'Avg. Duty Rate', value: '4.2%', prefix: <TrendingDown size={20} />, color: '#F59E0B', trend: '-0.8%', bg: 'bg-amber-50/50' },
        { title: 'Suppliers Monitored', value: '42', prefix: <Globe size={20} />, color: '#6366F1', trend: '+2', bg: 'bg-indigo-50/50' },
    ];

    const recentActivity = [
        { key: '1', product: 'Cotton T-Shirt', action: 'Classified', date: '2 mins ago', status: 'Completed' },
        { key: '2', product: 'Aluminum Sheet', action: 'Tariff Alert', date: '1 hour ago', status: 'Warning' },
        { key: '3', product: 'Circuit Board', action: 'Supplier Check', date: '3 hours ago', status: 'Completed' },
    ];

    const columns = [
        { title: 'Product', dataIndex: 'product', key: 'product', render: (text: string) => <Text strong className="text-slate-700">{text}</Text> },
        { title: 'Action', dataIndex: 'action', key: 'action', render: (text: string) => <Text className="text-slate-600">{text}</Text> },
        { title: 'Time', dataIndex: 'date', key: 'date', render: (text: string) => <Text type="secondary" className="text-xs">{text}</Text> },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag variant="filled" color={status === 'Completed' ? 'success' : 'warning'} className="rounded-full px-3">
                    {status}
                </Tag>
            )
        }
    ];

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <Title level={2} style={{ margin: 0, color: '#0F172A' }}>Overview</Title>
                    <Text className="text-slate-500 text-lg">Welcome back, here is your supply chain at a glance.</Text>
                </div>
            </div>

            {/* Stats Grid */}
            <Row gutter={[24, 24]}>
                {stats.map((stat, idx) => (
                    <Col xs={24} sm={12} lg={6} key={idx}>
                        <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-lg shadow-slate-200/40 hover:bg-white/80 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 rounded-2xl p-6 h-full relative overflow-hidden group">
                            {/* Background Blob for Glow Effect */}
                            <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${stat.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />

                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-xl ${stat.bg}`}>
                                        <span style={{ color: stat.color }}>{stat.prefix}</span>
                                    </div>
                                    <div className="flex items-center text-xs font-semibold bg-white/50 px-2 py-1 rounded-lg backdrop-blur-sm" style={{ color: stat.color }}>
                                        <ArrowUpRight size={14} className="mr-1" />
                                        {stat.trend}
                                    </div>
                                </div>

                                <Statistic
                                    title={<Text className="text-slate-500 font-medium">{stat.title}</Text>}
                                    value={stat.value}
                                    styles={{ content: { fontWeight: 700, color: '#1E293B', fontSize: '1.75rem', letterSpacing: '-0.02em' } }}
                                />
                            </div>
                        </div>
                    </Col>
                ))}
            </Row>

            <Row gutter={[24, 24]}>
                {/* Main Chart Area (Placeholder) */}
                <Col xs={24} lg={16}>
                    <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 rounded-3xl p-8 h-full">
                        <div className="mb-6">
                            <Title level={4} style={{ margin: 0 }}>Duty Savings Realized</Title>
                            <Text type="secondary">Cumulative savings from automated classification.</Text>
                        </div>
                        <div className="h-[350px] flex items-center justify-center bg-gradient-to-b from-slate-50/50 to-slate-100/50 rounded-2xl border border-dashed border-slate-200 group hover:border-teal-200 transition-colors">
                            <div className="text-center">
                                <div className="bg-white p-4 rounded-full shadow-lg shadow-teal-900/5 mb-4 inline-block">
                                    <DollarSign size={32} className="text-teal-600" />
                                </div>
                                <p className="text-slate-500 font-medium">Chart Visualization Placeholder</p>
                                <p className="text-slate-400 text-sm">(Recharts Integration)</p>
                            </div>
                        </div>
                    </div>
                </Col>

                {/* Sidebar Widgets */}
                <Col xs={24} lg={8}>
                    <div className="space-y-6">
                        <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 rounded-3xl p-6">
                            <Title level={5} className="mb-6">Compliance Health</Title>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <Text className="text-slate-600 font-medium">HTS Accuracy</Text>
                                        <Text strong className="text-teal-700">98%</Text>
                                    </div>
                                    <Progress
                                        percent={98}
                                        strokeColor={{ '0%': '#14B8A6', '100%': '#0F766E' }}
                                        railColor="rgba(203, 213, 225, 0.4)"
                                        showInfo={false}
                                        size={['100%', 8]}
                                    />
                                </div>
                                <div>
                                    <div className="flex justify-between mb-2">
                                        <Text className="text-slate-600 font-medium">Missing Docs</Text>
                                        <Text strong className="text-amber-600">12%</Text>
                                    </div>
                                    <Progress
                                        percent={12}
                                        strokeColor={{ '0%': '#FCD34D', '100%': '#D97706' }}
                                        railColor="rgba(203, 213, 225, 0.4)"
                                        showInfo={false}
                                        size={['100%', 8]}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 rounded-3xl p-0 overflow-hidden">
                            <div className="p-6 pb-2 border-b border-slate-100">
                                <Title level={5} style={{ margin: 0 }}>Recent Activity</Title>
                            </div>
                            <Table
                                dataSource={recentActivity}
                                columns={columns}
                                pagination={false}
                                size="middle"
                                showHeader={false}
                                className="bg-transparent"
                                rowClassName={() => "hover:bg-slate-50/50 transition-colors"}
                            />
                        </div>
                    </div>
                </Col>
            </Row>
        </div>
    );
};
