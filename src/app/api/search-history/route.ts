/**
 * Search History API
 * GET - List user's search history
 * DELETE - Clear history
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

// Dynamically import to avoid module load errors
async function getServices() {
    const { getSearchHistory, getSearchStats, clearSearchHistory } = await import('@/services/searchHistory');
    return { getSearchHistory, getSearchStats, clearSearchHistory };
}

export async function GET(request: NextRequest) {
    try {
        // Get authenticated user
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            // Return empty state for unauthenticated users instead of 401
            return NextResponse.json({
                items: [],
                total: 0,
                limit: 50,
                offset: 0,
                hasMore: false,
                stats: null,
                message: 'Sign in to view your search history',
            });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');
        const htsCode = searchParams.get('htsCode') || undefined;
        const includeStats = searchParams.get('includeStats') === 'true';

        try {
            const { getSearchHistory, getSearchStats } = await getServices();
            
            const { items, total } = await getSearchHistory(session.user.id, {
                limit,
                offset,
                htsCode,
            });

            let stats = null;
            if (includeStats) {
                stats = await getSearchStats(session.user.id);
            }

            return NextResponse.json({
                items,
                total,
                limit,
                offset,
                hasMore: offset + items.length < total,
                ...(stats && { stats }),
            });
        } catch (dbError: unknown) {
            // Check if it's a "table doesn't exist" error
            const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
            if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
                console.warn('[API] Search history table not yet created. Run migrations.');
                return NextResponse.json({
                    items: [],
                    total: 0,
                    limit,
                    offset,
                    hasMore: false,
                    stats: null,
                    message: 'Database migration pending. Run: npx prisma migrate dev',
                });
            }
            throw dbError;
        }
    } catch (error) {
        console.error('[API] Search history error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch search history', details: String(error) },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        try {
            const { clearSearchHistory } = await getServices();
            const deletedCount = await clearSearchHistory(session.user.id);

            return NextResponse.json({
                success: true,
                deletedCount,
            });
        } catch (dbError: unknown) {
            const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
            if (errorMessage.includes('does not exist')) {
                return NextResponse.json({ success: true, deletedCount: 0 });
            }
            throw dbError;
        }
    } catch (error) {
        console.error('[API] Clear history error:', error);
        return NextResponse.json(
            { error: 'Failed to clear history' },
            { status: 500 }
        );
    }
}



