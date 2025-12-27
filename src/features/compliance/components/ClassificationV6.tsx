'use client';

import React, { useState } from 'react';
import { 
    Card, Typography, Input, Button, Tag, Alert, 
    Space, Collapse, Spin, message, Dropdown, Steps
} from 'antd';
import type { MenuProps } from 'antd';
import { 
    Loader2, CheckCircle, AlertTriangle,
    Sparkles, Eye, Brain, GitBranch,
    Lightbulb, Bell, Bookmark, TreeDeciduous,
    MoreVertical, ExternalLink, ArrowRight, ChevronDown
} from 'lucide-react';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES (matching V6 API response)
// ═══════════════════════════════════════════════════════════════════════════

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
    essentialCharacter: string;
    productType: string;
    material: {
        primary: string;
        source: string;
        confidence: number;
    };
    useContext: string;
    keywords: string[];
}

interface Transparency {
    stated: string[];
    inferred: string[];
    assumed: string[];
}

interface V6APIResponse {
    success: boolean;
    htsCode: string;
    htsCodeFormatted: string;
    description: string;
    generalRate: string | null;
    confidence: number;
    confidenceLabel: 'high' | 'medium' | 'low';
    treePath: TreePath;
    productUnderstanding: ProductUnderstanding;
    transparency: Transparency;
    processingTimeMs: number;
    debug?: {
        chapterSelection: string;
        headingSelection: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ClassificationV6Props {
    onSaveSuccess?: () => void;
}

export default function ClassificationV6({ onSaveSuccess }: ClassificationV6Props = {}) {
    const [description, setDescription] = useState('');
    const [material, setMaterial] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<V6APIResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showTreePath, setShowTreePath] = useState(true);

    const handleClassify = async () => {
        if (!description.trim()) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/classify-v6', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    description,
                    material: material.trim() || undefined,
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

    const getConfidenceColor = (label: string) => {
        switch (label) {
            case 'high': return 'green';
            case 'medium': return 'orange';
            case 'low': return 'red';
            default: return 'default';
        }
    };

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'heading': return 'blue';
            case 'subheading': return 'cyan';
            case 'tariff_line': return 'purple';
            case 'statistical': return 'green';
            default: return 'default';
        }
    };

    // Save product to library
    const handleSaveToLibrary = async (withMonitoring: boolean = false) => {
        if (!result) return;
        
        setSaving(true);
        try {
            const productName = result.productUnderstanding.productType || 'Product';
            
            const response = await fetch('/api/saved-products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: productName.charAt(0).toUpperCase() + productName.slice(1),
                    description: description,
                    htsCode: result.htsCode,
                    htsDescription: result.description,
                    countryOfOrigin: 'CN',
                    materialComposition: result.productUnderstanding.material.primary,
                    baseDutyRate: result.generalRate,
                    latestClassification: {
                        htsCode: result.htsCodeFormatted,
                        description: result.description,
                        confidence: result.confidence,
                        treePath: result.treePath,
                        productUnderstanding: result.productUnderstanding,
                    },
                    isMonitored: withMonitoring,
                    isFavorite: false,
                }),
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save');
            }
            
            setSaved(true);
            message.success({
                content: (
                    <span>
                        <CheckCircle size={14} className="inline mr-2 text-green-500" />
                        {withMonitoring ? 'Product saved & monitoring enabled!' : 'Product saved to library!'}
                    </span>
                ),
                duration: 3,
            });
            
            onSaveSuccess?.();
        } catch (err) {
            message.error(err instanceof Error ? err.message : 'Failed to save product');
        } finally {
            setSaving(false);
        }
    };

    const saveMenuItems: MenuProps['items'] = [
        {
            key: 'save-monitor',
            label: (
                <div className="flex items-center gap-2">
                    <Bell size={14} />
                    <span>Save & Monitor Tariffs</span>
                </div>
            ),
            onClick: () => handleSaveToLibrary(true),
        },
        {
            key: 'save-only',
            label: (
                <div className="flex items-center gap-2">
                    <Bookmark size={14} />
                    <span>Save to Library</span>
                </div>
            ),
            onClick: () => handleSaveToLibrary(false),
        },
    ];

    return (
        <div className="w-full space-y-6">
            {/* Input Card */}
            <Card className="shadow-sm w-full" styles={{ body: { padding: '24px' } }}>
                {/* Header */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <TreeDeciduous className="w-5 h-5 text-emerald-500" />
                    <Title level={4} className="!mb-0">Describe Your Product</Title>
                    <Tag color="cyan">V6 - Atlas</Tag>
                    <Tag color="green">Tree Navigation</Tag>
                </div>
                
                {/* Input */}
                <div className="mb-4">
                    <Text strong className="block mb-2">Product Description</Text>
                    <TextArea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., indoor planter, stainless steel water bottle, rubber finger ring"
                        rows={3}
                        size="large"
                        style={{ fontSize: '16px' }}
                    />
                </div>
                
                {/* Material input (optional) */}
                <div className="mb-6">
                    <Text strong className="block mb-2">
                        Material <span className="text-gray-400 font-normal">(optional - helps accuracy)</span>
                    </Text>
                    <Input
                        value={material}
                        onChange={(e) => setMaterial(e.target.value)}
                        placeholder="e.g., plastic, ceramic, stainless steel, cotton"
                        size="large"
                    />
                </div>
                
                {/* Actions */}
                <Space size="middle" wrap className="w-full">
                    {!result ? (
                        <Button 
                            type="primary" 
                            size="large"
                            loading={loading}
                            onClick={handleClassify}
                            disabled={!description.trim()}
                            icon={<Sparkles className="w-4 h-4" />}
                            className="min-w-[180px]"
                            style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                        >
                            Classify Product
                        </Button>
                    ) : (
                        <>
                            <Button 
                                type="default" 
                                size="large"
                                onClick={() => {
                                    setResult(null);
                                    setSaved(false);
                                }}
                            >
                                Clear & Start Over
                            </Button>
                            <Button 
                                type="primary" 
                                size="large"
                                loading={loading}
                                onClick={handleClassify}
                                disabled={!description.trim()}
                                icon={<Sparkles className="w-4 h-4" />}
                                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                            >
                                Re-classify
                            </Button>
                        </>
                    )}
                </Space>
                
                {/* Loading State */}
                {loading && (
                    <div className="mt-6 flex items-center gap-3 text-gray-500">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <Text type="secondary">Navigating HTS tree with AI understanding...</Text>
                    </div>
                )}
            </Card>

            {/* Error */}
            {error && (
                <Alert 
                    type="error" 
                    message="Classification Error" 
                    description={error}
                    showIcon
                />
            )}

            {/* Result */}
            {result && (
                <div className="space-y-6">
                    {/* Main Classification Card */}
                    <Card className="shadow-sm border-l-4 border-l-emerald-500 w-full">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                                    <Title level={3} className="!mb-0 break-all">
                                        {result.htsCodeFormatted}
                                    </Title>
                                    <Tag color={getConfidenceColor(result.confidenceLabel)}>
                                        {Math.round(result.confidence * 100)}% {result.confidenceLabel}
                                    </Tag>
                                </div>
                                <Text className="text-gray-600">
                                    {result.description}
                                </Text>
                            </div>
                            {result.generalRate && (
                                <div className="text-left sm:text-right flex-shrink-0">
                                    <Text type="secondary">Duty Rate</Text>
                                    <div className="text-2xl font-bold text-emerald-600">
                                        {result.generalRate}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Product Understanding */}
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Brain className="w-4 h-4 text-emerald-600" />
                                <Text strong className="text-emerald-800">AI Understanding</Text>
                            </div>
                            <Text className="text-emerald-700">{result.productUnderstanding.whatThisIs}</Text>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <Tag color="cyan">{result.productUnderstanding.essentialCharacter}</Tag>
                                <Tag color="blue">{result.productUnderstanding.productType}</Tag>
                                <Tag color="purple">{result.productUnderstanding.material.primary}</Tag>
                                <Tag>{result.productUnderstanding.useContext}</Tag>
                            </div>
                        </div>

                        {/* Debug info */}
                        {result.debug && (
                            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    <Text strong>Classification Logic</Text>
                                </div>
                                <Text type="secondary">{result.debug.chapterSelection}</Text>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
                            {saved ? (
                                <Button 
                                    type="primary" 
                                    icon={<CheckCircle className="w-4 h-4" />}
                                    disabled
                                    style={{ backgroundColor: '#16a34a' }}
                                >
                                    Saved
                                </Button>
                            ) : (
                                <Space.Compact>
                                    <Button
                                        type="primary"
                                        onClick={() => handleSaveToLibrary(true)}
                                        loading={saving}
                                        icon={<Bell className="w-4 h-4" />}
                                        style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}
                                    >
                                        Save & Monitor
                                    </Button>
                                    <Dropdown menu={{ items: saveMenuItems }} trigger={['click']}>
                                        <Button 
                                            type="primary" 
                                            icon={<MoreVertical className="w-4 h-4" />}
                                            style={{ backgroundColor: '#0f766e', borderColor: '#0f766e' }}
                                        />
                                    </Dropdown>
                                </Space.Compact>
                            )}
                            
                            <Button 
                                onClick={() => {
                                    const hts = result.htsCode;
                                    window.location.href = `/dashboard/sourcing?hts=${hts}&from=CN`;
                                }}
                                icon={<ExternalLink className="w-4 h-4" />}
                            >
                                Sourcing Analysis
                            </Button>
                        </div>
                    </Card>

                    {/* Tree Path Card - THE KEY V6 FEATURE */}
                    <Card 
                        className="shadow-sm w-full"
                        title={
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowTreePath(!showTreePath)}>
                                <GitBranch className="w-5 h-5 text-emerald-500" />
                                <span>HTS Tree Navigation Path</span>
                                <Tag color="cyan">How we got here</Tag>
                                <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showTreePath ? 'rotate-180' : ''}`} />
                            </div>
                        }
                    >
                        {showTreePath && (
                            <div className="space-y-4">
                                {result.treePath.steps.map((step, index) => (
                                    <div key={step.code} className="relative">
                                        {/* Connector line */}
                                        {index > 0 && (
                                            <div className="absolute -top-4 left-6 w-0.5 h-4 bg-emerald-200" />
                                        )}
                                        
                                        {/* Step card */}
                                        <div className={`p-4 rounded-lg border-2 transition-all ${
                                            index === result.treePath.steps.length - 1 
                                                ? 'bg-emerald-50 border-emerald-300' 
                                                : 'bg-gray-50 border-gray-200'
                                        }`}>
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                                    index === result.treePath.steps.length - 1 ? 'bg-emerald-500' : 'bg-gray-400'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                                <Tag color={getLevelColor(step.level)}>
                                                    {step.level.replace('_', ' ')}
                                                </Tag>
                                                <Text strong className="text-lg">{step.codeFormatted}</Text>
                                            </div>
                                            
                                            <Text className="block text-gray-600 mb-2">
                                                {step.description}
                                            </Text>
                                            
                                            <div className="flex items-start gap-2 text-sm">
                                                <ArrowRight className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                <Text className="text-emerald-700">{step.reasoning}</Text>
                                            </div>
                                            
                                            {/* Alternatives (rejected codes) */}
                                            {step.alternatives.length > 0 && (
                                                <Collapse ghost className="mt-2">
                                                    <Panel 
                                                        header={
                                                            <span className="text-xs text-gray-500">
                                                                {step.alternatives.length} code(s) rejected
                                                            </span>
                                                        } 
                                                        key="alt"
                                                    >
                                                        <div className="space-y-2">
                                                            {step.alternatives.map((alt, i) => (
                                                                <div key={i} className="text-sm p-2 bg-red-50 rounded border border-red-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <AlertTriangle className="w-3 h-3 text-red-400" />
                                                                        <Text className="text-red-700">{alt.code}</Text>
                                                                    </div>
                                                                    <Text type="secondary" className="text-xs block ml-5">
                                                                        {alt.description}
                                                                    </Text>
                                                                    <Text className="text-xs text-red-600 block ml-5 mt-1">
                                                                        ✗ {alt.whyNot}
                                                                    </Text>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </Panel>
                                                </Collapse>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Transparency Card */}
                    <Card className="shadow-sm w-full" title={
                        <div className="flex items-center gap-2">
                            <Eye className="w-5 h-5 text-blue-500" />
                            <span>Transparency: What We Know vs Assumed</span>
                        </div>
                    }>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Stated */}
                            <div className="bg-green-50 p-5 rounded-lg border border-green-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <Text strong className="text-green-700">You Told Us</Text>
                                </div>
                                {result.transparency.stated.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.transparency.stated.map((item, i) => (
                                            <li key={i} className="text-sm text-green-700">• {item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary" className="text-sm">No specific attributes stated</Text>
                                )}
                            </div>

                            {/* Inferred */}
                            <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <Brain className="w-4 h-4 text-blue-600" />
                                    <Text strong className="text-blue-700">We Inferred</Text>
                                </div>
                                {result.transparency.inferred.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.transparency.inferred.map((item, i) => (
                                            <li key={i} className="text-sm text-blue-700">• {item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary" className="text-sm">Nothing inferred</Text>
                                )}
                            </div>

                            {/* Assumed */}
                            <div className="bg-orange-50 p-5 rounded-lg border border-orange-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                                    <Text strong className="text-orange-700">We Assumed</Text>
                                </div>
                                {result.transparency.assumed.length > 0 ? (
                                    <ul className="space-y-2">
                                        {result.transparency.assumed.map((item, i) => (
                                            <li key={i} className="text-sm text-orange-700">• {item}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <Text type="secondary" className="text-sm">No assumptions made</Text>
                                )}
                            </div>
                        </div>
                    </Card>

                    {/* Meta */}
                    <div className="text-center text-sm text-gray-400 pt-2">
                        Classified in {result.processingTimeMs}ms using V6 Tree Navigation Engine
                    </div>
                </div>
            )}
        </div>
    );
}

