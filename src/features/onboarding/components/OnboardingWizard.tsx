'use client';

import React, { useState } from 'react';
import { Steps, Card, Button, Upload, Input, Typography, Spin, Result, message } from 'antd';
import { UploadCloud, Search, CheckCircle, ArrowRight, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

const { Title, Paragraph, Text } = Typography;
const { Dragger } = Upload;
const { TextArea } = Input;

export const OnboardingWizard: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const [productDesc, setProductDesc] = useState('');
    const router = useRouter();

    const handleAnalyze = () => {
        if (!productDesc) {
            message.error('Please enter a product description');
            return;
        }
        setCurrent(1);

        // Mock AI Analysis
        setTimeout(() => {
            setCurrent(2);
        }, 2500);
    };

    const steps = [
        {
            title: 'Upload Product',
            icon: <UploadCloud size={20} />,
            content: (
                <div className="py-8">
                    <div className="text-center mb-8">
                        <Title level={4}>Let&apos;s classify your first product</Title>
                        <Paragraph type="secondary">
                            Upload a spec sheet or simply describe your product below.
                        </Paragraph>
                    </div>

                    <div className="space-y-6">
                        <Dragger
                            height={150}
                            className="bg-slate-50 border-teal-100 hover:border-teal-500"
                            style={{ borderRadius: '12px' }}
                        >
                            <p className="ant-upload-drag-icon text-teal-600">
                                <FileText size={32} />
                            </p>
                            <p className="ant-upload-text">Drag & drop spec sheet (PDF, CSV)</p>
                        </Dragger>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-slate-500">Or type description</span>
                            </div>
                        </div>

                        <TextArea
                            rows={4}
                            placeholder="E.g., Women's cotton t-shirt with screen print, knitted, 100% cotton..."
                            value={productDesc}
                            onChange={(e) => setProductDesc(e.target.value)}
                            className="rounded-xl border-slate-200 focus:border-teal-500"
                        />
                    </div>
                </div>
            ),
        },
        {
            title: 'AI Analysis',
            icon: <Search size={20} />,
            content: (
                <div className="py-16 text-center">
                    <Spin size="large" tip="Consulting USITC Database..." />
                    <div className="mt-8 space-y-2">
                        <Text strong className="block text-lg">Analyzing Trade Regulations</Text>
                        <Text type="secondary">Checking HTS codes, Schedule B, and ECCN compliance...</Text>
                    </div>
                </div>
            ),
        },
        {
            title: 'Results',
            icon: <CheckCircle size={20} />,
            content: (
                <div className="py-8">
                    <Result
                        status="success"
                        title="Classification Complete!"
                        subTitle="We found a high-confidence match for your product."
                        extra={[
                            <Card key="result" className="mb-6 bg-slate-50 border-teal-100 text-left max-w-sm mx-auto shadow-sm">
                                <div className="space-y-1">
                                    <Text type="secondary" className="text-xs uppercase font-bold tracking-wide">Suggested HTS Code</Text>
                                    <div className="text-2xl font-bold text-teal-700">6109.10.00</div>
                                    <Text className="text-slate-600">T-shirts, singlets and other vests; knitted or crocheted, of cotton</Text>
                                    <div className="pt-2">
                                        <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full font-medium">98% Confidence</span>
                                    </div>
                                </div>
                            </Card>
                        ]}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="w-full max-w-2xl mx-auto">
            <Steps
                current={current}
                items={steps.map(s => ({ title: s.title, icon: s.icon }))}
                className="mb-8"
            />

            <Card className="shadow-xl shadow-slate-200/60 border-slate-100 rounded-2xl overflow-hidden">
                <div className="min-h-[400px] flex flex-col justify-between">
                    {steps[current].content}

                    <div className="flex justify-end pt-6 border-t border-slate-100">
                        {current === 0 && (
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleAnalyze}
                                className="bg-teal-600 hover:bg-teal-500 shadow-lg shadow-teal-600/30"
                                icon={<ArrowRight size={18} />}
                            >
                                Analyze Product
                            </Button>
                        )}
                        {current === 2 && (
                            <Button
                                type="primary"
                                size="large"
                                onClick={() => router.push('/dashboard')}
                                className="bg-teal-600 hover:bg-teal-500"
                            >
                                Go to Dashboard
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {current === 0 && (
                <div className="mt-8 text-center">
                    <Button type="text" onClick={() => router.push('/dashboard')}>Skip onboarding</Button>
                </div>
            )}
        </div>
    );
};
