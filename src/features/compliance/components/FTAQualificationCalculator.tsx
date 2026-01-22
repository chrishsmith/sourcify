'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Card,
    Input,
    Select,
    InputNumber,
    Button,
    Table,
    Tag,
    Alert,
    Typography,
    Space,
    Tooltip,
    Modal,
    Form,
    Divider,
    Progress,
    Statistic,
    Badge,
    Popconfirm,
    message,
    Collapse,
    Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    Calculator,
    Plus,
    Trash2,
    Save,
    FileText,
    CheckCircle,
    XCircle,
    Percent,
    ArrowRightLeft,
    DollarSign,
    Package,
    Globe,
    Info,
    AlertTriangle,
    Download,
    Upload,
    BookOpen,
    TrendingDown,
    Award,
    RefreshCw,
    Bookmark,
    Edit2,
} from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/shared';
import { formatHtsCode } from '@/utils/htsFormatting';
import type { FtaRule, FtaAgreement, TariffShiftType } from '@/data/ftaRules';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface BOMComponent {
    id: string;
    name: string;
    htsCode: string;
    originCountry: string;
    value: number;
    isOriginating: boolean;
}

interface TariffShiftComponentResult {
    componentId: string;
    componentName: string;
    componentHts: string;
    productHts: string;
    shiftRequired: TariffShiftType;
    shiftAchieved: TariffShiftType | null;
    passes: boolean;
    explanation: string;
}

interface RVCResult {
    passes: boolean;
    calculatedRVC: number;
    requiredRVC: number;
    method: string;
    formula: string;
    nonOriginatingValue: number;
    originatingValue: number;
    explanation: string;
}

interface TariffShiftResult {
    passes: boolean;
    componentResults: TariffShiftComponentResult[];
    overallExplanation: string;
}

interface DutySavingsResult {
    mfnRate: number;
    ftaRate: number;
    savingsPercent: number;
    savingsAmount: number;
    transactionValue: number;
    mfnDuty: number;
    ftaDuty: number;
}

interface QualificationResult {
    qualifies: boolean;
    rule: FtaRule | null;
    fta: FtaAgreement | null;
    rvcResult: RVCResult | null;
    tariffShiftResult: TariffShiftResult | null;
    overallExplanation: string;
    requirements: string[];
    warnings: string[];
    dutySavings: DutySavingsResult | null;
}

interface SavedBOM {
    id: string;
    name: string;
    productHtsCode: string;
    ftaCode: string;
    transactionValue: number;
    components: BOMComponent[];
    savedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'sourcify_fta_saved_boms';

// FTA options
const FTA_OPTIONS = [
    { value: 'USMCA', label: 'USMCA (Mexico, Canada)', countries: ['MX', 'CA'] },
    { value: 'KORUS', label: 'Korea FTA', countries: ['KR'] },
    { value: 'AUSFTA', label: 'Australia FTA', countries: ['AU'] },
    { value: 'SFTA', label: 'Singapore FTA', countries: ['SG'] },
    { value: 'CAFTA-DR', label: 'CAFTA-DR', countries: ['CR', 'DO', 'SV', 'GT', 'HN', 'NI'] },
    { value: 'CIFTA', label: 'Chile FTA', countries: ['CL'] },
    { value: 'CTPA', label: 'Colombia TPA', countries: ['CO'] },
    { value: 'PTPA', label: 'Peru TPA', countries: ['PE'] },
    { value: 'MFTA', label: 'Morocco FTA', countries: ['MA'] },
    { value: 'JFTA', label: 'Jordan FTA', countries: ['JO'] },
    { value: 'BFTA', label: 'Bahrain FTA', countries: ['BH'] },
    { value: 'OFTA', label: 'Oman FTA', countries: ['OM'] },
    { value: 'ILFTA', label: 'Israel FTA', countries: ['IL'] },
];

// Country options with flags
const COUNTRY_OPTIONS = [
    { value: 'US', label: '🇺🇸 United States' },
    { value: 'MX', label: '🇲🇽 Mexico' },
    { value: 'CA', label: '🇨🇦 Canada' },
    { value: 'KR', label: '🇰🇷 South Korea' },
    { value: 'AU', label: '🇦🇺 Australia' },
    { value: 'SG', label: '🇸🇬 Singapore' },
    { value: 'CL', label: '🇨🇱 Chile' },
    { value: 'CO', label: '🇨🇴 Colombia' },
    { value: 'PE', label: '🇵🇪 Peru' },
    { value: 'CR', label: '🇨🇷 Costa Rica' },
    { value: 'DO', label: '🇩🇴 Dominican Rep.' },
    { value: 'SV', label: '🇸🇻 El Salvador' },
    { value: 'GT', label: '🇬🇹 Guatemala' },
    { value: 'HN', label: '🇭🇳 Honduras' },
    { value: 'NI', label: '🇳🇮 Nicaragua' },
    { value: 'MA', label: '🇲🇦 Morocco' },
    { value: 'JO', label: '🇯🇴 Jordan' },
    { value: 'BH', label: '🇧🇭 Bahrain' },
    { value: 'OM', label: '🇴🇲 Oman' },
    { value: 'IL', label: '🇮🇱 Israel' },
    { value: 'CN', label: '🇨🇳 China' },
    { value: 'VN', label: '🇻🇳 Vietnam' },
    { value: 'IN', label: '🇮🇳 India' },
    { value: 'TH', label: '🇹🇭 Thailand' },
    { value: 'ID', label: '🇮🇩 Indonesia' },
    { value: 'DE', label: '🇩🇪 Germany' },
    { value: 'JP', label: '🇯🇵 Japan' },
    { value: 'TW', label: '🇹🇼 Taiwan' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════════

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    
    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
        }
    }, [key]);
    
    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);
    
    return [storedValue, setValue];
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const FTAQualificationCalculator: React.FC = () => {
    // Form state
    const [productHtsCode, setProductHtsCode] = useState('');
    const [ftaCode, setFtaCode] = useState<string | undefined>();
    const [transactionValue, setTransactionValue] = useState<number | null>(null);
    
    // BOM state
    const [bomComponents, setBomComponents] = useState<BOMComponent[]>([]);
    const [componentModalOpen, setComponentModalOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState<BOMComponent | null>(null);
    
    // Result state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<QualificationResult | null>(null);
    
    // Saved BOMs
    const [savedBOMs, setSavedBOMs] = useLocalStorage<SavedBOM[]>(STORAGE_KEY, []);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [bomName, setBomName] = useState('');
    
    const [messageApi, contextHolder] = message.useMessage();
    const [componentForm] = Form.useForm();
    
    // Get FTA countries for determining originating status
    const selectedFta = FTA_OPTIONS.find(f => f.value === ftaCode);
    const ftaCountries = selectedFta ? ['US', ...selectedFta.countries] : ['US'];
    
    // Auto-determine if component is originating based on country
    const determineOriginating = (countryCode: string): boolean => {
        return ftaCountries.includes(countryCode);
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BOM MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleAddComponent = () => {
        setEditingComponent(null);
        componentForm.resetFields();
        setComponentModalOpen(true);
    };
    
    const handleEditComponent = (component: BOMComponent) => {
        setEditingComponent(component);
        componentForm.setFieldsValue({
            name: component.name,
            htsCode: component.htsCode,
            originCountry: component.originCountry,
            value: component.value,
        });
        setComponentModalOpen(true);
    };
    
    const handleSaveComponent = async () => {
        try {
            const values = await componentForm.validateFields();
            const isOriginating = determineOriginating(values.originCountry);
            
            if (editingComponent) {
                // Update existing
                setBomComponents(prev => prev.map(c => 
                    c.id === editingComponent.id 
                        ? { ...c, ...values, isOriginating }
                        : c
                ));
                messageApi.success('Component updated');
            } else {
                // Add new
                const newComponent: BOMComponent = {
                    id: `comp-${Date.now()}`,
                    ...values,
                    isOriginating,
                };
                setBomComponents(prev => [...prev, newComponent]);
                messageApi.success('Component added');
            }
            
            setComponentModalOpen(false);
            componentForm.resetFields();
        } catch (err) {
            // Form validation failed
        }
    };
    
    const handleDeleteComponent = (id: string) => {
        setBomComponents(prev => prev.filter(c => c.id !== id));
        messageApi.success('Component removed');
    };
    
    // Recalculate originating status when FTA changes
    useEffect(() => {
        if (ftaCode && bomComponents.length > 0) {
            setBomComponents(prev => prev.map(c => ({
                ...c,
                isOriginating: determineOriginating(c.originCountry),
            })));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ftaCode]);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleCalculate = async () => {
        if (!productHtsCode || !ftaCode || !transactionValue) {
            messageApi.warning('Please fill in all required fields');
            return;
        }
        
        setLoading(true);
        setError(null);
        setResult(null);
        
        try {
            const response = await fetch('/api/fta-calculator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productHtsCode: productHtsCode.replace(/\./g, ''),
                    ftaCode,
                    transactionValue,
                    bomComponents,
                }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                setResult(data.data);
            } else {
                setError(data.error || 'Failed to calculate');
            }
        } catch (err) {
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SAVE/LOAD BOM
    // ═══════════════════════════════════════════════════════════════════════════
    
    const handleSaveBOM = () => {
        if (!productHtsCode || !ftaCode || !transactionValue) {
            messageApi.warning('Please fill in product details first');
            return;
        }
        setBomName(`BOM for ${formatHtsCode(productHtsCode)} - ${ftaCode}`);
        setSaveModalOpen(true);
    };
    
    const handleConfirmSave = () => {
        const newBOM: SavedBOM = {
            id: `bom-${Date.now()}`,
            name: bomName,
            productHtsCode,
            ftaCode: ftaCode!,
            transactionValue: transactionValue!,
            components: bomComponents,
            savedAt: new Date().toISOString(),
        };
        
        setSavedBOMs(prev => [...prev, newBOM]);
        setSaveModalOpen(false);
        messageApi.success('BOM saved successfully');
    };
    
    const handleLoadBOM = (bom: SavedBOM) => {
        setProductHtsCode(bom.productHtsCode);
        setFtaCode(bom.ftaCode);
        setTransactionValue(bom.transactionValue);
        setBomComponents(bom.components);
        setResult(null);
        messageApi.success('BOM loaded');
    };
    
    const handleDeleteBOM = (id: string) => {
        setSavedBOMs(prev => prev.filter(b => b.id !== id));
        messageApi.success('BOM deleted');
    };
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BOM TABLE COLUMNS
    // ═══════════════════════════════════════════════════════════════════════════
    
    const bomColumns: ColumnsType<BOMComponent> = [
        {
            title: 'Component',
            dataIndex: 'name',
            key: 'name',
            render: (name: string) => <Text strong>{name}</Text>,
        },
        {
            title: 'HTS Code',
            dataIndex: 'htsCode',
            key: 'htsCode',
            render: (code: string) => (
                <code className="text-sm bg-slate-100 px-2 py-0.5 rounded">
                    {formatHtsCode(code)}
                </code>
            ),
        },
        {
            title: 'Origin',
            dataIndex: 'originCountry',
            key: 'origin',
            render: (country: string) => {
                const option = COUNTRY_OPTIONS.find(c => c.value === country);
                return option?.label || country;
            },
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            render: (value: number) => `$${value.toLocaleString()}`,
            align: 'right',
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: unknown, record: BOMComponent) => (
                record.isOriginating ? (
                    <Tag color="green" icon={<CheckCircle className="w-3 h-3" />}>
                        Originating
                    </Tag>
                ) : (
                    <Tag color="red" icon={<XCircle className="w-3 h-3" />}>
                        Non-Originating
                    </Tag>
                )
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 100,
            render: (_: unknown, record: BOMComponent) => (
                <Space size="small">
                    <Tooltip title="Edit">
                        <Button
                            type="text"
                            size="small"
                            icon={<Edit2 className="w-4 h-4" />}
                            onClick={() => handleEditComponent(record)}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Remove this component?"
                        onConfirm={() => handleDeleteComponent(record.id)}
                        okText="Yes"
                        cancelText="No"
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<Trash2 className="w-4 h-4" />}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULATIONS FOR UI
    // ═══════════════════════════════════════════════════════════════════════════
    
    const totalBOMValue = bomComponents.reduce((sum, c) => sum + c.value, 0);
    const originatingValue = bomComponents.filter(c => c.isOriginating).reduce((sum, c) => sum + c.value, 0);
    const nonOriginatingValue = totalBOMValue - originatingValue;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════════════════════
    
    return (
        <div className="space-y-4">
            {contextHolder}
            
            {/* Header */}
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Calculator className="w-6 h-6 text-teal-600" />
                        <Title level={4} className="m-0">FTA Qualification Calculator</Title>
                    </div>
                    <Text className="text-slate-500">
                        Determine if your product qualifies for FTA preferential rates
                    </Text>
                </div>
            </Card>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Main Calculator */}
                <div className="xl:col-span-2 space-y-4">
                    {/* Product Information */}
                    <Card 
                        title={
                            <span className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-teal-600" />
                                Product Information
                            </span>
                        }
                    >
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Product HTS Code *
                                    </label>
                                    <Input
                                        placeholder="e.g., 8471.30.0100"
                                        value={productHtsCode}
                                        onChange={e => setProductHtsCode(e.target.value)}
                                        allowClear
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Free Trade Agreement *
                                    </label>
                                    <Select
                                        placeholder="Select FTA"
                                        value={ftaCode}
                                        onChange={setFtaCode}
                                        options={FTA_OPTIONS}
                                        className="w-full"
                                        allowClear
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Transaction Value (USD) *
                                    </label>
                                    <InputNumber
                                        placeholder="e.g., 10000"
                                        value={transactionValue}
                                        onChange={setTransactionValue}
                                        addonBefore="$"
                                        className="w-full"
                                        min={0}
                                    />
                                </div>
                            </div>
                            
                            {ftaCode && (
                                <Alert
                                    type="info"
                                    showIcon
                                    icon={<Info className="w-4 h-4" />}
                                    message={
                                        <span>
                                            Originating countries for {ftaCode}:{' '}
                                            <strong>United States</strong>
                                            {selectedFta?.countries.map(c => {
                                                const country = COUNTRY_OPTIONS.find(co => co.value === c);
                                                return country ? `, ${country.label}` : `, ${c}`;
                                            })}
                                        </span>
                                    }
                                />
                            )}
                        </div>
                    </Card>
                    
                    {/* Bill of Materials */}
                    <Card 
                        title={
                            <span className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-teal-600" />
                                Bill of Materials (BOM)
                            </span>
                        }
                        extra={
                            <Space>
                                <Button
                                    icon={<Plus className="w-4 h-4" />}
                                    onClick={handleAddComponent}
                                >
                                    Add Component
                                </Button>
                            </Space>
                        }
                    >
                        {bomComponents.length > 0 ? (
                            <>
                                <Table
                                    dataSource={bomComponents}
                                    columns={bomColumns}
                                    rowKey="id"
                                    pagination={false}
                                    size="middle"
                                    scroll={{ x: 700 }}
                                />
                                
                                {/* BOM Summary */}
                                <Divider className="my-3" />
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <Text className="text-slate-500 text-sm">Total BOM Value</Text>
                                        <div className="text-lg font-semibold">${totalBOMValue.toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <Text className="text-slate-500 text-sm">Originating</Text>
                                        <div className="text-lg font-semibold text-green-600">
                                            ${originatingValue.toLocaleString()}
                                        </div>
                                    </div>
                                    <div>
                                        <Text className="text-slate-500 text-sm">Non-Originating</Text>
                                        <div className="text-lg font-semibold text-red-600">
                                            ${nonOriginatingValue.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <span className="text-slate-500">
                                        No components added yet. Click &quot;Add Component&quot; to build your BOM.
                                    </span>
                                }
                            />
                        )}
                    </Card>
                    
                    {/* Action Buttons */}
                    <Card>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                type="primary"
                                size="large"
                                icon={<Calculator className="w-5 h-5" />}
                                onClick={handleCalculate}
                                loading={loading}
                                disabled={!productHtsCode || !ftaCode || !transactionValue}
                                className="bg-teal-600 hover:bg-teal-700"
                            >
                                Calculate Qualification
                            </Button>
                            <Button
                                size="large"
                                icon={<Save className="w-5 h-5" />}
                                onClick={handleSaveBOM}
                                disabled={!productHtsCode || !ftaCode}
                            >
                                Save BOM
                            </Button>
                            <Button
                                size="large"
                                icon={<RefreshCw className="w-5 h-5" />}
                                onClick={() => {
                                    setProductHtsCode('');
                                    setFtaCode(undefined);
                                    setTransactionValue(null);
                                    setBomComponents([]);
                                    setResult(null);
                                }}
                            >
                                Clear All
                            </Button>
                        </div>
                    </Card>
                    
                    {/* Error State */}
                    {error && (
                        <Alert
                            type="error"
                            message="Calculation Error"
                            description={error}
                            showIcon
                            closable
                            onClose={() => setError(null)}
                        />
                    )}
                    
                    {/* Loading State */}
                    {loading && <LoadingState message="Analyzing FTA qualification..." />}
                    
                    {/* Results */}
                    {result && !loading && (
                        <div className="space-y-4">
                            {/* Qualification Result Header */}
                            <Card className={result.qualifies ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
                                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                                    <div className={`p-3 rounded-full ${result.qualifies ? 'bg-green-100' : 'bg-red-100'}`}>
                                        {result.qualifies ? (
                                            <Award className="w-8 h-8 text-green-600" />
                                        ) : (
                                            <XCircle className="w-8 h-8 text-red-600" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Title level={4} className={`m-0 ${result.qualifies ? 'text-green-700' : 'text-red-700'}`}>
                                            {result.qualifies 
                                                ? '✓ Product QUALIFIES for FTA Preferential Treatment'
                                                : '✗ Product Does NOT Qualify for FTA Preferential Treatment'
                                            }
                                        </Title>
                                        <Paragraph className="text-slate-600 mt-2 mb-0">
                                            {result.overallExplanation}
                                        </Paragraph>
                                    </div>
                                </div>
                            </Card>
                            
                            {/* Rule Details */}
                            {result.rule && (
                                <Card 
                                    title={
                                        <span className="flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-teal-600" />
                                            Applicable Rule of Origin
                                        </span>
                                    }
                                >
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap gap-2">
                                            <Tag color="blue">{result.fta?.name || result.rule.ftaCode}</Tag>
                                            <Tag>HTS {result.rule.htsPrefix}</Tag>
                                            <Tag color="purple">
                                                {result.rule.ruleType.replace(/_/g, ' ').toUpperCase()}
                                            </Tag>
                                        </div>
                                        
                                        <div className="bg-slate-100 p-3 rounded text-sm font-mono">
                                            {result.rule.ruleText}
                                        </div>
                                        
                                        {result.requirements.length > 0 && (
                                            <div>
                                                <Text strong>Requirements:</Text>
                                                <ul className="list-disc list-inside text-slate-600 mt-1">
                                                    {result.requirements.map((req, idx) => (
                                                        <li key={idx}>{req}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            )}
                            
                            {/* RVC Analysis */}
                            {result.rvcResult && result.rvcResult.requiredRVC > 0 && (
                                <Card 
                                    title={
                                        <span className="flex items-center gap-2">
                                            <Percent className="w-5 h-5 text-teal-600" />
                                            Regional Value Content (RVC) Analysis
                                        </span>
                                    }
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Progress
                                                type="circle"
                                                percent={Math.min(100, Math.round((result.rvcResult.calculatedRVC / result.rvcResult.requiredRVC) * 100))}
                                                status={result.rvcResult.passes ? 'success' : 'exception'}
                                                format={() => `${result.rvcResult?.calculatedRVC.toFixed(1)}%`}
                                                size={100}
                                            />
                                            <div>
                                                <div className="text-lg font-semibold">
                                                    Calculated RVC: {result.rvcResult.calculatedRVC.toFixed(1)}%
                                                </div>
                                                <div className="text-slate-500">
                                                    Required: {result.rvcResult.requiredRVC}% ({result.rvcResult.method.replace('_', ' ')} method)
                                                </div>
                                                <Tag color={result.rvcResult.passes ? 'green' : 'red'} className="mt-2">
                                                    {result.rvcResult.passes ? 'PASSES' : 'FAILS'}
                                                </Tag>
                                            </div>
                                        </div>
                                        
                                        <Divider className="my-3" />
                                        
                                        <div className="bg-slate-50 p-3 rounded">
                                            <Text strong>Formula:</Text>
                                            <div className="font-mono text-sm mt-1">{result.rvcResult.formula}</div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <Statistic
                                                title="Originating Value"
                                                value={result.rvcResult.originatingValue}
                                                prefix="$"
                                                valueStyle={{ color: '#16a34a' }}
                                            />
                                            <Statistic
                                                title="Non-Originating Value"
                                                value={result.rvcResult.nonOriginatingValue}
                                                prefix="$"
                                                valueStyle={{ color: '#dc2626' }}
                                            />
                                        </div>
                                    </div>
                                </Card>
                            )}
                            
                            {/* Tariff Shift Analysis */}
                            {result.tariffShiftResult && result.tariffShiftResult.componentResults.length > 0 && (
                                <Card 
                                    title={
                                        <span className="flex items-center gap-2">
                                            <ArrowRightLeft className="w-5 h-5 text-teal-600" />
                                            Tariff Shift Analysis
                                        </span>
                                    }
                                >
                                    <div className="space-y-3">
                                        <Alert
                                            type={result.tariffShiftResult.passes ? 'success' : 'warning'}
                                            message={result.tariffShiftResult.overallExplanation}
                                            showIcon
                                        />
                                        
                                        <Table
                                            dataSource={result.tariffShiftResult.componentResults}
                                            rowKey="componentId"
                                            pagination={false}
                                            size="small"
                                            columns={[
                                                {
                                                    title: 'Component',
                                                    dataIndex: 'componentName',
                                                    key: 'name',
                                                },
                                                {
                                                    title: 'Component HTS',
                                                    dataIndex: 'componentHts',
                                                    key: 'componentHts',
                                                    render: (hts: string) => (
                                                        <code className="text-xs">{formatHtsCode(hts)}</code>
                                                    ),
                                                },
                                                {
                                                    title: 'Shift Required',
                                                    dataIndex: 'shiftRequired',
                                                    key: 'required',
                                                    render: (shift: string) => <Tag color="blue">{shift}</Tag>,
                                                },
                                                {
                                                    title: 'Shift Achieved',
                                                    dataIndex: 'shiftAchieved',
                                                    key: 'achieved',
                                                    render: (shift: string | null) => 
                                                        shift ? <Tag>{shift}</Tag> : <Tag color="red">None</Tag>,
                                                },
                                                {
                                                    title: 'Status',
                                                    dataIndex: 'passes',
                                                    key: 'status',
                                                    render: (passes: boolean) => (
                                                        passes ? (
                                                            <Tag color="green" icon={<CheckCircle className="w-3 h-3" />}>Pass</Tag>
                                                        ) : (
                                                            <Tag color="red" icon={<XCircle className="w-3 h-3" />}>Fail</Tag>
                                                        )
                                                    ),
                                                },
                                            ]}
                                        />
                                    </div>
                                </Card>
                            )}
                            
                            {/* Duty Savings */}
                            {result.dutySavings && result.qualifies && (
                                <Card 
                                    title={
                                        <span className="flex items-center gap-2">
                                            <TrendingDown className="w-5 h-5 text-green-600" />
                                            Estimated Duty Savings
                                        </span>
                                    }
                                    className="border-green-200"
                                >
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <Statistic
                                            title="MFN Rate"
                                            value={result.dutySavings.mfnRate}
                                            suffix="%"
                                        />
                                        <Statistic
                                            title="FTA Rate"
                                            value={result.dutySavings.ftaRate}
                                            suffix="%"
                                            valueStyle={{ color: '#16a34a' }}
                                        />
                                        <Statistic
                                            title="MFN Duty"
                                            value={result.dutySavings.mfnDuty}
                                            prefix="$"
                                            precision={2}
                                        />
                                        <Statistic
                                            title="Savings"
                                            value={result.dutySavings.savingsAmount}
                                            prefix="$"
                                            precision={2}
                                            valueStyle={{ color: '#16a34a' }}
                                        />
                                    </div>
                                    
                                    {result.dutySavings.savingsAmount > 0 && (
                                        <Alert
                                            type="success"
                                            className="mt-4"
                                            message={
                                                <span>
                                                    <strong>Potential savings:</strong> ${result.dutySavings.savingsAmount.toFixed(2)} 
                                                    {' '}({result.dutySavings.savingsPercent.toFixed(1)}% reduction) on this shipment
                                                </span>
                                            }
                                        />
                                    )}
                                </Card>
                            )}
                            
                            {/* Warnings */}
                            {result.warnings.length > 0 && (
                                <Alert
                                    type="warning"
                                    message="Important Notes"
                                    description={
                                        <ul className="list-disc list-inside mb-0">
                                            {result.warnings.map((warning, idx) => (
                                                <li key={idx}>{warning}</li>
                                            ))}
                                        </ul>
                                    }
                                    showIcon
                                    icon={<AlertTriangle className="w-5 h-5" />}
                                />
                            )}
                        </div>
                    )}
                </div>
                
                {/* Saved BOMs Sidebar */}
                <div className="space-y-4">
                    <Card 
                        title={
                            <span className="flex items-center gap-2">
                                <Bookmark className="w-5 h-5 text-teal-600" />
                                Saved BOMs
                            </span>
                        }
                        size="small"
                    >
                        {savedBOMs.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {savedBOMs.map(bom => (
                                    <div
                                        key={bom.id}
                                        className="p-3 border rounded-lg hover:border-teal-300 transition-colors"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <Text strong className="block truncate">{bom.name}</Text>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    <Tag>{bom.ftaCode}</Tag>
                                                    <code className="ml-1">{formatHtsCode(bom.productHtsCode)}</code>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    {bom.components.length} components · ${bom.transactionValue.toLocaleString()}
                                                </div>
                                            </div>
                                            <Space size="small">
                                                <Button
                                                    type="text"
                                                    size="small"
                                                    icon={<Upload className="w-3 h-3" />}
                                                    onClick={() => handleLoadBOM(bom)}
                                                >
                                                    Load
                                                </Button>
                                                <Popconfirm
                                                    title="Delete this BOM?"
                                                    onConfirm={() => handleDeleteBOM(bom.id)}
                                                    okText="Yes"
                                                    cancelText="No"
                                                >
                                                    <Button
                                                        type="text"
                                                        size="small"
                                                        danger
                                                        icon={<Trash2 className="w-3 h-3" />}
                                                    />
                                                </Popconfirm>
                                            </Space>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <span className="text-slate-400 text-sm">
                                        No saved BOMs yet
                                    </span>
                                }
                            />
                        )}
                    </Card>
                    
                    {/* Quick Reference */}
                    <Card title="Quick Reference" size="small">
                        <Collapse ghost size="small">
                            <Panel header="Tariff Shift Types" key="shift">
                                <div className="space-y-2 text-sm">
                                    <p><Tag color="red">CC</Tag> Change of Chapter (2-digit)</p>
                                    <p><Tag color="orange">CTH</Tag> Change of Heading (4-digit)</p>
                                    <p><Tag color="gold">CTSH</Tag> Change of Subheading (6-digit)</p>
                                    <p><Tag color="lime">CTI</Tag> Change of Item (8-digit)</p>
                                </div>
                            </Panel>
                            <Panel header="RVC Methods" key="rvc">
                                <div className="space-y-2 text-sm text-slate-600">
                                    <p><strong>Transaction:</strong> (TV - VNM) / TV × 100</p>
                                    <p><strong>Net Cost:</strong> (NC - VNM) / NC × 100</p>
                                    <p><strong>Build-Down:</strong> (AV - VNM) / AV × 100</p>
                                    <p><strong>Build-Up:</strong> VOM / AV × 100</p>
                                </div>
                            </Panel>
                            <Panel header="Originating Materials" key="originating">
                                <p className="text-sm text-slate-600">
                                    Materials are &quot;originating&quot; if they are produced in a FTA party country 
                                    (including the US) or satisfy the relevant rule of origin.
                                </p>
                            </Panel>
                        </Collapse>
                    </Card>
                </div>
            </div>
            
            {/* Add/Edit Component Modal */}
            <Modal
                title={editingComponent ? 'Edit Component' : 'Add BOM Component'}
                open={componentModalOpen}
                onOk={handleSaveComponent}
                onCancel={() => {
                    setComponentModalOpen(false);
                    componentForm.resetFields();
                }}
                okText={editingComponent ? 'Update' : 'Add'}
            >
                <Form form={componentForm} layout="vertical" className="mt-4">
                    <Form.Item
                        name="name"
                        label="Component Name"
                        rules={[{ required: true, message: 'Please enter component name' }]}
                    >
                        <Input placeholder="e.g., LCD Panel, Battery Cell" />
                    </Form.Item>
                    
                    <Form.Item
                        name="htsCode"
                        label="Component HTS Code"
                        rules={[{ required: true, message: 'Please enter HTS code' }]}
                    >
                        <Input placeholder="e.g., 8517.12.0050" />
                    </Form.Item>
                    
                    <Form.Item
                        name="originCountry"
                        label="Country of Origin"
                        rules={[{ required: true, message: 'Please select country' }]}
                    >
                        <Select
                            placeholder="Select country"
                            options={COUNTRY_OPTIONS}
                            showSearch
                            optionFilterProp="label"
                        />
                    </Form.Item>
                    
                    <Form.Item
                        name="value"
                        label="Component Value (USD)"
                        rules={[{ required: true, message: 'Please enter value' }]}
                    >
                        <InputNumber
                            placeholder="e.g., 500"
                            className="w-full"
                            min={0}
                            addonBefore="$"
                        />
                    </Form.Item>
                </Form>
            </Modal>
            
            {/* Save BOM Modal */}
            <Modal
                title="Save Bill of Materials"
                open={saveModalOpen}
                onOk={handleConfirmSave}
                onCancel={() => setSaveModalOpen(false)}
                okText="Save"
            >
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            BOM Name
                        </label>
                        <Input
                            value={bomName}
                            onChange={e => setBomName(e.target.value)}
                            placeholder="Enter a name for this BOM"
                        />
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded">
                        <Text className="text-slate-600">
                            This will save:
                        </Text>
                        <ul className="list-disc list-inside text-sm text-slate-500 mt-2">
                            <li>Product HTS: {formatHtsCode(productHtsCode)}</li>
                            <li>FTA: {ftaCode}</li>
                            <li>Transaction Value: ${transactionValue?.toLocaleString()}</li>
                            <li>Components: {bomComponents.length}</li>
                        </ul>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
