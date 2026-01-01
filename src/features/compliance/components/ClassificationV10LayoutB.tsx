'use client';

import React, { useState } from 'react';
import { 
    Card, Typography, Input, Button, Tag, Tooltip, 
    Spin, Select, message 
} from 'antd';
import { 
    CheckCircle, AlertTriangle, Copy, ChevronRight,
    Zap, Bookmark, Globe, ArrowRight
} from 'lucide-react';

const { Title, Text } = Typography;
const { TextArea } = Input;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (matching V10 API response)
// ═══════════════════════════════════════════════════════════════════════════

interface V10Primary {
    htsCode: string;
    htsCodeFormatted: string;
    confidence: number;
    path: {
        codes: string[];
        descriptions: string[];
    };
    fullDescription: string;
    shortDescription: string;
    duty: {
        baseMfn: string;
        additional: string;
        effective: string;
        special?: string;
    } | null;
    isOther: boolean;
    otherExclusions?: string[];
    scoringFactors: {
        keywordMatch: number;
        materialMatch: number;
        specificity: number;
        hierarchyCoherence: number;
        penalties: number;
        total: number;
    };
}

interface V10Alternative {
    rank: number;
    htsCode: string;
    htsCodeFormatted: string;
    confidence: number;
    description: string;
    fullDescription: string;
    chapter: string;
    chapterDescription: string;
    materialNote?: string;
    duty?: {
        baseMfn: string;
        effective: string;
    };
}

interface DecisionOption {
    label: string;
    value: string;
    htsCode?: string;
    htsCodeFormatted?: string;
    dutyRate?: string;
}

interface DecisionQuestion {
    id: string;
    question: string;
    type: 'value' | 'size' | 'weight' | 'yes_no';
    options: DecisionOption[];
}

interface ConditionalAlternative {
    code: string;
    codeFormatted: string;
    description: string;
    keyCondition: string;
    dutyRate: string | null;
    dutyDifference?: string;
}

interface V10Response {
    success: boolean;
    timing: {
        total: number;
        search: number;
        scoring: number;
        tariff: number;
    };
    primary: V10Primary | null;
    alternatives: V10Alternative[];
    showMore: number;
    detectedMaterial: string | null;
    detectedChapters: string[];
    searchTerms: string[];
    searchHistoryId?: string;
    conditionalClassification?: {
        hasConditions: boolean;
        guidance?: string;
        decisionQuestions: DecisionQuestion[];
        alternatives: ConditionalAlternative[];
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE BAR
// ═══════════════════════════════════════════════════════════════════════════

const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
    const getColors = () => {
        if (confidence >= 80) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (confidence >= 60) return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-orange-100 text-orange-700 border-orange-200';
    };
    const getLabel = () => {
        if (confidence >= 80) return 'High';
        if (confidence >= 60) return 'Medium';
        return 'Low';
    };
    
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getColors()}`}>
            {confidence}% {getLabel()}
        </span>
    );
};

const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => {
    const getColor = () => {
        if (confidence >= 80) return 'bg-emerald-500';
        if (confidence >= 60) return 'bg-amber-500';
        return 'bg-orange-500';
    };
    const getLabel = () => {
        if (confidence >= 80) return 'High';
        if (confidence >= 60) return 'Medium';
        return 'Low';
    };
    
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-slate-500">Confidence</span>
                <span className={`font-medium ${confidence >= 80 ? 'text-emerald-600' : confidence >= 60 ? 'text-amber-600' : 'text-orange-600'}`}>
                    {Math.round(confidence)}% {getLabel()}
                </span>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className={`h-full ${getColor()} rounded-full transition-all`}
                    style={{ width: `${confidence}%` }}
                />
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT B: DASHBOARD GRID
// ═══════════════════════════════════════════════════════════════════════════

export default function ClassificationV10LayoutB() {
    const [description, setDescription] = useState('');
    const [origin, setOrigin] = useState('CN');
    const [material, setMaterial] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<V10Response | null>(null);
    const [messageApi, contextHolder] = message.useMessage();

    const handleClassify = async () => {
        if (!description.trim()) {
            messageApi.warning('Please enter a product description');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/classify-v10', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: description.trim(),
                    origin,
                    material,
                }),
            });

            if (!response.ok) {
                throw new Error('Classification failed');
            }

            const data: V10Response = await response.json();
            setResult(data);

            if (data.success && data.primary) {
                messageApi.success(`Classified in ${(data.timing.total / 1000).toFixed(1)}s`);
            } else {
                messageApi.warning('No classification found');
            }
        } catch (error) {
            console.error('Classification error:', error);
            messageApi.error('Classification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        messageApi.success('Copied!');
    };

    const handleReset = () => {
        setResult(null);
        setDescription('');
    };

    const countryOptions = [
        { value: 'CN', label: '🇨🇳 China' },
        { value: 'MX', label: '🇲🇽 Mexico' },
        { value: 'VN', label: '🇻🇳 Vietnam' },
        { value: 'IN', label: '🇮🇳 India' },
        { value: 'DE', label: '🇩🇪 Germany' },
        { value: 'JP', label: '🇯🇵 Japan' },
        { value: 'KR', label: '🇰🇷 South Korea' },
        { value: 'TW', label: '🇹🇼 Taiwan' },
        { value: 'TH', label: '🇹🇭 Thailand' },
        { value: 'ID', label: '🇮🇩 Indonesia' },
    ];

    const materialOptions = [
        { value: 'plastic', label: 'Plastic' },
        { value: 'metal', label: 'Metal' },
        { value: 'wood', label: 'Wood' },
        { value: 'cotton', label: 'Cotton' },
        { value: 'polyester', label: 'Polyester' },
        { value: 'leather', label: 'Leather' },
        { value: 'glass', label: 'Glass' },
        { value: 'ceramic', label: 'Ceramic' },
        { value: 'rubber', label: 'Rubber' },
        { value: 'paper', label: 'Paper' },
    ];

    const getCountryLabel = (code: string) => countryOptions.find(c => c.value === code)?.label || code;

    // Show input form only when no results
    const showInputForm = !result || !result.success || !result.primary;

    return (
        <>
            {contextHolder}
            <div className="max-w-6xl mx-auto flex flex-col gap-5">
                {/* Input Card - Only show when no results */}
                {showInputForm && (
                    <Card className="border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg">
                                <Zap size={20} className="text-white" />
                            </div>
                            <div>
                                <Title level={5} className="m-0">HTS Classification</Title>
                                <Text type="secondary" className="text-sm">Enter your product details to get started</Text>
                            </div>
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-[2]">
                                <Text strong className="block mb-1.5 text-sm">Product Description</Text>
                                <TextArea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., ceramic coffee mug, mens cotton t-shirt"
                                    rows={1}
                                    disabled={loading}
                                    autoSize={{ minRows: 1, maxRows: 3 }}
                                />
                            </div>
                            <div className="flex-1">
                                <Text strong className="block mb-1.5 text-sm">Origin</Text>
                                <Select
                                    value={origin}
                                    onChange={setOrigin}
                                    className="w-full"
                                    disabled={loading}
                                    options={countryOptions}
                                />
                            </div>
                            <div className="flex-1">
                                <Text strong className="block mb-1.5 text-sm">Material</Text>
                                <Select
                                    value={material}
                                    onChange={setMaterial}
                                    className="w-full"
                                    allowClear
                                    placeholder="Auto"
                                    disabled={loading}
                                    options={materialOptions}
                                />
                            </div>
                            <Button
                                type="primary"
                                onClick={handleClassify}
                                loading={loading}
                                disabled={!description.trim()}
                                className="bg-cyan-600 hover:bg-cyan-700 border-none"
                            >
                                {loading ? 'Classifying...' : 'Classify Product'}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Loading State */}
                {loading && (
                    <Card className="border-slate-200 shadow-sm">
                        <div className="flex items-center justify-center py-8">
                            <Spin size="default" />
                            <Text className="ml-3 text-slate-500">
                                Searching HTS codes...
                            </Text>
                        </div>
                    </Card>
                )}

                {/* Results - Dashboard Grid Style */}
                {result && result.success && result.primary && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-12 gap-5">
                            {/* Main Result - Left Column (8 cols) */}
                            <div className="col-span-8 flex flex-col gap-5">
                                {/* Primary Result Card - with integrated header */}
                                <Card className="border-slate-200 shadow-sm">
                                    {/* Query Header */}
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-600">
                                                &ldquo;<strong className="text-slate-900">{description}</strong>&rdquo;
                                            </span>
                                            <Tag className="ml-1">{(result.timing.total / 1000).toFixed(1)}s</Tag>
                                        </div>
                                        <Button 
                                            type="link" 
                                            size="small"
                                            onClick={handleReset}
                                            className="text-slate-500 hover:text-emerald-600"
                                        >
                                            ← New search
                                        </Button>
                                    </div>

                                    {/* HTS Code + Confidence Badge */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className="text-2xl font-mono font-bold text-slate-900 tracking-wide">
                                            {result.primary.htsCodeFormatted}
                                        </span>
                                        <Tooltip title="Copy">
                                            <Button 
                                                size="small"
                                                type="text"
                                                icon={<Copy size={14} />} 
                                                onClick={() => copyToClipboard(result.primary!.htsCode)}
                                                className="text-slate-400 hover:text-slate-600"
                                            />
                                        </Tooltip>
                                        <ConfidenceBadge confidence={result.primary.confidence} />
                                    </div>

                                    <Text className="text-slate-600 text-sm block mb-4">
                                        {result.primary.shortDescription || result.primary.fullDescription}
                                    </Text>

                                {/* HTS Path - Expanded with hierarchy labels */}
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <Text className="font-medium text-slate-400 uppercase text-xs tracking-wide block mb-3">
                                        Classification Path
                                    </Text>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                                        {(() => {
                                            // Build full 4-level hierarchy from tariff code
                                            const tariffCode = result.primary!.htsCodeFormatted.replace(/\./g, '');
                                            const pathData = result.primary!.path;
                                            
                                            // Extract chapter, heading from the tariff code
                                            const chapter = tariffCode.substring(0, 2);
                                            const heading = tariffCode.substring(0, 4);
                                            const subheading = tariffCode.substring(0, 6);
                                            
                                            // Build full hierarchy with fallback descriptions
                                            const levels = [
                                                { 
                                                    code: chapter, 
                                                    formatted: chapter,
                                                    level: 'Chapter',
                                                    description: pathData.codes.find(c => c.replace(/\./g, '').length === 2) 
                                                        ? pathData.descriptions[pathData.codes.findIndex(c => c.replace(/\./g, '').length === 2)]
                                                        : `Chapter ${chapter}`
                                                },
                                                { 
                                                    code: heading, 
                                                    formatted: heading,
                                                    level: 'Heading',
                                                    description: pathData.codes.find(c => c.replace(/\./g, '').length === 4) 
                                                        ? pathData.descriptions[pathData.codes.findIndex(c => c.replace(/\./g, '').length === 4)]
                                                        : pathData.descriptions[0] || `Heading ${heading}`
                                                },
                                                { 
                                                    code: subheading, 
                                                    formatted: `${subheading.substring(0, 4)}.${subheading.substring(4)}`,
                                                    level: 'Subheading',
                                                    description: pathData.codes.find(c => c.replace(/\./g, '').length === 6) 
                                                        ? pathData.descriptions[pathData.codes.findIndex(c => c.replace(/\./g, '').length === 6)]
                                                        : pathData.descriptions[0] || `Subheading ${subheading}`
                                                },
                                                { 
                                                    code: tariffCode, 
                                                    formatted: result.primary!.htsCodeFormatted,
                                                    level: 'Tariff',
                                                    description: result.primary!.shortDescription
                                                },
                                            ];
                                            
                                            return levels.map((item, idx) => (
                                                <div key={item.code} className="flex items-start p-3 hover:bg-slate-50 transition-colors">
                                                    <div className="w-36 shrink-0">
                                                        <span className="font-mono text-violet-600 font-medium">{item.formatted}</span>
                                                        <span className="block text-xs text-slate-400 mt-0.5">{item.level}</span>
                                                    </div>
                                                    <span className="text-slate-600 text-sm line-clamp-2">{item.description}</span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </Card>

                            {/* Duty Breakdown Card - Receipt Style */}
                            {result.primary.duty && (
                                <Card className="border-slate-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-4">
                                        <Text className="font-medium text-slate-500 uppercase text-xs tracking-wide">
                                            Duty Breakdown ({getCountryLabel(origin)})
                                        </Text>
                                        <Button size="small" type="link" icon={<Globe size={14} />} className="text-xs">
                                            Compare countries
                                        </Button>
                                    </div>
                                    
                                    <div className="bg-slate-50 rounded-lg p-4 font-mono text-sm">
                                        {/* Base MFN */}
                                        <div className="flex justify-between items-center py-1.5">
                                            <span className="text-slate-600">Base MFN Rate</span>
                                            <span className="font-semibold text-slate-900">{result.primary.duty.baseMfn}</span>
                                        </div>
                                        
                                        {/* Additional Tariffs from breakdown */}
                                        {result.primary.duty.breakdown && result.primary.duty.breakdown
                                            .filter((item: { program: string; rate: number }) => item.program !== 'Base MFN' && item.rate > 0)
                                            .map((item: { program: string; rate: number; description?: string }, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center py-1.5 text-slate-600">
                                                    <span>+ {item.program}</span>
                                                    <span className="font-semibold">{item.rate.toFixed(1)}%</span>
                                                </div>
                                            ))
                                        }
                                        
                                        {/* Divider */}
                                        <div className="border-t border-slate-300 border-dashed my-2" />
                                        
                                        {/* Effective Total */}
                                        <div className="flex justify-between items-center py-1.5">
                                            <span className="font-bold text-slate-900">EFFECTIVE TOTAL</span>
                                            <span className="font-bold text-lg text-amber-600">{result.primary.duty.effective}</span>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Conditional Classification */}
                            {result.conditionalClassification?.hasConditions && (
                                <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={16} className="text-amber-500" />
                                        <Text className="font-medium text-amber-800">Exact code depends on product details</Text>
                                    </div>

                                    {result.conditionalClassification.decisionQuestions.map((q) => (
                                        <div key={q.id} className="mb-3">
                                            <Text className="text-sm text-slate-700 block mb-2">{q.question}</Text>
                                            <div className="flex gap-2 flex-wrap">
                                                {q.options.map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => opt.htsCode && copyToClipboard(opt.htsCode)}
                                                        className="px-3 py-1.5 text-sm rounded border border-amber-300 bg-white hover:border-amber-500 hover:bg-amber-50 transition-colors"
                                                    >
                                                        <span className="font-medium">{opt.label}</span>
                                                        {opt.htsCodeFormatted && (
                                                            <span className="text-xs text-amber-600 ml-2">
                                                                {opt.htsCodeFormatted}
                                                            </span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </Card>
                            )}

                            {/* Actions Card */}
                            <Card className="border-slate-200 shadow-sm bg-slate-50">
                                <div className="flex gap-3">
                                    <Button icon={<Bookmark size={14} />} className="flex-1">
                                        Save & Monitor
                                    </Button>
                                    <Button icon={<Globe size={14} />} className="flex-1">
                                        Sourcing Analysis
                                    </Button>
                                </div>
                            </Card>
                        </div>

                        {/* Sidebar - Right Column (4 cols) */}
                        <div className="col-span-4 flex flex-col gap-5">
                            {/* Alternatives Card */}
                            <Card className="border-slate-200 shadow-sm">
                                <Text className="font-medium text-slate-500 uppercase text-xs tracking-wide block mb-3">
                                    Alternatives
                                </Text>
                                
                                <div className="space-y-2">
                                    {result.alternatives.slice(0, 6).map((alt) => (
                                        <div 
                                            key={alt.htsCode}
                                            className="p-2 rounded border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer group"
                                            onClick={() => copyToClipboard(alt.htsCode)}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-mono text-sm text-slate-800">{alt.htsCodeFormatted}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-xs text-slate-400">{Math.round(alt.confidence)}%</span>
                                                    <Copy size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </div>
                                            <div className="text-xs text-slate-500 truncate">{alt.description}</div>
                                            {alt.duty && (
                                                <div className="text-xs text-amber-600 mt-1">{alt.duty.effective}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {result.alternatives.length > 6 && (
                                    <Button type="link" size="small" className="mt-2 p-0 text-xs">
                                        + {result.alternatives.length - 6} more
                                        <ArrowRight size={12} className="ml-1" />
                                    </Button>
                                )}
                            </Card>

                            {/* Detection Info Card */}
                            {(result.detectedMaterial || result.detectedChapters.length > 0) && (
                                <Card className="border-slate-200 shadow-sm" size="small">
                                    <Text className="font-medium text-slate-500 uppercase text-xs tracking-wide block mb-2">
                                        Detected
                                    </Text>
                                    <div className="flex flex-wrap gap-1">
                                        {result.detectedMaterial && (
                                            <Tag className="text-xs">{result.detectedMaterial}</Tag>
                                        )}
                                        {result.detectedChapters.map(ch => (
                                            <Tag key={ch} className="text-xs">Ch. {ch}</Tag>
                                        ))}
                                    </div>
                                </Card>
                            )}
                        </div>
                    </div>
                    </div>
                )}

                {/* No Results */}
                {result && !result.success && (
                    <Card className="border-orange-200 bg-orange-50 shadow-sm">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={20} className="text-orange-600" />
                            <div>
                                <Text strong>No Classification Found</Text>
                                <Text type="secondary" className="block text-sm">
                                    Try providing more details about the product.
                                </Text>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </>
    );
}

