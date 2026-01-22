/**
 * Tariff Alert Events API
 * 
 * GET /api/tariff-alerts/events - List alert events (notifications/history)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const alertId = searchParams.get('alertId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const whereClause: { alertId?: string; alert?: { userId: string } } = {};

    if (alertId) {
      whereClause.alertId = alertId;
    }

    if (userId) {
      whereClause.alert = { userId };
    }

    const events = await prisma.tariffAlertEvent.findMany({
      where: whereClause,
      include: {
        alert: {
          select: {
            id: true,
            htsCode: true,
            countryOfOrigin: true,
            savedProduct: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      events,
      count: events.length,
    });
  } catch (error) {
    console.error('Tariff alert events GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alert events' },
      { status: 500 }
    );
  }
}
