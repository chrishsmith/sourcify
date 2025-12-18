'use client';

import React from 'react';
import { Layout, Typography } from 'antd';
import { Anchor } from 'lucide-react';
import { OnboardingWizard } from './OnboardingWizard';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function OnboardingPageContent() {
    return (
        <Layout className="min-h-screen bg-slate-50">
            <Header className="bg-white border-b border-slate-100 flex items-center px-8 h-16">
                <div className="flex items-center gap-2">
                    <div className="bg-teal-600 p-1.5 rounded-lg">
                        <Anchor className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg text-slate-800 tracking-tight">Sourcify</span>
                </div>
            </Header>
            <Content className="p-8 md:p-16 flex flex-col items-center">
                <div className="w-full max-w-2xl mb-8 text-center">
                    <Title level={2} style={{ color: '#18181B' }}>Welcome to Sourcify</Title>
                </div>
                <OnboardingWizard />
            </Content>
        </Layout>
    );
}
