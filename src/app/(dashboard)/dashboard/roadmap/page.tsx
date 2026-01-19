'use client';

import React, { useState } from 'react';
import { Card, Tag, Input, Segmented, Tooltip, Badge, Progress } from 'antd';
import {
    CheckCircle,
    Clock,
    Sparkles,
    Search,
    Zap,
    Globe,
    Bell,
    Calculator,
    FileText,
    TrendingUp,
    Shield,
    Users,
    BarChart3,
    Package,
    AlertTriangle,
    DollarSign,
    Ship,
    FileCheck,
    Layers,
    Target,
    Eye,
    Lock,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type ServiceStatus = 'live' | 'specd' | 'planned';
type ServiceTier = 'free' | 'pro' | 'business' | 'enterprise' | 'internal';

interface Service {
    id: string;
    name: string;
    description: string;
    status: ServiceStatus;
    tier: ServiceTier;
    icon: React.ReactNode;
    features?: string[];
    apiEndpoint?: string;
    file?: string;
    dataSource?: string;
    category: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES DATA
// ═══════════════════════════════════════════════════════════════════════════════

const services: Service[] = [
    // ─────────────────────────────────────────────────────────────────────────────
    // LIVE SERVICES
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'classification',
        name: 'HTS Classification Engine',
        description: 'AI-powered semantic search classification in ~4 seconds. 27,061 HTS codes with embeddings.',
        status: 'live',
        tier: 'free',
        icon: <Search className="w-5 h-5" />,
        features: ['Semantic search', 'Conditional classification', 'Alternative codes', 'Confidence scoring'],
        apiEndpoint: 'POST /api/classify-v10',
        file: 'classificationEngineV10.ts',
        category: 'Classification',
    },
    {
        id: 'tariff-registry',
        name: 'Country Tariff Registry',
        description: 'Single source of truth for all tariff data. 199 countries, 7 integrated data sources.',
        status: 'live',
        tier: 'internal',
        icon: <Globe className="w-5 h-5" />,
        features: ['MFN rates', 'Section 301', 'IEEPA', 'Fentanyl tariffs', 'Reciprocal rates', 'AD/CVD warnings'],
        apiEndpoint: 'POST /api/tariff-registry/sync',
        file: 'tariffRegistry.ts',
        dataSource: 'USITC HTS API, Federal Register, OFAC',
        category: 'Data Infrastructure',
    },
    {
        id: 'landed-cost',
        name: 'Landed Cost Calculator',
        description: 'Full landed cost comparison across countries using REAL import data from USITC DataWeb.',
        status: 'live',
        tier: 'pro',
        icon: <Calculator className="w-5 h-5" />,
        features: ['Product cost from real data', 'Shipping estimates', 'Full tariff breakdown', 'MPF/HMF fees'],
        apiEndpoint: 'GET /api/sourcing/landed-cost',
        file: 'landedCost.ts',
        dataSource: 'USITC DataWeb API',
        category: 'Sourcing',
    },
    {
        id: 'tariff-monitoring',
        name: 'Tariff Monitoring System',
        description: 'Track tariff changes for saved products. Dashboard card, product drawer, rate history.',
        status: 'live',
        tier: 'pro',
        icon: <Bell className="w-5 h-5" />,
        features: ['Dashboard alerts', 'Rate history', 'Bulk actions', 'Product drawer'],
        file: 'TariffMonitoringTab.tsx',
        category: 'Monitoring',
    },
    {
        id: 'sourcing-intelligence',
        name: 'Sourcing Intelligence',
        description: 'Compare sourcing options across countries with savings calculations.',
        status: 'live',
        tier: 'pro',
        icon: <TrendingUp className="w-5 h-5" />,
        features: ['Country comparison', 'Savings analysis', 'Supplier explorer'],
        apiEndpoint: '/api/sourcing/analyze',
        file: 'sourcingAdvisor.ts',
        category: 'Sourcing',
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // SPEC'D SERVICES
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'same-country-optimization',
        name: 'Same-Country Optimization',
        description: 'Find alternative HTS codes under the same heading with lower duty rates.',
        status: 'specd',
        tier: 'pro',
        icon: <Target className="w-5 h-5" />,
        features: ['Alternative code discovery', 'Duty savings calculation', 'Value threshold detection'],
        category: 'Optimization',
    },
    {
        id: 'cbp-rulings',
        name: 'CBP Ruling Research',
        description: 'Match products to CBP CROSS rulings for classification defensibility.',
        status: 'specd',
        tier: 'business',
        icon: <FileCheck className="w-5 h-5" />,
        features: ['Ruling matching', 'Defensibility score', 'Similar product lookup'],
        dataSource: 'CBP CROSS (scraper needed)',
        category: 'Compliance',
    },
    {
        id: 'bulk-classification',
        name: 'Bulk Classification',
        description: 'CSV/Excel upload for batch classification and portfolio-wide optimization.',
        status: 'specd',
        tier: 'business',
        icon: <Layers className="w-5 h-5" />,
        features: ['CSV/Excel import', 'Batch processing', 'AI enrichment', 'Savings report PDF'],
        category: 'Enterprise',
    },
    {
        id: 'what-if-simulator',
        name: 'What-If Simulator',
        description: 'Interactive duty calculator for product development. Change specs → see duty impact.',
        status: 'specd',
        tier: 'pro',
        icon: <Sparkles className="w-5 h-5" />,
        features: ['Interactive calculator', 'Scenario comparison', 'Annual projections'],
        category: 'Optimization',
    },
    {
        id: 'weekly-digest',
        name: 'Weekly Digest Email',
        description: 'Automated weekly summary of tariff changes and savings opportunities.',
        status: 'specd',
        tier: 'free',
        icon: <FileText className="w-5 h-5" />,
        features: ['Personalized alerts', 'Dollar impact estimates', 'Action items'],
        category: 'Engagement',
    },
    {
        id: 'competitor-watchlist',
        name: 'Competitor Watchlist',
        description: 'Track competitor import activity and supplier changes.',
        status: 'specd',
        tier: 'enterprise',
        icon: <Eye className="w-5 h-5" />,
        features: ['Import tracking', 'Supplier alerts', 'Volume monitoring'],
        dataSource: 'Bill of Lading data ($10k-50k/year)',
        category: 'Intelligence',
    },
    {
        id: 'market-trends',
        name: 'Market Trends Dashboard',
        description: 'Volume/value trends by HTS chapter and country origin shifts over time.',
        status: 'specd',
        tier: 'business',
        icon: <BarChart3 className="w-5 h-5" />,
        features: ['Trend visualization', 'Country shifts', 'Price movements'],
        dataSource: 'USITC DataWeb (integrated!)',
        category: 'Intelligence',
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // PLANNED SERVICES
    // ─────────────────────────────────────────────────────────────────────────────
    {
        id: 'fta-analyzer',
        name: 'FTA Qualification Analyzer',
        description: 'Detailed rules of origin analysis. "Is my product USMCA-qualified?" calculator.',
        status: 'planned',
        tier: 'business',
        icon: <Shield className="w-5 h-5" />,
        features: ['Rules of origin', 'Certificate guidance', 'FTA eligibility check'],
        category: 'Compliance',
    },
    {
        id: 'tariff-engineering',
        name: 'Tariff Engineering Advisor',
        description: 'Suggest product modifications to qualify for lower tariffs.',
        status: 'planned',
        tier: 'business',
        icon: <Zap className="w-5 h-5" />,
        features: ['Material optimization', 'BOM analysis', 'Duty reduction suggestions'],
        category: 'Optimization',
    },
    {
        id: 'duty-drawback',
        name: 'Duty Drawback Identification',
        description: 'Identify products eligible for duty drawback (refunds on re-exported goods).',
        status: 'planned',
        tier: 'business',
        icon: <DollarSign className="w-5 h-5" />,
        features: ['Eligibility check', 'Refund calculation', 'Re-export tracking'],
        category: 'Optimization',
    },
    {
        id: 'exclusion-tracker',
        name: 'Section 301 Exclusion Tracker',
        description: 'Track exclusion requests and alert when exclusions expire.',
        status: 'planned',
        tier: 'pro',
        icon: <AlertTriangle className="w-5 h-5" />,
        features: ['Exclusion monitoring', 'Expiration alerts', 'Success rates'],
        dataSource: 'Federal Register (integrated!)',
        category: 'Monitoring',
    },
    {
        id: 'de-minimis',
        name: 'De Minimis Calculator',
        description: 'Calculate if shipments qualify for duty-free de minimis entry (<$800).',
        status: 'planned',
        tier: 'free',
        icon: <Package className="w-5 h-5" />,
        features: ['Threshold check', 'Split shipment advice', 'DTC optimization'],
        category: 'Optimization',
    },
    {
        id: 'port-optimization',
        name: 'Port/Entry Optimization',
        description: 'Compare entry costs by port and FTZ benefit analysis.',
        status: 'planned',
        tier: 'business',
        icon: <Ship className="w-5 h-5" />,
        features: ['Port comparison', 'FTZ analysis', 'Entry cost breakdown'],
        category: 'Logistics',
    },
    {
        id: 'supplier-verification',
        name: 'Supplier Verification',
        description: 'Verify supplier legitimacy with denied party screening and compliance checks.',
        status: 'planned',
        tier: 'business',
        icon: <Users className="w-5 h-5" />,
        features: ['Denied party screening', 'CTPAT check', 'ESG scoring'],
        dataSource: 'BIS Entity List, OFAC SDN',
        category: 'Compliance',
    },
    {
        id: 'product-safety',
        name: 'Product Safety Screening',
        description: 'Check products/suppliers against FDA alerts and CPSC recalls.',
        status: 'planned',
        tier: 'pro',
        icon: <Shield className="w-5 h-5" />,
        features: ['FDA alerts', 'CPSC recalls', 'Supplier risk flags'],
        dataSource: 'FDA API, CPSC API',
        category: 'Compliance',
    },
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const StatusBadge: React.FC<{ status: ServiceStatus }> = ({ status }) => {
    const config = {
        live: { color: 'green', icon: <CheckCircle className="w-3 h-3" />, label: 'Live' },
        specd: { color: 'blue', icon: <FileText className="w-3 h-3" />, label: "Spec'd" },
        planned: { color: 'orange', icon: <Clock className="w-3 h-3" />, label: 'Planned' },
    };
    
    const { color, icon, label } = config[status];
    
    return (
        <Tag color={color} className="flex items-center gap-1 m-0">
            {icon}
            <span>{label}</span>
        </Tag>
    );
};

const TierBadge: React.FC<{ tier: ServiceTier }> = ({ tier }) => {
    const config = {
        free: { color: 'default', label: 'Free' },
        pro: { color: 'purple', label: 'Pro' },
        business: { color: 'gold', label: 'Business' },
        enterprise: { color: 'red', label: 'Enterprise' },
        internal: { color: 'default', label: 'Internal' },
    };
    
    const { color, label } = config[tier];
    
    return (
        <Tag color={color} className="m-0 text-xs">
            {tier === 'enterprise' && <Lock className="w-3 h-3 inline mr-1" />}
            {label}
        </Tag>
    );
};

const ServiceCard: React.FC<{ service: Service }> = ({ service }) => {
    const statusColors = {
        live: 'border-l-green-500',
        specd: 'border-l-blue-500',
        planned: 'border-l-orange-400',
    };
    
    return (
        <Card 
            className={`h-full border-l-4 ${statusColors[service.status]} hover:shadow-md transition-shadow`}
            size="small"
        >
            <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${
                            service.status === 'live' ? 'bg-green-50 text-green-600' :
                            service.status === 'specd' ? 'bg-blue-50 text-blue-600' :
                            'bg-orange-50 text-orange-600'
                        }`}>
                            {service.icon}
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                                {service.name}
                            </h3>
                            <div className="flex items-center gap-1 mt-0.5">
                                <StatusBadge status={service.status} />
                                <TierBadge tier={service.tier} />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Description */}
                <p className="text-slate-600 text-sm mb-3 flex-grow">
                    {service.description}
                </p>
                
                {/* Features */}
                {service.features && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {service.features.slice(0, 4).map((feature, idx) => (
                            <span 
                                key={idx}
                                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                            >
                                {feature}
                            </span>
                        ))}
                        {service.features.length > 4 && (
                            <span className="text-xs text-slate-400">
                                +{service.features.length - 4} more
                            </span>
                        )}
                    </div>
                )}
                
                {/* Technical Details */}
                <div className="border-t border-slate-100 pt-2 mt-auto">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        {service.apiEndpoint && (
                            <Tooltip title="API Endpoint">
                                <span className="font-mono">{service.apiEndpoint}</span>
                            </Tooltip>
                        )}
                        {service.dataSource && (
                            <Tooltip title="Data Source">
                                <span>📊 {service.dataSource}</span>
                            </Tooltip>
                        )}
                        {service.file && (
                            <Tooltip title="Main File">
                                <span className="font-mono text-slate-400">{service.file}</span>
                            </Tooltip>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function RoadmapPage() {
    const [filter, setFilter] = useState<'all' | ServiceStatus>('all');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    
    // Get unique categories
    const categories = ['all', ...new Set(services.map(s => s.category))];
    
    // Filter services
    const filteredServices = services.filter(service => {
        const matchesStatus = filter === 'all' || service.status === filter;
        const matchesSearch = service.name.toLowerCase().includes(search.toLowerCase()) ||
                             service.description.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
        return matchesStatus && matchesSearch && matchesCategory;
    });
    
    // Stats
    const liveCount = services.filter(s => s.status === 'live').length;
    const specdCount = services.filter(s => s.status === 'specd').length;
    const plannedCount = services.filter(s => s.status === 'planned').length;
    const totalCount = services.length;
    
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Feature Library</h1>
                    <p className="text-slate-500 mt-1">
                        All services and capabilities on the Sourcify platform
                    </p>
                </div>
                
                {/* Progress Summary */}
                <Card size="small" className="md:min-w-[300px]">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-600">Platform Progress</span>
                                <span className="font-semibold text-slate-900">
                                    {liveCount}/{totalCount} Live
                                </span>
                            </div>
                            <Progress 
                                percent={Math.round((liveCount / totalCount) * 100)} 
                                strokeColor="#10b981"
                                size="small"
                                showInfo={false}
                            />
                        </div>
                        <div className="flex gap-2 text-xs">
                            <Badge color="green" text={`${liveCount} Live`} />
                            <Badge color="blue" text={`${specdCount} Spec'd`} />
                            <Badge color="orange" text={`${plannedCount} Planned`} />
                        </div>
                    </div>
                </Card>
            </div>
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Input
                    placeholder="Search services..."
                    prefix={<Search className="w-4 h-4 text-slate-400" />}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="max-w-xs"
                    allowClear
                />
                
                <Segmented
                    value={filter}
                    onChange={(value) => setFilter(value as 'all' | ServiceStatus)}
                    options={[
                        { value: 'all', label: `All (${totalCount})` },
                        { value: 'live', label: `Live (${liveCount})` },
                        { value: 'specd', label: `Spec'd (${specdCount})` },
                        { value: 'planned', label: `Planned (${plannedCount})` },
                    ]}
                />
                
                <Segmented
                    value={categoryFilter}
                    onChange={(value) => setCategoryFilter(value as string)}
                    options={categories.map(cat => ({
                        value: cat,
                        label: cat === 'all' ? 'All Categories' : cat,
                    }))}
                />
            </div>
            
            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                ))}
            </div>
            
            {/* Empty State */}
            {filteredServices.length === 0 && (
                <div className="text-center py-12">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No services match your filters</p>
                </div>
            )}
            
            {/* Legend */}
            <Card size="small" className="bg-slate-50">
                <div className="flex flex-wrap gap-6 text-sm">
                    <div>
                        <span className="font-medium text-slate-700 mr-2">Status:</span>
                        <span className="inline-flex items-center gap-1 text-green-600 mr-3">
                            <CheckCircle className="w-3 h-3" /> Live - Production ready
                        </span>
                        <span className="inline-flex items-center gap-1 text-blue-600 mr-3">
                            <FileText className="w-3 h-3" /> Spec&apos;d - Designed, not built
                        </span>
                        <span className="inline-flex items-center gap-1 text-orange-600">
                            <Clock className="w-3 h-3" /> Planned - Future feature
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-slate-700 mr-2">Tier:</span>
                        <span className="mr-2">Free</span>
                        <span className="text-purple-600 mr-2">Pro ($99/mo)</span>
                        <span className="text-yellow-600 mr-2">Business ($299/mo)</span>
                        <span className="text-red-600">Enterprise (Custom)</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}


