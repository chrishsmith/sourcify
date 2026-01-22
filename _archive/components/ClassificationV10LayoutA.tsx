'use client';

import React, { useState } from 'react';
import { 
    Card, Typography, Input, Button, Tag, Space, Tooltip, 
    Collapse, Spin, Select, message 
} from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle, Copy, ChevronRight,
    Zap, ChevronDown, ChevronUp, Bookmark, Globe, FileText
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
        breakdown?: Array<{ program: string; rate: number; description?: string }>;
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
// CONFIDENCE INDICATOR (Dots style)
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

const ConfidenceDots: React.FC<{ confidence: number }> = ({ confidence }) => {
    const filledDots = Math.round(confidence / 20); // 0-5 dots
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
        <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((dot) => (
                    <div 
                        key={dot}
                        className={`w-2 h-2 rounded-full ${dot <= filledDots ? getColor() : 'bg-slate-200'}`}
                    />
                ))}
            </div>
            <span className={`text-sm font-medium ${confidence >= 80 ? 'text-emerald-600' : confidence >= 60 ? 'text-amber-600' : 'text-orange-600'}`}>
                {Math.round(confidence)}% {getLabel()}
            </span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// LAYOUT A: HERO + ACCORDION
// ═══════════════════════════════════════════════════════════════════════════

export default function ClassificationV10LayoutA() {
    const [description, setDescription] = useState('');
    const [origin, setOrigin] = useState('CN');
    const [material, setMaterial] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<V10Response | null>(null);
    const [expandedSections, setExpandedSections] = useState<string[]>([]);
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
        setExpandedSections([]);
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => 
            prev.includes(section) 
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
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
            <div className="max-w-4xl mx-auto flex flex-col gap-5">
                {/* Input Card - Only show when no results */}
                {showInputForm && (
                    <Card className="border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                                <Zap size={20} className="text-white" />
                            </div>
                            <div>
                                <Title level={5} className="m-0">HTS Classification</Title>
                                <Text type="secondary" className="text-sm">Enter your product details to get started</Text>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Text strong className="block mb-1.5 text-sm">Product Description</Text>
                                <TextArea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., ceramic coffee mug, mens cotton t-shirt, plastic storage container"
                                    rows={2}
                                    disabled={loading}
                                />
                            </div>

                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Text strong className="block mb-1.5 text-sm">Country of Origin</Text>
                                    <Select
                                        value={origin}
                                        onChange={setOrigin}
                                        className="w-full"
                                        disabled={loading}
                                        options={countryOptions}
                                    />
                                </div>
                                <div className="flex-1">
                                    <Text strong className="block mb-1.5 text-sm">Material (optional)</Text>
                                    <Select
                                        value={material}
                                        onChange={setMaterial}
                                        className="w-full"
                                        allowClear
                                        placeholder="Auto-detect"
                                        disabled={loading}
                                        options={materialOptions}
                                    />
                                </div>
                            </div>

                            <Button
                                type="primary"
                                onClick={handleClassify}
                                loading={loading}
                                disabled={!description.trim()}
                                className="bg-violet-600 hover:bg-violet-700 border-none"
                            >
                                {loading ? 'Classifying...' : 'Classify Product'}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Loading State */}
                {loading && (
                    <Card className="border-slate-200 shadow-sm">
                        <div className="flex items-center justify-center py-6">
                            <Spin size="default" />
                            <Text className="ml-3 text-slate-500">
                                Searching HTS codes...
                            </Text>
                        </div>
                    </Card>
                )}

                {/* Results - Hero + Accordion Style */}
                {result && result.success && result.primary && (
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                        {/* Hero Section with Integrated Header */}
                        <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
                            {/* Query Header */}
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200/50">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-600">
                                        &ldquo;<strong className="text-slate-900">{description}</strong>&rdquo;
                                    </span>
                                    <Tag>{(result.timing.total / 1000).toFixed(1)}s</Tag>
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

                            {/* HTS Code + Badge */}
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-2xl font-mono font-bold text-slate-900 tracking-wide">
                                    {result.primary.htsCodeFormatted}
                                </span>
                                <Tooltip title="Copy HTS Code">
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
                            <Text className="text-slate-600 block max-w-lg mb-4">
                                {result.primary.shortDescription || result.primary.fullDescription.slice(0, 100)}...
                            </Text>

                            {/* Duty Summary - Receipt Style */}
                            {result.primary.duty && (
                                <div className="bg-white/80 rounded-lg border border-slate-200/50 p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <Text className="font-medium text-slate-500 uppercase text-xs tracking-wide">
                                            Duty Breakdown ({getCountryLabel(origin)})
                                        </Text>
                                    </div>
                                    
                                    <div className="font-mono text-sm space-y-1">
                                        {/* Base MFN */}
                                        <div className="flex justify-between items-center py-1">
                                            <span className="text-slate-600">Base MFN Rate</span>
                                            <span className="font-semibold text-slate-900">{result.primary.duty.baseMfn}</span>
                                        </div>
                                        
                                        {/* Additional Tariffs */}
                                        {result.primary.duty.additional && result.primary.duty.additional !== 'None' && (
                                            <div className="flex justify-between items-center py-1 text-slate-600">
                                                <span>+ Additional Duties</span>
                                                <span className="font-semibold">{result.primary.duty.additional}</span>
                                            </div>
                                        )}
                                        
                                        {/* Divider */}
                                        <div className="border-t border-slate-300 border-dashed my-2" />
                                        
                                        {/* Effective Total */}
                                        <div className="flex justify-between items-center py-1">
                                            <span className="font-bold text-slate-900">EFFECTIVE TOTAL</span>
                                            <span className="font-bold text-lg text-amber-600">{result.primary.duty.effective}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-2 mt-4">
                                <Button size="small" icon={<Bookmark size={14} />}>
                                    Save & Monitor
                                </Button>
                                <Button size="small" icon={<Globe size={14} />}>
                                    Compare Countries
                                </Button>
                            </div>
                        </div>

                        {/* Accordion Sections */}
                        <div className="divide-y divide-slate-100">
                            {/* HTS Path Section */}
                            <div 
                                className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => toggleSection('path')}
                            >
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-slate-400" />
                                    <Text className="font-medium">HTS Classification Path</Text>
                                    <Tag className="ml-2">{result.primary.path.codes.length} levels</Tag>
                                </div>
                                {expandedSections.includes('path') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                            {expandedSections.includes('path') && (
                                <div className="px-6 py-4 bg-slate-50">
                                    <div className="space-y-2">
                                        {result.primary.path.codes.map((code, idx) => (
                                            <div key={code} className="flex items-center gap-3 text-sm">
                                                <span className="font-mono text-violet-600 w-28">{code}</span>
                                                <ChevronRight size={12} className="text-slate-300" />
                                                <span className="text-slate-600">{result.primary!.path.descriptions[idx]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Alternatives Section */}
                            {result.alternatives.length > 0 && (
                                <>
                                    <div 
                                        className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => toggleSection('alternatives')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <CheckCircle size={16} className="text-slate-400" />
                                            <Text className="font-medium">Alternative Classifications</Text>
                                            <Tag className="ml-2">{result.alternatives.length} options</Tag>
                                        </div>
                                        {expandedSections.includes('alternatives') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    {expandedSections.includes('alternatives') && (
                                        <div className="px-6 py-4 bg-slate-50">
                                            <div className="space-y-2">
                                                {result.alternatives.slice(0, 8).map((alt) => (
                                                    <div 
                                                        key={alt.htsCode}
                                                        className="flex items-center justify-between p-2 bg-white rounded border border-slate-200 text-sm"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-5 h-5 rounded bg-slate-100 text-slate-500 text-xs flex items-center justify-center">
                                                                {alt.rank}
                                                            </span>
                                                            <span className="font-mono text-slate-700">{alt.htsCodeFormatted}</span>
                                                            <span className="text-slate-500 truncate max-w-xs">{alt.description}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-slate-400">{Math.round(alt.confidence)}%</span>
                                                            <Button 
                                                                size="small" 
                                                                type="text"
                                                                icon={<Copy size={12} />}
                                                                onClick={(e) => { e.stopPropagation(); copyToClipboard(alt.htsCode); }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Conditional Classification Section */}
                            {result.conditionalClassification?.hasConditions && (
                                <>
                                    <div 
                                        className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                        onClick={() => toggleSection('conditions')}
                                    >
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-amber-500" />
                                            <Text className="font-medium">Value/Size Conditions</Text>
                                            <Tag color="gold" className="ml-2">May affect code</Tag>
                                        </div>
                                        {expandedSections.includes('conditions') ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                    {expandedSections.includes('conditions') && (
                                        <div className="px-6 py-4 bg-amber-50">
                                            {result.conditionalClassification.guidance && (
                                                <Text className="block mb-3 text-amber-800">
                                                    {result.conditionalClassification.guidance}
                                                </Text>
                                            )}
                                            {result.conditionalClassification.decisionQuestions.map((q) => (
                                                <div key={q.id} className="mb-4">
                                                    <Text strong className="block mb-2">{q.question}</Text>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {q.options.map((opt) => (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => opt.htsCode && copyToClipboard(opt.htsCode)}
                                                                className="p-2 text-left rounded border border-amber-200 bg-white hover:border-amber-400 transition-colors text-sm"
                                                            >
                                                                <div className="font-medium">{opt.label}</div>
                                                                {opt.htsCodeFormatted && (
                                                                    <div className="text-xs text-amber-600 mt-0.5">
                                                                        {opt.htsCodeFormatted} • {opt.dutyRate}
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400">
                            Classified in {(result.timing.total / 1000).toFixed(1)}s
                        </div>
                    </Card>
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

