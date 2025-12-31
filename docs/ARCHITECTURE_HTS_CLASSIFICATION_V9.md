# HTS Classification Engine V9 "AI-First"

> **Philosophy:** Let AI understand products; only hardcode legal rules  
> **Created:** December 27, 2025  
> **Status:** 🚧 Proposed

---

## The Problem with V8

V8 tries to enumerate every product type with hardcoded patterns:

```typescript
// This doesn't scale - can't enumerate all products
const ELECTRONICS_PATTERNS = ['phone', 'tv', 'monitor', ...];
const TOY_PATTERNS = ['toy car', 'doll', ...];
```

Every new product type requires code changes. We're fighting an impossible battle.

---

## V9 Solution: AI-First with Legal Guardrails

### Core Principle

**Only hardcode what's legally required.** The HTS has specific General Rules of Interpretation (GRI) that mandate certain products be classified by function regardless of material. These are finite and don't change often.

Everything else should be AI-determined.

### What to Hardcode (GRI Mandates Only)

| Rule | Products | Chapter | Legal Basis |
|------|----------|---------|-------------|
| GRI 3(a) | Cases designed to contain specific articles | 42 | Note 2(a) to Chapter 42 |
| GRI 3(a) | Toys designed for children's amusement | 95 | Chapter 95 Note 2 |
| GRI 3(a) | Imitation jewelry | 71 | Heading 7117 |
| GRI 5(a) | Cases presented with their contents | Follow contents | Part of complete article |

**That's it.** These are the only products where material genuinely doesn't matter by law.

### What AI Should Determine

Everything else:
- Electronics (monitors, TVs, phones, computers)
- Appliances
- Kitchenware
- Furniture
- Vehicles
- Textiles
- All other goods

---

## V9 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Input                                   │
│                    "computer monitor"                               │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: Product Understanding                    │
│                         (AI Analysis)                               │
│                                                                      │
│  Output: { productType, function, material (if stated), use }       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: GRI Override Check                       │
│                     (ONLY hardcoded rules)                          │
│                                                                      │
│  IF product is a CASE designed to carry specific items → Ch 42      │
│  IF product is a TOY for children's amusement → Ch 95               │
│  IF product is IMITATION JEWELRY → Ch 71                            │
│  ELSE → Continue to Phase 3                                         │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: AI Chapter Selection                     │
│                   (Query actual HTS chapters)                       │
│                                                                      │
│  Prompt: "Given this product, which of these 99 HTS chapters        │
│           is most appropriate? Here are the chapter descriptions..." │
│                                                                      │
│  The AI reads ACTUAL chapter descriptions from our DB,              │
│  not hardcoded mappings.                                            │
│                                                                      │
│  Example result: Chapter 85 (Electrical machinery and equipment)    │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: AI Heading Selection                     │
│                                                                      │
│  Given Chapter 85, present all headings (8501-8548) to AI.          │
│  AI selects: 8528 (Monitors, projectors, TV receivers)              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: Tree Navigation                          │
│                                                                      │
│  Navigate within 8528 using AI to select subheadings.               │
│  8528 → 8528.52 (Monitors for ADP machines) → Full 10-digit code   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Differences from V8

| Aspect | V8 | V9 |
|--------|----|----|
| Product patterns | Hardcoded lists | None (AI understands naturally) |
| Chapter selection | Decision tree lookup | AI reads actual HTS chapters |
| Heading selection | Condition functions | AI reads actual headings |
| Maintenance | Add patterns for new products | Only maintain GRI rules |
| Electronics handling | Hardcoded patterns | AI recognizes electronics naturally |
| Future products | Requires code changes | Works automatically |

---

## Implementation Changes

### 1. Remove Pattern Lists

Delete:
- `ELECTRONICS_PATTERNS`
- `LIGHTING_PATTERNS`
- `CABLE_PATTERNS`
- Most of `MATERIAL_TO_CHAPTER`

### 2. Simplify `determineRoute()`

```typescript
function determineRoute(understanding: ProductUnderstanding): ClassificationRoute {
  // ONLY check for legally-mandated GRI overrides
  
  // GRI 3(a): Cases for carrying specific articles
  if (understanding.isForCarrying) {
    return { routeType: 'gri-override', forcedChapter: '42', forcedHeading: '4202' };
  }
  
  // GRI 3(a): Toys for children
  if (understanding.isToy) {
    return { routeType: 'gri-override', forcedChapter: '95', forcedHeading: '9503' };
  }
  
  // GRI 3(a): Imitation jewelry
  if (understanding.isJewelry) {
    return { routeType: 'gri-override', forcedChapter: '71', forcedHeading: '7117' };
  }
  
  // Everything else → AI determines chapter
  return { routeType: 'ai-determined', decisionPoints: getRequiredQuestions(understanding) };
}
```

### 3. New AI Chapter Selection

```typescript
async function selectChapterWithAI(understanding: ProductUnderstanding): Promise<string> {
  // Get all chapters from database
  const chapters = await prisma.htsCode.findMany({
    where: { level: 'chapter' },
    select: { code: true, description: true }
  });
  
  const prompt = `
    PRODUCT: ${understanding.whatThisIs}
    
    Select the most appropriate HTS chapter from these options:
    ${chapters.map(c => `Chapter ${c.code}: ${c.description}`).join('\n')}
    
    Consider:
    - Material composition
    - Primary function
    - Industry classification
    - How similar products are typically classified
    
    Return ONLY the 2-digit chapter number.
  `;
  
  // AI returns chapter based on actual HTS descriptions
  return await callAI(prompt);
}
```

### 4. Question Logic

Only ask questions when they affect legal classification:
- **Material**: Only if it changes the chapter (not for electronics/toys/cases)
- **Fiber**: Only for textiles where it affects duty rates
- **Use context**: Only where household vs industrial matters

---

## Benefits

1. **No more pattern maintenance** - AI understands new products naturally
2. **Uses actual HTS data** - Not our interpretation of it
3. **Scales infinitely** - Any product works without code changes
4. **Legal accuracy** - Only hardcode what law requires
5. **Self-updating** - Works with any HTS revisions once DB is updated

---

## Migration Path

1. Keep V8 working for now
2. Implement V9 as a parallel engine
3. A/B test accuracy
4. Deprecate V8 once V9 is proven

---

## Files to Modify

| File | Changes |
|------|---------|
| `productClassifier.ts` | Remove pattern lists, simplify route logic |
| `htsDecisionTree.ts` | Remove most chapter mappings, keep only GRI rules |
| `classificationEngineV9.ts` | New engine with AI chapter selection |
| `htsTreeNavigator.ts` | Minor updates for V9 compatibility |


