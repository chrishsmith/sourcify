'use client';

import React, { useState, useCallback } from 'react';
import { 
    Card, Typography, message, Input, Select, Button, 
    Space, Tooltip, Tag, Alert, Divider, InputNumber,
    Radio, Spin, Table, Badge, Collapse
} from 'antd';
import { 
    Loader2, HelpCircle, Target, DollarSign, FileQuestion, 
    Lightbulb, ChevronRight, RefreshCw, Save, Download, Sparkles,
    TrendingUp, Layers, List, ArrowRight, Star, Info, ChevronDown,
    ChevronUp, Package, Check, Folder, FolderOpen
} from 'lucide-react';
import type {
    UnderstandResponse,
    AllCodesResponse,
    AllCodesTreeResponse,
    AnswerResponse,
    ClassificationVariable,
    CodeGroup,
    CountryTariffSummary,
    HtsTreeNode,
    HtsMaterialGroup,
    HtsHeadingGroup,
    HtsSubheading,
    HtsSelectableCode,
    CleanMaterialGroup,
    ProductCategory,
    CleanCode,
} from '@/services/classificationFlowV2';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface FormValues {
    productDescription: string;
    materialComposition?: string;
    countryOfOrigin: string;
    intendedUse?: string;
    unitValue?: number;
}

type ViewState = 'input' | 'understand' | 'questions' | 'allCodes' | 'result';

const PLACEHOLDER_DESCRIPTION = `Describe your product in detail. Include:
• What it IS (essential character)
• Material composition
• Size/dimensions if relevant
• Intended use

Example: "stainless steel kitchen knife, 8 inch blade, wooden handle"`;

const COUNTRY_OPTIONS = [
    { value: 'CN', label: '🇨🇳 China' },
    { value: 'VN', label: '🇻🇳 Vietnam' },
    { value: 'IN', label: '🇮🇳 India' },
    { value: 'MX', label: '🇲🇽 Mexico' },
    { value: 'CA', label: '🇨🇦 Canada' },
    { value: 'TW', label: '🇹🇼 Taiwan' },
    { value: 'KR', label: '🇰🇷 South Korea' },
    { value: 'JP', label: '🇯🇵 Japan' },
    { value: 'DE', label: '🇩🇪 Germany' },
    { value: 'IT', label: '🇮🇹 Italy' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const ClassificationFlowV2: React.FC = () => {
    const [messageApi, contextHolder] = message.useMessage();
    
    // Form state
    const [formValues, setFormValues] = useState<FormValues>({
        productDescription: '',
        materialComposition: '',
        countryOfOrigin: 'CN',
        intendedUse: '',
        unitValue: undefined,
    });
    
    // View state
    const [viewState, setViewState] = useState<ViewState>('input');
    const [loading, setLoading] = useState(false);
    
    // Response data
    const [understandData, setUnderstandData] = useState<UnderstandResponse | null>(null);
    const [allCodesData, setAllCodesData] = useState<AllCodesResponse | null>(null);
    const [allCodesTreeData, setAllCodesTreeData] = useState<AllCodesTreeResponse | null>(null);
    const [resultData, setResultData] = useState<AnswerResponse | null>(null);
    
    // Tree view state
    const [useTreeView] = useState(true); // Always use tree view now
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    
    // Question answers
    const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, string>>({});
    
    // ═══════════════════════════════════════════════════════════════════════════
    // API CALLS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const callApi = useCallback(async (phase: 'understand' | 'all' | 'all-tree' | 'answer') => {
        setLoading(true);
        
        try {
            const response = await fetch('/api/classify-v2', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formValues,
                    phase,
                    answeredQuestions: phase === 'answer' ? answeredQuestions : undefined,
                }),
            });
            
            if (!response.ok) {
                throw new Error('Classification failed');
            }
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Unknown error');
            }
            
            return data.data;
        } catch (error) {
            console.error('API call failed:', error);
            messageApi.error(error instanceof Error ? error.message : 'Classification failed');
            throw error;
        } finally {
            setLoading(false);
        }
    }, [formValues, answeredQuestions, messageApi]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        
        if (!formValues.productDescription.trim() || formValues.productDescription.trim().length < 2) {
            messageApi.warning('Please enter a product description');
            return;
        }
        
        try {
            const data = await callApi('understand');
            setUnderstandData(data);
            setViewState('understand');
        } catch {
            // Error already handled
        }
    };
    
    const handleShowAllCodes = async () => {
        try {
            // Use tree view for better hierarchy display
            const data = await callApi('all-tree');
            setAllCodesTreeData(data);
            // Initialize expanded state - expand relevant groups, collapse others
            const expandedSet = new Set<string>();
            if (data.materialGroups) {
                for (const group of data.materialGroups) {
                    if (group.isRelevant) {
                        expandedSet.add(group.baseHeading);
                    }
                }
            }
            setExpandedGroups(expandedSet);
            setViewState('allCodes');
        } catch {
            // Error already handled
        }
    };
    
    const handleAnswerQuestions = () => {
        setViewState('questions');
    };
    
    const handleQuestionAnswer = (variableId: string, value: string) => {
        setAnsweredQuestions(prev => ({ ...prev, [variableId]: value }));
    };
    
    const handleSubmitAnswers = async () => {
        try {
            const data = await callApi('answer');
            setResultData(data);
            setViewState('result');
        } catch {
            // Error already handled
        }
    };
    
    const handleSkipQuestions = async () => {
        // Submit with current answers (even if empty)
        try {
            const data = await callApi('answer');
            setResultData(data);
            setViewState('result');
        } catch {
            // Error already handled
        }
    };
    
    const handleNewClassification = () => {
        setFormValues({
            productDescription: '',
            materialComposition: '',
            countryOfOrigin: 'CN',
            intendedUse: '',
            unitValue: undefined,
        });
        setUnderstandData(null);
        setAllCodesData(null);
        setResultData(null);
        setAnsweredQuestions({});
        setViewState('input');
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER: INPUT FORM
    // ═══════════════════════════════════════════════════════════════════════════
    
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
                </div>
                
                {/* Two column layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Material */}
                    <div>
                        <label className="block mb-2 font-medium">
                            Material Composition
                        </label>
                        <Input
                            value={formValues.materialComposition}
                            onChange={(e) => setFormValues(prev => ({ 
                                ...prev, 
                                materialComposition: e.target.value 
                            }))}
                            placeholder="e.g., stainless steel, 100% cotton"
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
                            options={COUNTRY_OPTIONS}
                        />
                    </div>
                    
                    {/* Unit Value */}
                    <div>
                        <label className="block mb-2 font-medium">
                            Unit Value (USD)
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
                            placeholder="e.g., kitchen food preparation"
                        />
                    </div>
                </div>
                
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    loading={loading}
                    icon={!loading && <Target className="w-4 h-4" />}
                    className="w-full md:w-auto min-w-[200px] h-12 text-base font-medium"
                >
                    {loading ? 'Analyzing...' : 'Analyze Product'}
                </Button>
            </form>
        </Card>
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER: UNDERSTAND (Phase 1) - Now goes directly to questions
    // ═══════════════════════════════════════════════════════════════════════════
    
    const renderUnderstand = () => {
        if (!understandData) return null;
        
        const { category, rateRange, variables, possibleCodeCount } = understandData;
        
        // Sort variables by impact
        const sortedVariables = [...variables].sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.impact] - order[b.impact];
        });
        
        return (
            <div className="space-y-6">
                {/* Compact Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Text type="secondary" className="text-xs uppercase tracking-wider">
                            Product Identified
                        </Text>
                        <Title level={3} className="!mb-0 !mt-0">{category.name}</Title>
                        <Text type="secondary" className="text-sm">{category.description}</Text>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-500">Base Rate Range</div>
                        <div className="text-xl font-bold text-blue-600">
                            {rateRange.min === rateRange.max 
                                ? `${rateRange.min}%` 
                                : `${rateRange.min}% – ${rateRange.max}%`
                            }
                        </div>
                        <div className="text-xs text-gray-500">{possibleCodeCount} possible codes</div>
                    </div>
                </div>
                
                {/* Questions - Direct, No Choice */}
                {sortedVariables.length > 0 ? (
                    <Card className="border-0 shadow-md" styles={{ body: { padding: '24px' } }}>
                        <Title level={4} className="!mb-1">
                            Help us find your exact HTS code
                        </Title>
                        <Text type="secondary" className="block mb-6">
                            Answer {sortedVariables.length} question{sortedVariables.length !== 1 ? 's' : ''} to narrow down from {possibleCodeCount} codes
                        </Text>
                        
                        <div className="space-y-8">
                            {sortedVariables.map((variable, index) => {
                                const allOptions = [
                                    ...variable.options.map(opt => ({
                                        value: typeof opt === 'object' ? opt.value : opt,
                                        label: typeof opt === 'object' ? opt.label : opt,
                                    })),
                                    { value: 'unsure', label: 'Not sure' }
                                ];
                                const selectedValue = answeredQuestions[variable.id];
                                
                                return (
                                    <div key={variable.id}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                                                {index + 1}
                                            </span>
                                            <Text strong className="text-base">{variable.question}</Text>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 ml-11">
                                            {allOptions.map(opt => {
                                                const isSelected = selectedValue === opt.value;
                                                const isUnsure = opt.value === 'unsure';
                                                
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setAnsweredQuestions(prev => ({
                                                            ...prev,
                                                            [variable.id]: opt.value
                                                        }))}
                                                        className={`
                                                            relative px-4 py-3 rounded-xl text-sm font-medium
                                                            transition-all duration-150 ease-out
                                                            border-2 text-center
                                                            ${isSelected 
                                                                ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                                                                : isUnsure
                                                                    ? 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-100'
                                                                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50'
                                                            }
                                                        `}
                                                    >
                                                        {isSelected && (
                                                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                                                                <Check className="w-3 h-3 text-white" />
                                                            </span>
                                                        )}
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-8 flex items-center justify-between">
                            <Button
                                type="primary"
                                size="large"
                                icon={<Target className="w-4 h-4" />}
                                onClick={handleSubmitAnswers}
                                loading={loading}
                                disabled={Object.keys(answeredQuestions).length === 0}
                            >
                                Find My HTS Code
                            </Button>
                            
                            <Button 
                                type="link" 
                                onClick={handleShowAllCodes}
                                className="text-gray-500"
                            >
                                Skip → Show all {possibleCodeCount} codes
                            </Button>
                        </div>
                    </Card>
                ) : (
                    // No questions needed - just one match
                    <Card className="border-0 shadow-md bg-green-50" styles={{ body: { padding: '24px' } }}>
                        <div className="flex items-center gap-3">
                            <Check className="w-6 h-6 text-green-600" />
                            <div>
                                <Text strong className="block">Perfect match found!</Text>
                                <Text type="secondary">No additional questions needed.</Text>
                            </div>
                        </div>
                        <Button
                            type="primary"
                            className="mt-4"
                            onClick={handleSubmitAnswers}
                        >
                            View Result
                        </Button>
                    </Card>
                )}
                
                <Button type="text" onClick={handleNewClassification} className="text-gray-400">
                    ← Start Over
                </Button>
            </div>
        );
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER: QUESTIONS (Phase 2a)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const renderQuestions = () => {
        if (!understandData) return null;
        
        const { variables, category } = understandData;
        
        // Sort by impact (high first)
        const sortedVariables = [...variables].sort((a, b) => {
            const order = { high: 0, medium: 1, low: 2 };
            return order[a.impact] - order[b.impact];
        });
        
        const answeredCount = Object.keys(answeredQuestions).length;
        const totalCount = sortedVariables.length;
        
        return (
            <div className="space-y-6">
                {/* Header */}
                <Card className="shadow-lg border-0" styles={{ body: { padding: '20px' } }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <Text type="secondary" className="text-xs uppercase tracking-wider">
                                Classifying
                            </Text>
                            <Title level={4} className="!mb-0 !mt-1">{category.name}</Title>
                        </div>
                        <div className="text-right">
                            <Text type="secondary" className="text-xs block">Progress</Text>
                            <Text strong className="text-lg">
                                {answeredCount}/{totalCount} answered
                            </Text>
                        </div>
                    </div>
                </Card>
                
                {/* Questions */}
                <Card className="shadow-md border-0" styles={{ body: { padding: '24px' } }}>
                    <div className="space-y-8">
                        {sortedVariables.map((variable, index) => (
                            <div key={variable.id} className="relative">
                                {/* Question Number */}
                                <div className="absolute -left-3 -top-1 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                </div>
                                
                                <div className="ml-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <Text strong className="text-base block">
                                                {variable.question}
                                            </Text>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Tag color={
                                                    variable.impact === 'high' ? 'red' : 
                                                    variable.impact === 'medium' ? 'orange' : 'default'
                                                }>
                                                    {variable.impact} impact
                                                </Tag>
                                                {variable.rateSwing > 0 && (
                                                    <Text type="secondary" className="text-xs">
                                                        Up to {variable.rateSwing}% rate difference
                                                    </Text>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Options */}
                                    <Radio.Group
                                        value={answeredQuestions[variable.id]}
                                        onChange={(e) => handleQuestionAnswer(variable.id, e.target.value)}
                                        className="w-full"
                                    >
                                        <Space direction="vertical" className="w-full">
                                            {variable.options.map((opt) => (
                                                <Radio 
                                                    key={opt.value} 
                                                    value={opt.value}
                                                    className="w-full p-3 border rounded-lg hover:bg-blue-50 transition-colors"
                                                    style={{ 
                                                        borderColor: answeredQuestions[variable.id] === opt.value 
                                                            ? '#1677ff' 
                                                            : '#d9d9d9'
                                                    }}
                                                >
                                                    <div className="ml-2">
                                                        <Text strong>{opt.label}</Text>
                                                        {opt.hint && (
                                                            <Text type="secondary" className="text-xs block mt-0.5">
                                                                {opt.hint}
                                                            </Text>
                                                        )}
                                                    </div>
                                                </Radio>
                                            ))}
                                            
                                            {/* Not Sure Option */}
                                            <Radio 
                                                value="not_sure"
                                                className="w-full p-3 border border-dashed rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="ml-2">
                                                    <Text type="secondary">I&apos;m not sure</Text>
                                                </div>
                                            </Radio>
                                        </Space>
                                    </Radio.Group>
                                </div>
                                
                                {index < sortedVariables.length - 1 && (
                                    <Divider className="my-6" />
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t">
                        <Button
                            type="primary"
                            size="large"
                            icon={<ArrowRight className="w-4 h-4" />}
                            onClick={handleSubmitAnswers}
                            loading={loading}
                        >
                            Get Classification
                        </Button>
                        <Button
                            size="large"
                            onClick={handleSkipQuestions}
                            loading={loading}
                        >
                            Skip Remaining
                        </Button>
                        <Button
                            onClick={() => setViewState('understand')}
                        >
                            ← Back
                        </Button>
                    </div>
                </Card>
            </div>
        );
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER: ALL CODES TREE (Phase 2b)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Toggle material group expansion
    const toggleMaterialGroup = (heading: string) => {
        setExpandedGroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(heading)) {
                newSet.delete(heading);
            } else {
                newSet.add(heading);
            }
            return newSet;
        });
    };
    
    // Recursive tree node renderer
    const renderTreeNode = (node: HtsTreeNode, depth: number = 0): React.ReactNode => {
        const isExpanded = !node.collapsed;
        const hasChildren = node.children && node.children.length > 0;
        const paddingLeft = depth * 24;
        
        return (
            <div key={node.id} className="tree-node">
                <div 
                    className={`
                        flex items-center py-2 px-3 rounded-lg transition-colors
                        ${node.isSelectable ? 'hover:bg-blue-50 cursor-pointer' : ''}
                        ${node.isTopMatch ? 'bg-green-50 border border-green-200' : ''}
                        ${node.isOther ? 'opacity-60' : ''}
                    `}
                    style={{ marginLeft: paddingLeft }}
                >
                    {/* Expand/collapse icon for nodes with children */}
                    {hasChildren ? (
                        <button 
                            className="p-1 hover:bg-gray-200 rounded mr-2"
                            onClick={() => {
                                node.collapsed = !node.collapsed;
                                // Force re-render by updating a dummy state
                                setExpandedGroups(new Set(expandedGroups));
                            }}
                        >
                            {isExpanded ? 
                                <ChevronDown className="w-4 h-4 text-gray-500" /> : 
                                <ChevronRight className="w-4 h-4 text-gray-500" />
                            }
                        </button>
                    ) : (
                        <span className="w-7" /> // Spacer for alignment
                    )}
                    
                    {/* Icon based on node type */}
                    {node.isSelectable ? (
                        <Package className={`w-4 h-4 mr-2 ${node.isTopMatch ? 'text-green-600' : 'text-blue-500'}`} />
                    ) : hasChildren ? (
                        <Folder className="w-4 h-4 mr-2 text-amber-500" />
                    ) : null}
                    
                    {/* Label */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            {node.htsCode && (
                                <Text code className="font-mono text-xs">
                                    {node.htsCode}
                                </Text>
                            )}
                            <Text 
                                className={`text-sm ${node.isSelectable ? 'font-medium' : ''} ${node.isOther ? 'italic' : ''}`}
                            >
                                {node.label}
                            </Text>
                            {node.isTopMatch && (
                                <Star className="w-4 h-4 text-green-500" fill="currentColor" />
                            )}
                        </div>
                    </div>
                    
                    {/* Rate */}
                    {node.baseRateFormatted && (
                        <Text 
                            className={`text-sm ml-4 ${node.isTopMatch ? 'text-green-600 font-semibold' : 'text-gray-600'}`}
                        >
                            {node.baseRateFormatted}
                            {node.inheritedRate && <span className="text-gray-400 text-xs ml-1">(inherited)</span>}
                        </Text>
                    )}
                </div>
                
                {/* Children */}
                {hasChildren && isExpanded && (
                    <div className="children">
                        {node.children.map(child => renderTreeNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };
    
    const renderAllCodes = () => {
        if (!allCodesTreeData) return null;
        
        const { category, cleanTree, countryAdditions } = allCodesTreeData;
        const totalCodes = cleanTree?.reduce((sum, g) => sum + g.codeCount, 0) || 0;
        
        // Separate matching and non-matching materials
        const matchingMaterials = cleanTree?.filter(m => m.isMatch) || [];
        const otherMaterials = cleanTree?.filter(m => !m.isMatch) || [];
        
        return (
            <div className="space-y-4">
                {/* Compact Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Text type="secondary" className="text-xs uppercase tracking-wider">
                            HTS Codes for
                        </Text>
                        <Title level={4} className="!mb-0 !mt-0">{category.name}</Title>
                    </div>
                    <Text type="secondary" className="text-xs">
                        {totalCodes} selectable codes
                    </Text>
                </div>
                
                {/* Material Groups - Clean Tree View */}
                <div className="font-mono text-sm bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto">
                    {matchingMaterials.map((material, materialIdx) => {
                        const isExpanded = expandedGroups.has(`m-${material.materialCode}`);
                        const isLast = materialIdx === matchingMaterials.length - 1 && otherMaterials.length === 0;
                        
                        return (
                            <div key={material.materialCode} className="mb-1">
                                {/* Material Row */}
                                <div 
                                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 py-0.5 px-1 rounded"
                                    onClick={() => toggleMaterialGroup(`m-${material.materialCode}`)}
                                >
                                    <span className="text-slate-500 w-4">
                                        {isExpanded ? '▼' : '▶'}
                                    </span>
                                    <span className="text-blue-400">{material.material}</span>
                                    <span className="text-slate-500">({material.materialCode})</span>
                                    <span className="text-slate-400">—</span>
                                    <span className="text-green-400">{material.rate}</span>
                                    {material.isMatch && (
                                        <span className="text-yellow-500 ml-2">★</span>
                                    )}
                                </div>
                                
                                {/* Product Categories */}
                                {isExpanded && material.productCategories.map((cat, catIdx) => {
                                    const isLastCat = catIdx === material.productCategories.length - 1;
                                    
                                    return (
                                        <div key={cat.name} className="ml-4">
                                            {/* Category Row */}
                                            <div className="flex items-center gap-1 py-0.5 text-slate-300">
                                                <span className="text-slate-600 w-4">
                                                    {isLastCat ? '└─' : '├─'}
                                                </span>
                                                <span>{cat.name}</span>
                                            </div>
                                            
                                            {/* Individual Codes */}
                                            {cat.codes.map((code, codeIdx) => {
                                                const isLastCode = codeIdx === cat.codes.length - 1;
                                                
                                                return (
                                                    <div 
                                                        key={code.htsCode}
                                                        className={`
                                                            ml-4 flex items-center gap-2 py-0.5
                                                            ${code.isTopMatch ? 'bg-green-900/30 rounded' : ''}
                                                        `}
                                                    >
                                                        <span className="text-slate-600 w-4">
                                                            {isLastCat ? '   ' : '│  '}
                                                        </span>
                                                        <span className="text-slate-600 w-4">
                                                            {isLastCode ? '└─' : '├─'}
                                                        </span>
                                                        {code.isTopMatch && (
                                                            <span className="text-yellow-400">★</span>
                                                        )}
                                                        <span className="text-slate-400">{code.label}</span>
                                                        <span className="text-slate-600">({code.htsCode})</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                    
                    {/* Other Materials - Collapsed */}
                    {otherMaterials.map((material) => {
                        const isExpanded = expandedGroups.has(`m-${material.materialCode}`);
                        
                        return (
                            <div key={material.materialCode} className="mb-1 opacity-60">
                                <div 
                                    className="flex items-center gap-2 cursor-pointer hover:bg-slate-800 py-0.5 px-1 rounded"
                                    onClick={() => toggleMaterialGroup(`m-${material.materialCode}`)}
                                >
                                    <span className="text-slate-500 w-4">
                                        {isExpanded ? '▼' : '▶'}
                                    </span>
                                    <span className="text-slate-400">{material.material}</span>
                                    <span className="text-slate-600">({material.materialCode})</span>
                                    <span className="text-slate-500">—</span>
                                    <span className="text-slate-400">{material.rate}</span>
                                    <span className="text-slate-500 ml-2">[{material.codeCount} codes]</span>
                                </div>
                                
                                {/* Collapsed content - same structure */}
                                {isExpanded && material.productCategories.map((cat, catIdx) => {
                                    const isLastCat = catIdx === material.productCategories.length - 1;
                                    
                                    return (
                                        <div key={cat.name} className="ml-4">
                                            <div className="flex items-center gap-1 py-0.5 text-slate-400">
                                                <span className="text-slate-600 w-4">
                                                    {isLastCat ? '└─' : '├─'}
                                                </span>
                                                <span>{cat.name}</span>
                                            </div>
                                            
                                            {cat.codes.map((code, codeIdx) => {
                                                const isLastCode = codeIdx === cat.codes.length - 1;
                                                
                                                return (
                                                    <div key={code.htsCode} className="ml-4 flex items-center gap-2 py-0.5">
                                                        <span className="text-slate-600 w-4">
                                                            {isLastCat ? '   ' : '│  '}
                                                        </span>
                                                        <span className="text-slate-600 w-4">
                                                            {isLastCode ? '└─' : '├─'}
                                                        </span>
                                                        <span className="text-slate-500">{code.label}</span>
                                                        <span className="text-slate-600">({code.htsCode})</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
                
                {/* Country Additions Summary - Small */}
                <div className="flex items-center justify-between text-xs text-gray-500 px-2">
                    <span>
                        + {countryAdditions.total}% additional tariffs from {countryAdditions.countryName} 
                        ({countryAdditions.breakdown.map(d => d.name).join(', ')})
                    </span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                    <Button onClick={() => setViewState('understand')}>
                        ← Back to Questions
                    </Button>
                </div>
            </div>
        );
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER: RESULT (Phase 3)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const renderResult = () => {
        if (!resultData) return null;
        
        const { htsCode, confidence, matchedCriteria, dutyBreakdown, alternatives, hierarchy } = resultData;
        
        const confidenceColor = 
            confidence >= 85 ? 'text-green-600' :
            confidence >= 65 ? 'text-amber-600' : 'text-red-600';
        
        return (
            <div className="space-y-6">
                {/* Main Result Card */}
                <Card className="shadow-lg border-0" styles={{ body: { padding: '24px' } }}>
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        {/* Left: Code & Description */}
                        <div className="flex-1">
                            <Text type="secondary" className="text-xs uppercase tracking-wider">
                                HTS Classification Result
                            </Text>
                            <div className="flex items-center gap-3 mt-1">
                                <Title level={2} className="!mb-0 font-mono">
                                    {htsCode.code}
                                </Title>
                                <Button 
                                    type="text" 
                                    size="small"
                                    onClick={() => {
                                        navigator.clipboard.writeText(htsCode.code);
                                        messageApi.success('Copied!');
                                    }}
                                >
                                    📋
                                </Button>
                            </div>
                            <Text className="text-base mt-2 block">
                                {htsCode.description}
                            </Text>
                            
                            {/* Matched Criteria */}
                            {matchedCriteria.length > 0 && (
                                <div className="mt-4">
                                    <Text type="secondary" className="text-xs block mb-2">
                                        Matched on:
                                    </Text>
                                    <div className="flex flex-wrap gap-2">
                                        {matchedCriteria.map((c, i) => (
                                            <Tag 
                                                key={i}
                                                color={c.source === 'user_answer' ? 'blue' : 
                                                       c.source === 'parsed' ? 'green' : 'default'}
                                            >
                                                {c.variable}: {c.value}
                                            </Tag>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Right: Confidence */}
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
                                        className={
                                            confidence >= 85 ? 'stroke-green-500' :
                                            confidence >= 65 ? 'stroke-amber-500' : 'stroke-red-500'
                                        }
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${confidence * 2.51} 251`}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className={`text-2xl font-bold ${confidenceColor}`}>
                                        {confidence}%
                                    </span>
                                </div>
                            </div>
                            <Text type="secondary" className="text-sm">
                                Confidence
                            </Text>
                        </div>
                    </div>
                </Card>
                
                {/* Duty Breakdown */}
                <Card className="shadow-md border-0" styles={{ body: { padding: '20px' } }}>
                    <Title level={5} className="!mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        Duty Breakdown
                    </Title>
                    
                    <div className="space-y-3">
                        {/* Base Rate */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <Text>Base MFN Rate</Text>
                            <Text strong>{dutyBreakdown.baseRateFormatted}</Text>
                        </div>
                        
                        {/* Additional Duties */}
                        {dutyBreakdown.additions.map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Text>{d.name}</Text>
                                    {d.legalReference && (
                                        <Tooltip title={d.legalReference}>
                                            <Info className="w-4 h-4 text-gray-400" />
                                        </Tooltip>
                                    )}
                                </div>
                                <Text strong className="text-orange-600">+{d.rate}%</Text>
                            </div>
                        ))}
                        
                        {/* Total */}
                        <div 
                            className="flex items-center justify-between p-4 rounded-lg mt-4"
                            style={{ 
                                backgroundColor: dutyBreakdown.totalRate >= 50 ? '#FEE2E2' : 
                                                 dutyBreakdown.totalRate >= 25 ? '#FEF3C7' : '#D1FAE5'
                            }}
                        >
                            <Text strong>Total Effective Rate</Text>
                            <Text className="text-2xl font-bold" style={{ 
                                color: dutyBreakdown.totalRate >= 50 ? '#DC2626' : 
                                       dutyBreakdown.totalRate >= 25 ? '#D97706' : '#059669'
                            }}>
                                {dutyBreakdown.totalRate}%
                            </Text>
                        </div>
                        
                        {/* Per Unit Example */}
                        {dutyBreakdown.perUnitExample && (
                            <div className="text-center mt-3 p-3 bg-blue-50 rounded-lg">
                                <Text type="secondary" className="text-sm">
                                    On ${dutyBreakdown.perUnitExample.value.toFixed(2)} unit value:{' '}
                                    <Text strong className="text-blue-600">
                                        ~${dutyBreakdown.perUnitExample.duty.toFixed(2)} duty
                                    </Text>
                                </Text>
                            </div>
                        )}
                    </div>
                </Card>
                
                {/* Hierarchy */}
                {hierarchy && hierarchy.length > 0 && (
                    <Card className="shadow-md border-0" styles={{ body: { padding: '16px' } }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Layers className="w-5 h-5 text-teal-600" />
                            <Text strong className="text-sm">Classification Path</Text>
                        </div>
                        <div className="space-y-1">
                            {hierarchy.map((level, index) => (
                                <div 
                                    key={index}
                                    className="flex items-center gap-2"
                                    style={{ paddingLeft: `${index * 16}px` }}
                                >
                                    <span className="text-gray-400">
                                        {index === hierarchy.length - 1 ? '└─' : '├─'}
                                    </span>
                                    <Tag 
                                        className={`font-mono ${
                                            level.level === 'full' ? 'bg-teal-100 text-teal-700' : ''
                                        }`}
                                    >
                                        {level.code}
                                    </Tag>
                                    <Text className={level.level === 'full' ? 'font-medium' : 'text-gray-600'}>
                                        {level.description}
                                    </Text>
                                    {level.dutyRate && (
                                        <Tag color="green" className="ml-auto">{level.dutyRate}</Tag>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
                
                {/* Alternatives */}
                {alternatives && alternatives.length > 0 && (
                    <Card className="shadow-md border-0" styles={{ body: { padding: '16px' } }}>
                        <Title level={5} className="!mb-4">Other Possibilities</Title>
                        <div className="space-y-2">
                            {alternatives.map((alt, i) => (
                                <div 
                                    key={i}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div>
                                        <Text code className="font-mono">{alt.htsCode}</Text>
                                        <Text className="text-sm ml-2 text-gray-600">{alt.criteria}</Text>
                                    </div>
                                    <Text>{alt.baseRateFormatted}</Text>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
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
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    
    return (
        <div className="max-w-4xl mx-auto">
            {contextHolder}
            
            {loading && viewState !== 'input' && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <Card className="shadow-xl">
                        <div className="flex items-center gap-3 p-4">
                            <Spin size="large" />
                            <Text>Processing...</Text>
                        </div>
                    </Card>
                </div>
            )}
            
            {viewState === 'input' && renderInputForm()}
            {viewState === 'understand' && renderUnderstand()}
            {viewState === 'questions' && renderQuestions()}
            {viewState === 'allCodes' && renderAllCodes()}
            {viewState === 'result' && renderResult()}
        </div>
    );
};

export default ClassificationFlowV2;


