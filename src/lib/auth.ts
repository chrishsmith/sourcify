import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

// Use a standard PrismaClient for auth (Neon adapter can cause issues with Better-Auth)
const prisma = new PrismaClient();

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        minPasswordLength: 6,
    },
    advanced: {
        useSecureCookies: false, // Allow http for local dev
    },
    // We can add more providers here later (Google, GitHub, etc.)
});
