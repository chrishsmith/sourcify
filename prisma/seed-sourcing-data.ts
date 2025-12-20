/**
 * Seed Sourcing Intelligence Data
 * 
 * Seeds the database with:
 * - Simulated shipment records (BOL data)
 * - HTS cost aggregations
 * - Supplier verifications
 * 
 * Run: npx ts-node prisma/seed-sourcing-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// SHIPMENT DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface ShipmentSeed {
    htsCode: string;
    description: string;
    countries: Array<{
        code: string;
        name: string;
        avgPrice: number;      // Average unit price from this country
        priceVariation: number; // +/- variation %
        volumeWeight: number;   // Relative volume (1-10)
    }>;
}

const SHIPMENT_DATA: ShipmentSeed[] = [
    {
        htsCode: '392690',
        description: 'Other articles of plastics (ear plugs, etc.)',
        countries: [
            { code: 'CN', name: 'China', avgPrice: 0.12, priceVariation: 0.3, volumeWeight: 10 },
            { code: 'VN', name: 'Vietnam', avgPrice: 0.08, priceVariation: 0.25, volumeWeight: 6 },
            { code: 'MX', name: 'Mexico', avgPrice: 0.15, priceVariation: 0.2, volumeWeight: 4 },
            { code: 'TH', name: 'Thailand', avgPrice: 0.10, priceVariation: 0.25, volumeWeight: 3 },
            { code: 'IN', name: 'India', avgPrice: 0.07, priceVariation: 0.35, volumeWeight: 2 },
            { code: 'TW', name: 'Taiwan', avgPrice: 0.18, priceVariation: 0.15, volumeWeight: 2 },
        ],
    },
    {
        htsCode: '851830',
        description: 'Headphones and earphones',
        countries: [
            { code: 'CN', name: 'China', avgPrice: 8.50, priceVariation: 0.4, volumeWeight: 10 },
            { code: 'VN', name: 'Vietnam', avgPrice: 7.20, priceVariation: 0.35, volumeWeight: 5 },
            { code: 'TW', name: 'Taiwan', avgPrice: 12.00, priceVariation: 0.25, volumeWeight: 3 },
            { code: 'KR', name: 'South Korea', avgPrice: 15.00, priceVariation: 0.2, volumeWeight: 2 },
            { code: 'MX', name: 'Mexico', avgPrice: 9.50, priceVariation: 0.3, volumeWeight: 2 },
        ],
    },
    {
        htsCode: '610910',
        description: 'T-shirts of cotton, knitted',
        countries: [
            { code: 'BD', name: 'Bangladesh', avgPrice: 2.20, priceVariation: 0.25, volumeWeight: 10 },
            { code: 'VN', name: 'Vietnam', avgPrice: 2.80, priceVariation: 0.2, volumeWeight: 8 },
            { code: 'IN', name: 'India', avgPrice: 2.50, priceVariation: 0.3, volumeWeight: 6 },
            { code: 'CN', name: 'China', avgPrice: 3.20, priceVariation: 0.25, volumeWeight: 5 },
            { code: 'KH', name: 'Cambodia', avgPrice: 2.30, priceVariation: 0.25, volumeWeight: 4 },
            { code: 'PK', name: 'Pakistan', avgPrice: 2.10, priceVariation: 0.3, volumeWeight: 3 },
            { code: 'TR', name: 'Turkey', avgPrice: 3.80, priceVariation: 0.2, volumeWeight: 2 },
        ],
    },
    {
        htsCode: '640299',
        description: 'Footwear with rubber/plastic soles',
        countries: [
            { code: 'CN', name: 'China', avgPrice: 8.00, priceVariation: 0.4, volumeWeight: 10 },
            { code: 'VN', name: 'Vietnam', avgPrice: 7.50, priceVariation: 0.3, volumeWeight: 8 },
            { code: 'ID', name: 'Indonesia', avgPrice: 6.80, priceVariation: 0.35, volumeWeight: 5 },
            { code: 'IN', name: 'India', avgPrice: 5.50, priceVariation: 0.4, volumeWeight: 3 },
            { code: 'BR', name: 'Brazil', avgPrice: 9.00, priceVariation: 0.25, volumeWeight: 2 },
        ],
    },
    {
        htsCode: '847130',
        description: 'Portable digital data processing machines (laptops)',
        countries: [
            { code: 'CN', name: 'China', avgPrice: 320.00, priceVariation: 0.4, volumeWeight: 10 },
            { code: 'TW', name: 'Taiwan', avgPrice: 380.00, priceVariation: 0.25, volumeWeight: 4 },
            { code: 'MX', name: 'Mexico', avgPrice: 350.00, priceVariation: 0.2, volumeWeight: 3 },
            { code: 'VN', name: 'Vietnam', avgPrice: 290.00, priceVariation: 0.3, volumeWeight: 2 },
        ],
    },
    {
        htsCode: '940360',
        description: 'Wooden furniture',
        countries: [
            { code: 'CN', name: 'China', avgPrice: 85.00, priceVariation: 0.5, volumeWeight: 10 },
            { code: 'VN', name: 'Vietnam', avgPrice: 72.00, priceVariation: 0.35, volumeWeight: 7 },
            { code: 'MX', name: 'Mexico', avgPrice: 95.00, priceVariation: 0.25, volumeWeight: 4 },
            { code: 'ID', name: 'Indonesia', avgPrice: 65.00, priceVariation: 0.4, volumeWeight: 3 },
            { code: 'MY', name: 'Malaysia', avgPrice: 78.00, priceVariation: 0.3, volumeWeight: 2 },
            { code: 'PL', name: 'Poland', avgPrice: 120.00, priceVariation: 0.2, volumeWeight: 2 },
        ],
    },
    {
        htsCode: '950300',
        description: 'Toys',
        countries: [
            { code: 'CN', name: 'China', avgPrice: 3.50, priceVariation: 0.5, volumeWeight: 10 },
            { code: 'VN', name: 'Vietnam', avgPrice: 3.00, priceVariation: 0.4, volumeWeight: 4 },
            { code: 'MX', name: 'Mexico', avgPrice: 4.50, priceVariation: 0.3, volumeWeight: 3 },
            { code: 'TH', name: 'Thailand', avgPrice: 3.20, priceVariation: 0.35, volumeWeight: 2 },
        ],
    },
];

// Tariff rates by country
const TARIFF_DATA: Record<string, { base: number; section301: number; ieepa: number; fta?: string }> = {
    'CN': { base: 5.0, section301: 25.0, ieepa: 20.0 },
    'VN': { base: 5.0, section301: 0, ieepa: 10.0 },
    'IN': { base: 5.0, section301: 0, ieepa: 10.0 },
    'BD': { base: 5.0, section301: 0, ieepa: 5.0 },
    'TH': { base: 5.0, section301: 0, ieepa: 10.0 },
    'ID': { base: 5.0, section301: 0, ieepa: 10.0 },
    'MX': { base: 5.0, section301: 0, ieepa: 0, fta: 'USMCA' },
    'CA': { base: 5.0, section301: 0, ieepa: 0, fta: 'USMCA' },
    'KR': { base: 5.0, section301: 0, ieepa: 0, fta: 'KORUS FTA' },
    'TW': { base: 5.0, section301: 0, ieepa: 10.0 },
    'JP': { base: 5.0, section301: 0, ieepa: 0 },
    'DE': { base: 5.0, section301: 0, ieepa: 10.0 },
    'IT': { base: 5.0, section301: 0, ieepa: 10.0 },
    'TR': { base: 5.0, section301: 0, ieepa: 10.0 },
    'PL': { base: 5.0, section301: 0, ieepa: 10.0 },
    'BR': { base: 5.0, section301: 0, ieepa: 10.0 },
    'MY': { base: 5.0, section301: 0, ieepa: 10.0 },
    'PH': { base: 5.0, section301: 0, ieepa: 10.0 },
    'KH': { base: 5.0, section301: 0, ieepa: 5.0 },
    'PK': { base: 5.0, section301: 0, ieepa: 10.0 },
};

// US importers (fictional)
const IMPORTERS = [
    'ABC Trading Co', 'Global Imports LLC', 'American Supply Corp',
    'Continental Distributors', 'Pacific Rim Trading', 'Eastwest Commerce Inc',
    'Prime Wholesale Group', 'National Sourcing Partners', 'United Import Co',
    'Coast to Coast Trading', 'American Home Goods', 'Tech Import Solutions',
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function seedShipmentRecords() {
    console.log('Seeding shipment records...');
    
    let totalCreated = 0;
    
    for (const product of SHIPMENT_DATA) {
        for (const country of product.countries) {
            // Generate shipments based on volume weight
            const shipmentCount = country.volumeWeight * 15; // 15-150 shipments per country
            
            for (let i = 0; i < shipmentCount; i++) {
                // Randomize price within variation
                const priceVariation = 1 + (Math.random() * 2 - 1) * country.priceVariation;
                const unitPrice = country.avgPrice * priceVariation;
                
                // Randomize quantity (log-normal distribution)
                const quantity = Math.floor(Math.exp(Math.random() * 3 + 4)); // ~50 to ~8000
                const value = quantity * unitPrice;
                
                // Randomize date within last 12 months
                const arrivalDate = new Date();
                arrivalDate.setDate(arrivalDate.getDate() - Math.floor(Math.random() * 365));
                
                // Generate supplier name
                const supplierPrefixes: Record<string, string[]> = {
                    'CN': ['Shenzhen', 'Dongguan', 'Guangzhou', 'Ningbo', 'Shanghai'],
                    'VN': ['Viet', 'Hanoi', 'Saigon', 'Ho Chi Minh', 'Da Nang'],
                    'IN': ['Mumbai', 'Delhi', 'Chennai', 'Bangalore', 'Gujarat'],
                    'BD': ['Dhaka', 'Bengal', 'Chittagong', 'Gazipur', 'Delta'],
                    'TH': ['Bangkok', 'Thai', 'Siam', 'Eastern', 'Central'],
                    'MX': ['Monterrey', 'Guadalajara', 'Tijuana', 'Mexico', 'Norte'],
                    'ID': ['Jakarta', 'Java', 'Indo', 'Surabaya', 'Bandung'],
                    'TW': ['Taipei', 'Taiwan', 'Formosa', 'Kaohsiung', 'Taichung'],
                    'KR': ['Seoul', 'Korea', 'Busan', 'Incheon', 'Korean'],
                };
                
                const prefixes = supplierPrefixes[country.code] || [country.name];
                const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
                const suffix = ['Mfg', 'Industries', 'Trading', 'Export', 'Corp'][Math.floor(Math.random() * 5)];
                const shipperName = `${prefix} ${product.description.split(' ')[0]} ${suffix}`;
                
                try {
                    await prisma.shipmentRecord.create({
                        data: {
                            billOfLading: `BOL${product.htsCode}${country.code}${Date.now()}${i}`,
                            shipperName,
                            shipperCountry: country.code,
                            shipperAddress: `Industrial Zone, ${country.name}`,
                            consigneeName: IMPORTERS[Math.floor(Math.random() * IMPORTERS.length)],
                            consigneeAddress: 'USA',
                            htsCode: product.htsCode,
                            productDescription: product.description,
                            quantity,
                            quantityUnit: 'PCS',
                            declaredValue: Math.round(value * 100) / 100,
                            weight: quantity * 0.5,
                            weightUnit: 'KG',
                            portOfUnlading: ['Los Angeles', 'Long Beach', 'New York', 'Savannah'][Math.floor(Math.random() * 4)],
                            arrivalDate,
                            dataSource: 'seed',
                            sourceRecordId: `SEED${product.htsCode}${country.code}${i}`,
                            unitValue: Math.round(unitPrice * 100) / 100,
                        },
                    });
                    totalCreated++;
                } catch (e) {
                    // Skip duplicates
                }
            }
        }
    }
    
    console.log(`  Created ${totalCreated} shipment records`);
    return totalCreated;
}

async function seedHtsCostData() {
    console.log('Aggregating HTS costs by country...');
    
    let created = 0;
    
    for (const product of SHIPMENT_DATA) {
        for (const country of product.countries) {
            const tariff = TARIFF_DATA[country.code] || { base: 5, section301: 0, ieepa: 10 };
            const effectiveTariff = tariff.fta ? 0 : tariff.base + tariff.section301 + tariff.ieepa;
            
            try {
                await prisma.htsCostByCountry.upsert({
                    where: {
                        htsCode_countryCode: {
                            htsCode: product.htsCode,
                            countryCode: country.code,
                        },
                    },
                    update: {
                        avgUnitValue: country.avgPrice,
                        medianUnitValue: country.avgPrice,
                        minUnitValue: country.avgPrice * (1 - country.priceVariation),
                        maxUnitValue: country.avgPrice * (1 + country.priceVariation),
                        shipmentCount: country.volumeWeight * 15,
                        totalQuantity: country.volumeWeight * 15 * 500, // Estimated
                        totalValue: country.volumeWeight * 15 * 500 * country.avgPrice,
                        baseTariffRate: tariff.base,
                        section301Rate: tariff.section301,
                        ieepaRate: tariff.ieepa,
                        effectiveTariff,
                        hasFTA: !!tariff.fta,
                        ftaName: tariff.fta,
                        ftaRate: tariff.fta ? 0 : null,
                        confidenceScore: Math.min(95, 30 + country.volumeWeight * 6),
                        lastCalculated: new Date(),
                    },
                    create: {
                        htsCode: product.htsCode,
                        countryCode: country.code,
                        countryName: country.name,
                        avgUnitValue: country.avgPrice,
                        medianUnitValue: country.avgPrice,
                        minUnitValue: country.avgPrice * (1 - country.priceVariation),
                        maxUnitValue: country.avgPrice * (1 + country.priceVariation),
                        shipmentCount: country.volumeWeight * 15,
                        totalQuantity: country.volumeWeight * 15 * 500,
                        totalValue: country.volumeWeight * 15 * 500 * country.avgPrice,
                        baseTariffRate: tariff.base,
                        section301Rate: tariff.section301,
                        ieepaRate: tariff.ieepa,
                        effectiveTariff,
                        hasFTA: !!tariff.fta,
                        ftaName: tariff.fta,
                        ftaRate: tariff.fta ? 0 : null,
                        confidenceScore: Math.min(95, 30 + country.volumeWeight * 6),
                    },
                });
                created++;
            } catch (e) {
                console.error(`  Error creating cost data for ${product.htsCode}/${country.code}:`, e);
            }
        }
    }
    
    console.log(`  Created/updated ${created} HTS cost records`);
    return created;
}

async function seedSupplierVerifications() {
    console.log('Creating supplier verifications...');
    
    const suppliers = await prisma.supplier.findMany({
        select: { id: true, name: true, countryCode: true },
    });
    
    let created = 0;
    
    for (const supplier of suppliers) {
        // Check if supplier appears in shipments
        const shipmentCount = await prisma.shipmentRecord.count({
            where: {
                shipperCountry: supplier.countryCode,
                shipperName: { contains: supplier.name.split(' ')[0] },
            },
        });
        
        const score = Math.min(90, 20 + shipmentCount * 5 + Math.random() * 30);
        
        try {
            await prisma.supplierVerification.upsert({
                where: { supplierId: supplier.id },
                update: {
                    foundInBol: shipmentCount > 0,
                    bolShipmentCount: shipmentCount,
                    verificationScore: score,
                    verificationDate: new Date(),
                },
                create: {
                    supplierId: supplier.id,
                    foundInBol: shipmentCount > 0,
                    bolShipmentCount: shipmentCount,
                    foundInDirectory: Math.random() > 0.3,
                    directorySource: Math.random() > 0.5 ? 'thomasnet' : 'kompass',
                    verificationScore: score,
                    verificationDate: new Date(),
                },
            });
            created++;
        } catch (e) {
            // Skip errors
        }
    }
    
    console.log(`  Created/updated ${created} supplier verifications`);
    return created;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Seeding Sourcing Intelligence Data');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const shipments = await seedShipmentRecords();
    const costs = await seedHtsCostData();
    const verifications = await seedSupplierVerifications();
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('Seed Complete!');
    console.log(`  Shipment Records: ${shipments}`);
    console.log(`  HTS Cost Records: ${costs}`);
    console.log(`  Supplier Verifications: ${verifications}`);
    console.log('═══════════════════════════════════════════════════════════════');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
