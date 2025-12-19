'use client';

import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Select, Typography, Steps, message } from 'antd';
import { Sparkles, Globe, Package, Wrench, Search, CheckCircle, Database, Loader2 } from 'lucide-react';
import { ClassificationResultDisplay } from './ClassificationResult';
import { saveClassification } from '@/services/classificationHistory';
import type { ClassificationInput, ClassificationResult } from '@/types/classification.types';

const { TextArea } = Input;
const { Text, Title, Paragraph } = Typography;

// Common countries for origin
const COUNTRIES = [
    { value: 'CN', label: '🇨🇳 China' },
    { value: 'MX', label: '🇲🇽 Mexico' },
    { value: 'CA', label: '🇨🇦 Canada' },
    { value: 'DE', label: '🇩🇪 Germany' },
    { value: 'JP', label: '🇯🇵 Japan' },
    { value: 'KR', label: '🇰🇷 South Korea' },
    { value: 'VN', label: '🇻🇳 Vietnam' },
    { value: 'IN', label: '🇮🇳 India' },
    { value: 'TW', label: '🇹🇼 Taiwan' },
    { value: 'TH', label: '🇹🇭 Thailand' },
    { value: 'GB', label: '🇬🇧 United Kingdom' },
    { value: 'IT', label: '🇮🇹 Italy' },
    { value: 'FR', label: '🇫🇷 France' },
    { value: 'OTHER', label: '🌍 Other' },
];

// Loading steps for progress indicator
const LOADING_STEPS = [
    { title: 'Analyzing Product', description: 'Understanding your product details' },
    { title: 'AI Classification', description: 'Consulting Grok for HTS code' },
    { title: 'USITC Validation', description: 'Verifying against official database' },
    { title: 'Complete', description: 'Classification ready' },
];

export const ClassificationForm: React.FC = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState<ClassificationResult | null>(null);

    // Simulate loading progress
    useEffect(() => {
        if (loading) {
            const intervals = [500, 3000, 12000]; // Timing for each step
            let step = 0;

            const advanceStep = () => {
                if (step < 2) {
                    step++;
                    setLoadingStep(step);
                    setTimeout(advanceStep, intervals[step] || 5000);
                }
            };

            setTimeout(advanceStep, intervals[0]);
        } else {
            setLoadingStep(0);
        }
    }, [loading]);

    const onFinish = async (values: {
        productName?: string;
        productSku?: string;
        productDescription: string;
        countryOfOrigin?: string;
        materialComposition?: string;
        intendedUse?: string;
    }) => {
        setLoading(true);
        setLoadingStep(0);

        try {
            const input: ClassificationInput = {
                productName: values.productName,
                productSku: values.productSku,
                productDescription: values.productDescription,
                classificationType: 'import',
                countryOfOrigin: values.countryOfOrigin,
                materialComposition: values.materialComposition,
                intendedUse: values.intendedUse,
            };

            const response = await fetch('/api/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            if (!response.ok) {
                throw new Error('Classification failed');
            }

            const classificationResult = await response.json();
            setLoadingStep(3); // Complete

            // Save to history
            saveClassification(classificationResult);

            // Short delay to show completion step
            await new Promise(resolve => setTimeout(resolve, 500));

            setResult(classificationResult);
            message.success('Classification complete!');
        } catch (error) {
            console.error('Classification failed:', error);
            message.error('Classification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewClassification = () => {
        setResult(null);
        form.resetFields();
    };

    // Show result if we have one
    if (result) {
        return <ClassificationResultDisplay result={result} onNewClassification={handleNewClassification} />;
    }

    // Loading state with steps
    if (loading) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card className="border border-slate-200 shadow-sm">
                    <div className="py-8 px-4">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
                                <Loader2 size={32} className="text-teal-600 animate-spin" />
                            </div>
                            <Title level={4} className="m-0 text-slate-900">
                                Classifying Your Product
                            </Title>
                            <Paragraph className="text-slate-500 mb-0 mt-2">
                                This typically takes 15-20 seconds for accurate results
                            </Paragraph>
                        </div>

                        <Steps
                            current={loadingStep}
                            orientation="vertical"
                            size="small"
                            items={LOADING_STEPS.map((step, idx) => ({
                                title: step.title,
                                subTitle: step.description,
                                icon: idx === loadingStep && idx < 3 ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : idx < loadingStep ? (
                                    <CheckCircle size={16} className="text-green-500" />
                                ) : undefined,
                            }))}
                            className="max-w-md mx-auto"
                        />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <Card className="border border-slate-200 shadow-sm">
                <div className="mb-6">
                    <Title level={4} className="m-0 text-slate-900">Product Details</Title>
                    <Text className="text-slate-500">
                        Provide as much detail as possible for accurate classification.
                    </Text>
                </div>

                <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
                    {/* Product Identification - Optional but helpful */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-1">
                        <Form.Item
                            label={
                                <span className="text-slate-700 font-medium">
                                    Product Name (Optional)
                                </span>
                            }
                            name="productName"
                            tooltip="A short, friendly name for this product that you'll use to identify it later"
                        >
                            <Input
                                placeholder="e.g., Widget A, Blue Connector, Safety Valve"
                                size="large"
                            />
                        </Form.Item>

                        <Form.Item
                            label={
                                <span className="text-slate-700 font-medium">
                                    SKU / Part Number (Optional)
                                </span>
                            }
                            name="productSku"
                            tooltip="Your internal part number or SKU for reference and linking to other systems"
                        >
                            <Input
                                placeholder="e.g., SKU-12345, PART-001"
                                size="large"
                            />
                        </Form.Item>
                    </div>

                    {/* Product Description - Main Input */}
                    <Form.Item
                        label={
                            <span className="flex items-center gap-2 text-slate-700 font-medium">
                                <Package size={16} />
                                Product Description
                            </span>
                        }
                        name="productDescription"
                        rules={[
                            { required: true, message: 'Please describe the product' },
                            { min: 20, message: 'Please provide at least 20 characters for accurate classification' }
                        ]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Example: Plastic housing for electronics made of nylon 6/6, injection molded, used as protective enclosure for building control systems."
                            className="text-base"
                            showCount
                            maxLength={2000}
                        />
                    </Form.Item>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Country of Origin */}
                        <Form.Item
                            label={
                                <span className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Globe size={16} />
                                    Country of Origin
                                </span>
                            }
                            name="countryOfOrigin"
                        >
                            <Select
                                placeholder="Select country"
                                options={COUNTRIES}
                                showSearch
                                filterOption={(input, option) =>
                                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                }
                                allowClear
                                size="large"
                            />
                        </Form.Item>

                        {/* Intended Use */}
                        <Form.Item
                            label={
                                <span className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Wrench size={16} />
                                    Intended Use
                                </span>
                            }
                            name="intendedUse"
                        >
                            <Input
                                placeholder="e.g., Building automation, industrial machinery"
                                size="large"
                            />
                        </Form.Item>
                    </div>

                    {/* Material Composition */}
                    <Form.Item
                        label={
                            <span className="text-slate-700 font-medium">
                                Material Composition (Optional)
                            </span>
                        }
                        name="materialComposition"
                    >
                        <Input
                            placeholder="e.g., Nylon 6/6, ABS plastic, 60% cotton / 40% polyester"
                            size="large"
                        />
                    </Form.Item>

                    {/* Submit Button */}
                    <Form.Item className="mb-0 mt-8">
                        <Button
                            type="primary"
                            htmlType="submit"
                            size="large"
                            icon={<Sparkles size={18} />}
                            className="h-14 px-10 text-base font-medium"
                            loading={loading}
                        >
                            Generate HTS Classification
                        </Button>
                    </Form.Item>

                    {/* AI Info */}
                    <div className="mt-8 p-5 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-100 flex items-start gap-4">
                        <div className="shrink-0 w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Sparkles size={20} className="text-teal-600" />
                        </div>
                        <div>
                            <Text className="text-teal-800 font-semibold block text-base">
                                AI + Official USITC Validation
                            </Text>
                            <Text className="text-teal-700 text-sm leading-relaxed mt-1 block">
                                Our AI analyzes your product, then validates the result against the official
                                USITC Harmonized Tariff Schedule database for accurate duty rates.
                            </Text>
                        </div>
                    </div>
                </Form>
            </Card>
        </div>
    );
};
