'use client';

import React, { useState } from 'react';
import { 
    Typography, Input, Button, Tag, Alert, 
    Space, Collapse, Spin, Card, Radio, Progress
} from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle,
    Sparkles, HelpCircle, Target, Filter,
    ChevronRight, Search, Layers
} from 'lucide-react';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (matching V9 API response)
// ═══════════════════════════════════════════════════════════════════════════

interface HtsCandidate {
    code: string;
    codeFormatted: string;
    description: string;
    fullPath: string[];
    pathDescriptions: string[];
    confidence: number;
    reasoning: string;
    requiredInfo: string[];
    eliminatingInfo: string[];
}

interface NarrowingQuestion {
    id: string;
    question: string;
    options: string[];
    impact: string;
    priority: number;
}

interface ProductUnderstanding {
    description: string;
    productType: string;
    material: string | null;
    function: string | null;
    construction: string | null;
    userType: string | null;
    stated: Record<string, string>;
    inferred: Record<string, string>;
    unknowns: string[];
}

interface V9APIResponse {
    status: 'needs_input' | 'confident' | 'ambiguous';
    finalCode?: string;
    finalDescription?: string;
    confidence?: number;
    candidates: HtsCandidate[];
    questions?: NarrowingQuestion[];
    understanding: ProductUnderstanding;
    reasoning: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ClassificationV9() {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<V9APIResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Track answers to narrowing questions
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [pendingAnswers, setPendingAnswers] = useState<Record<string, string>>({});

    const handleClassify = async (withAnswers?: Record<string, string>) => {
        if (!description.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/classify-v9', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    description,
                    answers: withAnswers || (Object.keys(answers).length > 0 ? answers : undefined),
                }),
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            setResult(data);
            // Reset pending answers for new round of questions
            setPendingAnswers({});
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Classification failed');
        } finally {
            setLoading(false);
        }
    };

    const resetClassification = () => {
        setResult(null);
        setAnswers({});
        setPendingAnswers({});
        setDescription('');
    };

    // ═══════════════════════════════════════════════════════════════════════
    // RENDER HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    const renderConfidenceBadge = (confidence: number) => {
        const percent = Math.round(confidence * 100);
        let color = 'red';
        let label = 'low';
        
        if (percent >= 80) { color = 'green'; label = 'high'; }
        else if (percent >= 50) { color = 'orange'; label = 'medium'; }
        
        return (
            <Tag color={color} className="ml-2">
                <CheckCircle className="inline w-3 h-3 mr-1" />
                {percent}% {label}
            </Tag>
        );
    };

    const handlePendingAnswer = (questionId: string, answer: string) => {
        setPendingAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    const handleSubmitAllAnswers = () => {
        // Merge pending answers with existing answers
        const allAnswers = { ...answers, ...pendingAnswers };
        setAnswers(allAnswers);
        setPendingAnswers({});
        handleClassify(allAnswers);
    };

    const renderQuestions = (questions: NarrowingQuestion[]) => {
        if (!questions || questions.length === 0) return null;

        const answeredCount = Object.keys(pendingAnswers).length;
        const allAnswered = questions.every(q => pendingAnswers[q.id]);

        return (
            <Card className="mb-6 border-2 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-2 mb-4">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <Title level={5} className="m-0">
                        Help me narrow down ({answeredCount}/{questions.length} answered)
                    </Title>
                </div>
                
                <div className="space-y-4">
                    {questions.map((question, idx) => (
                        <div key={question.id} className="p-4 bg-white rounded-lg border border-blue-100">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <Text strong className="block mb-2">
                                        {question.question}
                                    </Text>
                                    <Text className="text-xs text-gray-500 block mb-2">
                                        {question.impact}
                                    </Text>
                                    
                                    <Radio.Group 
                                        value={pendingAnswers[question.id] || ''}
                                        onChange={(e) => handlePendingAnswer(question.id, e.target.value)}
                                        className="w-full"
                                    >
                                        <Space direction="vertical" className="w-full">
                                            {question.options.map((option) => (
                                                <Radio 
                                                    key={option} 
                                                    value={option}
                                                    className="w-full p-2 rounded border border-gray-200 hover:border-blue-300"
                                                >
                                                    {option}
                                                </Radio>
                                            ))}
                                        </Space>
                                    </Radio.Group>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                <Button 
                    type="primary"
                    size="large"
                    className="mt-4 w-full"
                    disabled={answeredCount === 0}
                    onClick={handleSubmitAllAnswers}
                >
                    {allAnswered ? 'Apply All Answers & Get Result' : `Apply ${answeredCount} Answer${answeredCount !== 1 ? 's' : ''} & Narrow Down`}
                    <Filter className="w-4 h-4 ml-2" />
                </Button>
            </Card>
        );
    };

    const renderCandidates = (candidates: HtsCandidate[]) => {
        if (!candidates || candidates.length === 0) return null;

        return (
            <Card className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Layers className="w-5 h-5 text-purple-600" />
                    <Title level={5} className="m-0">
                        Candidate Codes ({candidates.length})
                    </Title>
                </div>
                
                <div className="space-y-3">
                    {candidates.slice(0, 10).map((candidate, idx) => (
                        <div 
                            key={candidate.code}
                            className={`p-3 rounded-lg border ${idx === 0 ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {idx === 0 && <Target className="w-4 h-4 text-green-600" />}
                                    <code className="font-mono text-sm font-bold">
                                        {candidate.codeFormatted}
                                    </code>
                                    {renderConfidenceBadge(candidate.confidence)}
                                </div>
                            </div>
                            <Text className="text-sm text-gray-600 block mt-1">
                                {candidate.description}
                            </Text>
                            <Text className="text-xs text-gray-400 block mt-1">
                                {candidate.reasoning}
                            </Text>
                            
                            {/* Path breadcrumb */}
                            <div className="flex items-center gap-1 mt-2 flex-wrap">
                                {candidate.fullPath.map((code, i) => (
                                    <React.Fragment key={code}>
                                        {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                                        <Tag className="text-xs">{code}</Tag>
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    };

    const renderUnderstanding = (understanding: ProductUnderstanding) => {
        return (
            <Collapse className="mb-6">
                <Panel 
                    header={
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            What I Understand About This Product
                        </span>
                    } 
                    key="understanding"
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Text strong className="text-green-700">✓ Known</Text>
                            <ul className="mt-2 space-y-1">
                                <li><Text className="text-sm">Type: {understanding.productType}</Text></li>
                                {understanding.material && (
                                    <li><Text className="text-sm">Material: {understanding.material}</Text></li>
                                )}
                                {understanding.function && (
                                    <li><Text className="text-sm">Function: {understanding.function}</Text></li>
                                )}
                                {understanding.construction && (
                                    <li><Text className="text-sm">Construction: {understanding.construction}</Text></li>
                                )}
                                {Object.entries(understanding.stated).map(([k, v]) => (
                                    <li key={k}><Text className="text-sm">{k}: {v} (stated)</Text></li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <Text strong className="text-orange-600">? Unknown</Text>
                            <ul className="mt-2 space-y-1">
                                {understanding.unknowns.map((u) => (
                                    <li key={u}><Text className="text-sm text-gray-500">{u}</Text></li>
                                ))}
                                {understanding.unknowns.length === 0 && (
                                    <li><Text className="text-sm text-gray-400">Nothing critical missing</Text></li>
                                )}
                            </ul>
                        </div>
                    </div>
                </Panel>
            </Collapse>
        );
    };

    const renderFinalResult = () => {
        if (!result || result.status === 'needs_input') return null;

        const isConfident = result.status === 'confident';

        return (
            <Card className={`mb-6 ${isConfident ? 'border-2 border-green-300' : 'border-2 border-orange-300'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${isConfident ? 'bg-green-100' : 'bg-orange-100'}`}>
                        {isConfident ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : (
                            <AlertTriangle className="w-6 h-6 text-orange-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <Title level={3} className="m-0 font-mono">
                                {result.finalCode}
                            </Title>
                            {result.confidence && renderConfidenceBadge(result.confidence)}
                        </div>
                        <Text className="text-gray-600 block mt-2">
                            {result.finalDescription}
                        </Text>
                        <Text className="text-sm text-gray-400 block mt-2">
                            {result.reasoning}
                        </Text>
                        
                        {Object.keys(answers).length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                                <Text className="text-xs text-gray-500">
                                    Narrowed by your answers: {Object.entries(answers).map(([k, v]) => `${k}=${v}`).join(', ')}
                                </Text>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        );
    };

    // ═══════════════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════════════════════

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2">
                    <Search className="w-5 h-5 text-purple-600" />
                    <Title level={4} className="m-0 text-purple-900">
                        V9 Wide Net Classification
                    </Title>
                    <Tag color="purple">NEW</Tag>
                </div>
                <Text className="text-purple-700 text-sm mt-1 block">
                    Finds ALL potential matches, then narrows down with targeted questions.
                </Text>
            </div>

            {/* Input Section */}
            <Card className="mb-6">
                <Title level={5}>
                    <Sparkles className="inline w-4 h-4 mr-2" />
                    Describe Your Product
                </Title>
                <TextArea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter product description (e.g., 'cotton tshirt', 'plastic water bottle', 'wooden dining table')"
                    rows={3}
                    className="mb-4"
                />
                <Space>
                    <Button 
                        type="primary" 
                        size="large"
                        loading={loading}
                        onClick={() => handleClassify()}
                        disabled={!description.trim()}
                        icon={<Search className="w-4 h-4 mr-1" />}
                    >
                        Find All Matches
                    </Button>
                    {result && (
                        <Button onClick={resetClassification}>
                            Start Over
                        </Button>
                    )}
                </Space>
            </Card>

            {/* Loading State */}
            {loading && (
                <Card className="mb-6 text-center py-8">
                    <Spin size="large" />
                    <div className="mt-4">
                        <Text className="text-gray-500 block">Searching all HTS codes...</Text>
                        <Text className="text-xs text-gray-400">This casts a wide net and may take 30-60 seconds</Text>
                    </div>
                </Card>
            )}

            {/* Error State */}
            {error && (
                <Alert 
                    type="error" 
                    message="Classification Error" 
                    description={error}
                    className="mb-6"
                    showIcon
                />
            )}

            {/* Results */}
            {result && !loading && (
                <>
                    {/* Final result if confident */}
                    {renderFinalResult()}
                    
                    {/* Questions if needs input */}
                    {result.status === 'needs_input' && result.questions && (
                        renderQuestions(result.questions)
                    )}
                    
                    {/* Understanding */}
                    {renderUnderstanding(result.understanding)}
                    
                    {/* All candidates */}
                    {renderCandidates(result.candidates)}
                </>
            )}
        </div>
    );
}

