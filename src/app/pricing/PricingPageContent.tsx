'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
    Anchor, 
    Check, 
    Sparkles, 
    Building2, 
    Zap,
    Globe,
    Bell,
    FileSpreadsheet,
    Code,
    Users,
    FileText,
    ArrowRight,
    HelpCircle,
} from 'lucide-react';

const TIERS = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'Perfect for trying out Sourcify and occasional lookups.',
        cta: 'Get Started',
        ctaHref: '/dashboard/classifications',
        highlight: false,
        features: [
            { text: '5 classifications per day', included: true },
            { text: 'Full tariff breakdown', included: true },
            { text: 'Alternative codes display', included: true },
            { text: '1 tariff alert', included: true },
            { text: '10 search history', included: true },
            { text: 'Sourcing Intelligence', included: false },
            { text: 'Portfolio management', included: false },
            { text: 'Bulk classification', included: false },
        ],
    },
    {
        name: 'Pro',
        price: '$99',
        period: '/month',
        description: 'For importers who want to optimize costs and stay compliant.',
        cta: 'Start 14-Day Trial',
        ctaHref: '/dashboard?upgrade=pro',
        highlight: true,
        badge: 'Most Popular',
        features: [
            { text: 'Unlimited classifications', included: true },
            { text: 'Full tariff breakdown', included: true },
            { text: 'Alternative codes display', included: true },
            { text: '25 tariff alerts', included: true },
            { text: 'Unlimited search history', included: true },
            { text: 'Sourcing Intelligence', included: true, highlight: true },
            { text: '100 saved products', included: true },
            { text: 'CSV export', included: true },
        ],
    },
    {
        name: 'Business',
        price: '$299',
        period: '/month',
        description: 'For teams managing large catalogs with advanced needs.',
        cta: 'Contact Sales',
        ctaHref: 'mailto:sales@sourcify.dev',
        highlight: false,
        features: [
            { text: 'Everything in Pro', included: true },
            { text: 'Bulk classification (500/upload)', included: true, highlight: true },
            { text: 'API access (1,000 calls/mo)', included: true, highlight: true },
            { text: '5 team members', included: true },
            { text: 'PDF savings reports', included: true },
            { text: 'Portfolio optimizer', included: true },
            { text: 'Priority support', included: true },
            { text: 'Custom integrations', included: false },
        ],
    },
];

const FEATURE_COMPARISON = [
    {
        category: 'Classification',
        icon: Sparkles,
        features: [
            { name: 'Daily classifications', free: '5', pro: 'Unlimited', business: 'Unlimited' },
            { name: 'AI-powered HTS lookup', free: true, pro: true, business: true },
            { name: 'Full tariff breakdown', free: true, pro: true, business: true },
            { name: 'Alternative codes', free: true, pro: true, business: true },
            { name: 'Bulk CSV upload', free: false, pro: false, business: '500/upload' },
        ],
    },
    {
        category: 'Sourcing Intelligence',
        icon: Globe,
        features: [
            { name: 'Country comparison', free: false, pro: true, business: true },
            { name: 'Landed cost calculator', free: false, pro: true, business: true },
            { name: 'Supplier explorer', free: false, pro: true, business: true },
            { name: 'Market trends', free: false, pro: 'Coming soon', business: 'Coming soon' },
        ],
    },
    {
        category: 'Monitoring & Alerts',
        icon: Bell,
        features: [
            { name: 'Tariff alerts', free: '1', pro: '25', business: 'Unlimited' },
            { name: 'Email notifications', free: true, pro: true, business: true },
            { name: 'Rate change history', free: false, pro: true, business: true },
            { name: 'Portfolio analysis', free: false, pro: false, business: true },
        ],
    },
    {
        category: 'Team & Integration',
        icon: Users,
        features: [
            { name: 'Team members', free: '1', pro: '1', business: '5' },
            { name: 'API access', free: false, pro: false, business: '1,000 calls/mo' },
            { name: 'CSV export', free: false, pro: true, business: true },
            { name: 'PDF reports', free: false, pro: false, business: true },
        ],
    },
];

const FAQS = [
    {
        question: 'What counts as a classification?',
        answer: 'Each product you classify counts as one classification. Re-classifying the same product also counts. Saved products don\'t re-count when you view them.',
    },
    {
        question: 'Can I cancel anytime?',
        answer: 'Yes! You can cancel your subscription at any time. You\'ll retain access until the end of your billing period.',
    },
    {
        question: 'Is there a free trial?',
        answer: 'Yes, Pro and Business plans come with a 14-day free trial. No credit card required to start.',
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards through Stripe. Enterprise customers can pay by invoice.',
    },
    {
        question: 'Do you offer discounts for annual billing?',
        answer: 'Yes! Annual plans get 2 months free (save ~17%). Contact us for custom pricing on larger commitments.',
    },
    {
        question: 'What happens when I hit my limit?',
        answer: 'For free users, daily limits reset at midnight UTC. For alerts, you\'ll need to delete old alerts to add new ones, or upgrade for more capacity.',
    },
];

export function PricingPageContent() {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
    
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
            {/* Navigation */}
            <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="bg-teal-600 p-2 rounded-lg">
                                <Anchor className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-semibold text-lg text-slate-900">Sourcify</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link 
                                href="/login" 
                                className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                            >
                                Sign In
                            </Link>
                            <Link 
                                href="/dashboard/classifications" 
                                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                Get Started Free
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>
            
            {/* Hero */}
            <section className="py-16 sm:py-24">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
                        Simple, transparent pricing
                    </h1>
                    <p className="text-xl text-slate-600 mb-8">
                        Classification is free. Optimization is Pro.
                    </p>
                    
                    {/* Billing Toggle */}
                    <div className="inline-flex items-center gap-3 bg-slate-100 p-1 rounded-full">
                        <button
                            onClick={() => setBillingPeriod('monthly')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                                billingPeriod === 'monthly' 
                                    ? 'bg-white text-slate-900 shadow-sm' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setBillingPeriod('annual')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                billingPeriod === 'annual' 
                                    ? 'bg-white text-slate-900 shadow-sm' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            Annual
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                                Save 17%
                            </span>
                        </button>
                    </div>
                </div>
            </section>
            
            {/* Pricing Cards */}
            <section className="pb-16 sm:pb-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {TIERS.map((tier) => {
                            const price = billingPeriod === 'annual' && tier.price !== '$0'
                                ? `$${Math.round(parseInt(tier.price.slice(1)) * 10 / 12)}`
                                : tier.price;
                            const period = tier.price === '$0' 
                                ? 'forever' 
                                : billingPeriod === 'annual' 
                                    ? '/mo (billed annually)' 
                                    : '/month';
                            
                            return (
                                <div
                                    key={tier.name}
                                    className={`relative rounded-2xl p-8 ${
                                        tier.highlight
                                            ? 'bg-gradient-to-b from-teal-600 to-teal-700 text-white shadow-xl shadow-teal-200/50 scale-105 z-10'
                                            : 'bg-white border border-slate-200 shadow-lg shadow-slate-200/50'
                                    }`}
                                >
                                    {tier.badge && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                            <span className="bg-amber-400 text-amber-900 text-xs font-semibold px-3 py-1 rounded-full">
                                                {tier.badge}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="text-center mb-6">
                                        <h3 className={`text-xl font-semibold mb-2 ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>
                                            {tier.name}
                                        </h3>
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className={`text-4xl font-bold ${tier.highlight ? 'text-white' : 'text-slate-900'}`}>
                                                {price}
                                            </span>
                                            <span className={tier.highlight ? 'text-teal-100' : 'text-slate-500'}>
                                                {period}
                                            </span>
                                        </div>
                                        <p className={`text-sm mt-2 ${tier.highlight ? 'text-teal-100' : 'text-slate-600'}`}>
                                            {tier.description}
                                        </p>
                                    </div>
                                    
                                    <ul className="space-y-3 mb-8">
                                        {tier.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                {feature.included ? (
                                                    <Check 
                                                        size={18} 
                                                        className={`flex-shrink-0 mt-0.5 ${
                                                            tier.highlight 
                                                                ? 'text-teal-200' 
                                                                : feature.highlight 
                                                                    ? 'text-teal-600' 
                                                                    : 'text-emerald-500'
                                                        }`} 
                                                    />
                                                ) : (
                                                    <div className={`w-[18px] h-[18px] flex-shrink-0 mt-0.5 rounded-full border-2 ${
                                                        tier.highlight ? 'border-teal-400/50' : 'border-slate-300'
                                                    }`} />
                                                )}
                                                <span className={`text-sm ${
                                                    tier.highlight 
                                                        ? feature.included ? 'text-white' : 'text-teal-300'
                                                        : feature.included ? 'text-slate-700' : 'text-slate-400'
                                                }`}>
                                                    {feature.text}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                    
                                    <Link
                                        href={tier.ctaHref}
                                        className={`block text-center py-3 rounded-lg font-medium transition-all ${
                                            tier.highlight
                                                ? 'bg-white text-teal-700 hover:bg-teal-50'
                                                : tier.name === 'Free'
                                                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                        }`}
                                    >
                                        {tier.cta}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>
            
            {/* Feature Comparison */}
            <section className="py-16 sm:py-24 bg-slate-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
                        Compare plans in detail
                    </h2>
                    
                    <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/50 overflow-hidden">
                        {/* Header */}
                        <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50">
                            <div className="p-4 font-medium text-slate-600">Features</div>
                            <div className="p-4 text-center font-medium text-slate-900">Free</div>
                            <div className="p-4 text-center font-medium text-teal-700 bg-teal-50">Pro</div>
                            <div className="p-4 text-center font-medium text-slate-900">Business</div>
                        </div>
                        
                        {/* Feature sections */}
                        {FEATURE_COMPARISON.map((section) => (
                            <div key={section.category}>
                                {/* Category header */}
                                <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50/50">
                                    <div className="p-4 font-semibold text-slate-900 flex items-center gap-2">
                                        <section.icon size={18} className="text-slate-500" />
                                        {section.category}
                                    </div>
                                    <div className="p-4" />
                                    <div className="p-4 bg-teal-50/50" />
                                    <div className="p-4" />
                                </div>
                                
                                {/* Features */}
                                {section.features.map((feature, idx) => (
                                    <div 
                                        key={idx}
                                        className="grid grid-cols-4 border-b border-slate-100 last:border-0"
                                    >
                                        <div className="p-4 text-sm text-slate-600">{feature.name}</div>
                                        <div className="p-4 text-center">
                                            {renderFeatureValue(feature.free)}
                                        </div>
                                        <div className="p-4 text-center bg-teal-50/30">
                                            {renderFeatureValue(feature.pro, true)}
                                        </div>
                                        <div className="p-4 text-center">
                                            {renderFeatureValue(feature.business)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* FAQ */}
            <section className="py-16 sm:py-24">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
                        Frequently asked questions
                    </h2>
                    
                    <div className="space-y-4">
                        {FAQS.map((faq, idx) => (
                            <div 
                                key={idx}
                                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                            >
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <span className="font-medium text-slate-900">{faq.question}</span>
                                    <HelpCircle 
                                        size={20} 
                                        className={`text-slate-400 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {expandedFaq === idx && (
                                    <div className="px-5 pb-5 text-slate-600">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            {/* CTA */}
            <section className="py-16 sm:py-24 bg-gradient-to-r from-teal-600 to-emerald-600">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                        Ready to optimize your imports?
                    </h2>
                    <p className="text-xl text-teal-100 mb-8">
                        Start classifying for free. Upgrade when you&apos;re ready.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard/classifications"
                            className="inline-flex items-center justify-center gap-2 bg-white text-teal-700 px-8 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-colors"
                        >
                            <Sparkles size={20} />
                            Get Started Free
                        </Link>
                        <Link
                            href="mailto:sales@sourcify.dev"
                            className="inline-flex items-center justify-center gap-2 bg-teal-500/20 text-white border border-teal-400/50 px-8 py-3 rounded-lg font-semibold hover:bg-teal-500/30 transition-colors"
                        >
                            Talk to Sales
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </section>
            
            {/* Footer */}
            <footer className="py-8 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Anchor size={20} className="text-teal-600" />
                            <span className="font-medium text-slate-900">Sourcify</span>
                        </div>
                        <p className="text-sm text-slate-500">
                            © 2026 Sourcify. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function renderFeatureValue(value: boolean | string, isPro = false) {
    if (value === true) {
        return <Check size={18} className={isPro ? 'text-teal-600 mx-auto' : 'text-emerald-500 mx-auto'} />;
    }
    if (value === false) {
        return <span className="text-slate-300">—</span>;
    }
    return (
        <span className={`text-sm font-medium ${isPro ? 'text-teal-700' : 'text-slate-700'}`}>
            {value}
        </span>
    );
}


