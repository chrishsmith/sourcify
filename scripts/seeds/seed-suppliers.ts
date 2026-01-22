/**
 * Supplier Seed Data
 * 
 * Sample verified suppliers for the supplier explorer.
 * In production, this would be curated from:
 * - Trade show databases
 * - Import/export records
 * - Industry directories
 * - Verified partnerships
 */

import { PrismaClient, EmployeeRange, RevenueRange, CostTier, SupplierTier } from '@prisma/client';

const prisma = new PrismaClient();

interface SupplierSeed {
    name: string;
    slug: string;
    description: string;
    website?: string;
    countryCode: string;
    countryName: string;
    region?: string;
    city?: string;
    productCategories: string[];
    htsChapters: string[];
    materials: string[];
    employeeCount: EmployeeRange;
    yearEstablished?: number;
    annualRevenue?: RevenueRange;
    exportPercentage?: number;
    certifications: string[];
    isVerified: boolean;
    tier: SupplierTier;
    reliabilityScore: number;
    qualityScore: number;
    communicationScore: number;
    costTier: CostTier;
    minOrderValue?: number;
    typicalLeadDays?: number;
}

const SUPPLIERS: SupplierSeed[] = [
    // === CHINA ===
    {
        name: 'Dongguan Tex-Pro Manufacturing Co., Ltd',
        slug: 'dongguan-tex-pro',
        description: 'Leading textile manufacturer specializing in high-volume cotton knits with automated cutting lines. ISO 9001 certified with 15+ years of export experience to US and EU markets.',
        website: 'https://example.com/tex-pro',
        countryCode: 'CN',
        countryName: 'China',
        region: 'Guangdong',
        city: 'Dongguan',
        productCategories: ['Apparel', 'Textiles', 'Knit Goods'],
        htsChapters: ['61', '62', '63'],
        materials: ['Cotton', 'Polyester', 'Cotton-Poly Blend'],
        employeeCount: 'LARGE',
        yearEstablished: 2008,
        annualRevenue: 'TEN_TO_50M',
        exportPercentage: 85,
        certifications: ['ISO 9001', 'BSCI', 'WRAP', 'Oeko-Tex'],
        isVerified: true,
        tier: 'VERIFIED',
        reliabilityScore: 92,
        qualityScore: 88,
        communicationScore: 85,
        costTier: 'LOW',
        minOrderValue: 5000,
        typicalLeadDays: 30,
    },
    {
        name: 'Shenzhen Elite Electronics Ltd',
        slug: 'shenzhen-elite-electronics',
        description: 'Full-service electronics manufacturer with PCB assembly, injection molding, and final assembly capabilities. Specializes in consumer electronics and IoT devices.',
        website: 'https://example.com/elite-electronics',
        countryCode: 'CN',
        countryName: 'China',
        region: 'Guangdong',
        city: 'Shenzhen',
        productCategories: ['Electronics', 'Consumer Electronics', 'IoT Devices'],
        htsChapters: ['84', '85', '90'],
        materials: ['PCB', 'Plastic', 'Aluminum', 'ABS'],
        employeeCount: 'ENTERPRISE',
        yearEstablished: 2005,
        annualRevenue: 'FIFTY_TO_100M',
        exportPercentage: 70,
        certifications: ['ISO 9001', 'ISO 14001', 'UL Listed', 'CE', 'FCC'],
        isVerified: true,
        tier: 'PREMIUM',
        reliabilityScore: 95,
        qualityScore: 92,
        communicationScore: 88,
        costTier: 'MEDIUM',
        minOrderValue: 10000,
        typicalLeadDays: 45,
    },
    {
        name: 'Ningbo Homeware Factory',
        slug: 'ningbo-homeware',
        description: 'Established housewares manufacturer producing kitchenware, storage solutions, and home organization products. Strong focus on sustainable materials.',
        countryCode: 'CN',
        countryName: 'China',
        region: 'Zhejiang',
        city: 'Ningbo',
        productCategories: ['Housewares', 'Kitchen', 'Home Organization'],
        htsChapters: ['39', '73', '94'],
        materials: ['Plastic', 'Stainless Steel', 'Bamboo', 'Silicone'],
        employeeCount: 'MEDIUM',
        yearEstablished: 2012,
        annualRevenue: 'ONE_TO_10M',
        exportPercentage: 90,
        certifications: ['ISO 9001', 'FDA Approved', 'BPA Free'],
        isVerified: true,
        tier: 'VERIFIED',
        reliabilityScore: 88,
        qualityScore: 85,
        communicationScore: 82,
        costTier: 'LOW',
        minOrderValue: 3000,
        typicalLeadDays: 25,
    },

    // === VIETNAM ===
    {
        name: 'Viet-Style Garment Co., Ltd',
        slug: 'viet-style-garment',
        description: 'Sustainable production facility focusing on organic materials and eco-friendly manufacturing. GOTS certified with specialization in activewear and casual apparel.',
        countryCode: 'VN',
        countryName: 'Vietnam',
        region: 'Ho Chi Minh City',
        city: 'District 7',
        productCategories: ['Apparel', 'Activewear', 'Sustainable Fashion'],
        htsChapters: ['61', '62'],
        materials: ['Organic Cotton', 'Recycled Polyester', 'Bamboo Fiber'],
        employeeCount: 'MEDIUM',
        yearEstablished: 2015,
        annualRevenue: 'ONE_TO_10M',
        exportPercentage: 95,
        certifications: ['GOTS', 'GRS', 'BSCI', 'SA8000'],
        isVerified: true,
        tier: 'VERIFIED',
        reliabilityScore: 90,
        qualityScore: 88,
        communicationScore: 92,
        costTier: 'LOW',
        minOrderValue: 5000,
        typicalLeadDays: 35,
    },
    {
        name: 'Hanoi Footwear Industries',
        slug: 'hanoi-footwear',
        description: 'Specialized footwear manufacturer producing athletic shoes, casual footwear, and sandals. Partner to major global brands with excellent quality control.',
        countryCode: 'VN',
        countryName: 'Vietnam',
        region: 'Ha Noi',
        city: 'Long Bien',
        productCategories: ['Footwear', 'Athletic Shoes', 'Sandals'],
        htsChapters: ['64'],
        materials: ['Leather', 'Synthetic', 'Rubber', 'EVA', 'Mesh'],
        employeeCount: 'LARGE',
        yearEstablished: 2010,
        annualRevenue: 'TEN_TO_50M',
        exportPercentage: 80,
        certifications: ['ISO 9001', 'BSCI', 'LWG'],
        isVerified: true,
        tier: 'VERIFIED',
        reliabilityScore: 88,
        qualityScore: 90,
        communicationScore: 85,
        costTier: 'LOW',
        minOrderValue: 8000,
        typicalLeadDays: 40,
    },

    // === MEXICO ===
    {
        name: 'Monterrey Precision Parts SA de CV',
        slug: 'monterrey-precision',
        description: 'Precision metal and plastic components manufacturer serving automotive and industrial markets. IATF 16949 certified with quick turnaround times.',
        countryCode: 'MX',
        countryName: 'Mexico',
        region: 'Nuevo León',
        city: 'Monterrey',
        productCategories: ['Auto Parts', 'Industrial Components', 'Metal Fabrication'],
        htsChapters: ['73', '84', '87'],
        materials: ['Steel', 'Aluminum', 'ABS', 'Nylon'],
        employeeCount: 'MEDIUM',
        yearEstablished: 2003,
        annualRevenue: 'TEN_TO_50M',
        exportPercentage: 75,
        certifications: ['IATF 16949', 'ISO 9001', 'ISO 14001'],
        isVerified: true,
        tier: 'PREMIUM',
        reliabilityScore: 94,
        qualityScore: 92,
        communicationScore: 95,
        costTier: 'MEDIUM',
        minOrderValue: 10000,
        typicalLeadDays: 14,
    },
    {
        name: 'Tijuana Medical Devices LLC',
        slug: 'tijuana-medical',
        description: 'FDA-registered manufacturer of medical devices and disposables. Class I and II device manufacturing with cleanroom facilities.',
        countryCode: 'MX',
        countryName: 'Mexico',
        region: 'Baja California',
        city: 'Tijuana',
        productCategories: ['Medical Devices', 'Healthcare', 'Disposables'],
        htsChapters: ['90', '40', '39'],
        materials: ['Medical-Grade Plastic', 'Silicone', 'Stainless Steel'],
        employeeCount: 'LARGE',
        yearEstablished: 2008,
        annualRevenue: 'FIFTY_TO_100M',
        exportPercentage: 90,
        certifications: ['FDA Registered', 'ISO 13485', 'ISO 14001'],
        isVerified: true,
        tier: 'PREMIUM',
        reliabilityScore: 96,
        qualityScore: 95,
        communicationScore: 93,
        costTier: 'MEDIUM',
        minOrderValue: 25000,
        typicalLeadDays: 21,
    },

    // === INDIA ===
    {
        name: 'Mumbai Textiles & Apparel Pvt Ltd',
        slug: 'mumbai-textiles',
        description: 'Vertically integrated textile company from fiber to finished garment. Specializes in traditional and contemporary Indian textiles with modern quality standards.',
        countryCode: 'IN',
        countryName: 'India',
        region: 'Maharashtra',
        city: 'Mumbai',
        productCategories: ['Apparel', 'Textiles', 'Home Textiles'],
        htsChapters: ['52', '61', '62', '63'],
        materials: ['Cotton', 'Silk', 'Linen', 'Wool'],
        employeeCount: 'LARGE',
        yearEstablished: 1998,
        annualRevenue: 'TEN_TO_50M',
        exportPercentage: 60,
        certifications: ['ISO 9001', 'GOTS', 'Fair Trade'],
        isVerified: true,
        tier: 'VERIFIED',
        reliabilityScore: 85,
        qualityScore: 88,
        communicationScore: 80,
        costTier: 'LOW',
        minOrderValue: 3000,
        typicalLeadDays: 45,
    },
    {
        name: 'Chennai Leather Works',
        slug: 'chennai-leather',
        description: 'Traditional leather goods manufacturer producing bags, belts, and accessories. Uses vegetable-tanned leather with focus on handcrafted quality.',
        countryCode: 'IN',
        countryName: 'India',
        region: 'Tamil Nadu',
        city: 'Chennai',
        productCategories: ['Leather Goods', 'Bags', 'Accessories'],
        htsChapters: ['42'],
        materials: ['Genuine Leather', 'Vegan Leather', 'Canvas'],
        employeeCount: 'MEDIUM',
        yearEstablished: 2005,
        annualRevenue: 'ONE_TO_10M',
        exportPercentage: 70,
        certifications: ['LWG', 'ISO 9001', 'SEDEX'],
        isVerified: true,
        tier: 'VERIFIED',
        reliabilityScore: 82,
        qualityScore: 90,
        communicationScore: 78,
        costTier: 'LOW',
        minOrderValue: 2000,
        typicalLeadDays: 35,
    },

    // === TURKEY ===
    {
        name: 'Ankara Textiles Ltd',
        slug: 'ankara-textiles',
        description: 'Premium textile mill supplying major European brands. Specializes in denim, twill, and structured fabrics with advanced finishing capabilities.',
        countryCode: 'TR',
        countryName: 'Turkey',
        region: 'Ankara',
        city: 'Ankara',
        productCategories: ['Textiles', 'Denim', 'Apparel'],
        htsChapters: ['52', '54', '61', '62'],
        materials: ['Cotton', 'Denim', 'Twill', 'Wool Blend'],
        employeeCount: 'LARGE',
        yearEstablished: 1995,
        annualRevenue: 'FIFTY_TO_100M',
        exportPercentage: 80,
        certifications: ['ISO 9001', 'Oeko-Tex', 'GOTS', 'BCI'],
        isVerified: true,
        tier: 'PREMIUM',
        reliabilityScore: 90,
        qualityScore: 92,
        communicationScore: 88,
        costTier: 'MEDIUM',
        minOrderValue: 15000,
        typicalLeadDays: 28,
    },

    // === GERMANY ===
    {
        name: 'Stuttgart Precision GmbH',
        slug: 'stuttgart-precision',
        description: 'High-precision engineering components for automotive and aerospace industries. German engineering excellence with Industry 4.0 manufacturing.',
        countryCode: 'DE',
        countryName: 'Germany',
        region: 'Baden-Württemberg',
        city: 'Stuttgart',
        productCategories: ['Precision Parts', 'Automotive', 'Aerospace'],
        htsChapters: ['73', '84', '87', '88'],
        materials: ['Titanium', 'Aluminum Alloy', 'Steel', 'Carbon Fiber'],
        employeeCount: 'MEDIUM',
        yearEstablished: 1985,
        annualRevenue: 'TEN_TO_50M',
        exportPercentage: 65,
        certifications: ['IATF 16949', 'AS9100', 'ISO 9001', 'ISO 14001'],
        isVerified: true,
        tier: 'PREMIUM',
        reliabilityScore: 98,
        qualityScore: 98,
        communicationScore: 95,
        costTier: 'HIGH',
        minOrderValue: 50000,
        typicalLeadDays: 35,
    },
];

async function seedSuppliers() {
    console.log('Seeding suppliers...');

    for (const supplier of SUPPLIERS) {
        const overallScore = (
            supplier.reliabilityScore * 0.35 +
            supplier.qualityScore * 0.35 +
            supplier.communicationScore * 0.30
        );

        await prisma.supplier.upsert({
            where: { slug: supplier.slug },
            update: {
                name: supplier.name,
                description: supplier.description,
                website: supplier.website,
                countryCode: supplier.countryCode,
                countryName: supplier.countryName,
                region: supplier.region,
                city: supplier.city,
                productCategories: supplier.productCategories,
                htsChapters: supplier.htsChapters,
                materials: supplier.materials,
                employeeCount: supplier.employeeCount,
                yearEstablished: supplier.yearEstablished,
                annualRevenue: supplier.annualRevenue,
                exportPercentage: supplier.exportPercentage,
                certifications: supplier.certifications,
                isVerified: supplier.isVerified,
                tier: supplier.tier,
                reliabilityScore: supplier.reliabilityScore,
                qualityScore: supplier.qualityScore,
                communicationScore: supplier.communicationScore,
                overallScore,
                costTier: supplier.costTier,
                minOrderValue: supplier.minOrderValue,
                typicalLeadDays: supplier.typicalLeadDays,
            },
            create: {
                name: supplier.name,
                slug: supplier.slug,
                description: supplier.description,
                website: supplier.website,
                countryCode: supplier.countryCode,
                countryName: supplier.countryName,
                region: supplier.region,
                city: supplier.city,
                productCategories: supplier.productCategories,
                htsChapters: supplier.htsChapters,
                materials: supplier.materials,
                employeeCount: supplier.employeeCount,
                yearEstablished: supplier.yearEstablished,
                annualRevenue: supplier.annualRevenue,
                exportPercentage: supplier.exportPercentage,
                certifications: supplier.certifications,
                isVerified: supplier.isVerified,
                tier: supplier.tier,
                reliabilityScore: supplier.reliabilityScore,
                qualityScore: supplier.qualityScore,
                communicationScore: supplier.communicationScore,
                overallScore,
                costTier: supplier.costTier,
                minOrderValue: supplier.minOrderValue,
                typicalLeadDays: supplier.typicalLeadDays,
            },
        });

        console.log(`  ✓ ${supplier.name} (${supplier.countryName})`);
    }

    console.log(`\nSeeded ${SUPPLIERS.length} suppliers.`);
}

// Run if executed directly
seedSuppliers()
    .catch(console.error)
    .finally(() => prisma.$disconnect());






