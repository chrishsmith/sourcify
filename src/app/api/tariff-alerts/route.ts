/**
 * Tariff Alerts API
 * GET - List user's alerts
 * POST - Create new alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
    getUserAlerts,
    createTariffAlert,
    getAlertStats,
} from '@/services/tariffAlerts';

export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('activeOnly') === 'true';
        const includeStats = searchParams.get('includeStats') === 'true';
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const { alerts, total } = await getUserAlerts(session.user.id, {
            activeOnly,
            limit,
            offset,
        });

        let stats = null;
        if (includeStats) {
            stats = await getAlertStats(session.user.id);
        }

        return NextResponse.json({
            alerts,
            total,
            limit,
            offset,
            ...(stats && { stats }),
        });
    } catch (error) {
        console.error('[API] Get alerts error:', error);
        return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.htsCode || body.currentRate === undefined) {
            return NextResponse.json(
                { error: 'htsCode and currentRate are required' },
                { status: 400 }
            );
        }

        const alertId = await createTariffAlert(session.user.id, {
            htsCode: body.htsCode,
            countryOfOrigin: body.countryOfOrigin,
            currentRate: body.currentRate,
            alertType: body.alertType,
            threshold: body.threshold,
            savedProductId: body.savedProductId,
            searchHistoryId: body.searchHistoryId,
        });

        return NextResponse.json({ id: alertId, success: true });
    } catch (error) {
        console.error('[API] Create alert error:', error);
        return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
    }
}



