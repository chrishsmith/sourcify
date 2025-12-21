'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, Typography, Steps, message, Input, Select, Button, 
    Space, Tooltip, Progress, Tag, Alert, Divider, InputNumber,
    Collapse, Radio, Spin
} from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle, HelpCircle, 
    ChevronRight, RefreshCw, Save, Download, Sparkles,
    Target, DollarSign, FileQuestion, Lightbulb, 
    Folder, FileText, TrendingUp, Info, Layers
} from 'lucide-react';
import type { GuidedClassificationResult } from '@/services/classificationEngineV4';
import type { DecisionVariable } from '@/services/ambiguityDetector';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface FormValues {
    productDescription: string;
    materialComposition?: string;
    countryOfOrigin: string;
    intendedUse?: string;
    unitValue?: number;
}

interface ClassificationSummary {
    htsCode: string;
    description: string;
    confidence: number;
    confidenceLabel: 'high' | 'medium' | 'low';
    baseDuty: string;
    dutyRange: string;
    estimatedDutyOnValue?: string;
    isAmbiguous: boolean;
    alternativeCount: number;
    questionsCount: number;
    assumptionsCount: number;
    primaryMessage: string;
    assumptions: string[];
    nextSteps: string;
}

interface TariffBreakdownData {
    countryCode: string;
    countryName: string;
    baseMfnRate: string;
    totalEffectiveRate: number;
    additionalDuties: Array<{
        programName: string;
        rate: string;
        htsCode?: string;
        explanation: string;
    }>;
    hasAdditionalDuties: boolean;
    dataSource: string;
}

interface HtsHierarchyData {
    levels: Array<{
        code: string;
        description: string;
        dutyRate?: string;
    }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER TEXT EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════

const DESCRIPTION_EXAMPLES = [
    'stainless steel kitchen chef knife, 8 inch blade, wooden handle',
    'cotton mens t-shirt, short sleeve, knit fabric, 180gsm',
    'silicone phone case for iPhone 15, protective cover',
    'LED desk lamp, adjustable arm, USB powered, 5W',
    'rubber gasket seal for industrial pump, O-ring shape',
];

const PLACEHOLDER_DESCRIPTION = `Describe your product in detail. Include:
• What it IS (essential character)
• Material composition
• Size/dimensions if relevant
• Intended use

Example: "${DESCRIPTION_EXAMPLES[0]}"`;

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STEPS
// ═══════════════════════════════════════════════════════════════════════════

const LOADING_STEPS = [
    { title: 'Analyzing', description: 'Understanding your product' },
    { title: 'Searching', description: 'Finding HTS candidates' },
    { title: 'Evaluating', description: 'Checking for ambiguity' },
    { title: 'Complete', description: 'Ready!' },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const GuidedClassificationForm: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    
    // Form state
    const [formValues, setFormValues] = useState<FormValues>({
        productDescription: '',
        materialComposition: '',
        countryOfOrigin: 'CN',
        intendedUse: '',
        unitValue: undefined,
    });
    
    // Loading state
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState(0);
    
    // Result state
    const [result, setResult] = useState<GuidedClassificationResult | null>(null);
    const [summary, setSummary] = useState<ClassificationSummary | null>(null);
    const [tariffBreakdown, setTariffBreakdown] = useState<TariffBreakdownData | null>(null);
    const [htsHierarchy, setHtsHierarchy] = useState<HtsHierarchyData | null>(null);
    
    // Question answering state
    const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, string>>({});
    const [showQuestions, setShowQuestions] = useState(false);
    
    // Loading progress simulation
    useEffect(() => {
        if (loading) {
            const intervals = [800, 2000, 4000];
            let step = 0;
            const advanceStep = () => {
                if (step < 2) {
                    step++;
                    setLoadingStep(step);
                    setTimeout(advanceStep, intervals[step] || 2000);
                }
            };
            setTimeout(advanceStep, intervals[0]);
        } else {
            setLoadingStep(0);
        }
    }, [loading]);
    
    // ═══════════════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════════════
    
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        
        if (!formValues.productDescription.trim()) {
            messageApi.warning('Please enter a product description');
            return;
        }
        
        setLoading(true);
        setLoadingStep(0);
        
        try {
            const response = await fetch('/api/classify-v4', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formValues,
                    answeredQuestions: Object.keys(answeredQuestions).length > 0 
                        ? answeredQuestions 
                        : undefined,
                }),
            });
            
            if (!response.ok) {
                throw new Error('Classification failed');
            }
            
            const data = await response.json();
            setLoadingStep(3);
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            setResult(data.result);
            setSummary(data.summary);
            setTariffBreakdown(data.tariffBreakdown || null);
            setHtsHierarchy(data.htsHierarchy || null);
            
            if (data.result?.ambiguity?.questionsToAsk?.length > 0) {
                setShowQuestions(true);
            }
            
            messageApi.success('Classification complete!');
        } catch (error) {
            console.error('Classification failed:', error);
            messageApi.error('Classification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleQuestionAnswer = (variableId: string, value: string) => {
        setAnsweredQuestions(prev => ({
            ...prev,
            [variableId]: value,
        }));
    };
    
    const handleRefineWithAnswers = async () => {
        await handleSubmit();
    };
    
    const handleNewClassification = () => {
        setResult(null);
        setSummary(null);
        setTariffBreakdown(null);
        setHtsHierarchy(null);
        setAnsweredQuestions({});
        setShowQuestions(false);
        setFormValues({
            productDescription: '',
            materialComposition: '',
            countryOfOrigin: 'CN',
            intendedUse: '',
            unitValue: undefined,
        });
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // RENDER: INPUT FORM
    // ═══════════════════════════════════════════════════════════════════════
    
    const renderInputForm = () => (
        <Card 
            className="shadow-lg border-0"
            styles={{ body: { padding: '32px' } }}
        >
            <div className="mb-6">
                <Title level={3} className="!mb-2 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-blue-500" />
                    Classify Your Product
                </Title>
                <Text type="secondary">
                    Describe your product and we&apos;ll find the right HTS code with duty estimates
                </Text>
            </div>
            
            <form onSubmit={handleSubmit}>
                {/* Product Description */}
                <div className="mb-6">
                    <label className="block mb-2 font-medium">
                        Product Description <span className="text-red-500">*</span>
                        <Tooltip title="Be specific! Include material, size, and use case for better accuracy.">
                            <HelpCircle className="inline w-4 h-4 ml-1 text-gray-400" />
                        </Tooltip>
                    </label>
                    <TextArea
                        value={formValues.productDescription}
                        onChange={(e) => setFormValues(prev => ({ 
                            ...prev, 
                            productDescription: e.target.value 
                        }))}
                        placeholder={PLACEHOLDER_DESCRIPTION}
                        rows={4}
                        className="!text-base"
                        style={{ fontSize: '16px' }}
                    />
                    <div className="mt-2 text-xs text-gray-500">
                        💡 <strong>Pro tip:</strong> The more details you provide, the more accurate the classification.
                        <br />
                        <span className="text-blue-600 cursor-pointer hover:underline" onClick={() => {
                            const example = DESCRIPTION_EXAMPLES[Math.floor(Math.random() * DESCRIPTION_EXAMPLES.length)];
                            setFormValues(prev => ({ ...prev, productDescription: example }));
                        }}>
                            Click for an example →
                        </span>
                    </div>
                </div>
                
                {/* Two column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Material */}
                    <div>
                        <label className="block mb-2 font-medium">
                            Material Composition
                            <Tooltip title="Primary material affects HTS code selection">
                                <HelpCircle className="inline w-4 h-4 ml-1 text-gray-400" />
                            </Tooltip>
                        </label>
                        <Input
                            value={formValues.materialComposition}
                            onChange={(e) => setFormValues(prev => ({ 
                                ...prev, 
                                materialComposition: e.target.value 
                            }))}
                            placeholder="e.g., stainless steel, 100% cotton, plastic"
                        />
                    </div>
                    
                    {/* Country */}
                    <div>
                        <label className="block mb-2 font-medium">
                            Country of Origin
                        </label>
                        <Select
                            value={formValues.countryOfOrigin}
                            onChange={(value) => setFormValues(prev => ({ 
                                ...prev, 
                                countryOfOrigin: value 
                            }))}
                            className="w-full"
                            options={[
                                { value: 'CN', label: '🇨🇳 China' },
                                { value: 'VN', label: '🇻🇳 Vietnam' },
                                { value: 'IN', label: '🇮🇳 India' },
                                { value: 'MX', label: '🇲🇽 Mexico' },
                                { value: 'TW', label: '🇹🇼 Taiwan' },
                                { value: 'KR', label: '🇰🇷 South Korea' },
                                { value: 'JP', label: '🇯🇵 Japan' },
                                { value: 'DE', label: '🇩🇪 Germany' },
                                { value: 'IT', label: '🇮🇹 Italy' },
                                { value: 'OTHER', label: '🌍 Other' },
                            ]}
                        />
                    </div>
                    
                    {/* Unit Value */}
                    <div>
                        <label className="block mb-2 font-medium">
                            Unit Value (USD)
                            <Tooltip title="Helps narrow down value-based HTS codes and estimate duty">
                                <HelpCircle className="inline w-4 h-4 ml-1 text-gray-400" />
                            </Tooltip>
                        </label>
                        <InputNumber
                            value={formValues.unitValue}
                            onChange={(value) => setFormValues(prev => ({ 
                                ...prev, 
                                unitValue: value || undefined 
                            }))}
                            placeholder="e.g., 45.00"
                            prefix="$"
                            className="w-full"
                            min={0}
                            step={0.01}
                        />
                    </div>
                    
                    {/* Intended Use */}
                    <div>
                        <label className="block mb-2 font-medium">
                            Intended Use
                        </label>
                        <Input
                            value={formValues.intendedUse}
                            onChange={(e) => setFormValues(prev => ({ 
                                ...prev, 
                                intendedUse: e.target.value 
                            }))}
                            placeholder="e.g., kitchen food preparation, personal wear"
                        />
                    </div>
                </div>
                
                {/* Submit Button */}
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    icon={!loading && <Target className="w-4 h-4" />}
                    className="w-full md:w-auto min-w-[200px] h-12 text-base font-medium"
                >
                    {loading ? 'Classifying...' : 'Classify Product'}
                </Button>
            </form>
            
            {/* Loading Progress */}
            {loading && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <Steps
                        current={loadingStep}
                        size="small"
                        items={LOADING_STEPS.map((step, i) => ({
                            title: step.title,
                            description: step.description,
                            icon: loadingStep === i && i < 3 ? <Spin size="small" /> : undefined,
                        }))}
                    />
                </div>
            )}
        </Card>
    );
    
    // ═══════════════════════════════════════════════════════════════════════
    // RENDER: RESULT
    // ═══════════════════════════════════════════════════════════════════════
    
    const renderResult = () => {
        if (!result || !summary) return null;
        
        const confidenceColor = 
            summary.confidenceLabel === 'high' ? 'text-green-600' :
            summary.confidenceLabel === 'medium' ? 'text-yellow-600' : 'text-red-600';
        
        const confidenceRingColor =
            summary.confidenceLabel === 'high' ? 'stroke-green-500' :
            summary.confidenceLabel === 'medium' ? 'stroke-yellow-500' : 'stroke-red-500';
        
        return (
            <div>
                {/* Main Result Card */}
                <div style={{ marginBottom: '24px' }}>
                <Card className="shadow-lg border-0" styles={{ body: { padding: '24px' } }}>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        {/* Left: Code & Description */}
                        <div className="flex-1">
                            <Text type="secondary" className="text-xs uppercase tracking-wider">
                                HTS Classification
                            </Text>
                            <div className="flex items-center gap-3 mt-1">
                                <Title level={2} className="!mb-0 font-mono">
                                    {summary.htsCode}
                                </Title>
                                <Button 
                                    type="text" 
                                    size="small"
                                    onClick={() => {
                                        navigator.clipboard.writeText(summary.htsCode);
                                        messageApi.success('Copied!');
                                    }}
                                >
                                    📋
                                </Button>
                            </div>
                            <Text className="text-base mt-2 block">
                                {summary.description}
                            </Text>
                        </div>
                        
                        {/* Right: Confidence Ring */}
                        <div className="text-center">
                            <div className="relative w-24 h-24 mx-auto">
                                <svg className="w-24 h-24 -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        fill="none"
                                        stroke="#e5e7eb"
                                        strokeWidth="8"
                                    />
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="40"
                                        fill="none"
                                        className={confidenceRingColor}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${summary.confidence * 2.51} 251`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-2xl font-bold ${confidenceColor}`}>
                                        {summary.confidence}%
                                    </span>
                                </div>
                            </div>
                            <Text type="secondary" className="text-sm capitalize">
                                {summary.confidenceLabel} Confidence
                            </Text>
                        </div>
                    </div>
                    
                    <Divider />
                    
                    {/* Duty Summary - Base Only */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                            <DollarSign className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                            <Text type="secondary" className="text-xs block">Base Duty</Text>
                            <Text strong className="text-base">{summary.baseDuty}</Text>
                        </div>
                        
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <Target className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                            <Text type="secondary" className="text-xs block">Duty Range</Text>
                            <Text strong className="text-base text-blue-600">{summary.dutyRange}</Text>
                        </div>
                    </div>
                </Card>
                </div>
                
                {/* HTS Classification Path */}
                {htsHierarchy && htsHierarchy.levels.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                    <Card 
                        className="shadow-md border-0"
                        styles={{ body: { padding: '16px 20px' } }}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Layers className="w-5 h-5 text-teal-600" />
                            <Text strong className="text-sm text-slate-700">Classification Path</Text>
                        </div>
                        <div className="space-y-1">
                            {htsHierarchy.levels.map((level, index) => (
                                <div 
                                    key={index}
                                    className="flex items-start gap-2"
                                    style={{ paddingLeft: `${index * 16}px` }}
                                >
                                    <span className="text-slate-400 text-sm flex-shrink-0 w-4">
                                        {index === 0 ? (
                                            <Folder size={14} className="text-slate-400" />
                                        ) : index === htsHierarchy.levels.length - 1 ? (
                                            <FileText size={14} className="text-teal-600" />
                                        ) : (
                                            '└'
                                        )}
                                    </span>
                                    <span className={`font-mono px-1.5 py-0.5 rounded text-xs flex-shrink-0 ${
                                        index === htsHierarchy.levels.length - 1 
                                            ? 'bg-teal-100 text-teal-700 font-semibold' 
                                            : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {level.code}
                                    </span>
                                    <span className={`text-sm leading-snug ${
                                        index === htsHierarchy.levels.length - 1 
                                            ? 'text-slate-900 font-medium' 
                                            : 'text-slate-600'
                                    }`}>
                                        {level.description}
                                    </span>
                                    {level.dutyRate && (
                                        <Tag color="green" className="text-xs ml-auto flex-shrink-0">
                                            {level.dutyRate}
                                        </Tag>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                    </div>
                )}
                
                {/* Full Tariff Breakdown */}
                {tariffBreakdown && (
                    <div style={{ marginBottom: '24px' }}>
                    <Card 
                        className="shadow-md border-0"
                        styles={{ body: { padding: '16px 20px' } }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Text className="text-slate-600 text-sm">
                                    🇨🇳 {tariffBreakdown.countryName} → 🇺🇸 US
                                </Text>
                                {tariffBreakdown.dataSource.toLowerCase().includes('live') && (
                                    <Tag color="green" className="text-xs">LIVE</Tag>
                                )}
                            </div>
                        </div>
                        
                        {/* Tariff Stack */}
                        <div className="divide-y divide-slate-100">
                            {/* Base Rate */}
                            <div className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-2">
                                    <Tag 
                                        className="font-mono text-xs border-0"
                                        style={{ backgroundColor: '#CCFBF1', color: '#0F766E' }}
                                    >
                                        {summary.htsCode}
                                    </Tag>
                                    <Text strong className="text-slate-700 text-sm">Base MFN Rate</Text>
                                </div>
                                <Text strong className="text-slate-700">
                                    {tariffBreakdown.baseMfnRate}
                                </Text>
                            </div>
                            
                            {/* Additional Duties */}
                            {tariffBreakdown.additionalDuties.map((duty, idx) => (
                                <div key={idx} className="flex items-center justify-between py-2.5">
                                    <div className="flex items-center gap-2">
                                        {duty.htsCode && (
                                            <Tag 
                                                className="font-mono text-xs border-0"
                                                style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
                                            >
                                                {duty.htsCode}
                                            </Tag>
                                        )}
                                        <Text strong className="text-slate-700 text-sm">{duty.programName}</Text>
                                        <Tooltip title={duty.explanation}>
                                            <HelpCircle size={14} className="text-slate-400 cursor-help" />
                                        </Tooltip>
                                    </div>
                                    <Text strong className="text-red-600">{duty.rate}</Text>
                                </div>
                            ))}
                        </div>
                        
                        {/* Total Effective Rate */}
                        {tariffBreakdown.hasAdditionalDuties && (
                            <div 
                                className="flex items-center justify-between py-3 px-3 rounded-lg mt-3"
                                style={{ 
                                    backgroundColor: tariffBreakdown.totalEffectiveRate >= 50 ? '#FEE2E2' : 
                                                     tariffBreakdown.totalEffectiveRate >= 25 ? '#FEF3C7' : '#D1FAE5',
                                    border: `1px solid ${tariffBreakdown.totalEffectiveRate >= 50 ? '#FECACA' : 
                                                         tariffBreakdown.totalEffectiveRate >= 25 ? '#FDE68A' : '#A7F3D0'}`
                                }}
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={18} className={
                                        tariffBreakdown.totalEffectiveRate >= 50 ? 'text-red-600' : 
                                        tariffBreakdown.totalEffectiveRate >= 25 ? 'text-amber-600' : 'text-green-600'
                                    } />
                                    <Text strong className="text-slate-800">Total Effective Rate</Text>
                                </div>
                                <Text className="text-xl font-bold" style={{ 
                                    color: tariffBreakdown.totalEffectiveRate >= 50 ? '#DC2626' : 
                                           tariffBreakdown.totalEffectiveRate >= 25 ? '#D97706' : '#059669'
                                }}>
                                    {tariffBreakdown.totalEffectiveRate}%
                                </Text>
                            </div>
                        )}
                        
                        <div className="mt-3 pt-2 border-t border-slate-100">
                            <Text className="text-xs text-slate-400">
                                Rates for informational purposes. Verify with CBP before import.
                                {tariffBreakdown.dataSource && (
                                    <span className="text-slate-500 ml-2">({tariffBreakdown.dataSource})</span>
                                )}
                            </Text>
                        </div>
                    </Card>
                    </div>
                )}
                
                {/* Ambiguity Alert */}
                {summary.isAmbiguous && (
                    <div style={{ marginBottom: '24px' }}>
                    <Alert
                        type={summary.questionsCount > 0 ? 'warning' : 'info'}
                        icon={<AlertTriangle className="w-5 h-5" />}
                        message={summary.primaryMessage}
                        description={
                            <div className="mt-2">
                                <Text>{summary.nextSteps}</Text>
                                {summary.questionsCount > 0 && (
                                    <Button 
                                        type="link" 
                                        className="p-0 mt-2"
                                        onClick={() => setShowQuestions(true)}
                                    >
                                        Answer {summary.questionsCount} question(s) to refine →
                                    </Button>
                                )}
                            </div>
                        }
                        showIcon
                    />
                    </div>
                )}
                
                {/* Assumptions */}
                {summary.assumptions.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                    <Card size="small" className="bg-yellow-50 border-yellow-200">
                        <div className="flex items-start gap-2">
                            <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <Text strong className="text-yellow-800">We assumed:</Text>
                                <ul className="mt-1 mb-0 pl-4">
                                    {summary.assumptions.map((assumption, i) => (
                                        <li key={i} className="text-yellow-700">{assumption}</li>
                                    ))}
                                </ul>
                                <Button 
                                    type="link" 
                                    size="small"
                                    className="p-0 mt-1"
                                    onClick={() => setShowQuestions(true)}
                                >
                                    Correct if needed →
                                </Button>
                            </div>
                        </div>
                    </Card>
                    </div>
                )}
                
                {/* Questions Panel */}
                {showQuestions && result.ambiguity?.questionsToAsk?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                    <Card 
                        title={
                            <span className="flex items-center gap-2">
                                <FileQuestion className="w-5 h-5 text-blue-500" />
                                Refine Your Classification
                            </span>
                        }
                        className="border-blue-200"
                    >
                        <div className="space-y-6">
                            {result.ambiguity.questionsToAsk.map((question: DecisionVariable) => (
                                <div key={question.id}>
                                    <Text strong className="block mb-2">
                                        {question.question}
                                    </Text>
                                    
                                    {question.type === 'select' && question.options && (
                                        <Radio.Group
                                            value={answeredQuestions[question.id]}
                                            onChange={(e) => handleQuestionAnswer(question.id, e.target.value)}
                                            className="w-full"
                                        >
                                            <Space direction="vertical" className="w-full">
                                                {question.options.map((opt) => (
                                                    <Radio 
                                                        key={opt.value} 
                                                        value={opt.value}
                                                        className="w-full p-2 border rounded hover:bg-gray-50"
                                                    >
                                                        <div>
                                                            <Text strong>{opt.label}</Text>
                                                            {opt.description && (
                                                                <Text type="secondary" className="text-xs block">
                                                                    {opt.description}
                                                                </Text>
                                                            )}
                                                        </div>
                                                    </Radio>
                                                ))}
                                            </Space>
                                        </Radio.Group>
                                    )}
                                    
                                    {question.type === 'value' && (
                                        <InputNumber
                                            value={answeredQuestions[question.id] ? parseFloat(answeredQuestions[question.id]) : undefined}
                                            onChange={(val) => handleQuestionAnswer(question.id, String(val))}
                                            placeholder="Enter value"
                                            prefix="$"
                                            className="w-full max-w-xs"
                                        />
                                    )}
                                </div>
                            ))}
                            
                            <Button
                                type="primary"
                                icon={<RefreshCw className="w-4 h-4" />}
                                onClick={handleRefineWithAnswers}
                                loading={loading}
                                disabled={Object.keys(answeredQuestions).length === 0}
                            >
                                Refine Classification
                            </Button>
                        </div>
                    </Card>
                    </div>
                )}
                
                {/* Alternative Codes */}
                {result.alternativeCodes && result.alternativeCodes.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                    <Collapse ghost>
                        <Panel 
                            header={
                                <span className="flex items-center gap-2">
                                    <ChevronRight className="w-4 h-4" />
                                    View {result.alternativeCodes.length} Alternative Code(s)
                                </span>
                            } 
                            key="alternatives"
                        >
                            <div className="space-y-2">
                                {result.alternativeCodes.map((alt) => (
                                    <div 
                                        key={alt.code}
                                        className="p-3 bg-gray-50 rounded flex justify-between items-center"
                                    >
                                        <div>
                                            <Text strong className="font-mono">{alt.code}</Text>
                                            <Text type="secondary" className="text-sm block">
                                                {alt.description}
                                            </Text>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Panel>
                    </Collapse>
                    </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3" style={{ marginTop: '24px' }}>
                    <Button 
                        icon={<Save className="w-4 h-4" />}
                        onClick={() => messageApi.info('Product Library coming soon!')}
                    >
                        Save to Library
                    </Button>
                    <Button 
                        icon={<Download className="w-4 h-4" />}
                        onClick={() => messageApi.info('Export coming soon!')}
                    >
                        Export
                    </Button>
                    <Button 
                        type="primary"
                        icon={<RefreshCw className="w-4 h-4" />}
                        onClick={handleNewClassification}
                    >
                        New Classification
                    </Button>
                </div>
            </div>
        );
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════════════════════
    
    return (
        <div className="max-w-4xl mx-auto">
            {contextHolder}
            
            {!result ? renderInputForm() : renderResult()}
        </div>
    );
};

export default GuidedClassificationForm;

