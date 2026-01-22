'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, Typography, Input, Button, Tag, Tooltip, 
    Spin, Select, message 
} from 'antd';
import { 
    CheckCircle, AlertTriangle, Copy, ChevronRight,
    Zap, Bookmark, Globe, ArrowRight, Scale, Crown, Sparkles, TrendingDown, DollarSign
} from 'lucide-react';
import Link from 'next/link';

// Teaser data type
interface OptimizerTeaser {
    hasOpportunity: boolean;
    alternativeCount: number;
    bestAlternative?: {
        code: string;
        formattedCode: string;
        description: string;
        totalRate: number;
        savings: number;
    };
    currentRate: number;
}

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
        groupings?: string[]; // Parent groupings like "Men's or boys':"
        chapterDescription?: string; // Chapter-level description (e.g., "Articles of apparel...")
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
    headingDescription?: string;
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

interface ClarificationOption {
    value: string;
    label: string;
    hint?: string;
}

interface NeedsClarification {
    reason: string;
    question: string;
    options: ClarificationOption[];
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
    needsClarification?: NeedsClarification;
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

export interface ClassificationV10LayoutBProps {
    initialDescription?: string;
    initialOrigin?: string;
    initialMaterial?: string;
    autoClassify?: boolean;
    onClassifyComplete?: () => void;
}

export default function ClassificationV10LayoutB({
    initialDescription = '',
    initialOrigin = 'CN',
    initialMaterial,
    autoClassify = false,
    onClassifyComplete,
}: ClassificationV10LayoutBProps) {
    const [description, setDescription] = useState(initialDescription);
    const [origin, setOrigin] = useState(initialOrigin);
    const [material, setMaterial] = useState<string | undefined>(initialMaterial);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<V10Response | null>(null);
    const [selectedAltIndex, setSelectedAltIndex] = useState<number | null>(null); // null = original primary
    const [messageApi, contextHolder] = message.useMessage();
    const [optimizerTeaser, setOptimizerTeaser] = useState<OptimizerTeaser | null>(null);
    const [loadingTeaser, setLoadingTeaser] = useState(false);
    const [hasAutoClassified, setHasAutoClassified] = useState(false);

    // Update state when initial values change (for re-classify)
    useEffect(() => {
        if (initialDescription) {
            setDescription(initialDescription);
            setResult(null);
            setSelectedAltIndex(null);
        }
    }, [initialDescription]);

    useEffect(() => {
        if (initialOrigin) {
            setOrigin(initialOrigin);
        }
    }, [initialOrigin]);

    useEffect(() => {
        setMaterial(initialMaterial);
    }, [initialMaterial]);

    // Auto-classify when requested (for re-classify from history)
    useEffect(() => {
        if (autoClassify && initialDescription && !hasAutoClassified && !loading) {
            setHasAutoClassified(true);
            // Slight delay to ensure state is updated
            const timer = setTimeout(() => {
                handleClassifyAuto();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [autoClassify, initialDescription, hasAutoClassified, loading]);

    // Reset hasAutoClassified when initialDescription changes
    useEffect(() => {
        setHasAutoClassified(false);
    }, [initialDescription]);

    // Fetch optimizer teaser when classification completes
    useEffect(() => {
        const fetchTeaser = async () => {
            if (!result?.success || !result.primary) return;
            
            setLoadingTeaser(true);
            try {
                // Parse the effective rate from the result
                let currentRate = 0;
                if (result.primary.duty?.effective) {
                    const match = result.primary.duty.effective.match(/([\d.]+)%/);
                    if (match) currentRate = parseFloat(match[1]);
                }
                
                const response = await fetch('/api/duty-optimizer/teaser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        htsCode: result.primary.htsCode,
                        currentRate,
                        countryOfOrigin: origin,
                    }),
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setOptimizerTeaser(data);
                }
            } catch (err) {
                console.error('Error fetching optimizer teaser:', err);
            } finally {
                setLoadingTeaser(false);
            }
        };
        
        fetchTeaser();
    }, [result, origin]);

    const handleClassify = async () => {
        if (!description.trim()) {
            messageApi.warning('Please enter a product description');
            return;
        }

        await performClassification();
    };

    // Auto-classify function (called from useEffect)
    const handleClassifyAuto = async () => {
        if (!description.trim()) return;
        await performClassification();
    };

    const performClassification = async () => {
        setLoading(true);
        setResult(null);
        setSelectedAltIndex(null);

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
                messageApi.success('Classification complete');
                onClassifyComplete?.();
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

    // Helper to strip HTML/XML tags like <il>, </il> from HTS descriptions
    const stripHtmlTags = (text: string) => {
        return text.replace(/<[^>]*>/g, '').trim();
    };

    const handleReset = () => {
        setResult(null);
        setDescription('');
        setSelectedAltIndex(null);
    };

    // Get the currently displayed result (original or selected alternative)
    const getDisplayedResult = () => {
        if (!result || !result.primary) return null;
        
        if (selectedAltIndex === null) {
            // Show original primary
            return {
                isOriginal: true,
                htsCode: result.primary.htsCode,
                htsCodeFormatted: result.primary.htsCodeFormatted,
                confidence: result.primary.confidence,
                shortDescription: stripHtmlTags(result.primary.shortDescription),
                fullDescription: stripHtmlTags(result.primary.fullDescription),
                path: {
                    ...result.primary.path,
                    descriptions: result.primary.path.descriptions.map(d => stripHtmlTags(d)),
                    chapterDescription: result.primary.path.chapterDescription ? stripHtmlTags(result.primary.path.chapterDescription) : undefined,
                },
                duty: result.primary.duty,
            };
        }
        
        // Show selected alternative
        const alt = result.alternatives[selectedAltIndex];
        if (!alt) return null;
        
        // Build a simplified path from alternative data
        const chapter = alt.chapter;
        const heading = alt.htsCode.substring(0, 4);
        const subheading = alt.htsCode.substring(0, 6);
        
        // Use the heading description from the API, or fall back to parsing fullDescription
        const headingDesc = alt.headingDescription 
            ? stripHtmlTags(alt.headingDescription)
            : stripHtmlTags(alt.fullDescription.split(':')[1]?.trim() || alt.description);
        
        return {
            isOriginal: false,
            htsCode: alt.htsCode,
            htsCodeFormatted: alt.htsCodeFormatted,
            confidence: alt.confidence,
            shortDescription: stripHtmlTags(alt.description),
            fullDescription: stripHtmlTags(alt.fullDescription),
            path: {
                codes: [chapter, heading, subheading, alt.htsCode],
                descriptions: [headingDesc, stripHtmlTags(alt.description)],
                groupings: [], // Alternatives don't have groupings data
                chapterDescription: alt.chapterDescription ? stripHtmlTags(alt.chapterDescription) : undefined,
            },
            duty: alt.duty ? {
                baseMfn: alt.duty.baseMfn,
                additional: 'N/A',
                effective: alt.duty.effective,
            } : null,
        };
    };

    const displayedResult = result?.primary ? getDisplayedResult() : null;

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
                {result && result.success && result.primary && displayedResult && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-12 gap-5">
                            {/* Main Result - Left Column (8 cols) */}
                            <div className="col-span-8 flex flex-col gap-5">
                                {/* Primary Result Card - with integrated header */}
                                <Card className="border-slate-200 shadow-sm">
                                    {/* Query Header */}
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                                        <span className="text-slate-600">
                                            &ldquo;<strong className="text-slate-900">{description}</strong>&rdquo;
                                        </span>
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
                                            {displayedResult.htsCodeFormatted}
                                        </span>
                                        <Tooltip title="Copy HTS code to clipboard">
                                            <Button 
                                                size="small"
                                                type="text"
                                                icon={<Copy size={14} />} 
                                                onClick={() => copyToClipboard(displayedResult.htsCode)}
                                                className="text-slate-400 hover:text-slate-600"
                                            />
                                        </Tooltip>
                                        <Tooltip title="How confident we are in this classification based on how well your description matches the HTS code">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-slate-400 uppercase tracking-wide">Match</span>
                                                <ConfidenceBadge confidence={displayedResult.confidence} />
                                            </div>
                                        </Tooltip>
                                    </div>

                                    <Text className="text-slate-600 text-sm block mb-4">
                                        {(displayedResult.shortDescription || displayedResult.fullDescription).replace(/\s*\(\d{3}\)\s*$/, '')}
                                    </Text>

                                {/* HTS Path - Expanded with hierarchy labels */}
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <Text className="font-medium text-slate-400 uppercase text-xs tracking-wide block mb-3">
                                        Classification Path
                                    </Text>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200">
                                        {(() => {
                                            // Helper to remove quota category codes like (338), (352), etc. AND HTML tags like <il>
                                            const cleanDescription = (desc: string) => 
                                                desc.replace(/<[^>]*>/g, '').replace(/\s*\(\d{3}\)\s*$/, '').trim();
                                            
                                            // Build full 4-level hierarchy from tariff code
                                            const tariffCode = displayedResult.htsCodeFormatted.replace(/\./g, '');
                                            const pathData = displayedResult.path;
                                            const groupings = pathData.groupings || [];
                                            
                                            // Extract chapter, heading from the tariff code
                                            const chapter = tariffCode.substring(0, 2);
                                            const heading = tariffCode.substring(0, 4);
                                            const subheading = tariffCode.substring(0, 6);
                                            
                                            // Get the heading description (index 0) - this is the main product category
                                            const headingDesc = cleanDescription(pathData.descriptions[0] || '');
                                            // Get the chapter description from the API response
                                            const chapterDesc = pathData.chapterDescription || `Chapter ${chapter}`;
                                            
                                            // Build full hierarchy with fallback descriptions
                                            type PathLevel = { 
                                                code: string; 
                                                formatted: string; 
                                                level: string; 
                                                description: string;
                                                isGrouping?: boolean;
                                            };
                                            
                                            const levels: PathLevel[] = [
                                                { 
                                                    code: chapter, 
                                                    formatted: chapter,
                                                    level: 'Chapter',
                                                    // Use the actual chapter description
                                                    description: chapterDesc
                                                },
                                                { 
                                                    code: heading, 
                                                    formatted: heading,
                                                    level: 'Heading',
                                                    description: headingDesc
                                                },
                                                { 
                                                    code: subheading, 
                                                    formatted: `${subheading.substring(0, 4)}.${subheading.substring(4)}`,
                                                    level: 'Subheading',
                                                    // Get the subheading-specific description if available (index 1 = "Of cotton")
                                                    description: cleanDescription(pathData.descriptions[1] || headingDesc)
                                                },
                                            ];
                                            
                                            // Add parent groupings (e.g., "Men's or boys':")
                                            // These go between Subheading and Tariff to show the indent structure
                                            groupings.forEach((grouping, idx) => {
                                                levels.push({
                                                    code: `grouping-${idx}`,
                                                    formatted: '↳',
                                                    level: 'Category',
                                                    description: cleanDescription(grouping),
                                                    isGrouping: true,
                                                });
                                            });
                                            
                                            // Add final tariff code
                                            levels.push({ 
                                                code: tariffCode, 
                                                formatted: displayedResult.htsCodeFormatted,
                                                level: 'Tariff',
                                                description: cleanDescription(displayedResult.shortDescription)
                                            });
                                            
                                            return levels.map((item) => (
                                                <div 
                                                    key={item.code} 
                                                    className={`flex items-start p-3 hover:bg-slate-50 transition-colors ${
                                                        item.isGrouping ? 'bg-amber-50/50' : ''
                                                    }`}
                                                >
                                                    <div className="w-36 shrink-0">
                                                        <span className={`font-mono font-medium ${
                                                            item.isGrouping ? 'text-amber-600' : 'text-violet-600'
                                                        }`}>
                                                            {item.formatted}
                                                        </span>
                                                        <span className={`block text-xs mt-0.5 ${
                                                            item.isGrouping ? 'text-amber-500' : 'text-slate-400'
                                                        }`}>
                                                            {item.level}
                                                        </span>
                                                    </div>
                                                    <span className={`text-sm line-clamp-2 ${
                                                        item.isGrouping ? 'text-amber-700 font-medium' : 'text-slate-600'
                                                    }`}>
                                                        {item.description}
                                                    </span>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            </Card>

                            {/* Duty Breakdown Card - Receipt Style */}
                            {displayedResult.duty && (
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
                                            <span className="font-semibold text-slate-900">{displayedResult.duty.baseMfn}</span>
                                        </div>
                                        
                                        {/* Additional Tariffs - show if different from base MFN */}
                                        {displayedResult.isOriginal && displayedResult.duty.additional && 
                                         displayedResult.duty.additional !== '0%' && 
                                         displayedResult.duty.additional !== '0.0%' && (
                                            <div className="flex justify-between items-center py-1.5 text-slate-600">
                                                <span>+ Additional Duties</span>
                                                <span className="font-semibold">{displayedResult.duty.additional}</span>
                                            </div>
                                        )}
                                        
                                        {/* Divider */}
                                        <div className="border-t border-slate-300 border-dashed my-2" />
                                        
                                        {/* Effective Total */}
                                        <div className="flex justify-between items-center py-1.5">
                                            <span className="font-bold text-slate-900">EFFECTIVE TOTAL</span>
                                            <span className="font-bold text-lg text-amber-600">{displayedResult.duty.effective}</span>
                                        </div>
                                    </div>
                                </Card>
                            )}

                            {/* Low Confidence Clarification Card */}
                            {result.needsClarification && (
                                <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={16} className="text-blue-500" />
                                        <Text className="font-medium text-blue-800">Help us improve this result</Text>
                                    </div>
                                    <Text className="text-sm text-slate-700 block mb-3">
                                        {result.needsClarification.question}
                                    </Text>
                                    <div className="flex gap-2 flex-wrap">
                                        {result.needsClarification.options.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => {
                                                    // Re-classify with clarification
                                                    if (result.needsClarification?.reason.includes('material')) {
                                                        setMaterial(opt.value);
                                                    }
                                                    // Trigger re-classification
                                                    setDescription(prev => prev);
                                                    setTimeout(() => handleClassify(), 100);
                                                }}
                                                className="px-3 py-2 text-sm rounded-lg border border-blue-300 bg-white hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                            >
                                                <span className="font-medium">{opt.label}</span>
                                                {opt.hint && (
                                                    <span className="text-xs text-blue-600 ml-2">
                                                        ({opt.hint})
                                                    </span>
                                                )}
                                            </button>
                                        ))}
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
                            {/* Alternatives Card - Zonos Style */}
                            <Card className="border-slate-200 shadow-sm">
                                {/* Original Result - Always shown at top */}
                                <Text className="font-medium text-slate-500 uppercase text-xs tracking-wide block mb-2">
                                    Original
                                </Text>
                                <div 
                                    className={`p-2.5 rounded-lg border-2 transition-all cursor-pointer mb-4 ${
                                        selectedAltIndex === null 
                                            ? 'border-emerald-400 bg-emerald-50' 
                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                    onClick={() => setSelectedAltIndex(null)}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-mono text-sm font-medium text-slate-900">
                                            {result.primary!.htsCodeFormatted}
                                        </span>
                                        <span className="text-xs text-slate-400">{Math.round(result.primary!.confidence)}%</span>
                                    </div>
                                    <div className="text-xs text-slate-600 line-clamp-1">
                                        {result.primary!.shortDescription.replace(/<[^>]*>/g, '').replace(/\s*\(\d{3}\)\s*$/, '')}
                                    </div>
                                </div>

                                {/* Alternatives */}
                                {result.alternatives.length > 0 && (
                                    <>
                                        <Text className="font-medium text-slate-500 uppercase text-xs tracking-wide block mb-2">
                                            Alternates
                                        </Text>
                                        <div className="space-y-2">
                                            {result.alternatives.slice(0, 6).map((alt, idx) => (
                                                <div 
                                                    key={alt.htsCode}
                                                    className={`p-2.5 rounded-lg border-2 transition-all cursor-pointer ${
                                                        selectedAltIndex === idx 
                                                            ? 'border-blue-400 bg-blue-50' 
                                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                    onClick={() => setSelectedAltIndex(idx)}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="font-mono text-sm font-medium text-slate-900">
                                                            {alt.htsCodeFormatted}
                                                        </span>
                                                        <span className="text-xs text-slate-400">{Math.round(alt.confidence)}%</span>
                                                    </div>
                                                    <div className="text-xs text-slate-600 line-clamp-1">
                                                        {alt.description.replace(/<[^>]*>/g, '').replace(/\s*\(\d{3}\)\s*$/, '')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {result.alternatives.length > 6 && (
                                            <Button type="link" size="small" className="mt-2 p-0 text-xs">
                                                + {result.alternatives.length - 6} more
                                                <ArrowRight size={12} className="ml-1" />
                                            </Button>
                                        )}
                                    </>
                                )}
                            </Card>

                            {/* Duty Optimizer Teaser Card - Dynamic */}
                            <Card 
                                className={`shadow-sm cursor-pointer hover:shadow-md transition-all ${
                                    optimizerTeaser?.hasOpportunity 
                                        ? 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 hover:border-emerald-400' 
                                        : 'border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 hover:border-violet-300'
                                }`}
                                size="small"
                            >
                                <Link 
                                    href={`/dashboard/optimizer?product=${encodeURIComponent(description)}&origin=${origin}`} 
                                    className="block"
                                >
                                    {loadingTeaser ? (
                                        <div className="flex items-center justify-center py-3">
                                            <Spin size="small" />
                                            <Text className="text-xs text-slate-500 ml-2">Checking for savings...</Text>
                                        </div>
                                    ) : optimizerTeaser?.hasOpportunity ? (
                                        /* Show strategic savings opportunity */
                                        <div className="flex items-start gap-3">
                                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg p-2 flex-shrink-0">
                                                <TrendingDown size={16} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Text className="font-semibold text-emerald-900">
                                                        💰 Could Save {optimizerTeaser.bestAlternative?.savings.toFixed(0)}% with Strategic Classification
                                                    </Text>
                                                </div>
                                                <Text className="text-xs text-emerald-700 block mb-2">
                                                    Your product may qualify for a lower rate. See how to legally optimize your classification.
                                                </Text>
                                                <div className="bg-white/60 rounded-lg p-2 mb-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span className="text-slate-600">Your current rate:</span>
                                                        <span className="font-medium text-slate-700">{optimizerTeaser.currentRate.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-slate-600">Potential optimized rate:</span>
                                                        <span className="font-bold text-emerald-700">as low as {optimizerTeaser.bestAlternative?.totalRate.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="border-t border-emerald-200 mt-2 pt-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-medium text-emerald-800">Savings if you qualify:</span>
                                                            <span className="font-bold text-emerald-600">
                                                                ${Math.round((optimizerTeaser.bestAlternative?.savings || 0) / 100 * 10000).toLocaleString()}/10k
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <Text className="text-xs text-emerald-700 font-medium">
                                                        See if you qualify →
                                                    </Text>
                                                    <Tag color="purple" className="text-[10px] flex items-center gap-0.5">
                                                        <Crown size={8} />
                                                        PRO
                                                    </Tag>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Default teaser - no savings found or still checking */
                                        <div className="flex items-start gap-3">
                                            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg p-2 flex-shrink-0">
                                                <Scale size={16} className="text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Text className="font-semibold text-violet-900">
                                                        Find All Applicable Codes
                                                    </Text>
                                                    <Tag color="purple" className="text-xs flex items-center gap-0.5">
                                                        <Crown size={10} />
                                                        PRO
                                                    </Tag>
                                                </div>
                                                <Text className="text-xs text-violet-700 block mb-2">
                                                    {optimizerTeaser?.alternativeCount 
                                                        ? `${optimizerTeaser.alternativeCount} other codes may apply. Analyze all options to ensure you're using the best classification.`
                                                        : 'Search exhaustively for all applicable codes and compare duty rates.'
                                                    }
                                                </Text>
                                                <div className="flex flex-wrap gap-1">
                                                    <Tag className="text-[10px] border-violet-200 text-violet-600">
                                                        <Sparkles size={10} className="mr-0.5" />
                                                        AI Analysis
                                                    </Tag>
                                                    <Tag className="text-[10px] border-violet-200 text-violet-600">
                                                        All Codes
                                                    </Tag>
                                                    <Tag className="text-[10px] border-violet-200 text-violet-600">
                                                        <DollarSign size={10} className="mr-0.5" />
                                                        Savings
                                                    </Tag>
                                                </div>
                                            </div>
                                            <ArrowRight size={16} className="text-violet-400 mt-1 flex-shrink-0" />
                                        </div>
                                    )}
                                </Link>
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

