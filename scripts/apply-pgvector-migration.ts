/**
 * Apply pgvector migration
 * Run with: npx tsx scripts/apply-pgvector-migration.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Applying pgvector migration...\n');

  try {
    // 1. Enable pgvector extension
    console.log('1. Enabling pgvector extension...');
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('   ✅ pgvector extension enabled\n');

    // 2. Add embedding column
    console.log('2. Adding embedding column (vector(1536))...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE hts_code 
      ADD COLUMN IF NOT EXISTS embedding vector(1536);
    `);
    console.log('   ✅ embedding column added\n');

    // 3. Add context column
    console.log('3. Adding embedding_context column...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE hts_code
      ADD COLUMN IF NOT EXISTS embedding_context TEXT;
    `);
    console.log('   ✅ embedding_context column added\n');

    // 4. Add timestamp column
    console.log('4. Adding embedding_generated_at column...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE hts_code
      ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP;
    `);
    console.log('   ✅ embedding_generated_at column added\n');

    // 5. Create HNSW index (this may take a moment)
    console.log('5. Creating HNSW index for fast vector search...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_hts_code_embedding 
      ON hts_code 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);
    console.log('   ✅ HNSW index created\n');

    // Verify
    console.log('6. Verifying setup...');
    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_name = 'hts_code' AND column_name = 'embedding'
    `;
    
    if (result[0]?.count > 0) {
      console.log('   ✅ Migration verified - embedding column exists\n');
    } else {
      console.log('   ❌ Warning: embedding column not found\n');
    }

    console.log('🎉 Migration complete! Now run embedding generation:');
    console.log('   curl -X POST http://localhost:3000/api/hts/embeddings \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"action": "generate"}\'');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

