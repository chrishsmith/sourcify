# Guided Classification System Design

> **Status:** BRAINSTORMING / DESIGN PHASE  
> **Created:** December 21, 2025  
> **Goal:** Build the most intuitive, powerful HTS classification experience that serves both SMBs and Enterprises

---

## 🎯 Design Philosophy

### The North Star

> **"So powerful a customs broker would use it. So simple a 4th grader could use it."**

This is the iPhone moment for trade compliance. Before iPhone, phones were either:
- Simple but limited (flip phones)
- Powerful but complex (BlackBerry, Windows Mobile)

We're doing the same for HTS classification:
- Current tools: Either dumbed-down calculators OR complex professional software
- Our goal: **Both. At the same time.**

### Design Principles

| Principle | What It Means | Example |
|-----------|---------------|---------|
| **Progressive Disclosure** | Show simple first, reveal complexity on demand | Quick result → "See details" → Full decision tree |
| **Smart Defaults** | Make intelligent assumptions, but be transparent | "We assumed stainless steel (you mentioned it)" |
| **No Dead Ends** | Always give the user a path forward | If we can't classify, show what info we need |
| **Speak Human** | No jargon unless necessary, explain when used | "HTS Code" with tooltip: "The official product code US Customs uses" |
| **Show, Don't Tell** | Visual feedback over text explanations | Confidence ring (●●●●○) instead of "80% confident" |
| **Earn Trust** | Be honest about uncertainty | "We're 70% sure because..." not "This is your code" |
| **Remember Everything** | Never ask twice for info already provided | If they said "$45" once, pre-fill everywhere |
| **Instant Value** | Useful output even with minimal input | "Based on just your description, duty is roughly 25-35%" |

### What "Simple" Looks Like

**A 4th grader should be able to:**
- Type "knife from China" and get a useful answer
- Understand why their duty is ~$14 on a $45 knife
- Follow the guided questions without confusion
- Save their product for later
- Know when they need more help

**What they should NOT need to:**
- Know what "HTS" stands for
- Understand tariff schedule structure
- Know about GRI rules
- Manually look up duty rates
- Calculate compound rates themselves

### What "Powerful" Looks Like

**A customs broker should be able to:**
- See the full HTS hierarchy and decision factors
- Override AI suggestions with their expertise
- Export defensible classification documentation
- Bulk process 1,000 SKUs with nuanced attributes
- Access historical rulings for precedent
- Get API access for system integration

**They should think:** "This is better than my $50K enterprise software"

### The Test

Before shipping any feature, ask:

1. **The 4th Grader Test:** Could a 10-year-old complete this task without help?
2. **The Broker Test:** Would a professional pay for this capability?
3. **The Frustration Test:** Is there any point where a user would say "I don't know what to do"?

If we fail any test, redesign.

---

## 📋 Scope Summary

### What We're Building

**Core Capability:** An intelligent classification system that:
1. Takes any product description (even vague ones)
2. Understands what the user is trying to classify
3. Identifies when multiple HTS codes could apply
4. Either makes smart assumptions OR asks targeted questions
5. Returns accurate classification with full transparency
6. Calculates landed cost including ALL tariff layers
7. Saves results for future reference and monitoring

### The User Journey

```
USER KNOWS NOTHING                                    USER KNOWS EVERYTHING
        │                                                       │
        ▼                                                       ▼
┌───────────────┐     ┌─────────────────┐     ┌────────────────────────┐
│ "knife china" │ ──► │ "kitchen knife, │ ──► │ "8" stainless steel    │
│               │     │  stainless,     │     │  chef knife, rosewood  │
│               │     │  $45"           │     │  handle, $45 FOB,      │
│               │     │                 │     │  fixed blade, serrated │
└───────────────┘     └─────────────────┘     └────────────────────────┘
        │                     │                          │
        ▼                     ▼                          ▼
┌───────────────┐     ┌─────────────────┐     ┌────────────────────────┐
│ DUTY RANGE:   │     │ LIKELY CODE:    │     │ EXACT CODE:            │
│ 25% - 45%     │     │ 8211.91.25      │     │ 8211.91.25.00          │
│               │     │ 85% confidence  │     │ 98% confidence         │
│ "Add details  │     │                 │     │                        │
│  to narrow"   │     │ "Assumed: fixed │     │ "Verified against      │
│               │     │  blade"         │     │  your specifications"  │
└───────────────┘     └─────────────────┘     └────────────────────────┘
```

Every level of input produces useful, accurate output.

### What We're NOT Building (Scope Boundaries)

- ❌ Customs brokerage services (we're software, not a broker)
- ❌ Filing entries with CBP (we provide the data, not the filing)
- ❌ Legal advice (we disclaim, they verify with broker/attorney)
- ❌ Real-time CBP integration (future, not MVP)
- ❌ Full supply chain management (focus on classification + duty)

---

## 🏆 Success Metrics

### User Success
| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Time to first classification | < 30 seconds | Instant value |
| Classification accuracy | > 95% (when specs provided) | Trust |
| User completion rate | > 80% (start → result) | No abandonment |
| "Aha moment" rate | > 70% save or return | They got value |
| NPS Score | > 50 | They'd recommend us |

### Business Success
| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Free → Paid conversion | > 5% | Sustainable business |
| Monthly churn | < 3% | They stay |
| Enterprise pipeline | 10+ qualified/quarter | Big contracts |
| API usage growth | 20% MoM | Stickiness |

---

## 📦 What We Have Today (Current State)

### Classification Engine v3 (Stable - Backed Up)
**Files:** `classificationEngine.v3-stable.ts`, `classificationValidator.v1-stable.ts`

| Capability | Status | Notes |
|------------|--------|-------|
| AI product analysis | ✅ Working | Grok-3 extracts essential character, material, function |
| USITC search | ✅ Working | Real API, hierarchical search |
| AI code selection | ✅ Working | GRI-based selection with reasoning |
| Semantic validation | ✅ Working | Catches category mismatches (personal vs industrial) |
| Auto re-classification | ✅ Working | When critical mismatch detected |
| Tariff calculation | ✅ Working | Base + Section 301 + IEEPA + AD/CVD warnings |
| Country registry | ✅ Working | 199 countries with tariff profiles |

### What It Does Well
- Single product classification with good accuracy
- Catches obvious misclassifications (rubber ring ≠ motor vehicle part)
- Real USITC data, real tariff rates
- Transparent reasoning

### What It Lacks (The Gap)
- ❌ Doesn't detect when multiple valid codes exist
- ❌ Doesn't show duty RANGE when ambiguous
- ❌ Doesn't ask clarifying questions
- ❌ Doesn't save products for reuse
- ❌ Doesn't support bulk upload
- ❌ Single confidence number instead of nuanced uncertainty

---

## 🎯 What We're Building (Future State)

### Phase 1: Smart Ambiguity (Foundation)
**Goal:** Know when we're uncertain and communicate it honestly

- Detect when multiple codes under same heading could apply
- Show duty range: "25% - 35% depending on specifications"
- Show assumptions clearly: "We assumed stainless steel"
- Better input helper text with examples
- Alternative codes always visible

### Phase 2: Guided Experience
**Goal:** Get to 98% accuracy through intelligent questions

- Dynamic questions based on HTS structure
- Only ask what we actually need to know
- Remember everything user already told us
- Pre-fill from description parsing
- "Explore Mode" for product developers

### Phase 3: Product Intelligence
**Goal:** Build lasting value, not one-time lookups

- Product Library (save, organize, reuse)
- Bulk upload with AI enrichment
- Change alerts (tariff changes affecting saved products)
- CBP ruling matching for defensibility

### Phase 4: Enterprise Scale
**Goal:** Win large accounts

- Team collaboration / approval workflows
- Full audit trail export
- API access for integration
- SSO / enterprise auth
- Custom reporting

---

## Table of Contents

1. [Design Philosophy](#-design-philosophy)
2. [Scope Summary](#-scope-summary)
3. [What We Have Today](#-what-we-have-today-current-state)
4. [What We're Building](#-what-were-building-future-state)
5. [Core Problem Statement](#core-problem-statement)
2. [User Personas & Willingness to Pay](#user-personas--willingness-to-pay)
3. [Feature Prioritization](#feature-prioritization)
4. [User Flows](#user-flows)
5. [Wireframes](#wireframes)
6. [Technical Architecture](#technical-architecture)
7. [Monetization Strategy](#monetization-strategy)
8. [Open Questions](#open-questions)

---

## Core Problem Statement

**The Challenge:** HTS classification often has multiple valid codes depending on product specifications (material, value, dimensions, etc.) that users may not know or provide.

**Current State:** We pick the most likely code and move on → Can be wrong, not transparent.

**Desired State:** Guide users through ambiguity intelligently, serve both "I just need a quick estimate" AND "I need the exact right code" use cases.

**The Opportunity:** Nobody does guided classification well. This could be THE differentiator.

---

## User Personas & Willingness to Pay

### Tier 1: Individual / Side Hustle ($0-29/mo)
- Importing <$10K/year
- Needs: Quick estimates, basic compliance
- Tolerance: Happy with "good enough" classification
- Pain: Confused by complexity, scared of CBP

### Tier 2: Small Business ($49-199/mo)
- Importing $10K-500K/year
- Needs: Accurate classification, cost planning, some bulk
- Tolerance: Wants accuracy but not expert-level
- Pain: Can't afford a customs broker for every product

### Tier 3: Mid-Market ($299-999/mo)
- Importing $500K-10M/year
- Needs: Bulk classification, product library, team collaboration
- Tolerance: Needs defensible classifications
- Pain: Growing pains, inconsistent processes

### Tier 4: Enterprise ($1,000-10,000+/mo)
- Importing $10M+/year
- Needs: API access, audit trails, ruling matching, workflow
- Tolerance: Zero errors, CBP defensible
- Pain: Compliance risk, multiple teams, global complexity

### Key Insight for Monetization

| Feature | SMB Value | Enterprise Value |
|---------|-----------|------------------|
| Quick classification | ⭐⭐⭐ | ⭐ |
| Guided questions | ⭐⭐⭐ | ⭐⭐ |
| Product library | ⭐⭐ | ⭐⭐⭐ |
| Bulk upload | ⭐⭐ | ⭐⭐⭐ |
| Ruling matching | ⭐ | ⭐⭐⭐ |
| Audit trail | ⭐ | ⭐⭐⭐ |
| Team collaboration | ⭐ | ⭐⭐⭐ |
| API access | ⭐ | ⭐⭐⭐ |
| Duty range estimates | ⭐⭐⭐ | ⭐⭐ |
| What-if analysis | ⭐⭐ | ⭐⭐⭐ |

**Strategy:** Build core guided classification for all. Layer enterprise features on top.

---

## Feature Prioritization

### Phase 1: Foundation (MVP Enhancement)
1. ✅ **AI Contextual Recognition** - Already have this
2. 🔲 **Ambiguity Detection** - Know when multiple codes are possible
3. 🔲 **Duty Range Display** - "2.4% - 8.2% depending on specs"
4. 🔲 **Assumptions Disclosure** - Clear about what we assumed
5. 🔲 **Better Input Guidance** - Helper text with great examples

### Phase 2: Guided Experience
6. 🔲 **Dynamic Question Flow** - Ask only relevant questions
7. 🔲 **Natural Language Memory** - Remember what user already told us
8. 🔲 **Alternative Codes Display** - Show what else it could be
9. 🔲 **Explore Mode** - See all possibilities before committing

### Phase 3: Power Features
10. 🔲 **Product Library** - Save and reuse classifications
11. 🔲 **Bulk Upload with Intelligence** - AI-enriched CSV processing
12. 🔲 **Ruling Matching** - CBP precedent lookup
13. 🔲 **Image Upload** - Extract attributes from photos

### Phase 4: Enterprise
14. 🔲 **Team Collaboration** - Multi-user workflow
15. 🔲 **Audit Trail** - Full history of classification decisions
16. 🔲 **API Access** - Integrate with their systems
17. 🔲 **What-If Simulator** - Model spec changes on duty

---

## User Flows

### Flow 1: Quick Classification (Current + Enhanced)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLASSIFY YOUR PRODUCT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Product Description *                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ stainless steel chef knife with wooden handle, 8 inch blade ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  💡 TIP: Include material, dimensions, value, and intended use  │
│     Example: "cotton men's t-shirt, knit, 180gsm, $4.50 FOB"    │
│                                                                  │
│  Material Composition                                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ stainless steel blade, rosewood handle                      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Country of Origin          Unit Value (optional)                │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │ China         ▼  │      │ $45.00           │                 │
│  └──────────────────┘      └──────────────────┘                 │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [🔍 Quick Classify]    [📋 Guided Mode - More Accurate]    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 2: Quick Result with Ambiguity Disclosure

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLASSIFICATION RESULT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  YOUR PRODUCT                               Origin: 🇨🇳 China ││
│  │  Stainless Steel Chef Knife                                 ││
│  │  "stainless steel chef knife with wooden handle..."         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  HTS CODE                                    CONFIDENCE      ││
│  │                                                              ││
│  │  8211.91.25.00  📋                          ●●●●○ 80%       ││
│  │  Table & kitchen knives, stainless steel                    ││
│  │                                                              ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │ ⚠️ WHY NOT 100%? Multiple codes possible                │││
│  │  │                                                         │││
│  │  │ We assumed:                                             │││
│  │  │ • Blade: Stainless steel (you mentioned this ✓)         │││
│  │  │ • Value: Over $0.60/dozen (based on $45 unit price ✓)   │││
│  │  │ • Type: Fixed blade (assumed - not specified)           │││
│  │  │                                                         │││
│  │  │ [🎯 Refine Classification] [📊 See All Possibilities]   │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ESTIMATED DUTY                                              ││
│  │                                                              ││
│  │  Base Rate:        0.4¢/ea + 6.4%                           ││
│  │  Section 301:      +25% (China List 3)                      ││
│  │  ─────────────────────────────────────                      ││
│  │  TOTAL:            ~31.4% + 0.4¢/ea                         ││
│  │                                                              ││
│  │  💰 On $45 knife: ~$14.17 duty                              ││
│  │                                                              ││
│  │  ┌───────────────────────────────────────────────────────┐  ││
│  │  │ 📊 DUTY COULD RANGE: 25.4% - 45.4%                    │  ││
│  │  │ depending on exact specifications                      │  ││
│  │  │ [See breakdown by code]                                │  ││
│  │  └───────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [💾 Save to Library]  [📤 Export]  [🔄 New Classification]     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 3: "See All Possibilities" Expanded View

```
┌─────────────────────────────────────────────────────────────────┐
│                 ALL POSSIBLE CLASSIFICATIONS                     │
│                 Heading 8211: Knives with cutting blades         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Your product could be classified under these codes depending    │
│  on specific attributes:                                         │
│                                                                  │
│  DECISION FACTOR: Blade Material                                 │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  ┌─ STAINLESS STEEL (most likely based on your description)     │
│  │                                                               │
│  │   8211.91.20.00 - Value NOT over $0.60/dozen                 │
│  │   └─ Base duty: 0.3¢/ea + 5.4%                               │
│  │   └─ Your price: $45 = $540/doz → Does NOT apply ❌          │
│  │                                                               │
│  │   8211.91.25.00 - Value OVER $0.60/dozen  ← LIKELY ✓         │
│  │   └─ Base duty: 0.4¢/ea + 6.4%                               │
│  │   └─ Your price: $45 = $540/doz → Applies ✓                  │
│  │                                                               │
│  ├─ OTHER STEEL (carbon steel, high-carbon, etc.)               │
│  │                                                               │
│  │   8211.91.40.00 - Value NOT over $0.60/dozen                 │
│  │   └─ Base duty: 0.2¢/ea + 4.2%                               │
│  │                                                               │
│  │   8211.91.50.00 - Value OVER $0.60/dozen                     │
│  │   └─ Base duty: 0.7¢/ea + 8.2%                               │
│  │                                                               │
│  └─ CERAMIC or OTHER                                             │
│                                                                   │
│      8211.91.80.00 - Other                                       │
│      └─ Base duty: Free                                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📊 DUTY COMPARISON (with China 301 tariffs)                ││
│  │                                                              ││
│  │  Code          Base      +301     TOTAL      On $45 item    ││
│  │  ──────────────────────────────────────────────────────────  ││
│  │  8211.91.25    6.4%      +25%     ~31.4%     $14.17         ││
│  │  8211.91.50    8.2%      +25%     ~33.2%     $14.98         ││
│  │  8211.91.80    Free      +25%     ~25%       $11.25         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  [✓ Confirm 8211.91.25.00]   [🎯 Let Me Answer Questions]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 4: Guided Question Mode

```
┌─────────────────────────────────────────────────────────────────┐
│              GUIDED CLASSIFICATION                               │
│              Let's narrow down the exact code                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Based on "stainless steel chef knife with wooden handle"        │
│  We've identified Heading 8211 (Knives with cutting blades)      │
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  QUESTION 1 of 3                                      [===    ]  │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  What is the BLADE made of?                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  ○  Stainless Steel                                         ││
│  │     Contains chromium (12%+), resists rust/corrosion        ││
│  │     Common in: chef knives, kitchen knives                  ││
│  │                                                              ││
│  │  ○  Carbon Steel / High-Carbon Steel                        ││
│  │     No/low chromium, can rust, holds sharper edge           ││
│  │     Common in: Japanese knives, butcher knives              ││
│  │                                                              ││
│  │  ○  Ceramic                                                 ││
│  │     Zirconium oxide, very hard, lightweight                 ││
│  │                                                              ││
│  │  ○  Other / I don't know                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  💡 Your description mentioned "stainless steel" - is this      │
│     referring to the blade? [Yes, use stainless steel]          │
│                                                                  │
│  [← Back]                                    [Continue →]        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│              GUIDED CLASSIFICATION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  QUESTION 2 of 3                                      [======  ] │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  What is your UNIT VALUE?                                        │
│  (This determines which value bracket applies)                   │
│                                                                  │
│  The threshold for stainless steel knives is $0.60 per dozen    │
│  ($0.05 per knife)                                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  Unit value: $ [  45.00  ]  per  [ piece ▼ ]                ││
│  │                                                              ││
│  │  ✓ $45/piece = $540/dozen                                   ││
│  │  ✓ This is OVER $0.60/dozen threshold                       ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  💡 You mentioned $45 earlier - we've pre-filled this.          │
│                                                                  │
│  [← Back]                                    [Continue →]        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│              GUIDED CLASSIFICATION - COMPLETE ✓                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ═══════════════════════════════════════════════════════════    │
│  FINAL CLASSIFICATION                                 [========] │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  Based on your answers:                                          │
│  • Blade material: Stainless steel                               │
│  • Unit value: $45 (over threshold)                              │
│  • Type: Fixed blade kitchen knife                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  YOUR HTS CODE                              CONFIDENCE       ││
│  │                                                              ││
│  │  8211.91.25.00                              ●●●●● 98%       ││
│  │  Table knives & kitchen knives having                       ││
│  │  fixed blades: stainless steel, valued                      ││
│  │  over $0.60/dozen                                           ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  This classification is based on YOUR confirmed specifications.  │
│  It should be defensible to CBP.                                 │
│                                                                  │
│  [💾 Save to Product Library]     [📤 Export Classification]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 5: Explore Mode (Product Development)

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXPLORE CLASSIFICATION                        │
│        "I'm still designing my product - show me options"        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  What type of product are you developing?                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ kitchen knife                                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  Where will you import from?                                     │
│  ┌────────────────────────────────┐                              │
│  │ China                       ▼  │                              │
│  └────────────────────────────────┘                              │
│                                                                  │
│  [🔍 Explore Options]                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              ↓

┌─────────────────────────────────────────────────────────────────┐
│              KITCHEN KNIFE - CLASSIFICATION OPTIONS              │
│              Design decisions that affect your duty              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  💡 DESIGN INSIGHT                                          ││
│  │                                                              ││
│  │  Your blade material choice significantly impacts duty:      ││
│  │  • Ceramic blade = LOWEST duty (Free + 25% 301)             ││
│  │  • Stainless steel = MEDIUM duty (6.4% + 25% 301)           ││
│  │  • Carbon steel = HIGHEST duty (8.2% + 25% 301)             ││
│  │                                                              ││
│  │  Potential savings: $3.73/unit by choosing ceramic          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  INTERACTIVE DUTY CALCULATOR                                     │
│  ═══════════════════════════════════════════════════════════    │
│                                                                  │
│  Blade Material:  [ Stainless Steel ▼ ]                         │
│                                                                  │
│  Unit Value:      $[  45.00  ]                                   │
│                   ──────●────────────────────                    │
│                   $0.05              $100                        │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │  WITH CURRENT SETTINGS:                                      ││
│  │                                                              ││
│  │  HTS Code:     8211.91.25.00                                ││
│  │  Base Duty:    6.4% + $0.004/ea                             ││
│  │  Section 301:  +25%                                         ││
│  │  ────────────────────────────                               ││
│  │  TOTAL DUTY:   ~$14.17 per knife (31.5%)                    ││
│  │                                                              ││
│  │  Annual import of 10,000 units:                             ││
│  │  Total duty: $141,700                                        ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  COMPARE SCENARIOS                                               │
│  ┌──────────────┬──────────────┬──────────────┬───────────────┐ │
│  │ Scenario     │ HTS Code     │ Duty/Unit    │ Annual (10K)  │ │
│  ├──────────────┼──────────────┼──────────────┼───────────────┤ │
│  │ Current      │ 8211.91.25   │ $14.17       │ $141,700      │ │
│  │ Ceramic      │ 8211.91.80   │ $11.25       │ $112,500 ✓    │ │
│  │ Carbon steel │ 8211.91.50   │ $14.98       │ $149,800      │ │
│  │ Vietnam src  │ 8211.91.25   │ $7.18*       │ $71,800 ✓✓    │ │
│  └──────────────┴──────────────┴──────────────┴───────────────┘ │
│  * Vietnam: No Section 301, but 46% reciprocal tariff           │
│                                                                  │
│  [📥 Download Comparison]  [💾 Save Scenario]  [📧 Share]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 6: Bulk Upload with Intelligence

```
┌─────────────────────────────────────────────────────────────────┐
│                    BULK CLASSIFICATION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                                                              ││
│  │         📄 Drop your CSV/XLSX here or click to browse       ││
│  │                                                              ││
│  │         Supported: .csv, .xlsx (up to 1,000 rows)           ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  TEMPLATE OPTIONS                                                │
│                                                                  │
│  Don't have a file yet? Download a template:                     │
│                                                                  │
│  [📥 General Template]  - Works for any product                  │
│  [📥 Apparel Template]  - Includes fiber %, gender, garment type │
│  [📥 Kitchenware]       - Includes material, value thresholds    │
│  [📥 Electronics]       - Includes voltage, battery, wireless    │
│  [📥 Footwear]          - Includes upper material, sole, value   │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  MINIMUM REQUIRED COLUMNS:                                       │
│  • product_name                                                  │
│  • description                                                   │
│  • country_of_origin                                             │
│                                                                  │
│  OPTIONAL (improves accuracy):                                   │
│  • material, unit_value, weight, dimensions, intended_use        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              ↓
                      (After upload)
                              ↓

┌─────────────────────────────────────────────────────────────────┐
│              BULK UPLOAD ANALYSIS                                │
│              47 products uploaded                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  UPLOAD SUMMARY                                              ││
│  │                                                              ││
│  │  ✅ 32 products - High confidence (90%+)                    ││
│  │     Ready to classify                                        ││
│  │                                                              ││
│  │  ⚠️ 12 products - Need clarification                        ││
│  │     Missing info that affects classification                 ││
│  │                                                              ││
│  │  ❌ 3 products - Could not parse                            ││
│  │     Description too vague                                    ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  AI-DETECTED ATTRIBUTES                                          │
│  We extracted these from your descriptions. Please verify:       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ Row │ Product          │ Detected           │ Status         │
│  ├─────┼──────────────────┼────────────────────┼────────────────┤
│  │ 1   │ Chef knife 8"    │ Steel: stainless   │ ✅ Confirm     │
│  │     │                  │ Value: $45         │                │
│  ├─────┼──────────────────┼────────────────────┼────────────────┤
│  │ 2   │ Paring knife     │ Steel: ? unknown   │ ⚠️ [Select]    │
│  │     │                  │ Value: $12         │                │
│  ├─────┼──────────────────┼────────────────────┼────────────────┤
│  │ 3   │ Kitchen thing    │ Type: ? unclear    │ ❌ [Edit]      │
│  └──────────────────────────────────────────────────────────────┘
│                                                                  │
│  [✅ Confirm All Detected]  [⚠️ Review 12 Issues]  [🔄 Re-upload]│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              ↓
                    (After confirmation)
                              ↓

┌─────────────────────────────────────────────────────────────────┐
│              BULK CLASSIFICATION RESULTS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────────┐
│  │ # │ Product      │ HTS Code      │ Duty Est. │ Confidence   │
│  ├───┼──────────────┼───────────────┼───────────┼──────────────┤
│  │ 1 │ Chef knife   │ 8211.91.25.00 │ 31.4%     │ ●●●●● 95%   │
│  │ 2 │ Paring knife │ 8211.91.25.00 │ 31.4%     │ ●●●●○ 85%   │
│  │ 3 │ Bread knife  │ 8211.91.25.00 │ 31.4%     │ ●●●●● 92%   │
│  │ 4 │ Steak knives │ 8211.91.25.00 │ 31.4%     │ ●●●●○ 88%   │
│  │...│ ...          │ ...           │ ...       │ ...          │
│  └──────────────────────────────────────────────────────────────┘
│                                                                  │
│  EXPORT OPTIONS                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  📥 Download Results (.xlsx)                                ││
│  │     Includes: HTS codes, duty rates, confidence, assumptions││
│  │                                                              ││
│  │  📥 Download with Decision Trail (.xlsx)                    ││
│  │     Includes: All above + reasoning, alternatives, sources  ││
│  │     (For compliance audit)                                   ││
│  │                                                              ││
│  │  💾 Save All to Product Library                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Flow 7: Product Library (Saved Classifications)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCT LIBRARY                               │
│                    Your saved classifications                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔍 Search products...              [+ New Product] [📤 Import]  │
│                                                                  │
│  Filter: [All ▼]  [Kitchen ▼]  [China ▼]       Sort: [Recent ▼] │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ KITCHENWARE COLLECTION                              12 items ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │                                                              ││
│  │ 🔪 Chef Knife Pro 8"                                         ││
│  │    8211.91.25.00 • China • $45 • Last updated: Dec 15       ││
│  │    Status: ✅ Active   Alerts: ⚠️ 1 new                     ││
│  │    [View] [Clone] [Edit]                                     ││
│  │                                                              ││
│  │ 🔪 Paring Knife 3.5"                                         ││
│  │    8211.91.25.00 • China • $12 • Last updated: Dec 15       ││
│  │    Status: ✅ Active   Alerts: None                         ││
│  │    [View] [Clone] [Edit]                                     ││
│  │                                                              ││
│  │ 🍳 Stainless Steel Pan                                       ││
│  │    7323.93.00.60 • China • $28 • Last updated: Dec 10       ││
│  │    Status: ✅ Active   Alerts: None                         ││
│  │    [View] [Clone] [Edit]                                     ││
│  │                                                              ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ⚠️ ALERTS                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 🔪 Chef Knife Pro 8"                                         ││
│  │                                                              ││
│  │ New Section 301 exclusion expired for this HTS code.        ││
│  │ Duty increased from 6.4% to 31.4% effective Dec 1, 2025.    ││
│  │                                                              ││
│  │ [View Details] [Dismiss] [Update Classification]            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Architecture

### Classification Ambiguity Detection System

```
┌─────────────────────────────────────────────────────────────────┐
│                    AMBIGUITY DETECTION                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT: Product description + attributes                         │
│         "stainless steel kitchen knife, $45"                    │
│                                                                  │
│                        ▼                                        │
│                                                                  │
│  STEP 1: Identify Heading (AI + Knowledge Base)                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Result: Heading 8211 - Knives with cutting blades           ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                        ▼                                        │
│                                                                  │
│  STEP 2: Fetch ALL 10-digit codes under heading                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 8211.91.20.00 - SS, value ≤$0.60/doz                        ││
│  │ 8211.91.25.00 - SS, value >$0.60/doz                        ││
│  │ 8211.91.40.00 - Other steel, value ≤$0.60/doz               ││
│  │ 8211.91.50.00 - Other steel, value >$0.60/doz               ││
│  │ 8211.91.80.00 - Other                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                        ▼                                        │
│                                                                  │
│  STEP 3: Extract DECISION VARIABLES from HTS text               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Variables detected:                                          ││
│  │ • blade_material: [stainless_steel, other_steel, other]     ││
│  │ • value_threshold: $0.60/dozen                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                        ▼                                        │
│                                                                  │
│  STEP 4: Match user input to variables                          │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ User mentioned "stainless steel" → blade_material = SS ✓    ││
│  │ User mentioned "$45" → value = $540/doz > $0.60 ✓           ││
│  │ → All variables resolved!                                    ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│                        ▼                                        │
│                                                                  │
│  STEP 5: Calculate confidence                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ All variables from user input: 95%                          ││
│  │ Some variables assumed: 70-85%                               ││
│  │ Key variables unknown: 50-70%                                ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  OUTPUT:                                                         │
│  • Best code: 8211.91.25.00                                     │
│  • Confidence: 95%                                               │
│  • Assumptions: None (all from user input)                      │
│  • Alternatives: [list of other possible codes]                 │
│  • Questions to ask: None (fully resolved)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Database Schema Additions

```prisma
// Add to schema.prisma

model ProductLibrary {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId], references: [id])
  
  // Product info
  productName       String
  description       String
  materialComposition String?
  unitValue         Float?
  countryOfOrigin   String
  
  // Classification result
  htsCode           String
  htsDescription    String
  confidence        Int
  
  // Decision trail (for audit)
  assumptions       Json?    // { "blade_material": "stainless_steel", "source": "user_input" }
  questionsAnswered Json?    // { "blade_material": "stainless_steel", "value_bracket": "over" }
  alternativeCodes  Json?    // ["8211.91.20.00", "8211.91.50.00"]
  
  // Duty info
  baseDutyRate      String
  estimatedTotalDuty Float?
  
  // Metadata
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  lastVerified      DateTime?
  
  // Alerts
  alerts            ProductAlert[]
  
  @@index([userId])
  @@index([htsCode])
}

model ProductAlert {
  id              String   @id @default(cuid())
  productId       String
  product         ProductLibrary @relation(fields: [productId], references: [id])
  
  alertType       AlertType // tariff_change, exclusion_expired, adcvd_new
  message         String
  severity        Severity  // info, warning, critical
  
  isRead          Boolean  @default(false)
  isDismissed     Boolean  @default(false)
  
  createdAt       DateTime @default(now())
  
  @@index([productId])
}

enum AlertType {
  tariff_change
  exclusion_expired
  adcvd_new
  rate_increase
  new_ruling
}

model ClassificationQuestion {
  id              String   @id @default(cuid())
  
  // Which HTS heading this applies to
  htsPrefix       String   // "8211.91" for all table/kitchen knives
  
  // Question definition
  variableName    String   // "blade_material"
  questionText    String   // "What is the blade made of?"
  questionType    String   // "single_select", "value_input", "multi_select"
  
  // Answer options (for select types)
  options         Json?    // [{"value": "stainless_steel", "label": "Stainless Steel", "help": "..."}]
  
  // Which codes each answer leads to
  codeMapping     Json     // {"stainless_steel": ["8211.91.20", "8211.91.25"], "other_steel": ["8211.91.40"]}
  
  // Order
  displayOrder    Int
  
  @@index([htsPrefix])
}
```

---

## Monetization Strategy

### Tier Structure

| Feature | Free | Starter ($29) | Pro ($99) | Business ($299) | Enterprise |
|---------|------|---------------|-----------|-----------------|------------|
| Classifications/mo | 10 | 100 | 500 | 2,000 | Unlimited |
| Quick classify | ✅ | ✅ | ✅ | ✅ | ✅ |
| Guided questions | ✅ | ✅ | ✅ | ✅ | ✅ |
| Duty estimates | ✅ | ✅ | ✅ | ✅ | ✅ |
| Product library | 5 | 50 | 250 | 1,000 | Unlimited |
| Bulk upload | ❌ | 25 rows | 100 rows | 500 rows | Unlimited |
| Explore mode | ❌ | ✅ | ✅ | ✅ | ✅ |
| Ruling matching | ❌ | ❌ | ✅ | ✅ | ✅ |
| What-if simulator | ❌ | ❌ | ✅ | ✅ | ✅ |
| Team members | 1 | 1 | 3 | 10 | Unlimited |
| Audit trail export | ❌ | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ❌ | ✅ |
| Dedicated support | ❌ | ❌ | ❌ | ✅ | ✅ |

### Enterprise Add-ons
- Custom integrations
- SSO/SAML
- Custom ruling database
- White-label option
- SLA guarantees

---

## Open Questions

1. **How do we build the question database?**
   - Manual curation per heading? (accurate but slow)
   - AI extraction from HTS text? (fast but needs validation)
   - Hybrid: AI suggests, humans validate?

2. **How much do we invest in Explore Mode?**
   - High value for product developers
   - Complex to build well
   - May be a differentiator worth investing in

3. **Ruling matching - build or buy?**
   - CBP CROSS is scrapeable
   - Could partner with existing ruling databases
   - Or build our own AI-powered matching

4. **Image upload priority?**
   - Cool feature but complex
   - May not be accurate enough to be useful
   - Could start with simple "upload product image for reference"

5. **Mobile app?**
   - Scan barcode → get classification?
   - Photo → classify?
   - Future consideration

6. **API pricing model?**
   - Per call?
   - Per classification?
   - Tiered by volume?

---

## Implementation Status

### ✅ Completed (December 20-21, 2025)

| Component | File | Status |
|-----------|------|--------|
| **Ambiguity Detector** | `src/services/ambiguityDetector.ts` | ✅ Built + Enhanced |
| **V4 Classification Engine** | `src/services/classificationEngineV4.ts` | ✅ Built |
| **V4 API Endpoint** | `src/app/api/classify-v4/route.ts` | ✅ Built + Enhanced |
| **Guided Form Component** | `src/features/compliance/components/GuidedClassificationForm.tsx` | ✅ Built + Polished |
| **Classify Page** | `src/app/(dashboard)/dashboard/classify/page.tsx` | ✅ Built |
| **Navigation Update** | `src/components/layouts/DashboardLayout.tsx` | ✅ Updated |
| **Product Library** | `prisma/schema.prisma` (SavedProduct model) | ✅ Already exists |

### 🎨 UI Polish Completed (December 20, 2025 - Evening)

| Issue | Fix |
|-------|-----|
| **Card spacing** | Changed to `space-y-5` with proper padding |
| **Missing HTS hierarchy** | Added Classification Path showing Chapter → Heading → Subheading → Full Code |
| **Missing tariff breakdown** | Now shows Base MFN + Section 301 + IEEPA + Total Effective Rate |
| **Wrong tariff rate** | Shows full effective rate (39.6% for China) not just base (4.6%) |
| **Incomplete questions** | Added Stainless Steel option, improved material detection |
| **Transparent assumptions** | Shows "We assumed: Material: stainless_steel" with option to correct |

### 🔄 Next Steps

1. **Save to Library flow** - Wire up the "Save to Library" button to use `SavedProduct` model
2. **Refine Classification flow** - When user answers questions, re-run classification with answers
3. **Bulk upload** - Build CSV/XLSX import flow (Wireframe 3)
4. **More question types** - Add value threshold, handle material, blade length for knives
5. **Early-stage user flow** - HTS range mode for product development teams

---

## 📝 Session Log: December 21, 2025

### The Issue That Started This

**User reported:** A "rubber finger ring" was classified as HTS 4016.99.60.10 "Mechanical articles for motor vehicles" - clearly wrong.

**Root cause:** The AI saw "ring" + "rubber" and matched to rubber O-rings/gaskets for vehicles, missing that this was jewelry worn on a finger.

### Technical Fixes Implemented

#### 1. Enhanced Knowledge Base (`htsChapterGuide.ts`)
- Added Chapter 71 (Jewelry/Imitation Jewelry) definition
- Added jewelry/accessories product category mapping
- Added keywords: ring, finger ring, bracelet, necklace, earring, etc.
- Added heading mappings for 7113 (precious metal) and 7117 (imitation jewelry)

#### 2. Semantic Validation Service (`classificationValidator.ts`)
**New service that catches category mismatches:**

- **Product categories detected:** personal_wearable, personal_care, household, food_beverage, electronics, toys_recreation, industrial, automotive, etc.
- **HTS categories detected:** motor_vehicle, aircraft, railway, ship_marine, industrial_machinery, military_arms, nuclear, etc.
- **Incompatible pairs defined:** Personal items ↔ Motor vehicle parts, Food ↔ Nuclear, Household ↔ Military, etc.
- **Auto re-classification:** When critical mismatch detected, searches correct chapters and re-classifies

#### 3. Enhanced Classification Engine (`classificationEngine.ts`)
- Integrated semantic validator into classification flow
- Added auto re-classification when critical semantic mismatch detected
- Added confidence penalties based on semantic validation
- Enhanced AI prompts to distinguish jewelry from industrial parts
- Now runs 6 phases instead of 5

#### 4. Backup Created
- `classificationEngine.v3-stable.ts` - Working engine with fixes
- `classificationValidator.v1-stable.ts` - Semantic validation service

### Test Results (All Passing ✅)

| Product | Expected | Actual | ✓/✗ |
|---------|----------|--------|-----|
| Rubber finger ring | Chapter 71 | 7117.90.75.00 | ✅ |
| Silicone wedding band | Chapter 71 | 7117.90.75.00 | ✅ |
| Rubber O-ring gasket (industrial) | Chapter 40 | 4016.99.15.00 | ✅ |
| Plastic bracelet (fashion) | Chapter 71 | 7117.90.75.00 | ✅ |
| Kitchen knife | Chapter 82 | 8211.91.20.00 | ✅ |
| Toy car (children's) | Chapter 95 | 9503.00.00.13 | ✅ |
| Cotton t-shirt | Chapter 61 | 6109.10.00.04 | ✅ |
| Stainless steel water bottle | Chapter 73 | 7323.99.50.30 | ✅ |

### Strategic Discussion: Ambiguous Classifications

**The deeper issue:** Many HTS codes have multiple valid options depending on specifications (material, value, dimensions) that users may not provide.

**Example:** "Kitchen knife" could be:
- 8211.91.20 (stainless, low value)
- 8211.91.25 (stainless, high value)
- 8211.91.40 (other steel, low value)
- 8211.91.50 (other steel, high value)
- 8211.91.80 (other - ceramic, etc.)

**User's vision:** Build a system that handles this intelligently - either by asking the right questions OR by showing the range of possibilities transparently.

### Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Show duty RANGE when ambiguous | Useful even without exact specs |
| Make assumptions transparent | "We assumed X" builds trust |
| Offer guided questions as optional | Quick users skip, thorough users engage |
| Build product library | One-time classification, reuse forever |
| Support both SMB and Enterprise | Different features, same core engine |
| Bulk upload with AI enrichment | Meet users where they are (spreadsheets) |

### Design Philosophy Established

> **"So powerful a customs broker would use it. So simple a 4th grader could use it."**

**Key principles:**
- Progressive disclosure (simple first, details on demand)
- Smart defaults with transparency
- No dead ends
- Speak human, not jargon
- Show don't tell
- Earn trust through honesty
- Remember everything
- Instant value at any input level

### What User Liked / Prioritized

**High priority:**
- ✅ AI-enriched uploads (Option D for bulk)
- ✅ Duty range display when uncertain
- ✅ Natural language memory (don't ask twice)
- ✅ Guided question flow (dynamic, not static form)
- ✅ Explore mode for product developers
- ✅ Ruling matching (CBP precedent)
- ✅ Better helper text examples

**Lower priority:**
- Image generation (too error-prone)
- Reverse classification ("what specs for lowest duty") - interesting but not urgent

### Open Items for Future Sessions

1. **Build ambiguity detection algorithm** - Core foundation needed
2. **Design question database schema** - How to store/retrieve questions per HTS heading
3. **Build UI components** - Implement wireframes in React
4. **Product library schema** - Finalize Prisma models
5. **Bulk upload flow** - Two-pass validation UX
6. **Ruling matching** - CBP CROSS integration approach
7. **Pricing/tier validation** - User research on willingness to pay

---

## 📚 Related Documentation

- [ARCHITECTURE_TARIFF_REGISTRY.md](./ARCHITECTURE_TARIFF_REGISTRY.md) - Tariff data sources and sync
- [ARCHITECTURE_TARIFF_MONITORING.md](./ARCHITECTURE_TARIFF_MONITORING.md) - Alert and monitoring system
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) - Overall product roadmap
- [PROGRESS.md](./PROGRESS.md) - Sprint progress tracking

---

## 🔧 Technical Files Reference

| File | Purpose |
|------|---------|
| `src/services/classificationEngine.ts` | Main classification logic (V3) |
| `src/services/classificationEngine.v3-stable.ts` | Backed up stable version |
| `src/services/classificationEngineV4.ts` | **NEW** Experimental guided classification |
| `src/services/classificationValidator.ts` | Semantic validation layer |
| `src/services/classificationValidator.v1-stable.ts` | Backed up stable version |
| `src/services/ambiguityDetector.ts` | **NEW** Ambiguity detection service |
| `src/data/htsChapterGuide.ts` | Knowledge base for chapters/categories |
| `src/services/tariffRegistry.ts` | Country tariff data |
| `src/services/usitc.ts` | USITC API integration |
| `src/app/api/classify/route.ts` | Stable classification API |
| `src/app/api/classify-v4/route.ts` | **NEW** Experimental V4 API |

---

## 🔄 How to Revert to Stable Version

If V4 doesn't work out or causes issues:

### Option 1: Just Use V3 (Easiest)
The V3 stable API is unchanged and still works:
```bash
# V3 API endpoint (stable, unchanged)
POST /api/classify

# V4 API endpoint (experimental, can be ignored)
POST /api/classify-v4
```
V4 files exist but don't affect V3 at all.

### Option 2: Delete V4 Completely
```bash
# Remove experimental files
rm src/services/ambiguityDetector.ts
rm src/services/classificationEngineV4.ts
rm -rf src/app/api/classify-v4
```

### Option 3: Restore from Backup
If you modified V3 and need to restore:
```bash
# Restore stable versions
cp src/services/classificationEngine.v3-stable.ts src/services/classificationEngine.ts
cp src/services/classificationValidator.v1-stable.ts src/services/classificationValidator.ts
```

### Backup Files Location
| Backup File | What It Contains |
|-------------|------------------|
| `classificationEngine.v3-stable.ts` | Full working V3 engine |
| `classificationValidator.v1-stable.ts` | Semantic validation |

---

*This document is a living design spec. Update as we learn more.*

**Last updated:** December 21, 2025  
**Next review:** When starting implementation of Phase 1

