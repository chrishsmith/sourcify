/**
 * Development Auto-Login API
 * 
 * This endpoint automatically logs in the demo user for development.
 * ONLY available in development mode.
 * 
 * GET /api/auth/dev-login - Auto-login and redirect to dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

const DEMO_USER_EMAIL = 'demo@sourcify.dev';
const SESSION_DURATION_DAYS = 30;

export async function GET(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'Dev login only available in development mode' },
            { status: 403 }
        );
    }
    
    try {
        // Find the demo user
        const user = await prisma.user.findUnique({
            where: { email: DEMO_USER_EMAIL },
        });
        
        if (!user) {
            return NextResponse.json(
                { 
                    error: 'Demo user not found. Run: npx ts-node prisma/seed-demo-user.ts',
                    help: 'This will create the demo user for development.',
                },
                { status: 404 }
            );
        }
        
        // Generate session token
        const sessionToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        // Delete any existing sessions for this user (clean slate)
        await prisma.session.deleteMany({
            where: { userId: user.id },
        });
        
        // Create a new session
        const session = await prisma.session.create({
            data: {
                id: `session-${randomBytes(16).toString('hex')}`,
                userId: user.id,
                token: sessionToken,
                expiresAt,
                ipAddress: request.headers.get('x-forwarded-for') || 'localhost',
                userAgent: request.headers.get('user-agent') || 'dev-login',
            },
        });
        
        // Get redirect URL or default to dashboard
        const redirectUrl = request.nextUrl.searchParams.get('redirect') || '/dashboard';
        
        // Create response with redirect
        const response = NextResponse.redirect(new URL(redirectUrl, request.url));
        
        // Set the session cookie (Better Auth uses 'better-auth.session_token')
        response.cookies.set('better-auth.session_token', sessionToken, {
            httpOnly: true,
            secure: false, // Allow http for local dev
            sameSite: 'lax',
            path: '/',
            expires: expiresAt,
        });
        
        console.log('[Dev Login] Auto-logged in as:', user.email);
        
        return response;
        
    } catch (error) {
        console.error('[Dev Login] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create dev session', details: String(error) },
            { status: 500 }
        );
    }
}

/**
 * POST /api/auth/dev-login - API version (returns JSON instead of redirect)
 */
export async function POST(request: NextRequest) {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json(
            { error: 'Dev login only available in development mode' },
            { status: 403 }
        );
    }
    
    try {
        // Find the demo user
        const user = await prisma.user.findUnique({
            where: { email: DEMO_USER_EMAIL },
        });
        
        if (!user) {
            return NextResponse.json(
                { error: 'Demo user not found' },
                { status: 404 }
            );
        }
        
        // Generate session token
        const sessionToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
        
        // Delete any existing sessions for this user
        await prisma.session.deleteMany({
            where: { userId: user.id },
        });
        
        // Create a new session
        await prisma.session.create({
            data: {
                id: `session-${randomBytes(16).toString('hex')}`,
                userId: user.id,
                token: sessionToken,
                expiresAt,
                ipAddress: request.headers.get('x-forwarded-for') || 'localhost',
                userAgent: request.headers.get('user-agent') || 'dev-login',
            },
        });
        
        // Create response with session cookie
        const response = NextResponse.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            message: 'Logged in as demo user',
        });
        
        // Set the session cookie
        response.cookies.set('better-auth.session_token', sessionToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            expires: expiresAt,
        });
        
        return response;
        
    } catch (error) {
        console.error('[Dev Login] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create dev session' },
            { status: 500 }
        );
    }
}


