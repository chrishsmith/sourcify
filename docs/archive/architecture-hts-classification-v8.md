# HTS Classification Engine V8 "Arbiter"

> **Philosophy:** Ask Upfront, Classify with Confidence  
> **Created:** December 27, 2025  
> **Status:** ✅ Production Ready

---

## Overview

V8 "Arbiter" represents a fundamental shift from V5's "Infer First, Ask Later" approach. Instead of making assumptions and potentially misclassifying, V8 **asks critical questions upfront** to achieve high-confidence classifications.

### Key Principles

1. **Ask Upfront** - When material or other critical attributes are unknown, ask before classifying
2. **Function Over Material** - Cases, toys, jewelry bypass material chapters (GRI 1 compliance)
3. **AI-Driven Tree Navigation** - Dynamic selection at each HTS level using Grok-3-mini
4. **Carve-Out Avoidance** - Never classify general items into specific product codes
5. **Full Transparency** - Show exactly what was stated, inferred, and how classification was reached

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Input                                   │
│                    "indoor planter"                                  │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: Product Understanding                    │
│                     (productClassifier.ts)                          │
│                                                                      │
│  • AI extracts: productType, material, useContext, function         │
│  • Identifies keywords and product category                         │
│  • Detects material from description if present                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 2: Route Determination                      │
│                     (productClassifier.ts)                          │
│                                                                      │
│  Function-Driven (GRI 1):          Material-Driven:                 │
│  • Cases → Chapter 42              • Planters → Chapter by material │
│  • Toys → Chapter 95               • Textiles → Chapter 61-63       │
│  • Jewelry → Chapter 71            • Kitchenware → Chapter by mat.  │
│  • Lighting → Chapter 85                                            │
│  • Cables → Chapter 85                                              │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: Decision Points                          │
│                                                                      │
│  If material unknown for material-driven products:                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  RETURN: needsInput = true                                   │   │
│  │  questions: [{                                               │   │
│  │    id: 'material',                                           │   │
│  │    question: 'What material is your planter made of?',       │   │
│  │    options: [                                                │   │
│  │      { label: 'Plastic', value: 'plastic',                   │   │
│  │        htsImpact: 'Chapter 39', dutyEstimate: '~3-5%' },     │   │
│  │      { label: 'Ceramic', value: 'ceramic',                   │   │
│  │        htsImpact: 'Chapter 69', dutyEstimate: '~6%' },       │   │
│  │      ...                                                     │   │
│  │    ]                                                         │   │
│  │  }]                                                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (with answers)
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 4: HTS Tree Navigation                      │
│                     (htsTreeNavigator.ts)                           │
│                                                                      │
│  1. Start at heading (from decision tree)                           │
│  2. For each level (subheading → tariff_line → statistical):        │
│     ┌─────────────────────────────────────────────────────────┐    │
│     │  selectChildWithAI()                                     │    │
│     │  • Gets children from DB                                 │    │
│     │  • Checks for simple matches                             │    │
│     │  • Avoids carve-outs (nursing nipples, etc.)             │    │
│     │  • Calls Grok-3-mini to select best match                │    │
│     │  • Returns selected node + reasoning                     │    │
│     └─────────────────────────────────────────────────────────┘    │
│  3. Continue until leaf node (10-digit code)                        │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PHASE 5: Build Response                           │
│                                                                      │
│  {                                                                   │
│    htsCode: "6912004890",                                           │
│    htsCodeFormatted: "6912.00.48.90",                               │
│    confidence: 0.85,                                                │
│    confidenceLabel: "high",                                         │
│    hierarchy: {                                                      │
│      levels: [                                                       │
│        { level: "chapter", code: "69",                              │
│          description: "Ceramic Products" },                         │
│        { level: "subheading", code: "6912.00",                      │
│          description: "Ceramic tableware, kitchenware..." },        │
│        ...                                                          │
│      ],                                                              │
│      fullDescription: "Ceramic Products: Ceramic tableware...",     │
│    },                                                                │
│    transparency: {                                                   │
│      stated: ["Material: ceramic"],                                 │
│      inferred: ["Product type: indoor planter", "Use: household"]   │
│    }                                                                 │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. Product Classifier (`productClassifier.ts`)

Analyzes product descriptions to extract:
- **productType**: The core product (e.g., "planter", "t-shirt")
- **material**: Detected from description or user input
- **useContext**: "household", "industrial", "personal"
- **function**: Primary purpose (carrying, lighting, clothing)
- **keywords**: For HTS search

Determines classification route:
- **function-driven**: Product function determines chapter (cases → 42, toys → 95)
- **material-driven**: Material determines chapter (plastic → 39, ceramic → 69)

### 2. HTS Decision Tree (`htsDecisionTree.ts`)

Provides deterministic chapter/heading routing:

```typescript
// Function-driven products (GRI 1)
FUNCTION_HEADINGS = {
  case: { chapter: '42', heading: '4202', rule: 'Cases for carrying' },
  toy: { chapter: '95', heading: '9503', rule: 'Toys designed for amusement' },
  jewelry: { chapter: '71', heading: '7117', rule: 'Imitation jewelry' },
  ...
}

// Material-driven products
MATERIAL_CHAPTERS = {
  plastic: { chapter: '39', rule: 'Plastics and articles thereof' },
  ceramic: { chapter: '69', rule: 'Ceramic products' },
  cotton: { chapter: '61', rule: 'Knitted apparel of cotton' },
  ...
}
```

### 3. HTS Tree Navigator (`htsTreeNavigator.ts`)

Navigates the HTS hierarchy using AI:

```typescript
async function selectChildWithAI(
  children: HtsTreeNode[],
  productContext: ProductContext
): Promise<{ selected: HtsTreeNode; reasoning: string }>
```

Key features:
- **Simple match first**: Direct text matching before AI
- **Carve-out avoidance**: Skips specific codes like "nursing nipples" for general products
- **AI selection**: Grok-3-mini chooses best match based on:
  - Material (e.g., "of cotton", "of synthetic fibers")
  - Use context (e.g., "household", "tableware")
  - Product type and keywords
- **"Other" fallback**: Selects catch-all codes when no specific match

### 4. Classification Engine V8 (`classificationEngineV8.ts`)

Orchestrates the entire flow:

```typescript
export async function classifyProductV8(input: ClassificationV8Input): Promise<ClassificationV8Result>
```

Returns either:
- `{ needsInput: true, questions: [...] }` - Need more info
- `{ needsInput: false, htsCode: "...", hierarchy: {...} }` - Classification complete

---

## API Endpoints

### POST /api/classify-v8

```typescript
// Initial request
POST /api/classify-v8
{
  "description": "indoor planter"
}

// Response (needs input)
{
  "needsInput": true,
  "questions": [{
    "id": "material",
    "question": "What material is your indoor planter made of?",
    "options": [
      { "label": "Plastic", "value": "plastic", "htsImpact": "Chapter 39", "dutyEstimate": "~3-5%" },
      { "label": "Ceramic/Terracotta", "value": "ceramic", "htsImpact": "Chapter 69", "dutyEstimate": "~6%" },
      ...
    ]
  }],
  "productUnderstanding": {
    "productType": "indoor planter",
    "useContext": "household"
  }
}

// Follow-up with answer
POST /api/classify-v8
{
  "description": "indoor planter",
  "answers": { "material": "ceramic" }
}

// Response (classification complete)
{
  "needsInput": false,
  "htsCode": "6912004890",
  "htsCodeFormatted": "6912.00.48.90",
  "description": "Other",
  "generalRate": "6%",
  "confidence": 0.85,
  "confidenceLabel": "high",
  "hierarchy": {
    "levels": [...],
    "fullDescription": "Ceramic Products: Ceramic tableware, kitchenware, other household articles..."
  },
  "transparency": {
    "stated": ["Material: ceramic"],
    "inferred": ["Product type: indoor planter", "Use context: household"]
  }
}
```

### GET /api/classify-v8 (Quick Test)

```
GET /api/classify-v8?q=silicone+phone+case
GET /api/classify-v8?q=indoor+planter&material=ceramic
GET /api/classify-v8?q=mens+cotton+t-shirt
```

---

## UI Component

### ClassificationV8.tsx

Located at: `src/features/compliance/components/ClassificationV8.tsx`

Features:
- **Input form**: Description + optional material
- **Question flow**: Radio buttons for material selection with chapter/duty hints
- **Result display**:
  - HTS code with confidence badge
  - Full concatenated description
  - Tree-view hierarchy (Chapter → Heading → ... → Statistical)
  - Classification logic explanation
  - Transparency panel (what was stated vs inferred)

---

## Test Cases

| Product | Expected HTS | Rule Applied |
|---------|--------------|--------------|
| Silicone phone case | 4202.99.XX | Function: case for carrying |
| Rubber finger ring | 7117.90.XX | Function: jewelry/adornment |
| Indoor planter (plastic) | 3924.90.XX | Material: plastic household |
| Indoor planter (ceramic) | 6912.00.XX | Material: ceramic household |
| Men's cotton t-shirt | 6109.XX.XX | Apparel: knit cotton |
| Polyester fleece blanket | 6301.40.XX | Textile: synthetic |
| Plastic toy car | 9503.00.XX | Function: toy |
| LED light bulb | 8539.5X.XX | Function: lighting |
| USB-C charging cable | 8544.42.XX | Function: cable with connectors |
| Stainless steel water bottle | 7323.93.XX | Material: steel household |
| Computer monitor | 8528.52.XX | Function: display/monitor |
| Television | 8528.72.XX | Function: TV receiver |

---

## Comparison: V5 vs V8

| Aspect | V5 "Infer First" | V8 "Ask Upfront" |
|--------|------------------|------------------|
| Philosophy | Make assumptions, ask later | Ask critical questions first |
| Material Unknown | Infers or guesses | Returns questions to user |
| Confidence | Often medium (70-80%) | High when answered (85-95%) |
| Tree Navigation | Direct lookup | AI-driven selection |
| Carve-out Handling | Basic | Explicit avoidance logic |
| Transparency | Basic justification | Full stated/inferred breakdown |

---

## Future Enhancements

1. **Image Classification** - Use vision AI to detect material from product photos
2. **Ruling Matching** - Cross-reference CBP rulings for precedent
3. **Bulk Classification** - Batch processing with question aggregation
4. **Confidence Calibration** - ML model trained on verified classifications
5. **Chapter 99 Handling** - Special provisions and temporary duties

---

## Files

| File | Purpose |
|------|---------|
| `src/services/classificationEngineV8.ts` | Main orchestration engine |
| `src/services/productClassifier.ts` | Product understanding + route determination |
| `src/services/htsDecisionTree.ts` | Chapter/heading routing rules |
| `src/services/htsTreeNavigator.ts` | AI-driven tree navigation |
| `src/app/api/classify-v8/route.ts` | API endpoint |
| `src/features/compliance/components/ClassificationV8.tsx` | UI component |

