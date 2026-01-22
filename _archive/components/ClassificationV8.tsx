'use client';

import React, { useState } from 'react';
import { 
    Typography, Input, Button, Tag, Alert, 
    Space, Collapse, Spin, message, Card, Radio
} from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle,
    Sparkles, Brain, TreeDeciduous, HelpCircle,
    ArrowRight, ChevronDown, Zap
} from 'lucide-react';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (matching V8 API response)
// ═══════════════════════════════════════════════════════════════════════════

interface DecisionOption {
    value: string;
    label: string;
    htsImpact: string;
    dutyEstimate?: string;
}

interface DecisionPoint {
    id: string;
    attribute: string;
    question: string;
    options: DecisionOption[];
    impact: 'high' | 'medium' | 'low';
    currentValue?: string;
    currentSource?: string;
}

interface NavigationStep {
    level: string;
    code: string;
    codeFormatted: string;
    description: string;
    reasoning: string;
    selected: boolean;
    alternatives: { code: string; description: string; whyNot: string }[];
}

interface TreePath {
    steps: NavigationStep[];
    finalCode: string;
    finalCodeFormatted: string;
    generalRate: string | null;
    confidence: number;
}

interface ProductUnderstanding {
    whatThisIs: string;
    productType: string;
    material: string;
    materialSource: string;
    useContext: string;
    isForCarrying: boolean;
    isToy: boolean;
    isJewelry: boolean;
    isWearable: boolean;
    isLighting: boolean;
}

interface Transparency {
    stated: string[];
    inferred: string[];
    assumed: string[];
}

interface HierarchyLevel {
    level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
    code: string;
    codeFormatted: string;
    description: string;
    hasCode: boolean;
    dutyRate?: string | null;
}

interface ClassificationHierarchy {
    levels: HierarchyLevel[];
    breadcrumb: string;
    fullDescription: string;
}

interface V8APIResponse {
    needsInput: boolean;
    questions?: DecisionPoint[];
    productUnderstanding?: ProductUnderstanding;
    htsCode?: string;
    htsCodeFormatted?: string;
    description?: string;
    generalRate?: string | null;
    confidence?: number;
    confidenceLabel?: 'high' | 'medium' | 'low';
    treePath?: TreePath;
    hierarchy?: ClassificationHierarchy;
    routeApplied?: string;
    transparency?: Transparency;
    processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ClassificationV8Props {
    onSaveSuccess?: () => void;
}

export default function ClassificationV8({ onSaveSuccess }: ClassificationV8Props = {}) {
    const [description, setDescription] = useState('');
    const [material, setMaterial] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<V8APIResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Question answers
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const handleClassify = async (withAnswers?: Record<string, string>) => {
        if (!description.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/classify-v8', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    description,
                    material: material || undefined,
                    answers: withAnswers || (Object.keys(answers).length > 0 ? answers : undefined),
                }),
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            setResult(data);
            
            if (!data.needsInput) {
                message.success('Classification complete!');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            message.error('Classification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerQuestion = (questionId: string, value: string) => {
        const newAnswers = { ...answers, [questionId]: value };
        setAnswers(newAnswers);
    };

    const handleSubmitAnswers = () => {
        handleClassify(answers);
    };

    const handleReset = () => {
        setResult(null);
        setAnswers({});
        setDescription('');
        setMaterial('');
        setError(null);
    };

    // Confidence badge
    const getConfidenceBadge = (confidence: number, label: string) => {
        const color = label === 'high' ? 'green' : label === 'medium' ? 'gold' : 'red';
        const icon = label === 'high' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />;
        return (
            <Tag color={color} className="flex items-center gap-1">
                {icon}
                {Math.round(confidence * 100)}% {label}
            </Tag>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <Zap className="text-amber-500" size={24} />
                <Title level={4} className="!mb-0">V8 Arbiter Classification</Title>
                <Tag color="gold">Ask Upfront</Tag>
            </div>
            <Text type="secondary" className="block">
                V8 asks critical questions <strong>before</strong> classification for higher accuracy.
            </Text>

            {/* Input Form */}
            {!result && (
                <Card className="border-amber-200">
                    <Space direction="vertical" className="w-full" size="middle">
                        <div>
                            <Text strong className="block mb-2">Product Description *</Text>
                            <TextArea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="e.g., Indoor planter for houseplants, polyester fleece blanket, silicone phone case..."
                                rows={3}
                                className="w-full"
                            />
                        </div>
                        
                        <div>
                            <Text strong className="block mb-2">Material (optional)</Text>
                            <Input
                                value={material}
                                onChange={(e) => setMaterial(e.target.value)}
                                placeholder="e.g., plastic, ceramic, cotton, stainless steel..."
                            />
                            <Text type="secondary" className="text-xs mt-1 block">
                                If you know the material, enter it here to skip the material question.
                            </Text>
                        </div>

                        <Button 
                            type="primary" 
                            size="large"
                            onClick={() => handleClassify()}
                            loading={loading}
                            icon={loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            className="bg-amber-500 hover:bg-amber-600 border-amber-500"
                            disabled={!description.trim()}
                        >
                            {loading ? 'Analyzing...' : 'Classify Product'}
                        </Button>
                    </Space>
                </Card>
            )}

            {/* Error */}
            {error && (
                <Alert 
                    type="error" 
                    message="Classification Error" 
                    description={error}
                    showIcon 
                />
            )}

            {/* Questions Phase */}
            {result?.needsInput && result.questions && (
                <Card className="border-amber-300 bg-amber-50">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="text-amber-600" size={20} />
                            <Title level={5} className="!mb-0">Quick Question</Title>
                        </div>
                        
                        {result.productUnderstanding && (
                            <Text type="secondary" className="block">
                                I understand this is a <strong>{result.productUnderstanding.productType}</strong>.
                                To classify accurately, I need to know:
                            </Text>
                        )}

                        {result.questions.map((q) => (
                            <div key={q.id} className="bg-white p-4 rounded-lg border">
                                <Text strong className="block mb-3">{q.question}</Text>
                                <Radio.Group 
                                    onChange={(e) => handleAnswerQuestion(q.id, e.target.value)}
                                    value={answers[q.id]}
                                    className="w-full"
                                >
                                    <Space direction="vertical" className="w-full">
                                        {q.options.map((opt) => (
                                            <Radio key={opt.value} value={opt.value} className="w-full">
                                                <div className="inline-flex items-center gap-3">
                                                    <span className="font-medium">{opt.label}</span>
                                                    <span className="text-xs text-slate-500">
                                                        {opt.htsImpact}{opt.dutyEstimate && ` • ${opt.dutyEstimate}`}
                                                    </span>
                                                </div>
                                            </Radio>
                                        ))}
                                    </Space>
                                </Radio.Group>
                            </div>
                        ))}

                        <div className="flex gap-2 pt-2">
                            <Button 
                                type="primary"
                                onClick={handleSubmitAnswers}
                                disabled={result.questions.some(q => !answers[q.id])}
                                icon={<ArrowRight size={16} />}
                                className="bg-amber-500 hover:bg-amber-600 border-amber-500"
                            >
                                Continue Classification
                            </Button>
                            <Button onClick={handleReset}>Start Over</Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Classification Result */}
            {result && !result.needsInput && result.htsCode && (
                <div className="space-y-6">
                    {/* Main Result Card */}
                    <Card className="border-green-200 bg-green-50">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="text-green-600" size={24} />
                                    <Title level={3} className="!mb-0 font-mono">
                                        {result.htsCodeFormatted}
                                    </Title>
                                    {result.confidence && result.confidenceLabel && 
                                        getConfidenceBadge(result.confidence, result.confidenceLabel)
                                    }
                                </div>
                                
                                {/* Full Concatenated Description */}
                                {result.hierarchy && (
                                    <div className="mt-3 p-3 bg-white rounded-lg border border-green-100">
                                        <Text className="text-slate-800 leading-relaxed">
                                            {result.hierarchy.fullDescription}
                                        </Text>
                                    </div>
                                )}
                                
                                {!result.hierarchy && (
                                    <Text className="block text-slate-700">{result.description}</Text>
                                )}
                                
                                {result.generalRate && (
                                    <Tag color="blue" className="mt-3">
                                        General Rate: {result.generalRate}
                                    </Tag>
                                )}
                            </div>
                            <Button onClick={handleReset} size="large">
                                New Classification
                            </Button>
                        </div>
                    </Card>
                    
                    {/* HTS Hierarchy - Clean Tree View */}
                    {result.hierarchy && (
                        <Card className="shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <TreeDeciduous className="text-teal-600" size={18} />
                                <Text strong>HTS Classification Path</Text>
                            </div>
                            <div className="space-y-0">
                                {result.hierarchy.levels.map((level, idx) => {
                                    const isLast = idx === result.hierarchy!.levels.length - 1;
                                    const indent = idx * 20;
                                    
                                    return (
                                        <div 
                                            key={idx}
                                            className={`flex items-start gap-2 py-2 ${
                                                isLast ? 'bg-teal-50 -mx-4 px-4 rounded' : ''
                                            }`}
                                            style={{ paddingLeft: `${indent}px` }}
                                        >
                                            {/* Tree connector */}
                                            <span className="text-slate-300 w-4 flex-shrink-0 text-sm">
                                                {idx === 0 ? '📁' : isLast ? '📄' : '└'}
                                            </span>
                                            
                                            {/* Code badge */}
                                            <code className={`px-2 py-0.5 rounded text-xs font-mono flex-shrink-0 ${
                                                isLast 
                                                    ? 'bg-teal-600 text-white font-bold' 
                                                    : 'bg-slate-200 text-slate-700'
                                            }`}>
                                                {level.codeFormatted}
                                            </code>
                                            
                                            {/* Description */}
                                            <span className={`text-sm flex-1 ${
                                                isLast ? 'text-teal-800 font-medium' : 'text-slate-600'
                                            }`}>
                                                {level.description}
                                            </span>
                                            
                                            {/* Duty rate on last level */}
                                            {isLast && level.dutyRate && (
                                                <Tag color="green" className="text-xs flex-shrink-0">
                                                    {level.dutyRate}
                                                </Tag>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* Route Applied */}
                    {result.routeApplied && (
                        <Alert
                            type="info"
                            icon={<Brain size={16} />}
                            message="Classification Logic"
                            description={result.routeApplied}
                        />
                    )}

                    {/* Transparency */}
                    {result.transparency && (
                        <Collapse defaultActiveKey={['transparency']}>
                            <Panel 
                                header={
                                    <span className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-amber-500" />
                                        What I Used to Classify
                                    </span>
                                }
                                key="transparency"
                            >
                                <div className="grid md:grid-cols-3 gap-4">
                                    {result.transparency.stated.length > 0 && (
                                        <div>
                                            <Text strong className="text-green-600 block mb-2">✓ You Stated</Text>
                                            <ul className="text-sm space-y-1">
                                                {result.transparency.stated.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {result.transparency.inferred.length > 0 && (
                                        <div>
                                            <Text strong className="text-blue-600 block mb-2">→ I Inferred</Text>
                                            <ul className="text-sm space-y-1">
                                                {result.transparency.inferred.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {result.transparency.assumed.length > 0 && (
                                        <div>
                                            <Text strong className="text-orange-600 block mb-2">? I Assumed</Text>
                                            <ul className="text-sm space-y-1">
                                                {result.transparency.assumed.map((item, i) => (
                                                    <li key={i}>{item}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </Panel>
                        </Collapse>
                    )}


                    {/* Processing Time */}
                    <Text type="secondary" className="text-xs block text-right">
                        Classified in {result.processingTimeMs}ms
                    </Text>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-8">
                    <Spin size="large" />
                </div>
            )}
        </div>
    );
}

