/**
 * Country Manufacturing Cost Seed Data
 * 
 * This data powers the interactive global manufacturing map.
 * Costs are indexed relative to China = 100 for easy comparison.
 * 
 * Data sources:
 * - Labor costs: World Bank, ILO
 * - Tariff rates: USITC, USTR
 * - Quality scores: Trade publications, industry surveys
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CountryData {
    countryCode: string;
    countryName: string;
    laborCostIndex: number;       // China = 100
    overheadCostIndex: number;
    shippingCostIndex: number;
    typicalTransitDays: number;
    baseTariffRate: number;       // Avg MFN rate
    additionalDuties: number;     // Section 301, IEEPA, etc.
    hasFTA: boolean;
    ftaName?: string;
    politicalRiskScore: number;   // 0-100 (100 = stable)
    supplyChainRisk: number;      // 0-100 (100 = low risk)
    qualityReputation: number;    // 0-100 (100 = highest quality)
}

const COUNTRY_DATA: CountryData[] = [
    // === ASIA PACIFIC ===
    {
        countryCode: 'CN',
        countryName: 'China',
        laborCostIndex: 100,
        overheadCostIndex: 100,
        shippingCostIndex: 100,
        typicalTransitDays: 28,
        baseTariffRate: 4.5,
        additionalDuties: 45, // Section 301 + IEEPA
        hasFTA: false,
        politicalRiskScore: 65,
        supplyChainRisk: 60,
        qualityReputation: 75,
    },
    {
        countryCode: 'VN',
        countryName: 'Vietnam',
        laborCostIndex: 45,
        overheadCostIndex: 55,
        shippingCostIndex: 95,
        typicalTransitDays: 30,
        baseTariffRate: 4.5,
        additionalDuties: 20, // IEEPA only
        hasFTA: false,
        politicalRiskScore: 70,
        supplyChainRisk: 70,
        qualityReputation: 70,
    },
    {
        countryCode: 'IN',
        countryName: 'India',
        laborCostIndex: 35,
        overheadCostIndex: 50,
        shippingCostIndex: 110,
        typicalTransitDays: 35,
        baseTariffRate: 4.5,
        additionalDuties: 10, // Lower IEEPA reciprocal
        hasFTA: false,
        politicalRiskScore: 75,
        supplyChainRisk: 65,
        qualityReputation: 65,
    },
    {
        countryCode: 'TH',
        countryName: 'Thailand',
        laborCostIndex: 55,
        overheadCostIndex: 60,
        shippingCostIndex: 105,
        typicalTransitDays: 32,
        baseTariffRate: 4.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 68,
        supplyChainRisk: 72,
        qualityReputation: 72,
    },
    {
        countryCode: 'ID',
        countryName: 'Indonesia',
        laborCostIndex: 40,
        overheadCostIndex: 50,
        shippingCostIndex: 115,
        typicalTransitDays: 35,
        baseTariffRate: 4.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 70,
        supplyChainRisk: 65,
        qualityReputation: 60,
    },
    {
        countryCode: 'MY',
        countryName: 'Malaysia',
        laborCostIndex: 65,
        overheadCostIndex: 70,
        shippingCostIndex: 100,
        typicalTransitDays: 30,
        baseTariffRate: 4.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 78,
        supplyChainRisk: 78,
        qualityReputation: 75,
    },
    {
        countryCode: 'PH',
        countryName: 'Philippines',
        laborCostIndex: 38,
        overheadCostIndex: 48,
        shippingCostIndex: 110,
        typicalTransitDays: 28,
        baseTariffRate: 4.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 65,
        supplyChainRisk: 62,
        qualityReputation: 65,
    },
    {
        countryCode: 'BD',
        countryName: 'Bangladesh',
        laborCostIndex: 22,
        overheadCostIndex: 35,
        shippingCostIndex: 120,
        typicalTransitDays: 38,
        baseTariffRate: 4.5,
        additionalDuties: 5,
        hasFTA: false,
        politicalRiskScore: 55,
        supplyChainRisk: 50,
        qualityReputation: 55,
    },
    {
        countryCode: 'TW',
        countryName: 'Taiwan',
        laborCostIndex: 180,
        overheadCostIndex: 150,
        shippingCostIndex: 90,
        typicalTransitDays: 22,
        baseTariffRate: 4.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 72,
        supplyChainRisk: 80,
        qualityReputation: 90,
    },
    {
        countryCode: 'JP',
        countryName: 'Japan',
        laborCostIndex: 280,
        overheadCostIndex: 220,
        shippingCostIndex: 85,
        typicalTransitDays: 18,
        baseTariffRate: 2.0,
        additionalDuties: 0,
        hasFTA: false,
        politicalRiskScore: 95,
        supplyChainRisk: 92,
        qualityReputation: 95,
    },
    {
        countryCode: 'KR',
        countryName: 'South Korea',
        laborCostIndex: 240,
        overheadCostIndex: 200,
        shippingCostIndex: 88,
        typicalTransitDays: 20,
        baseTariffRate: 0,
        additionalDuties: 0,
        hasFTA: true,
        ftaName: 'KORUS FTA',
        politicalRiskScore: 88,
        supplyChainRisk: 90,
        qualityReputation: 90,
    },
    
    // === AMERICAS ===
    {
        countryCode: 'MX',
        countryName: 'Mexico',
        laborCostIndex: 75,
        overheadCostIndex: 80,
        shippingCostIndex: 35,
        typicalTransitDays: 5,
        baseTariffRate: 0,
        additionalDuties: 0,
        hasFTA: true,
        ftaName: 'USMCA',
        politicalRiskScore: 68,
        supplyChainRisk: 75,
        qualityReputation: 70,
    },
    {
        countryCode: 'CA',
        countryName: 'Canada',
        laborCostIndex: 220,
        overheadCostIndex: 180,
        shippingCostIndex: 25,
        typicalTransitDays: 3,
        baseTariffRate: 0,
        additionalDuties: 0,
        hasFTA: true,
        ftaName: 'USMCA',
        politicalRiskScore: 95,
        supplyChainRisk: 95,
        qualityReputation: 88,
    },
    {
        countryCode: 'BR',
        countryName: 'Brazil',
        laborCostIndex: 85,
        overheadCostIndex: 100,
        shippingCostIndex: 130,
        typicalTransitDays: 22,
        baseTariffRate: 4.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 60,
        supplyChainRisk: 58,
        qualityReputation: 65,
    },
    {
        countryCode: 'CO',
        countryName: 'Colombia',
        laborCostIndex: 48,
        overheadCostIndex: 55,
        shippingCostIndex: 85,
        typicalTransitDays: 12,
        baseTariffRate: 0,
        additionalDuties: 0,
        hasFTA: true,
        ftaName: 'Colombia TPA',
        politicalRiskScore: 62,
        supplyChainRisk: 60,
        qualityReputation: 62,
    },
    {
        countryCode: 'PE',
        countryName: 'Peru',
        laborCostIndex: 42,
        overheadCostIndex: 50,
        shippingCostIndex: 95,
        typicalTransitDays: 15,
        baseTariffRate: 0,
        additionalDuties: 0,
        hasFTA: true,
        ftaName: 'Peru TPA',
        politicalRiskScore: 60,
        supplyChainRisk: 58,
        qualityReputation: 60,
    },
    
    // === EUROPE ===
    {
        countryCode: 'DE',
        countryName: 'Germany',
        laborCostIndex: 350,
        overheadCostIndex: 280,
        shippingCostIndex: 70,
        typicalTransitDays: 18,
        baseTariffRate: 3.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 95,
        supplyChainRisk: 92,
        qualityReputation: 98,
    },
    {
        countryCode: 'IT',
        countryName: 'Italy',
        laborCostIndex: 280,
        overheadCostIndex: 240,
        shippingCostIndex: 75,
        typicalTransitDays: 20,
        baseTariffRate: 3.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 85,
        supplyChainRisk: 85,
        qualityReputation: 92,
    },
    {
        countryCode: 'PL',
        countryName: 'Poland',
        laborCostIndex: 120,
        overheadCostIndex: 100,
        shippingCostIndex: 80,
        typicalTransitDays: 22,
        baseTariffRate: 3.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 82,
        supplyChainRisk: 80,
        qualityReputation: 78,
    },
    {
        countryCode: 'GB',
        countryName: 'United Kingdom',
        laborCostIndex: 300,
        overheadCostIndex: 260,
        shippingCostIndex: 68,
        typicalTransitDays: 16,
        baseTariffRate: 3.0,
        additionalDuties: 0,
        hasFTA: false,
        politicalRiskScore: 90,
        supplyChainRisk: 88,
        qualityReputation: 88,
    },
    {
        countryCode: 'TR',
        countryName: 'Turkey',
        laborCostIndex: 70,
        overheadCostIndex: 75,
        shippingCostIndex: 82,
        typicalTransitDays: 20,
        baseTariffRate: 4.5,
        additionalDuties: 10,
        hasFTA: false,
        politicalRiskScore: 55,
        supplyChainRisk: 60,
        qualityReputation: 72,
    },
    
    // === AFRICA / MIDDLE EAST ===
    {
        countryCode: 'EG',
        countryName: 'Egypt',
        laborCostIndex: 30,
        overheadCostIndex: 40,
        shippingCostIndex: 90,
        typicalTransitDays: 28,
        baseTariffRate: 4.5,
        additionalDuties: 5,
        hasFTA: false,
        politicalRiskScore: 50,
        supplyChainRisk: 52,
        qualityReputation: 58,
    },
    {
        countryCode: 'MA',
        countryName: 'Morocco',
        laborCostIndex: 50,
        overheadCostIndex: 55,
        shippingCostIndex: 78,
        typicalTransitDays: 18,
        baseTariffRate: 0,
        additionalDuties: 0,
        hasFTA: true,
        ftaName: 'Morocco FTA',
        politicalRiskScore: 68,
        supplyChainRisk: 65,
        qualityReputation: 65,
    },
    {
        countryCode: 'ZA',
        countryName: 'South Africa',
        laborCostIndex: 55,
        overheadCostIndex: 65,
        shippingCostIndex: 140,
        typicalTransitDays: 28,
        baseTariffRate: 4.5,
        additionalDuties: 5,
        hasFTA: false,
        politicalRiskScore: 58,
        supplyChainRisk: 55,
        qualityReputation: 65,
    },
];

// Calculate overall cost score
function calculateOverallScore(data: CountryData): number {
    // Weights for different factors (sum = 1.0)
    const weights = {
        labor: 0.30,
        shipping: 0.15,
        tariff: 0.25,
        risk: 0.15,
        quality: 0.15,
    };

    // Normalize values (lower is better for costs, higher is better for quality/stability)
    const laborScore = 100 - Math.min(data.laborCostIndex, 100) / 3.5; // Max 350 → 0-100
    const shippingScore = 100 - Math.min(data.shippingCostIndex, 140) * 0.7;
    const tariffScore = 100 - (data.baseTariffRate + data.additionalDuties);
    const riskScore = (data.politicalRiskScore + data.supplyChainRisk) / 2;
    const qualityScore = data.qualityReputation;

    const overall = 
        laborScore * weights.labor +
        shippingScore * weights.shipping +
        tariffScore * weights.tariff +
        riskScore * weights.risk +
        qualityScore * weights.quality;

    return Math.round(overall * 10) / 10;
}

async function seedCountries() {
    console.log('Seeding country manufacturing costs...');

    for (const country of COUNTRY_DATA) {
        const overallScore = calculateOverallScore(country);

        await prisma.countryManufacturingCost.upsert({
            where: {
                countryCode_htsChapter: {
                    countryCode: country.countryCode,
                    htsChapter: null as unknown as string,
                },
            },
            update: {
                laborCostIndex: country.laborCostIndex,
                overheadCostIndex: country.overheadCostIndex,
                shippingCostIndex: country.shippingCostIndex,
                typicalTransitDays: country.typicalTransitDays,
                baseTariffRate: country.baseTariffRate,
                additionalDuties: country.additionalDuties,
                effectiveTariffRate: country.baseTariffRate + country.additionalDuties,
                hasFTA: country.hasFTA,
                ftaName: country.ftaName,
                politicalRiskScore: country.politicalRiskScore,
                supplyChainRisk: country.supplyChainRisk,
                qualityReputation: country.qualityReputation,
                overallCostScore: overallScore,
                lastUpdated: new Date(),
            },
            create: {
                countryCode: country.countryCode,
                countryName: country.countryName,
                htsChapter: null,
                laborCostIndex: country.laborCostIndex,
                overheadCostIndex: country.overheadCostIndex,
                shippingCostIndex: country.shippingCostIndex,
                typicalTransitDays: country.typicalTransitDays,
                baseTariffRate: country.baseTariffRate,
                additionalDuties: country.additionalDuties,
                effectiveTariffRate: country.baseTariffRate + country.additionalDuties,
                hasFTA: country.hasFTA,
                ftaName: country.ftaName,
                politicalRiskScore: country.politicalRiskScore,
                supplyChainRisk: country.supplyChainRisk,
                qualityReputation: country.qualityReputation,
                overallCostScore: overallScore,
            },
        });

        console.log(`  ✓ ${country.countryName} (Score: ${overallScore})`);
    }

    console.log(`\nSeeded ${COUNTRY_DATA.length} countries.`);
}

// Run if executed directly
seedCountries()
    .catch(console.error)
    .finally(() => prisma.$disconnect());





