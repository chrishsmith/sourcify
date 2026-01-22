'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Card, 
    Form, 
    Input, 
    InputNumber, 
    Select, 
    Button, 
    Typography, 
    Divider, 
    Tag,
    Switch,
    Tooltip,
    Statistic,
    Alert,
    message,
    Modal,
    Popconfirm,
    Badge,
} from 'antd';
import { 
    Calculator, 
    Package,
    Ship,
    DollarSign,
    HelpCircle,
    TrendingUp,
    Anchor,
    Plane,
    Info,
    Save,
    Trash2,
    GitCompare,
    X,
    Bookmark,
    ChevronRight,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { TariffBreakdown } from './TariffBreakdown';
import { LoadingState } from '@/components/shared';
import { formatHtsCode } from '@/utils/htsFormatting';
import type { EffectiveTariffRate } from '@/types/tariffLayers.types';

const { Title, Text } = Typography;

// localStorage key for scenarios
const SCENARIOS_STORAGE_KEY = 'sourcify_landed_cost_scenarios';

// Country options
const COUNTRY_OPTIONS = [
    { value: 'CN', label: '🇨🇳 China', flag: '🇨🇳' },
    { value: 'VN', label: '🇻🇳 Vietnam', flag: '🇻🇳' },
    { value: 'IN', label: '🇮🇳 India', flag: '🇮🇳' },
    { value: 'MX', label: '🇲🇽 Mexico', flag: '🇲🇽' },
    { value: 'TH', label: '🇹🇭 Thailand', flag: '🇹🇭' },
    { value: 'ID', label: '🇮🇩 Indonesia', flag: '🇮🇩' },
    { value: 'MY', label: '🇲🇾 Malaysia', flag: '🇲🇾' },
    { value: 'BD', label: '🇧🇩 Bangladesh', flag: '🇧🇩' },
    { value: 'PH', label: '🇵🇭 Philippines', flag: '🇵🇭' },
    { value: 'TW', label: '🇹🇼 Taiwan', flag: '🇹🇼' },
    { value: 'KR', label: '🇰🇷 South Korea', flag: '🇰🇷' },
    { value: 'JP', label: '🇯🇵 Japan', flag: '🇯🇵' },
    { value: 'DE', label: '🇩🇪 Germany', flag: '🇩🇪' },
    { value: 'IT', label: '🇮🇹 Italy', flag: '🇮🇹' },
    { value: 'CA', label: '🇨🇦 Canada', flag: '🇨🇦' },
    { value: 'GB', label: '🇬🇧 United Kingdom', flag: '🇬🇧' },
    { value: 'TR', label: '🇹🇷 Turkey', flag: '🇹🇷' },
    { value: 'BR', label: '🇧🇷 Brazil', flag: '🇧🇷' },
];

interface DutyBreakdown {
    baseMfn: number;
    baseMfnRate: number;
    additionalDuties: number;
    additionalDutiesRate: number;
    totalDuty: number;
    effectiveRate: number;
}

interface FeeBreakdown {
    mpf: number;
    hmf: number;
    totalFees: number;
}

interface LandedCostResult {
    htsCode: string;
    htsDescription: string;
    countryCode: string;
    countryName: string;
    productValue: number;
    quantity: number;
    shippingCost: number;
    insuranceCost: number;
    duties: DutyBreakdown;
    fees: FeeBreakdown;
    totalDutiesAndFees: number;
    totalLandedCost: number;
    perUnitCost: number;
    tariffBreakdown: EffectiveTariffRate;
    calculatedAt: Date;
    isOceanShipment: boolean;
}

interface FormValues {
    htsCode: string;
    countryCode: string;
    productValue: number;
    quantity: number;
    shippingCost: number;
    insuranceCost: number;
    isOceanShipment: boolean;
}

interface SavedScenario {
    id: string;
    name: string;
    savedAt: string;
    result: LandedCostResult;
}

// Hook for localStorage persistence with SSR safety
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(initialValue);
    const [isLoaded, setIsLoaded] = useState(false);
    
    useEffect(() => {
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
        }
        setIsLoaded(true);
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
    
    return [isLoaded ? storedValue : initialValue, setValue];
}

export const LandedCostCalculator: React.FC = () => {
    const [form] = Form.useForm<FormValues>();
    const [messageApi, contextHolder] = message.useMessage();
    const [isCalculating, setIsCalculating] = useState(false);
    const [result, setResult] = useState<LandedCostResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Saved scenarios state
    const [savedScenarios, setSavedScenarios] = useLocalStorage<SavedScenario[]>(SCENARIOS_STORAGE_KEY, []);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [scenarioName, setScenarioName] = useState('');
    
    // Compare mode state
    const [compareMode, setCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
    
    // Generate unique ID for scenarios
    const generateId = () => `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save current result as scenario
    const handleSaveScenario = () => {
        if (!result || !scenarioName.trim()) return;
        
        const newScenario: SavedScenario = {
            id: generateId(),
            name: scenarioName.trim(),
            savedAt: new Date().toISOString(),
            result: result,
        };
        
        setSavedScenarios(prev => [newScenario, ...prev]);
        setSaveModalOpen(false);
        setScenarioName('');
        messageApi.success(`Scenario "${newScenario.name}" saved`);
    };
    
    // Delete a scenario
    const handleDeleteScenario = (id: string) => {
        setSavedScenarios(prev => prev.filter(s => s.id !== id));
        setSelectedForCompare(prev => prev.filter(sid => sid !== id));
        messageApi.success('Scenario deleted');
    };
    
    // Toggle scenario selection for compare
    const toggleCompareSelection = (id: string) => {
        setSelectedForCompare(prev => {
            if (prev.includes(id)) {
                return prev.filter(sid => sid !== id);
            }
            if (prev.length >= 3) {
                messageApi.warning('Maximum 3 scenarios can be compared');
                return prev;
            }
            return [...prev, id];
        });
    };
    
    // Get scenarios selected for comparison
    const scenariosToCompare = savedScenarios.filter(s => selectedForCompare.includes(s.id));
    
    // Open save modal with default name
    const openSaveModal = () => {
        if (!result) return;
        const country = COUNTRY_OPTIONS.find(c => c.value === result.countryCode);
        const defaultName = `${formatHtsCode(result.htsCode)} from ${country?.label.split(' ')[1] || result.countryCode}`;
        setScenarioName(defaultName);
        setSaveModalOpen(true);
    };
    
    // Load scenario into form
    const loadScenario = (scenario: SavedScenario) => {
        form.setFieldsValue({
            htsCode: scenario.result.htsCode,
            countryCode: scenario.result.countryCode,
            productValue: scenario.result.productValue,
            quantity: scenario.result.quantity,
            shippingCost: scenario.result.shippingCost,
            insuranceCost: scenario.result.insuranceCost,
            isOceanShipment: scenario.result.isOceanShipment,
        });
        setResult(scenario.result);
    };
    
    const handleCalculate = async (values: FormValues) => {
        setIsCalculating(true);
        setError(null);
        setResult(null);
        
        try {
            const response = await fetch('/api/landed-cost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    htsCode: values.htsCode,
                    countryCode: values.countryCode,
                    productValue: values.productValue,
                    quantity: values.quantity,
                    shippingCost: values.shippingCost || 0,
                    insuranceCost: values.insuranceCost || 0,
                    isOceanShipment: values.isOceanShipment ?? true,
                }),
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Calculation failed');
            }
            
            setResult(data.data);
            messageApi.success('Landed cost calculated successfully');
            
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to calculate landed cost';
            setError(errorMessage);
            messageApi.error(errorMessage);
        } finally {
            setIsCalculating(false);
        }
    };
    
    const getCountryFlag = (code: string): string => {
        const country = COUNTRY_OPTIONS.find(c => c.value === code);
        return country?.flag ?? '🌍';
    };
    
    // Helper to get difference indicator
    const getDifferenceIndicator = (value: number, baseValue: number) => {
        const diff = value - baseValue;
        const pctDiff = baseValue > 0 ? (diff / baseValue) * 100 : 0;
        
        if (Math.abs(diff) < 0.01) return null;
        
        if (diff > 0) {
            return (
                <span className="text-red-600 text-xs flex items-center gap-0.5">
                    <ArrowUp size={12} />
                    +${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pctDiff.toFixed(1)}%)
                </span>
            );
        }
        return (
            <span className="text-green-600 text-xs flex items-center gap-0.5">
                <ArrowDown size={12} />
                -${Math.abs(diff).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({Math.abs(pctDiff).toFixed(1)}%)
            </span>
        );
    };
    
    // Render scenario comparison view
    const renderComparisonView = () => {
        if (scenariosToCompare.length < 2) {
            return (
                <Card className="border border-slate-200 shadow-sm">
                    <div className="text-center py-8">
                        <GitCompare size={48} className="mx-auto text-slate-300 mb-4" />
                        <Text className="text-slate-500 block mb-2">
                            Select 2-3 scenarios to compare
                        </Text>
                        <Text className="text-slate-400 text-sm">
                            {selectedForCompare.length} of 2-3 selected
                        </Text>
                    </div>
                </Card>
            );
        }
        
        const baseScenario = scenariosToCompare[0];
        
        return (
            <div className="space-y-4">
                <Card className="border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <Text strong className="text-slate-700">Scenario Comparison</Text>
                        <Button 
                            size="small" 
                            onClick={() => {
                                setCompareMode(false);
                                setSelectedForCompare([]);
                            }}
                            icon={<X size={14} />}
                        >
                            Exit Compare
                        </Button>
                    </div>
                    
                    {/* Comparison Grid */}
                    <div className={`grid gap-4 ${scenariosToCompare.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
                        {scenariosToCompare.map((scenario, idx) => (
                            <div 
                                key={scenario.id} 
                                className={`rounded-lg p-4 border ${
                                    idx === 0 
                                        ? 'bg-teal-50 border-teal-200' 
                                        : 'bg-slate-50 border-slate-200'
                                }`}
                            >
                                {idx === 0 && (
                                    <Tag color="teal" className="mb-2">Base Scenario</Tag>
                                )}
                                <div className="font-medium text-slate-800 mb-1 truncate" title={scenario.name}>
                                    {scenario.name}
                                </div>
                                <div className="text-xs text-slate-500 mb-3">
                                    {getCountryFlag(scenario.result.countryCode)} {scenario.result.countryName}
                                </div>
                                
                                {/* Key Metrics */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <Text className="text-slate-500 text-sm">Product Value</Text>
                                        <div className="text-right">
                                            <div className="font-medium">${scenario.result.productValue.toLocaleString()}</div>
                                            {idx > 0 && getDifferenceIndicator(scenario.result.productValue, baseScenario.result.productValue)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-baseline">
                                        <Text className="text-slate-500 text-sm">Total Duties</Text>
                                        <div className="text-right">
                                            <div className="font-medium text-amber-700">${scenario.result.duties.totalDuty.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            {idx > 0 && getDifferenceIndicator(scenario.result.duties.totalDuty, baseScenario.result.duties.totalDuty)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-baseline">
                                        <Text className="text-slate-500 text-sm">Duty Rate</Text>
                                        <div className="text-right">
                                            <div className="font-medium">{scenario.result.duties.effectiveRate}%</div>
                                            {idx > 0 && scenario.result.duties.effectiveRate !== baseScenario.result.duties.effectiveRate && (
                                                <span className={`text-xs ${
                                                    scenario.result.duties.effectiveRate > baseScenario.result.duties.effectiveRate 
                                                        ? 'text-red-600' 
                                                        : 'text-green-600'
                                                }`}>
                                                    {scenario.result.duties.effectiveRate > baseScenario.result.duties.effectiveRate ? '+' : ''}
                                                    {(scenario.result.duties.effectiveRate - baseScenario.result.duties.effectiveRate).toFixed(2)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-baseline">
                                        <Text className="text-slate-500 text-sm">Fees</Text>
                                        <div className="text-right">
                                            <div className="font-medium">${scenario.result.fees.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            {idx > 0 && getDifferenceIndicator(scenario.result.fees.totalFees, baseScenario.result.fees.totalFees)}
                                        </div>
                                    </div>
                                    
                                    <Divider className="my-2" />
                                    
                                    <div className="flex justify-between items-baseline">
                                        <Text strong className="text-slate-700">Total Landed</Text>
                                        <div className="text-right">
                                            <div className="font-bold text-teal-700 text-lg">${scenario.result.totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            {idx > 0 && getDifferenceIndicator(scenario.result.totalLandedCost, baseScenario.result.totalLandedCost)}
                                        </div>
                                    </div>
                                    
                                    {scenario.result.quantity > 1 && (
                                        <div className="flex justify-between items-baseline text-sm">
                                            <Text className="text-slate-500">Per Unit</Text>
                                            <div className="text-right">
                                                <div className="font-medium">${scenario.result.perUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                                {idx > 0 && getDifferenceIndicator(scenario.result.perUnitCost, baseScenario.result.perUnitCost)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Summary Insights */}
                    {scenariosToCompare.length >= 2 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="flex items-start gap-2">
                                <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800">
                                    {(() => {
                                        const lowest = [...scenariosToCompare].sort((a, b) => a.result.totalLandedCost - b.result.totalLandedCost)[0];
                                        const highest = [...scenariosToCompare].sort((a, b) => b.result.totalLandedCost - a.result.totalLandedCost)[0];
                                        const savings = highest.result.totalLandedCost - lowest.result.totalLandedCost;
                                        
                                        return (
                                            <>
                                                <strong>{lowest.name}</strong> has the lowest landed cost. 
                                                Potential savings of <strong>${savings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> compared to {highest.name}.
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        );
    };
    
    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6">
            {contextHolder}
            
            {/* Header */}
            <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                            <Calculator className="text-white" size={20} />
                        </div>
                        <div>
                            <Title level={3} style={{ margin: 0 }}>Landed Cost Calculator</Title>
                            <Text className="text-slate-500">
                                Calculate total import costs including duties, fees, shipping, and insurance
                            </Text>
                        </div>
                    </div>
                    
                    {/* Compare Mode Toggle */}
                    {savedScenarios.length >= 2 && (
                        <Button
                            type={compareMode ? 'primary' : 'default'}
                            icon={<GitCompare size={16} />}
                            onClick={() => {
                                setCompareMode(!compareMode);
                                if (!compareMode) {
                                    setSelectedForCompare([]);
                                }
                            }}
                            style={compareMode ? { 
                                background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                            } : undefined}
                        >
                            {compareMode ? 'Exit Compare' : 'Compare Scenarios'}
                        </Button>
                    )}
                </div>
            </div>
            
            {/* Compare Mode View */}
            {compareMode ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Scenarios Selection Panel */}
                    <Card className="border border-slate-200 shadow-sm lg:col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <Text strong className="text-slate-700">Select Scenarios</Text>
                            <Badge count={selectedForCompare.length} showZero color="purple" />
                        </div>
                        
                        <div className="space-y-2">
                            {savedScenarios.map(scenario => (
                                <div 
                                    key={scenario.id}
                                    onClick={() => toggleCompareSelection(scenario.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                        selectedForCompare.includes(scenario.id)
                                            ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-200'
                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-800 truncate">{scenario.name}</div>
                                            <div className="text-xs text-slate-500">
                                                {getCountryFlag(scenario.result.countryCode)} ${scenario.result.totalLandedCost.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                            selectedForCompare.includes(scenario.id)
                                                ? 'bg-purple-600 border-purple-600'
                                                : 'border-slate-300'
                                        }`}>
                                            {selectedForCompare.includes(scenario.id) && (
                                                <span className="text-white text-xs font-bold">
                                                    {selectedForCompare.indexOf(scenario.id) + 1}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-200 text-sm text-slate-500">
                            Select 2-3 scenarios to compare side by side
                        </div>
                    </Card>
                    
                    {/* Comparison Results */}
                    <div className="lg:col-span-2">
                        {renderComparisonView()}
                    </div>
                </div>
            ) : (
                /* Normal Calculator View */
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Input Form */}
                    <Card className="border border-slate-200 shadow-sm xl:col-span-1">
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCalculate}
                        initialValues={{
                            quantity: 1,
                            shippingCost: 0,
                            insuranceCost: 0,
                            isOceanShipment: true,
                        }}
                    >
                        {/* Product Information Section */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Package size={16} className="text-teal-600" />
                                <Text strong className="text-slate-700">Product Information</Text>
                            </div>
                            
                            <Form.Item
                                name="htsCode"
                                label="HTS Code"
                                rules={[
                                    { required: true, message: 'HTS code is required' },
                                    { pattern: /^[\d.]+$/, message: 'Enter a valid HTS code (digits and dots)' },
                                ]}
                                tooltip="Enter the 6-10 digit HTS classification code"
                            >
                                <Input 
                                    placeholder="e.g., 6109.10.00.12" 
                                    className="font-mono"
                                    maxLength={14}
                                />
                            </Form.Item>
                            
                            <Form.Item
                                name="countryCode"
                                label="Country of Origin"
                                rules={[{ required: true, message: 'Country is required' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Select country"
                                    options={COUNTRY_OPTIONS}
                                    filterOption={(input, option) =>
                                        (option?.label?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </Form.Item>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Form.Item
                                    name="productValue"
                                    label="Product Value (USD)"
                                    rules={[
                                        { required: true, message: 'Value is required' },
                                        { type: 'number', min: 0.01, message: 'Must be greater than $0' },
                                    ]}
                                    tooltip="Total value of goods (CIF or FOB)"
                                >
                                    <InputNumber<number>
                                        prefix="$"
                                        style={{ width: '100%' }}
                                        placeholder="10000"
                                        min={0.01}
                                        step={100}
                                    />
                                </Form.Item>
                                
                                <Form.Item
                                    name="quantity"
                                    label="Quantity (units)"
                                    rules={[
                                        { required: true, message: 'Quantity is required' },
                                        { type: 'number', min: 1, message: 'Must be at least 1' },
                                    ]}
                                >
                                    <InputNumber<number>
                                        style={{ width: '100%' }}
                                        placeholder="1000"
                                        min={1}
                                        step={1}
                                    />
                                </Form.Item>
                            </div>
                        </div>
                        
                        <Divider className="my-4" />
                        
                        {/* Shipping & Insurance Section */}
                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Ship size={16} className="text-teal-600" />
                                <Text strong className="text-slate-700">Shipping & Insurance</Text>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Form.Item
                                    name="shippingCost"
                                    label="Shipping Cost (USD)"
                                    tooltip="Total shipping/freight cost"
                                >
                                    <InputNumber<number>
                                        prefix="$"
                                        style={{ width: '100%' }}
                                        placeholder="500"
                                        min={0}
                                        step={50}
                                    />
                                </Form.Item>
                                
                                <Form.Item
                                    name="insuranceCost"
                                    label="Insurance Cost (USD)"
                                    tooltip="Cargo insurance cost"
                                >
                                    <InputNumber<number>
                                        prefix="$"
                                        style={{ width: '100%' }}
                                        placeholder="100"
                                        min={0}
                                        step={25}
                                    />
                                </Form.Item>
                            </div>
                            
                            <Form.Item
                                name="isOceanShipment"
                                label={
                                    <span className="flex items-center gap-1">
                                        Shipment Type
                                        <Tooltip title="Ocean shipments incur Harbor Maintenance Fee (HMF)">
                                            <HelpCircle size={14} className="text-slate-400" />
                                        </Tooltip>
                                    </span>
                                }
                                valuePropName="checked"
                            >
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checkedChildren={<Anchor size={14} />}
                                        unCheckedChildren={<Plane size={14} />}
                                        defaultChecked
                                    />
                                    <Text className="text-slate-600 text-sm">
                                        {form.getFieldValue('isOceanShipment') !== false ? 'Ocean (includes HMF)' : 'Air (no HMF)'}
                                    </Text>
                                </div>
                            </Form.Item>
                        </div>
                        
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isCalculating}
                            icon={<Calculator size={16} />}
                            size="large"
                            className="w-full"
                            style={{ 
                                background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
                                height: 48,
                            }}
                        >
                            Calculate Landed Cost
                        </Button>
                    </Form>
                    </Card>
                    
                    {/* Results Section */}
                    <div className="space-y-4 xl:col-span-1">
                        {isCalculating && (
                            <Card className="border border-slate-200 shadow-sm">
                                <LoadingState message="Calculating landed cost..." />
                            </Card>
                        )}
                        
                        {error && !isCalculating && (
                            <Alert
                                type="error"
                                message="Calculation Error"
                                description={error}
                                showIcon
                            />
                        )}
                        
                        {result && !isCalculating && (
                            <>
                                {/* Summary Card */}
                                <Card className="border border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <Text className="text-slate-500 text-sm">HTS Code</Text>
                                            <div className="font-mono text-lg font-semibold text-teal-700">
                                                {formatHtsCode(result.htsCode)}
                                            </div>
                                        </div>
                                        <Tag color="cyan" className="text-sm">
                                            {getCountryFlag(result.countryCode)} {result.countryName}
                                        </Tag>
                                    </div>
                                    
                                    <Text className="text-slate-600 text-sm line-clamp-2">
                                        {result.htsDescription}
                                    </Text>
                                    
                                    <Divider className="my-4" />
                                    
                                    {/* Cost Breakdown Grid */}
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <Statistic
                                            title={<span className="text-slate-500">Product Value</span>}
                                            value={result.productValue}
                                            prefix="$"
                                            precision={2}
                                            valueStyle={{ fontSize: 18, color: '#475569' }}
                                        />
                                        <Statistic
                                            title={<span className="text-slate-500">Shipping + Insurance</span>}
                                            value={result.shippingCost + result.insuranceCost}
                                            prefix="$"
                                            precision={2}
                                            valueStyle={{ fontSize: 18, color: '#475569' }}
                                        />
                                    </div>
                                    
                                    {/* Duties Section */}
                                    <div className="bg-amber-50 rounded-lg p-4 mb-4 border border-amber-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <Text strong className="text-amber-800">Import Duties</Text>
                                            <Text className="text-amber-700 font-semibold">
                                                ${result.duties.totalDuty.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between text-slate-600">
                                                <span>Base MFN ({result.duties.baseMfnRate}%)</span>
                                                <span>${result.duties.baseMfn.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            {result.duties.additionalDuties > 0 && (
                                                <div className="flex justify-between text-amber-700">
                                                    <span>Additional Duties ({result.duties.additionalDutiesRate}%)</span>
                                                    <span>+${result.duties.additionalDuties.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-amber-200">
                                            <div className="flex justify-between text-amber-800 font-medium">
                                                <span>Effective Rate</span>
                                                <span>{result.duties.effectiveRate}%</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Fees Section */}
                                    <div className="bg-slate-100 rounded-lg p-4 mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Text strong className="text-slate-700">Customs Fees</Text>
                                            <Text className="text-slate-700 font-semibold">
                                                ${result.fees.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    MPF (0.3464%)
                                                    <Tooltip title="Merchandise Processing Fee: 0.3464% of value, min $31.67, max $614.35">
                                                        <Info size={12} className="text-slate-400" />
                                                    </Tooltip>
                                                </span>
                                                <span>${result.fees.mpf.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-600">
                                                <span className="flex items-center gap-1">
                                                    HMF (0.125%)
                                                    <Tooltip title="Harbor Maintenance Fee: 0.125% of value (ocean shipments only)">
                                                        <Info size={12} className="text-slate-400" />
                                                    </Tooltip>
                                                </span>
                                                <span>
                                                    {result.isOceanShipment 
                                                        ? `$${result.fees.hmf.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                                        : <Tag color="default" className="text-xs">Air - N/A</Tag>
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Total Landed Cost */}
                                    <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-lg p-4 text-white">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp size={20} />
                                                <Text strong className="text-white text-lg">Total Landed Cost</Text>
                                            </div>
                                            <Text className="text-white text-2xl font-bold">
                                                ${result.totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </Text>
                                        </div>
                                        
                                        {result.quantity > 1 && (
                                            <div className="flex justify-between text-teal-100 text-sm mt-2 pt-2 border-t border-teal-500">
                                                <span>Per Unit Cost ({result.quantity.toLocaleString()} units)</span>
                                                <span className="font-semibold">
                                                    ${result.perUnitCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Save Scenario Button */}
                                    <Button
                                        type="default"
                                        icon={<Save size={16} />}
                                        className="w-full mt-4"
                                        onClick={openSaveModal}
                                        style={{ 
                                            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                                            color: 'white',
                                            border: 'none',
                                        }}
                                    >
                                        Save Scenario
                                    </Button>
                                </Card>
                                
                                {/* Detailed Tariff Breakdown */}
                                <TariffBreakdown
                                    effectiveTariff={result.tariffBreakdown}
                                    countryName={result.countryName}
                                    countryFlag={getCountryFlag(result.countryCode)}
                                />
                                
                                {/* Disclaimer */}
                                <Alert
                                    type="info"
                                    message="Disclaimer"
                                    description="This is an estimate for planning purposes. Actual duties may vary based on CBP classification decisions, trade program eligibility, and other factors. Consult a licensed customs broker for official guidance."
                                    showIcon
                                    className="text-sm"
                                />
                            </>
                        )}
                        
                        {!result && !isCalculating && !error && (
                            <Card className="border border-slate-200 shadow-sm border-dashed">
                                <div className="text-center py-8">
                                    <DollarSign size={48} className="mx-auto text-slate-300 mb-4" />
                                    <Text className="text-slate-500">
                                        Enter product details and click Calculate to see your landed cost breakdown
                                    </Text>
                                </div>
                            </Card>
                        )}
                    </div>
                    
                    {/* Saved Scenarios Sidebar */}
                    <Card className="border border-slate-200 shadow-sm xl:col-span-1">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Bookmark size={16} className="text-purple-600" />
                                <Text strong className="text-slate-700">Saved Scenarios</Text>
                            </div>
                            <Badge count={savedScenarios.length} showZero color="purple" />
                        </div>
                        
                        {savedScenarios.length === 0 ? (
                            <div className="text-center py-8">
                                <Bookmark size={40} className="mx-auto text-slate-300 mb-3" />
                                <Text className="text-slate-500 block mb-1">No scenarios saved</Text>
                                <Text className="text-slate-400 text-sm">
                                    Calculate a landed cost and save it to compare later
                                </Text>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                                {savedScenarios.map(scenario => (
                                    <div 
                                        key={scenario.id}
                                        className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div 
                                                className="flex-1 min-w-0 cursor-pointer"
                                                onClick={() => loadScenario(scenario)}
                                            >
                                                <div className="font-medium text-slate-800 truncate" title={scenario.name}>
                                                    {scenario.name}
                                                </div>
                                                <div className="text-sm text-slate-500">
                                                    {getCountryFlag(scenario.result.countryCode)} {scenario.result.countryName}
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <Text className="text-teal-700 font-semibold">
                                                        ${scenario.result.totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </Text>
                                                    <Text className="text-xs text-slate-400">
                                                        {new Date(scenario.savedAt).toLocaleDateString()}
                                                    </Text>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                    <Tag color="default" className="text-xs">{formatHtsCode(scenario.result.htsCode)}</Tag>
                                                    <span>{scenario.result.duties.effectiveRate}% duty</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Tooltip title="Load scenario">
                                                    <Button 
                                                        type="text" 
                                                        size="small"
                                                        icon={<ChevronRight size={14} />}
                                                        onClick={() => loadScenario(scenario)}
                                                    />
                                                </Tooltip>
                                                <Popconfirm
                                                    title="Delete this scenario?"
                                                    description="This action cannot be undone."
                                                    onConfirm={() => handleDeleteScenario(scenario.id)}
                                                    okText="Delete"
                                                    cancelText="Cancel"
                                                    okButtonProps={{ danger: true }}
                                                >
                                                    <Button 
                                                        type="text" 
                                                        size="small"
                                                        danger
                                                        icon={<Trash2 size={14} />}
                                                    />
                                                </Popconfirm>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {savedScenarios.length >= 2 && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <Button
                                    type="default"
                                    icon={<GitCompare size={16} />}
                                    className="w-full"
                                    onClick={() => setCompareMode(true)}
                                >
                                    Compare Scenarios
                                </Button>
                            </div>
                        )}
                    </Card>
                </div>
            )}
            
            {/* Save Scenario Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <Save size={18} className="text-purple-600" />
                        <span>Save Scenario</span>
                    </div>
                }
                open={saveModalOpen}
                onOk={handleSaveScenario}
                onCancel={() => {
                    setSaveModalOpen(false);
                    setScenarioName('');
                }}
                okText="Save"
                okButtonProps={{
                    disabled: !scenarioName.trim(),
                    style: { 
                        background: scenarioName.trim() ? 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' : undefined,
                    }
                }}
            >
                <div className="py-4">
                    <Text className="text-slate-600 block mb-2">Give this scenario a name:</Text>
                    <Input
                        value={scenarioName}
                        onChange={e => setScenarioName(e.target.value)}
                        placeholder="e.g., China Option A, Vietnam Bulk Order"
                        maxLength={100}
                        autoFocus
                        onPressEnter={() => {
                            if (scenarioName.trim()) {
                                handleSaveScenario();
                            }
                        }}
                    />
                    
                    {result && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                            <div className="text-sm text-slate-500 mb-1">Summary</div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-mono text-sm">{formatHtsCode(result.htsCode)}</div>
                                    <div className="text-xs text-slate-500">
                                        {getCountryFlag(result.countryCode)} {result.countryName}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-semibold text-teal-700">
                                        ${result.totalLandedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {result.duties.effectiveRate}% effective duty
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};
