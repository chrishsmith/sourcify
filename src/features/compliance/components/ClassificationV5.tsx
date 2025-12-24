'use client';

import React, { useState } from 'react';
import { 
    Card, Typography, Input, Button, Tag, Alert, Divider, 
    Space, Tooltip, Collapse, Radio, Spin, Progress
} from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle, HelpCircle, 
    Sparkles, Eye, ChevronRight, Brain,
    HelpCircleIcon, Lightbulb
} from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ClassificationResult {
    htsCode: string;
    description: string;
    generalRate: string | null;
    confidence: number;
    confidenceLabel: 'high' | 'medium' | 'low';
}

interface Transparency {
    whatYouToldUs: string[];
    whatWeInferred: string[];
    whatWeAssumed: string[];
}

interface Question {
    id: string;
    question: string;
    options: string[];
    impact: 'high' | 'medium' | 'low';
    currentAssumption?: string;
    dutyImpact?: string;
}

interface Alternative {
    htsCode: string;
    description: string;
    rate: string | null;
    matchReasons: string[];
}

interface Hierarchy {
    chapter: { code: string; description: string } | null;
    heading: { code: string; description: string } | null;
    subheading: { code: string; description: string } | null;
    tariffLine: { code: string; description: string } | null;
    statistical: { code: string; description: string } | null;
}

// Context path for intermediate HTS groupings
interface ContextPath {
    groupings: string[];  // e.g., ["Men's or boys'", "T-shirts, all white..."]
    fullPath: string;     // e.g., "Men's or boys' › T-shirts, all white..."
}

interface Justification {
    quick: string;
    summary: string;
    confidence: string;
    caveats: string[];
    refinementSuggestions: string[];
}

interface APIResponse {
    success: boolean;
    classification: ClassificationResult | null;
    hierarchy: Hierarchy;
    contextPath?: ContextPath;  // Intermediate HTS groupings
    transparency: Transparency;
    dutyRange: { formatted: string } | null;
    questions: { note: string; items: Question[] } | null;
    alternatives: Alternative[];
    justification: Justification;
    processingTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ClassificationV5() {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<APIResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showJustification, setShowJustification] = useState(false);
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});

    const handleClassify = async (answers?: Record<string, string>) => {
        if (!description.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/classify-v5', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    description,
                    userAnswers: answers || userAnswers,
                }),
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Classification failed');
            }
            
            setResult(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerQuestion = (questionId: string, answer: string) => {
        const newAnswers = { ...userAnswers, [questionId]: answer };
        setUserAnswers(newAnswers);
        // Re-classify with the new answer
        handleClassify(newAnswers);
    };

    const getConfidenceColor = (label: string) => {
        switch (label) {
            case 'high': return 'green';
            case 'medium': return 'orange';
            case 'low': return 'red';
            default: return 'default';
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Input Card */}
            <Card className="mb-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <Title level={4} className="!mb-0">Describe Your Product</Title>
                    <Tag color="purple">V5 - Infer First</Tag>
                </div>
                
                <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., white cotton t-shirt for men, short sleeve"
                    rows={3}
                    className="mb-4"
                />
                
                {!result ? (
                    <Button 
                        type="primary" 
                        size="large"
                        loading={loading}
                        onClick={() => handleClassify()}
                        disabled={!description.trim()}
                        icon={<Sparkles className="w-4 h-4" />}
                    >
                        Classify Product
                    </Button>
                ) : (
                    <div className="flex items-center gap-3">
                        <Button 
                            type="default" 
                            size="large"
                            loading={loading}
                            onClick={() => {
                                setResult(null);
                                setUserAnswers({});
                            }}
                        >
                            Clear & Start Over
                        </Button>
                        <Button 
                            type="primary" 
                            size="large"
                            loading={loading}
                            onClick={() => handleClassify()}
                            disabled={!description.trim()}
                            icon={<Sparkles className="w-4 h-4" />}
                        >
                            Re-classify
                        </Button>
                    </div>
                )}
                
                {loading && (
                    <div className="mt-4 flex items-center gap-2 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <Text type="secondary">Analyzing with AI + local HTS database...</Text>
                    </div>
                )}
            </Card>

            {/* Error */}
            {error && (
                <Alert 
                    type="error" 
                    message="Classification Error" 
                    description={error}
                    className="mb-6"
                    showIcon
                />
            )}

            {/* Result */}
            {result && result.classification && (
                <>
                    {/* Main Classification Card */}
                    <Card className="mb-6 shadow-sm border-l-4 border-l-green-500">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                    <Title level={3} className="!mb-0">
                                        {result.classification.htsCode}
                                    </Title>
                                    <Tag color={getConfidenceColor(result.classification.confidenceLabel)}>
                                        {result.classification.confidence}% {result.classification.confidenceLabel}
                                    </Tag>
                                </div>
                                <Text className="text-gray-600">
                                    {result.classification.description}
                                </Text>
                            </div>
                            {result.classification.generalRate && (
                                <div className="text-right">
                                    <Text type="secondary">Duty Rate</Text>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {result.classification.generalRate}
                                    </div>
                                </div>
                            )}
                        </div>

                        {result.dutyRange && (
                            <Alert
                                type="info"
                                message={`Duty could range from ${result.dutyRange.formatted} depending on specifics`}
                                className="mb-4"
                            />
                        )}

                        {/* Quick Justification */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-yellow-500" />
                                <Text strong>Why this code?</Text>
                            </div>
                            <Text>{result.justification.quick}</Text>
                        </div>
                    </Card>

                    {/* Transparency Card - THE KEY FEATURE */}
                    <Card className="mb-6 shadow-sm" title={
                        <div className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-blue-500" />
                            <span>Transparency: What We Know vs Assumed</span>
                        </div>
                    }>
                        <div className="grid md:grid-cols-3 gap-4">
                            {/* Stated */}
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <Text strong className="text-green-700">You Told Us</Text>
                                </div>
                                {result.transparency.whatYouToldUs.length > 0 ? (
                                    <ul className="list-disc list-inside text-sm text-green-800">
                                        {result.transparency.whatYouToldUs.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary" className="text-sm">No specific attributes stated</Text>
                                )}
                            </div>

                            {/* Inferred */}
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <Brain className="w-4 h-4 text-blue-600" />
                                    <Text strong className="text-blue-700">We Inferred</Text>
                                </div>
                                {result.transparency.whatWeInferred.length > 0 ? (
                                    <ul className="list-disc list-inside text-sm text-blue-800">
                                        {result.transparency.whatWeInferred.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary" className="text-sm">Nothing inferred</Text>
                                )}
                            </div>

                            {/* Assumed */}
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                                    <Text strong className="text-orange-700">We Assumed</Text>
                                </div>
                                {result.transparency.whatWeAssumed.length > 0 ? (
                                    <ul className="list-disc list-inside text-sm text-orange-800">
                                        {result.transparency.whatWeAssumed.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary" className="text-sm">No assumptions made</Text>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Optional Questions Card */}
                    {result.questions && result.questions.items.length > 0 && (
                        <Card className="mb-6 shadow-sm border-l-4 border-l-purple-400" title={
                            <div className="flex items-center gap-2">
                                <HelpCircleIcon className="w-5 h-5 text-purple-500" />
                                <span>Optional: Refine Your Classification</span>
                                <Tag color="purple">Not Required</Tag>
                            </div>
                        }>
                            <Text type="secondary" className="block mb-4">
                                {result.questions.note}
                            </Text>
                            
                            <div className="space-y-4">
                                {result.questions.items.map((q) => (
                                    <div key={q.id} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Tag color={q.impact === 'high' ? 'red' : q.impact === 'medium' ? 'orange' : 'blue'}>
                                                {q.impact} impact
                                            </Tag>
                                            <Text strong>{q.question}</Text>
                                        </div>
                                        
                                        {q.currentAssumption && (
                                            <Text type="secondary" className="text-sm block mb-2">
                                                Currently assuming: {q.currentAssumption}
                                            </Text>
                                        )}
                                        
                                        {q.dutyImpact && (
                                            <Text type="warning" className="text-sm block mb-2">
                                                ⚠️ {q.dutyImpact}
                                            </Text>
                                        )}
                                        
                                        <Radio.Group 
                                            onChange={(e) => handleAnswerQuestion(q.id, e.target.value)}
                                            value={userAnswers[q.id]}
                                        >
                                            <Space direction="vertical">
                                                {q.options.map((opt) => (
                                                    <Radio key={opt} value={opt}>{opt}</Radio>
                                                ))}
                                            </Space>
                                        </Radio.Group>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* HTS Hierarchy with inline grouping context */}
                    <Card className="mb-6 shadow-sm" title="HTS Hierarchy">
                        <div className="space-y-3">
                            {result.hierarchy.chapter && (
                                <div className="flex items-start gap-2 p-2 rounded hover:bg-gray-50">
                                    <Tag className="mt-1">Chapter</Tag>
                                    <div>
                                        <Text strong className="text-lg">{result.hierarchy.chapter.code}</Text>
                                        <Text type="secondary" className="block text-sm">
                                            {result.hierarchy.chapter.description}
                                        </Text>
                                    </div>
                                </div>
                            )}
                            {result.hierarchy.heading && (
                                <div className="flex items-start gap-2 ml-6 p-2 rounded hover:bg-gray-50">
                                    <span className="text-gray-300 mt-1">↳</span>
                                    <Tag className="mt-1">Heading</Tag>
                                    <div>
                                        <Text strong>{result.hierarchy.heading.code}</Text>
                                        <Text type="secondary" className="block text-sm">
                                            {result.hierarchy.heading.description}
                                        </Text>
                                    </div>
                                </div>
                            )}
                            {result.hierarchy.subheading && (
                                <div className="flex items-start gap-2 ml-12 p-2 rounded hover:bg-gray-50">
                                    <span className="text-gray-300 mt-1">↳</span>
                                    <Tag className="mt-1">Subheading</Tag>
                                    <div>
                                        <Text strong>{result.hierarchy.subheading.code}</Text>
                                        <Text type="secondary" className="block text-sm">
                                            {result.hierarchy.subheading.description}
                                        </Text>
                                    </div>
                                </div>
                            )}
                            {result.hierarchy.tariffLine && (
                                <div className="flex items-start gap-2 ml-18 p-2 rounded hover:bg-blue-50 border-l-2 border-blue-300">
                                    <span className="text-gray-300 mt-1">↳</span>
                                    <Tag color="blue" className="mt-1">Tariff Line</Tag>
                                    <div>
                                        <Text strong>{result.hierarchy.tariffLine.code}</Text>
                                        {result.hierarchy.tariffLine.description && (
                                            <Text type="secondary" className="block text-sm">
                                                {result.hierarchy.tariffLine.description}
                                            </Text>
                                        )}
                                    </div>
                                </div>
                            )}
                            {result.hierarchy.statistical && (
                                <div className="flex items-start gap-2 ml-24 p-2 rounded bg-green-50 border-l-2 border-green-400">
                                    <span className="text-gray-300 mt-1">↳</span>
                                    <Tag color="green" className="mt-1">Statistical</Tag>
                                    <div>
                                        <Text strong className="text-green-700">{result.hierarchy.statistical.code}</Text>
                                        {result.hierarchy.statistical.description && (
                                            <Text className="block text-sm text-green-600">
                                                {/* Inline grouping context prepended to description (only if available) */}
                                                {result.contextPath?.groupings?.[0] && (
                                                    <span className="text-amber-600 font-medium">
                                                        [{result.contextPath.groupings[0]}]{' '}
                                                    </span>
                                                )}
                                                {result.hierarchy.statistical.description}
                                            </Text>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Alternatives */}
                    {result.alternatives.length > 0 && (
                        <Collapse className="mb-6">
                            <Panel 
                                header={`Alternative Classifications (${result.alternatives.length})`} 
                                key="alternatives"
                            >
                                <div className="space-y-3">
                                    {result.alternatives.map((alt, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                                            <div>
                                                <Text strong>{alt.htsCode}</Text>
                                                <Text type="secondary" className="block text-sm truncate max-w-lg">
                                                    {alt.description}
                                                </Text>
                                            </div>
                                            <Text>{alt.rate || 'N/A'}</Text>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </Collapse>
                    )}

                    {/* Meta */}
                    <div className="text-center text-sm text-gray-400">
                        Classified in {result.processingTimeMs}ms using local HTS database + AI inference
                    </div>
                </>
            )}
        </div>
    );
}

