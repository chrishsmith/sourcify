'use client';

import React from 'react';
import { Layout, Typography, Space } from 'antd';
import { Anchor } from 'lucide-react';

const { Content } = Layout;
const { Title, Text } = Typography;

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
    return (
        <Layout className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <Content className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl shadow-slate-200 border border-slate-100">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="bg-teal-600 p-3 rounded-xl shadow-lg shadow-teal-600/20 mb-4">
                        <Anchor className="w-8 h-8 text-white" />
                    </div>
                    <Title level={3} style={{ margin: '0 0 8px 0', color: '#18181B' }}>
                        {title}
                    </Title>
                    <Text type="secondary" className="text-slate-500">
                        {subtitle}
                    </Text>
                </div>
                {children}
            </Content>
            <div className="fixed bottom-4 text-center">
                <Text type="secondary" className="text-xs">
                    © 2026 Sourcify Inc. Secure Enterprise Login.
                </Text>
            </div>
        </Layout>
    );
};
