'use client';

import React from 'react';
import { Form, Input, Select, Button } from 'antd';
import type { FormInstance } from 'antd';
import { Sparkles, Globe, Package, Wrench } from 'lucide-react';
import { COUNTRIES } from './constants';

const { TextArea } = Input;

export interface ProductInputValues {
    productName?: string;
    productSku?: string;
    productDescription: string;
    countryOfOrigin?: string;
    materialComposition?: string;
    intendedUse?: string;
}

export interface ProductInputFormProps {
    /** Form instance for external control */
    form?: FormInstance<ProductInputValues>;
    /** Callback when form is submitted */
    onSubmit: (values: ProductInputValues) => void | Promise<void>;
    /** Whether the form is currently loading/submitting */
    loading?: boolean;
    /** Custom submit button text */
    submitText?: string;
    /** Custom submit button icon */
    submitIcon?: React.ReactNode;
    /** Whether country is required (default: true for tariff calculations) */
    requireCountry?: boolean;
    /** Whether to show the AI info box */
    showAiInfo?: boolean;
    /** Variant - 'full' shows all fields, 'compact' shows fewer */
    variant?: 'full' | 'compact';
    /** Initial values */
    initialValues?: Partial<ProductInputValues>;
}

/**
 * Reusable product input form used across Classification and Sourcing pages.
 * Collects product details needed for HTS classification.
 */
export const ProductInputForm: React.FC<ProductInputFormProps> = ({
    form: externalForm,
    onSubmit,
    loading = false,
    submitText = 'Analyze Product',
    submitIcon = <Sparkles size={18} />,
    requireCountry = true,
    showAiInfo = true,
    variant = 'full',
    initialValues,
}) => {
    const [internalForm] = Form.useForm<ProductInputValues>();
    const form = externalForm || internalForm;

    const handleFinish = async (values: ProductInputValues) => {
        await onSubmit(values);
    };

    return (
        <Form 
            form={form} 
            layout="vertical" 
            onFinish={handleFinish} 
            requiredMark={false}
            initialValues={initialValues}
        >
            {/* Product Identification - Optional but helpful */}
            {variant === 'full' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-1">
                    <Form.Item
                        label={
                            <span className="text-slate-700 font-medium">
                                Product Name (Optional)
                            </span>
                        }
                        name="productName"
                        tooltip="A short, friendly name for this product"
                    >
                        <Input
                            placeholder="e.g., Widget A, Blue Connector, Safety Valve"
                            size="large"
                        />
                    </Form.Item>

                    <Form.Item
                        label={
                            <span className="text-slate-700 font-medium">
                                SKU / Part Number (Optional)
                            </span>
                        }
                        name="productSku"
                        tooltip="Your internal part number or SKU for reference"
                    >
                        <Input
                            placeholder="e.g., SKU-12345, PART-001"
                            size="large"
                        />
                    </Form.Item>
                </div>
            )}

            {/* Product Description - Main Input */}
            <Form.Item
                label={
                    <span className="flex items-center gap-2 text-slate-700 font-medium">
                        <Package size={16} />
                        Product Description
                    </span>
                }
                name="productDescription"
                rules={[
                    { required: true, message: 'Please describe the product' },
                    { min: 20, message: 'Please provide at least 20 characters for accurate classification' }
                ]}
            >
                <TextArea
                    rows={variant === 'compact' ? 3 : 4}
                    placeholder="Example: Plastic housing for electronics made of nylon 6/6, injection molded, used as protective enclosure for building control systems."
                    className="text-base"
                    showCount
                    maxLength={2000}
                />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Country of Origin */}
                <Form.Item
                    label={
                        <span className="flex items-center gap-2 text-slate-700 font-medium">
                            <Globe size={16} />
                            Country of Origin
                        </span>
                    }
                    name="countryOfOrigin"
                    rules={requireCountry ? [
                        { required: true, message: 'Required for accurate tariff calculation' }
                    ] : undefined}
                    tooltip="Needed to calculate all applicable tariffs including Section 301, IEEPA, and trade agreements"
                >
                    <Select
                        placeholder="Select country"
                        options={COUNTRIES.map(c => ({ value: c.value, label: c.label }))}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        size="large"
                        allowClear={!requireCountry}
                    />
                </Form.Item>

                {/* Intended Use */}
                <Form.Item
                    label={
                        <span className="flex items-center gap-2 text-slate-700 font-medium">
                            <Wrench size={16} />
                            Intended Use
                        </span>
                    }
                    name="intendedUse"
                >
                    <Input
                        placeholder="e.g., Building automation, industrial machinery"
                        size="large"
                    />
                </Form.Item>
            </div>

            {/* Material Composition - Full variant only */}
            {variant === 'full' && (
                <Form.Item
                    label={
                        <span className="text-slate-700 font-medium">
                            Material Composition (Optional)
                        </span>
                    }
                    name="materialComposition"
                >
                    <Input
                        placeholder="e.g., Nylon 6/6, ABS plastic, 60% cotton / 40% polyester"
                        size="large"
                    />
                </Form.Item>
            )}

            {/* Submit Button */}
            <Form.Item className="mb-0 mt-6">
                <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={submitIcon}
                    className="h-12 px-8 text-base font-medium"
                    loading={loading}
                >
                    {submitText}
                </Button>
            </Form.Item>

            {/* AI Info Box */}
            {showAiInfo && (
                <div className="mt-6 p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-100 flex items-start gap-3">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                        <Sparkles size={18} className="text-teal-600" />
                    </div>
                    <div>
                        <span className="text-teal-800 font-semibold block text-sm">
                            AI + Official USITC Validation
                        </span>
                        <span className="text-teal-700 text-sm leading-relaxed mt-0.5 block">
                            Our AI analyzes your product, then validates against the official USITC database.
                        </span>
                    </div>
                </div>
            )}
        </Form>
    );
};




