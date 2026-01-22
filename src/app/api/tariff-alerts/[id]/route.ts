/**
 * Tariff Alert by ID API
 * 
 * GET /api/tariff-alerts/[id] - Get a specific alert
 * PATCH /api/tariff-alerts/[id] - Update an alert (toggle active, change settings)
 * DELETE /api/tariff-alerts/[id] - Delete an alert
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const alert = await prisma.tariffAlert.findUnique({
      where: { id },
      include: {
        savedProduct: {
          select: {
            id: true,
            name: true,
          },
        },
        alertEvents: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error) {
    console.error('Tariff alert GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alert' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isActive, alertType, threshold } = body;

    // Build update data with proper typing
    const updateData: {
      isActive?: boolean;
      alertType?: 'ANY_CHANGE' | 'INCREASE_ONLY' | 'DECREASE_ONLY' | 'THRESHOLD';
      threshold?: number | null;
      lastChecked?: Date;
    } = {};

    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    if (alertType && ['ANY_CHANGE', 'INCREASE_ONLY', 'DECREASE_ONLY', 'THRESHOLD'].includes(alertType)) {
      updateData.alertType = alertType as 'ANY_CHANGE' | 'INCREASE_ONLY' | 'DECREASE_ONLY' | 'THRESHOLD';
    }

    if (threshold !== undefined) {
      updateData.threshold = threshold;
    }

    const alert = await prisma.tariffAlert.update({
      where: { id },
      data: updateData,
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
    console.error('Tariff alert PATCH error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.tariffAlert.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Alert deleted',
    });
  } catch (error) {
    console.error('Tariff alert DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}
