# Sourcify Architecture Overview

> **Last Updated:** January 2026  
> **Status:** Active Development

---

## System Overview

Sourcify is a Next.js application providing AI-powered trade intelligence. The system combines:

- **Semantic search** over 27,000+ HTS codes
- **Real-time tariff calculation** from multiple data sources
- **Country-by-country sourcing analysis** with USITC trade data

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SOURCIFY ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐         │
│  │   Next.js UI    │      │   API Routes    │      │    Services     │         │
│  │  (App Router)   │ ───▶ │  /api/classify  │ ───▶ │ Classification  │         │
│  │                 │      │  /api/sourcing  │      │ TariffRegistry  │         │
│  │  Ant Design     │      │  /api/tariff-*  │      │ LandedCost      │         │
│  │  Tailwind       │      │                 │      │ Sourcing        │         │
│  └─────────────────┘      └─────────────────┘      └────────┬────────┘         │
│                                                              │                  │
│                           ┌──────────────────────────────────┼──────────────────┤
│                           │                                  ▼                  │
│                           │         ┌─────────────────────────────┐            │
│                           │         │      DATA LAYER             │            │
│                           │         │                             │            │
│                           │         │  PostgreSQL (Neon)          │            │
│                           │         │  ├── HTS Codes (30K+)       │            │
│                           │         │  ├── pgvector embeddings    │            │
│                           │         │  ├── Tariff Profiles (199)  │            │
│                           │         │  ├── Users & Products       │            │
│                           │         │  └── Search History         │            │
│                           │         │                             │            │
│                           │         └─────────────────────────────┘            │
│                           │                                                     │
│                           │         ┌─────────────────────────────┐            │
│                           │         │    EXTERNAL SERVICES        │            │
│                           │         │                             │            │
│                           │         │  xAI (Grok) - Classification│            │
│                           │         │  OpenAI - Embeddings        │            │
│                           │         │  USITC - Trade Stats        │            │
│                           │         │  Better Auth - Auth         │            │
│                           │         └─────────────────────────────┘            │
│                           │                                                     │
└───────────────────────────┴─────────────────────────────────────────────────────┘
```

---

## Core Services

### 1. Classification Engine (V10)

**File:** `src/services/classification/engine-v10.ts`

The classification engine uses semantic search over pre-computed HTS embeddings:

1. **Input Processing** — Extract product type, materials, intended use
2. **Query Enrichment** — Add context (e.g., "planter" → "household container pot")
3. **Semantic Search** — pgvector cosine similarity over 27K embeddings
4. **Scoring** — Boost exact matches, penalize material conflicts
5. **Conditional Detection** — Identify value/size-dependent codes

**Performance:** ~4 seconds per classification (vs 20-30s with pure LLM)

### 2. Country Tariff Registry

**File:** `src/services/tariff/registry.ts`

Single source of truth for all tariff data. All other services consume this.

**Data Sources:**
- USITC HTS API (Chapter 99 rates)
- Federal Register (policy changes)
- OFAC (sanctions)
- FTA list (20 trade agreements)
- AD/CVD orders

**Key Functions:**

```typescript
getTariffProfile(countryCode)    // Full country tariff info
getEffectiveTariff(country, hts) // Total duty rate with breakdown
```

### 3. Landed Cost Calculator

**File:** `src/services/sourcing/landed-cost.ts`

Calculates full landed cost by country:
- Product cost (from USITC import data)
- Shipping estimates
- Tariff breakdown (all layers)
- Customs fees (MPF, HMF)

### 4. Sourcing Advisor

**File:** `src/services/sourcing/advisor.ts`

Compares sourcing options across countries with savings calculations.

---

## Data Flow: Classification Request

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         CLASSIFICATION FLOW                                   │
└──────────────────────────────────────────────────────────────────────────────┘

  User Input                API Route                    Services
  ─────────                ─────────                    ────────
      │                        │                           │
      │  "ceramic coffee mug"  │                           │
      │───────────────────────▶│                           │
      │                        │    classifyProduct()      │
      │                        │──────────────────────────▶│
      │                        │                           │
      │                        │                    ┌──────┴──────┐
      │                        │                    │  1. Enrich  │
      │                        │                    │     query   │
      │                        │                    └──────┬──────┘
      │                        │                           │
      │                        │                    ┌──────┴──────┐
      │                        │                    │  2. Vector  │
      │                        │                    │    search   │
      │                        │                    │  (pgvector) │
      │                        │                    └──────┬──────┘
      │                        │                           │
      │                        │                    ┌──────┴──────┐
      │                        │                    │  3. Score & │
      │                        │                    │     rank    │
      │                        │                    └──────┬──────┘
      │                        │                           │
      │                        │                    ┌──────┴──────┐
      │                        │                    │  4. Tariff  │
      │                        │                    │    lookup   │
      │                        │                    └──────┬──────┘
      │                        │                           │
      │                        │◀──────────────────────────│
      │                        │                           │
      │◀───────────────────────│                           │
      │                        │                           │
      │  HTS: 6912.00.44.00    │                           │
      │  Confidence: 95%       │                           │
      │  Duty: 9.8% + 10% IEEPA│                           │
```

---

## Database Schema (Key Models)

| Model | Purpose |
|-------|---------|
| `User` | Auth, subscription tier, usage tracking |
| `HtsCode` | 30K+ HTS codes with embeddings |
| `CountryTariffProfile` | Tariff data for 199 countries |
| `TariffProgram` | Section 301, IEEPA, etc. programs |
| `SearchHistory` | Classification audit trail |
| `SavedProduct` | User's product library |
| `TariffAlert` | Monitoring subscriptions |

See `prisma/schema.prisma` for full schema.

---

## Key Design Decisions

### Why Semantic Search (pgvector)?

- **Speed:** 4s vs 20-30s for pure LLM classification
- **Cost:** ~$0.02/1000 queries vs $30/1000 for LLM-per-query
- **Consistency:** Same input = same output

### Why Single Tariff Registry?

- **Consistency:** All services show same rates
- **Maintainability:** One place to update tariff logic
- **Accuracy:** Central source for complex rate stacking

### Why Next.js App Router?

- **Full-stack:** API routes + React in one repo
- **Performance:** Server components, streaming
- **DX:** File-based routing, TypeScript support

---

## Detailed Architecture Docs

| Document | Description |
|----------|-------------|
| [HTS Classification](architecture/hts-classification.md) | V10 engine design, embedding strategy |
| [Tariff Registry](architecture/tariff-registry.md) | Data sources, sync logic |
| [Tariff Monitoring](architecture/tariff-monitoring.md) | Alert system design |
| [Duty Optimizer](architecture/duty-optimizer.md) | Exhaustive code finder (planned) |

---

## External Data Sources

### Active (Integrated)

| Source | Data | Update Frequency |
|--------|------|------------------|
| USITC HTS Excel | 30K+ HTS codes | On USITC revision |
| USITC DataWeb API | Import volumes, values | Real-time |
| Federal Register | Policy changes, EOs | Daily sync |
| OFAC | Sanctions list | Weekly |
| USTR | FTA list | Monthly |

### Planned

| Source | Data | Use Case |
|--------|------|----------|
| CBP CROSS | Rulings database | Classification support |
| Census Bureau | Port-level stats | Market intelligence |
| FDA/CPSC | Safety alerts | Compliance screening |

---

## Infrastructure

| Component | Technology | Purpose |
|-----------|------------|---------|
| Hosting | Vercel | Next.js deployment |
| Database | Neon | Serverless PostgreSQL |
| Vector Search | pgvector | HTS embeddings |
| Auth | Better Auth | Email + OAuth |
| File Upload | UploadThing | CSV bulk uploads |

### Future Additions

- **Redis/Vercel KV** — Caching for <1s response times
- **Inngest** — Background jobs (monitoring, emails)
- **Resend** — Transactional emails
- **Stripe** — Subscription billing

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/classify-v10` | POST | HTS classification |
| `/api/tariff-registry/sync` | POST | Sync tariff data |
| `/api/sourcing/analyze` | POST | Full sourcing analysis |
| `/api/sourcing/landed-cost` | GET | Landed cost calculation |
| `/api/saved-products` | GET/POST | Product library |
| `/api/tariff-alerts` | GET/POST | Alert management |

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Classification latency | <5s | ~4s |
| Sourcing analysis | <3s | ~2s |
| Page load (dashboard) | <2s | TBD |
| API error rate | <1% | TBD |

---

*For implementation details, see the specific architecture docs in `docs/architecture/`.*
