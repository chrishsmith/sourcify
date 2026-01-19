'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Drawer, Spin } from 'antd';
import type { MenuProps } from 'antd';
import {
    LayoutDashboard,
    Sparkles,
    FolderOpen,
    Settings,
    Bell,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Anchor,
    Globe,
    Menu as MenuIcon,
    X,
    Lock,
    Crown,
    FlaskConical,
    Scale,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/auth-client';

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    
    // Get session from Better Auth
    const { data: session, isPending: isSessionLoading } = useSession();

    // Handle responsive breakpoint
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
            if (window.innerWidth >= 768) {
                setMobileOpen(false);
            }
        };
        
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);
    
    // Auto-login for development mode - only if ?dev=1 is in URL (one-time trigger)
    const [attemptedAutoLogin, setAttemptedAutoLogin] = useState(false);
    
    useEffect(() => {
        if (isSessionLoading || session?.user || attemptedAutoLogin) return;
        
        // Only auto-login when explicitly requested via URL param
        // This prevents infinite redirect loops
        const params = new URLSearchParams(window.location.search);
        const hasDevParam = params.get('dev') === '1';
        
        if (hasDevParam) {
            setAttemptedAutoLogin(true);
            // Store that we want dev mode, but remove the URL param to prevent re-triggering
            localStorage.setItem('devAutoLogin', 'true');
            const currentPath = window.location.pathname;
            // Redirect to dev-login WITHOUT the dev param in the redirect URL
            window.location.href = `/api/auth/dev-login?redirect=${encodeURIComponent(currentPath)}`;
        }
    }, [session, isSessionLoading, attemptedAutoLogin]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // TODO: Get user tier from session for badge display
    const userTier = 'free'; // Will be replaced with actual tier check
    const isPro = userTier !== 'free';
    
    const menuItems: MenuProps['items'] = [
        {
            key: '/dashboard',
            icon: <LayoutDashboard size={18} />,
            label: 'Overview',
        },
        {
            key: '/dashboard/classifications',
            icon: <Sparkles size={18} />,
            label: 'Classify',
        },
        {
            key: '/dashboard/optimizer',
            icon: <Scale size={18} />,
            label: (
                <span className="flex items-center gap-2">
                    Optimize
                    {!isPro && <Crown size={12} className="text-amber-500" />}
                </span>
            ),
        },
        {
            key: '/dashboard/products',
            icon: <FolderOpen size={18} />,
            label: 'My Products',
        },
        {
            key: '/dashboard/sourcing',
            icon: <Globe size={18} />,
            label: (
                <span className="flex items-center gap-2">
                    Sourcing
                    {!isPro && <Crown size={12} className="text-amber-500" />}
                </span>
            ),
        },
        {
            type: 'divider',
        },
        {
            key: '/dashboard/roadmap',
            icon: <FlaskConical size={18} />,
            label: 'Feature Lab',
        },
        {
            key: '/dashboard/settings',
            icon: <Settings size={18} />,
            label: 'Settings',
        },
    ];

    // Get selected key - handle route variations
    const getSelectedKey = () => {
        if (pathname.startsWith('/dashboard/classify')) {
            return '/dashboard/classifications';
        }
        if (pathname.startsWith('/dashboard/monitoring')) {
            return '/dashboard/products';
        }
        // Handle old suppliers route - redirect to sourcing
        if (pathname.startsWith('/dashboard/suppliers')) {
            return '/dashboard/sourcing';
        }
        return pathname;
    };

    const handleMenuClick = ({ key }: { key: string }) => {
        router.push(key);
    };

    const Logo = ({ showText = true }: { showText?: boolean }) => (
        <div className="flex items-center gap-3">
            <div className="bg-teal-600 p-2 rounded-lg flex-shrink-0">
                <Anchor className="w-5 h-5 text-white" />
            </div>
            {showText && (
                <span className="font-semibold text-lg text-slate-900">Sourcify</span>
            )}
        </div>
    );

    const SidebarContent = ({ showCollapseButton = true }: { showCollapseButton?: boolean }) => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 flex items-center px-4 border-b border-slate-100 flex-shrink-0">
                <Logo showText={!collapsed || isMobile} />
            </div>

            {/* Navigation - scrollable */}
            <div className="flex-1 overflow-y-auto py-2">
                <Menu
                    mode="inline"
                    selectedKeys={[getSelectedKey()]}
                    items={menuItems}
                    onClick={handleMenuClick}
                    className="border-none"
                    style={{ background: 'transparent' }}
                />
            </div>

            {/* Collapse Toggle - fixed at bottom */}
            {showCollapseButton && !isMobile && (
                <div className="flex-shrink-0 p-4 border-t border-slate-100">
                    <Button
                        type="text"
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        icon={collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    >
                        {!collapsed && <span className="ml-2">Collapse</span>}
                    </Button>
                </div>
            )}
        </div>
    );

    // Get user initials from name
    const getUserInitials = (name: string | null | undefined) => {
        if (!name) return '?';
        const parts = name.split(' ').filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };
    
    const userName = session?.user?.name || 'User';
    const userEmail = session?.user?.email || '';
    const userInitials = getUserInitials(session?.user?.name);

    const UserMenu = () => (
        <Dropdown
            menu={{
                items: [
                    { key: 'profile', label: 'My Profile' },
                    { type: 'divider' },
                    { 
                        key: 'logout', 
                        icon: <LogOut size={14} />, 
                        label: 'Sign Out', 
                        danger: true, 
                        onClick: () => router.push('/login') 
                    }
                ]
            }}
            trigger={['click']}
            placement="bottomRight"
        >
            <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 py-1.5 px-2 rounded-lg transition-colors">
                <Avatar size={32} style={{ backgroundColor: '#0D9488' }}>{userInitials}</Avatar>
                <div className="hidden sm:block text-sm leading-tight">
                    <div className="font-medium text-slate-900">{userName}</div>
                    <div className="text-slate-500 text-xs">{userEmail}</div>
                </div>
            </div>
        </Dropdown>
    );

    // Get page title from pathname
    const getPageTitle = () => {
        const segment = pathname.split('/').pop() || 'dashboard';
        const titles: Record<string, string> = {
            'dashboard': 'Overview',
            'classifications': 'Classify',
            'classify': 'Classify Product',
            'optimizer': 'Strategic Classification',
            'products': 'My Products',
            'sourcing': 'Sourcing Intelligence',
            'roadmap': 'Feature Lab',
            'settings': 'Settings',
        };
        return titles[segment] || segment.replace('-', ' ');
    };

    // Show loading while checking session
    if (isSessionLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Spin size="large" />
                    <p className="mt-4 text-slate-500">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <Layout className="min-h-screen">
            {/* Desktop Sidebar */}
            {!isMobile && (
                <Sider
                    trigger={null}
                    collapsible
                    collapsed={collapsed}
                    width={240}
                    collapsedWidth={72}
                    className="!bg-white border-r border-slate-200 !fixed left-0 top-0 bottom-0 z-20"
                    theme="light"
                    style={{ 
                        height: '100vh',
                        overflow: 'hidden',
                    }}
                >
                    <SidebarContent />
                </Sider>
            )}

            {/* Mobile Drawer */}
            <Drawer
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                placement="left"
                styles={{ wrapper: { width: 280 } }}
                closable={false}
                styles={{ 
                    body: { padding: 0 },
                    header: { display: 'none' }
                }}
            >
                <div className="h-full bg-white">
                    {/* Mobile drawer header with close button */}
                    <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
                        <Logo />
                        <Button
                            type="text"
                            icon={<X size={20} />}
                            onClick={() => setMobileOpen(false)}
                            className="text-slate-500 hover:text-slate-700"
                        />
                    </div>
                    
                    {/* Navigation */}
                    <div className="py-2 overflow-y-auto" style={{ height: 'calc(100vh - 64px)' }}>
                        <Menu
                            mode="inline"
                            selectedKeys={[getSelectedKey()]}
                            items={menuItems}
                            onClick={handleMenuClick}
                            className="border-none"
                            style={{ background: 'transparent' }}
                        />
                    </div>
                </div>
            </Drawer>

            {/* Main Layout */}
            <Layout 
                className="transition-all duration-200"
                style={{ 
                    marginLeft: isMobile ? 0 : (collapsed ? 72 : 240),
                }}
            >
                {/* Header */}
                <Header 
                    className="!bg-white border-b border-slate-200 !h-16 !px-4 md:!px-6 flex items-center justify-between sticky top-0 z-10"
                    style={{ lineHeight: 'normal' }}
                >
                    <div className="flex items-center gap-3">
                        {/* Mobile menu button */}
                        {isMobile && (
                            <Button
                                type="text"
                                icon={<MenuIcon size={20} />}
                                onClick={() => setMobileOpen(true)}
                                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 -ml-2"
                            />
                        )}
                        <h1 className="text-lg font-semibold text-slate-900 m-0 capitalize">
                            {getPageTitle()}
                        </h1>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2">
                        <Button
                            type="text"
                            shape="circle"
                            icon={<Bell size={18} className="text-slate-500" />}
                            className="hover:bg-slate-100"
                            aria-label="Notifications"
                        />
                        <UserMenu />
                    </div>
                </Header>

                {/* Content */}
                <Content className="p-4 md:p-6 lg:p-8 bg-slate-50 min-h-[calc(100vh-64px)]">
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};
