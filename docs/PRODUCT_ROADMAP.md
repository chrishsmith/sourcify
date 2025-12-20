# Sourcify Product Roadmap

> **Version:** 1.0.0  
> **Created:** December 19, 2024  
> **Last Updated:** December 19, 2024  
> **Status:** Active Development

---

## 📋 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Dec 19, 2024 | Team | Initial roadmap - Sourcing Intelligence + Monitoring |

---

## 🎯 Product Vision

**Sourcify** is the affordable, intuitive alternative to enterprise trade intelligence platforms like Datamyne. We help importers:

1. **Classify** products accurately with AI
2. **Optimize** sourcing to minimize landed costs
3. **Monitor** tariffs, competitors, and market shifts
4. **Act** on intelligence before competitors do

### Competitive Positioning

| | Datamyne | Sourcify |
|---|----------|----------|
| **Target** | Enterprise | SMB + Mid-market |
| **Pricing** | $10k+/year | Freemium + $99-499/mo |
| **UX** | Analyst-focused | Operator-focused |
| **AI** | Limited | Core differentiator |
| **Value Prop** | "Here's the data" | "Here's what to do" |

---

## 🗺️ Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SOURCIFY ROADMAP 2024-2025                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PHASE 1: SOURCING INTELLIGENCE (Current)                    Target: Jan 2025   │
│  ════════════════════════════════════════                                       │
│  ✅ Classification Engine (Complete)                                            │
│  ✅ Tariff Calculation (Complete)                                               │
│  ✅ Basic Sourcing Analysis (Complete)                                          │
│  🔲 Classification → Sourcing Flow                                              │
│  🔲 Enhanced Sourcing Input                                                     │
│  🔲 Supplier Directory Polish                                                   │
│                                                                                  │
│  PHASE 2: TRADE INTELLIGENCE                                 Target: Feb 2025   │
│  ═══════════════════════════════                                                │
│  🔲 Tariff Alert System                                                         │
│  🔲 Saved Products Monitoring                                                   │
│  🔲 Intelligence Dashboard                                                      │
│  🔲 Weekly Digest Emails                                                        │
│                                                                                  │
│  PHASE 3: COMPETITIVE INTELLIGENCE                           Target: Q2 2025    │
│  ════════════════════════════════════                                           │
│  🔲 Competitor Watchlist                                                        │
│  🔲 Market Trends Dashboard                                                     │
│  🔲 Supplier Activity Monitoring                                                │
│                                                                                  │
│  PHASE 4: PORTFOLIO INTELLIGENCE                             Target: Q2 2025    │
│  ═══════════════════════════════════                                            │
│  🔲 Bulk Product Upload                                                         │
│  🔲 Portfolio Optimizer                                                         │
│  🔲 Savings Report Generator                                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 User Personas

### Primary Personas

| Persona | Description | Key Jobs | Pain Points |
|---------|-------------|----------|-------------|
| **Importer/Product Sourcer** | SMB brand owners, DTC sellers, Amazon FBA | Find cheaper sourcing, optimize supply chain | Paying too much in duties, no visibility |
| **Compliance Officer** | Mid-to-large company trade analyst | Ensure correct HTS codes, monitor tariffs | Avoid penalties, stay compliant |
| **Procurement Manager** | Buying for established companies | Diversify suppliers, negotiate with data | Supplier dependency, need backup options |
| **Entrepreneur** | Launching new products | Validate product economics | No idea where to source, what costs will be |

### Secondary Personas

| Persona | Description | Key Jobs |
|---------|-------------|----------|
| **Freight Forwarder** | Advising clients | Provide value-added sourcing advisory |
| **Trade Consultant** | Customs brokers, advisors | Win business by showing savings |

---

## 🚀 PHASE 1: Sourcing Intelligence

**Goal:** Connect classification → sourcing flow, make sourcing analysis accessible and actionable.

**Target Completion:** January 2025

### User Journeys

#### Journey A: Classification → Sourcing (Cross-sell)
```
[Classify Product] → [See Tariffs] → [CTA: "Save $X by sourcing elsewhere"]
                                  ↓
                    [Click] → [Sourcing Analysis for THIS product]
```

#### Journey B: Direct Sourcing Search
```
[Sourcing Page] → [Enter HTS or describe product] → [See Analysis]
```

### Features & Tasks

#### 1.1 Dynamic Sourcing CTA on Classification Results
**Priority:** P0 | **Effort:** 3-4 hours | **Status:** 🔲 Not Started

Replace the static "Alternative Sourcing Teaser" with a dynamic, clickable component.

**Current State:** Static tags showing Vietnam, Mexico, India with generic rates

**Target State:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  💡 SAVE ON IMPORT DUTIES                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  You're paying 32.5% total duty from China                              │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│  │ 🇻🇳 Vietnam      │  │ 🇲🇽 Mexico       │  │ 🇮🇳 India        │         │
│  │ 12.5% duty      │  │ 0% duty (USMCA) │  │ 10% duty        │         │
│  │ Save ~$2.40/unit│  │ Save ~$3.90/unit│  │ Save ~$2.70/unit│         │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘         │
│                                                                          │
│  [🔍 Full Sourcing Analysis]                           [Compare All →]  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Create `SourcingPreview` component
- [ ] Create `/api/sourcing/quick` endpoint for lightweight preview data
- [ ] Integrate into `ClassificationResult.tsx`
- [ ] Add click handler to navigate to `/dashboard/sourcing?hts=X&from=Y`

**Files to Modify:**
- `src/features/compliance/components/ClassificationResult.tsx`
- `src/features/sourcing/components/SourcingPreview.tsx` (new)
- `src/app/api/sourcing/quick/route.ts` (new)

---

#### 1.2 URL Parameter Support for Sourcing Page
**Priority:** P0 | **Effort:** 1-2 hours | **Status:** 🔲 Not Started

Accept `?hts=X&from=Y` parameters to pre-populate the sourcing analysis.

**Tasks:**
- [ ] Parse URL params in `sourcing/page.tsx`
- [ ] Auto-trigger analysis when params present
- [ ] Show "Analyzing [product]..." loading state

**Files to Modify:**
- `src/app/(dashboard)/dashboard/sourcing/page.tsx`

---

#### 1.3 Natural Language Product Input
**Priority:** P1 | **Effort:** 4-6 hours | **Status:** 🔲 Not Started

Add tab for describing product in plain English (AI classifies first, then analyzes sourcing).

**Target State:**
```
┌──────────────────────────────────────────────────────────────┐
│ [Tab: HTS Code] [Tab: Describe Product]                      │
└──────────────────────────────────────────────────────────────┘

DESCRIBE PRODUCT TAB:
┌─────────────────────────────────────────────────────────────┐
│ Silicone earbuds for wireless headphones, retail packaging  │
└─────────────────────────────────────────────────────────────┘
┌────────────────┐ ┌─────────┐
│ China ▼        │ │ Analyze │  ← AI classifies first, then sources
└────────────────┘ └─────────┘
```

**Tasks:**
- [ ] Add Tabs component to sourcing page
- [ ] Create classification → sourcing bridge in API
- [ ] Show intermediate "Classifying..." → "Analyzing sourcing..." states
- [ ] Display inferred HTS code in results

**Files to Modify:**
- `src/app/(dashboard)/dashboard/sourcing/page.tsx`
- `src/app/api/sourcing/analyze/route.ts`

---

#### 1.4 Sourcing Results Enhancement
**Priority:** P1 | **Effort:** 2-3 hours | **Status:** 🔲 Not Started

Polish the existing `SourcingRecommendations` component.

**Enhancements:**
- [ ] Add "vs Current" column highlighting
- [ ] Improve mobile responsiveness
- [ ] Add skeleton loading states
- [ ] Add "Explore Suppliers" button per country row

**Files to Modify:**
- `src/features/sourcing/components/SourcingRecommendations.tsx`

---

#### 1.5 Supplier Explorer Integration
**Priority:** P2 | **Effort:** 2 hours | **Status:** 🔲 Not Started

Connect country rows to filtered supplier search.

**Tasks:**
- [ ] Add click handler on country rows
- [ ] Navigate to Suppliers tab with pre-filtered country + HTS

**Files to Modify:**
- `src/features/sourcing/components/SourcingRecommendations.tsx`
- `src/features/sourcing/components/SupplierExplorer.tsx`

---

### Phase 1 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Classification → Sourcing click rate | 15%+ | Track CTA clicks / classifications |
| Sourcing page completion rate | 60%+ | Start analysis → View results |
| Time to first insight | < 5 seconds | API response time |
| User return rate | 30%+ | Return within 7 days |

---

## 📡 PHASE 2: Trade Intelligence

**Goal:** Transform from transactional tool to ongoing intelligence platform.

**Target Completion:** February 2025

### Intelligence Use Cases

| Use Case | Description | User Value |
|----------|-------------|------------|
| **Tariff Monitoring** | Alert when rates change | Never be blindsided |
| **Policy Tracking** | New Section 301, IEEPA updates | Plan ahead |
| **Portfolio Impact** | "New tariffs affect 3 of your products" | Personalized alerts |
| **Opportunity Detection** | "Save $X by reclassifying" | Proactive savings |

### Features & Tasks

#### 2.1 Tariff Alert System
**Priority:** P0 | **Effort:** 1-2 days | **Status:** 🔲 Not Started

Allow users to subscribe to tariff changes for specific HTS codes.

**User Flow:**
```
[Classification Result] → [🔔 Alert me of changes] → [Confirm]
                                                   ↓
[Tariff changes] → [Email notification] → [Dashboard alert]
```

**Data Model:**
```prisma
model TariffAlert {
  id            String   @id @default(cuid())
  userId        String
  htsCode       String
  countryCode   String?
  currentRate   Float
  createdAt     DateTime @default(now())
  lastChecked   DateTime?
  isActive      Boolean  @default(true)
  
  user          User     @relation(fields: [userId], references: [id])
}

model TariffAlertHistory {
  id            String   @id @default(cuid())
  alertId       String
  previousRate  Float
  newRate       Float
  changeType    String   // "INCREASE" | "DECREASE" | "NEW"
  detectedAt    DateTime @default(now())
  notifiedAt    DateTime?
  
  alert         TariffAlert @relation(fields: [alertId], references: [id])
}
```

**Tasks:**
- [ ] Create database models
- [ ] Build "Subscribe to alerts" UI component
- [ ] Create `/api/tariff-alerts` CRUD endpoints
- [ ] Build tariff change detection service
- [ ] Set up cron job for daily checks
- [ ] Implement email notifications (Resend/SendGrid)

**Files to Create:**
- `src/services/tariffAlertService.ts`
- `src/app/api/tariff-alerts/route.ts`
- `src/app/api/tariff-alerts/[id]/route.ts`
- `src/features/compliance/components/TariffAlertButton.tsx`

---

#### 2.2 Saved Products Monitoring
**Priority:** P0 | **Effort:** 1 day | **Status:** 🔲 Not Started

Automatically monitor tariff changes for all saved products.

**Tasks:**
- [ ] Extend TariffAlert to link to SavedProduct
- [ ] Auto-create alerts when product is saved
- [ ] Show alert status on saved products list
- [ ] Dashboard widget: "X alerts on your products"

---

#### 2.3 Intelligence Dashboard
**Priority:** P1 | **Effort:** 3-4 days | **Status:** 🔲 Not Started

Central hub for all intelligence and alerts.

**Dashboard Wireframe:**
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📊 INTELLIGENCE CENTER                                        [Settings] [🔔] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ 🔴 3 ALERTS NEED ATTENTION                                                  ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │ • Section 301 List 4A increase to 15% effective Feb 1 → 2 of your products ││
│  │ • New AD investigation on fasteners from Taiwan → Affects 1 saved supplier ││
│  │ • USMCA rules of origin update for textiles → Review your Mexico sourcing  ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│                                                                                  │
│  ┌─────────────────────────────┐ ┌─────────────────────────────┐               │
│  │ MY PORTFOLIO IMPACT         │ │ OPPORTUNITIES               │               │
│  │                             │ │                             │               │
│  │ Products monitored: 12      │ │ 💰 $23,400/yr potential     │               │
│  │ Tariff changes: 3 this week │ │    savings identified       │               │
│  │ Est. duty impact: +$4,200   │ │                             │               │
│  │                             │ │ • 2 products: shift to MX   │               │
│  │ [View Details →]            │ │ • 1 product: reclassify     │               │
│  └─────────────────────────────┘ └─────────────────────────────┘               │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ 👀 WATCHING                                                                 ││
│  ├─────────────────────────────────────────────────────────────────────────────┤│
│  │ HTS CODES (8)              PRODUCTS (12)           SUPPLIERS (5)            ││
│  │ [Manage →]                 [Manage →]              [Manage →]               ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Tasks:**
- [ ] Create `/dashboard/intelligence` page
- [ ] Build alert summary component
- [ ] Build portfolio impact widget
- [ ] Build opportunities widget
- [ ] Build "watching" summary component

**Files to Create:**
- `src/app/(dashboard)/dashboard/intelligence/page.tsx`
- `src/features/intelligence/components/AlertsSummary.tsx`
- `src/features/intelligence/components/PortfolioImpact.tsx`
- `src/features/intelligence/components/OpportunitiesWidget.tsx`
- `src/features/intelligence/components/WatchlistSummary.tsx`

---

#### 2.4 Weekly Digest Email
**Priority:** P1 | **Effort:** 1-2 days | **Status:** 🔲 Not Started

Automated weekly summary of intelligence.

**Email Content:**
```
Subject: Your Trade Intelligence Digest - Week of Dec 16

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 YOUR WEEKLY SUMMARY

Tariff Changes: 3 affecting your products
Estimated Impact: +$4,200/year in duties
Opportunities Found: 2 potential savings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 ACTION REQUIRED

1. Section 301 List 4A increasing to 15%
   Affects: Silicone Earbuds (HTS 3926.90.9910)
   New duty: 15% → Was: 7.5%
   [Review Now →]

2. USMCA origin rules updated
   Affects: Your Mexico sourcing
   [Review Changes →]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 OPPORTUNITY

Switch "Cotton T-shirts" from Bangladesh to Mexico
Potential savings: $8,400/year
[Explore →]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Tasks:**
- [ ] Set up email service (Resend recommended)
- [ ] Create email templates
- [ ] Build digest generation service
- [ ] Set up weekly cron job
- [ ] Add email preferences to user settings

---

#### 2.5 Tariff Data Sources Integration
**Priority:** P0 | **Effort:** 2-3 days | **Status:** 🔲 Not Started

Establish reliable data feeds for tariff monitoring.

**Data Sources:**

| Source | Data | Update Frequency | Cost |
|--------|------|------------------|------|
| USITC HTS Database | Base rates, special programs | Quarterly | Free |
| Federal Register | New tariff announcements | Daily | Free |
| CBP CROSS | Rulings, guidance | Daily | Free |
| ITA AD/CVD | Anti-dumping orders | Weekly | Free |

**Tasks:**
- [ ] Build USITC scraper/API client
- [ ] Build Federal Register monitor
- [ ] Build AD/CVD database sync
- [ ] Create unified tariff change detection service
- [ ] Store historical rates for comparison

---

### Phase 2 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Alert signup rate | 25%+ of classified products | Alerts created / classifications |
| Email open rate | 40%+ | Email analytics |
| Dashboard engagement | 3+ visits/week for active users | Page views |
| Alert-to-action rate | 20%+ | Clicks on alert CTAs |

---

## 🔭 PHASE 3: Competitive Intelligence

**Goal:** Enable users to track competitors and market trends.

**Target Completion:** Q2 2025

### Features (High-Level)

#### 3.1 Competitor Watchlist
- Track specific company import activity
- Alert on new suppliers, volume changes, country shifts
- **Data Requirement:** Bill of lading data (expensive)

#### 3.2 Market Trends Dashboard
- Volume/value trends by HTS chapter
- Country origin shifts over time
- Price movement tracking

#### 3.3 Supplier Activity Monitoring
- Track saved suppliers' export patterns
- Alert on volume drops (risk signal)
- Alert on new products from supplier

### Data Strategy

**Option A: Partner with Data Provider**
- ImportGenius, Panjiva, or similar
- Cost: $10k-50k/year
- Pros: Comprehensive, reliable
- Cons: Expensive, margin pressure

**Option B: Build Incrementally**
- Start with public data (CBP, USITC)
- Add paid sources as revenue grows
- Pros: Lower upfront cost
- Cons: Limited competitive intel initially

**Recommendation:** Start with Phase 2 (tariff monitoring) using free data, validate demand, then invest in paid data for Phase 3.

---

## 📦 PHASE 4: Portfolio Intelligence

**Goal:** Enable bulk analysis and optimization across entire product catalogs.

**Target Completion:** Q2 2025

### Features (High-Level)

#### 4.1 Bulk Product Upload
- CSV/Excel import of product catalog
- Batch classification
- Batch tariff calculation

#### 4.2 Portfolio Optimizer
- Analyze entire catalog for savings opportunities
- Prioritized recommendations by ROI
- "These 5 products have the biggest savings opportunity"

#### 4.3 Savings Report Generator
- Executive summary PDF
- "You're paying $X in avoidable duties"
- Actionable recommendations with estimated savings

---

## 🛠️ Technical Architecture

### Current Stack
- **Frontend:** Next.js 14, React, Ant Design, Tailwind
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Prisma ORM)
- **AI:** Grok (xAI) for classification and insights
- **Auth:** Better Auth

### Infrastructure Needs for Intelligence

| Component | Purpose | Options |
|-----------|---------|---------|
| **Cron Jobs** | Tariff monitoring, digest emails | Vercel Cron, Inngest, Trigger.dev |
| **Email** | Alerts, digests | Resend, SendGrid |
| **Queue** | Background processing | Inngest, BullMQ |
| **Cache** | API response caching | Redis, Vercel KV |

### Recommended Additions
- **Inngest** for background jobs (tariff monitoring, email digests)
- **Resend** for transactional emails
- **Vercel KV** for caching tariff data

---

## 📅 Sprint Planning

### Sprint 1 (Current - Week of Dec 16)
**Theme:** Classification → Sourcing Flow

| Task | Owner | Status | Est. Hours |
|------|-------|--------|------------|
| 1.1 Dynamic Sourcing CTA | TBD | 🔲 | 4h |
| 1.2 URL Parameter Support | TBD | 🔲 | 2h |
| Testing & Polish | TBD | 🔲 | 2h |

**Sprint Goal:** Users can click from classification result to sourcing analysis

---

### Sprint 2 (Week of Dec 23)
**Theme:** Enhanced Sourcing Input

| Task | Owner | Status | Est. Hours |
|------|-------|--------|------------|
| 1.3 Natural Language Input | TBD | 🔲 | 6h |
| 1.4 Results Enhancement | TBD | 🔲 | 3h |
| Testing & Polish | TBD | 🔲 | 2h |

**Sprint Goal:** Users can describe products in plain English for sourcing analysis

---

### Sprint 3 (Week of Dec 30)
**Theme:** Tariff Alerts Foundation

| Task | Owner | Status | Est. Hours |
|------|-------|--------|------------|
| 2.1 Tariff Alert System | TBD | 🔲 | 12h |
| 2.5 Data Sources Setup | TBD | 🔲 | 8h |

**Sprint Goal:** Users can subscribe to tariff alerts

---

### Sprint 4 (Week of Jan 6)
**Theme:** Intelligence Dashboard

| Task | Owner | Status | Est. Hours |
|------|-------|--------|------------|
| 2.2 Saved Products Monitoring | TBD | 🔲 | 6h |
| 2.3 Intelligence Dashboard | TBD | 🔲 | 12h |

**Sprint Goal:** Central intelligence hub live

---

### Sprint 5 (Week of Jan 13)
**Theme:** Email & Polish

| Task | Owner | Status | Est. Hours |
|------|-------|--------|------------|
| 2.4 Weekly Digest Email | TBD | 🔲 | 8h |
| Bug fixes & polish | TBD | 🔲 | 8h |

**Sprint Goal:** Complete Phase 2, ready for beta users

---

## 📈 KPIs & Goals

### North Star Metric
**Weekly Active Analyzers:** Users who run at least one classification or sourcing analysis per week

### Phase 1 Goals
- [ ] 100 classifications with sourcing CTA shown
- [ ] 15%+ click-through to sourcing analysis
- [ ] 60%+ completion rate on sourcing analysis

### Phase 2 Goals
- [ ] 50 users with active tariff alerts
- [ ] 40%+ email open rate on digests
- [ ] 3+ dashboard visits/week for engaged users

### Revenue Goals
- **Free Tier:** 3 classifications/month, basic sourcing
- **Pro ($99/mo):** Unlimited classifications, tariff alerts, intelligence dashboard
- **Business ($299/mo):** API access, team features, priority support

---

## 🚧 Parking Lot (Future Ideas)

Ideas to consider for future phases:

- [ ] Mobile app
- [ ] API for third-party integrations
- [ ] Customs broker marketplace
- [ ] Supplier RFQ system
- [ ] Freight rate integration
- [ ] Currency hedging recommendations
- [ ] Compliance document generation
- [ ] Team collaboration features
- [ ] White-label for freight forwarders

---

## 📞 Contacts & Resources

### Key Links
- **Codebase:** [sourcify repo]
- **Design:** [Figma link TBD]
- **Analytics:** [Amplitude/Mixpanel TBD]

### Reference Competitors
- [Datamyne](https://www.datamyne.com/) - Enterprise trade intelligence
- [ImportGenius](https://www.importgenius.com/) - Import/export data
- [Panjiva](https://panjiva.com/) - Supply chain intelligence
- [Zonos](https://zonos.com/) - Landed cost calculator

### Data Sources
- [USITC HTS](https://hts.usitc.gov/) - Official HTS database
- [CBP CROSS](https://rulings.cbp.gov/) - Customs rulings
- [Federal Register](https://www.federalregister.gov/) - Trade announcements
- [ITA AD/CVD](https://www.trade.gov/enforcement-and-compliance) - Anti-dumping orders

---

*This document is a living roadmap. Update version and revision history with each significant change.*
