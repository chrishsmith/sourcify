import { NextResponse } from 'next/server';
import {
    getAllFtaAgreements,
    getAllFtaRules,
    getRulesByHtsPrefix,
    getRulesByFta,
    getRuleForHtsAndFta,
    getFtasByCountry,
    hasUsaFta,
    type FtaRule,
    type FtaAgreement,
} from '@/data/ftaRules';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        const htsCode = searchParams.get('htsCode');
        const ftaCode = searchParams.get('ftaCode');
        const countryCode = searchParams.get('countryCode');
        const includeAgreements = searchParams.get('includeAgreements') === 'true';
        
        let rules: FtaRule[] = [];
        let agreements: FtaAgreement[] = [];
        let applicableFtas: FtaAgreement[] = [];
        
        // If HTS code provided, get rules for that code
        if (htsCode) {
            const cleanCode = htsCode.replace(/\./g, '');
            
            if (ftaCode) {
                // Get specific rule for HTS + FTA combination
                const rule = getRuleForHtsAndFta(cleanCode, ftaCode);
                rules = rule ? [rule] : [];
            } else {
                // Get all rules for this HTS code
                rules = getRulesByHtsPrefix(cleanCode);
            }
        } else if (ftaCode) {
            // Get all rules for a specific FTA
            rules = getRulesByFta(ftaCode);
        } else {
            // Return all rules
            rules = getAllFtaRules();
        }
        
        // If country code provided, check FTA eligibility
        if (countryCode) {
            applicableFtas = getFtasByCountry(countryCode);
            
            // Filter rules to only those from applicable FTAs if HTS code also provided
            if (htsCode && applicableFtas.length > 0) {
                const applicableFtaCodes = applicableFtas.map(fta => fta.code);
                rules = rules.filter(rule => applicableFtaCodes.includes(rule.ftaCode));
            }
        }
        
        // Include agreements info if requested
        if (includeAgreements) {
            agreements = getAllFtaAgreements();
        }
        
        // Build response
        const response = {
            success: true,
            data: {
                rules,
                ruleCount: rules.length,
                ...(countryCode && {
                    countryHasFta: hasUsaFta(countryCode),
                    applicableFtas,
                }),
                ...(includeAgreements && { agreements }),
            },
            filters: {
                htsCode: htsCode || null,
                ftaCode: ftaCode || null,
                countryCode: countryCode || null,
            },
            resources: {
                ustrFtas: 'https://ustr.gov/trade-agreements/free-trade-agreements',
                cbpFtas: 'https://www.cbp.gov/trade/free-trade-agreements',
                usitcHts: 'https://hts.usitc.gov/',
            },
        };
        
        return NextResponse.json(response);
    } catch (error) {
        console.error('Error in FTA rules API:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to fetch FTA rules',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
