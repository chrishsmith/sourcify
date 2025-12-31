'use client';

import React, { useState } from 'react';
import { 
    Card, Typography, Input, Button, Tag, Space, Tooltip, 
    Collapse, Spin, Progress, Divider, Select, message 
} from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle, Copy, ChevronRight,
    Zap, ExternalLink, Info, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

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
// CONFIDENCE BADGE
// ═══════════════════════════════════════════════════════════════════════════

const ConfidenceBadge: React.FC<{ confidence: number }> = ({ confidence }) => {
    const getColor = () => {
        if (confidence >= 80) return 'green';
        if (confidence >= 60) return 'gold';
        return 'orange';
    };
    const getLabel = () => {
        if (confidence >= 80) return 'High';
        if (confidence >= 60) return 'Medium';
        return 'Low';
    };
    
    return (
        <Tag color={getColor()} className="font-medium">
            {Math.round(confidence)}% {getLabel()}
        </Tag>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// HTS PATH DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

const HtsPathDisplay: React.FC<{ path: { codes: string[]; descriptions: string[] } }> = ({ path }) => {
    const levels = ['Chapter', 'Heading', 'Subheading', 'Tariff Line', 'Statistical'];
    
    return (
        <div className="space-y-1">
            {path.codes.map((code, idx) => (
                <div key={code} className="flex items-start gap-2 text-sm">
                    <span className="text-slate-400 w-24 flex-shrink-0">{levels[idx]}:</span>
                    <span className="font-mono text-slate-600">{code}</span>
                    <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-700">{path.descriptions[idx]}</span>
                </div>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ClassificationV10() {
    const [description, setDescription] = useState('');
    const [origin, setOrigin] = useState('CN');
    const [material, setMaterial] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<V10Response | null>(null);
    const [showAllAlternatives, setShowAllAlternatives] = useState(false);
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
                messageApi.success(`Classified in ${(data.timing.total / 1000).toFixed(1)}s!`);
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
        messageApi.success('Copied to clipboard!');
    };

    const handleReset = () => {
        setResult(null);
        setDescription('');
        setShowAllAlternatives(false);
    };

    return (
        <>
            {contextHolder}
            <div className="space-y-6">
                {/* Header */}
                <Card className="border-slate-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
                            <Zap size={24} className="text-white" />
                        </div>
                        <div>
                            <Title level={4} className="m-0">V10 Semantic Search</Title>
                            <Text type="secondary">AI-powered embeddings for instant, accurate classification</Text>
                        </div>
                        <Tag color="gold" className="ml-auto">⚡ ~3-5 seconds</Tag>
                    </div>

                    {/* Input Form */}
                    <div className="space-y-4">
                        <div>
                            <Text strong className="block mb-2">Product Description</Text>
                            <TextArea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g., ceramic coffee mug with handle, mens cotton t-shirt, plastic storage container"
                                rows={3}
                                className="font-mono"
                                disabled={loading}
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Text strong className="block mb-2">Country of Origin</Text>
                                <Select
                                    value={origin}
                                    onChange={setOrigin}
                                    className="w-full"
                                    disabled={loading}
                                    options={[
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
                                    ]}
                                />
                            </div>
                            <div className="flex-1">
                                <Text strong className="block mb-2">Material (optional)</Text>
                                <Select
                                    value={material}
                                    onChange={setMaterial}
                                    className="w-full"
                                    allowClear
                                    placeholder="Auto-detect"
                                    disabled={loading}
                                    options={[
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
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                type="primary"
                                size="large"
                                onClick={handleClassify}
                                loading={loading}
                                disabled={!description.trim()}
                                className="bg-gradient-to-r from-amber-500 to-orange-500 border-none hover:from-amber-600 hover:to-orange-600"
                            >
                                {loading ? 'Classifying...' : 'Classify Product'}
                            </Button>
                            {result && (
                                <Button size="large" onClick={handleReset}>
                                    New Classification
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Loading State */}
                {loading && (
                    <Card className="border-slate-200">
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" />
                            <Text className="ml-4 text-slate-600">
                                Searching 30,000+ HTS codes with semantic AI...
                            </Text>
                        </div>
                    </Card>
                )}

                {/* Results */}
                {result && result.success && result.primary && (
                    <>
                        {/* Primary Result Card */}
                        <Card 
                            className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white"
                            title={
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={20} className="text-green-600" />
                                    <span>Primary Classification</span>
                                    <ConfidenceBadge confidence={result.primary.confidence} />
                                    <Tag className="ml-auto">
                                        {(result.timing.total / 1000).toFixed(1)}s
                                    </Tag>
                                </div>
                            }
                        >
                            <div className="space-y-6">
                                {/* HTS Code Display */}
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl font-mono font-bold text-slate-900 tracking-wider">
                                        {result.primary.htsCodeFormatted}
                                    </div>
                                    <Tooltip title="Copy HTS Code">
                                        <Button 
                                            icon={<Copy size={16} />} 
                                            onClick={() => copyToClipboard(result.primary!.htsCode)}
                                        />
                                    </Tooltip>
                                    {result.primary.isOther && (
                                        <Tag color="blue">Classified as &quot;Other&quot;</Tag>
                                    )}
                                </div>

                                {/* Full Description */}
                                <div>
                                    <Text type="secondary" className="block mb-1">Full Legal Description</Text>
                                    <Paragraph className="text-lg text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-0">
                                        {result.primary.fullDescription}
                                    </Paragraph>
                                </div>

                                {/* Duty Information */}
                                {result.primary.duty && (
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <Text type="secondary" className="block text-xs uppercase tracking-wide">Base MFN Rate</Text>
                                            <Text className="text-xl font-semibold">{result.primary.duty.baseMfn}</Text>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <Text type="secondary" className="block text-xs uppercase tracking-wide">Additional Duties</Text>
                                            <Text className="text-xl font-semibold">{result.primary.duty.additional || 'None'}</Text>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                            <Text type="secondary" className="block text-xs uppercase tracking-wide">Effective Rate</Text>
                                            <Text className="text-xl font-semibold text-amber-700">{result.primary.duty.effective}</Text>
                                        </div>
                                    </div>
                                )}

                                {/* HTS Path */}
                                <Collapse ghost>
                                    <Panel 
                                        header={
                                            <span className="text-slate-600">
                                                <TrendingUp size={16} className="inline mr-2" />
                                                View Full HTS Path
                                            </span>
                                        } 
                                        key="1"
                                    >
                                        <HtsPathDisplay path={result.primary.path} />
                                    </Panel>
                                </Collapse>

                                {/* "Other" Exclusions */}
                                {result.primary.isOther && result.primary.otherExclusions && (
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <Text strong className="block mb-2">
                                            <Info size={16} className="inline mr-2" />
                                            Why &quot;Other&quot;?
                                        </Text>
                                        <Text type="secondary">
                                            This product doesn&apos;t match specific carve-outs for: {result.primary.otherExclusions.join(', ')}
                                        </Text>
                                    </div>
                                )}

                                {/* Detected Info */}
                                <div className="flex gap-4 text-sm">
                                    {result.detectedMaterial && (
                                        <Tag>Detected Material: {result.detectedMaterial}</Tag>
                                    )}
                                    {result.detectedChapters.length > 0 && (
                                        <Tag>Chapters: {result.detectedChapters.join(', ')}</Tag>
                                    )}
                                </div>
                            </div>
                        </Card>

                        {/* Conditional Classification - Decision Questions */}
                        {result.conditionalClassification?.hasConditions && (
                            <Card 
                                className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white"
                                title={
                                    <div className="flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-purple-600" />
                                        <span>Need More Details</span>
                                    </div>
                                }
                            >
                                {result.conditionalClassification.guidance && (
                                    <div className="p-3 bg-purple-100 rounded-lg mb-4">
                                        <Text className="text-purple-800">
                                            {result.conditionalClassification.guidance}
                                        </Text>
                                    </div>
                                )}
                                
                                {/* Decision Questions */}
                                {result.conditionalClassification.decisionQuestions.length > 0 && (
                                    <div className="space-y-4 mb-4">
                                        {result.conditionalClassification.decisionQuestions.map((q) => (
                                            <div key={q.id} className="p-4 bg-white rounded-lg border border-purple-200">
                                                <Text strong className="block mb-3 text-lg text-slate-800">
                                                    {q.question}
                                                </Text>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {q.options.map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => opt.htsCode && copyToClipboard(opt.htsCode)}
                                                            className="p-3 text-left rounded-lg border-2 border-purple-100 hover:border-purple-400 hover:bg-purple-50 transition-all"
                                                        >
                                                            <div className="font-medium text-slate-800">{opt.label}</div>
                                                            {opt.htsCodeFormatted && (
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span className="font-mono text-sm text-purple-600">
                                                                        {opt.htsCodeFormatted}
                                                                    </span>
                                                                    {opt.dutyRate && (
                                                                        <span className="text-xs text-slate-500">
                                                                            ({opt.dutyRate})
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Alternative Codes Reference */}
                                {result.conditionalClassification.alternatives.length > 0 && (
                                    <Collapse ghost className="mt-4">
                                        <Panel 
                                            header={
                                                <span className="text-slate-600">
                                                    View All Conditional Codes ({result.conditionalClassification.alternatives.length})
                                                </span>
                                            } 
                                            key="1"
                                        >
                                            <div className="space-y-2">
                                                {result.conditionalClassification.alternatives.map((alt) => (
                                                    <div 
                                                        key={alt.code}
                                                        className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                                                    >
                                                        <div>
                                                            <span className="font-mono text-purple-700 mr-2">
                                                                {alt.codeFormatted}
                                                            </span>
                                                            <span className="text-sm text-slate-600">
                                                                {alt.keyCondition}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {alt.dutyRate && (
                                                                <Tag color="default">{alt.dutyRate}</Tag>
                                                            )}
                                                            {alt.dutyDifference && (
                                                                <Tag color={alt.dutyDifference.includes('lower') ? 'green' : 'orange'}>
                                                                    {alt.dutyDifference}
                                                                </Tag>
                                                            )}
                                                            <Button 
                                                                size="small"
                                                                icon={<Copy size={12} />} 
                                                                onClick={() => copyToClipboard(alt.code)}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </Panel>
                                    </Collapse>
                                )}
                            </Card>
                        )}

                        {/* Alternative Classifications */}
                        {result.alternatives.length > 0 && (
                            <Card 
                                title={
                                    <div className="flex items-center gap-2">
                                        <span>Alternative Classifications</span>
                                        <Tag>{result.alternatives.length} options</Tag>
                                    </div>
                                }
                                className="border-slate-200"
                            >
                                <div className="space-y-3">
                                    {(showAllAlternatives ? result.alternatives : result.alternatives.slice(0, 5)).map((alt, idx) => (
                                        <div 
                                            key={alt.htsCode}
                                            className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 mb-2">
                                                <Tag color="default">#{alt.rank}</Tag>
                                                <span className="font-mono text-lg font-semibold">
                                                    {alt.htsCodeFormatted}
                                                </span>
                                                <Tooltip title="Copy HTS Code">
                                                    <Button 
                                                        size="small"
                                                        icon={<Copy size={14} />} 
                                                        onClick={() => copyToClipboard(alt.htsCode)}
                                                    />
                                                </Tooltip>
                                                <ConfidenceBadge confidence={alt.confidence} />
                                                {alt.duty && (
                                                    <Tag color="gold" className="ml-auto">
                                                        {alt.duty.effective}
                                                    </Tag>
                                                )}
                                            </div>
                                            <Text className="text-slate-600">
                                                {alt.fullDescription || alt.description}
                                            </Text>
                                            <div className="mt-2">
                                                <Text type="secondary" className="text-xs">
                                                    Chapter {alt.chapter}: {alt.chapterDescription}
                                                </Text>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {result.alternatives.length > 5 && (
                                    <div className="mt-4 text-center">
                                        <Button 
                                            type="link"
                                            onClick={() => setShowAllAlternatives(!showAllAlternatives)}
                                        >
                                            {showAllAlternatives ? (
                                                <>
                                                    <ChevronUp size={16} className="mr-1" />
                                                    Show Less
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown size={16} className="mr-1" />
                                                    Show {result.alternatives.length - 5} More
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </Card>
                        )}

                        {/* Performance Stats */}
                        <Card className="border-slate-200" size="small">
                            <div className="flex items-center justify-between text-sm text-slate-500">
                                <span>Performance: Search {result.timing.search}ms | Scoring {result.timing.scoring}ms | Tariff {result.timing.tariff}ms</span>
                                <span>Total: {result.timing.total}ms</span>
                            </div>
                        </Card>
                    </>
                )}

                {/* No Results */}
                {result && !result.success && (
                    <Card className="border-orange-200 bg-orange-50">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={24} className="text-orange-600" />
                            <div>
                                <Text strong>No Classification Found</Text>
                                <Text type="secondary" className="block">
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

