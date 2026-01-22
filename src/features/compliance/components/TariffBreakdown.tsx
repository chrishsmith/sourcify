'use client';

import React from 'react';
import { Card, Typography, Tag, Tooltip, Alert, Collapse } from 'antd';
import { AlertTriangle, ExternalLink, HelpCircle, TrendingUp } from 'lucide-react';
import type { EffectiveTariffRate } from '@/types/tariffLayers.types';

const { Title, Text } = Typography;

interface TariffBreakdownProps {
    effectiveTariff: EffectiveTariffRate;
    countryName: string;
    countryFlag: string;
}

// Program explanations for tooltips
const PROGRAM_EXPLANATIONS: Record<string, { title: string; explanation: string }> = {
    'section_301': {
        title: 'Section 301 Tariffs',
        explanation: 'Tariffs imposed under Section 301 of the Trade Act of 1974 in response to China\'s unfair trade practices. Products are organized into Lists 1-4.',
    },
    'ieepa_fentanyl': {
        title: 'IEEPA Fentanyl Emergency',
        explanation: 'Emergency tariffs under IEEPA in response to the fentanyl crisis. Applies to China, Mexico, and Canada imports.',
    },
    'ieepa_reciprocal': {
        title: 'IEEPA Reciprocal Tariffs',
        explanation: 'Tariffs matching trade barriers imposed by other countries. Rates vary by country.',
    },
    'section_232': {
        title: 'Section 232 National Security',
        explanation: 'Tariffs on imports that threaten national security, primarily steel and aluminum.',
    },
};

// Color coding
const getSeverityColor = (total: number): string => {
    if (total >= 100) return '#DC2626';
    if (total >= 50) return '#EA580C';
    if (total >= 25) return '#D97706';
    if (total > 0) return '#059669';
    return '#6B7280';
};


export const TariffBreakdown: React.FC<TariffBreakdownProps> = ({
    effectiveTariff,
    countryName,
    countryFlag,
}) => {
    const totalRate = effectiveTariff.totalAdValorem;
    const severityColor = getSeverityColor(totalRate);
    const hasAdditionalDuties = effectiveTariff.additionalDuties.length > 0;

    return (
        <Card className="border border-slate-200 shadow-sm" style={{ marginBottom: 24 }}>
            {/* Compact Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <Text className="text-slate-600 text-sm">
                        {countryFlag} {countryName} → 🇺🇸 US
                    </Text>
                    {effectiveTariff.dataFreshness.toLowerCase().includes('live') && (
                        <Tag color="green" className="text-xs">LIVE</Tag>
                    )}
                </div>
            </div>

            {/* Compact Tariff Stack */}
            <div className="divide-y divide-slate-100">
                {/* Base Rate */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <Tag 
                            className="font-mono text-xs border-0 max-w-[120px] truncate sm:max-w-none"
                            style={{ backgroundColor: '#CCFBF1', color: '#0F766E' }}
                        >
                            {effectiveTariff.baseHtsCode}
                        </Tag>
                        <Text strong className="text-slate-700 text-sm sm:text-base">Base MFN Rate</Text>
                    </div>
                    <Text strong className="text-slate-700 pl-2 sm:pl-0">
                        {effectiveTariff.baseMfnRate.rate}
                    </Text>
                </div>

                {/* Additional Duties - Clean rows */}
                {effectiveTariff.additionalDuties.map((duty, idx) => {
                    const programInfo = PROGRAM_EXPLANATIONS[duty.programType];
                    // Extract just the numeric rate
                    const numericRate = duty.rate.numericRate 
                        ? `+${duty.rate.numericRate}%`
                        : duty.rate.rate.includes('%') 
                            ? '+' + duty.rate.rate.match(/\d+\.?\d*%/)?.[0] 
                            : `+${duty.rate.rate}`;
                    
                    return (
                        <div 
                            key={idx} 
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 py-2.5"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag 
                                    className="font-mono text-xs border-0 max-w-[120px] truncate sm:max-w-none"
                                    style={{ backgroundColor: '#CCFBF1', color: '#0F766E' }}
                                >
                                    {duty.htsCode}
                                </Tag>
                                <Text strong className="text-slate-700 text-sm sm:text-base">{duty.programName}</Text>
                                {programInfo && (
                                    <Tooltip 
                                        title={
                                            <div className="p-1">
                                                <div className="font-semibold mb-1 text-sm">{programInfo.title}</div>
                                                <div className="text-xs opacity-90">{programInfo.explanation}</div>
                                            </div>
                                        }
                                        overlayInnerStyle={{ maxWidth: 280 }}
                                    >
                                        <HelpCircle size={14} className="text-slate-400 cursor-help" />
                                    </Tooltip>
                                )}
                            </div>
                            <Text strong className="text-slate-700 pl-2 sm:pl-0">
                                {numericRate}
                            </Text>
                        </div>
                    );
                })}
            </div>

            {/* Total - Color coded based on severity */}
            {hasAdditionalDuties && (
                <div 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-3 px-3 rounded-lg mt-4"
                    style={{ backgroundColor: severityColor + '12', border: `1px solid ${severityColor}30` }}
                >
                    <div className="flex items-center gap-2">
                        <TrendingUp size={18} style={{ color: severityColor }} />
                        <Text strong className="text-slate-800 text-sm sm:text-base">Total Effective Rate</Text>
                    </div>
                    <Text className="text-lg sm:text-xl font-bold pl-2 sm:pl-0" style={{ color: severityColor }}>
                        {totalRate}%
                    </Text>
                </div>
            )}

            {/* AD/CVD Warning - Keep this */}
            {effectiveTariff.adcvdWarning && effectiveTariff.adcvdWarning.isCountryAffected && (
                <Alert
                    type="error"
                    showIcon
                    icon={<AlertTriangle size={16} />}
                    className="mt-4"
                    message={<span className="font-semibold text-sm">AD/CVD Orders May Apply</span>}
                    description={
                        <a
                            href={effectiveTariff.adcvdWarning.lookupUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                            Check AD/CVD Orders <ExternalLink size={12} />
                        </a>
                    }
                />
            )}

            {/* Compact Disclaimer */}
            <div className="mt-4 pt-3 border-t border-slate-100">
                <Text className="text-xs text-slate-400">
                    Rates for informational purposes. Verify with CBP before import.
                    {effectiveTariff.dataFreshness.toLowerCase().includes('live') && (
                        <span className="text-green-600 ml-2">✓ Live from USITC</span>
                    )}
                </Text>
            </div>

            {/* Collapsible Learn More - Hidden by default */}
            <Collapse 
                ghost 
                size="small"
                className="mt-2 -mx-2"
                items={[{
                    key: 'learn',
                    label: <Text className="text-xs text-slate-500">Learn about these programs</Text>,
                    children: (
                        <div className="space-y-2 text-xs">
                            {Object.entries(PROGRAM_EXPLANATIONS).map(([key, info]) => (
                                <div key={key} className="p-2 bg-slate-50 rounded">
                                    <Text strong className="text-slate-700">{info.title}</Text>
                                    <Text className="text-slate-500 block">{info.explanation}</Text>
                                </div>
                            ))}
                        </div>
                    ),
                }]}
            />
        </Card>
    );
};

export default TariffBreakdown;
