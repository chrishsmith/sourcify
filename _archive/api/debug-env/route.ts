// Diagnostic API route to check environment variables
// DELETE THIS FILE after debugging

import { NextResponse } from 'next/server';

export async function GET() {
    const xaiKey = process.env.XAI_API_KEY;
    const usitcKey = process.env.USITC_DATAWEB_API_KEY;

    // Get all env vars that start with common prefixes (safe to log)
    const envVars = Object.keys(process.env)
        .filter(key => key.includes('API') || key.includes('KEY') || key.includes('XAI'))
        .map(key => `${key}: ${process.env[key]?.substring(0, 10)}...`);

    return NextResponse.json({
        xaiKeyPresent: !!xaiKey,
        xaiKeyPrefix: xaiKey ? xaiKey.substring(0, 15) + '...' : 'NOT FOUND',
        usitcKeyPresent: !!usitcKey,
        nodeEnv: process.env.NODE_ENV,
        relevantEnvVars: envVars,
    });
}
