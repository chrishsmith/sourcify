'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, InputNumber, Tag, Button, Collapse, Alert } from 'antd';
import { HelpCircle, DollarSign, Scale, Ruler, Package, ChevronRight, Info } from 'lucide-react';
import type { ConditionalClassification } from '@/types/classification.types';

const { Title, Text, Paragraph } = Typography;

interface ConditionalClassificationCardProps {
    conditional: ConditionalClassification;
    onSelectCode?: (htsCode: string) => void;
}

export const ConditionalClassificationCard: React.FC<ConditionalClassificationCardProps> = ({
    conditional,
    onSelectCode
}) => {
    const [inputValue, setInputValue] = useState<number | null>(null);
    const [showHelp, setShowHelp] = useState(false);

    // Determine which condition matches the input value
    const getMatchingConditionIndex = (): number | null => {
        if (inputValue === null) return null;

        for (let i = 0; i < conditional.conditions.length; i++) {
            const cond = conditional.conditions[i];
            const min = cond.minValue ?? -Infinity;
            const max = cond.maxValue ?? Infinity;

            if (inputValue >= min && inputValue <= max) {
                return i;
            }
        }
        return null;
    };

    const matchingIndex = getMatchingConditionIndex();

    // Track the last code we sent to prevent re-firing
    const lastSelectedCodeRef = React.useRef<string | null>(null);

    // Automatically update parent when value changes and matches a condition
    useEffect(() => {
        if (matchingIndex !== null) {
            const matchingCode = conditional.conditions[matchingIndex].htsCode;
            // Only fire if the code actually changed
            if (matchingCode !== lastSelectedCodeRef.current) {
                lastSelectedCodeRef.current = matchingCode;
                onSelectCode?.(matchingCode);
            }
        }
    }, [matchingIndex, conditional.conditions]);

    // Get icon based on condition type
    const getConditionIcon = () => {
        switch (conditional.conditionType) {
            case 'price': return <DollarSign size={18} className="text-amber-600" />;
            case 'weight': return <Scale size={18} className="text-amber-600" />;
            case 'dimension': return <Ruler size={18} className="text-amber-600" />;
            case 'quantity': return <Package size={18} className="text-amber-600" />;
        }
    };

    // Get input prefix/suffix based on condition type
    const getInputConfig = () => {
        switch (conditional.conditionType) {
            case 'price': return { prefix: '$', step: 0.01, placeholder: 'e.g., 1.50' };
            case 'weight': return { suffix: conditional.conditionUnit, step: 0.1, placeholder: 'e.g., 2.5' };
            case 'dimension': return { suffix: conditional.conditionUnit, step: 0.1, placeholder: 'e.g., 10' };
            case 'quantity': return { suffix: 'units', step: 1, placeholder: 'e.g., 100' };
        }
    };

    const inputConfig = getInputConfig();

    return (
        <Card className="border-2 border-amber-300 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        {getConditionIcon()}
                    </div>
                    <div>
                        <Title level={5} className="m-0 text-slate-900">
                            ⚠️ Classification Varies by {conditional.conditionLabel}
                        </Title>
                        <Text className="text-slate-600 text-sm">
                            The correct HTS code depends on your product's {conditional.conditionLabel.toLowerCase()}
                        </Text>
                    </div>
                </div>
            </div>

            {/* Explanation */}
            <Alert
                message={conditional.explanation}
                type="info"
                showIcon
                icon={<Info size={16} />}
                className="mb-4 border-amber-200 bg-white/60"
            />

            {/* Value Input */}
            <div className="bg-white rounded-lg p-4 border border-amber-200 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1">
                        <Text strong className="text-slate-700 block mb-2">
                            Enter your {conditional.conditionLabel.toLowerCase()} to find your exact code:
                        </Text>
                        <InputNumber
                            value={inputValue}
                            onChange={(value) => setInputValue(value)}
                            prefix={inputConfig.prefix}
                            suffix={inputConfig.suffix}
                            step={inputConfig.step}
                            placeholder={inputConfig.placeholder}
                            size="large"
                            className="w-full max-w-xs"
                            min={0}
                        />
                    </div>
                    {matchingIndex !== null && (
                        <div className="flex items-center gap-2">
                            <ChevronRight size={20} className="text-green-500" />
                            <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2">
                                <Text strong className="text-green-700 font-mono text-lg">
                                    {conditional.conditions[matchingIndex].htsCode}
                                </Text>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* All Conditions */}
            <div className="space-y-2">
                <Text className="text-slate-600 text-sm font-medium block mb-2">
                    All possible classifications:
                </Text>
                {conditional.conditions.map((cond, idx) => {
                    const isMatching = idx === matchingIndex;
                    return (
                        <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer ${isMatching
                                ? 'bg-green-50 border-green-400 ring-2 ring-green-200'
                                : 'bg-white border-slate-200 hover:border-amber-300'
                                }`}
                            onClick={() => onSelectCode?.(cond.htsCode)}
                        >
                            <div className="flex items-center gap-3">
                                <Tag
                                    color={isMatching ? 'green' : 'blue'}
                                    className="font-mono text-sm px-3 py-1"
                                >
                                    {cond.htsCode}
                                </Tag>
                                <div>
                                    <Text className={`block ${isMatching ? 'text-green-800 font-medium' : 'text-slate-700'}`}>
                                        {cond.rangeLabel}
                                    </Text>
                                    <Text className="text-slate-500 text-xs line-clamp-1">
                                        {cond.description}
                                    </Text>
                                </div>
                            </div>
                            <div className="text-right">
                                <Text strong className={isMatching ? 'text-green-600' : 'text-teal-600'}>
                                    {cond.dutyRate}
                                </Text>
                                {isMatching && (
                                    <Tag color="green" className="ml-2 text-xs">
                                        ✓ Your code
                                    </Tag>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Help Section */}
            <Collapse
                ghost
                className="mt-4 bg-white/50 rounded-lg"
                items={[{
                    key: '1',
                    label: (
                        <div className="flex items-center gap-2 text-amber-700">
                            <HelpCircle size={16} />
                            <Text className="font-medium">I don't know my {conditional.conditionLabel.toLowerCase()}</Text>
                        </div>
                    ),
                    children: (
                        <div className="space-y-3 text-sm">
                            <Paragraph className="text-slate-600 m-0">
                                <strong>How to determine your {conditional.conditionLabel.toLowerCase()}:</strong>
                            </Paragraph>
                            {conditional.conditionType === 'price' && (
                                <ul className="list-disc pl-5 text-slate-600 space-y-1 m-0">
                                    <li><strong>Unit value</strong> = Total cost ÷ Number of units</li>
                                    <li>Include the product cost only (not shipping or duties)</li>
                                    <li>If you're still getting quotes, use your estimated or target price</li>
                                    <li>For varying prices, use the most common price point</li>
                                </ul>
                            )}
                            {conditional.conditionType === 'weight' && (
                                <ul className="list-disc pl-5 text-slate-600 space-y-1 m-0">
                                    <li>Check your product specifications or packaging</li>
                                    <li>Ask your supplier for the unit weight</li>
                                    <li>For varying weights, use the average or most common weight</li>
                                </ul>
                            )}
                            <Paragraph className="text-slate-500 m-0 mt-3 italic">
                                💡 If you genuinely can't determine this, consult with a licensed customs broker
                                who can help you measure or estimate the correct value.
                            </Paragraph>
                        </div>
                    ),
                }]}
            />
        </Card>
    );
};
