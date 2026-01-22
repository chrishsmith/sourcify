# HTS Classification Engine V6 "Atlas" - Hierarchical Tree Navigation

> **Codename:** Atlas  
> **Philosophy:** "Navigate the tree, don't search the leaves"  
> **Created:** December 24, 2025  
> **Status:** IMPLEMENTED  
> **Goal:** World's most accurate HTS classification through proper tree navigation

---

## The Core Problem

### Current V5 Approach (FLAWED)
```
User Input → AI extracts keywords → Search DB by keywords → Score results → Pick highest score
```

**Result:** "indoor planter" → `3924.90.05.00` (Nursing nipples and finger cots) ❌

### Why It Fails
1. **Jumps directly to 10-digit codes** without navigating the hierarchy
2. **Keyword matching** doesn't understand HTS structure
3. **Scoring is arbitrary** - doesn't reflect actual classification rules
4. **Misses carve-outs** - `3924.90.05` is SPECIFICALLY for nursing nipples, not a general plastic code

### How HTS Actually Works
The HTS is a **decision tree**, not a keyword database. Classification follows **General Rules of Interpretation (GRI)**:

1. **GRI 1:** Classification starts with the terms of headings and legal notes
2. **GRI 2:** Incomplete/unfinished articles are classified as the finished article
3. **GRI 3:** When goods could fit multiple headings, use most specific > essential character > last numerically
4. **GRI 4:** Goods not classifiable above, classify under most closely related
5. **GRI 5:** Containers/packing classified with goods (generally)
6. **GRI 6:** Subheadings use the same rules

---

## The New Architecture: Hierarchical Tree Navigation

### Philosophy

> **"Navigate the tree, don't search the leaves."**

Instead of searching for keyword matches, we:
1. **Understand** what the product IS (semantically)
2. **Navigate** to the correct Chapter (2-digit)
3. **Descend** through Heading → Subheading → Tariff Line → Statistical
4. **Apply exclusions** and carve-outs at each level

### The Classification Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        V6 CLASSIFICATION PIPELINE                                │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  PHASE 1: PRODUCT UNDERSTANDING                                              ││
│  │  ═════════════════════════════════════════════════════════════════════════  ││
│  │                                                                              ││
│  │  Input: "indoor planter"                                                     ││
│  │                                                                              ││
│  │  AI Deep Understanding:                                                      ││
│  │  ┌─────────────────────────────────────────────────────────────────────────┐││
│  │  │ WHAT IS IT?                                                              │││
│  │  │ • Essential character: A CONTAINER                                       │││
│  │  │ • Primary function: Hold soil and plants                                 │││
│  │  │ • Use context: Household/consumer (not agricultural)                     │││
│  │  │ • Typical size: Small (< 20 liters)                                      │││
│  │  │ • Typical materials: Plastic, ceramic, terracotta, metal                 │││
│  │  │                                                                          │││
│  │  │ KEY INSIGHT: This is a HOUSEHOLD ARTICLE, not:                           │││
│  │  │ • Agricultural machinery (Ch 84)                                         │││
│  │  │ • Builder's ware (3925)                                                  │││
│  │  │ • Industrial container (3923)                                            │││
│  │  └─────────────────────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  PHASE 2: CHAPTER DETERMINATION                                              ││
│  │  ═════════════════════════════════════════════════════════════════════════  ││
│  │                                                                              ││
│  │  Question: What MATERIAL is it made of?                                      ││
│  │  (This determines the Chapter for household articles)                        ││
│  │                                                                              ││
│  │  Material     │ Chapter │ Heading │ Description                              ││
│  │  ─────────────┼─────────┼─────────┼───────────────────────────────────────  ││
│  │  Plastic      │ 39      │ 3924    │ Household articles of plastics          ││
│  │  Ceramic      │ 69      │ 6912    │ Ceramic household articles              ││
│  │  Glass        │ 70      │ 7013    │ Glassware for table/kitchen            ││
│  │  Iron/Steel   │ 73      │ 7323    │ Household articles of iron/steel       ││
│  │  Aluminum     │ 76      │ 7615    │ Household articles of aluminum         ││
│  │  Copper       │ 74      │ 7418    │ Household articles of copper           ││
│  │                                                                              ││
│  │  → If material unknown: ASK USER or assume plastic (most common)             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  PHASE 3: HEADING NAVIGATION (4-digit)                                       ││
│  │  ═════════════════════════════════════════════════════════════════════════  ││
│  │                                                                              ││
│  │  Chapter 39: Plastics → Which heading?                                       ││
│  │                                                                              ││
│  │  3923 │ Articles for conveyance/packing (INDUSTRIAL containers)              ││
│  │       │ → EXCLUDE: Planters are household, not industrial packaging          ││
│  │                                                                              ││
│  │  3924 │ Tableware, kitchenware, OTHER HOUSEHOLD articles ← CORRECT           ││
│  │       │ → INCLUDE: Planters are "other household articles"                   ││
│  │                                                                              ││
│  │  3925 │ Builder's ware (construction materials)                              ││
│  │       │ → EXCLUDE: Planters are not construction materials                   ││
│  │                                                                              ││
│  │  3926 │ Other articles of plastics (catch-all)                               ││
│  │       │ → FALLBACK: Only if not elsewhere specified                          ││
│  │                                                                              ││
│  │  Selected: 3924 - Household articles of plastics                             ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  PHASE 4: SUBHEADING NAVIGATION (6-digit)                                    ││
│  │  ═════════════════════════════════════════════════════════════════════════  ││
│  │                                                                              ││
│  │  3924: Tableware, kitchenware, other household articles                      ││
│  │  ├── 3924.10 │ Tableware and kitchenware                                     ││
│  │  │           │ → EXCLUDE: A planter is not tableware/kitchenware             ││
│  │  │                                                                           ││
│  │  └── 3924.90 │ Other ← CORRECT                                               ││
│  │              │ → INCLUDE: Planters are "other" household articles            ││
│  │                                                                              ││
│  │  Selected: 3924.90 - Other household articles of plastics                    ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  PHASE 5: TARIFF LINE NAVIGATION (8-digit) - CARVE-OUTS                      ││
│  │  ═════════════════════════════════════════════════════════════════════════  ││
│  │                                                                              ││
│  │  3924.90: Other household articles                                           ││
│  │  ├── 3924.90.05 │ Nursing nipples and finger cots (3.1%)                     ││
│  │  │              │ → EXCLUDE: SPECIFIC carve-out, not for planters!           ││
│  │  │                                                                           ││
│  │  ├── 3924.90.10 │ Curtains, drapes, napkins, table covers (3.3%)             ││
│  │  │              │ → EXCLUDE: Planters are not textile-like items             ││
│  │  │                                                                           ││
│  │  ├── 3924.90.20 │ Picture frames (3.4%)                                      ││
│  │  │              │ → EXCLUDE: Planters are not picture frames                 ││
│  │  │                                                                           ││
│  │  └── 3924.90.56 │ Other (3.4%) ← CORRECT                                     ││
│  │                 │ → INCLUDE: Planters fall under "other"                     ││
│  │                                                                              ││
│  │  ⚠️ CRITICAL: Don't match keywords blindly!                                  ││
│  │     "3924.90.05" has "nursing nipples" - DO NOT match to "planter"           ││
│  │     Check if product FITS the specific description, not just chapter         ││
│  │                                                                              ││
│  │  Selected: 3924.90.56 - Other household articles of plastics                 ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                      │                                          │
│                                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  PHASE 6: STATISTICAL SUFFIX (10-digit)                                      ││
│  │  ═════════════════════════════════════════════════════════════════════════  ││
│  │                                                                              ││
│  │  3924.90.56: Other household articles                                        ││
│  │  ├── 3924.90.56.10 │ Gates for confining children or pets                    ││
│  │  │                 │ → EXCLUDE: A planter is not a gate                      ││
│  │  │                                                                           ││
│  │  └── 3924.90.56.50 │ Other ← CORRECT                                         ││
│  │                    │ → INCLUDE: General catch-all                            ││
│  │                                                                              ││
│  │  FINAL: 3924.90.56.50 - Other household articles of plastics (3.4%)          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## The Key Algorithm: Tree Descent with Exclusion Checking

```typescript
interface ClassificationStep {
  level: 'chapter' | 'heading' | 'subheading' | 'tariff_line' | 'statistical';
  code: string;
  description: string;
  reasoning: string;
  alternatives: { code: string; reason: string }[];
  excluded: { code: string; reason: string }[];
}

async function classifyV6(input: ProductInput): Promise<ClassificationResult> {
  const steps: ClassificationStep[] = [];
  
  // PHASE 1: Understand the product
  const understanding = await understandProduct(input.description);
  
  // PHASE 2: Determine chapter by material + essential character
  const chapter = await determineChapter(understanding);
  steps.push(chapter.step);
  
  // PHASE 3: Navigate to heading
  const heading = await navigateToHeading(chapter.code, understanding);
  steps.push(heading.step);
  
  // PHASE 4: Navigate to subheading
  const subheading = await navigateToSubheading(heading.code, understanding);
  steps.push(subheading.step);
  
  // PHASE 5: Navigate to tariff line (WITH CARVE-OUT CHECKING)
  const tariffLine = await navigateToTariffLine(subheading.code, understanding);
  steps.push(tariffLine.step);
  
  // PHASE 6: Select statistical suffix
  const statistical = await selectStatisticalSuffix(tariffLine.code, understanding);
  steps.push(statistical.step);
  
  return {
    htsCode: statistical.code,
    confidence: calculateConfidence(steps),
    steps,
    understanding,
  };
}
```

### The Carve-Out Check (CRITICAL)

```typescript
/**
 * Check if a code is a SPECIFIC carve-out that does NOT apply to the product
 * 
 * Example: 3924.90.05 is "Nursing nipples and finger cots"
 * This is NOT a general code - it's a specific carve-out.
 * A planter does NOT belong here even though it's under 3924.90
 */
async function isCarveOut(code: string, productUnderstanding: ProductUnderstanding): Promise<{
  isCarveOut: boolean;
  applies: boolean;
  reason: string;
}> {
  const htsEntry = await getHtsCode(code);
  const desc = htsEntry.description.toLowerCase();
  
  // Check if description is a SPECIFIC list of items (not "other")
  const isSpecificList = !desc.includes('other') && (
    desc.includes(' and ') ||  // "X and Y" pattern
    desc.includes(', ') ||     // "X, Y, Z" pattern  
    desc.split(' ').length < 10  // Short, specific descriptions
  );
  
  if (isSpecificList) {
    // This is a carve-out - check if product matches ANY of the listed items
    const productType = productUnderstanding.whatThisIs.toLowerCase();
    const listedItems = extractListedItems(desc);
    
    const matches = listedItems.some(item => 
      productType.includes(item) || item.includes(productType)
    );
    
    return {
      isCarveOut: true,
      applies: matches,
      reason: matches 
        ? `Product matches listed item: ${desc}`
        : `This code is specifically for: "${desc}" - does not include ${productUnderstanding.whatThisIs}`
    };
  }
  
  return { isCarveOut: false, applies: true, reason: 'General/other code' };
}
```

---

## Data Requirements

### What We Have ✅
- 30,115 HTS codes with descriptions, rates, indent levels
- 5,914 grouping rows (context like "Men's or boys':")
- Parent-child relationships via `parentCode` field
- Keywords extracted from descriptions

### What We're Missing ❌

#### 1. Chapter Legal Notes
The HTS has legal notes at the beginning of each chapter that OVERRIDE everything else.

**Example - Chapter 39 Note 2:**
> "This chapter does not cover: (ij) Articles of Section XI (textiles)"

This means a plastic item with textile character goes to Chapter 61/62, NOT Chapter 39.

**Source:** https://hts.usitc.gov/current (Chapter PDFs contain notes)

**Action Required:** 
- Download chapter notes from USITC
- Store in a new `HtsChapterNote` table
- Check notes during classification

#### 2. Section Notes
Similarly, section notes apply to all chapters in a section.

**Example - Section VII Note 1:**
> "Goods classifiable in this Section as plastics include..."

#### 3. CBP Rulings Database
**Source:** CBP CROSS Database (Customs Rulings Online Search System)
- URL: https://rulings.cbp.gov/
- Contains 500K+ classification rulings with real examples
- Searchable by HTS code, product description

**Value:** When we classify "indoor planter", we can search CROSS for "planter" rulings to see how CBP has classified similar items.

**Action Required:**
- Build a scraper for CROSS (they have an API)
- Store rulings in `CbpRuling` table
- Use rulings to validate/train the classifier

---

## Test Products (Challenging Cases)

I've designed these to test different aspects of the classification logic:

### 1. Indoor Planter (Household vs Industrial)
- **Input:** "indoor planter"
- **Challenge:** Must NOT pick 3924.90.05 (nursing nipples)
- **Expected:** Plastic: 3924.90.56.50, Ceramic: 6912.00.48.90

### 2. Men's Cotton T-shirt (Construction + Material + Gender)
- **Input:** "men's cotton t-shirt"
- **Challenge:** Knit vs Woven, Cotton %, Men's vs Boys'
- **Expected:** 6109.10.00.12 (Knit, cotton, men's) @ 16.5%

### 3. Stainless Steel Chef Knife (Value Thresholds)
- **Input:** "stainless steel chef knife $45"
- **Challenge:** Value threshold at $0.60/dozen
- **Expected:** 8211.91.25.00 (over threshold) @ 6.4% + 0.4¢/ea

### 4. Silicone Phone Case (Function vs Material)
- **Input:** "silicone phone case"
- **Challenge:** Chapter 42 (cases) vs Chapter 39 (plastics)
- **Expected:** 4202.99.90.00 (cases for carrying) - function over material

### 5. Rubber Finger Ring (Jewelry vs Rubber Article)
- **Input:** "rubber finger ring"
- **Challenge:** Chapter 71 (jewelry) vs Chapter 40 (rubber)
- **Expected:** 7117.90.75.00 (imitation jewelry) - worn as adornment

### 6. USB-C Charging Cable (Electrical Classification)
- **Input:** "USB-C charging cable"
- **Challenge:** 8544 (cables) vs 8536 (connectors)
- **Expected:** 8544.42.90.00 (data/power cables with connectors)

### 7. Polyester Fleece Blanket (Textile Classification)
- **Input:** "polyester fleece blanket"
- **Challenge:** Knit/woven determination, Chapter 63 blankets
- **Expected:** 6301.40.00.20 (blankets of synthetic fibers)

### 8. Stainless Steel Water Bottle (Container Classification)
- **Input:** "stainless steel water bottle 500ml"
- **Challenge:** 7323 (household) vs 7310 (industrial containers)
- **Expected:** 7323.93.00.60 (household articles, stainless steel)

### 9. Children's Plastic Toy Car (Toy vs Vehicle)
- **Input:** "plastic toy car for kids"
- **Challenge:** Chapter 95 (toys) vs Chapter 87 (vehicles)
- **Expected:** 9503.00.00.90 (toys - wheeled designed to be ridden)

### 10. LED Light Bulb (Electrical + Lighting)
- **Input:** "LED light bulb E26 base"
- **Challenge:** Chapter 85 (electrical) vs Chapter 94 (lighting)
- **Expected:** 8539.50.00.40 (LED lamps)

---

## Implementation Plan

### Phase 1: Foundation (Week 1)
1. [ ] Create `classificationEngineV6.ts` with tree navigation structure
2. [ ] Build `navigateToHeading()`, `navigateToSubheading()`, etc.
3. [ ] Implement carve-out detection logic
4. [ ] Add chapter note checking (manual data entry for key chapters)

### Phase 2: Data Enhancement (Week 1-2)
1. [ ] Download chapter notes from USITC for Chapters 39, 61, 62, 64, 69, 73, 84, 85, 94, 95
2. [ ] Create `HtsChapterNote` model and import notes
3. [ ] Build CBP CROSS scraper for rulings
4. [ ] Import top 10K most relevant rulings

### Phase 3: AI Integration (Week 2)
1. [ ] Redesign AI prompts for hierarchical decision-making
2. [ ] Create "chapter selection" prompt (understands all 97 chapters)
3. [ ] Create "heading navigation" prompts (per-chapter)
4. [ ] Test with 10 challenging products

### Phase 4: Optimization (Week 3)
1. [ ] Cache common product types → chapter mappings
2. [ ] Pre-compute carve-out patterns per heading
3. [ ] Build ruling-based validation (compare to CBP precedent)
4. [ ] Performance optimization (target < 3 second classification)

---

## Technical Implementation

### New Service: Tree Navigator

```typescript
// src/services/htsTreeNavigator.ts

/**
 * Navigate the HTS tree from Chapter → Statistical suffix
 * This replaces keyword search with structured descent
 */
export class HtsTreeNavigator {
  /**
   * Get all children at the next level with their descriptions
   */
  async getChildOptions(parentCode: string): Promise<HtsOption[]> {
    const children = await prisma.htsCode.findMany({
      where: { parentCode },
      orderBy: { code: 'asc' },
    });
    
    return children.map(child => ({
      code: child.code,
      codeFormatted: child.codeFormatted,
      description: child.description,
      generalRate: child.generalRate,
      isOtherCatchAll: this.isOtherCode(child.description),
      isSpecificCarveOut: this.isSpecificCarveOut(child.description),
    }));
  }
  
  /**
   * Check if this is an "Other" catch-all code
   */
  isOtherCode(description: string): boolean {
    const desc = description.toLowerCase().trim();
    return desc === 'other' || 
           desc === 'other:' || 
           desc.startsWith('other ') ||
           desc.startsWith('other,');
  }
  
  /**
   * Check if this is a specific carve-out (not "other")
   */
  isSpecificCarveOut(description: string): boolean {
    return !this.isOtherCode(description) && 
           description.length < 100 &&  // Short = specific
           !description.toLowerCase().includes('nesoi');  // Not "not elsewhere specified"
  }
  
  /**
   * Select the best child code for a product
   * CRITICAL: Check carve-outs before falling through to "other"
   */
  async selectChild(
    parentCode: string, 
    product: ProductUnderstanding
  ): Promise<{ selected: string; reasoning: string; excluded: string[] }> {
    const options = await this.getChildOptions(parentCode);
    
    // First pass: Check if product matches any SPECIFIC carve-out
    for (const option of options) {
      if (option.isSpecificCarveOut) {
        const matches = await this.doesProductMatchCarveOut(product, option);
        if (matches.match) {
          return {
            selected: option.code,
            reasoning: `Matches specific carve-out: ${option.description}`,
            excluded: [],
          };
        }
      }
    }
    
    // Second pass: Fall through to "Other" code
    const otherOption = options.find(o => o.isOtherCatchAll);
    if (otherOption) {
      const excluded = options
        .filter(o => o.isSpecificCarveOut)
        .map(o => o.code);
      
      return {
        selected: otherOption.code,
        reasoning: `Does not match any specific carve-out; classified under "Other"`,
        excluded,
      };
    }
    
    throw new Error(`No valid child code found under ${parentCode}`);
  }
}
```

### New Service: Product Understanding

```typescript
// src/services/productUnderstanding.ts

/**
 * Deep semantic understanding of what a product IS
 * This is the foundation for accurate classification
 */
export interface ProductUnderstanding {
  // What is this thing?
  essentialCharacter: 'container' | 'clothing' | 'tool' | 'machinery' | 'food' | 'chemical' | 'other';
  productType: string;  // "planter", "t-shirt", "knife"
  
  // Material (drives chapter selection for many products)
  material: {
    primary: string;
    composition: string;
    source: 'stated' | 'inferred' | 'unknown';
  };
  
  // Use context (household vs industrial vs commercial)
  useContext: 'household' | 'industrial' | 'commercial' | 'agricultural';
  
  // Size/scale
  sizeCategory: 'small' | 'medium' | 'large' | 'industrial';
  
  // Construction (for textiles)
  construction?: 'knit' | 'woven' | 'nonwoven';
  
  // Gender (for apparel)
  gender?: 'mens' | 'womens' | 'boys' | 'girls' | 'unisex';
  
  // Value (for threshold-based classifications)
  unitValue?: number;
}

/**
 * AI prompt for deep product understanding
 * This is NOT for classification - just understanding
 */
const UNDERSTANDING_PROMPT = `You are analyzing a product to understand what it IS.

Product: "{description}"

DO NOT attempt to classify or suggest HTS codes.
ONLY answer these questions about what this product IS:

1. ESSENTIAL CHARACTER: What is the fundamental nature of this product?
   - Is it a CONTAINER (holds things)?
   - Is it CLOTHING (worn on body)?
   - Is it a TOOL (performs work)?
   - Is it MACHINERY (mechanical operation)?
   - Other?

2. MATERIAL: What is it typically made of?
   - What is the PRIMARY material?
   - If stated in description, use that
   - If not stated, what's most common?

3. USE CONTEXT: Who uses this and where?
   - HOUSEHOLD: Consumers at home
   - COMMERCIAL: Businesses (restaurants, hotels)
   - INDUSTRIAL: Factories, construction
   - AGRICULTURAL: Farms, growing

4. SIZE/SCALE: What size is this typically?
   - SMALL: Handheld, pocket-sized
   - MEDIUM: Household-scale
   - LARGE: Commercial/industrial scale

Return JSON only.`;
```

---

## Success Metrics

| Metric | Current V5 | Target V6 |
|--------|------------|-----------|
| Accuracy on test products | ~50% | >95% |
| "Nursing nipples" type errors | Common | Zero |
| Classification time | 2-4 sec | <3 sec |
| Requires user questions | Often | Rarely |
| Explainable decisions | Partial | Full tree path |

---

## References

- [USITC HTS Online](https://hts.usitc.gov/) - Official HTS data
- [CBP CROSS](https://rulings.cbp.gov/) - Classification rulings database
- [GRI Rules](https://www.cbp.gov/trade/programs-administration/entry-summary/harmonized-tariff-schedule-general-rules-interpretation) - General Rules of Interpretation
- [ARCHITECTURE_HTS_CLASSIFICATION.md](./ARCHITECTURE_HTS_CLASSIFICATION.md) - Previous architecture

---

*This document defines the V6 classification engine architecture.*

**Last updated:** December 24, 2025

