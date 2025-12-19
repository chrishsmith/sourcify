'use client';

import React, { useState, useCallback } from 'react';
import { Card, Typography, Progress, Tag, Button, Tooltip, Alert, Collapse, message } from 'antd';
import { Copy, FileText, AlertTriangle, ExternalLink, HelpCircle, Check, Download } from 'lucide-react';
import type { ClassificationResult } from '@/types/classification.types';
import { ConditionalClassificationCard } from './ConditionalClassificationCard';

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
        <div className="flex flex-col gap-5">
            {/* Main Result Card */}
            <Card className={`border shadow-sm ${selectedConditionalCode ? 'border-green-300 ring-2 ring-green-100' : 'border-slate-200'}`}>
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

            {/* Duty Rate Card */}
            <Card className="border border-slate-200 shadow-sm">
                <Title level={5} className="m-0 mb-5 text-slate-900 flex items-center">
                    Duty Rates
                    <Tooltip title="These are the taxes you pay when importing this product into the US. Different rates apply depending on where your product comes from.">
                        <HelpCircle size={14} className="text-slate-400 hover:text-teal-600 cursor-help ml-2" />
                    </Tooltip>
                </Title>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* General Rate */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200">
                        <div className="flex items-center">
                            <Text className="text-slate-600 text-sm font-medium">General Rate (MFN)</Text>
                            <HelpIcon term="General Rate (MFN)" />
                        </div>
                        <Title level={2} className="m-0 mt-2 text-teal-600">{result.dutyRate.generalRate}</Title>
                    </div>

                    {/* Column 2 Rate */}
                    {result.dutyRate.column2Rate && (
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200">
                            <div className="flex items-center">
                                <Text className="text-slate-600 text-sm font-medium">Column 2 Rate</Text>
                                <HelpIcon term="Column 2 Rate" />
                            </div>
                            <Title level={2} className="m-0 mt-2 text-red-500">{result.dutyRate.column2Rate}</Title>
                        </div>
                    )}

                    {/* Special Programs */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl border border-green-200">
                        <div className="flex items-center mb-3">
                            <Text className="text-slate-600 text-sm font-medium">Special Programs</Text>
                            <HelpIcon term="Special Programs" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {result.dutyRate.specialPrograms && result.dutyRate.specialPrograms.length > 0 ? (
                                result.dutyRate.specialPrograms.map((prog, idx) => (
                                    <Tooltip key={idx} title={getProgramTooltip(prog.program)}>
                                        <Tag color="green" className="px-3 py-1 cursor-help text-sm">
                                            {prog.program}: {prog.rate}
                                        </Tag>
                                    </Tooltip>
                                ))
                            ) : (
                                <Text className="text-slate-500 text-sm">No special programs available</Text>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

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

            {/* EFFECTIVE DUTY BREAKDOWN - Shows all tariff layers */}
            {result.effectiveTariff && result.effectiveTariff.additionalDuties.length > 0 && (
                <Card className="border-2 border-amber-200 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Title level={5} className="m-0 text-slate-900">
                                ⚠️ Effective Duty Breakdown
                            </Title>
                            <Tooltip title="This shows TOTAL duties you'll pay, including the base rate plus all additional tariffs from trade policies (Section 301, IEEPA, etc.)">
                                <HelpCircle size={14} className="text-slate-400 cursor-help" />
                            </Tooltip>
                        </div>
                        <Tag color="orange" className="text-lg px-4 py-1 font-bold">
                            TOTAL: {result.effectiveTariff.effectiveRate.rate}
                        </Tag>
                    </div>

                    <div className="flex flex-col gap-3">
                        {/* Base MFN Rate Row */}
                        <div className={`flex items-center justify-between p-3 bg-white rounded-lg border ${selectedConditionalCode ? 'border-green-300 ring-2 ring-green-100' : 'border-slate-200'}`}>
                            <div className="flex items-center gap-3">
                                <Tag color={selectedConditionalCode ? 'green' : 'blue'} className="font-mono text-xs">{activeHtsCode}</Tag>
                                <div>
                                    <Text strong className="text-slate-800">Base MFN Rate</Text>
                                    <Text className="text-slate-500 text-xs block">Standard import duty</Text>
                                    {selectedConditionalCode && (
                                        <Text className="text-green-600 text-xs block mt-1">✓ Updated based on your unit value</Text>
                                    )}
                                </div>
                            </div>
                            <Text strong className="text-lg text-teal-600">{result.effectiveTariff.baseMfnRate.rate}</Text>
                        </div>

                        {/* Additional Duty Rows */}
                        {result.effectiveTariff.additionalDuties.map((duty, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                                <div className="flex items-center gap-3">
                                    <Tag color="orange" className="font-mono text-xs">{duty.htsCode}</Tag>
                                    <div>
                                        <Tooltip title={duty.description}>
                                            <Text strong className="text-slate-800 cursor-help">{duty.programName}</Text>
                                        </Tooltip>
                                        <Text className="text-slate-500 text-xs block">{duty.authority}</Text>
                                    </div>
                                </div>
                                <Text strong className="text-lg text-amber-600">+{duty.rate.rate}</Text>
                            </div>
                        ))}

                        {/* Total Row */}
                        <div className="flex items-center justify-between p-4 bg-amber-100 rounded-lg border-2 border-amber-300 mt-3">
                            <div>
                                <Text strong className="text-slate-900 text-lg">EFFECTIVE TOTAL RATE</Text>
                                <Text className="text-slate-600 text-sm block">
                                    From {result.input.countryOfOrigin || 'origin country'} → USA
                                </Text>
                            </div>
                            <Title level={3} className="m-0 text-amber-700">
                                {result.effectiveTariff.effectiveRate.rate}
                            </Title>
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="mt-4 p-3 bg-white/50 rounded-lg">
                        <Text className="text-xs text-slate-500 italic">
                            {result.effectiveTariff.disclaimer}
                        </Text>
                        <Text className="text-xs text-slate-400 block mt-1">
                            Data freshness: {result.effectiveTariff.dataFreshness}
                        </Text>
                    </div>
                </Card>
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
            <Card className="border border-slate-200 shadow-sm">
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
