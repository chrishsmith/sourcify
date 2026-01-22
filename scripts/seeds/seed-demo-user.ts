/**
 * Seed Demo User for Development
 * 
 * Creates a demo user for local development and testing.
 * Run: npx tsx scripts/seeds/seed-demo-user.ts
 */

// Load environment variables from .env.local
import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_USER = {
    id: 'demo-user-001',
    email: 'demo@sourcify.dev',
    name: 'John Doe',
    password: 'demo123',  // Will be hashed
};

async function seedDemoUser() {
    console.log('🌱 Seeding demo user...');
    
    // Check if demo user already exists
    const existing = await prisma.user.findUnique({
        where: { email: DEMO_USER.email },
    });
    
    if (existing) {
        console.log('✓ Demo user already exists:', existing.email);
        return existing;
    }
    
    // Hash the password (bcrypt with 10 rounds, same as Better Auth default)
    const hashedPassword = await hash(DEMO_USER.password, 10);
    
    // Create the user
    const user = await prisma.user.create({
        data: {
            id: DEMO_USER.id,
            email: DEMO_USER.email,
            name: DEMO_USER.name,
            emailVerified: true,  // Skip email verification for demo
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
    
    // Create an account record (for email/password auth)
    await prisma.account.create({
        data: {
            id: `account-${DEMO_USER.id}`,
            userId: user.id,
            accountId: user.id,
            providerId: 'credential',
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    });
    
    console.log('✓ Demo user created!');
    console.log('  Email:', DEMO_USER.email);
    console.log('  Password:', DEMO_USER.password);
    console.log('  User ID:', user.id);
    
    return user;
}

seedDemoUser()
    .then(() => {
        console.log('\n✅ Demo user seeding complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });

