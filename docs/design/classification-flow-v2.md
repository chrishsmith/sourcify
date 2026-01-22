# Classification Flow V2 Design

> **Created:** December 21, 2025  
> **Status:** APPROVED - Ready for Implementation  
> **Goal:** Clean, user-driven classification that serves both quick lookups and detailed analysis

---

## Design Philosophy

> **We provide information. User decides.**

No modes. No toggles. No assumptions about what the user wants. We show:
1. All valid HTS codes for their product
2. What criteria each code requires
3. The rates (base + country-specific)
4. User picks what fits

---

## The Two-Phase Flow

### Phase 1: Understand

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ INPUT                                                                        │
│                                                                              │
│ "tshirt"                                                     [China ▼]      │
│                                                                              │
│ [Classify]                                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ CATEGORY IDENTIFIED                                                          │
│                                                                              │
│ We found: T-SHIRT (Apparel)                                                 │
│                                                                              │
│ Your rate depends on:                                                        │
│ • Construction (knit vs woven)                                              │
│ • Fiber content (cotton, synthetic, other)                                  │
│ • Who it's for (men's, women's, children's)                                │
│                                                                              │
│ Base rate range: 15% - 32%                                                  │
│ + China additional tariffs: ~37.5%                                          │
│                                                                              │
│ [Answer Questions]              [Show All Codes]                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key points:**
- Show what we understood (T-SHIRT)
- Show what variables affect the rate
- Show the range (gives immediate value)
- Two paths forward: drill down OR see everything

### Phase 2a: Answer Questions (Optional)

If user clicks "Answer Questions":

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ NARROW DOWN YOUR CODE                                                        │
│                                                                              │
│ Question 1 of 3                                                              │
│                                                                              │
│ Is this a knit or woven garment?                                            │
│                                                                              │
│ ○ Knit (jersey, interlock, rib) — most t-shirts are knit                   │
│ ○ Woven (broadcloth, poplin)                                                │
│ ○ Not sure                                                                  │
│                                                                              │
│ [Continue]                                    [Show All Codes Instead]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Question behavior:**
- Ask questions in priority order (highest rate impact first)
- "Not sure" marks as unknown, continues to next question
- "Show All Codes Instead" exits to Phase 2b at any time
- Stop when only 1-2 codes remain OR all questions answered

### Phase 2b: Show All Codes

If user clicks "Show All Codes" OR answers all questions with "Not sure":

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ T-SHIRTS: ALL POSSIBLE HTS CODES                                             │
│                                                                              │
│ KNIT (Chapter 61) — Most t-shirts                                           │
│ ────────────────────────────────────────────────────────────────────────────│
│ Code         │ Criteria                          │ Base Rate │              │
│──────────────┼───────────────────────────────────┼───────────┼──────────────│
│ 6109.10.00   │ Cotton ≥50%                       │ 16.5%     │ ⭐ Lowest    │
│ 6109.90.10   │ Synthetic fiber ≥50%              │ 32%       │              │
│ 6109.90.80   │ Other fiber                       │ 32%       │              │
│                                                                              │
│ WOVEN (Chapter 62) — Less common for t-shirts                               │
│ ────────────────────────────────────────────────────────────────────────────│
│ 6205.20.20   │ Men's, cotton                     │ 19.7%     │              │
│ 6206.30.30   │ Women's, cotton                   │ 15.4%     │              │
│                                                                              │
│ Click any code for full details                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🇨🇳 ADDITIONAL TARIFFS FROM CHINA                                            │
│                                                                              │
│ These apply to ALL codes above:                                              │
│                                                                              │
│ Section 301 (List 4A)              +7.5%                                    │
│ IEEPA Fentanyl Emergency           +20%                                     │
│ IEEPA Reciprocal Baseline          +10%                                     │
│ ─────────────────────────────────────────────────────────────────────────── │
│ TOTAL ADDITIONAL                   +37.5%                                   │
│                                                                              │
│ Example: 6109.10.00 (16.5% base) + 37.5% = 54% effective rate              │
└─────────────────────────────────────────────────────────────────────────────┘

💡 Looking for lower rates? Mexico (USMCA) may have 0% additional tariffs.
   [Compare Other Countries]
```

**Table design:**
- Group by chapter/category (KNIT vs WOVEN)
- Show human-readable criteria, not HTS jargon
- Star (⭐) the lowest rate options naturally
- Show country tariffs ONCE at bottom, not repeated per code

### Phase 3: Result (After Questions Answered)

If user answered questions and we're confident:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ YOUR HTS CODE                                                                │
│                                                                              │
│ 6109.10.00.04                                            Confidence: 95%    │
│ T-shirts, singlets, tank tops and similar garments, knitted,               │
│ containing 50% or more by weight of cotton                                  │
│                                                                              │
│ Based on your answers:                                                       │
│ ✓ Knit construction                                                         │
│ ✓ Cotton ≥50%                                                               │
│ ✓ Men's/unisex                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ DUTY BREAKDOWN (China → US)                                                  │
│                                                                              │
│ Base MFN Rate                      16.5%                                    │
│ Section 301 (List 4A)              +7.5%                                    │
│ IEEPA Fentanyl Emergency           +20%                                     │
│ IEEPA Reciprocal Baseline          +10%                                     │
│ ─────────────────────────────────────────────────────────────────────────── │
│ TOTAL EFFECTIVE RATE               54%                                      │
│                                                                              │
│ On $5.00 product: ~$2.70 duty per unit                                      │
└─────────────────────────────────────────────────────────────────────────────┘

[Save & Monitor]  [Compare Other Countries]  [See All Codes]  [New Search]
```

---

## API Design

### Request

```typescript
POST /api/classify-v2

{
  productDescription: string;      // Required
  materialComposition?: string;    // Optional
  countryOfOrigin: string;         // Required (ISO 2-letter)
  intendedUse?: string;            // Optional
  unitValue?: number;              // Optional
  
  // For progressive flow
  phase: "understand" | "answer" | "all";
  answeredQuestions?: Record<string, string>;
}
```

### Response: Phase "understand"

```typescript
{
  phase: "understand",
  category: {
    name: "T-shirt",
    description: "Knit or woven upper body garment",
    chapters: ["61", "62"],
    confidence: 85
  },
  rateRange: {
    min: 15.4,
    max: 32,
    minCode: "6206.30.30",
    maxCode: "6109.90.10"
  },
  countryAdditions: {
    total: 37.5,
    breakdown: [
      { name: "Section 301", rate: 7.5 },
      { name: "IEEPA Fentanyl", rate: 20 },
      { name: "IEEPA Reciprocal", rate: 10 }
    ]
  },
  variables: [
    {
      id: "construction",
      name: "Construction",
      impact: "high",  // How much this affects rate
      question: "Is this knit or woven?"
    },
    // ...
  ],
  possibleCodeCount: 8
}
```

### Response: Phase "all"

```typescript
{
  phase: "all",
  category: { /* same as above */ },
  codeGroups: [
    {
      groupName: "Knit (Chapter 61)",
      groupNote: "Most t-shirts are knit",
      codes: [
        {
          htsCode: "6109.10.00",
          description: "T-shirts, knit, cotton ≥50%",
          criteria: "Cotton fiber content 50% or more by weight",
          baseRate: 16.5,
          isLowest: true
        },
        // ...
      ]
    },
    {
      groupName: "Woven (Chapter 62)",
      groupNote: "Less common for t-shirts",
      codes: [ /* ... */ ]
    }
  ],
  countryAdditions: {
    countryCode: "CN",
    countryName: "China",
    total: 37.5,
    breakdown: [ /* ... */ ],
    example: {
      code: "6109.10.00",
      baseRate: 16.5,
      totalRate: 54
    }
  },
  tip: "Looking for lower rates? Mexico (USMCA) may have 0% additional tariffs."
}
```

### Response: Phase "answer" (after questions)

```typescript
{
  phase: "result",
  htsCode: {
    code: "6109.10.00.04",
    description: "T-shirts, singlets...",
    chapter: "61",
    heading: "6109"
  },
  confidence: 95,
  matchedCriteria: [
    { variable: "construction", value: "knit", source: "user_answer" },
    { variable: "fiber", value: "cotton", source: "user_answer" },
    { variable: "demographic", value: "mens", source: "assumed" }
  ],
  dutyBreakdown: {
    baseRate: 16.5,
    additions: [ /* ... */ ],
    totalRate: 54,
    perUnitExample: { value: 5, duty: 2.70 }
  },
  alternatives: [ /* other codes if close match */ ]
}
```

---

## Question Priority Algorithm

Questions are sorted by **impact** - how much they swing the rate.

```typescript
function prioritizeQuestions(questions: Question[], codes: Code[]): Question[] {
  return questions.map(q => {
    // Calculate rate swing for each question
    const ratesByAnswer: Record<string, number[]> = {};
    for (const option of q.options) {
      const matchingCodes = codes.filter(c => 
        option.leadsToCodes.includes(c.htsCode)
      );
      ratesByAnswer[option.value] = matchingCodes.map(c => c.baseRate);
    }
    
    // Impact = max possible rate difference
    const allRates = Object.values(ratesByAnswer).flat();
    const impact = Math.max(...allRates) - Math.min(...allRates);
    
    return { ...q, impact };
  }).sort((a, b) => b.impact - a.impact);
}
```

For t-shirts:
- Construction (knit vs woven): ~15% swing → Ask first
- Fiber (cotton vs synthetic): ~15% swing → Ask second
- Demographic (men's vs women's): ~4% swing → Ask last

---

## "Not Sure" Handling

When user answers "Not sure":
1. Mark that variable as unknown
2. Continue to next question
3. At the end, show all codes that match the KNOWN variables

Example:
- User says: Knit ✓, Cotton ✓, Not sure about demographic
- We show: 6109.10.00.04 (men's), 6109.10.00.12 (women's), 6109.10.00.27 (children's)
- All are 16.5% base rate, so user can pick based on their actual product

---

## Implementation Plan

### Step 1: API Updates
- [ ] Create `/api/classify-v2/route.ts` with new structure
- [ ] Refactor `ambiguityDetector.ts` to return grouped codes
- [ ] Add question priority calculation
- [ ] Add country tariff summary (not per-code)

### Step 2: UI - Understand Phase
- [ ] Create `ClassificationFlowV2.tsx` component
- [ ] Build "Category Identified" screen
- [ ] Wire up "Answer Questions" and "Show All Codes" buttons

### Step 3: UI - Questions Phase
- [ ] Build question card component
- [ ] Implement progressive question flow
- [ ] Add "Show All Instead" escape hatch

### Step 4: UI - All Codes Table
- [ ] Build grouped table component
- [ ] Add country tariffs footer
- [ ] Highlight lowest rate codes

### Step 5: UI - Result Phase
- [ ] Build specific result view
- [ ] Show matched criteria
- [ ] Add action buttons (Save, Compare, etc.)

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first useful output | < 3 seconds | API response time |
| Question completion rate | > 60% | Users who answer vs skip |
| Classification accuracy | > 90% | When questions answered |
| User satisfaction | "This is useful" | Qualitative feedback |

---

## Files to Create/Modify

```
src/
├── app/
│   └── api/
│       └── classify-v2/
│           └── route.ts              # NEW - V2 API endpoint
├── services/
│   ├── ambiguityDetector.ts          # MODIFY - Add grouping logic
│   ├── classificationFlowV2.ts       # NEW - Business logic for V2 flow
│   └── questionPrioritizer.ts        # NEW - Question ordering logic
└── features/
    └── compliance/
        └── components/
            ├── ClassificationFlowV2.tsx       # NEW - Main V2 component
            ├── CategoryIdentified.tsx         # NEW - Phase 1 screen
            ├── QuestionFlow.tsx               # NEW - Questions screen
            ├── AllCodesTable.tsx              # NEW - Grouped table
            └── ClassificationResultV2.tsx     # NEW - Final result
```

---

## References

- [DESIGN_GUIDED_CLASSIFICATION.md](./DESIGN_GUIDED_CLASSIFICATION.md) - Original design doc
- [ARCHITECTURE_TARIFF_REGISTRY.md](./ARCHITECTURE_TARIFF_REGISTRY.md) - Tariff data source
- [ambiguityDetector.ts](../src/services/ambiguityDetector.ts) - Current ambiguity detection

---

*This document captures the approved design for Classification Flow V2.*


