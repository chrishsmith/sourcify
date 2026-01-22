/**
 * ADD/CVD (Antidumping & Countervailing Duty) Lookup API
 * 
 * GET /api/adcvd
 *   Query params:
 *     - htsCode: HTS code to check (any length)
 *     - countryCode: Country of origin filter
 *     - search: Product name/description search
 *   
 *   Returns all matching ADD/CVD orders and risk assessment
 */

import { NextResponse } from 'next/server';
import { checkADCVDWarning, getAllADCVDOrders, getADCVDOrdersByCountry, getADCVDOrdersByHTS, type ADCVDOrderInfo } from '@/data/adcvdOrders';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    
    const htsCode = searchParams.get('htsCode')?.trim();
    const countryCode = searchParams.get('countryCode')?.trim().toUpperCase();
    const search = searchParams.get('search')?.trim().toLowerCase();
    
    try {
        let orders: ADCVDOrderInfo[] = [];
        let warning = null;
        let riskLevel: 'high' | 'medium' | 'low' | 'none' = 'none';
        
        // If HTS code provided, get specific orders and warning
        if (htsCode) {
            const cleanHts = htsCode.replace(/\./g, '');
            orders = getADCVDOrdersByHTS(cleanHts);
            
            // Get warning for the specific HTS and country combination
            const warningResult = checkADCVDWarning(cleanHts, countryCode);
            warning = warningResult.warning;
            
            // Determine risk level based on HTS chapter
            const chapter = cleanHts.substring(0, 2);
            const highRiskChapters = ['72', '73']; // Iron & Steel
            const mediumRiskChapters = ['76', '85', '40', '44', '48']; // Aluminum, Electrical, Rubber, Wood, Paper
            
            if (highRiskChapters.includes(chapter)) {
                riskLevel = 'high';
            } else if (mediumRiskChapters.includes(chapter)) {
                riskLevel = 'medium';
            } else if (orders.length > 0) {
                riskLevel = 'low';
            }
        } else if (countryCode) {
            // If only country code, get all orders for that country
            orders = getADCVDOrdersByCountry(countryCode);
        } else {
            // Return all orders
            orders = getAllADCVDOrders();
        }
        
        // Apply search filter if provided
        if (search && orders.length > 0) {
            orders = orders.filter(order => 
                order.productCategory.toLowerCase().includes(search) ||
                order.htsPrefix.includes(search)
            );
        }
        
        // If country filter provided, filter orders to those affecting that country
        if (countryCode && !htsCode) {
            // Already filtered by getADCVDOrdersByCountry
        } else if (countryCode && orders.length > 0) {
            orders = orders.filter(order => 
                order.commonCountries.includes(countryCode)
            );
        }
        
        // Calculate totals
        const totalOrders = orders.reduce((sum, order) => sum + order.orderCount, 0);
        const affectedCountries = [...new Set(orders.flatMap(o => o.commonCountries))];
        const isCountryAffected = countryCode ? 
            orders.some(o => o.commonCountries.includes(countryCode)) : false;
        
        return NextResponse.json({
            success: true,
            data: {
                orders,
                warning,
                riskLevel,
                summary: {
                    totalOrders,
                    matchedPrefixes: orders.length,
                    affectedCountries,
                    isCountryAffected,
                },
                resources: {
                    cbpLookup: 'https://aceservices.cbp.dhs.gov/adcvdweb',
                    itcOrders: 'https://www.usitc.gov/trade_remedy/documents/orders.xls',
                    itaSearch: 'https://www.trade.gov/data-visualization/adcvd-orders-searchable-database',
                },
            },
            filters: {
                htsCode: htsCode || null,
                countryCode: countryCode || null,
                search: search || null,
            },
        });
    } catch (error) {
        console.error('[ADCVD API] Error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch ADD/CVD data' },
            { status: 500 }
        );
    }
}
