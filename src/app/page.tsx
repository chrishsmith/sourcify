'use client';

import React from 'react';
import { Button, Card, Typography, Tag } from 'antd';
import { ShieldCheck, Search, TrendingUp, Anchor } from 'lucide-react';

const { Title, Paragraph, Text } = Typography;

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-24">
      {/* Background decoration */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-400/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/20 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-12 max-w-4xl text-center">

        {/* Hero Section */}
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 p-4 rounded-2xl animate-bounce-slow">
              <Anchor className="w-12 h-12 text-teal-600" />
            </div>
          </div>
          <Title level={1} style={{ margin: 0, fontWeight: 800, color: '#18181B', fontSize: '4rem', letterSpacing: '-0.02em' }}>
            Sourcify
          </Title>
          <Paragraph className="text-xl text-slate-600 mt-6 max-w-2xl font-light leading-relaxed">
            AI-Powered Trade Compliance & Intelligent Sourcing for the modern enterprise.
          </Paragraph>
          <div className="flex flex-wrap gap-3 justify-center mt-6">
            <Tag bordered={false} className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 px-4 py-1.5 rounded-full text-teal-700 font-medium text-sm">Imports & Exports</Tag>
            <Tag bordered={false} className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 px-4 py-1.5 rounded-full text-amber-700 font-medium text-sm">Tariff Optimization</Tag>
            <Tag bordered={false} className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 px-4 py-1.5 rounded-full text-indigo-700 font-medium text-sm">Supplier Discovery</Tag>
          </div>
        </div>

        {/* Action Area */}
        <div className="flex gap-6">
          <Button type="primary" size="large" icon={<ShieldCheck size={20} />} className="h-14 px-8 text-lg shadow-xl shadow-teal-500/30">
            Start Compliance Check
          </Button>
          <Button size="large" icon={<Search size={20} />} className="h-14 px-8 text-lg bg-white/70 backdrop-blur-xl border border-white/50 shadow-xl shadow-slate-200/50 hover:bg-white/80">
            Explore Suppliers
          </Button>
        </div>

        {/* Feature Grid Verification */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8 w-full">
          <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-lg shadow-slate-200/40 hover:bg-white/80 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 rounded-3xl p-8 text-left group cursor-pointer">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-teal-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <Text strong className="text-lg block mb-1">AI Classifications</Text>
                <Text type="secondary" className="text-sm">Automated HTS & Schedule B codes with 98% accuracy.</Text>
              </div>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-lg shadow-slate-200/40 hover:bg-white/80 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 rounded-3xl p-8 text-left group cursor-pointer">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-amber-600">
                <TrendingUp size={24} />
              </div>
              <div>
                <Text strong className="text-lg block mb-1">Tariff Monitoring</Text>
                <Text type="secondary" className="text-sm">Real-time alerts on duty rate changes and trade policies.</Text>
              </div>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md border border-white/60 shadow-lg shadow-slate-200/40 hover:bg-white/80 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 rounded-3xl p-8 text-left group cursor-pointer">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform text-indigo-600">
                <Search size={24} />
              </div>
              <div>
                <Text strong className="text-lg block mb-1">Supplier Sourcing</Text>
                <Text type="secondary" className="text-sm">Access 11M+ verified suppliers filtered by capabilities.</Text>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
