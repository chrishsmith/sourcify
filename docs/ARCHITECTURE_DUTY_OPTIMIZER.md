# Duty Optimizer Architecture

> **Version:** 1.0.0  
> **Created:** January 2, 2026  
> **Status:** Design Complete, Ready for Implementation  
> **Tier:** PRO Feature

---

## 📋 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2, 2026 | Team | Initial architecture design |

---

## 🎯 Overview

### What Is Duty Optimizer?

**Duty Optimizer** is a PRO-tier feature that performs exhaustive HTS code analysis to find ALL potentially applicable codes for a product, helping users identify the classification with the most favorable duty rate.

### The Problem It Solves

Current classification tools (including our free Classify feature) answer: **"What's the BEST match for my product?"**

But importers often need: **"What are ALL the codes that COULD apply, so I can choose the best one for my situation?"**

This is exactly what customs attorneys do:
1. Understand the product deeply (material, size, cost, use, etc.)
2. Search broadly across headings for any applicable codes
3. Drill down through the hierarchy
4. Analyze conditions that make each code applicable
5. Find the code with the lowest duty that legitimately applies

**Duty Optimizer automates this process.**

### Key Differentiators

| Classify (FREE) | Duty Optimizer (PRO) |
|-----------------|----------------------|
| Fast (~4-6 seconds) | Thorough (~15-30 seconds) |
| Best match + ~5 alternatives | ALL applicable codes (10-20+) |
| Raw HTS descriptions | AI-translated plain English |
| Basic confidence scores | Condition extraction + applicability |
| Minimal questions | Smart questions based on all options |
| Single country duty | Comparative duty analysis |

---

## 👤 User Personas

| Persona | Use Case | Value Proposition |
|---------|----------|-------------------|
| **Importer/Brand Owner** | "Am I using the right code? Could I pay less?" | Find savings opportunities |
| **Compliance Officer** | "Are there other codes CBP might argue?" | Defensibility analysis |
| **Customs Broker** | "Show client all options" | Client advisory tool |
| **Product Developer** | "What if I change the material/design?" | Pre-production planning |

---

## 🏗️ System Architecture

### Dual-Layer Engine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           DUTY OPTIMIZER SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: V10 SEMANTIC ENGINE (existing)                                │   │
│  │                                                                          │   │
│  │  Input: Product description                                              │   │
│  │    ↓                                                                     │   │
│  │  Semantic search against 27,061 HTS embeddings                          │   │
│  │    ↓                                                                     │   │
│  │  Initial candidate pool: 10-30 codes                                    │   │
│  │    ↓                                                                     │   │
│  │  Sibling expansion: Add all codes under same heading/subheading         │   │
│  │    ↓                                                                     │   │
│  │  Expanded pool: 30-50 codes                                             │   │
│  │                                                                          │   │
│  │  ⚡ Performance: ~4 seconds, no AI calls                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 2: AI ANALYSIS ENGINE (new, PRO only)                            │   │
│  │                                                                          │   │
│  │  2a. PRODUCT INTERPRETATION                                              │   │
│  │      AI deeply analyzes user's product:                                  │   │
│  │      - Material composition                                              │   │
│  │      - Intended use (household, commercial, industrial)                  │   │
│  │      - Value range                                                       │   │
│  │      - Size/quantity characteristics                                     │   │
│  │      - Key features that affect classification                           │   │
│  │                                                                          │   │
│  │  2b. HEADING EXPANSION                                                   │   │
│  │      AI identifies other potentially relevant headings:                  │   │
│  │      "This ceramic planter could also be in Chapter 39 if plastic parts" │   │
│  │      → Search additional headings                                        │   │
│  │      → Add to candidate pool                                             │   │
│  │                                                                          │   │
│  │  2c. CONDITION EXTRACTION                                                │   │
│  │      For each candidate code, extract applicability conditions:          │   │
│  │      - Value thresholds ("valued not over $38")                          │   │
│  │      - Material requirements ("chief weight cotton")                     │   │
│  │      - Use requirements ("for household use")                            │   │
│  │      - Size/quantity thresholds                                          │   │
│  │                                                                          │   │
│  │  2d. PLAIN ENGLISH TRANSLATION                                           │   │
│  │      Convert HTS legalese to human-readable descriptions:                │   │
│  │      "Other articles of plastics and articles of other materials        │   │
│  │       of headings 3901 to 3914, n.e.s.o.i."                              │   │
│  │                    ↓                                                     │   │
│  │      "Catch-all for plastic items not covered elsewhere -                │   │
│  │       household goods, containers, miscellaneous plastic products."      │   │
│  │                                                                          │   │
│  │  2e. QUESTION GENERATION                                                 │   │
│  │      Based on conditions found, generate targeted questions:             │   │
│  │      - "What is the value per unit?"                                     │   │
│  │      - "Is this for home or commercial use?"                             │   │
│  │      - "What percentage is cotton vs synthetic?"                         │   │
│  │                                                                          │   │
│  │  🤖 Performance: ~10-20 seconds, AI calls per query                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 3: COMPARISON & OUTPUT                                           │   │
│  │                                                                          │   │
│  │  For each applicable code:                                               │   │
│  │  - Duty rate from current country of origin                              │   │
│  │  - Full tariff breakdown (MFN + 301 + IEEPA + etc.)                     │   │
│  │  - Savings vs. other codes                                               │   │
│  │  - Applicability score (how likely this code fits)                       │   │
│  │                                                                          │   │
│  │  Output: Ranked list of all applicable codes with full analysis          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
USER INPUT
├── Product description (required)
├── Country of origin (required)
├── Unit value (optional - enables value-based filtering)
├── Intended use (optional)
└── Material composition (optional)
          │
          ▼
┌─────────────────────────────────────┐
│  LAYER 1: V10 SEMANTIC SEARCH       │
│  • Query embeddings                  │
│  • Get initial candidates            │
│  • Expand to siblings                │
└─────────────────────────────────────┘
          │
          ▼ (30-50 candidate codes)
┌─────────────────────────────────────┐
│  LAYER 2: AI ANALYSIS               │
│  • Interpret product                 │
│  • Expand to other headings          │
│  • Extract conditions                │
│  • Translate to plain English        │
│  • Generate questions                │
└─────────────────────────────────────┘
          │
          ▼ (enriched candidates)
┌─────────────────────────────────────┐
│  LAYER 3: COMPARISON                │
│  • Calculate duties per code         │
│  • Rank by applicability             │
│  • Calculate savings                 │
└─────────────────────────────────────┘
          │
          ▼
OUTPUT: Complete analysis with all applicable codes
```

---

## 🎨 User Interface Design

### Entry Points

| Entry Point | Location | Trigger |
|-------------|----------|---------|
| **From Classify** | Classification results | "💡 X more codes may apply → [Analyze with Duty Optimizer]" |
| **From My Products** | Product row/card | "Optimize" button |
| **Direct Access** | Main navigation | "Duty Optimizer" nav item |
| **From Sourcing** | After country analysis | "Optimize classification for [country]" |

### Navigation Placement

```
Dashboard Navigation:
├── Overview
├── Classify          ← FREE
├── My Products       ← Monitoring is PRO
├── Duty Optimizer    ← PRO (NEW)
├── Sourcing          ← PRO
├── Feature Lab
└── Settings
```

### Main Interface Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  DUTY OPTIMIZER                                                    [? Help]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─ PRODUCT INPUT ─────────────────────────────────────────────────────────────┐│
│  │                                                                              ││
│  │  Describe your product:                                                      ││
│  │  ┌────────────────────────────────────────────────────────────────────────┐ ││
│  │  │ Ceramic coffee mug, hand-painted, 12 oz capacity, $15 retail          │ ││
│  │  └────────────────────────────────────────────────────────────────────────┘ ││
│  │                                                                              ││
│  │  Country of Origin: [China ▼]     Unit Value: [$15.00]  (optional)          ││
│  │                                                                              ││
│  │  [🔍 Find All Applicable Codes]                                              ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════════ │
│                                                                                  │
│  ┌─ SMART QUESTIONS (helps narrow down) ───────────────────────────────────────┐│
│  │                                                                              ││
│  │  Based on your product, please clarify:                                      ││
│  │                                                                              ││
│  │  1. What is the value per piece?                                             ││
│  │     ○ $38 or less  ○ More than $38  ○ Not sure                              ││
│  │                                                                              ││
│  │  2. Is this for household or commercial use?                                 ││
│  │     ○ Household/consumer  ○ Hotel/restaurant  ○ Industrial  ○ Not sure      ││
│  │                                                                              ││
│  │  [Update Results]                                                            ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════════ │
│                                                                                  │
│  FOUND 8 POTENTIALLY APPLICABLE CODES                          [Export CSV]     │
│                                                                                  │
│  Sort by: [Duty Rate ▼]  Filter: [Show All ▼]                                   │
│                                                                                  │
│  ┌─ BEST MATCH ────────────────────────────────────────────────────────────────┐│
│  │                                                                              ││
│  │  6912.00.35.10                                         DUTY: 29.5% 💰       ││
│  │  ──────────────────────────────────────────────────────────────────────────  ││
│  │                                                                              ││
│  │  📖 WHAT THIS CODE MEANS:                                                    ││
│  │  Ceramic tableware - mugs, cups, and similar items valued at $38 or less    ││
│  │  per piece. This is the standard code for consumer-grade ceramic drinkware. ││
│  │                                                                              ││
│  │  ✅ APPLIES IF:                                                              ││
│  │     • Made of ceramic (earthenware, stoneware, or similar)                  ││
│  │     • Value per piece is $38 or less                                        ││
│  │     • Designed for food/beverage use                                        ││
│  │                                                                              ││
│  │  💰 DUTY BREAKDOWN (from China):                                             ││
│  │     Base MFN Rate          4.5%                                             ││
│  │     + IEEPA Baseline      10.0%                                             ││
│  │     + Section 301 List 3  25.0%                                             ││
│  │     ─────────────────────────────                                           ││
│  │     TOTAL                 29.5% ← LOWEST RATE FOUND                         ││
│  │                                                                              ││
│  │  [Select This Code]  [View Full Hierarchy]  [Compare]                       ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─ ALTERNATIVE #1 ────────────────────────────────────────────────────────────┐│
│  │                                                                              ││
│  │  6912.00.44.00                                         DUTY: 44.8% ⚠️       ││
│  │  ──────────────────────────────────────────────────────────────────────────  ││
│  │                                                                              ││
│  │  📖 WHAT THIS CODE MEANS:                                                    ││
│  │  Ceramic tableware - mugs valued OVER $38 per piece. Premium/luxury items.  ││
│  │                                                                              ││
│  │  ⚠️ APPLIES IF:                                                              ││
│  │     • Value per piece EXCEEDS $38                                           ││
│  │     • If your mug is $15, this code does NOT apply                          ││
│  │                                                                              ││
│  │  💰 DUTY: 44.8% (+15.3% vs best match)                                       ││
│  │                                                                              ││
│  │  [View Details]  [Compare]                                                   ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─ ALTERNATIVE #2 (Different Heading) ────────────────────────────────────────┐│
│  │                                                                              ││
│  │  6912.00.48.00                                         DUTY: 33.0%          ││
│  │  ──────────────────────────────────────────────────────────────────────────  ││
│  │                                                                              ││
│  │  📖 WHAT THIS CODE MEANS:                                                    ││
│  │  Hotel or restaurant ware - commercial-grade ceramic designed for           ││
│  │  institutional use. Typically heavier, more durable construction.           ││
│  │                                                                              ││
│  │  ⚠️ APPLIES IF:                                                              ││
│  │     • Designed and marketed for commercial/hospitality use                  ││
│  │     • NOT applicable for standard consumer mugs                             ││
│  │                                                                              ││
│  │  💰 DUTY: 33.0% (+3.5% vs best match)                                        ││
│  │                                                                              ││
│  │  [View Details]  [Compare]                                                   ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  [+ Show 5 More Alternatives]                                                    │
│                                                                                  │
│  ═══════════════════════════════════════════════════════════════════════════════ │
│                                                                                  │
│  ┌─ SAVINGS SUMMARY ───────────────────────────────────────────────────────────┐│
│  │                                                                              ││
│  │  Best available rate: 29.5% (6912.00.35.10)                                 ││
│  │  Highest rate found:  44.8% (6912.00.44.00)                                 ││
│  │  Potential savings:   15.3% per shipment                                    ││
│  │                                                                              ││
│  │  💵 At $10,000 import value = $1,530 savings                                ││
│  │                                                                              ││
│  │  [Save Product to My Products]  [Run Sourcing Analysis]                     ││
│  │                                                                              ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Teaser in Classify Results (FREE)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [Existing Classification Result - 6912.00.44.00]                               │
│  ...                                                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  💡 OPTIMIZATION OPPORTUNITY                                         PRO 🔒     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  We found 7 other HTS codes that may apply to your product.                     │
│  One could save you up to 15.3% on duties.                                      │
│                                                                                  │
│  Preview:                                                                        │
│  • 6912.00.35.10 - Mugs valued ≤$38 → 29.5% duty (vs your 44.8%)              │
│                                                                                  │
│  [🔓 Unlock Full Analysis with Duty Optimizer]                                  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Design

### Endpoint

```
POST /api/duty-optimizer/analyze
```

### Request

```typescript
interface DutyOptimizerRequest {
  // Required
  productDescription: string;
  countryOfOrigin: string;  // ISO 2-letter code
  
  // Optional - enables smarter filtering
  unitValue?: number;
  intendedUse?: 'household' | 'commercial' | 'industrial' | 'unknown';
  materialComposition?: string;
  
  // Optional - for saved products
  savedProductId?: string;
  
  // Control flags
  includeQuestions?: boolean;  // Generate smart questions
  maxResults?: number;         // Limit results (default: 20)
}
```

### Response

```typescript
interface DutyOptimizerResponse {
  // Analysis metadata
  analysisId: string;
  analyzedAt: string;
  processingTimeMs: number;
  
  // Product interpretation
  productInterpretation: {
    summary: string;           // "Ceramic drinkware for household use"
    material: string;          // "Ceramic"
    use: string;               // "Household/consumer"
    valueCategory: string;     // "Under $38"
    keyFeatures: string[];     // ["hand-painted", "12 oz capacity"]
  };
  
  // Smart questions (if applicable)
  questions?: {
    id: string;
    question: string;
    options: {
      value: string;
      label: string;
      affectsCodeIds: string[];  // Which codes this answer affects
    }[];
    reason: string;  // Why we're asking
  }[];
  
  // All applicable codes
  applicableCodes: {
    htsCode: string;
    formattedCode: string;  // With dots
    
    // Interpretation
    rawDescription: string;
    plainEnglishDescription: string;
    
    // Applicability
    applicabilityScore: number;  // 0-100
    applicabilityReason: string;
    conditions: {
      condition: string;
      met: boolean | 'unknown';
      explanation: string;
    }[];
    
    // Duty info
    dutyBreakdown: {
      baseMfnRate: number;
      section301Rate: number;
      ieepaRate: number;
      fentanylRate: number;
      totalRate: number;
    };
    
    // Comparison
    savingsVsBest: number;      // Percentage points
    savingsVsWorst: number;
    
    // Hierarchy
    chapter: string;
    heading: string;
    subheading: string;
    chapterDescription: string;
    headingDescription: string;
  }[];
  
  // Summary
  summary: {
    totalCodesFound: number;
    bestRateCode: string;
    bestRate: number;
    worstRateCode: string;
    worstRate: number;
    potentialSavings: number;  // Percentage points
    dollarSavingsAt10k: number;
  };
}
```

---

## 🤖 AI Prompts

### Product Interpretation Prompt

```
You are an expert customs classifier analyzing a product for HTS code classification.

PRODUCT DESCRIPTION:
{productDescription}

ADDITIONAL INFO:
- Country of Origin: {countryOfOrigin}
- Unit Value: {unitValue || 'Not specified'}
- Intended Use: {intendedUse || 'Not specified'}

Analyze this product and provide:

1. MATERIAL: What is the primary material? (e.g., ceramic, plastic, metal, textile)

2. USE CATEGORY: What is the intended use?
   - Household/consumer
   - Commercial/hotel/restaurant
   - Industrial/technical
   - Agricultural
   
3. VALUE CATEGORY: Based on the value provided or typical market value:
   - Budget (under $10)
   - Mid-range ($10-50)
   - Premium ($50-200)
   - Luxury (over $200)

4. KEY FEATURES: List 3-5 features that affect HTS classification:
   - Size/capacity
   - Special treatments (hand-painted, glazed, etc.)
   - Components (handles, lids, etc.)
   - Intended user (children, professional, etc.)

5. POTENTIAL CHAPTERS: Which HTS chapters might this product fall under?
   List 2-4 chapters with brief reasoning.

Respond in JSON format.
```

### Condition Extraction Prompt

```
You are an expert at interpreting HTS (Harmonized Tariff Schedule) codes.

HTS CODE: {htsCode}
FULL DESCRIPTION: {concatenatedDescription}
PARENT GROUPINGS: {parentGroupings}

Extract the CONDITIONS that determine when this code applies:

1. VALUE CONDITIONS: Any value thresholds?
   - "valued not over $X"
   - "valued over $X"
   
2. MATERIAL CONDITIONS: Any material requirements?
   - "chief weight of cotton"
   - "containing X% or more"
   
3. USE CONDITIONS: Any use restrictions?
   - "for household use"
   - "for industrial use"
   - "hotel or restaurant ware"
   
4. SIZE/QUANTITY CONDITIONS: Any size restrictions?
   - "containing less than X"
   - "capacity of X or more"

5. OTHER CONDITIONS: Any other conditions?

For each condition found, provide:
- The exact condition
- How to verify (what documentation needed)
- Plain English explanation

Respond in JSON format.
```

### Plain English Translation Prompt

```
You are simplifying HTS code descriptions for non-experts.

HTS CODE: {htsCode}
OFFICIAL DESCRIPTION: {rawDescription}
CHAPTER: {chapterDescription}
HEADING: {headingDescription}

Translate this into plain English that a small business owner would understand.

Rules:
1. Avoid legal jargon
2. Give concrete examples
3. Explain what products typically use this code
4. Keep it under 50 words

Example input:
"Other articles of plastics and articles of other materials of headings 3901 to 3914, n.e.s.o.i."

Example output:
"Catch-all for plastic items not covered elsewhere - think: household containers, storage boxes, plastic organizers, and miscellaneous plastic goods."

Respond with just the plain English description.
```

---

## 📊 Database Considerations

### New Tables (Optional)

```prisma
// Cache AI interpretations to reduce API calls
model HtsInterpretation {
  id                    String   @id @default(cuid())
  htsCode               String   @unique
  
  plainEnglishDescription String  @db.Text
  conditions            Json     // Extracted conditions
  
  generatedAt           DateTime @default(now())
  generatedBy           String   // AI model used
  
  // Invalidation
  htsRevision           String   // Which HTS version this was generated for
  
  @@map("hts_interpretation")
}

// Track optimization sessions
model OptimizationSession {
  id                    String   @id @default(cuid())
  userId                String
  
  // Input
  productDescription    String   @db.Text
  countryOfOrigin       String
  unitValue             Float?
  
  // Results
  codesFound            Int
  bestCode              String
  bestRate              Float
  potentialSavings      Float
  
  // User action
  selectedCode          String?
  
  createdAt             DateTime @default(now())
  
  @@index([userId, createdAt])
  @@map("optimization_session")
}
```

### Using Existing Tables

- `HtsCode` - Source of all HTS codes and descriptions
- `CountryTariffProfile` - Duty rates by country
- `SavedProduct` - Link optimizations to saved products
- `UsageLog` - Track feature usage

---

## 🔄 Integration Points

### With Classify (FREE)

```typescript
// In classification results, check for optimization opportunity
const alternatives = classificationResult.alternatives;
const hasOptimizationOpportunity = alternatives.some(
  alt => alt.dutyRate < classificationResult.primaryCode.dutyRate
);

if (hasOptimizationOpportunity) {
  // Show teaser
  const bestAlt = alternatives.reduce((best, alt) => 
    alt.dutyRate < best.dutyRate ? alt : best
  );
  const savings = classificationResult.primaryCode.dutyRate - bestAlt.dutyRate;
}
```

### With My Products (PRO)

```typescript
// Add "Optimize" action to saved products
// Shows optimization status:
// - "Optimized" - user ran optimizer and selected a code
// - "Opportunities found" - optimizer found lower rates
// - "Not analyzed" - optimizer hasn't been run
```

### With Sourcing Intelligence (PRO)

```typescript
// After optimization, offer sourcing analysis
// "You found the best code. Now find the best country."
// Pre-populate sourcing with optimized HTS code
```

### With Tariff Monitoring (PRO)

```typescript
// Monitor ALL applicable codes, not just selected one
// Alert if: "A code you didn't select now has lower duty"
// Alert if: "New exclusion available for alternative code"
```

---

## 📈 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Conversion** | 10%+ of free users try optimizer | Teaser clicks / classifications |
| **Completion** | 60%+ complete full analysis | Sessions completed / started |
| **Value delivery** | 50%+ find lower rate | Sessions with savings > 0 |
| **Accuracy** | <5% user corrections | User selects different code than "best match" |
| **Performance** | <30 seconds | P95 response time |

---

## 🚀 Implementation Plan

### Phase 1: Foundation (Sprint 7)
- [ ] Create `/api/duty-optimizer/analyze` endpoint
- [ ] Implement Layer 1: Enhanced V10 with sibling expansion
- [ ] Implement Layer 2a: Product interpretation (AI)
- [ ] Create basic UI page structure

### Phase 2: Intelligence (Sprint 7-8)
- [ ] Implement Layer 2b: Heading expansion (AI)
- [ ] Implement Layer 2c: Condition extraction (AI)
- [ ] Implement Layer 2d: Plain English translation (AI)
- [ ] Build smart questions UI

### Phase 3: Polish (Sprint 8)
- [ ] Implement Layer 2e: Question generation
- [ ] Build full comparison UI
- [ ] Add teaser to Classify results
- [ ] Add to My Products integration
- [ ] Cache AI interpretations for common codes

### Phase 4: Enhancement (Future)
- [ ] CBP CROSS ruling integration
- [ ] Bulk optimization (analyze entire portfolio)
- [ ] Export functionality (CSV, PDF report)
- [ ] Historical optimization tracking

---

## ⚠️ Legal Disclaimer

**Duty Optimizer is a research and discovery tool, not legal advice.**

The tool helps users find potentially applicable HTS codes. Users are responsible for:
- Verifying classification accuracy with a licensed customs broker
- Maintaining proper documentation
- Ensuring compliance with CBP requirements

Suggested disclaimer text:
> "Duty Optimizer identifies potentially applicable HTS codes based on your product description. 
> Final classification decisions should be verified with a licensed customs broker or customs attorney. 
> Sourcify does not provide legal or customs advice."

---

## 🔑 Key Files

| File | Purpose |
|------|---------|
| `src/services/dutyOptimizer.ts` | Core optimizer service |
| `src/services/aiAnalysis.ts` | AI interpretation layer |
| `src/app/api/duty-optimizer/analyze/route.ts` | API endpoint |
| `src/app/(dashboard)/dashboard/optimizer/page.tsx` | UI page |
| `src/features/optimizer/components/` | UI components |

---

*This document should be updated as the feature evolves.*


