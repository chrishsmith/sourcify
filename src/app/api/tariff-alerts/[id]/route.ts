/**
 * Individual Tariff Alert API
 * GET - Get alert details with events
 * PATCH - Update alert settings
 * DELETE - Delete alert
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
    getAlertDetail,
    updateAlert,
    deleteAlert,
} from '@/services/tariffAlerts';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const alert = await getAlertDetail(id, session.user.id);

        if (!alert) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        return NextResponse.json(alert);
    } catch (error) {
        console.error('[API] Get alert detail error:', error);
        return NextResponse.json({ error: 'Failed to fetch alert' }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();

        const updated = await updateAlert(id, session.user.id, {
            alertType: body.alertType,
            threshold: body.threshold,
            isActive: body.isActive,
        });

        if (!updated) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Update alert error:', error);
        return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const deleted = await deleteAlert(id, session.user.id);

        if (!deleted) {
            return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Delete alert error:', error);
        return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
    }
}



