import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        // Test basic query
        const userCount = await prisma.user.count();
        const accountCount = await prisma.account.count();
        const sessionCount = await prisma.session.count();

        return NextResponse.json({
            success: true,
            counts: {
                users: userCount,
                accounts: accountCount,
                sessions: sessionCount,
            }
        });
    } catch (error: any) {
        console.error('Database test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
        }, { status: 500 });
    }
}
