/**
 * Tariff Alerts API
 * 
 * GET /api/tariff-alerts - List all alerts for the current user
 * POST /api/tariff-alerts - Create a new alert
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveTariff } from '@/services/tariffRegistry';

export async function GET(request: Request) {
  try {
    // In production, get userId from session
    // For now, we'll use a demo user or return sample data
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      // Return sample data for demo
      return NextResponse.json({
        success: true,
        alerts: [],
        message: 'No user ID provided - returning empty list',
      });
    }

    const alerts = await prisma.tariffAlert.findMany({
      where: { userId },
      include: {
        savedProduct: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      alerts,
    });
  } catch (error) {
    console.error('Tariff alerts GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { htsCode, countryOfOrigin, alertType, threshold, userId } = body;

    if (!htsCode) {
      return NextResponse.json(
        { success: false, error: 'HTS code is required' },
        { status: 400 }
      );
    }

    // Normalize HTS code
    const normalizedCode = htsCode.replace(/\./g, '');

    // Get current rate for the HTS code and country
    let originalRate = 0;
    try {
      const tariffInfo = await getEffectiveTariff(normalizedCode, countryOfOrigin || 'CN');
      originalRate = tariffInfo.effectiveRate || 0;
    } catch {
      // Default to 0 if we can't get the rate
      originalRate = 0;
    }

    // Create the alert
    // In production, get userId from session
    const effectiveUserId = userId || 'demo-user';

    const alert = await prisma.tariffAlert.create({
      data: {
        userId: effectiveUserId,
        htsCode: normalizedCode,
        countryOfOrigin: countryOfOrigin || null,
        originalRate,
        currentRate: originalRate,
        alertType: alertType || 'ANY_CHANGE',
        threshold: threshold || null,
        isActive: true,
      },
      include: {
        savedProduct: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error('Tariff alerts POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
