# Paid Features & Monetization Design

> **Created:** January 1, 2026  
> **Updated:** January 2, 2026  
> **Status:** DESIGN - Ready for Review  
> **Goal:** Convert free classifications into paid service subscriptions

---

## 🎯 Executive Summary

Classification is **free** and serves as the hook. Revenue comes from **strategic classification services** that help users legally qualify for lower duty rates. 

### Key Positioning Insight

**FREE Classify** = "What's the most likely HTS code for this product?"  
**PRO Optimizer** = "What's the BEST legal classification strategy, and how do I qualify for it?"

Many products have **multiple legally correct HTS codes**. The difference can be 0% vs 10%+ duty. PRO helps users:
1. See which codes have lower rates (not revealed for free)
2. Understand how to qualify for those rates
3. Get documentation requirements
4. Learn what product changes enable lower rates

This document defines:

1. **Tier Structure** - What each tier gets
2. **Feature Gating** - What's locked vs free
3. **Upsell Teasers** - Where/how we show paid features
4. **User Flows** - Free → Pro conversion paths
5. **Navigation & Portal** - How paid users access features

---

## 📊 Tier Structure

### Free Tier ($0)

| Feature | Limit | Notes |
|---------|-------|-------|
| **HTS Classification** | 5/day | Core hook - fast, accurate |
| **Base Tariff Display** | ✅ | MFN + Section 301 + IEEPA |
| **Alternative Codes** | ✅ | Shows alternatives exist |
| **Search History** | 10 searches | Rolling window |
| **Tariff Alerts** | 1 product | Email capture strategy |

**Free gets value** but sees "what could be" at every turn.

### Pro Tier ($99/month)

| Feature | Limit | Notes |
|---------|-------|-------|
| **HTS Classification** | Unlimited | No daily cap |
| **Same-Code Optimization** | ✅ | Find lower-duty alternatives |
| **Sourcing Intelligence** | ✅ | Full country comparison |
| **Landed Cost Calculator** | ✅ | Complete breakdown |
| **Tariff Monitoring** | 25 products | Full alert system |
| **Saved Products** | 100 | Portfolio management |
| **Search History** | Unlimited | Full history |
| **Export (CSV)** | ✅ | Basic exports |

### Business Tier ($299/month)

| Feature | Limit | Notes |
|---------|-------|-------|
| **Everything in Pro** | ✅ | |
| **Bulk Classification** | 500/upload | CSV/Excel import |
| **API Access** | 1,000 calls/mo | Integration |
| **Portfolio Optimizer** | ✅ | Catalog-wide savings |
| **Savings Reports (PDF)** | ✅ | Executive summaries |
| **Team Members** | 5 seats | Collaboration |
| **Priority Support** | ✅ | |

### Enterprise (Custom)

- Unlimited everything
- SSO/SAML
- Custom integrations
- Dedicated support
- White-label option

---

## 🎣 Upsell Teasers Strategy

### Teaser Placement Points

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           TEASER LOCATIONS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. CLASSIFICATION RESULT PAGE (after classify)                             │
│     └─ "Lower rate available" badge                                         │
│     └─ "Save with different sourcing" card                                  │
│     └─ "Set up tariff alerts" (free - email capture)                        │
│                                                                              │
│  2. DASHBOARD OVERVIEW                                                       │
│     └─ "Unlock Sourcing Intelligence" card (if never used)                  │
│     └─ Portfolio savings estimate (if saved products exist)                 │
│                                                                              │
│  3. SEARCH HISTORY (when limit reached)                                     │
│     └─ "Upgrade for unlimited history"                                      │
│                                                                              │
│  4. SAVED PRODUCTS (when limit reached)                                     │
│     └─ "Upgrade to save more products"                                      │
│                                                                              │
│  5. NAV ITEMS (for gated features)                                          │
│     └─ 🔒 icon + "Pro" badge on locked items                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Classification Result Teasers (Primary Conversion Point)

After showing the FREE classification result, display a "Strategic Classification" teaser:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 💰 COULD SAVE 15% WITH STRATEGIC CLASSIFICATION                    🔒 PRO  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Your product may qualify for a lower rate.                                 │
│  See how to legally optimize your classification.                           │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Your current rate:              55.0%                              │    │
│  │  Potential optimized rate:       as low as 10.0%                    │    │
│  │  ─────────────────────────────────────────────────                  │    │
│  │  Savings if you qualify:         $4,500 per $10k                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  [See if you qualify →]                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Key messaging principles:**
- ❌ DON'T say: "5 other codes found" (implies free code is wrong)
- ✅ DO say: "Could save X% with strategic classification"
- ❌ DON'T reveal: Which codes are cheaper
- ✅ DO show: That cheaper rates EXIST and the savings amount
- ❌ DON'T say: "More codes available" 
- ✅ DO say: "See if you qualify for lower rates"

**Logic for the teaser:**

| Condition | Teaser Type | Message |
|-----------|-------------|---------|
| Lower rate exists | Savings teaser | "Could save X%" |
| No lower rate | Default teaser | "Verify your classification" |
| High-tariff country (CN) | Sourcing mention | "Also: sourcing options available" |

### Teaser Component: `OptimizationTeasers.tsx`

```typescript
interface OptimizationTeasersProps {
  htsCode: string;
  country: string;
  effectiveRate: number;
  alternatives?: ConditionalAlternative[];
  userTier: 'free' | 'pro' | 'business' | 'enterprise';
  onUpgrade: () => void;
  onSetAlert: () => void;
}
```

---

## 🧭 Navigation Structure

### Current Navigation (Before)

```
📊 Overview
🔍 Classifications        ← Free (but limited)
📦 Supplier Explorer      ← Should be Pro
🌍 Sourcing Intelligence  ← Should be Pro
🗺️ Feature Library
⚙️ Settings
```

### Proposed Navigation (After)

**Option A: Minimal Changes (Recommended)**

```
📊 Overview               ← Dashboard (all users)
🔍 Classify               ← Free (5/day limit)
📁 My Products            ← Saved products + Monitoring (Pro unlocks full)
🌍 Sourcing               ← Pro (gated with preview)
⚙️ Settings
```

**Rationale:**
- "Classifications" → "Classify" (verb = action-oriented)
- "My Products" consolidates saved products + monitoring (currently split)
- "Sourcing" combines Cost Analysis + Suppliers (already tabbed)
- Remove "Supplier Explorer" as standalone (merge into Sourcing)
- Remove "Feature Library" (internal dev tool)

**Option B: Feature Flags in Current Nav**

Keep current nav but add visual indicators:

```
📊 Overview
🔍 Classifications       
📦 Supplier Explorer      🔒 Pro
🌍 Sourcing Intelligence  🔒 Pro
⚙️ Settings
```

### Navigation Behavior for Free Users

| Nav Item | Free User Behavior |
|----------|-------------------|
| **Overview** | Full access |
| **Classify** | Full access (5/day limit) |
| **My Products** | Shows saved products, limit 5. "Upgrade for more" |
| **Sourcing** | Shows preview + blur + upgrade CTA |
| **Settings** | Full access |

### Gated Feature UX Pattern

When free user clicks a Pro feature:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│          ┌──────────────────────────────────────────┐                       │
│          │  🔒 THIS IS A PRO FEATURE                │                       │
│          │                                          │                       │
│          │  Sourcing Intelligence helps you:        │                       │
│          │  • Compare landed costs across 20+ countries │                   │
│          │  • Find verified suppliers               │                       │
│          │  • Identify tariff savings opportunities │                       │
│          │                                          │                       │
│          │  Starting at $99/month                   │                       │
│          │                                          │                       │
│          │  [Start Free Trial]  [See Plans]         │                       │
│          └──────────────────────────────────────────┘                       │
│                                                                              │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  (blurred preview) │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 My Products Page Structure

The "My Products" page consolidates portfolio management:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📁 MY PRODUCTS                                          [+ Add Product]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [All Products]  [🔔 Monitored (12)]  [⚠️ Alerts (2)]  [📊 Analysis]        │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ALL PRODUCTS TAB                                                           │
│  ─────────────────                                                          │
│  • Table of saved products                                                  │
│  • Quick actions: View, Edit, Delete, Toggle Monitor                        │
│  • Bulk select + "Monitor Selected"                                         │
│                                                                              │
│  MONITORED TAB                                                              │
│  ─────────────────                                                          │
│  • Products with active monitoring                                          │
│  • Rate change indicators                                                   │
│  • "View Details" opens ProductDetailDrawer                                 │
│                                                                              │
│  ALERTS TAB                                                                 │
│  ─────────────────                                                          │
│  • Products with rate changes                                               │
│  • Action required items                                                    │
│  • Dismiss/acknowledge                                                      │
│                                                                              │
│  ANALYSIS TAB (Pro)                                                         │
│  ─────────────────                                                          │
│  • Portfolio-wide insights                                                  │
│  • "These 5 products have savings opportunities"                            │
│  • Export savings report (PDF)                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**This consolidates:**
- Current "Saved Products" tab from Classifications page
- Current "Tariff Monitoring" tab from Sourcing page
- Future "Portfolio Analysis" feature

---

## 🌍 Sourcing Page Structure (Pro)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🌍 SOURCING INTELLIGENCE                                    🔒 Pro Feature  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [💰 Cost Analysis]  [🏭 Find Suppliers]  [📈 Market Trends]                │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  COST ANALYSIS TAB                                                          │
│  ─────────────────                                                          │
│  • Landed cost calculator                                                   │
│  • Country comparison table                                                 │
│  • "Explore Suppliers" links to Find Suppliers tab                          │
│                                                                              │
│  FIND SUPPLIERS TAB                                                         │
│  ─────────────────                                                          │
│  • Supplier explorer (current SupplierExplorer)                             │
│  • Filter by country, HTS                                                   │
│  • Verification status badges                                               │
│                                                                              │
│  MARKET TRENDS TAB (Future)                                                 │
│  ─────────────────                                                          │
│  • Import volume trends                                                     │
│  • Country origin shifts                                                    │
│  • Uses USITC DataWeb data (already integrated!)                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 User & Subscription Data Model

### Database Schema Additions

```prisma
model User {
  // ... existing fields ...
  
  // Subscription
  tier              SubscriptionTier @default(free)
  subscriptionId    String?          // Stripe subscription ID
  subscriptionStart DateTime?
  subscriptionEnd   DateTime?
  
  // Usage tracking
  classificationsToday Int @default(0)
  classificationsReset DateTime @default(now())
  
  // Feature flags (for beta/override)
  featureFlags      Json?
}

enum SubscriptionTier {
  free
  pro
  business
  enterprise
}

model UsageLog {
  id        String   @id @default(cuid())
  userId    String
  feature   String   // 'classification', 'sourcing', 'export', etc.
  timestamp DateTime @default(now())
  metadata  Json?
  
  user      User     @relation(fields: [userId], references: [id])
  
  @@index([userId, feature, timestamp])
}
```

### Usage Check Middleware

```typescript
// middleware/checkUsage.ts
export async function checkClassificationLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
  upgradeRequired: boolean;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true, classificationsToday: true, classificationsReset: true }
  });
  
  if (!user) return { allowed: false, remaining: 0, limit: 0, upgradeRequired: true };
  
  // Reset counter if new day
  const now = new Date();
  const resetDate = new Date(user.classificationsReset);
  if (now.toDateString() !== resetDate.toDateString()) {
    await prisma.user.update({
      where: { id: userId },
      data: { classificationsToday: 0, classificationsReset: now }
    });
    user.classificationsToday = 0;
  }
  
  const limits: Record<SubscriptionTier, number> = {
    free: 5,
    pro: 999999,       // Unlimited
    business: 999999,
    enterprise: 999999,
  };
  
  const limit = limits[user.tier];
  const remaining = Math.max(0, limit - user.classificationsToday);
  
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    upgradeRequired: user.tier === 'free' && remaining <= 0,
  };
}
```

---

## 📱 User Flows

### Flow 1: Free User → First Classification

```
1. User lands on /dashboard/classify
2. Enters product description
3. Gets classification result
4. Sees "Optimization Opportunities" teasers:
   - "Lower rate available" (if applicable) → Pro
   - "Save with different sourcing" (if CN/VN) → Pro  
   - "Set up tariff alert" → FREE (captures email)
5. User either:
   a. Clicks "Set up alert" → Email captured → Future nurture
   b. Clicks Pro teaser → Upgrade modal
   c. Saves product → Added to My Products
```

### Flow 2: Free User → Hits Daily Limit

```
1. User tries to classify 6th product of the day
2. Modal appears:
   ┌────────────────────────────────────────────┐
   │  You've used all 5 free classifications    │
   │  today.                                     │
   │                                             │
   │  Resets in: 14 hours 23 minutes            │
   │                                             │
   │  OR upgrade for unlimited:                  │
   │  [Start Free Trial - $99/mo]               │
   └────────────────────────────────────────────┘
3. User can:
   a. Wait for reset
   b. Start free trial
```

### Flow 3: Free User → Tries Sourcing Intelligence

```
1. User clicks "Sourcing Intelligence" in nav
2. Sees preview with blur + upgrade prompt:
   ┌────────────────────────────────────────────┐
   │  🔒 Sourcing Intelligence is a Pro feature │
   │                                             │
   │  Compare costs across 20+ countries,       │
   │  find verified suppliers, and save         │
   │  thousands on duties.                       │
   │                                             │
   │  [Start 14-Day Free Trial]                 │
   │  [See Example Analysis]                    │
   └────────────────────────────────────────────┘
3. "See Example Analysis" shows demo with fake data
4. "Start Free Trial" → Stripe checkout
```

### Flow 4: Pro User → Full Access

```
1. User has Pro subscription
2. All features unlocked:
   - Unlimited classifications
   - Full Sourcing Intelligence
   - Full portfolio management (25 monitored products)
   - CSV exports
3. No upgrade prompts (except for Business features like API)
```

---

## 💳 Pricing Page Structure

Create `/pricing` page (public, no auth required):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SIMPLE, TRANSPARENT PRICING                        │
│                   Classification is free. Optimization is Pro.              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │      FREE        │  │       PRO        │  │    BUSINESS      │          │
│  │                  │  │   MOST POPULAR   │  │                  │          │
│  │      $0          │  │    $99/mo        │  │    $299/mo       │          │
│  │                  │  │                  │  │                  │          │
│  │ • 5 classifies/day│ │ • Unlimited      │  │ • Everything Pro │          │
│  │ • Basic tariffs  │  │ • Sourcing Intel │  │ • Bulk upload    │          │
│  │ • 1 alert        │  │ • 25 monitors    │  │ • API access     │          │
│  │                  │  │ • CSV export     │  │ • 5 team seats   │          │
│  │                  │  │                  │  │ • PDF reports    │          │
│  │                  │  │                  │  │                  │          │
│  │ [Current Plan]   │  │ [Start Trial]    │  │ [Contact Sales]  │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│                     All plans include 14-day free trial                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Tasks

### Phase 1: Core Infrastructure (Sprint 6)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Add `tier` field to User model | P0 | 1h | Prisma migration |
| Create `checkUsage` middleware | P0 | 2h | Limit enforcement |
| Build `UsageLog` tracking | P0 | 2h | Analytics |
| Add daily limit to classify API | P0 | 2h | Return limit info |
| UI: Show remaining classifications | P0 | 1h | "4 of 5 remaining" |

### Phase 2: Teasers & Conversion (Sprint 6-7)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Build `OptimizationTeasers` component | P0 | 4h | Main conversion driver |
| Integrate teasers into ClassificationV10 | P0 | 2h | After result display |
| Build "Upgrade" modal component | P0 | 2h | Reusable |
| Build gated feature preview pattern | P1 | 3h | Blur + CTA |
| Add nav badges for locked features | P1 | 1h | 🔒 Pro |

### Phase 3: Navigation & Pages (Sprint 7)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Rename nav items per design | P1 | 1h | Classify, My Products, Sourcing |
| Build `/pricing` page | P1 | 4h | Public page |
| Consolidate "My Products" page | P1 | 4h | Merge saved + monitoring |
| Add tier check to Sourcing page | P1 | 2h | Gate or preview |

### Phase 4: Payments (Sprint 8)

| Task | Priority | Effort | Notes |
|------|----------|--------|-------|
| Stripe integration | P0 | 8h | Subscriptions |
| Webhook handlers | P0 | 4h | Subscription events |
| Customer portal | P1 | 2h | Manage subscription |
| Trial logic | P1 | 2h | 14-day trial |

---

## 📊 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Teaser visibility** | 100% of classifications | Show teaser section |
| **Teaser click rate** | 15%+ | Clicks on any teaser |
| **Alert signup rate** | 25%+ | Free users who set alert |
| **Trial start rate** | 5%+ | Free users who start trial |
| **Trial conversion** | 30%+ | Trial → Paid |
| **MRR from Pro** | $5k by Q1 2026 | Stripe dashboard |

---

## 🔗 Files to Create/Modify

### New Files

```
src/
├── components/
│   ├── billing/
│   │   ├── UpgradeModal.tsx          # Reusable upgrade prompt
│   │   ├── PricingCards.tsx          # Pricing comparison
│   │   └── UsageMeter.tsx            # "4 of 5 remaining"
│   └── features/
│       └── OptimizationTeasers.tsx   # Classification result teasers
├── hooks/
│   ├── useSubscription.ts            # Get user tier, limits
│   └── useFeatureGate.ts             # Check feature access
├── lib/
│   ├── stripe.ts                     # Stripe client
│   └── usage.ts                      # Usage tracking
└── app/
    ├── pricing/
    │   └── page.tsx                  # Public pricing page
    ├── api/
    │   ├── billing/
    │   │   ├── checkout/route.ts     # Create checkout session
    │   │   ├── portal/route.ts       # Customer portal
    │   │   └── webhook/route.ts      # Stripe webhooks
    │   └── usage/
    │       └── route.ts              # Usage stats
    └── (dashboard)/
        └── dashboard/
            └── products/
                └── page.tsx          # New "My Products" page
```

### Files to Modify

```
src/
├── components/layouts/
│   └── DashboardLayout.tsx           # Update nav items, add badges
├── features/compliance/components/
│   └── ClassificationV10LayoutB.tsx  # Add teasers section
├── app/api/
│   └── classify-v10/route.ts         # Add limit check
└── prisma/
    └── schema.prisma                 # Add tier, usage fields
```

---

## References

- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) - Pricing tiers defined
- [ARCHITECTURE_HTS_CLASSIFICATION.md](./ARCHITECTURE_HTS_CLASSIFICATION.md) - Classification engine
- [ARCHITECTURE_TARIFF_MONITORING.md](./ARCHITECTURE_TARIFF_MONITORING.md) - Monitoring system

---

*This document defines the paid features strategy. Implementation starts Sprint 6.*

