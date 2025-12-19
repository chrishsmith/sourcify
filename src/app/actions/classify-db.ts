'use server';

import { classifyProduct as classifyWithAI } from '@/services/ai';
import type { ClassificationInput } from '@/types/classification.types';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new product and runs classification
 */
export async function createClassification(input: ClassificationInput) {
    try {
        // 1. Get current user
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session) {
            throw new Error('Unauthorized');
        }

        // 2. Create Product
        const product = await prisma.product.create({
            data: {
                userId: session.user.id,
                name: input.productName || 'Untitled Product',
                description: input.productDescription,
                sku: input.productSku,
                countryOfOrigin: input.countryOfOrigin,
                materialComposition: input.materialComposition,
                intendedUse: input.intendedUse,
            }
        });

        // 3. Run AI Classification
        const aiResult = await classifyWithAI(input);

        // 4. Save Classification Record
        const classification = await prisma.classification.create({
            data: {
                productId: product.id,
                htsCode: aiResult.htsCode.code,
                confidence: aiResult.confidence,
                // Cast to any because Prisma Json type handling can be strict with interfaces
                dutyRate: aiResult.dutyRate as any,
                rulings: aiResult.rulings as any,
                rationale: aiResult.rationale,
                status: 'COMPLETED',
            }
        });

        revalidatePath('/dashboard/classifications');

        return { success: true, classificationId: classification.id };

    } catch (error) {
        console.error('Classification error:', error);
        return { success: false, error: 'Failed to classify product' };
    }
}
