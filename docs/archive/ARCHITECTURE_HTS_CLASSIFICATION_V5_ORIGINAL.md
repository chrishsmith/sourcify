# HTS Classification System Architecture

> **Created:** December 23, 2025  
> **Last Modified:** December 24, 2025  
> **Status:** ✅ COMPLETE - All phases implemented + UI wired up  
> **Owner:** Core Platform

---

## Overview

The HTS Classification System is our core engine for accurately classifying products into Harmonized Tariff Schedule codes. It uses a combination of:

1. **Local HTS Database** - Complete US HTS schedule stored locally for fast queries
2. **AI Inference Engine** - Extracts product attributes from user descriptions
3. **Smart Matching** - Maps inferred attributes to HTS codes with transparency
4. **Guided Refinement** - Optional questions to increase accuracy (not forced)

### Design Philosophy

> **"Infer First, Ask Later"**

- Don't force users to answer questions upfront
- Show best match with confidence + assumptions
- Offer refinement as opt-in
- Be transparent about what was inferred vs. assumed

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        HTS CLASSIFICATION SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  DATA LAYER: Local HTS Database                                              ││
│  │  ═══════════════════════════════════════════════════════════════════════════││
│  │                                                                              ││
│  │  Source: USITC Official HTS Excel Publication                               ││
│  │  Updated: Annually (January) + mid-year revisions                           ││
│  │                                                                              ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐    ││
│  │  │  HtsCode Table (~50,000+ records)                                    │    ││
│  │  │                                                                     │    ││
│  │  │  • Full hierarchy: Chapter → Heading → Subheading → Statistical    │    ││
│  │  │  • Duty rates (general, special, column 2)                         │    ││
│  │  │  • Units of quantity                                                │    ││
│  │  │  • AI-extracted keywords per code                                   │    ││
│  │  │  • Parent-child relationships for tree navigation                  │    ││
│  │  └─────────────────────────────────────────────────────────────────────┘    ││
│  │                                                                              ││
│  │  Sync: Smart - checks USITC for new revisions before importing             ││
│  │  Trigger: GET /api/hts/sync checks availability, POST only runs if needed  ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  INFERENCE ENGINE                                                            ││
│  │  ═══════════════════════════════════════════════════════════════════════════││
│  │                                                                              ││
│  │  INPUT: "white cotton tshirt from China"                                    ││
│  │                                                                              ││
│  │  1. AI EXTRACTION (Grok)                                                    ││
│  │     ┌───────────────────────────────────────────────────────────────┐       ││
│  │     │ Extracted:                                                     │       ││
│  │     │ • productType: "t-shirt" (stated)                             │       ││
│  │     │ • material: "cotton" (stated)                                  │       ││
│  │     │ • color: "white" (stated, not HTS-relevant)                   │       ││
│  │     │ • construction: "knit" (inferred - 95% of t-shirts)           │       ││
│  │     │ • gender: unknown                                              │       ││
│  │     └───────────────────────────────────────────────────────────────┘       ││
│  │                                                                              ││
│  │  2. CANDIDATE SEARCH                                                        ││
│  │     ┌───────────────────────────────────────────────────────────────┐       ││
│  │     │ Query HtsCode table for:                                       │       ││
│  │     │ • Keywords matching "t-shirt", "cotton", "knit"               │       ││
│  │     │ • Chapter 61 (knit apparel) or 62 (woven apparel)             │       ││
│  │     │ • Returns all matching codes with hierarchy                   │       ││
│  │     └───────────────────────────────────────────────────────────────┘       ││
│  │                                                                              ││
│  │  3. ATTRIBUTE MATCHING                                                      ││
│  │     ┌───────────────────────────────────────────────────────────────┐       ││
│  │     │ For each candidate code, score based on:                       │       ││
│  │     │ • Stated attributes (high weight)                              │       ││
│  │     │ • Inferred attributes (medium weight)                          │       ││
│  │     │ • Assumed attributes (low weight, penalize confidence)        │       ││
│  │     └───────────────────────────────────────────────────────────────┘       ││
│  │                                                                              ││
│  │  4. CONFIDENCE CALCULATION                                                  ││
│  │     ┌───────────────────────────────────────────────────────────────┐       ││
│  │     │ Base confidence: 50%                                           │       ││
│  │     │ + Stated material matches: +20%                                │       ││
│  │     │ + Stated product type: +15%                                    │       ││
│  │     │ + Inferred construction: +10%                                  │       ││
│  │     │ - Gender assumed: -5%                                          │       ││
│  │     │ = Final confidence: 85%                                        │       ││
│  │     └───────────────────────────────────────────────────────────────┘       ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  OUTPUT: Classification Result                                               ││
│  │  ═══════════════════════════════════════════════════════════════════════════││
│  │                                                                              ││
│  │  {                                                                          ││
│  │    bestMatch: {                                                             ││
│  │      code: "6109.10.00.12",                                                 ││
│  │      description: "T-shirts, knit, cotton ≥50%, men's",                    ││
│  │      confidence: 85                                                         ││
│  │    },                                                                       ││
│  │    hierarchy: [                                                             ││
│  │      { level: "chapter", code: "61", description: "Knit apparel" },        ││
│  │      { level: "heading", code: "6109", description: "T-shirts..." },       ││
│  │      { level: "subheading", code: "6109.10", description: "Of cotton" },   ││
│  │      { level: "statistical", code: "6109.10.00.12", description: "Men's" } ││
│  │    ],                                                                       ││
│  │    attributes: {                                                            ││
│  │      confirmed: { material: "cotton", productType: "t-shirt" },            ││
│  │      inferred: { construction: "knit" },                                    ││
│  │      assumed: { gender: "men's" }                                          ││
│  │    },                                                                       ││
│  │    rateRange: { min: 16.5, max: 16.5 },  // Same for all cotton t-shirts  ││
│  │    refinementQuestions: [                                                   ││
│  │      { id: "gender", question: "Who is this for?", impact: "low" }         ││
│  │    ],                                                                       ││
│  │    alternatives: [ ... ]  // Other possible codes                          ││
│  │  }                                                                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model

### HtsCode Table

```prisma
model HtsCode {
  id              String   @id @default(cuid())
  
  // Code structure
  code            String   @unique  // "6109100012" (10 digits, no dots)
  codeFormatted   String             // "6109.10.00.12" (with dots for display)
  level           HtsLevel           // chapter, heading, subheading, tariff_line, statistical
  
  // Hierarchy
  parentCode      String?            // "61091000" for "6109100012"
  chapter         String             // "61"
  heading         String?            // "6109"
  subheading      String?            // "610910"
  
  // Description
  description     String   @db.Text
  indent          Int      @default(0)  // Indentation level in HTS (0-4)
  
  // Duty rates
  generalRate     String?            // "16.5%" or "Free" or "2.4¢/kg + 5.6%"
  specialRates    String?  @db.Text  // "Free (AU, BH, CL, CO, IL, JO, KR...)"
  column2Rate     String?            // Usually higher rate for non-NTR countries
  units           String?            // "doz" or "kg" or "No."
  
  // Parsed rates for calculations
  adValoremRate   Float?             // 16.5 (just the percentage part)
  specificRate    Float?             // 2.4 (cents/amount per unit)
  specificUnit    String?            // "kg", "doz", etc.
  
  // AI-extracted metadata (populated on import)
  keywords        String[]           // ["cotton", "t-shirt", "knit", "apparel"]
  productCategory String?            // "apparel", "electronics", "kitchenware"
  
  // Parent groupings - intermediate HTS indent text (captured from Excel)
  // e.g., ["Men's or boys'", "T-shirts"] or ["Other", "Rotary rock drill bits..."]
  parentGroupings String[]           // Displayed as [Group1 › Group2] in UI
  
  // Effective dates
  effectiveDate   DateTime?
  expirationDate  DateTime?
  
  // Sync metadata
  lastSynced      DateTime @default(now())
  sourceRevision  String?            // "2025 HTSA Rev 1"
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([chapter])
  @@index([heading])
  @@index([parentCode])
  @@index([level])
  @@index([keywords])
  @@map("hts_code")
}

enum HtsLevel {
  chapter         // 2-digit: "61"
  heading         // 4-digit: "6109"
  subheading      // 6-digit: "610910"
  tariff_line     // 8-digit: "61091000"
  statistical     // 10-digit: "6109100012"
}
```

---

## HTS Data Source

### USITC Official Publication

The US International Trade Commission publishes the official Harmonized Tariff Schedule:

**URL:** https://hts.usitc.gov/

**Available formats:**
- PDF (official, all chapters)
- **Excel** (structured, parseable) ← **Our source**
- Chapter-by-chapter downloads

**Update schedule:**
- Major revision: January 1st annually
- Mid-year revisions: As needed (typically 1-2 per year)
- Emergency changes: Rare, usually via Federal Register first

### Sync Process

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  HTS DATA SYNC PROCESS                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. DOWNLOAD                                                                 │
│     • Check USITC website for latest revision date                          │
│     • If newer than our lastSynced, download Excel file                     │
│     • Store locally in /data/hts/ directory                                 │
│                                                                              │
│  2. PARSE                                                                    │
│     • Read Excel file (xlsx)                                                │
│     • Extract: code, description, rates, units, indent                      │
│     • Build hierarchy relationships (parent-child)                          │
│     • Extract keywords using AI for each code                               │
│                                                                              │
│  3. LOAD                                                                     │
│     • Upsert all records to HtsCode table                                   │
│     • Mark deleted codes as expired (don't hard delete)                     │
│     • Update lastSynced timestamp                                           │
│                                                                              │
│  4. VERIFY                                                                   │
│     • Count records by level                                                │
│     • Spot-check a few known codes                                          │
│     • Log any parsing errors                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### File Structure

```
/data/hts/
├── raw/
│   └── hts_2025_rev1.xlsx       # Downloaded USITC file
├── parsed/
│   └── hts_2025_rev1.json       # Parsed JSON (for reference)
└── sync_log.json                 # Sync history
```

---

## Classification Flow

### Phase 1: Input Processing

```typescript
interface ClassificationInput {
  productDescription: string;      // Required: "white cotton tshirt"
  materialComposition?: string;    // Optional: "100% cotton"
  countryOfOrigin: string;         // Required: "CN"
  intendedUse?: string;            // Optional: "casual wear"
  unitValue?: number;              // Optional: 4.50
  quantity?: number;               // Optional: 1000
}
```

### Phase 2: AI Extraction

The AI extracts structured attributes from the free-text description:

```typescript
interface ExtractedAttributes {
  productType: { value: string; source: 'stated' | 'inferred' };
  material: { value: string; source: 'stated' | 'inferred' } | null;
  construction: { value: string; source: 'stated' | 'inferred' } | null;
  gender: { value: string; source: 'stated' | 'inferred' } | null;
  dimensions: { value: string; source: 'stated' | 'inferred' } | null;
  // ... other attributes based on product type
}
```

### Phase 3: Candidate Search

Query the local HtsCode database:

```sql
SELECT * FROM hts_code 
WHERE 
  level = 'statistical' 
  AND (
    keywords @> ARRAY['t-shirt', 'cotton']
    OR description ILIKE '%t-shirt%'
  )
ORDER BY 
  -- Prioritize exact keyword matches
  (SELECT COUNT(*) FROM unnest(keywords) k WHERE k IN ('t-shirt', 'cotton')) DESC
LIMIT 50;
```

### Phase 4: Attribute Matching & Scoring

For each candidate code, calculate a match score:

```typescript
function calculateMatchScore(
  code: HtsCode,
  extracted: ExtractedAttributes
): MatchScore {
  let score = 0;
  let confidence = 50; // Base confidence
  
  // Check material match
  if (extracted.material?.value === 'cotton' && code.description.includes('cotton')) {
    score += 30;
    if (extracted.material.source === 'stated') {
      confidence += 20;
    } else {
      confidence += 10;
    }
  }
  
  // Check product type match
  if (code.keywords.includes('t-shirt')) {
    score += 25;
    confidence += 15;
  }
  
  // ... more attribute checks
  
  return { score, confidence, assumptions: [] };
}
```

### Phase 5: Result Assembly

```typescript
interface ClassificationResult {
  bestMatch: {
    code: string;
    codeFormatted: string;
    description: string;
    confidence: number;
  };
  
  hierarchy: HtsHierarchyLevel[];
  
  attributes: {
    confirmed: Record<string, string>;  // From user input
    inferred: Record<string, string>;   // High-confidence inference
    assumed: Record<string, string>;    // Low-confidence, could be wrong
  };
  
  dutyInfo: {
    baseRate: string;
    adValoremRate: number | null;
    rateRange: { min: number; max: number } | null;
  };
  
  refinementQuestions: {
    id: string;
    question: string;
    options: { value: string; label: string; leadsTo?: string }[];
    impact: 'high' | 'medium' | 'low';  // How much it affects the rate
  }[];
  
  alternatives: {
    code: string;
    description: string;
    confidence: number;
    differentiator: string;  // Why this might be right instead
  }[];
  
  justification: ClassificationJustification;
}
```

---

## Justification Output

Similar to Zonos, we generate human-readable justification:

```typescript
interface ClassificationJustification {
  summary: string;
  // "Cotton t-shirt classified under Chapter 61 (knit apparel), 
  //  Heading 6109 (T-shirts), Subheading 6109.10 (of cotton)"
  
  decisionPath: {
    level: string;
    code: string;
    description: string;
    reasoning: string;
    source: 'stated' | 'inferred' | 'assumed';
  }[];
  
  exclusions: {
    code: string;
    description: string;
    whyExcluded: string;
  }[];
  
  assumptions: {
    attribute: string;
    assumed: string;
    reasoning: string;
    impact: string;  // "If synthetic, rate would be 32% instead of 16.5%"
  }[];
}
```

**Example output:**

```
CLASSIFICATION JUSTIFICATION FOR 6109.10.00.12

This product is classified as a T-shirt under HTS 6109.10.00.12.

DECISION PATH:
• Chapter 61: Articles of apparel, knitted or crocheted
  Reasoning: T-shirts are knit garments, not woven (you stated "tshirt")
  
• Heading 6109: T-shirts, singlets, tank tops and similar garments
  Reasoning: Product type matches heading description
  
• Subheading 6109.10: Of cotton
  Reasoning: You stated "cotton" as the material
  
• Statistical 6109.10.00.12: Men's
  Reasoning: Assumed men's (not specified); all cotton t-shirt codes have same rate

EXCLUSIONS:
• 6109.90 (Of other textile materials): Excluded because you stated cotton
• Chapter 62 (Woven apparel): Excluded because t-shirts are typically knit

ASSUMPTIONS:
• Gender: Assumed "men's" 
  Impact: Does not affect duty rate (all cotton t-shirts are 16.5%)
```

---

## API Endpoints

### POST /api/classify-v5

Main classification endpoint using the new system.

```typescript
// Request
{
  productDescription: "white cotton tshirt",
  countryOfOrigin: "CN",
  materialComposition?: "100% cotton",
  intendedUse?: "casual wear",
  unitValue?: 4.50
}

// Response
{
  success: true,
  result: ClassificationResult
}
```

### GET /api/hts/[code]

Fetch details for a specific HTS code.

```typescript
// Response
{
  code: "6109100012",
  codeFormatted: "6109.10.00.12",
  description: "T-shirts, singlets...",
  hierarchy: [...],
  generalRate: "16.5%",
  siblings: [...],  // Other codes at same level
  children: [...]   // Sub-codes if not at statistical level
}
```

### GET /api/hts/search?q=tshirt

Search HTS codes by keyword.

```typescript
// Response
{
  results: [
    { code: "6109", description: "T-shirts, singlets...", level: "heading" },
    { code: "6109.10", description: "Of cotton", level: "subheading" },
    // ...
  ]
}
```

### POST /api/hts/sync

Trigger HTS database sync (admin only).

```typescript
// Response
{
  success: true,
  recordsUpdated: 17234,
  recordsAdded: 45,
  recordsExpired: 12,
  duration: "2m 34s"
}
```

---

## Implementation Status

### Phase 1: Data Foundation ✅ COMPLETE (Dec 23, 2025)

| Task | Status | Notes |
|------|--------|-------|
| Add HtsCode model to Prisma | ✅ | `HtsCode` + `HtsSyncLog` + `HtsRevision` models |
| Build HTS Excel parser | ✅ | `htsImport.ts` - parses USITC xlsx |
| Build HTS import service | ✅ | `htsImport.ts` - loads to database |
| Build hierarchy query service | ✅ | `htsDatabase.ts` - full query utilities |
| Build API endpoints | ✅ | `/api/hts/sync`, `/api/hts/search`, `/api/hts/[code]` |
| Smart revision checking | ✅ | `htsRevisionChecker.ts` - only sync when USITC updates |
| Dynamic search variations | ✅ | Handles hyphen/space differences automatically |
| **Initial data load** | ✅ | **30,115 HTS codes imported** |

**Database Stats (Dec 23, 2025):**
| Level | Count |
|-------|-------|
| Headings (4-digit) | 961 |
| Subheadings (6-digit) | 2,093 |
| Tariff Lines (8-digit) | 7,293 |
| Statistical (10-digit) | 19,768 |
| **Total** | **30,115** |

### Phase 2: Inference Engine ✅ COMPLETE (Dec 23, 2025)

| Task | Status | Notes |
|------|--------|-------|
| AI attribute extraction | ✅ | `inferenceEngineV5.ts` using Grok |
| Candidate search | ✅ | Multi-strategy search across local HTS DB |
| Attribute matching | ✅ | Scores candidates, tracks stated/inferred/assumed |
| Confidence calculation | ✅ | Based on attribute sources + score gap |

### Phase 3: API & Justification ✅ COMPLETE (Dec 23, 2025)

| Task | Status | Notes |
|------|--------|-------|
| POST /api/classify-v5 | ✅ | Full "infer first, ask later" endpoint |
| POST /api/classify-v5/infer | ✅ | Test endpoint for inference only |
| Justification generator | ✅ | `justificationGenerator.ts` - Zonos-style |
| Optional questions | ✅ | Only shown when they'd change outcome |

---

## File Locations

```
prisma/
└── schema.prisma              # HtsCode + HtsSyncLog models ✅

src/
├── services/
│   ├── htsDatabase.ts         # ✅ HTS query service (utilities + DB queries)
│   ├── htsImport.ts           # ✅ Excel parser + database loader
│   ├── classificationEngineV5.ts # 🔲 TODO: New engine using local DB
│   └── ...existing services
├── app/
│   └── api/
│       ├── hts/
│       │   ├── [code]/route.ts  # ✅ Get HTS code details + hierarchy
│       │   ├── search/route.ts  # ✅ Search HTS codes by keyword
│       │   └── sync/route.ts    # ✅ Trigger import from Excel
│       └── classify-v5/route.ts # 🔲 TODO: New classification API
└── data/
    └── hts/                     # ✅ Created
        ├── raw/                 # Place USITC Excel files here
        └── parsed/              # JSON exports (optional)
```

---

## References

- [USITC HTS Online](https://hts.usitc.gov/)
- [USITC HTS API Docs](https://hts.usitc.gov/api)
- [DESIGN_GUIDED_CLASSIFICATION.md](./DESIGN_GUIDED_CLASSIFICATION.md)
- [ARCHITECTURE_TARIFF_REGISTRY.md](./ARCHITECTURE_TARIFF_REGISTRY.md)

---

*This document is a living spec. Update as implementation progresses.*

**Last updated:** December 23, 2025

