'use client';

import React, { useState, useCallback } from 'react';
import { Card, Typography, Progress, Tag, Button, Tooltip, Alert, Collapse, message, Dropdown, Space } from 'antd';
import { Copy, FileText, AlertTriangle, ExternalLink, HelpCircle, Check, Download, Bookmark, BookmarkCheck, Bell, ChevronDown } from 'lucide-react';
import type { ClassificationResult } from '@/types/classification.types';
import { ConditionalClassificationCard } from './ConditionalClassificationCard';
import { TariffBreakdown } from './TariffBreakdown';
import { SourcingPreview } from '@/features/sourcing/components/SourcingPreview';

const { Title, Text, Paragraph } = Typography;

// Comprehensive trade glossary - every term fully explained
const TRADE_GLOSSARY: Record<string, { fullName: string; explanation: string }> = {
    // Base Rate Terms
    'MFN': {
        fullName: 'Most Favored Nation Rate',
        explanation: 'The standard tax rate that most countries pay. Despite the name "Most Favored," this is actually the normal rate - not a special discount. It applies to countries with normal trade relations.',
    },
    'General Rate (MFN)': {
        fullName: 'Most Favored Nation Rate',
        explanation: 'The standard tax rate that most countries pay. Despite the name "Most Favored," this is actually the normal rate - not a special discount. It applies to countries with normal trade relations.',
    },
    'Column 2 Rate': {
        fullName: 'Column 2 (Non-NTR) Rate',
        explanation: 'A much higher tax rate for countries without Normal Trade Relations. Currently only applies to Cuba and North Korea. These rates can be 10x higher than normal.',
    },

    // Trade Agreements
    'USMCA': {
        fullName: 'United States-Mexico-Canada Agreement',
        explanation: 'The free trade deal between the US, Mexico, and Canada (replaced NAFTA in 2020). Products made in these countries often pay zero duty if they meet the origin requirements.',
    },
    'USMCA (Canada)': {
        fullName: 'United States-Mexico-Canada Agreement (Canada)',
        explanation: 'Free trade benefits for products made in Canada. To qualify, the product must meet specific "rules of origin" - meaning enough of it must be made in North America.',
    },
    'USMCA (Mexico)': {
        fullName: 'United States-Mexico-Canada Agreement (Mexico)',
        explanation: 'Free trade benefits for products made in Mexico. To qualify, the product must meet specific "rules of origin" - meaning enough of it must be made in North America.',
    },
    'GSP': {
        fullName: 'Generalized System of Preferences',
        explanation: 'A program giving developing countries duty-free access on certain products to help their economies grow. Note: GSP has expired and been renewed multiple times - check current status.',
    },
    'Australia FTA': {
        fullName: 'US-Australia Free Trade Agreement',
        explanation: 'Free trade deal with Australia since 2005. Most products from Australia enter duty-free or at reduced rates.',
    },
    'Korea FTA': {
        fullName: 'US-Korea Free Trade Agreement (KORUS)',
        explanation: 'Free trade deal with South Korea since 2012. Most Korean products enter duty-free.',
    },
    'Israel FTA': {
        fullName: 'US-Israel Free Trade Agreement',
        explanation: 'The first US free trade agreement, since 1985. Most Israeli products enter duty-free.',
    },
    'Chile FTA': {
        fullName: 'US-Chile Free Trade Agreement',
        explanation: 'Free trade deal with Chile since 2004. Most Chilean products enter duty-free.',
    },
    'Singapore FTA': {
        fullName: 'US-Singapore Free Trade Agreement',
        explanation: 'Free trade deal with Singapore since 2004. Nearly all Singapore products enter duty-free.',
    },
    'Colombia TPA': {
        fullName: 'US-Colombia Trade Promotion Agreement',
        explanation: 'Trade agreement with Colombia since 2012. Most Colombian products enter duty-free.',
    },
    'Peru TPA': {
        fullName: 'US-Peru Trade Promotion Agreement',
        explanation: 'Trade agreement with Peru since 2009. Most Peruvian products enter duty-free.',
    },
    'Panama TPA': {
        fullName: 'US-Panama Trade Promotion Agreement',
        explanation: 'Trade agreement with Panama since 2012. Most Panamanian products enter duty-free.',
    },
    'Special Programs': {
        fullName: 'Special Tariff Programs',
        explanation: 'Trade deals that give certain countries lower or zero tariffs. Each program has rules about where the product must be made to qualify.',
    },

    // Additional Duty Programs (Chapter 99)
    'Section 301': {
        fullName: 'Trade Act of 1974, Section 301',
        explanation: 'Extra tariffs on goods from countries found to have unfair trade practices. Currently adds 7.5% to 100% on many Chinese products across multiple "Lists" (1-4).',
    },
    'Section 301 List 1': {
        fullName: 'Section 301 List 1 Tariffs',
        explanation: 'The first round of Section 301 tariffs on Chinese goods, effective July 2018. Adds 25% additional duty on ~$34 billion of products.',
    },
    'Section 301 List 2': {
        fullName: 'Section 301 List 2 Tariffs',
        explanation: 'The second round of Section 301 tariffs on Chinese goods, effective August 2018. Adds 25% additional duty on ~$16 billion of products.',
    },
    'Section 301 List 3': {
        fullName: 'Section 301 List 3 Tariffs',
        explanation: 'The third round of Section 301 tariffs, effective September 2018. Adds 25% additional duty on ~$200 billion of Chinese products.',
    },
    'Section 301 List 4A': {
        fullName: 'Section 301 List 4A Tariffs',
        explanation: 'Fourth round of Section 301 tariffs, effective September 2019. Adds 7.5% additional duty on ~$120 billion of Chinese consumer products.',
    },
    'IEEPA Fentanyl': {
        fullName: 'International Emergency Economic Powers Act - Fentanyl Emergency',
        explanation: 'Emergency tariffs declared in 2025 citing the fentanyl crisis. Adds 10-20% on ALL Chinese imports, 25% on Mexican and Canadian imports. These stack ON TOP of all other duties.',
    },
    'IEEPA Fentanyl Tariff': {
        fullName: 'International Emergency Economic Powers Act - Fentanyl Emergency',
        explanation: 'Emergency tariffs declared in 2025 citing the fentanyl crisis. Adds 10-20% on ALL Chinese imports, 25% on Mexican and Canadian imports. These stack ON TOP of all other duties.',
    },
    'IEEPA Reciprocal': {
        fullName: 'International Emergency Economic Powers Act - Reciprocal Tariffs',
        explanation: 'Additional tariffs matching what other countries charge on US goods. Part of the "fair and reciprocal trade" policy. Rates vary by country.',
    },
    'IEEPA Reciprocal Tariff': {
        fullName: 'International Emergency Economic Powers Act - Reciprocal Tariffs',
        explanation: 'Additional tariffs matching what other countries charge on US goods. Part of the "fair and reciprocal trade" policy. Rates vary by country.',
    },
    'Chapter 99': {
        fullName: 'HTS Chapter 99 - Temporary Legislation',
        explanation: 'Special chapter for temporary duty modifications. Important: These codes ADD to your base rate - they don\'t replace it! Always check which Chapter 99 provisions apply.',
    },

    // Other Important Terms
    'AD/CVD': {
        fullName: 'Anti-Dumping / Countervailing Duties',
        explanation: 'Extra duties on specific products from specific companies/countries when they\'re sold below fair value (dumping) or unfairly subsidized. Rates can be 100%+ on top of normal duties.',
    },
    'FTZ': {
        fullName: 'Foreign Trade Zone',
        explanation: 'Special areas in the US where goods can be stored, manufactured, or assembled with delayed or reduced duty payments. Can save money on re-exported goods.',
    },
    'Drawback': {
        fullName: 'Duty Drawback',
        explanation: 'A refund of up to 99% of duties paid on imported goods that are later exported. Great for companies that import components and export finished products.',
    },
    'De Minimis': {
        fullName: 'De Minimis Threshold',
        explanation: 'Shipments valued under a certain amount ($800 for most countries) enter duty-free. Note: Some countries and product categories are excluded from de minimis.',
    },
};

// Get tooltip for any program - checks glossary first, then provides fallback
const getProgramTooltip = (program: string): string => {
    const entry = TRADE_GLOSSARY[program];
    if (entry) {
        return `${entry.fullName} - ${entry.explanation}`;
    }
    // Fallback for unknown programs
    return `Trade preference program: ${program}`;
};

// Get country flag emoji from country code
const getCountryFlag = (code: string | undefined): string => {
    const flags: Record<string, string> = {
        'CN': '🇨🇳', 'MX': '🇲🇽', 'CA': '🇨🇦', 'DE': '🇩🇪', 'JP': '🇯🇵',
        'KR': '🇰🇷', 'VN': '🇻🇳', 'IN': '🇮🇳', 'TW': '🇹🇼', 'TH': '🇹🇭',
        'GB': '🇬🇧', 'IT': '🇮🇹', 'FR': '🇫🇷', 'HK': '🇭🇰', 'BR': '🇧🇷',
        'RU': '🇷🇺', 'TR': '🇹🇷', 'ID': '🇮🇩', 'MY': '🇲🇾', 'PH': '🇵🇭',
    };
    return flags[code || ''] || '🌍';
};

// Get country name from country code
const getCountryName = (code: string | undefined): string => {
    const names: Record<string, string> = {
        'CN': 'China', 'MX': 'Mexico', 'CA': 'Canada', 'DE': 'Germany', 'JP': 'Japan',
        'KR': 'South Korea', 'VN': 'Vietnam', 'IN': 'India', 'TW': 'Taiwan', 'TH': 'Thailand',
        'GB': 'United Kingdom', 'IT': 'Italy', 'FR': 'France', 'HK': 'Hong Kong', 'BR': 'Brazil',
        'RU': 'Russia', 'TR': 'Turkey', 'ID': 'Indonesia', 'MY': 'Malaysia', 'PH': 'Philippines',
    };
    return names[code || ''] || code || 'Unknown';
};

interface ClassificationResultDisplayProps {
    result: ClassificationResult;
    onNewClassification: () => void;
    onSelectAlternative?: (code: string) => void;
}

export const ClassificationResultDisplay: React.FC<ClassificationResultDisplayProps> = ({
    result,
    onNewClassification,
    onSelectAlternative
}) => {
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isMonitored, setIsMonitored] = useState(false);
    
    // Track selected conditional HTS code - if user selects one from the conditional card
    const [selectedConditionalCode, setSelectedConditionalCode] = useState<{
        code: string;
        description: string;
    } | null>(null);

    // Get the currently active HTS code (either selected conditional or original)
    const activeHtsCode = selectedConditionalCode?.code || result.htsCode.code;
    const activeHtsDescription = selectedConditionalCode?.description || result.htsCode.description;

    // Stable callback for conditional code selection (prevents infinite loops)
    const handleConditionalCodeSelect = useCallback((code: string, conditions: { htsCode: string; description: string }[]) => {
        const matchingCond = conditions.find(c => c.htsCode === code);
        if (matchingCond) {
            setSelectedConditionalCode({
                code: code,
                description: matchingCond.description,
            });
            message.success(`Updated to HTS Code ${code}`);
        }
    }, []);

    const copyToClipboard = async (text: string, field: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        message.success('Copied to clipboard!');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const exportReport = () => {
        const report = generateTextReport(result);
        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hts-classification-${result.htsCode.code.replace(/\./g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('Report downloaded!');
    };

    const saveToLibrary = async (withMonitoring: boolean = false) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/saved-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: result.input.productName || result.suggestedProductName || 'Classified Product',
                    description: result.input.productDescription,
                    sku: result.input.productSku,
                    htsCode: result.htsCode.code,
                    htsDescription: result.htsCode.description,
                    countryOfOrigin: result.input.countryOfOrigin,
                    materialComposition: result.input.materialComposition,
                    intendedUse: result.input.intendedUse,
                    baseDutyRate: result.dutyRate.generalRate,
                    effectiveDutyRate: result.effectiveTariff?.totalAdValorem,
                    latestClassification: result,
                    isMonitored: withMonitoring,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 401) {
                    message.warning('Please sign in to save products to your library');
                    return;
                }
                throw new Error(data.error || 'Failed to save');
            }

            setIsSaved(true);
            setIsMonitored(withMonitoring);
            
            if (withMonitoring) {
                message.success(
                    <span>
                        Product saved with tariff monitoring! 
                        <a href="/dashboard/sourcing?tab=monitoring" className="ml-2 text-teal-600 underline">
                            View →
                        </a>
                    </span>
                );
            } else {
                message.success('Product saved to your library!');
            }
        } catch (error) {
            console.error('Failed to save product:', error);
            message.error('Failed to save product');
        } finally {
            setIsSaving(false);
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return '#10B981';
        if (confidence >= 70) return '#F59E0B';
        return '#EF4444';
    };

    const getConfidenceLabel = (confidence: number) => {
        if (confidence >= 90) return 'High Confidence';
        if (confidence >= 70) return 'Medium Confidence';
        return 'Low Confidence - Review Recommended';
    };

    // Help icon component for tooltips - uses TRADE_GLOSSARY or custom tooltip
    const HelpIcon = ({ term, customTooltip }: { term?: string; customTooltip?: { term: string; explanation: string } }) => {
        const glossaryEntry = term ? TRADE_GLOSSARY[term] : null;
        const tooltip = customTooltip || (glossaryEntry ? {
            term: glossaryEntry.fullName,
            explanation: glossaryEntry.explanation
        } : { term: term || 'Unknown', explanation: 'No description available' });

        return (
            <Tooltip
                title={
                    <div className="p-2">
                        <div className="font-semibold mb-1 text-sm">{tooltip.term}</div>
                        <div className="text-xs opacity-90 leading-relaxed">{tooltip.explanation}</div>
                    </div>
                }
                overlayInnerStyle={{ maxWidth: 320 }}
            >
                <HelpCircle size={14} className="text-slate-400 hover:text-teal-600 cursor-help ml-1" />
            </Tooltip>
        );
    };

    return (
        <div>
            {/* Product Input Summary Card */}
            <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white" style={{ marginBottom: 24 }}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                            Product Details
                        </Text>
                        <Title level={4} className="m-0 mt-1 text-slate-900">
                            {result.input.productName || result.suggestedProductName || 'Classified Product'}
                        </Title>
                    </div>
                    {result.input.countryOfOrigin && (
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg">
                            <span className="text-lg">{getCountryFlag(result.input.countryOfOrigin)}</span>
                            <div>
                                <Text className="text-xs text-slate-500 block">Origin</Text>
                                <Text strong className="text-slate-800">{getCountryName(result.input.countryOfOrigin)}</Text>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Description */}
                    <div className="md:col-span-2">
                        <Text className="text-xs text-slate-500 font-medium block mb-1">Description</Text>
                        <Paragraph className="text-slate-700 mb-0 bg-white p-3 rounded-lg border border-slate-100">
                            {result.input.productDescription}
                        </Paragraph>
                    </div>
                    
                    {/* SKU */}
                    {result.input.productSku && (
                        <div>
                            <Text className="text-xs text-slate-500 font-medium block mb-1">SKU / Part Number</Text>
                            <Tag className="font-mono bg-slate-100 border-slate-200 text-slate-700 px-3 py-1">
                                {result.input.productSku}
                            </Tag>
                        </div>
                    )}
                    
                    {/* Material */}
                    {result.input.materialComposition && (
                        <div>
                            <Text className="text-xs text-slate-500 font-medium block mb-1">Material Composition</Text>
                            <Text className="text-slate-700">{result.input.materialComposition}</Text>
                        </div>
                    )}
                    
                    {/* Intended Use */}
                    {result.input.intendedUse && (
                        <div className={result.input.productSku || result.input.materialComposition ? '' : 'md:col-span-2'}>
                            <Text className="text-xs text-slate-500 font-medium block mb-1">Intended Use</Text>
                            <Text className="text-slate-700">{result.input.intendedUse}</Text>
                        </div>
                    )}
                </div>
            </Card>

            {/* Main Result Card */}
            <Card className={`border shadow-sm ${selectedConditionalCode ? 'border-green-300 ring-2 ring-green-100' : 'border-slate-200'}`} style={{ marginBottom: 24 }}>
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 p-2">
                    {/* HTS Code Display */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                                HTS Classification
                            </Text>
                            {selectedConditionalCode && (
                                <Tag color="green" className="text-xs">✓ Updated</Tag>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                            <Title level={2} className={`m-0 font-mono tracking-tight ${selectedConditionalCode ? 'text-green-700' : 'text-slate-900'}`}>
                                {activeHtsCode}
                            </Title>
                            <Tooltip title={copiedField === 'hts' ? 'Copied!' : 'Copy HTS Code'}>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={copiedField === 'hts' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    onClick={() => copyToClipboard(activeHtsCode, 'hts')}
                                    className="text-slate-400 hover:text-teal-600"
                                />
                            </Tooltip>
                        </div>

                        {/* Full HTS Hierarchy - Shows complete path */}
                        {result.hierarchy && result.hierarchy.levels.length > 0 ? (
                            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <Text className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 block">
                                    Classification Path
                                </Text>
                                <div className="flex flex-col gap-1">
                                    {result.hierarchy.levels.map((level, i) => (
                                        <div 
                                            key={i} 
                                            className="flex items-start gap-2"
                                            style={{ paddingLeft: `${i * 16}px` }}
                                        >
                                            <span className="text-slate-400 text-sm">
                                                {i === 0 ? '📂' : i === result.hierarchy!.levels.length - 1 ? '📄' : '└'}
                                            </span>
                                            <div className="flex-1">
                                                <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                                                    i === result.hierarchy!.levels.length - 1 
                                                        ? 'bg-teal-100 text-teal-700 font-semibold' 
                                                        : 'bg-slate-200 text-slate-600'
                                                }`}>
                                                    {level.code}
                                                </span>
                                                <span className={`ml-2 text-sm ${
                                                    i === result.hierarchy!.levels.length - 1 
                                                        ? 'text-slate-900 font-medium' 
                                                        : 'text-slate-600'
                                                }`}>
                                                    {level.description}
                                                </span>
                                                {level.dutyRate && (
                                                    <Tag color="green" className="ml-2 text-xs">{level.dutyRate}</Tag>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : result.humanReadablePath && (
                            <div className="mt-2 text-sm text-slate-500 font-medium flex items-center gap-1 flex-wrap">
                                {result.humanReadablePath.split(' › ').map((part, i, arr) => (
                                    <React.Fragment key={i}>
                                        <span className={i === arr.length - 1 ? 'text-teal-700 font-semibold' : ''}>
                                            {part}
                                        </span>
                                        {i < arr.length - 1 && <span className="text-slate-300">›</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        )}

                        <Paragraph className="text-slate-600 mt-3 mb-0 text-base leading-relaxed">
                            {activeHtsDescription}
                        </Paragraph>
                        <div className="flex flex-wrap gap-2 mt-4">
                            <Tag color="blue" className="px-3 py-1">Chapter {result.htsCode.chapter}</Tag>
                            <Tag color="cyan" className="px-3 py-1">Heading {result.htsCode.heading}</Tag>
                        </div>
                    </div>

                    {/* Confidence Score */}
                    <div className="w-full lg:w-44 flex flex-col items-center lg:items-center">
                        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">
                            Confidence
                        </Text>
                        <Progress
                            type="circle"
                            percent={result.confidence}
                            size={110}
                            strokeWidth={8}
                            strokeColor={getConfidenceColor(result.confidence)}
                            format={(percent) => (
                                <span className="text-2xl font-bold" style={{ color: getConfidenceColor(result.confidence) }}>
                                    {percent}%
                                </span>
                            )}
                        />
                        <Text
                            className="block text-center mt-3 text-sm font-medium"
                            style={{ color: getConfidenceColor(result.confidence) }}
                        >
                            {getConfidenceLabel(result.confidence)}
                        </Text>
                    </div>
                </div>
            </Card>

            {/* VALUE-DEPENDENT CLASSIFICATION - Multiple HTS codes based on value/weight */}
            {result.valueDependentClassification && result.valueDependentClassification.thresholds.length > 1 && (
                <Card className="border-2 border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-orange-50/30" style={{ marginBottom: 24 }}>
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">📊</span>
                                <Title level={5} className="m-0 text-amber-900">
                                    Multiple HTS Codes Available
                                </Title>
                            </div>
                            <Text className="text-amber-800 text-sm">
                                {result.valueDependentClassification.productType} has different codes based on value. Select the one that matches your product.
                            </Text>
                        </div>
                        <Tooltip title="Different value ranges have different duty rates. Choose the code that matches your product's value.">
                            <HelpCircle size={16} className="text-amber-600 cursor-help" />
                        </Tooltip>
                    </div>

                    {/* Heading Context */}
                    {result.valueDependentClassification.headingDescription && (
                        <div className="mb-4 p-2 bg-white/50 rounded-lg">
                            <Text className="text-slate-600 text-xs">
                                <strong>Heading {result.valueDependentClassification.baseHeading}:</strong> {result.valueDependentClassification.headingDescription}
                            </Text>
                        </div>
                    )}

                    {/* Question */}
                    {result.valueDependentClassification.question && (
                        <div className="mb-4 p-3 bg-amber-100 rounded-lg border border-amber-300">
                            <Text className="text-amber-900 font-medium">
                                ❓ {result.valueDependentClassification.question}
                            </Text>
                        </div>
                    )}

                    {/* Threshold Options */}
                    <div className="flex flex-col gap-3">
                        {result.valueDependentClassification.thresholds.map((threshold, idx) => {
                            const isSelected = activeHtsCode === threshold.htsCode;
                            return (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                        isSelected 
                                            ? 'bg-green-50 border-green-400 ring-2 ring-green-200' 
                                            : 'bg-white border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                                    }`}
                                    onClick={() => {
                                        setSelectedConditionalCode({
                                            code: threshold.htsCode,
                                            description: threshold.description,
                                        });
                                        message.success(`Selected HTS Code ${threshold.htsCode}`);
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            {isSelected && <Check size={18} className="text-green-600" />}
                                            <Text strong className="font-mono text-lg text-slate-900">
                                                {threshold.htsCode}
                                            </Text>
                                        </div>
                                        <Tag 
                                            color={isSelected ? 'green' : 'blue'} 
                                            className="font-semibold px-3"
                                        >
                                            {threshold.dutyRate}
                                        </Tag>
                                    </div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Tag color="orange" className="text-xs">
                                            {threshold.condition}
                                        </Tag>
                                    </div>
                                    <Text className="text-slate-600 text-sm block mt-2">
                                        {threshold.description}
                                    </Text>
                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-green-200">
                                            <Text className="text-green-700 text-sm font-medium">
                                                ✓ This code is now selected for your classification
                                            </Text>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Guidance */}
                    <div className="mt-4 p-3 bg-white/70 rounded-lg border border-amber-200">
                        <Text className="text-amber-800 text-xs">
                            💡 <strong>Tip:</strong> The value threshold is typically the FOB (Free on Board) value at the time of import. If unsure, consult with your customs broker.
                        </Text>
                    </div>
                </Card>
            )}

            {/* COMPREHENSIVE TARIFF BREAKDOWN */}
            {result.effectiveTariff ? (
                <TariffBreakdown
                    effectiveTariff={result.effectiveTariff}
                    countryName={getCountryName(result.input.countryOfOrigin)}
                    countryFlag={getCountryFlag(result.input.countryOfOrigin)}
                />
            ) : (
                // Fallback: Simple MFN rate display when no effective tariff calculated
                <Card className="border border-slate-200 shadow-sm">
                    <Title level={5} className="m-0 mb-5 text-slate-900 flex items-center">
                        Duty Rate
                        <Tooltip title="The standard import duty for this product.">
                            <HelpCircle size={14} className="text-slate-400 hover:text-teal-600 cursor-help ml-2" />
                        </Tooltip>
                    </Title>
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-6 rounded-xl border border-teal-200">
                        <div className="flex items-center">
                            <Text className="text-slate-600 text-sm font-medium">Base Rate (MFN)</Text>
                            <HelpIcon term="General Rate (MFN)" />
                        </div>
                        <Title level={2} className="m-0 mt-2 text-teal-600">{result.dutyRate.generalRate}</Title>
                        {result.input.countryOfOrigin && (
                            <Text className="text-slate-500 text-sm mt-2 block">
                                Additional duties may apply based on origin country. Contact support for detailed analysis.
                            </Text>
                        )}
                    </div>
                </Card>
            )}

            {/* AD/CVD WARNING - Shows only when applicable */}
            {result.effectiveTariff?.adcvdWarning && (
                <Alert
                    type={result.effectiveTariff.adcvdWarning.isCountryAffected ? 'error' : 'warning'}
                    showIcon
                    icon={<AlertTriangle size={20} />}
                    message={
                        <span className="font-semibold">
                            {result.effectiveTariff.adcvdWarning.isCountryAffected
                                ? '⚠️ AD/CVD Orders May Apply'
                                : '📋 AD/CVD Notice'}
                        </span>
                    }
                    description={
                        <div>
                            <p className="mb-2">{result.effectiveTariff.adcvdWarning.message}</p>
                            <a
                                href={result.effectiveTariff.adcvdWarning.lookupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                                Check AD/CVD Orders <ExternalLink size={14} />
                            </a>
                        </div>
                    }
                    className="border"
                />
            )}

            {/* DYNAMIC SOURCING PREVIEW */}
            {result.htsCode.code && (
                <SourcingPreview
                    htsCode={result.htsCode.code}
                    countryOfOrigin={result.input.countryOfOrigin}
                    productDescription={result.input.productDescription}
                />
            )}

            {/* CONDITIONAL CLASSIFICATION - When HTS varies by price/weight/etc */}
            {result.conditionalClassifications && result.conditionalClassifications.length > 0 && (
                <>
                    {result.conditionalClassifications.map((conditional, idx) => (
                        <ConditionalClassificationCard
                            key={idx}
                            conditional={conditional}
                            onSelectCode={(code) => handleConditionalCodeSelect(code, conditional.conditions)}
                        />
                    ))}
                </>
            )}



            {/* Warnings/Compliance Notes */}
            {result.warnings && result.warnings.length > 0 && (
                <Alert
                    title="Compliance Notes"
                    description={
                        <ul className="m-0 pl-4 space-y-1">
                            {result.warnings.map((warning, idx) => (
                                <li key={idx} className="text-sm leading-relaxed">{warning}</li>
                            ))}
                        </ul>
                    }
                    type={result.warnings.some(w => w.includes('✓')) ? 'success' : 'warning'}
                    showIcon
                    icon={result.warnings.some(w => w.includes('✓')) ? <Check size={20} /> : <AlertTriangle size={20} />}
                    className="border"
                />
            )}

            {/* AI Rationale */}
            <Card className="border border-slate-200 shadow-sm" style={{ marginBottom: 24 }}>
                <Title level={5} className="m-0 mb-4 text-slate-900">Classification Rationale</Title>
                <Paragraph className="text-slate-600 mb-0 leading-relaxed">
                    {result.rationale}
                </Paragraph>
            </Card>

            {/* Supporting Rulings */}
            {result.rulings && result.rulings.length > 0 && (
                <Card className="border border-slate-200 shadow-sm">
                    <Title level={5} className="m-0 mb-4 text-slate-900 flex items-center">
                        Supporting Rulings
                        <Tooltip title="These are official CBP rulings for similar products. Note: AI-generated examples may not be real rulings - verify on rulings.cbp.gov">
                            <HelpCircle size={14} className="text-slate-400 hover:text-teal-600 cursor-help ml-2" />
                        </Tooltip>
                    </Title>
                    <div className="space-y-3">
                        {result.rulings.map((ruling, idx) => (
                            <div key={idx} className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <FileText size={16} className="text-teal-600" />
                                        <Text strong className="text-slate-900">{ruling.rulingNumber}</Text>
                                        <Tag color={ruling.relevanceScore >= 85 ? 'green' : 'default'} className="ml-1">
                                            {ruling.relevanceScore}% relevant
                                        </Tag>
                                    </div>
                                    <Text className="text-slate-600 text-sm block mt-2 leading-relaxed">{ruling.summary}</Text>
                                    <Text type="secondary" className="text-xs mt-1 block">{ruling.date}</Text>
                                </div>
                                <Tooltip title="Search on CBP CROSS">
                                    <Button
                                        type="text"
                                        size="small"
                                        icon={<ExternalLink size={14} />}
                                        href={`https://rulings.cbp.gov/search?term=${ruling.rulingNumber}`}
                                        target="_blank"
                                        className="ml-2"
                                    />
                                </Tooltip>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Alternative Classifications */}
            {result.alternativeCodes && result.alternativeCodes.length > 0 && (
                <Collapse
                    ghost
                    className="bg-slate-50 rounded-xl border border-slate-200"
                    items={[{
                        key: '1',
                        label: (
                            <Text className="text-slate-700 font-medium">
                                Alternative Classifications ({result.alternativeCodes.length})
                            </Text>
                        ),
                        children: (
                            <div className="space-y-3 pb-2">
                                {result.alternativeCodes.map((alt, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-4 bg-white rounded-lg border border-slate-200 ${onSelectAlternative ? 'hover:border-teal-300 cursor-pointer transition-colors' : ''}`}
                                        onClick={() => onSelectAlternative?.(alt.code)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <Text strong className="font-mono text-lg">{alt.code}</Text>
                                            {onSelectAlternative && (
                                                <Button type="link" size="small">Use this code</Button>
                                            )}
                                        </div>
                                        <Text className="text-slate-600 text-sm block mt-1">{alt.description}</Text>
                                    </div>
                                ))}
                            </div>
                        ),
                    }]}
                />
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
                <Button type="primary" size="large" onClick={onNewClassification} className="h-12 px-6">
                    New Classification
                </Button>
                
                {/* Save with monitoring dropdown */}
                {!isSaved ? (
                    <Space.Compact>
                        <Button
                            type="primary"
                            size="large"
                            loading={isSaving}
                            onClick={() => saveToLibrary(true)}
                            className="bg-teal-600 hover:bg-teal-700 h-12 px-6"
                            icon={<Bell size={16} />}
                        >
                            Save & Monitor Tariffs
                        </Button>
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'save-only',
                                        icon: <Bookmark size={14} />,
                                        label: 'Save without monitoring',
                                        onClick: () => saveToLibrary(false),
                                    },
                                ],
                            }}
                            trigger={['click']}
                        >
                            <Button
                                type="primary"
                                size="large"
                                className="bg-teal-600 hover:bg-teal-700 h-12 px-2"
                                icon={<ChevronDown size={14} />}
                            />
                        </Dropdown>
                    </Space.Compact>
                ) : (
                    <Button
                        size="large"
                        disabled
                        icon={
                            isMonitored 
                                ? <Bell size={16} className="text-teal-600" />
                                : <BookmarkCheck size={16} className="text-green-600" />
                        }
                        className="h-12 px-6"
                    >
                        {isMonitored ? 'Saved & Monitoring' : 'Saved to Library'}
                    </Button>
                )}
                
                <Button
                    size="large"
                    icon={<Download size={16} />}
                    onClick={exportReport}
                    className="h-12 px-6"
                >
                    Export Report
                </Button>
            </div>
        </div>
    );
};

// Generate text report for export
function generateTextReport(result: ClassificationResult): string {
    const lines = [
        '═══════════════════════════════════════════════════════════',
        '                  HTS CLASSIFICATION REPORT                 ',
        '═══════════════════════════════════════════════════════════',
        '',
        `Date: ${new Date().toLocaleDateString()}`,
        '',
        '─── HTS CODE ───────────────────────────────────────────────',
        `Code: ${result.htsCode.code}`,
        result.humanReadablePath ? `Path: ${result.humanReadablePath}` : undefined,
        `Description: ${result.htsCode.description}`,
        `Chapter: ${result.htsCode.chapter}`,
        `Heading: ${result.htsCode.heading}`,
        `Confidence: ${result.confidence}%`,
        '',
        '─── DUTY RATES ─────────────────────────────────────────────',
        `General Rate (MFN): ${result.dutyRate.generalRate}`,
        result.dutyRate.column2Rate ? `Column 2 Rate: ${result.dutyRate.column2Rate}` : '',
        'Special Programs:',
        ...(result.dutyRate.specialPrograms?.map(p => `  • ${p.program}: ${p.rate}`) || ['  None']),
        '',
        '─── CLASSIFICATION RATIONALE ───────────────────────────────',
        result.rationale,
        '',
    ];

    if (result.rulings && result.rulings.length > 0) {
        lines.push('─── SUPPORTING RULINGS ─────────────────────────────────────');
        result.rulings.forEach(r => {
            lines.push(`• ${r.rulingNumber} (${r.relevanceScore}% relevant)`);
            lines.push(`  ${r.summary}`);
            lines.push(`  Date: ${r.date}`);
        });
        lines.push('');
    }

    if (result.warnings && result.warnings.length > 0) {
        lines.push('─── COMPLIANCE NOTES ───────────────────────────────────────');
        result.warnings.forEach(w => lines.push(`• ${w}`));
        lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════');
    lines.push('Generated by Sourcify - AI-Powered Trade Compliance');
    lines.push('═══════════════════════════════════════════════════════════');

    return lines.filter(l => l !== undefined).join('\n');
}
