# HTS Classification Engine - Semantic Search Architecture

> **Created:** December 30, 2025  
> **Updated:** December 30, 2025 (Conditional Classification + Business Model)  
> **Status:** ✅ Production - Primary Classification Engine  
> **Performance:** ~3-6 seconds (down from 20-30s)

---

## 🎯 Business Context

**Classification is the top-of-funnel hook**, not the revenue driver.

### Free Tier (Classification)
- HTS code classification
- Base tariff rate display
- Alternative codes with confidence scores
- Conditional classification (size/value dependent codes)

### Paid Services (Upsells)
The classification result **teases** these paid services:

| Service | Teaser | CTA |
|---------|--------|-----|
| **Same-Country Optimization** | "We found 3 alternative codes that could save 5% on duties" | "Unlock Savings Analysis" |
| **Country Optimization** | "Sourcing from Vietnam instead of China could save ~25%" | "Explore Sourcing Intelligence" |
| **Tariff Monitoring** | "Alert me when tariffs change for this code" | "Set Up Alerts (Free)" |
| **CBP Ruling Support** | "3 CBP rulings support this classification" | "View Detailed Analysis" |

**The goal:** Provide a fast, accurate classification that demonstrates our expertise, then convert users to paid optimization services.

---

## Overview

This engine is a **hybrid semantic-hierarchical system** that combines:

1. **Semantic Search** via pgvector embeddings - Primary method
2. **Keyword Fallback** for when embeddings aren't available
3. **"Other" Validation** using HTS tree structure logic
4. **Dual-Path Search**: Material + Function intersection
5. **Conditional Classification**: Detects size/value dependent codes

This architecture eliminates hardcoded product rules by using AI **once** (at embedding generation time) rather than at query time.

---

## What Was Built

### ✅ Core Engine (December 30, 2025)

| Component | Status | Notes |
|-----------|--------|-------|
| pgvector extension | ✅ Deployed | Added to Neon database |
| Embedding column | ✅ Added | `vector(1536)` in `hts_code` table |
| HNSW index | ✅ Created | Fast approximate nearest neighbor |
| Embedding generation | ✅ Complete | All 27,061 classifiable codes |
| Semantic search | ✅ Working | `searchHtsBySemantic()` function |
| Classification engine | ✅ Integrated | Uses semantic search for candidates |
| Frontend UI | ✅ Deployed | Default tab on Classifications page |
| API endpoint | ✅ Live | `/api/classify-v10` |

### ✅ Additional Features (December 30, 2025)

| Component | Status | Notes |
|-----------|--------|-------|
| Query enrichment | ✅ Complete | Prevents "planter" → "cucumber" errors |
| Low confidence handling | ✅ Complete | Asks for material when unsure |
| Conditional classification | ✅ Complete | Detects value/size dependent codes |
| Decision flow UI | ✅ Complete | Simple yes/no questions for conditionals |

### Performance Results

| Test Query | HTS Code | Time | Confidence |
|------------|----------|------|------------|
| "ceramic coffee mug with handle" | 6912.00.44.00 | 4.2s | 80% |
| "plastic indoor planter" | 3924.90.56.50 | 3.8s | 78% |
| "mens cotton t-shirt" | 6109.10.00.40 | 4.1s | 75% |

**Average: ~4 seconds** (down from 20-30 seconds with V6-V9!)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    "ceramic coffee mug"                          │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  TOKENIZE     │    │  MATERIAL     │    │  GENERATE     │
│  "ceramic",   │    │  DETECTION    │    │  EMBEDDING    │
│  "coffee",    │    │  "ceramic"    │    │  query → vec  │
│  "mug"        │    │  → Ch.69      │    │  (~50ms)      │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        │                     └─────────┬───────────┘
        │                               ▼
        │                    ┌───────────────────┐
        │                    │  VECTOR SEARCH    │
        │                    │  pgvector HNSW    │
        │                    │  (~3000ms)        │
        │                    │                   │
        │                    │  Find top 100     │
        │                    │  nearest HTS      │
        │                    │  embeddings       │
        │                    └───────────────────┘
        │                               │
        └───────────────────────────────┤
                                        ▼
                         ┌───────────────────────────┐
                         │  SCORING + VALIDATION     │
                         │  - Semantic similarity    │
                         │  - Material match         │
                         │  - "Other" sibling check  │
                         │  (~1000ms)                │
                         └───────────────────────────┘
                                        │
                                        ▼
                         ┌───────────────────────────┐
                         │  TARIFF CALCULATION       │
                         │  - Base MFN rate          │
                         │  - Section 301 duties     │
                         │  - Reciprocal tariffs     │
                         │  (~500ms)                 │
                         └───────────────────────────┘
                                        │
                                        ▼
                         ┌───────────────────────────┐
                         │  RESULT: 6912.00.44.00    │
                         │  "Mugs and steins"        │
                         │  Confidence: 80%          │
                         │  Time: ~4-6 seconds       │
                         └───────────────────────────┘
```

---

## Key Innovation: Hierarchical Embeddings

Instead of embedding just the leaf description:

```
"Mugs and other steins" → [vector]  ❌ Loses context
```

We embed the **full semantic context**:

```
"CERAMIC PRODUCTS | Ceramic tableware, kitchenware, household articles | 
 Mugs and other steins | cup, mug, coffee, tea, beverage" → [vector]  ✅
```

This captures:
- **Material** (ceramic)
- **Category** (tableware)
- **Specific product** (mugs)
- **Synonyms** (cup, coffee, etc.)

All in ONE embedding query at runtime.

---

## Files Created/Modified

### Core Services

| File | Purpose |
|------|---------|
| `src/services/htsEmbeddings.ts` | Embedding generation + semantic search |
| `src/services/classificationEngineV10.ts` | Main classification engine |
| `src/app/api/hts/embeddings/route.ts` | API for managing embeddings |
| `src/app/api/classify-v10/route.ts` | Classification API endpoint |

### Frontend

| File | Purpose |
|------|---------|
| `src/features/compliance/components/ClassificationV10.tsx` | V10 UI component |
| `src/features/compliance/components/ClassificationsPageContent.tsx` | Tab integration |

### Database

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Added embedding fields to HtsCode model |
| `scripts/apply-pgvector-migration.ts` | Migration script for pgvector |

---

## Database Schema Changes

```prisma
model HtsCode {
  // ... existing fields ...
  
  // V10 Semantic Search Fields
  embedding            Unsupported("vector(1536)")?
  embeddingContext     String? @map("embedding_context")
  embeddingGeneratedAt DateTime? @map("embedding_generated_at")
}
```

### SQL Migration Applied

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (1536 dimensions for OpenAI text-embedding-3-small)
ALTER TABLE hts_code ADD COLUMN IF NOT EXISTS embedding vector(1536);
ALTER TABLE hts_code ADD COLUMN IF NOT EXISTS embedding_context TEXT;
ALTER TABLE hts_code ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP;

-- Create HNSW index for fast nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_hts_code_embedding
ON hts_code USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## API Reference

### GET /api/hts/embeddings

Returns embedding coverage stats.

```json
{
  "success": true,
  "stats": {
    "totalCodes": 30573,
    "classifiableCodes": 27061,
    "withEmbeddings": 27061,
    "coverage": "100.00%"
  }
}
```

### POST /api/hts/embeddings

**Generate embeddings:**
```json
{
  "action": "generate",
  "forceRegenerate": false
}
```

**Test semantic search:**
```json
{
  "action": "test",
  "query": "ceramic coffee mug"
}
```

### POST /api/classify-v10

**Classify a product:**
```json
{
  "description": "ceramic coffee mug with handle",
  "origin": "CN",
  "material": "ceramic"
}
```

**Response:**
```json
{
  "success": true,
  "timing": {
    "total": 4215,
    "search": 3447,
    "scoring": 1191,
    "tariff": 659
  },
  "primary": {
    "htsCode": "6912004400",
    "htsCodeFormatted": "6912.00.44.00",
    "confidence": 80,
    "fullDescription": "Ceramic tableware, kitchenware... Mugs and other steins",
    "duty": {
      "baseMfn": "10%",
      "additional": "+25% (Section 301)",
      "effective": "55.0%"
    }
  },
  "alternatives": [
    { "rank": 2, "htsCode": "6911104500", ... },
    { "rank": 3, "htsCode": "6912001000", ... }
  ]
}
```

---

## Frontend Integration

The classifier is available at `/dashboard/classifications`:

1. Enter product description
2. Select country of origin  
3. Optionally specify material
4. Click "Classify Product"

### UI Features

**Classification Result:**
- Primary result card with HTS code, confidence, full description
- Duty breakdown showing base MFN, additional duties, effective rate
- Alternative classifications (up to 10) with expandable list
- HTS path showing chapter → heading → subheading → tariff line

**Conditional Classification (when applicable):**
- Decision questions for value/size dependent codes
- Clear options with HTS code and duty rate for each choice
- User selects to refine classification

**Upsell Teasers (coming soon):**
- "Lower rate available" badge when alternative codes have lower duties
- "Save with different sourcing" hint for country optimization
- "Set up alerts" link for tariff monitoring

---

## Query Enrichment (Added Dec 30, 2025)

### The Problem

Semantic search can match the wrong codes when queries are ambiguous:

```
User: "indoor planter"
     ↓
Semantic match: "greenhouse" → vegetables (WRONG!)
```

The word "planter" means a **container** for plants, but semantically relates to "planting" and "greenhouse".

### The Solution: Product Type Enrichment

When we detect a known product type, we enrich the query with context keywords:

```typescript
const PRODUCT_TYPE_HINTS = {
  'planter': { 
    headings: ['3924', '6912', '7323', '4419'], 
    keywords: ['household', 'article', 'container', 'pot'] 
  },
  'mug': { 
    headings: ['3924', '6912', '7323'], 
    keywords: ['tableware', 'cup', 'mug', 'drinking'] 
  },
  // ... more product types
};
```

**Before enrichment:**
```
Query: "indoor planter"
Result: Cucumbers (0707) - WRONG!
```

**After enrichment:**
```
Query: "indoor planter household article container pot"
Result: Household articles (3924/6912) - CORRECT!
```

### Preferred Headings

When a product type is detected, we also restrict the semantic search to **preferred chapters**:

```typescript
// For "planter", search only in:
// - Chapter 39 (Plastics)
// - Chapter 69 (Ceramics)
// - Chapter 73 (Iron/Steel)
// - Chapter 44 (Wood)
```

This prevents the search from wandering into unrelated chapters like vegetables (07) or live plants (06).

---

## Low Confidence Handling (Added Dec 30, 2025)

### The Problem

Even with enrichment, some queries are fundamentally ambiguous:

```
"indoor planter" → What material? Plastic? Ceramic? Wood?
```

Without knowing the material, the HTS code could be in Chapter 39, 69, 73, or 44.

### The Solution: Ask for Clarification

When confidence < 40% AND no material is detected, we return a clarification request:

```typescript
if (!detectedMaterial && confidence < 40 && productTypeHints.type) {
  return {
    needsClarification: {
      reason: 'material_unknown',
      question: 'What material is your planter made of?',
      options: [
        { value: 'plastic', label: 'Plastic', hint: 'Chapter 39' },
        { value: 'ceramic', label: 'Ceramic/Clay', hint: 'Chapter 69' },
        { value: 'metal', label: 'Metal', hint: 'Chapters 72-83' },
        { value: 'wood', label: 'Wood', hint: 'Chapter 44' },
      ]
    }
  };
}
```

### Result Type Extended

```typescript
interface ClassifyV10Result {
  // ... existing fields ...
  
  needsClarification?: {
    reason: string;
    question: string;
    options: { value: string; label: string; hint?: string }[];
  };
}
```

---

## Conditional Classification (Added Dec 30, 2025)

### The Problem

Many HTS codes have **multiple variations** based on product attributes:

```
6912.00.35.10 - Mugs valued ≤$38 each → 4.5% duty
6912.00.44.00 - Mugs valued >$38 each → 9.8% duty
```

Without asking about value, we can't give the most accurate code.

### The Solution: Decision Questions

When we detect conditional siblings, we present simple decision questions:

```typescript
interface ConditionalClassification {
  hasConditions: boolean;
  guidance: string;  // "The exact HTS code depends on the value/size of your item"
  decisionQuestions: [
    {
      id: 'value',
      question: 'What is the value of your item?',
      options: [
        { label: '$38 or less', htsCode: '6912.00.35.10', dutyRate: '4.5%' },
        { label: 'More than $38', htsCode: '6912.00.44.00', dutyRate: '9.8%' }
      ]
    }
  ]
}
```

### Conservative Question Filtering

We only show questions when they **actually matter**:

1. **Different HTS codes** - If all options lead to the same code, don't ask
2. **Product-relevant thresholds** - Don't show plate sizes (27.9cm) for mug queries
3. **Clear differentiators** - Only value, size, or composition (not obscure conditions)

This keeps the classification fast and avoids overwhelming users with irrelevant questions.

### Files

| File | Purpose |
|------|---------|
| `src/services/conditionalClassification.ts` | Detection + question generation |
| `src/features/compliance/components/ClassificationV10.tsx` | Decision UI |

---

## "Other" Validation Logic

The key innovation for handling "Other" codes without hardcoding:

```typescript
async function validateOtherSelection(productTerms, otherCode) {
  // Get all sibling codes under the same subheading
  const siblings = await getCodesUnderSubheading(otherCode);
  
  // For each SPECIFIC sibling (not "Other"):
  for (const sibling of specificSiblings) {
    // Extract key nouns from the HTS description
    const nouns = extractNouns(sibling.description);
    
    // If product matches this sibling, "Other" is WRONG
    if (productTerms.some(term => nouns.includes(term))) {
      return { isValidOther: false };
    }
  }
  
  // Product doesn't match ANY specific sibling
  // → "Other" is CORRECT
  return { isValidOther: true, excludedSiblings: [...] };
}
```

This uses the **HTS structure itself** as the rules, not hardcoded mappings.

---

## Performance Breakdown

| Phase | Time | Description |
|-------|------|-------------|
| Tokenization | ~10ms | Split description into terms |
| Material Detection | ~5ms | Map material to HTS chapters |
| Embedding Generation | ~100ms | OpenAI API call for query |
| Vector Search | ~3000ms | pgvector HNSW search |
| Scoring | ~1000ms | Rank candidates |
| Tariff Lookup | ~500ms | Calculate duties |
| **Total** | **~4-6s** | |

### Optimization Opportunities

1. **Redis Cache** - Cache common queries for instant results
2. **Batch embedding lookup** - Reduce DB roundtrips
3. **Pre-compute tariffs** - Cache duty calculations
4. **Connection pooling** - Optimize Prisma connections

Target with optimizations: **<1 second**

---

## Cost Analysis

### One-Time Costs

| Item | Cost |
|------|------|
| Generate 27k embeddings | ~$0.40 |
| pgvector storage | ~10MB |

### Per-Query Costs

| Item | Cost |
|------|------|
| Generate 1 query embedding | ~$0.00002 |
| 1M queries/month | ~$20/month |

### Comparison to AI-per-query

| Approach | Cost per 1M queries | Time per query |
|----------|---------------------|----------------|
| V6-V9 (AI per level) | ~$30,000 | 20-30s |
| **V10 (Semantic)** | **~$20** | **~4-6s** |

---

## Monitoring

### Embedding Coverage Check

```sql
SELECT 
  COUNT(*) as total,
  COUNT(embedding) as with_embeddings,
  ROUND(COUNT(embedding)::numeric / COUNT(*)::numeric * 100, 1) as coverage_pct
FROM hts_code
WHERE level IN ('tariff_line', 'statistical');
```

### API Health Check

```bash
# Check embedding stats
curl http://localhost:3000/api/hts/embeddings

# Test classification
curl -X POST http://localhost:3000/api/classify-v10 \
  -H "Content-Type: application/json" \
  -d '{"description": "ceramic coffee mug"}'
```

---

## Comparison to Previous Versions

| Version | Approach | Speed | Cost/1M | Scalability |
|---------|----------|-------|---------|-------------|
| V6 Atlas | AI per level | 20-30s | $30,000 | ❌ AI calls |
| V8 Arbiter | AI with questions | 15-25s | $20,000 | ❌ AI calls |
| V9 AI-First | AI + guardrails | 10-20s | $10,000 | ❌ AI calls |
| **V10 Velocity** | **Semantic search** | **4-6s** | **$20** | **✅ Scales** |

---

## Future Enhancements

### Phase 1: Upsell Teasers (Priority)
- Scan alternatives for lower duty rates → "Lower rate available" badge
- Check country optimization potential → "Save with different sourcing"
- Link to monitoring → "Set up alerts for this code"
- **Goal:** Convert free classifications to paid service sign-ups

### Phase 2: Caching Layer
- Redis for exact query matches
- LRU cache for similar queries
- Target: 40%+ cache hit rate, <1s response

### Phase 3: Learning Loop
- Track user corrections
- Regenerate embeddings for corrected codes
- Build feedback dataset for fine-tuning

### Phase 4: Bulk Classification API
- Batch processing for enterprise clients
- Async job queue for large imports
- Webhook callbacks for completion

---

## Summary

This classification engine achieves fast, accurate HTS classification by:

1. **Pre-computing embeddings** once for all 27k HTS codes ✅
2. **Semantic search** at query time (vector similarity) ✅
3. **"Other" validation** using HTS tree logic (no hardcoding) ✅
4. **Dual-path intersection** for material + function ✅
5. **Conditional classification** for size/value dependent codes ✅
6. **Frontend integration** with clean UI ✅

The result is a system that:
- Handles ANY product description (no manual rules)
- Runs in ~4-6 seconds (5-7x faster than previous versions)
- Costs ~$0.02 per 1000 queries
- Maintains explainability (HTS structure is the logic)
- Surfaces conditional variations for accurate classification
- **Drives users to paid services** (optimization, monitoring, analysis)

---

## Version History

| Version | Date | Focus | Status |
|---------|------|-------|--------|
| V5 | Dec 2025 | Keyword search + local DB | Archived |
| V6 "Atlas" | Dec 2025 | AI per level | Archived |
| V8 "Arbiter" | Dec 2025 | Ask upfront + AI nav | Archived |
| V9 | Dec 2025 | AI-first + guardrails | Archived |
| **Current** | Dec 30, 2025 | Semantic search | ✅ Production |

Old architecture docs are in `docs/archive/` for reference.
