'use client';

import React, { useState } from 'react';
import { 
    Card, Typography, Input, Button, Tag, Space, Tooltip, 
    Collapse, Spin, Progress, Divider, Select, message, Modal, Form 
} from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle, Copy, ChevronRight,
    Zap, ExternalLink, Info, TrendingUp, ChevronDown, ChevronUp, 
    Bookmark, BookmarkCheck, Brain, CheckCircle2, HelpCircle, XCircle,
    FileText, ArrowDownCircle, SortAsc, SortDesc, DollarSign, BarChart3,
    Globe, Plus, X, Award, ArrowRight
} from 'lucide-react';
import { exportClassificationPDF, type ClassificationPDFData } from '@/services/pdfExportService';

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
        effectiveNumeric?: number;
        breakdown?: Array<{ program: string; rate: number; description?: string }>;
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

// AI Reasoning interface - explains WHY the classification was chosen
interface AIReasoning {
    summary: string;
    chapterReasoning: {
        chapter: string;
        description: string;
        explanation: string;
    };
    headingReasoning: {
        heading: string;
        description: string;
        explanation: string;
    };
    codeReasoning: {
        code: string;
        description: string;
        explanation: string;
    };
    keyFactors: Array<{
        factor: string;
        value: string;
        impact: 'positive' | 'neutral' | 'uncertain';
        explanation: string;
    }>;
    exclusions?: Array<{
        code: string;
        description: string;
        reason: string;
    }>;
    confidence: {
        level: 'high' | 'medium' | 'low';
        explanation: string;
    };
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
    aiReasoning?: AIReasoning;
    conditionalClassification?: {
        hasConditions: boolean;
        guidance?: string;
        decisionQuestions: DecisionQuestion[];
        alternatives: ConditionalAlternative[];
    };
}

// Country comparison interface
interface CountryDutyComparison {
    countryCode: string;
    countryName: string;
    flag: string;
    effectiveRate: number;
    baseMfnRate: number;
    ieepaRate: number;
    section301Rate: number;
    section232Rate: number;
    hasFta: boolean;
    ftaName: string | null;
    ftaDiscount: number;
    breakdownSummary: string;
    warnings: string[];
    savingsVsCurrent?: number;
    isBestOption?: boolean;
    tradeStatus: string;
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
        <div className="space-y-2 sm:space-y-1">
            {path.codes.map((code, idx) => (
                <div key={code} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2 text-sm py-1 sm:py-0 border-b sm:border-0 border-slate-100 last:border-0">
                    <span className="text-slate-400 w-24 flex-shrink-0 font-medium">{levels[idx]}:</span>
                    <div className="flex items-start gap-1 sm:gap-2 pl-2 sm:pl-0">
                        <span className="font-mono text-slate-600 flex-shrink-0">{code}</span>
                        <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-0.5 hidden sm:block" />
                        <span className="text-slate-700 text-xs sm:text-sm">{path.descriptions[idx]}</span>
                    </div>
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
    
    // Save to My Products state
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [productName, setProductName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [form] = Form.useForm();
    
    // PDF export state
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    
    // Alternatives sorting and comparison state
    const [alternativeSortBy, setAlternativeSortBy] = useState<'confidence' | 'duty'>('confidence');
    const [selectedAlternative, setSelectedAlternative] = useState<V10Alternative | null>(null);
    const [dutyModalOpen, setDutyModalOpen] = useState(false);
    
    // Country comparison state
    const [countryCompareOpen, setCountryCompareOpen] = useState(false);
    const [countryCompareLoading, setCountryCompareLoading] = useState(false);
    const [countryComparisons, setCountryComparisons] = useState<CountryDutyComparison[]>([]);
    const [selectedCountries, setSelectedCountries] = useState<string[]>(['CN', 'VN', 'IN', 'MX', 'TH']);
    const [availableCountries, setAvailableCountries] = useState<Array<{code: string; name: string; flag: string}>>([]);

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
        setIsSaved(false);
        setProductName('');
    };

    // Generate a default product name from description
    const generateProductName = (desc: string): string => {
        // Take first 50 chars and clean up
        const cleaned = desc.trim().slice(0, 50);
        // Capitalize first letter
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    };

    const openSaveModal = () => {
        const defaultName = generateProductName(description);
        setProductName(defaultName);
        form.setFieldsValue({ productName: defaultName });
        setSaveModalOpen(true);
    };

    const handleSaveProduct = async () => {
        if (!result?.primary) return;
        
        setIsSaving(true);
        try {
            const response = await fetch('/api/saved-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: productName.trim() || generateProductName(description),
                    description: description.trim(),
                    htsCode: result.primary.htsCode,
                    htsDescription: result.primary.fullDescription,
                    countryOfOrigin: origin,
                    baseDutyRate: result.primary.duty?.baseMfn || null,
                    effectiveDutyRate: result.primary.duty?.effective 
                        ? parseFloat(result.primary.duty.effective.replace('%', '')) 
                        : null,
                    sourceSearchId: result.searchHistoryId || null,
                    isMonitored: false,
                    isFavorite: false,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                if (response.status === 401) {
                    messageApi.warning('Please sign in to save products');
                    return;
                }
                throw new Error(data.error || 'Failed to save');
            }

            setIsSaved(true);
            setSaveModalOpen(false);
            messageApi.success(
                <span>
                    Product saved to My Products! 
                    <a href="/dashboard/products" className="ml-2 text-blue-600 underline">
                        View →
                    </a>
                </span>
            );
        } catch (error) {
            console.error('Failed to save product:', error);
            messageApi.error('Failed to save product. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportPDF = async () => {
        if (!result?.primary) return;
        
        setIsExportingPDF(true);
        try {
            const pdfData: ClassificationPDFData = {
                productDescription: description,
                countryOfOrigin: origin,
                material: material,
                primary: result.primary,
                aiReasoning: result.aiReasoning,
                classifiedAt: new Date(),
            };
            
            await exportClassificationPDF(pdfData);
            messageApi.success('PDF report downloaded!');
        } catch (error) {
            console.error('PDF export failed:', error);
            messageApi.error('Failed to generate PDF. Please try again.');
        } finally {
            setIsExportingPDF(false);
        }
    };

    // Fetch available countries on first open
    const fetchAvailableCountries = async () => {
        try {
            const response = await fetch('/api/duty-comparison');
            if (response.ok) {
                const data = await response.json();
                setAvailableCountries(data.countries || []);
            }
        } catch (error) {
            console.error('Failed to fetch countries:', error);
        }
    };

    // Compare countries
    const handleCompareCountries = async () => {
        if (!result?.primary) return;
        
        setCountryCompareOpen(true);
        setCountryCompareLoading(true);
        
        // Fetch available countries if not loaded
        if (availableCountries.length === 0) {
            await fetchAvailableCountries();
        }
        
        try {
            // Parse base MFN rate from duty string
            const baseMfnRate = result.primary.duty?.baseMfn 
                ? parseFloat(result.primary.duty.baseMfn.replace('%', '').replace('Free', '0'))
                : 0;
            
            // Parse current effective rate
            const currentRate = result.primary.duty?.effective
                ? parseFloat(result.primary.duty.effective.replace('%', ''))
                : 0;
            
            const response = await fetch('/api/duty-comparison', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    htsCode: result.primary.htsCode,
                    baseMfnRate,
                    countries: selectedCountries,
                    currentCountry: origin,
                    currentRate,
                }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to compare countries');
            }
            
            const data = await response.json();
            setCountryComparisons(data.comparisons || []);
        } catch (error) {
            console.error('Country comparison failed:', error);
            messageApi.error('Failed to compare countries. Please try again.');
        } finally {
            setCountryCompareLoading(false);
        }
    };

    // Add a country to comparison
    const addCountryToCompare = (countryCode: string) => {
        if (!selectedCountries.includes(countryCode)) {
            setSelectedCountries([...selectedCountries, countryCode]);
        }
    };

    // Remove a country from comparison
    const removeCountryFromCompare = (countryCode: string) => {
        setSelectedCountries(selectedCountries.filter(c => c !== countryCode));
    };

    // Re-run comparison when countries change
    const handleRefreshComparison = async () => {
        if (countryCompareOpen && result?.primary) {
            setCountryCompareLoading(true);
            await handleCompareCountries();
        }
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

                        <div className="flex flex-col sm:flex-row gap-4">
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
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                                    <div className="text-2xl sm:text-4xl font-mono font-bold text-slate-900 tracking-wider break-all">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <Text type="secondary" className="block text-xs uppercase tracking-wide">Base MFN Rate</Text>
                                            <Text className="text-lg sm:text-xl font-semibold">{result.primary.duty.baseMfn}</Text>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg">
                                            <Text type="secondary" className="block text-xs uppercase tracking-wide">Additional Duties</Text>
                                            <Text className="text-lg sm:text-xl font-semibold">{result.primary.duty.additional || 'None'}</Text>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                            <Text type="secondary" className="block text-xs uppercase tracking-wide">Effective Rate</Text>
                                            <Text className="text-lg sm:text-xl font-semibold text-amber-700">{result.primary.duty.effective}</Text>
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

                                {/* AI Reasoning Section */}
                                {result.aiReasoning && (
                                    <Collapse 
                                        defaultActiveKey={['ai-reasoning']}
                                        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"
                                    >
                                        <Panel 
                                            header={
                                                <div className="flex items-center gap-2">
                                                    <Brain size={18} className="text-blue-600" />
                                                    <span className="font-semibold text-slate-800">AI Reasoning</span>
                                                    <Tag 
                                                        color={
                                                            result.aiReasoning.confidence.level === 'high' ? 'green' : 
                                                            result.aiReasoning.confidence.level === 'medium' ? 'gold' : 'orange'
                                                        }
                                                    >
                                                        {result.aiReasoning.confidence.level === 'high' ? <CheckCircle2 size={12} className="inline mr-1" /> : 
                                                         result.aiReasoning.confidence.level === 'medium' ? <HelpCircle size={12} className="inline mr-1" /> :
                                                         <AlertTriangle size={12} className="inline mr-1" />}
                                                        {result.aiReasoning.confidence.level.charAt(0).toUpperCase() + result.aiReasoning.confidence.level.slice(1)} Confidence
                                                    </Tag>
                                                </div>
                                            } 
                                            key="ai-reasoning"
                                        >
                                            <div className="space-y-5 p-2">
                                                {/* Summary */}
                                                <div className="p-3 bg-white rounded-lg border border-blue-100">
                                                    <Text className="text-slate-700">{result.aiReasoning.summary}</Text>
                                                </div>

                                                {/* Chapter Reasoning */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                                                            1
                                                        </div>
                                                        <Text strong className="text-slate-800">
                                                            Chapter {result.aiReasoning.chapterReasoning.chapter}: {result.aiReasoning.chapterReasoning.description}
                                                        </Text>
                                                    </div>
                                                    <div className="ml-10 p-3 bg-white rounded-lg border border-slate-200">
                                                        <Text className="text-slate-600">{result.aiReasoning.chapterReasoning.explanation}</Text>
                                                    </div>
                                                </div>

                                                {/* Heading Reasoning */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                                                            2
                                                        </div>
                                                        <Text strong className="text-slate-800">
                                                            Heading {result.aiReasoning.headingReasoning.heading}
                                                            {result.aiReasoning.headingReasoning.description && `: ${result.aiReasoning.headingReasoning.description}`}
                                                        </Text>
                                                    </div>
                                                    <div className="ml-10 p-3 bg-white rounded-lg border border-slate-200">
                                                        <Text className="text-slate-600">{result.aiReasoning.headingReasoning.explanation}</Text>
                                                    </div>
                                                </div>

                                                {/* Code Reasoning */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-sm">
                                                            3
                                                        </div>
                                                        <Text strong className="text-slate-800">
                                                            Code {result.aiReasoning.codeReasoning.code}
                                                        </Text>
                                                    </div>
                                                    <div className="ml-10 p-3 bg-white rounded-lg border border-slate-200">
                                                        <Text className="text-slate-600">{result.aiReasoning.codeReasoning.explanation}</Text>
                                                    </div>
                                                </div>

                                                {/* Key Factors */}
                                                {result.aiReasoning.keyFactors.length > 0 && (
                                                    <div>
                                                        <Text strong className="text-slate-800 block mb-3">Key Classification Factors</Text>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {result.aiReasoning.keyFactors.map((factor, idx) => (
                                                                <div 
                                                                    key={idx} 
                                                                    className={`p-3 rounded-lg border ${
                                                                        factor.impact === 'positive' ? 'bg-green-50 border-green-200' :
                                                                        factor.impact === 'uncertain' ? 'bg-amber-50 border-amber-200' :
                                                                        'bg-slate-50 border-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        {factor.impact === 'positive' ? (
                                                                            <CheckCircle2 size={16} className="text-green-600" />
                                                                        ) : factor.impact === 'uncertain' ? (
                                                                            <HelpCircle size={16} className="text-amber-600" />
                                                                        ) : (
                                                                            <Info size={16} className="text-slate-500" />
                                                                        )}
                                                                        <Text strong className="text-slate-700">{factor.factor}</Text>
                                                                        <Tag className="ml-auto">{factor.value}</Tag>
                                                                    </div>
                                                                    <Text type="secondary" className="text-sm">{factor.explanation}</Text>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Exclusions (for "Other" codes) */}
                                                {result.aiReasoning.exclusions && result.aiReasoning.exclusions.length > 0 && (
                                                    <div>
                                                        <Text strong className="text-slate-800 block mb-3">
                                                            <XCircle size={16} className="inline mr-2 text-red-500" />
                                                            Why Not Other Codes?
                                                        </Text>
                                                        <div className="space-y-2">
                                                            {result.aiReasoning.exclusions.map((exclusion, idx) => (
                                                                <div 
                                                                    key={idx} 
                                                                    className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                                                                >
                                                                    <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <Text className="font-mono text-sm text-slate-600">{exclusion.code}</Text>
                                                                        <Text className="text-slate-500 mx-2">—</Text>
                                                                        <Text className="text-slate-700">{exclusion.description}</Text>
                                                                        <Text type="secondary" className="block text-sm mt-1">
                                                                            {exclusion.reason}
                                                                        </Text>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Confidence Explanation */}
                                                <div className={`p-3 rounded-lg border ${
                                                    result.aiReasoning.confidence.level === 'high' ? 'bg-green-50 border-green-200' :
                                                    result.aiReasoning.confidence.level === 'medium' ? 'bg-amber-50 border-amber-200' :
                                                    'bg-orange-50 border-orange-200'
                                                }`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {result.aiReasoning.confidence.level === 'high' ? (
                                                            <CheckCircle2 size={16} className="text-green-600" />
                                                        ) : result.aiReasoning.confidence.level === 'medium' ? (
                                                            <HelpCircle size={16} className="text-amber-600" />
                                                        ) : (
                                                            <AlertTriangle size={16} className="text-orange-600" />
                                                        )}
                                                        <Text strong className="text-slate-700">Confidence Assessment</Text>
                                                    </div>
                                                    <Text className="text-slate-600">{result.aiReasoning.confidence.explanation}</Text>
                                                </div>
                                            </div>
                                        </Panel>
                                    </Collapse>
                                )}

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
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {q.options.map((opt) => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => opt.htsCode && copyToClipboard(opt.htsCode)}
                                                            className="p-3 text-left rounded-lg border-2 border-purple-100 hover:border-purple-400 hover:bg-purple-50 transition-all"
                                                        >
                                                            <div className="font-medium text-slate-800">{opt.label}</div>
                                                            {opt.htsCodeFormatted && (
                                                                <div className="flex flex-wrap items-center gap-2 mt-1">
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
                        {result.alternatives.length > 0 && (() => {
                            // Get primary effective rate for comparison
                            const primaryEffectiveRate = result.primary?.duty?.effective
                                ? parseFloat(result.primary.duty.effective.replace('%', ''))
                                : null;
                            
                            // Sort alternatives based on selected sort method
                            const sortedAlternatives = [...result.alternatives].sort((a, b) => {
                                if (alternativeSortBy === 'duty') {
                                    const aRate = a.duty?.effectiveNumeric ?? 999;
                                    const bRate = b.duty?.effectiveNumeric ?? 999;
                                    return aRate - bRate; // Lowest duty first
                                }
                                return b.confidence - a.confidence; // Highest confidence first
                            });
                            
                            const displayAlternatives = showAllAlternatives 
                                ? sortedAlternatives 
                                : sortedAlternatives.slice(0, 5);
                            
                            return (
                                <Card 
                                    title={
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span>Alternative Classifications</span>
                                                <Tag>{result.alternatives.length} options</Tag>
                                            </div>
                                            {/* Sort Controls */}
                                            <div className="flex items-center gap-2">
                                                <Text type="secondary" className="text-xs hidden sm:inline">Sort by:</Text>
                                                <Button.Group size="small">
                                                    <Tooltip title="Sort by confidence">
                                                        <Button
                                                            type={alternativeSortBy === 'confidence' ? 'primary' : 'default'}
                                                            icon={<BarChart3 size={14} />}
                                                            onClick={() => setAlternativeSortBy('confidence')}
                                                            className={alternativeSortBy === 'confidence' ? 'bg-teal-500 border-teal-500' : ''}
                                                        >
                                                            <span className="hidden sm:inline ml-1">Confidence</span>
                                                        </Button>
                                                    </Tooltip>
                                                    <Tooltip title="Sort by duty rate (lowest first)">
                                                        <Button
                                                            type={alternativeSortBy === 'duty' ? 'primary' : 'default'}
                                                            icon={<DollarSign size={14} />}
                                                            onClick={() => setAlternativeSortBy('duty')}
                                                            className={alternativeSortBy === 'duty' ? 'bg-teal-500 border-teal-500' : ''}
                                                        >
                                                            <span className="hidden sm:inline ml-1">Duty Rate</span>
                                                        </Button>
                                                    </Tooltip>
                                                </Button.Group>
                                            </div>
                                        </div>
                                    }
                                    className="border-slate-200"
                                >
                                    <div className="space-y-3">
                                        {displayAlternatives.map((alt, idx) => {
                                            // Check if this alternative has lower duty than primary
                                            const altEffectiveRate = alt.duty?.effectiveNumeric ?? null;
                                            const hasLowerDuty = primaryEffectiveRate !== null && 
                                                altEffectiveRate !== null && 
                                                altEffectiveRate < primaryEffectiveRate;
                                            const dutySavings = hasLowerDuty && primaryEffectiveRate !== null && altEffectiveRate !== null
                                                ? (primaryEffectiveRate - altEffectiveRate).toFixed(1)
                                                : null;
                                            
                                            return (
                                                <div 
                                                    key={alt.htsCode}
                                                    className={`p-3 sm:p-4 rounded-lg border transition-colors ${
                                                        hasLowerDuty 
                                                            ? 'bg-green-50 border-green-200 hover:border-green-300' 
                                                            : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-2">
                                                        <Tag color="default">#{idx + 2}</Tag>
                                                        <span className="font-mono text-base sm:text-lg font-semibold break-all">
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
                                                        
                                                        {/* Duty Rate Display with Lower Duty Indicator */}
                                                        <div className="flex items-center gap-2 sm:ml-auto">
                                                            {alt.duty && (
                                                                <>
                                                                    {hasLowerDuty && (
                                                                        <Tooltip title={`${dutySavings}% lower than primary classification`}>
                                                                            <Tag 
                                                                                color="success"
                                                                                className="flex items-center gap-1"
                                                                            >
                                                                                <ArrowDownCircle size={12} />
                                                                                Lower Duty
                                                                            </Tag>
                                                                        </Tooltip>
                                                                    )}
                                                                    <Tooltip title="Click for full duty breakdown">
                                                                        <Button 
                                                                            size="small"
                                                                            type={hasLowerDuty ? 'primary' : 'default'}
                                                                            className={hasLowerDuty ? 'bg-green-600 border-green-600 hover:bg-green-700' : ''}
                                                                            onClick={() => {
                                                                                setSelectedAlternative(alt);
                                                                                setDutyModalOpen(true);
                                                                            }}
                                                                        >
                                                                            {alt.duty.effective}
                                                                        </Button>
                                                                    </Tooltip>
                                                                </>
                                                            )}
                                                            {!alt.duty && (
                                                                <Tag color="default">Duty N/A</Tag>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Text className="text-slate-600 text-sm sm:text-base">
                                                        {alt.fullDescription || alt.description}
                                                    </Text>
                                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                                        <Text type="secondary" className="text-xs">
                                                            Chapter {alt.chapter}: {alt.chapterDescription}
                                                        </Text>
                                                        {alt.materialNote && (
                                                            <Tag color="blue" className="text-xs">
                                                                {alt.materialNote}
                                                            </Tag>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
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
                            );
                        })()}

                        {/* Action Buttons */}
                        <Card className="border-slate-200">
                            <div className="flex flex-wrap gap-3">
                                <Button size="large" onClick={handleReset}>
                                    New Classification
                                </Button>
                                
                                {!isSaved ? (
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<Bookmark size={16} />}
                                        onClick={openSaveModal}
                                        className="bg-gradient-to-r from-teal-500 to-teal-600 border-none hover:from-teal-600 hover:to-teal-700"
                                    >
                                        Save to My Products
                                    </Button>
                                ) : (
                                    <Button
                                        size="large"
                                        icon={<BookmarkCheck size={16} className="text-green-600" />}
                                        disabled
                                        className="bg-green-50 border-green-200"
                                    >
                                        <span className="text-green-700">Saved ✓</span>
                                    </Button>
                                )}
                                
                                <Button
                                    size="large"
                                    icon={<FileText size={16} />}
                                    onClick={handleExportPDF}
                                    loading={isExportingPDF}
                                >
                                    {isExportingPDF ? 'Generating PDF...' : 'Export PDF Report'}
                                </Button>
                                
                                <Button
                                    size="large"
                                    icon={<Globe size={16} />}
                                    onClick={handleCompareCountries}
                                    className="border-purple-200 text-purple-700 hover:border-purple-400 hover:text-purple-800"
                                >
                                    Compare Countries
                                </Button>
                            </div>
                        </Card>

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

            {/* Save to My Products Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Bookmark size={20} className="text-teal-600" />
                        <span>Save to My Products</span>
                    </div>
                }
                open={saveModalOpen}
                onCancel={() => setSaveModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setSaveModalOpen(false)}>
                        Cancel
                    </Button>,
                    <Button
                        key="save"
                        type="primary"
                        loading={isSaving}
                        onClick={handleSaveProduct}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        Save Product
                    </Button>,
                ]}
            >
                <Form form={form} layout="vertical" className="mt-4">
                    <Form.Item
                        name="productName"
                        label="Product Name"
                        rules={[{ required: true, message: 'Please enter a product name' }]}
                    >
                        <Input
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Enter a name for this product"
                            maxLength={100}
                        />
                    </Form.Item>
                    
                    {result?.primary && (
                        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                            <div>
                                <Text type="secondary" className="text-xs uppercase tracking-wide">HTS Code</Text>
                                <div className="font-mono text-lg font-semibold text-slate-900">
                                    {result.primary.htsCodeFormatted}
                                </div>
                            </div>
                            <div>
                                <Text type="secondary" className="text-xs uppercase tracking-wide">Country of Origin</Text>
                                <div className="text-slate-800">{origin}</div>
                            </div>
                            {result.primary.duty && (
                                <div>
                                    <Text type="secondary" className="text-xs uppercase tracking-wide">Effective Duty Rate</Text>
                                    <div className="text-slate-800 font-semibold">{result.primary.duty.effective}</div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="mt-4 text-sm text-slate-500">
                        This product will be saved to your library for easy access and monitoring.
                    </div>
                </Form>
            </Modal>

            {/* Alternative Duty Breakdown Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <DollarSign size={20} className="text-amber-600" />
                        <span>Duty Breakdown</span>
                    </div>
                }
                open={dutyModalOpen}
                onCancel={() => {
                    setDutyModalOpen(false);
                    setSelectedAlternative(null);
                }}
                footer={[
                    <Button 
                        key="close" 
                        onClick={() => {
                            setDutyModalOpen(false);
                            setSelectedAlternative(null);
                        }}
                    >
                        Close
                    </Button>,
                    <Button
                        key="copy"
                        type="primary"
                        icon={<Copy size={14} />}
                        onClick={() => {
                            if (selectedAlternative) {
                                copyToClipboard(selectedAlternative.htsCode);
                            }
                        }}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        Copy HTS Code
                    </Button>,
                ]}
                width={500}
            >
                {selectedAlternative && (
                    <div className="space-y-4">
                        {/* HTS Code Display */}
                        <div className="bg-slate-50 rounded-lg p-4">
                            <Text type="secondary" className="text-xs uppercase tracking-wide">HTS Code</Text>
                            <div className="font-mono text-2xl font-bold text-slate-900 mt-1">
                                {selectedAlternative.htsCodeFormatted}
                            </div>
                            <Text className="text-slate-600 text-sm mt-2 block">
                                {selectedAlternative.fullDescription || selectedAlternative.description}
                            </Text>
                        </div>

                        {/* Duty Rates */}
                        {selectedAlternative.duty && (
                            <div className="space-y-3">
                                {/* Base MFN Rate */}
                                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <Tag color="cyan" className="font-mono text-xs">
                                            {selectedAlternative.htsCodeFormatted.slice(0, 10)}
                                        </Tag>
                                        <Text strong className="text-slate-700">Base MFN Rate</Text>
                                    </div>
                                    <Text strong className="text-slate-700">
                                        {selectedAlternative.duty.baseMfn}
                                    </Text>
                                </div>

                                {/* Duty Breakdown Items */}
                                {selectedAlternative.duty.breakdown && selectedAlternative.duty.breakdown.length > 0 && (
                                    <>
                                        {selectedAlternative.duty.breakdown.map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                className="flex items-center justify-between py-2 border-b border-slate-100"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Tag color="orange" className="font-mono text-xs">
                                                        +{item.rate}%
                                                    </Tag>
                                                    <div>
                                                        <Text strong className="text-slate-700">{item.program}</Text>
                                                        {item.description && (
                                                            <Text type="secondary" className="text-xs block">
                                                                {item.description}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </div>
                                                <Text strong className="text-amber-600">
                                                    +{item.rate}%
                                                </Text>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Total Effective Rate */}
                                <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-amber-50 border border-amber-200 mt-4">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={18} className="text-amber-600" />
                                        <Text strong className="text-slate-800">Total Effective Rate</Text>
                                    </div>
                                    <Text className="text-xl font-bold text-amber-700">
                                        {selectedAlternative.duty.effective}
                                    </Text>
                                </div>

                                {/* Comparison with Primary */}
                                {result?.primary?.duty?.effective && (() => {
                                    const primaryRate = parseFloat(result.primary.duty.effective.replace('%', ''));
                                    const altRate = selectedAlternative.duty.effectiveNumeric ?? 0;
                                    const difference = primaryRate - altRate;
                                    
                                    if (difference !== 0) {
                                        return (
                                            <div className={`flex items-center justify-between py-3 px-4 rounded-lg mt-2 ${
                                                difference > 0 
                                                    ? 'bg-green-50 border border-green-200' 
                                                    : 'bg-red-50 border border-red-200'
                                            }`}>
                                                <Text className={difference > 0 ? 'text-green-700' : 'text-red-700'}>
                                                    {difference > 0 ? 'Savings vs. Primary' : 'Additional vs. Primary'}
                                                </Text>
                                                <Text className={`font-bold ${difference > 0 ? 'text-green-700' : 'text-red-700'}`}>
                                                    {difference > 0 ? '-' : '+'}{Math.abs(difference).toFixed(1)}%
                                                </Text>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        )}

                        {!selectedAlternative.duty && (
                            <div className="p-4 bg-slate-50 rounded-lg text-center">
                                <Text type="secondary">
                                    Duty rate not available for this classification.
                                    Try selecting a different country of origin.
                                </Text>
                            </div>
                        )}

                        {/* Chapter Info */}
                        <div className="pt-4 border-t border-slate-200">
                            <Text type="secondary" className="text-xs">
                                Chapter {selectedAlternative.chapter}: {selectedAlternative.chapterDescription}
                            </Text>
                            {selectedAlternative.materialNote && (
                                <Tag color="blue" className="mt-2 text-xs">
                                    {selectedAlternative.materialNote}
                                </Tag>
                            )}
                        </div>

                        {/* Disclaimer */}
                        <div className="pt-3 border-t border-slate-100">
                            <Text className="text-xs text-slate-400">
                                Rates for informational purposes only. Verify with CBP before import.
                            </Text>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Country Comparison Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Globe size={20} className="text-purple-600" />
                        <span>Compare Countries</span>
                        {result?.primary && (
                            <Tag color="purple" className="ml-2 font-mono">
                                {result.primary.htsCodeFormatted}
                            </Tag>
                        )}
                    </div>
                }
                open={countryCompareOpen}
                onCancel={() => setCountryCompareOpen(false)}
                footer={[
                    <Button key="close" onClick={() => setCountryCompareOpen(false)}>
                        Close
                    </Button>,
                ]}
                width={800}
            >
                <div className="space-y-4">
                    {/* Add/Remove Countries Section */}
                    <div className="bg-slate-50 rounded-lg p-4">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            <Text type="secondary" className="text-sm">Comparing:</Text>
                            {selectedCountries.map((code) => {
                                const country = availableCountries.find(c => c.code === code) || {
                                    code,
                                    name: code,
                                    flag: '🌍',
                                };
                                return (
                                    <Tag
                                        key={code}
                                        closable
                                        onClose={() => removeCountryFromCompare(code)}
                                        className="flex items-center gap-1 py-1 px-2"
                                    >
                                        <span>{country.flag}</span>
                                        <span>{country.name}</span>
                                    </Tag>
                                );
                            })}
                        </div>
                        
                        {/* Add Country Select */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <Select
                                placeholder="Add country..."
                                style={{ width: 200 }}
                                size="small"
                                showSearch
                                optionFilterProp="label"
                                value={undefined}
                                onChange={(code: string) => {
                                    addCountryToCompare(code);
                                }}
                                options={availableCountries
                                    .filter(c => !selectedCountries.includes(c.code))
                                    .map(c => ({
                                        value: c.code,
                                        label: `${c.flag} ${c.name}`,
                                    }))
                                }
                            />
                            <Button 
                                size="small" 
                                type="primary"
                                icon={<ArrowRight size={14} />}
                                onClick={handleRefreshComparison}
                                disabled={countryCompareLoading}
                                className="bg-purple-600 hover:bg-purple-700 border-none"
                            >
                                Update Comparison
                            </Button>
                        </div>
                    </div>

                    {/* Loading State */}
                    {countryCompareLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Spin size="large" />
                            <Text className="ml-4 text-slate-600">
                                Calculating duty rates for {selectedCountries.length} countries...
                            </Text>
                        </div>
                    )}

                    {/* Comparison Results */}
                    {!countryCompareLoading && countryComparisons.length > 0 && (
                        <div className="space-y-3">
                            {/* Sort by effective rate */}
                            {[...countryComparisons]
                                .sort((a, b) => a.effectiveRate - b.effectiveRate)
                                .map((comparison, idx) => {
                                    const isCurrent = comparison.countryCode === origin;
                                    const hasLowerDuty = comparison.savingsVsCurrent && comparison.savingsVsCurrent > 0;
                                    const hasHigherDuty = comparison.savingsVsCurrent && comparison.savingsVsCurrent < 0;
                                    
                                    return (
                                        <div 
                                            key={comparison.countryCode}
                                            className={`p-4 rounded-lg border-2 transition-all ${
                                                comparison.isBestOption 
                                                    ? 'bg-green-50 border-green-300' 
                                                    : isCurrent
                                                        ? 'bg-purple-50 border-purple-200'
                                                        : 'bg-white border-slate-200'
                                            }`}
                                        >
                                            {/* Country Header */}
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-2xl">{comparison.flag}</span>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Text strong className="text-lg">
                                                                {comparison.countryName}
                                                            </Text>
                                                            {comparison.isBestOption && (
                                                                <Tag color="success" className="flex items-center gap-1">
                                                                    <Award size={12} />
                                                                    Best Option
                                                                </Tag>
                                                            )}
                                                            {isCurrent && (
                                                                <Tag color="purple">Current Selection</Tag>
                                                            )}
                                                        </div>
                                                        {comparison.hasFta && (
                                                            <Text type="secondary" className="text-xs">
                                                                {comparison.ftaName}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* Effective Rate Display */}
                                                <div className="text-right">
                                                    <div className={`text-2xl font-bold ${
                                                        comparison.isBestOption ? 'text-green-700' : 'text-slate-800'
                                                    }`}>
                                                        {comparison.effectiveRate.toFixed(1)}%
                                                    </div>
                                                    <Text type="secondary" className="text-xs">
                                                        Total Effective Rate
                                                    </Text>
                                                </div>
                                            </div>
                                            
                                            {/* Duty Breakdown */}
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {comparison.baseMfnRate > 0 && (
                                                    <Tag color="cyan">
                                                        Base: {comparison.baseMfnRate}%
                                                    </Tag>
                                                )}
                                                {comparison.ftaDiscount > 0 && (
                                                    <Tag color="green">
                                                        FTA: -{comparison.ftaDiscount}%
                                                    </Tag>
                                                )}
                                                {comparison.ieepaRate > 0 && (
                                                    <Tag color="orange">
                                                        IEEPA: +{comparison.ieepaRate}%
                                                    </Tag>
                                                )}
                                                {comparison.section301Rate > 0 && (
                                                    <Tag color="red">
                                                        §301: +{comparison.section301Rate}%
                                                    </Tag>
                                                )}
                                                {comparison.section232Rate > 0 && (
                                                    <Tag color="magenta">
                                                        §232: +{comparison.section232Rate}%
                                                    </Tag>
                                                )}
                                            </div>
                                            
                                            {/* Savings vs Current */}
                                            {comparison.savingsVsCurrent !== undefined && !isCurrent && (
                                                <div className={`flex items-center gap-2 p-2 rounded ${
                                                    hasLowerDuty 
                                                        ? 'bg-green-100 text-green-800' 
                                                        : hasHigherDuty
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {hasLowerDuty && (
                                                        <>
                                                            <ArrowDownCircle size={16} />
                                                            <Text strong className="text-green-800">
                                                                Save {comparison.savingsVsCurrent.toFixed(1)}% vs {origin}
                                                            </Text>
                                                        </>
                                                    )}
                                                    {hasHigherDuty && (
                                                        <>
                                                            <TrendingUp size={16} />
                                                            <Text strong className="text-red-800">
                                                                {Math.abs(comparison.savingsVsCurrent).toFixed(1)}% higher than {origin}
                                                            </Text>
                                                        </>
                                                    )}
                                                    {!hasLowerDuty && !hasHigherDuty && (
                                                        <Text className="text-slate-600">
                                                            Same rate as {origin}
                                                        </Text>
                                                    )}
                                                </div>
                                            )}
                                            
                                            {/* Warnings */}
                                            {comparison.warnings.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {comparison.warnings.map((warning, i) => (
                                                        <div 
                                                            key={i}
                                                            className="flex items-start gap-1 text-xs text-amber-700"
                                                        >
                                                            <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
                                                            <span>{warning}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                        </div>
                    )}

                    {/* Empty State */}
                    {!countryCompareLoading && countryComparisons.length === 0 && (
                        <div className="text-center py-8">
                            <Globe size={48} className="mx-auto text-slate-300 mb-3" />
                            <Text type="secondary">
                                Click &quot;Update Comparison&quot; to fetch duty rates
                            </Text>
                        </div>
                    )}

                    {/* Disclaimer */}
                    <div className="pt-3 border-t border-slate-200">
                        <Text className="text-xs text-slate-400">
                            Duty rates are estimates based on current tariff schedules. Actual rates may vary.
                            Verify with CBP before making sourcing decisions.
                        </Text>
                    </div>
                </div>
            </Modal>
        </>
    );
}

