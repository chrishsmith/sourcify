/**
 * Individual Search History Item API
 * GET - Get full details of a search
 * DELETE - Delete a specific search
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import {
    getSearchHistoryDetail,
    deleteSearchHistory,
} from '@/services/searchHistory';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        const { id } = await params;

        // Allow viewing without auth (for shared links), but include user check if logged in
        const detail = await getSearchHistoryDetail(id, session?.user?.id);

        if (!detail) {
            return NextResponse.json(
                { error: 'Search not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(detail);
    } catch (error) {
        console.error('[API] Search detail error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch search details' },
            { status: 500 }
        );
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
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const deleted = await deleteSearchHistory(id, session.user.id);

        if (!deleted) {
            return NextResponse.json(
                { error: 'Search not found or not authorized' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Delete search error:', error);
        return NextResponse.json(
            { error: 'Failed to delete search' },
            { status: 500 }
        );
    }
}



