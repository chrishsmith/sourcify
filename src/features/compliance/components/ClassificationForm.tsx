'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Steps, message } from 'antd';
import { Loader2, CheckCircle, Zap } from 'lucide-react';
import { ClassificationResultDisplay } from './ClassificationResult';
import { ProductInputForm, ProductInputValues } from '@/components/shared';
import { saveClassification } from '@/services/classificationHistory';
import type { ClassificationInput, ClassificationResult } from '@/types/classification.types';

const { Title, Paragraph } = Typography;

// Loading steps for V10 semantic search (much faster!)
const LOADING_STEPS = [
    { title: 'Semantic Search', description: 'Finding best matches via AI embeddings' },
    { title: 'Scoring', description: 'Ranking candidates by relevance' },
    { title: 'Complete', description: 'Classification ready' },
];

export const ClassificationForm: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    const [result, setResult] = useState<ClassificationResult | null>(null);

    // Simulate loading progress (V10 is ~3-4 seconds total)
    useEffect(() => {
        if (loading) {
            const intervals = [800, 1500]; // Much faster with semantic search!
            let step = 0;

            const advanceStep = () => {
                if (step < 2) {
                    step++;
                    setLoadingStep(step);
                    if (step < 2) {
                        setTimeout(advanceStep, intervals[step] || 1000);
                    }
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
            // Build description from available fields
            const descriptionParts = [values.productDescription];
            if (values.materialComposition) descriptionParts.push(`Material: ${values.materialComposition}`);
            if (values.intendedUse) descriptionParts.push(`Use: ${values.intendedUse}`);
            const fullDescription = descriptionParts.join('. ');

            // Call V10 semantic search API
            const response = await fetch('/api/classify-v10', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: fullDescription,
                    origin: values.countryOfOrigin,
                    material: values.materialComposition,
                }),
            });

            if (!response.ok) {
                throw new Error('Classification failed');
            }

            const v10Result = await response.json();
            setLoadingStep(2);

            // Convert V10 result to ClassificationResult format
            const classificationResult: ClassificationResult = {
                id: crypto.randomUUID(),
                input: {
                    productName: values.productName,
                    productSku: values.productSku,
                    productDescription: values.productDescription,
                    classificationType: 'import',
                    countryOfOrigin: values.countryOfOrigin,
                    materialComposition: values.materialComposition,
                    intendedUse: values.intendedUse,
                },
                htsCode: {
                    code: v10Result.primary?.htsCodeFormatted || '',
                    description: v10Result.primary?.fullDescription || v10Result.primary?.shortDescription || '',
                    chapter: v10Result.primary?.path?.codes?.[0] || '',
                    heading: v10Result.primary?.path?.codes?.[1] || '',
                    subheading: v10Result.primary?.path?.codes?.[2] || '',
                },
                confidence: v10Result.primary?.confidence || 0,
                dutyRate: {
                    generalRate: v10Result.primary?.duty?.baseMfn || 'N/A',
                    specialPrograms: [],
                },
                rulings: [],
                alternativeCodes: v10Result.alternatives?.slice(0, 5).map((alt: { htsCodeFormatted: string; fullDescription: string; description: string; chapter: string }) => ({
                    code: alt.htsCodeFormatted,
                    description: alt.fullDescription || alt.description,
                    chapter: alt.chapter,
                    heading: alt.htsCodeFormatted.substring(0, 4),
                    subheading: alt.htsCodeFormatted.substring(0, 7),
                })) || [],
                rationale: v10Result.primary?.isOther 
                    ? `Classified as "Other" because the product doesn't match specific carve-outs: ${v10Result.primary?.otherExclusions?.join(', ') || 'N/A'}`
                    : `Best match based on semantic similarity and HTS tree analysis.`,
                createdAt: new Date(),
                effectiveTariff: v10Result.primary?.duty ? {
                    baseMfnRate: parseFloat(v10Result.primary.duty.baseMfn) || 0,
                    formattedBaseMfn: v10Result.primary.duty.baseMfn,
                    totalEffectiveRate: parseFloat(v10Result.primary.duty.effective) || 0,
                    formattedEffective: v10Result.primary.duty.effective,
                    additionalDuties: [],
                    breakdown: [],
                } : undefined,
                humanReadablePath: v10Result.primary?.path?.descriptions?.join(' → ') || '',
                searchHistoryId: v10Result.searchHistoryId,
                suggestedProductName: values.productName || v10Result.searchTerms?.join(' ') || 'Product',
            };

            // Save to history
            saveClassification(classificationResult);

            // Short delay to show completion step
            await new Promise(resolve => setTimeout(resolve, 300));

            setResult(classificationResult);
            messageApi.success(`Classification complete in ${(v10Result.timing?.total / 1000).toFixed(1)}s!`);
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
                                <Zap size={20} className="inline mr-2 text-amber-500" />
                                Classifying Your Product
                            </Title>
                            <Paragraph className="text-slate-500 mb-0 mt-2">
                                Using semantic AI search — typically 3-5 seconds
                            </Paragraph>
                        </div>

                        <Steps
                            current={loadingStep}
                            direction="vertical"
                            size="small"
                            items={LOADING_STEPS.map((step, idx) => ({
                                title: step.title,
                                description: step.description,
                                icon: idx === loadingStep && idx < 2 ? (
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
