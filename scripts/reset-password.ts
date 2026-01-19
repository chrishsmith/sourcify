/**
 * Password Reset Script
 * 
 * Usage: npx ts-node scripts/reset-password.ts <email> <new-password>
 * Example: npx ts-node scripts/reset-password.ts wmm0407@gmail.com MyNewPassword123
 * 
 * This script updates a user's password directly in the database.
 * Only use this in development or for emergency resets.
 */

import { PrismaClient } from '@prisma/client';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
    // better-auth uses scrypt with a specific format: salt:hash
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
    return `${salt}:${derivedKey.toString('hex')}`;
}

async function resetPassword(email: string, newPassword: string) {
    console.log(`\n🔐 Password Reset Script`);
    console.log(`========================\n`);
    
    // Find the user
    const user = await prisma.user.findUnique({
        where: { email },
    });
    
    if (!user) {
        console.error(`❌ User not found: ${email}`);
        process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.name} (${user.email})`);
    
    // Find their credential account
    const account = await prisma.account.findFirst({
        where: {
            userId: user.id,
            providerId: 'credential',
        },
    });
    
    if (!account) {
        console.error(`❌ No credential account found for this user`);
        console.error(`   This user may have signed up with OAuth (Google/GitHub)`);
        process.exit(1);
    }
    
    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update the password
    await prisma.account.update({
        where: { id: account.id },
        data: { password: hashedPassword },
    });
    
    console.log(`\n✅ Password updated successfully!`);
    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`\nYou can now log in at http://localhost:3000/login\n`);
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log(`
Usage: npx ts-node scripts/reset-password.ts <email> <new-password>

Example:
  npx ts-node scripts/reset-password.ts wmm0407@gmail.com MyNewPassword123
`);
    process.exit(1);
}

const [email, newPassword] = args;

resetPassword(email, newPassword)
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });
