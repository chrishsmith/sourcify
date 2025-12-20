'use client';

import React from 'react';
import { Card, Typography, Tag, Tooltip, Progress, Alert, Collapse } from 'antd';
import { AlertTriangle, ExternalLink, HelpCircle, Info, TrendingUp, Shield } from 'lucide-react';
import type { EffectiveTariffRate, AdditionalDuty } from '@/types/tariffLayers.types';

const { Title, Text, Paragraph } = Typography;

interface TariffBreakdownProps {
    effectiveTariff: EffectiveTariffRate;
    countryName: string;
    countryFlag: string;
}

// Program explanations for tooltips
const PROGRAM_EXPLANATIONS: Record<string, { title: string; explanation: string; source: string }> = {
    'section_301': {
        title: 'Section 301 Tariffs',
        explanation: 'Tariffs imposed under Section 301 of the Trade Act of 1974 in response to China\'s unfair trade practices. Products are organized into Lists 1-4, each with different rates.',
        source: 'ustr.gov',
    },
    'ieepa_fentanyl': {
        title: 'IEEPA Fentanyl Emergency',
        explanation: 'Emergency tariffs declared under the International Emergency Economic Powers Act (IEEPA) in response to the fentanyl crisis. Applies to imports from China, Mexico, and Canada.',
        source: 'whitehouse.gov',
    },
    'ieepa_reciprocal': {
        title: 'IEEPA Reciprocal Tariffs',
        explanation: 'Tariffs matching trade barriers imposed by other countries on US goods. Part of the "fair and reciprocal trade" policy. Rates vary by country.',
        source: 'whitehouse.gov',
    },
    'section_232': {
        title: 'Section 232 National Security',
        explanation: 'Tariffs on imports that threaten national security, primarily targeting steel, aluminum, and automobiles. Imposed under Section 232 of the Trade Expansion Act of 1962.',
        source: 'cbp.gov',
    },
};

// Color coding for different tariff severities
const getSeverityColor = (total: number): string => {
    if (total >= 100) return '#DC2626'; // Red
    if (total >= 50) return '#EA580C';  // Orange
    if (total >= 25) return '#D97706';  // Amber
    if (total > 0) return '#059669';    // Green
    return '#6B7280';                    // Gray
};

const getSeverityLabel = (total: number): string => {
    if (total >= 100) return 'EXTREME';
    if (total >= 50) return 'HIGH';
    if (total >= 25) return 'ELEVATED';
    if (total > 0) return 'STANDARD';
    return 'FREE';
};

export const TariffBreakdown: React.FC<TariffBreakdownProps> = ({
    effectiveTariff,
    countryName,
    countryFlag,
}) => {
    const totalRate = effectiveTariff.totalAdValorem;
    const severityColor = getSeverityColor(totalRate);
    const severityLabel = getSeverityLabel(totalRate);

    return (
        <Card className="border-2 shadow-sm" style={{ borderColor: severityColor + '40' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Title level={4} className="m-0 text-slate-900">
                            Complete Tariff Analysis
                        </Title>
                        <Tooltip title="All tariffs that apply to this product from this origin. Tariffs are CUMULATIVE - they stack on top of each other.">
                            <HelpCircle size={16} className="text-slate-400 cursor-help" />
                        </Tooltip>
                        {effectiveTariff.dataFreshness.toLowerCase().includes('live') && (
                            <Tooltip title="Rates fetched in real-time from USITC API. These are the current official rates.">
                                <Tag color="green" className="text-xs font-semibold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    LIVE FROM USITC
                                </Tag>
                            </Tooltip>
                        )}
                    </div>
                    <Text className="text-slate-600">
                        {countryFlag} {countryName} → 🇺🇸 United States
                    </Text>
                </div>
                
                {/* Severity Badge */}
                <div className="text-right">
                    <Tag 
                        className="text-lg px-4 py-2 font-bold border-0"
                        style={{ backgroundColor: severityColor, color: 'white' }}
                    >
                        {totalRate}%
                    </Tag>
                    <div className="mt-1">
                        <Text className="text-xs font-semibold" style={{ color: severityColor }}>
                            {severityLabel} TARIFF
                        </Text>
                    </div>
                </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <Text className="text-sm text-slate-600">Total Effective Rate</Text>
                    <Text className="text-sm font-bold" style={{ color: severityColor }}>
                        {totalRate}%
                    </Text>
                </div>
                <Progress 
                    percent={Math.min(totalRate, 150)} 
                    showInfo={false}
                    strokeColor={severityColor}
                    trailColor="#E5E7EB"
                    size={['100%', 12]}
                />
                <div className="flex justify-between mt-1 text-xs text-slate-400">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                    <span>150%+</span>
                </div>
            </div>

            {/* Tariff Stack Breakdown */}
            <div className="space-y-3">
                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Tariff Stack Breakdown
                </Text>

                {/* Base MFN Rate */}
                <TariffLayerRow
                    code={effectiveTariff.baseHtsCode}
                    name="Base MFN Rate"
                    rate={effectiveTariff.baseMfnRate.rate}
                    numericRate={effectiveTariff.baseMfnRate.numericRate || 0}
                    description="Standard duty rate from the Harmonized Tariff Schedule"
                    color="#3B82F6"
                    isBase={true}
                />

                {/* Additional Duties */}
                {effectiveTariff.additionalDuties.map((duty, idx) => (
                    <TariffLayerRow
                        key={idx}
                        code={duty.htsCode}
                        name={duty.programName}
                        rate={duty.rate.rate}
                        numericRate={duty.rate.numericRate || 0}
                        description={duty.description}
                        programType={duty.programType}
                        color={getDutyColor(duty.programType)}
                        authority={duty.authority}
                        effectiveDate={duty.effectiveDate}
                    />
                ))}

                {/* Total Line */}
                <div className="flex items-center justify-between p-4 rounded-xl mt-4" 
                     style={{ backgroundColor: severityColor + '15', border: `2px solid ${severityColor}` }}>
                    <div className="flex items-center gap-3">
                        <TrendingUp size={24} style={{ color: severityColor }} />
                        <div>
                            <Text strong className="text-lg text-slate-900">TOTAL EFFECTIVE RATE</Text>
                            <Text className="text-slate-500 text-sm block">
                                All duties combined
                            </Text>
                        </div>
                    </div>
                    <Title level={2} className="m-0" style={{ color: severityColor }}>
                        {totalRate}%
                    </Title>
                </div>
            </div>

            {/* Estimated Duty Calculator */}
            {effectiveTariff.estimatedDutyForValue && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Info size={16} className="text-blue-600" />
                        <Text strong className="text-blue-900">Estimated Duty</Text>
                    </div>
                    <div className="flex items-center justify-between">
                        <Text className="text-blue-700">
                            For ${effectiveTariff.estimatedDutyForValue.value.toLocaleString()} shipment:
                        </Text>
                        <Text strong className="text-xl text-blue-900">
                            ${effectiveTariff.estimatedDutyForValue.estimatedDuty.toLocaleString()}
                        </Text>
                    </div>
                </div>
            )}

            {/* AD/CVD Warning */}
            {effectiveTariff.adcvdWarning && (
                <Alert
                    type={effectiveTariff.adcvdWarning.isCountryAffected ? 'error' : 'warning'}
                    showIcon
                    icon={<AlertTriangle size={20} />}
                    className="mt-6"
                    message={
                        <span className="font-semibold">
                            {effectiveTariff.adcvdWarning.isCountryAffected 
                                ? '⚠️ AD/CVD Orders May Apply' 
                                : '📋 AD/CVD Notice'}
                        </span>
                    }
                    description={
                        <div>
                            <p className="mb-2">{effectiveTariff.adcvdWarning.message}</p>
                            <a
                                href={effectiveTariff.adcvdWarning.lookupUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                                Check AD/CVD Orders <ExternalLink size={14} />
                            </a>
                        </div>
                    }
                />
            )}

            {/* Disclaimer */}
            <div className="mt-6 p-3 bg-slate-50 rounded-lg">
                <Text className="text-xs text-slate-500 italic">
                    {effectiveTariff.disclaimer}
                </Text>
                <div className="flex items-center gap-2 mt-1">
                    {effectiveTariff.dataFreshness.toLowerCase().includes('live') && (
                        <Tag color="green" className="text-xs font-semibold animate-pulse">
                            ✓ LIVE DATA
                        </Tag>
                    )}
                    <Text className="text-xs text-slate-400">
                        {effectiveTariff.dataFreshness}
                    </Text>
                </div>
            </div>

            {/* Learn More Accordion */}
            <Collapse 
                ghost 
                className="mt-4"
                items={[{
                    key: 'learn',
                    label: <Text className="text-slate-600 font-medium">Learn about these tariff programs</Text>,
                    children: (
                        <div className="space-y-4">
                            {Object.entries(PROGRAM_EXPLANATIONS).map(([key, info]) => (
                                <div key={key} className="p-3 bg-slate-50 rounded-lg">
                                    <Text strong className="text-slate-800 block">{info.title}</Text>
                                    <Text className="text-slate-600 text-sm block mt-1">{info.explanation}</Text>
                                    <a 
                                        href={`https://${info.source}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
                                    >
                                        Official Source: {info.source} <ExternalLink size={12} />
                                    </a>
                                </div>
                            ))}
                        </div>
                    ),
                }]}
            />
        </Card>
    );
};

// Individual tariff layer row
interface TariffLayerRowProps {
    code: string;
    name: string;
    rate: string;
    numericRate: number;
    description: string;
    programType?: string;
    color: string;
    authority?: string;
    effectiveDate?: string;
    isBase?: boolean;
}

const TariffLayerRow: React.FC<TariffLayerRowProps> = ({
    code,
    name,
    rate,
    numericRate,
    description,
    programType,
    color,
    authority,
    effectiveDate,
    isBase,
}) => {
    const programInfo = programType ? PROGRAM_EXPLANATIONS[programType] : null;

    return (
        <div 
            className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${isBase ? 'bg-white' : 'bg-amber-50/50'}`}
            style={{ borderColor: color + '40' }}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Tag 
                            className="font-mono text-xs border-0"
                            style={{ backgroundColor: color + '20', color: color }}
                        >
                            {code}
                        </Tag>
                        <Text strong className="text-slate-800">{name}</Text>
                        {programInfo && (
                            <Tooltip 
                                title={
                                    <div className="p-2">
                                        <div className="font-semibold mb-1">{programInfo.title}</div>
                                        <div className="text-xs opacity-90">{programInfo.explanation}</div>
                                    </div>
                                }
                            >
                                <HelpCircle size={14} className="text-slate-400 cursor-help" />
                            </Tooltip>
                        )}
                    </div>
                    {authority && (
                        <Text className="text-xs text-slate-500 block mt-1">
                            Authority: {authority} {effectiveDate && `• Effective: ${effectiveDate}`}
                        </Text>
                    )}
                    <Tooltip title={description}>
                        <Text className="text-slate-500 text-sm block mt-1 line-clamp-2 cursor-help">
                            {description.length > 100 ? description.slice(0, 100) + '...' : description}
                        </Text>
                    </Tooltip>
                    {description.toLowerCase().includes('live from usitc') && (
                        <Tag color="blue" className="text-xs mt-2">
                            🔗 See USITC
                        </Tag>
                    )}
                </div>
                <div className="text-right ml-4">
                    <Text 
                        strong 
                        className="text-lg"
                        style={{ color: isBase ? '#3B82F6' : '#D97706' }}
                    >
                        {isBase ? rate : `+${rate}`}
                    </Text>
                </div>
            </div>
        </div>
    );
};

// Get color for duty type
function getDutyColor(programType: string): string {
    switch (programType) {
        case 'section_301': return '#DC2626';
        case 'ieepa_fentanyl': return '#EA580C';
        case 'ieepa_reciprocal': return '#D97706';
        case 'section_232': return '#7C3AED';
        case 'antidumping_ad': return '#BE185D';
        case 'countervailing_cvd': return '#BE185D';
        default: return '#6B7280';
    }
}

export default TariffBreakdown;

