/**
 * USITC DataWeb API Service
 * 
 * Fetches REAL import statistics from the official USITC DataWeb API.
 * API Docs: https://www.usitc.gov/applications/dataweb/api/dataweb_query_api.html
 * 
 * Base URL: https://datawebws.usitc.gov/dataweb
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * IMPORTANT: DATA SOURCE LIMITATIONS (December 2025)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This API provides:
 * ✅ Import VOLUME statistics (how much was imported)
 * ✅ Import VALUE statistics (customs value in USD)
 * ✅ Country of origin breakdown
 * ✅ Quantity units
 * 
 * This API does NOT provide:
 * ❌ Actual tariff rates paid
 * ❌ Section 301 / IEEPA / Section 232 duty amounts
 * ❌ FTA preferences applied
 * ❌ Chapter 99 additional duties
 * 
 * For accurate tariff calculations, we combine this data with:
 * - USITC HTS API (base MFN rates)
 * - Chapter 99 lookups (additional duties)
 * - Our tariffPrograms.ts database (current trade policy)
 * 
 * CRITICAL: As of April 2025, the tariff landscape has changed significantly:
 * - Universal 10% IEEPA baseline applies to NEARLY ALL imports
 * - Even FTA partners (Singapore, Korea, etc.) face this 10%
 * - Only USMCA (MX/CA) may have exemptions for compliant goods
 * - China faces 145%+ total additional duties
 * 
 * Always use calculateEffectiveTariff() from landedCost.ts or
 * calculateEffectiveTariff() from additionalDuties.ts for accurate rates.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const DATAWEB_API_BASE = 'https://datawebws.usitc.gov/dataweb';

interface ImportStatsByCountry {
    countryCode: string;
    countryName: string;
    totalValue: number;
    totalQuantity: number;
    quantityUnit: string;
    avgUnitValue: number;
    shipmentCount: number;
    dataYears: number[];
}

interface DataWebRow {
    country: string;
    quantityDesc: string;
    year2023: number;
    year2024: number;
}

/**
 * Build the full query object matching USITC DataWeb's expected format
 * From: https://www.usitc.gov/applications/dataweb/api/dataweb_query_api.html
 */
function buildDataWebQuery(htsCode: string, years: number[], dataType: string = 'CONS_FIR_UNIT_QUANT') {
    const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
    
    return {
        savedQueryName: "",
        savedQueryDesc: "",
        isOwner: true,
        runMonthly: false,
        reportOptions: {
            tradeType: "Import",
            classificationSystem: "HTS"
        },
        searchOptions: {
            MiscGroup: {
                districts: {
                    aggregation: "Aggregate District",
                    districtGroups: { userGroups: [] },
                    districts: [],
                    districtsExpanded: [{ name: "All Districts", value: "all" }],
                    districtsSelectType: "all"
                },
                importPrograms: {
                    aggregation: null,
                    importPrograms: [],
                    programsSelectType: "all"
                },
                extImportPrograms: {
                    aggregation: "Aggregate CSC",
                    extImportPrograms: [],
                    extImportProgramsExpanded: [],
                    programsSelectType: "all"
                },
                provisionCodes: {
                    aggregation: "Aggregate RPCODE",
                    provisionCodesSelectType: "all",
                    rateProvisionCodes: [],
                    rateProvisionCodesExpanded: []
                }
            },
            commodities: {
                aggregation: "Individual Commodities",
                codeDisplayFormat: "YES",
                commodities: [hts6],
                commoditiesExpanded: [{ name: hts6, value: hts6 }],
                commoditiesManual: "",
                commodityGroups: { systemGroups: [], userGroups: [] },
                commoditySelectType: "list",
                granularity: "6",  // 6-digit HTS
                groupGranularity: null,
                searchGranularity: null
            },
            componentSettings: {
                // CONS_FIR_UNIT_QUANT = First Unit of Quantity
                // CONS_CIF_VALUE = CIF Value (includes freight)
                // CONS_CUSTOMS_VALUE = Customs Value
                // CONS_CHARGES = Charges
                dataToReport: [dataType],
                scale: "1",
                timeframeSelectType: "fullYears",
                years: years.map(String),
                startDate: null,
                endDate: null,
                startMonth: null,
                endMonth: null,
                yearsTimeline: "Annual"
            },
            countries: {
                aggregation: "Break Out Countries",  // Key: this breaks data out by country!
                countries: [],
                countriesExpanded: [{ name: "All Countries", value: "all" }],
                countriesSelectType: "all",
                countryGroups: { systemGroups: [], userGroups: [] }
            }
        },
        sortingAndDataFormat: {
            DataSort: {
                columnOrder: [],
                fullColumnOrder: [],
                sortOrder: []
            },
            reportCustomizations: {
                exportCombineTables: false,
                showAllSubtotal: true,
                subtotalRecords: "",
                totalRecords: "20000",
                exportRawData: false
            }
        }
    };
}

/**
 * Parse the DataWeb response into usable data
 */
function parseDataWebResponse(responseData: any, years: number[]): DataWebRow[] {
    const results: DataWebRow[] = [];
    
    try {
        const tables = responseData?.dto?.tables || [];
        if (tables.length === 0) {
            console.log('[DataWeb] No tables in response');
            return results;
        }
        
        const rowGroups = tables[0]?.row_groups || [];
        if (rowGroups.length === 0) {
            console.log('[DataWeb] No row groups in response');
            return results;
        }
        
        const rows = rowGroups[0]?.rowsNew || [];
        console.log('[DataWeb] Found', rows.length, 'data rows');
        
        // Debug first row structure
        if (rows.length > 0 && rows[0]?.rowEntries) {
            console.log('[DataWeb] First row columns:', rows[0].rowEntries.length);
            console.log('[DataWeb] First row sample:', rows[0].rowEntries.slice(0, 5).map((e: any) => e?.value));
        }
        
        for (const row of rows) {
            const entries = row.rowEntries || [];
            if (entries.length >= 2) {
                const country = entries[0]?.value || '';
                
                // Parse numeric values (remove commas, handle decimals)
                const parseNum = (val: string) => {
                    if (!val || val === '' || val === 'X' || val === 'D') return 0;
                    // Handle values like "1,234" or "1234.56"
                    return parseFloat(val.replace(/,/g, '')) || 0;
                };
                
                // Column structure varies by query type:
                // QUANTITY: [Country, Unit, Year1, Year2, ...]
                // VALUE: [Country, Year1, Year2, ...] (no unit column)
                let quantityDesc = '';
                let year1 = 0;
                let year2 = 0;
                
                if (entries.length >= 4) {
                    // Has unit description column (QUANTITY query)
                    quantityDesc = entries[1]?.value || '';
                    year1 = parseNum(entries[2]?.value);
                    year2 = parseNum(entries[3]?.value);
                } else if (entries.length >= 3) {
                    // No unit column (VALUE query)
                    year1 = parseNum(entries[1]?.value);
                    year2 = parseNum(entries[2]?.value);
                } else if (entries.length === 2) {
                    // Single year data
                    year1 = parseNum(entries[1]?.value);
                }
                
                if (country && (year1 > 0 || year2 > 0)) {
                    results.push({
                        country,
                        quantityDesc,
                        year2023: year1,  // First year in query
                        year2024: year2,  // Second year in query
                    });
                }
            }
        }
    } catch (error) {
        console.error('[DataWeb] Error parsing response:', error);
    }
    
    return results;
}

/**
 * Map DataWeb country names to ISO codes
 * Includes comprehensive list of trading partners
 */
function mapCountryToCode(countryName: string): string | null {
    const mapping: Record<string, string> = {
        // Major Asian manufacturing
        'China': 'CN',
        'Vietnam': 'VN',
        'India': 'IN',
        'Bangladesh': 'BD',
        'Thailand': 'TH',
        'Indonesia': 'ID',
        'Japan': 'JP',
        'South Korea': 'KR',
        'Korea, South': 'KR',
        'Korea': 'KR',
        'Taiwan': 'TW',
        'Malaysia': 'MY',
        'Philippines': 'PH',
        'Pakistan': 'PK',
        'Cambodia': 'KH',
        'Sri Lanka': 'LK',
        'Myanmar (Burma)': 'MM',
        'Myanmar': 'MM',
        'Singapore': 'SG',
        'Hong Kong': 'HK',
        'Laos': 'LA',
        'Nepal': 'NP',
        'Mongolia': 'MN',
        
        // North America (USMCA)
        'Mexico': 'MX',
        'Canada': 'CA',
        
        // Europe
        'Germany': 'DE',
        'Italy': 'IT',
        'France': 'FR',
        'Spain': 'ES',
        'Netherlands': 'NL',
        'Belgium': 'BE',
        'United Kingdom': 'GB',
        'Poland': 'PL',
        'Romania': 'RO',
        'Ireland': 'IE',
        'Sweden': 'SE',
        'Switzerland': 'CH',
        'Denmark': 'DK',
        'Norway': 'NO',
        'Finland': 'FI',
        'Austria': 'AT',
        'Czechia (Czech Republic)': 'CZ',
        'Czech Republic': 'CZ',
        'Czechia': 'CZ',
        'Hungary': 'HU',
        'Portugal': 'PT',
        'Greece': 'GR',
        'Bulgaria': 'BG',
        'Slovakia': 'SK',
        'Slovenia': 'SI',
        'Croatia': 'HR',
        'Lithuania': 'LT',
        'Latvia': 'LV',
        'Estonia': 'EE',
        'Luxembourg': 'LU',
        'Malta': 'MT',
        'Cyprus': 'CY',
        'Albania': 'AL',
        'Serbia': 'RS',
        'Bosnia and Herzegovina': 'BA',
        'North Macedonia': 'MK',
        'Montenegro': 'ME',
        'Kosovo': 'XK',
        'Moldova': 'MD',
        'Belarus': 'BY',
        'Ukraine': 'UA',
        'Russia': 'RU',
        
        // Turkey
        'Turkey': 'TR',
        'Turkiye': 'TR',
        
        // Middle East
        'United Arab Emirates': 'AE',
        'Saudi Arabia': 'SA',
        'Israel': 'IL',
        'Jordan': 'JO',
        'Kuwait': 'KW',
        'Qatar': 'QA',
        'Bahrain': 'BH',
        'Oman': 'OM',
        'Lebanon': 'LB',
        'Iran': 'IR',
        'Iraq': 'IQ',
        
        // Africa
        'South Africa': 'ZA',
        'Morocco': 'MA',
        'Egypt': 'EG',
        'Tunisia': 'TN',
        'Kenya': 'KE',
        'Ethiopia': 'ET',
        'Nigeria': 'NG',
        'Ghana': 'GH',
        'Tanzania': 'TZ',
        'Mauritius': 'MU',
        'Madagascar': 'MG',
        'Lesotho': 'LS',
        'Swaziland': 'SZ',
        'Eswatini': 'SZ',
        'Cameroon': 'CM',
        
        // Latin America
        'Brazil': 'BR',
        'Argentina': 'AR',
        'Peru': 'PE',
        'Colombia': 'CO',
        'Chile': 'CL',
        'Ecuador': 'EC',
        'Dominican Republic': 'DO',
        'Honduras': 'HN',
        'Guatemala': 'GT',
        'El Salvador': 'SV',
        'Nicaragua': 'NI',
        'Costa Rica': 'CR',
        'Panama': 'PA',
        'Haiti': 'HT',
        'Jamaica': 'JM',
        'Trinidad and Tobago': 'TT',
        'Uruguay': 'UY',
        'Paraguay': 'PY',
        'Bolivia': 'BO',
        'Venezuela': 'VE',
        
        // Oceania
        'Australia': 'AU',
        'New Zealand': 'NZ',
        'Fiji': 'FJ',
        
        // Central Asia
        'Kazakhstan': 'KZ',
        'Uzbekistan': 'UZ',
        'Turkmenistan': 'TM',
        'Kyrgyzstan': 'KG',
        'Tajikistan': 'TJ',
        'Azerbaijan': 'AZ',
        'Georgia': 'GE',
        'Armenia': 'AM',
        'Afghanistan': 'AF',
        
        // Special characters / alternate spellings
        'Côte d`Ivoire': 'CI',
        "Côte d'Ivoire": 'CI',
        'Ivory Coast': 'CI',
        'New Caledonia': 'NC',
        'Syria': 'SY',
        'Syrian Arab Republic': 'SY',
        'Yemen': 'YE',
    };
    
    return mapping[countryName] || null;
}

/**
 * Query the USITC DataWeb API
 */
async function queryDataWeb(htsCode: string, years: number[], dataType: string = 'CONS_FIR_UNIT_QUANT'): Promise<any> {
    const apiKey = process.env.USITC_DATAWEB_API_KEY;
    
    if (!apiKey) {
        console.error('[DataWeb] No API key - set USITC_DATAWEB_API_KEY in .env.local');
        return null;
    }
    
    const queryBody = buildDataWebQuery(htsCode, years, dataType);
    
    console.log('[DataWeb] Querying HTS:', htsCode, 'Years:', years.join(', '), 'DataType:', dataType);
    
    try {
        const response = await fetch(`${DATAWEB_API_BASE}/api/v2/report2/runReport`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
            body: JSON.stringify(queryBody),
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[DataWeb] API error:', response.status, errorText.substring(0, 500));
            return null;
        }
        
        const data = await response.json();
        const errors = data?.dto?.errors || [];
        if (errors.length > 0) {
            console.error('[DataWeb] Query errors:', errors);
            return null;
        }
        
        console.log('[DataWeb] Response received, tables:', data?.dto?.tables?.length || 0);
        return data;
        
    } catch (error) {
        console.error('[DataWeb] Query failed:', error);
        return null;
    }
}

/**
 * Get import statistics for an HTS code by country
 * Queries REAL data from USITC DataWeb
 */
export async function getImportStatsByHTS(
    htsCode: string,
    options: {
        years?: number[];
        minQuantity?: number;
    } = {}
): Promise<ImportStatsByCountry[]> {
    // USITC has data through Sept 2025, full 2024 available
    // Pull current year + previous year for freshest data
    const years = options.years || [2025, 2024];
    const minQuantity = options.minQuantity || 1000;
    
    console.log(`[DataWeb] Fetching import stats for HTS ${htsCode}`);
    
    // Query quantity data
    const quantityResponse = await queryDataWeb(htsCode, years, 'CONS_FIR_UNIT_QUANT');
    if (!quantityResponse) {
        console.log('[DataWeb] No quantity response');
        return [];
    }
    
    const quantityData = parseDataWebResponse(quantityResponse, years);
    console.log('[DataWeb] Parsed', quantityData.length, 'quantity records');
    
    // Query customs value data
    const valueResponse = await queryDataWeb(htsCode, years, 'CONS_CUSTOMS_VALUE');
    console.log('[DataWeb] Value response tables:', valueResponse?.dto?.tables?.length || 0);
    const valueData = valueResponse ? parseDataWebResponse(valueResponse, years) : [];
    console.log('[DataWeb] Parsed value records:', valueData.length);
    
    // Create a map of country -> value
    const valueByCountry = new Map<string, { year2023: number; year2024: number }>();
    for (const row of valueData) {
        valueByCountry.set(row.country, { year2023: row.year2023, year2024: row.year2024 });
    }
    
    // Combine quantity and value data
    const stats: ImportStatsByCountry[] = [];
    
    // Debug: Log first few countries to understand data format
    console.log('[DataWeb] Sample quantity data:', quantityData.slice(0, 3).map(r => ({
        country: r.country,
        qty2023: r.year2023,
        qty2024: r.year2024,
    })));
    console.log('[DataWeb] Sample value data:', valueData.slice(0, 3).map(r => ({
        country: r.country,
        val2023: r.year2023,
        val2024: r.year2024,
    })));
    
    let unmappedCountries = 0;
    let lowQuantity = 0;
    let noValue = 0;
    let invalidAvg = 0;
    
    for (const qtyRow of quantityData) {
        const countryCode = mapCountryToCode(qtyRow.country);
        if (!countryCode) {
            unmappedCountries++;
            // Log first few unmapped
            if (unmappedCountries <= 5) {
                console.log('[DataWeb] Unmapped country:', qtyRow.country);
            }
            continue;
        }
        
        const totalQuantity = qtyRow.year2023 + qtyRow.year2024;
        if (totalQuantity < minQuantity) {
            lowQuantity++;
            continue;
        }
        
        const valueRow = valueByCountry.get(qtyRow.country);
        const totalValue = valueRow ? (valueRow.year2023 + valueRow.year2024) : 0;
        
        if (!valueRow) {
            noValue++;
            continue;
        }
        
        // Calculate average unit value (value / quantity)
        const avgUnitValue = totalQuantity > 0 && totalValue > 0
            ? totalValue / totalQuantity
            : 0;
        
        // Only include if we have reasonable unit values
        if (avgUnitValue > 0 && avgUnitValue < 10000) {
            stats.push({
                countryCode,
                countryName: qtyRow.country,
                totalValue: Math.round(totalValue),
                totalQuantity: Math.round(totalQuantity),
                quantityUnit: qtyRow.quantityDesc || 'units',
                avgUnitValue: Math.round(avgUnitValue * 100) / 100,
                shipmentCount: Math.ceil(totalQuantity / 10000), // Estimate
                dataYears: years,
            });
        } else {
            invalidAvg++;
        }
    }
    
    console.log('[DataWeb] Filter summary: unmapped=' + unmappedCountries + 
        ', lowQty=' + lowQuantity + ', noValue=' + noValue + ', invalidAvg=' + invalidAvg);
    
    // Sort by total value descending
    stats.sort((a, b) => b.totalValue - a.totalValue);
    
    console.log(`[DataWeb] Final: ${stats.length} countries with data`);
    return stats;
}

/**
 * Sync import stats to database
 */
export async function syncImportStatsToDatabase(
    htsCode: string,
    prisma: any
): Promise<{ synced: number; errors: number }> {
    const stats = await getImportStatsByHTS(htsCode);
    
    let synced = 0;
    let errors = 0;
    const hts6 = htsCode.replace(/\./g, '').substring(0, 6);
    
    for (const stat of stats) {
        try {
            // Fetch tariff data from the registry (no hardcoded rates!)
            const tariffData = await getTariffDataForCountry(htsCode, stat.countryCode, prisma);

            await prisma.htsCostByCountry.upsert({
                where: {
                    htsCode_countryCode: { htsCode: hts6, countryCode: stat.countryCode },
                },
                update: {
                    countryName: stat.countryName,
                    avgUnitValue: stat.avgUnitValue,
                    totalValue: stat.totalValue,
                    totalQuantity: stat.totalQuantity,
                    shipmentCount: stat.shipmentCount,
                    confidenceScore: calculateConfidence(stat),
                    lastCalculated: new Date(),
                },
                create: {
                    htsCode: hts6,
                    countryCode: stat.countryCode,
                    countryName: stat.countryName,
                    avgUnitValue: stat.avgUnitValue,
                    medianUnitValue: stat.avgUnitValue,
                    minUnitValue: stat.avgUnitValue * 0.7,
                    maxUnitValue: stat.avgUnitValue * 1.3,
                    totalValue: stat.totalValue,
                    totalQuantity: stat.totalQuantity,
                    shipmentCount: stat.shipmentCount,
                    baseTariffRate: tariffData.baseTariff,
                    section301Rate: tariffData.section301,
                    ieepaRate: tariffData.ieepa,
                    effectiveTariff: tariffData.effective,
                    hasFTA: tariffData.hasFTA,
                    ftaName: tariffData.ftaName,
                    ftaRate: tariffData.hasFTA ? 0 : null,
                    confidenceScore: calculateConfidence(stat),
                },
            });
            synced++;
        } catch (error) {
            console.error(`[DataWeb] Error syncing ${stat.countryCode}:`, error);
            errors++;
        }
    }
    
    console.log(`[DataWeb] Synced ${synced} countries, ${errors} errors`);
    return { synced, errors };
}

/**
 * Get tariff data for a country from the Tariff Registry
 * 
 * NO HARDCODED RATES - All data comes from the CountryTariffProfile table.
 * If no data exists in the registry, returns null values (tariffs should be 
 * populated via tariffRegistrySync.ts before this is needed).
 * 
 * @see services/tariffRegistry.ts - Single source of truth
 * @see services/tariffRegistrySync.ts - Populates the registry from APIs
 */
async function getTariffDataForCountry(htsCode: string, countryCode: string, prismaClient: any) {
    try {
        // Fetch from the tariff registry (single source of truth)
        const profile = await prismaClient.countryTariffProfile.findUnique({
            where: { countryCode },
        });
        
        if (profile) {
            return {
                baseTariff: profile.baseMfnRate || 0,
                section301: profile.section301DefaultRate || 0,
                ieepa: profile.totalAdditionalRate || 0,
                effective: (profile.baseMfnRate || 0) + (profile.totalAdditionalRate || 0),
                hasFTA: profile.hasFta || false,
                ftaName: profile.ftaName,
            };
        }
        
        // No profile found - return nulls, don't hardcode
        console.warn(`[DataWeb] No tariff profile found for ${countryCode}, using null values`);
        return {
            baseTariff: null,
            section301: null,
            ieepa: null,
            effective: null,
            hasFTA: false,
            ftaName: null,
        };
    } catch (error) {
        console.error(`[DataWeb] Error fetching tariff profile for ${countryCode}:`, error);
        return {
            baseTariff: null,
            section301: null,
            ieepa: null,
            effective: null,
            hasFTA: false,
            ftaName: null,
        };
    }
}

function calculateConfidence(stat: ImportStatsByCountry): number {
    let score = 50; // Base score for real API data
    if (stat.totalValue > 10000000) score += 20;
    else if (stat.totalValue > 1000000) score += 10;
    if (stat.totalQuantity > 1000000) score += 10;
    if (stat.dataYears.length >= 2) score += 10;
    return Math.min(95, score);
}

export { queryDataWeb, buildDataWebQuery };

