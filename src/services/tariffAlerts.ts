/**
 * Tariff Alert Service
 * 
 * Monitors tariff rates and creates alerts when they change.
 * Users can set up alerts for specific HTS codes/countries.
 * 
 * UPDATED: Now uses the centralized Country Tariff Registry
 * @see docs/ARCHITECTURE_TARIFF_REGISTRY.md
 */

import { prisma } from '@/lib/db';
import { getEffectiveTariff } from '@/services/tariffRegistry';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TariffAlertSummary {
    id: string;
    htsCode: string;
    countryOfOrigin: string | null;
    originalRate: number;
    currentRate: number | null;
    alertType: 'ANY_CHANGE' | 'INCREASE_ONLY' | 'DECREASE_ONLY' | 'THRESHOLD';
    isActive: boolean;
    lastChecked: Date | null;
    createdAt: Date;
    productName?: string;
}

export interface TariffAlertEvent {
    id: string;
    previousRate: number;
    newRate: number;
    changePercent: number;
    changeType: 'increase' | 'decrease';
    changeReason: string | null;
    createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE ALERT
// ═══════════════════════════════════════════════════════════════════════════════

export async function createTariffAlert(
    userId: string,
    options: {
        htsCode: string;
        countryOfOrigin?: string;
        currentRate: number;
        alertType?: 'ANY_CHANGE' | 'INCREASE_ONLY' | 'DECREASE_ONLY' | 'THRESHOLD';
        threshold?: number;
        savedProductId?: string;
        searchHistoryId?: string;
    }
): Promise<string> {
    const alert = await prisma.tariffAlert.create({
        data: {
            userId,
            htsCode: options.htsCode,
            countryOfOrigin: options.countryOfOrigin || null,
            originalRate: options.currentRate,
            currentRate: options.currentRate,
            alertType: options.alertType || 'ANY_CHANGE',
            threshold: options.threshold,
            isActive: true,
            savedProductId: options.savedProductId,
            searchHistoryId: options.searchHistoryId,
        },
    });

    console.log('[TariffAlert] Created alert:', alert.id);
    return alert.id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getUserAlerts(
    userId: string,
    options?: {
        activeOnly?: boolean;
        limit?: number;
        offset?: number;
    }
): Promise<{ alerts: TariffAlertSummary[]; total: number }> {
    const where = {
        userId,
        ...(options?.activeOnly && { isActive: true }),
    };

    const [alerts, total] = await Promise.all([
        prisma.tariffAlert.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: options?.limit || 50,
            skip: options?.offset || 0,
            include: {
                savedProduct: {
                    select: { name: true },
                },
            },
        }),
        prisma.tariffAlert.count({ where }),
    ]);

    return {
        alerts: alerts.map(a => ({
            id: a.id,
            htsCode: a.htsCode,
            countryOfOrigin: a.countryOfOrigin,
            originalRate: a.originalRate,
            currentRate: a.currentRate,
            alertType: a.alertType as TariffAlertSummary['alertType'],
            isActive: a.isActive,
            lastChecked: a.lastChecked,
            createdAt: a.createdAt,
            productName: a.savedProduct?.name,
        })),
        total,
    };
}

export async function getAlertDetail(
    alertId: string,
    userId: string
): Promise<TariffAlertSummary & { events: TariffAlertEvent[] } | null> {
    const alert = await prisma.tariffAlert.findFirst({
        where: { id: alertId, userId },
        include: {
            savedProduct: {
                select: { name: true },
            },
            alertEvents: {
                orderBy: { createdAt: 'desc' },
                take: 20,
            },
        },
    });

    if (!alert) return null;

    return {
        id: alert.id,
        htsCode: alert.htsCode,
        countryOfOrigin: alert.countryOfOrigin,
        originalRate: alert.originalRate,
        currentRate: alert.currentRate,
        alertType: alert.alertType as TariffAlertSummary['alertType'],
        isActive: alert.isActive,
        lastChecked: alert.lastChecked,
        createdAt: alert.createdAt,
        productName: alert.savedProduct?.name,
        events: alert.alertEvents.map(e => ({
            id: e.id,
            previousRate: e.previousRate,
            newRate: e.newRate,
            changePercent: e.changePercent,
            changeType: e.changeType as 'increase' | 'decrease',
            changeReason: e.changeReason,
            createdAt: e.createdAt,
        })),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE / DELETE ALERTS
// ═══════════════════════════════════════════════════════════════════════════════

export async function updateAlert(
    alertId: string,
    userId: string,
    updates: {
        alertType?: 'ANY_CHANGE' | 'INCREASE_ONLY' | 'DECREASE_ONLY' | 'THRESHOLD';
        threshold?: number;
        isActive?: boolean;
    }
): Promise<boolean> {
    const result = await prisma.tariffAlert.updateMany({
        where: { id: alertId, userId },
        data: updates,
    });

    return result.count > 0;
}

export async function deleteAlert(alertId: string, userId: string): Promise<boolean> {
    const result = await prisma.tariffAlert.deleteMany({
        where: { id: alertId, userId },
    });

    return result.count > 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHECK ALERTS (Background job would call this)
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkAndUpdateAlerts(): Promise<{
    checked: number;
    triggered: number;
}> {
    const activeAlerts = await prisma.tariffAlert.findMany({
        where: { isActive: true },
        take: 100, // Process in batches
    });

    let triggered = 0;

    for (const alert of activeAlerts) {
        try {
            // Get current rate from centralized tariff registry
            const effectiveTariff = await getEffectiveTariff(
                alert.countryOfOrigin || 'CN',
                alert.htsCode,
                { baseMfnRate: 0 } // Base rate will be determined by registry
            );

            const newRate = effectiveTariff.effectiveRate;
            const previousRate = alert.currentRate ?? alert.originalRate;
            const changePercent = previousRate > 0 
                ? ((newRate - previousRate) / previousRate) * 100 
                : 0;

            // Check if alert should trigger
            const shouldTrigger = checkTriggerCondition(
                alert.alertType as TariffAlertSummary['alertType'],
                previousRate,
                newRate,
                alert.threshold
            );

            // Update alert
            await prisma.tariffAlert.update({
                where: { id: alert.id },
                data: {
                    currentRate: newRate,
                    lastChecked: new Date(),
                },
            });

            if (shouldTrigger) {
                // Create event with reason from registry breakdown
                const changeReason = determineChangeReasonFromRegistry(effectiveTariff);
                
                await prisma.tariffAlertEvent.create({
                    data: {
                        alertId: alert.id,
                        previousRate,
                        newRate,
                        changePercent,
                        changeType: newRate > previousRate ? 'increase' : 'decrease',
                        changeReason,
                    },
                });

                triggered++;
                console.log(`[TariffAlert] Triggered: ${alert.id} (${previousRate}% → ${newRate}%)`);
            }
        } catch (error) {
            console.error(`[TariffAlert] Failed to check alert ${alert.id}:`, error);
        }
    }

    return { checked: activeAlerts.length, triggered };
}

function checkTriggerCondition(
    alertType: TariffAlertSummary['alertType'],
    previousRate: number,
    newRate: number,
    threshold?: number | null
): boolean {
    const diff = newRate - previousRate;
    
    if (Math.abs(diff) < 0.01) return false; // No meaningful change

    switch (alertType) {
        case 'ANY_CHANGE':
            return true;
        case 'INCREASE_ONLY':
            return diff > 0;
        case 'DECREASE_ONLY':
            return diff < 0;
        case 'THRESHOLD':
            return threshold ? Math.abs(diff) >= threshold : false;
        default:
            return false;
    }
}

/**
 * Determine the reason for rate change from registry breakdown
 */
function determineChangeReasonFromRegistry(
    effectiveTariff: Awaited<ReturnType<typeof getEffectiveTariff>>
): string {
    const reasons: string[] = [];
    
    // Check each component from the registry breakdown
    for (const item of effectiveTariff.breakdown) {
        if (item.rate > 0) {
            reasons.push(item.program);
        }
    }

    // Add any warnings as context
    if (effectiveTariff.warnings.length > 0) {
        return reasons.length > 0 
            ? `Changes in: ${reasons.join(', ')}. ${effectiveTariff.warnings[0]}`
            : effectiveTariff.warnings[0];
    }

    return reasons.length > 0 
        ? `Active programs: ${reasons.join(', ')}` 
        : 'Rate adjustment';
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════════════════════════════

export async function getAlertStats(userId: string): Promise<{
    activeAlerts: number;
    triggeredThisMonth: number;
    avgRateChange: number;
}> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [activeAlerts, events] = await Promise.all([
        prisma.tariffAlert.count({ where: { userId, isActive: true } }),
        prisma.tariffAlertEvent.findMany({
            where: {
                alert: { userId },
                createdAt: { gte: startOfMonth },
            },
        }),
    ]);

    const avgRateChange = events.length > 0
        ? events.reduce((sum, e) => sum + Math.abs(e.changePercent), 0) / events.length
        : 0;

    return {
        activeAlerts,
        triggeredThisMonth: events.length,
        avgRateChange: Math.round(avgRateChange * 10) / 10,
    };
}


