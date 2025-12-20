'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Steps, message } from 'antd';
import { Loader2, CheckCircle } from 'lucide-react';
import { ClassificationResultDisplay } from './ClassificationResult';
import { ProductInputForm, ProductInputValues } from '@/components/shared';
import { saveClassification } from '@/services/classificationHistory';
import type { ClassificationInput, ClassificationResult } from '@/types/classification.types';

const { Title, Paragraph } = Typography;

// Loading steps for progress indicator
const LOADING_STEPS = [
    { title: 'USITC Search', description: 'Finding verified HTS candidates' },
    { title: 'AI Selection', description: 'Identifying the best HTS match' },
    { title: 'Rate Calculation', description: 'Calculating taxes and additional duties' },
    { title: 'Complete', description: 'Classification ready' },
];

export const ClassificationForm: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState<ClassificationResult | null>(null);

    // Simulate loading progress
    useEffect(() => {
        if (loading) {
            const intervals = [500, 3000, 12000];
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

    const handleSubmit = async (values: ProductInputValues) => {
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
            setLoadingStep(3);

            // Save to history
            saveClassification(classificationResult);

            // Short delay to show completion step
            await new Promise(resolve => setTimeout(resolve, 500));

            setResult(classificationResult);
            messageApi.success('Classification complete!');
        } catch (error) {
            console.error('Classification failed:', error);
            messageApi.error('Classification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleNewClassification = () => {
        setResult(null);
    };

    // Show result if we have one
    if (result) {
        return (
            <>
                {contextHolder}
                <ClassificationResultDisplay result={result} onNewClassification={handleNewClassification} />
            </>
        );
    }

    // Loading state with steps
    if (loading) {
        return (
            <div className="max-w-2xl mx-auto">
                {contextHolder}
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
                            direction="vertical"
                            size="small"
                            items={LOADING_STEPS.map((step, idx) => ({
                                title: step.title,
                                description: step.description,
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
            {contextHolder}
            <Card className="border border-slate-200 shadow-sm">
                <div className="mb-6">
                    <Title level={4} className="m-0 text-slate-900">Product Details</Title>
                    <span className="text-slate-500">
                        Provide as much detail as possible for accurate classification.
                    </span>
                </div>

                <ProductInputForm
                    onSubmit={handleSubmit}
                    loading={loading}
                    submitText="Generate HTS Classification"
                    requireCountry={true}
                    showAiInfo={true}
                    variant="full"
                />
            </Card>
        </div>
    );
};
