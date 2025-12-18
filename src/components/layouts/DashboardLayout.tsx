'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
    LayoutDashboard,
    ShieldCheck,
    TrendingUp,
    Search,
    Settings,
    Bell,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Anchor
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <LayoutDashboard size={18} />,
            label: 'Overview',
        },
        {
            key: '/dashboard/classifications',
            icon: <ShieldCheck size={18} />,
            label: 'Classifications',
        },
        {
            key: '/dashboard/monitoring',
            icon: <TrendingUp size={18} />,
            label: 'Tariff Monitoring',
        },
        {
            key: '/dashboard/suppliers',
            icon: <Search size={18} />,
            label: 'Supplier Explorer',
        },
        {
            type: 'divider',
        },
        {
            key: '/dashboard/settings',
            icon: <Settings size={18} />,
            label: 'Settings',
        },
    ];

    return (
        <Layout className="min-h-screen">
            {/* Clean White Sidebar */}
            <Sider
                trigger={null}
                collapsible
                collapsed={collapsed}
                width={240}
                collapsedWidth={72}
                className="bg-white border-r border-slate-200 h-screen sticky top-0 left-0"
                theme="light"
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="bg-teal-600 p-2 rounded-lg">
                            <Anchor className="w-5 h-5 text-white" />
                        </div>
                        {!collapsed && (
                            <span className="font-semibold text-lg text-slate-900">Sourcify</span>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <Menu
                    mode="inline"
                    selectedKeys={[pathname]}
                    items={menuItems}
                    onClick={({ key }) => router.push(key)}
                    className="border-none mt-2"
                    style={{ background: 'transparent' }}
                />

                {/* Collapse Toggle */}
                <div className="absolute bottom-4 left-0 right-0 px-4">
                    <Button
                        type="text"
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        icon={collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    >
                        {!collapsed && <span className="ml-2">Collapse</span>}
                    </Button>
                </div>
            </Sider>

            <Layout>
                {/* Clean Header */}
                <Header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900 capitalize m-0">
                            {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="text"
                            shape="circle"
                            icon={<Bell size={18} className="text-slate-500" />}
                            className="hover:bg-slate-100"
                        />

                        <Dropdown
                            menu={{
                                items: [
                                    { key: 'profile', label: 'My Profile' },
                                    { type: 'divider' },
                                    { key: 'logout', icon: <LogOut size={14} />, label: 'Sign Out', danger: true, onClick: () => router.push('/login') }
                                ]
                            }}
                        >
                            <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 py-1.5 px-2 rounded-lg">
                                <Avatar size={32} style={{ backgroundColor: '#0D9488' }}>JD</Avatar>
                                <div className="hidden md:block text-sm leading-tight">
                                    <div className="font-medium text-slate-900">John Doe</div>
                                    <div className="text-slate-500 text-xs">Acme Corp</div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content className="p-6 bg-slate-50">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};
