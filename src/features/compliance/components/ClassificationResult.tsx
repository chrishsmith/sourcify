'use client';

import React, { useState } from 'react';
import { Card, Typography, Progress, Tag, Button, Tooltip, Alert, Collapse, message } from 'antd';
import { Copy, FileText, AlertTriangle, ExternalLink, HelpCircle, Check, Download } from 'lucide-react';
import type { ClassificationResult } from '@/types/classification.types';

const { Title, Text, Paragraph } = Typography;

// Educational tooltips for trade terms - written for a 4th grader
const TRADE_TERM_TOOLTIPS = {
    mfn: {
        term: 'General Rate (MFN)',
        explanation: 'This is the regular tax most countries pay when importing goods into the US. MFN stands for "Most Favored Nation" - it\'s the standard rate for friendly trading partners.',
    },
    column2: {
        term: 'Column 2 Rate',
        explanation: 'This is a higher tax rate for countries that don\'t have normal trade agreements with the US. It\'s rarely used but applies to a few countries.',
    },
    usmca: {
        term: 'USMCA',
        explanation: 'United States-Mexico-Canada Agreement. If your product is made in Mexico or Canada, you might pay less or no tax at all!',
    },
    gsp: {
        term: 'GSP',
        explanation: 'Generalized System of Preferences. This program lets certain developing countries sell goods to the US with lower or no taxes to help their economies grow.',
    },
    specialPrograms: {
        term: 'Special Programs',
        explanation: 'These are special trade deals between the US and other countries. If your product qualifies, you might pay less tax or no tax at all!',
    },
};

// Tooltip for program codes
const getProgramTooltip = (program: string): string => {
    const tooltips: Record<string, string> = {
        'GSP': 'Generalized System of Preferences - reduced rates for developing countries',
        'USMCA (Canada)': 'US-Mexico-Canada Agreement - free trade with Canada',
        'USMCA (Mexico)': 'US-Mexico-Canada Agreement - free trade with Mexico',
        'Australia FTA': 'US-Australia Free Trade Agreement',
        'Korea FTA': 'US-Korea Free Trade Agreement (KORUS)',
        'Israel FTA': 'US-Israel Free Trade Agreement',
        'Chile FTA': 'US-Chile Free Trade Agreement',
        'Singapore FTA': 'US-Singapore Free Trade Agreement',
        'Colombia TPA': 'US-Colombia Trade Promotion Agreement',
        'Peru TPA': 'US-Peru Trade Promotion Agreement',
        'Panama TPA': 'US-Panama Trade Promotion Agreement',
    };
    return tooltips[program] || `Trade preference program: ${program}`;
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

    // Help icon component for tooltips
    const HelpIcon = ({ tooltip }: { tooltip: { term: string; explanation: string } }) => (
        <Tooltip
            title={
                <div className="p-1">
                    <div className="font-semibold mb-1">{tooltip.term}</div>
                    <div className="text-xs opacity-90">{tooltip.explanation}</div>
                </div>
            }
            overlayInnerStyle={{ maxWidth: 280 }}
        >
            <HelpCircle size={14} className="text-slate-400 hover:text-teal-600 cursor-help ml-1" />
        </Tooltip>
    );

    return (
        <div className="space-y-5">
            {/* Main Result Card */}
            <Card className="border border-slate-200 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 p-2">
                    {/* HTS Code Display */}
                    <div className="flex-1">
                        <Text className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                            HTS Classification
                        </Text>
                        <div className="flex items-center gap-3 mt-3">
                            <Title level={2} className="m-0 font-mono text-slate-900 tracking-tight">
                                {result.htsCode.code}
                            </Title>
                            <Tooltip title={copiedField === 'hts' ? 'Copied!' : 'Copy HTS Code'}>
                                <Button
                                    type="text"
                                    size="small"
                                    icon={copiedField === 'hts' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    onClick={() => copyToClipboard(result.htsCode.code, 'hts')}
                                    className="text-slate-400 hover:text-teal-600"
                                />
                            </Tooltip>
                        </div>
                        <Paragraph className="text-slate-600 mt-3 mb-0 text-base leading-relaxed">
                            {result.htsCode.description}
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
                            <HelpIcon tooltip={TRADE_TERM_TOOLTIPS.mfn} />
                        </div>
                        <Title level={2} className="m-0 mt-2 text-teal-600">{result.dutyRate.generalRate}</Title>
                    </div>

                    {/* Column 2 Rate */}
                    {result.dutyRate.column2Rate && (
                        <div className="bg-gradient-to-br from-red-50 to-red-100 p-5 rounded-xl border border-red-200">
                            <div className="flex items-center">
                                <Text className="text-slate-600 text-sm font-medium">Column 2 Rate</Text>
                                <HelpIcon tooltip={TRADE_TERM_TOOLTIPS.column2} />
                            </div>
                            <Title level={2} className="m-0 mt-2 text-red-500">{result.dutyRate.column2Rate}</Title>
                        </div>
                    )}

                    {/* Special Programs */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-xl border border-green-200">
                        <div className="flex items-center mb-3">
                            <Text className="text-slate-600 text-sm font-medium">Special Programs</Text>
                            <HelpIcon tooltip={TRADE_TERM_TOOLTIPS.specialPrograms} />
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

                    <div className="space-y-2">
                        {/* Base MFN Rate Row */}
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3">
                                <Tag color="blue" className="font-mono text-xs">{result.htsCode.code}</Tag>
                                <div>
                                    <Text strong className="text-slate-800">Base MFN Rate</Text>
                                    <Text className="text-slate-500 text-xs block">Standard import duty</Text>
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
