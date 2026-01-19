'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Card, 
  Input, 
  Select, 
  Button, 
  Typography, 
  Tag, 
  Tooltip, 
  Collapse,
  Alert,
  Radio,
  Spin,
  Progress,
  Badge,
  Space,
  Divider,
  Empty,
} from 'antd';
import {
  Search,
  Zap,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  DollarSign,
  FileText,
  Scale,
  ArrowRight,
  Sparkles,
  Info,
  Crown,
  Target,
  Layers,
  Lock,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';

// Number of codes to show for free
const FREE_CODE_LIMIT = 3;
import { COUNTRIES } from '@/components/shared';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Types
interface CodeCondition {
  condition: string;
  met: boolean | 'unknown';
  explanation: string;
  documentationNeeded?: string;
}

interface ApplicableCode {
  htsCode: string;
  formattedCode: string;
  rawDescription: string;
  plainEnglishDescription: string;
  fullHierarchyDescription: string;
  applicabilityScore: number;
  applicabilityReason: string;
  conditions: CodeCondition[];
  chapter: string;
  chapterDescription: string;
  heading: string;
  headingDescription: string;
  dutyBreakdown: {
    baseMfnRate: number;
    baseMfnDisplay: string;
    section301Rate: number;
    ieepaRate: number;
    fentanylRate: number;
    totalRate: number;
  };
  savingsVsBest?: number;
  savingsVsWorst?: number;
}

interface SmartQuestion {
  id: string;
  question: string;
  reason: string;
  options: {
    value: string;
    label: string;
    hint?: string;
    affectsCodeIds?: string[];
  }[];
}

interface ProductInterpretation {
  summary: string;
  material: string;
  use: string;
  valueCategory: string;
  keyFeatures: string[];
  potentialChapters: { chapter: string; reason: string }[];
}

interface OptimizerResult {
  success: boolean;
  analysisId: string;
  processingTimeMs: number;
  productInterpretation: ProductInterpretation;
  questions: SmartQuestion[];
  applicableCodes: ApplicableCode[];
  summary: {
    totalCodesFound: number;
    bestRateCode: string;
    bestRate: number;
    worstRateCode: string;
    worstRate: number;
    potentialSavings: number;
    dollarSavingsAt10k: number;
  };
  error?: string;
}

// Code Card Component
const CodeCard = ({ 
  code, 
  isBest, 
  isSelected,
  onSelect,
}: { 
  code: ApplicableCode; 
  isBest: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <Card
      size="small"
      className={`
        cursor-pointer transition-all
        ${isSelected ? 'border-teal-500 bg-teal-50/30 shadow-md' : 'hover:border-slate-300'}
        ${isBest ? 'ring-2 ring-emerald-200' : ''}
      `}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Code info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-base font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {code.formattedCode}
            </code>
            {isBest && (
              <Tag color="green" className="flex items-center gap-1">
                <TrendingDown size={12} />
                Lowest Rate
              </Tag>
            )}
            <Tag color="blue" className="text-xs">
              {code.applicabilityScore}% match
            </Tag>
          </div>
          
          <Paragraph 
            className="text-slate-600 mt-2 mb-0"
            ellipsis={!expanded ? { rows: 2, expandable: 'collapsible', onExpand: (_, info) => setExpanded(info.expanded) } : false}
          >
            {code.plainEnglishDescription}
          </Paragraph>
          
          {/* Conditions */}
          {code.conditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {code.conditions.slice(0, 2).map((cond, i) => (
                <Tag 
                  key={i} 
                  color={cond.met === true ? 'success' : cond.met === false ? 'error' : 'warning'}
                  className="text-xs flex items-center gap-1"
                >
                  {cond.met === 'unknown' ? <HelpCircle size={10} /> : cond.met ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                  {cond.condition.length > 30 ? cond.condition.substring(0, 30) + '...' : cond.condition}
                </Tag>
              ))}
              {code.conditions.length > 2 && (
                <Tag className="text-xs text-slate-500">+{code.conditions.length - 2} more</Tag>
              )}
            </div>
          )}
        </div>
        
        {/* Right: Duty info */}
        <div className="text-right flex-shrink-0 w-32">
          <div className="text-2xl font-bold text-slate-900">
            {code.dutyBreakdown.totalRate.toFixed(1)}%
          </div>
          <Text className="text-xs text-slate-500">total duty</Text>
          
          {code.savingsVsWorst !== undefined && code.savingsVsWorst > 0 && (
            <div className="mt-2">
              <Tag color="green" className="text-xs">
                Save {code.savingsVsWorst.toFixed(1)}%
              </Tag>
            </div>
          )}
        </div>
      </div>
      
      {/* Expanded details */}
      {isSelected && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {/* Duty breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 rounded-lg p-2">
              <Text className="text-xs text-slate-500">Base MFN</Text>
              <div className="text-sm font-medium">{code.dutyBreakdown.baseMfnDisplay}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <Text className="text-xs text-slate-500">Section 301</Text>
              <div className="text-sm font-medium">{code.dutyBreakdown.section301Rate}%</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <Text className="text-xs text-slate-500">IEEPA</Text>
              <div className="text-sm font-medium">{code.dutyBreakdown.ieepaRate}%</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-2">
              <Text className="text-xs text-slate-500">Fentanyl</Text>
              <div className="text-sm font-medium">{code.dutyBreakdown.fentanylRate}%</div>
            </div>
          </div>
          
          {/* Full hierarchy */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm">
            <Text className="text-slate-500 block mb-2">Full Classification Path:</Text>
            <Text className="text-slate-700">{code.fullHierarchyDescription}</Text>
          </div>
          
          {/* Conditions detail */}
          {code.conditions.length > 0 && (
            <div className="mt-3">
              <Text className="text-slate-500 block mb-2 text-sm">Classification Conditions:</Text>
              <div className="space-y-2">
                {code.conditions.map((cond, i) => (
                  <Alert
                    key={i}
                    type={cond.met === true ? 'success' : cond.met === false ? 'error' : 'warning'}
                    showIcon
                    message={cond.condition}
                    description={
                      <div className="text-xs mt-1">
                        <div>{cond.explanation}</div>
                        {cond.documentationNeeded && (
                          <div className="mt-1 text-slate-500 flex items-center gap-1">
                            <FileText size={12} />
                            Required: {cond.documentationNeeded}
                          </div>
                        )}
                      </div>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// Smart Question Component
const SmartQuestionPanel = ({
  questions,
  answers,
  onAnswer,
}: {
  questions: SmartQuestion[];
  answers: Record<string, string>;
  onAnswer: (questionId: string, value: string) => void;
}) => {
  if (questions.length === 0) return null;
  
  return (
    <Card className="mb-6 border-amber-200 bg-amber-50/50">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 rounded-full p-2">
          <HelpCircle className="text-amber-600" size={20} />
        </div>
        <div className="flex-1">
          <Title level={5} className="m-0 mb-3">Help Us Narrow Down Your Options</Title>
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id}>
                <Text className="font-medium block mb-2">{q.question}</Text>
                <Text className="text-xs text-slate-500 block mb-2">{q.reason}</Text>
                <Radio.Group
                  value={answers[q.id]}
                  onChange={(e) => onAnswer(q.id, e.target.value)}
                  className="flex flex-wrap gap-2"
                >
                  {q.options.map((opt) => (
                    <Radio.Button
                      key={opt.value}
                      value={opt.value}
                      className="flex items-center gap-1"
                    >
                      {opt.label}
                      {opt.hint && (
                        <span className="text-xs text-slate-400 ml-1">({opt.hint})</span>
                      )}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

// Results Summary Component - Show rates without revealing which codes
const ResultsSummary = ({ summary, isProUser }: { summary: OptimizerResult['summary']; isProUser: boolean }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <Card size="small" className="bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200">
      <div className="flex items-center gap-2 text-teal-600 mb-1">
        <Target size={16} />
        <Text className="text-xs uppercase tracking-wide">Options Found</Text>
      </div>
      <div className="text-2xl font-bold text-teal-900">{summary.totalCodesFound}</div>
      <Text className="text-xs text-teal-600">applicable codes</Text>
    </Card>
    
    <Card size="small" className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
      <div className="flex items-center gap-2 text-emerald-600 mb-1">
        <TrendingDown size={16} />
        <Text className="text-xs uppercase tracking-wide">Lowest Rate</Text>
      </div>
      <div className="text-2xl font-bold text-emerald-900">{summary.bestRate.toFixed(1)}%</div>
      <Text className="text-xs text-emerald-600">
        {isProUser ? summary.bestRateCode : 'if you qualify'}
      </Text>
    </Card>
    
    <Card size="small" className="bg-gradient-to-br from-rose-50 to-rose-100/50 border-rose-200">
      <div className="flex items-center gap-2 text-rose-600 mb-1">
        <AlertTriangle size={16} />
        <Text className="text-xs uppercase tracking-wide">Highest Rate</Text>
      </div>
      <div className="text-2xl font-bold text-rose-900">{summary.worstRate.toFixed(1)}%</div>
      <Text className="text-xs text-rose-600">without optimization</Text>
    </Card>
    
    <Card size="small" className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200">
      <div className="flex items-center gap-2 text-violet-600 mb-1">
        <DollarSign size={16} />
        <Text className="text-xs uppercase tracking-wide">Potential Savings</Text>
      </div>
      <div className="text-2xl font-bold text-violet-900">{summary.potentialSavings.toFixed(1)}%</div>
      <Text className="text-xs text-violet-600">${summary.dollarSavingsAt10k.toLocaleString()} per $10k</Text>
    </Card>
  </div>
);

// Paywall Card Component - Focus on strategic value
const PaywallCard = ({ 
  lockedCount, 
  potentialSavings,
  bestLockedRate,
}: { 
  lockedCount: number; 
  potentialSavings: number;
  bestLockedRate?: number;
}) => (
  <Card className="border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
    <div className="flex flex-col items-center text-center py-6">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full p-4 mb-4 relative">
        <DollarSign className="text-white" size={32} />
        <div className="absolute -top-1 -right-1 bg-violet-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
          PRO
        </div>
      </div>
      
      <Title level={4} className="m-0 mb-2 text-emerald-900">
        Could Save Up to {potentialSavings.toFixed(0)}% with Strategic Classification
      </Title>
      
      <Paragraph className="text-slate-600 mb-4 max-w-md">
        {lockedCount} additional codes may apply to your product — some with rates 
        {bestLockedRate !== undefined && (
          <> as low as <strong className="text-emerald-600">{bestLockedRate.toFixed(1)}%</strong></>
        )}. 
        See if you qualify and learn exactly what's required.
      </Paragraph>
      
      <div className="bg-white/80 rounded-xl p-4 mb-6 w-full max-w-sm border border-emerald-200">
        <Text className="text-emerald-800 font-medium block mb-3">
          PRO unlocks:
        </Text>
        <div className="space-y-2 text-left">
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Which codes have lower rates</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>How to qualify for each rate</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Required documentation & conditions</span>
          </div>
          <div className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <span>Product modifications that lower duty</span>
          </div>
        </div>
      </div>
      
      <Link href="/pricing">
        <Button 
          type="primary" 
          size="large"
          icon={<Crown size={18} />}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 border-0 h-12 px-8 text-base font-medium"
        >
          See How to Qualify - $99/mo
        </Button>
      </Link>
      
      <Text className="text-xs text-slate-400 mt-3">
        14-day money-back guarantee • Cancel anytime
      </Text>
    </div>
  </Card>
);

// Locked Code Card - Shows rate potential without revealing the actual code
const LockedCodeCard = ({ code, index, bestFreeRate }: { code: ApplicableCode; index: number; bestFreeRate: number }) => {
  const savingsVsFree = bestFreeRate - code.dutyBreakdown.totalRate;
  const hasSavings = savingsVsFree > 0;
  
  return (
    <Card
      size="small"
      className={`border-slate-200 relative overflow-hidden ${hasSavings ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50/50'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-200/70 px-2.5 py-1 rounded">
              <Lock size={12} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-600">Option #{FREE_CODE_LIMIT + index + 1}</span>
            </div>
            {hasSavings && (
              <Tag color="success" className="text-xs flex items-center gap-1">
                <TrendingDown size={10} />
                Could save {savingsVsFree.toFixed(1)}%
              </Tag>
            )}
          </div>
          <div className="text-slate-500 mt-2 text-sm italic">
            {hasSavings 
              ? 'This code may have a lower rate — upgrade to see if your product qualifies.'
              : 'Alternative classification option available.'
            }
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className={`text-xl font-bold ${hasSavings ? 'text-emerald-600' : 'text-slate-500'}`}>
            {code.dutyBreakdown.totalRate.toFixed(1)}%
          </div>
          <Text className="text-xs text-slate-400">total rate</Text>
        </div>
      </div>
    </Card>
  );
};

// Product Interpretation Component
const ProductInterpretationCard = ({ interpretation }: { interpretation: ProductInterpretation }) => (
  <Card size="small" className="mb-6 border-blue-200 bg-blue-50/30">
    <div className="flex items-start gap-3">
      <div className="bg-blue-100 rounded-full p-2">
        <Sparkles className="text-blue-600" size={20} />
      </div>
      <div className="flex-1">
        <Title level={5} className="m-0 mb-2">AI Analysis of Your Product</Title>
        <Paragraph className="text-slate-600 mb-3">{interpretation.summary}</Paragraph>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <Tag color="blue">Material: {interpretation.material}</Tag>
          <Tag color="purple">Use: {interpretation.use}</Tag>
          <Tag color="orange">Value: {interpretation.valueCategory}</Tag>
        </div>
        
        {interpretation.keyFeatures.length > 0 && (
          <div className="mb-3">
            <Text className="text-xs text-slate-500 block mb-1">Key Features:</Text>
            <div className="flex flex-wrap gap-1">
              {interpretation.keyFeatures.map((f, i) => (
                <Tag key={i} className="text-xs">{f}</Tag>
              ))}
            </div>
          </div>
        )}
        
        {interpretation.potentialChapters.length > 0 && (
          <div>
            <Text className="text-xs text-slate-500 block mb-1">Possible Chapters:</Text>
            <div className="flex flex-wrap gap-2">
              {interpretation.potentialChapters.map((c, i) => (
                <Tag key={i} color="cyan">Ch. {c.chapter}: {c.reason}</Tag>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </Card>
);

// Main Component
export const DutyOptimizerContent = () => {
  const searchParams = useSearchParams();
  const [productDescription, setProductDescription] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('CN');
  const [unitValue, setUnitValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCodeIndex, setSelectedCodeIndex] = useState<number>(0);
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [autoTriggered, setAutoTriggered] = useState(false);
  
  // Check for URL params and pre-fill/auto-trigger
  useEffect(() => {
    const product = searchParams.get('product');
    const origin = searchParams.get('origin');
    
    if (product) {
      setProductDescription(product);
    }
    if (origin) {
      setCountryOfOrigin(origin);
    }
    
    // Auto-trigger search if coming from Classify with a product
    if (product && !autoTriggered) {
      setAutoTriggered(true);
      // Small delay to let state update
      setTimeout(() => {
        handleOptimizeWithParams(product, origin || 'CN');
      }, 100);
    }
  }, [searchParams, autoTriggered]);
  
  const handleOptimizeWithParams = async (product: string, origin: string) => {
    if (!product.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedCodeIndex(0);
    setQuestionAnswers({});
    
    try {
      const response = await fetch('/api/duty-optimizer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription: product.trim(),
          countryOfOrigin: origin,
          unitValue: unitValue ? parseFloat(unitValue) : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  const handleOptimize = async () => {
    if (!productDescription.trim()) {
      setError('Please enter a product description');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedCodeIndex(0);
    setQuestionAnswers({});
    
    try {
      const response = await fetch('/api/duty-optimizer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productDescription: productDescription.trim(),
          countryOfOrigin,
          unitValue: unitValue ? parseFloat(unitValue) : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }
      
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3">
            <Scale className="text-white" size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Title level={2} className="m-0">Strategic Classification</Title>
              <Badge count="PRO" style={{ backgroundColor: '#10B981' }} />
            </div>
            <Text className="text-slate-500">
              Find the lowest legal duty rate for your product — and learn how to qualify for it
            </Text>
          </div>
        </div>
      </div>
      
      {/* Input Form */}
      <Card className="mb-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Product Description
            </label>
            <TextArea
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe your product in detail... e.g., 'Ceramic indoor planter pot, glazed finish, 6 inch diameter, for household use'"
              rows={3}
              className="text-base"
            />
            <Text className="text-xs text-slate-500 mt-1 block">
              The more detail you provide, the more accurate the analysis will be.
            </Text>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Country of Origin
              </label>
              <Select
                value={countryOfOrigin}
                onChange={setCountryOfOrigin}
                options={COUNTRIES.map(c => ({ value: c.value, label: c.label }))}
                className="w-full"
                showSearch
                optionFilterProp="label"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Unit Value (Optional)
              </label>
              <Input
                prefix={<DollarSign size={16} className="text-slate-400" />}
                value={unitValue}
                onChange={(e) => setUnitValue(e.target.value)}
                placeholder="e.g., 15.00"
                type="number"
                step="0.01"
              />
              <Text className="text-xs text-slate-500 mt-1 block">
                Some codes have value thresholds affecting the duty rate.
              </Text>
            </div>
          </div>
          
          <Button
            type="primary"
            size="large"
            icon={<Zap size={18} />}
            onClick={handleOptimize}
            loading={loading}
            className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 border-0 h-12 px-8 text-base font-medium"
          >
            {loading ? 'Analyzing...' : 'Find Lower Rate Options'}
          </Button>
        </div>
      </Card>
      
      {/* Error */}
      {error && (
        <Alert
          type="error"
          message="Analysis Failed"
          description={error}
          showIcon
          closable
          onClose={() => setError(null)}
          className="mb-6"
        />
      )}
      
      {/* Loading State */}
      {loading && (
        <Card className="mb-6">
          <div className="flex flex-col items-center justify-center py-12">
            <Spin size="large" />
            <Text className="mt-4 text-slate-500">Analyzing product and searching for applicable codes...</Text>
            <div className="w-64 mt-4">
              <Progress percent={0} status="active" showInfo={false} />
            </div>
            <Text className="text-xs text-slate-400 mt-2">This may take 10-15 seconds for comprehensive analysis</Text>
          </div>
        </Card>
      )}
      
      {/* Results */}
      {result && result.success && (
        <div>
          {/* Product Interpretation */}
          <ProductInterpretationCard interpretation={result.productInterpretation} />
          
          {/* Summary */}
          <ResultsSummary summary={result.summary} isProUser={false} />
          
          {/* Smart Questions */}
          <SmartQuestionPanel
            questions={result.questions}
            answers={questionAnswers}
            onAnswer={(id, value) => setQuestionAnswers(prev => ({ ...prev, [id]: value }))}
          />
          
          {/* Codes List */}
          <Card className="shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Title level={4} className="m-0">Applicable HTS Codes</Title>
              <Text className="text-slate-500 text-sm">
                {result.applicableCodes.length > FREE_CODE_LIMIT 
                  ? `Showing ${FREE_CODE_LIMIT} of ${result.applicableCodes.length} codes`
                  : 'Sorted by duty rate (lowest first)'
                }
              </Text>
            </div>
            
            <div className="space-y-3">
              {/* Free codes (first 3) */}
              {result.applicableCodes.slice(0, FREE_CODE_LIMIT).map((code, index) => (
                <CodeCard
                  key={code.htsCode}
                  code={code}
                  isBest={index === 0}
                  isSelected={selectedCodeIndex === index}
                  onSelect={() => setSelectedCodeIndex(index)}
                />
              ))}
              
              {/* Paywall if there are more codes */}
              {result.applicableCodes.length > FREE_CODE_LIMIT && (
                <>
                  {/* Show locked code previews FIRST - rate only, no code numbers */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Text className="text-sm font-medium text-slate-700">
                        {result.applicableCodes.length - FREE_CODE_LIMIT} more classification options found
                      </Text>
                      <Tag color="purple" className="flex items-center gap-1">
                        <Lock size={10} />
                        PRO
                      </Tag>
                    </div>
                    {result.applicableCodes.slice(FREE_CODE_LIMIT, FREE_CODE_LIMIT + 4).map((code, idx) => (
                      <LockedCodeCard 
                        key={code.htsCode} 
                        code={code} 
                        index={idx}
                        bestFreeRate={result.applicableCodes[0]?.dutyBreakdown.totalRate || 0}
                      />
                    ))}
                    {result.applicableCodes.length > FREE_CODE_LIMIT + 4 && (
                      <div className="text-center py-2">
                        <Text className="text-xs text-slate-400">
                          + {result.applicableCodes.length - FREE_CODE_LIMIT - 4} more options...
                        </Text>
                      </div>
                    )}
                  </div>
                  
                  {/* Paywall CTA */}
                  <div className="mt-6">
                    <PaywallCard 
                      lockedCount={result.applicableCodes.length - FREE_CODE_LIMIT}
                      potentialSavings={result.summary.potentialSavings}
                      bestLockedRate={result.applicableCodes
                        .slice(FREE_CODE_LIMIT)
                        .reduce((min, c) => Math.min(min, c.dutyBreakdown.totalRate), 100)}
                    />
                  </div>
                </>
              )}
            </div>
            
            {result.applicableCodes.length === 0 && (
              <Empty description="No applicable codes found" />
            )}
          </Card>
          
          {/* Legal Disclaimer */}
          <Alert
            type="info"
            showIcon
            icon={<Info size={16} />}
            className="mt-6"
            message="Classification Advisory"
            description={
              <Text className="text-sm">
                This analysis is for informational purposes only. HTS classification is the sole responsibility
                of the importer. Consult a licensed customs broker or trade attorney for binding rulings.
                Save your selected code to your product library for documentation.
              </Text>
            }
          />
          
          {/* Analysis Metadata */}
          <div className="mt-4 text-xs text-slate-400 text-right">
            Analysis ID: {result.analysisId} | Completed in {(result.processingTimeMs / 1000).toFixed(1)}s
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && !result && !error && (
        <Card className="border-dashed border-2 border-emerald-200 bg-emerald-50/30">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl p-6 mb-4">
              <Scale className="text-emerald-600" size={48} />
            </div>
            <Title level={4} className="text-slate-700 mb-2">Find Your Lowest Legal Duty Rate</Title>
            <Paragraph className="text-slate-500 max-w-md">
              Enter your product description above. We'll show you all classification options 
              and help you understand how to qualify for lower rates.
            </Paragraph>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Tag icon={<Target size={12} />} color="success">All Options</Tag>
              <Tag icon={<CheckCircle2 size={12} />} color="cyan">Qualification Criteria</Tag>
              <Tag icon={<FileText size={12} />} color="blue">Required Documentation</Tag>
              <Tag icon={<DollarSign size={12} />} color="green">Savings Calculator</Tag>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

