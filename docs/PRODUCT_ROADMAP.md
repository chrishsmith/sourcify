# Sourcify Product Roadmap

> **Version:** 1.4.0  
> **Created:** December 19, 2024  
> **Last Updated:** January 2, 2026  
> **Status:** Active Development

---

## 📋 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.4.0 | Jan 2, 2026 | Team | Subscription foundation complete, pricing page live, navigation redesign |
| 1.3.0 | Jan 1, 2026 | Team | Comprehensive services catalog + new optimization services |
| 1.2.0 | Dec 30, 2025 | Team | Added funnel strategy (classification = hook, optimization = upsell) |
| 1.1.0 | Dec 20, 2025 | Team | Added Country Tariff Registry (centralized data service) |
| 1.0.0 | Dec 19, 2024 | Team | Initial roadmap - Sourcing Intelligence + Monitoring |

---

## 🎯 Product Vision

**Sourcify** is the affordable, intuitive alternative to enterprise trade intelligence platforms like Datamyne. We help importers:

1. **Classify** products accurately with AI (free)
2. **Optimize** sourcing to minimize landed costs (paid)
3. **Monitor** tariffs, competitors, and market shifts (paid)
4. **Act** on intelligence before competitors do (paid)

### Competitive Positioning

| | Datamyne | Sourcify |
|---|----------|----------|
| **Target** | Enterprise | SMB + Mid-market |
| **Pricing** | $10k+/year | Freemium + $99-499/mo |
| **UX** | Analyst-focused | Operator-focused |
| **AI** | Limited | Core differentiator |
| **Value Prop** | "Here's the data" | "Here's what to do" |

---

## 🎣 Funnel Strategy

**Classification is the hook, not the product.**

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SOURCIFY FUNNEL                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  TOP OF FUNNEL: FREE CLASSIFICATION                                              │
│  ════════════════════════════════════                                            │
│  • Fast (<6 sec) HTS code classification                                         │
│  • Base tariff rate display                                                      │
│  • Alternative codes with confidence                                             │
│  • Conditional classification (size/value)                                       │
│                                                                                  │
│  CONVERSION TEASERS (shown in results):                                          │
│  ════════════════════════════════════════                                        │
│  💡 "We found an alternative code that could save 5% on duties"                  │
│     → [Unlock Savings Analysis]                                                  │
│                                                                                  │
│  🌍 "Sourcing from Vietnam instead of China could save ~25%"                     │
│     → [Explore Sourcing Intelligence]                                            │
│                                                                                  │
│  📋 "3 CBP rulings support this classification"                                  │
│     → [View Detailed Analysis]                                                   │
│                                                                                  │
│  🔔 "Alert me when tariffs change" (free - captures email)                       │
│     → [Set Up Alerts]                                                            │
│                                                                                  │
│  PAID SERVICES (the revenue):                                                    │
│  ═════════════════════════════                                                   │
│  • Same-Country Optimization: Find alternative HTS codes with lower rates        │
│  • Country Sourcing Intelligence: Compare landed costs across countries          │
│  • Tariff Monitoring: Alerts when rates change                                   │
│  • Portfolio Analysis: Bulk optimization across product catalog                  │
│  • CBP Ruling Research: Detailed classification support                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Pricing Model (✅ Implemented Jan 2, 2026)

> **Live at:** `/pricing`  
> **Schema:** `SubscriptionTier` enum in Prisma

| Tier | Price | Key Features |
|------|-------|--------------|
| **Free** | $0 | 5 classifications/day, 1 alert, 10 search history |
| **Pro** | $99/mo | Unlimited classifications, sourcing intelligence, 25 alerts, 100 saved products |
| **Business** | $299/mo | Bulk classification (500/upload), API (1,000 calls/mo), 5 team members, PDF reports |
| **Enterprise** | Custom | White-label, dedicated support, custom integrations |

**Annual Billing:** 17% discount (2 months free)

**Subscription Database Fields:**
```prisma
tier                  SubscriptionTier @default(free)
stripeCustomerId      String?
stripeSubscriptionId  String?
subscriptionStatus    SubscriptionStatus @default(active)
classificationsToday  Int @default(0)
classificationsReset  DateTime @default(now())
trialEndsAt           DateTime?
```

---

## 📦 Services Catalog

### BUILT ✅ (Production Ready)

#### 1. HTS Classification Engine
| Status | ✅ LIVE |
|--------|---------|
| **What it does** | AI-powered semantic search classification (~4 seconds) |
| **Key Features** | 27,061 HTS codes with embeddings, conditional classification, alternatives |
| **Files** | `classificationEngineV10.ts`, `htsEmbeddings.ts` |
| **API** | `POST /api/classify-v10` |
| **Tier** | Free |

#### 2. Country Tariff Registry
| Status | ✅ LIVE |
|--------|---------|
| **What it does** | Single source of truth for all tariff data (199 countries) |
| **Data Sources** | USITC HTS API, Federal Register, OFAC, FTA List, AD/CVD Orders |
| **Key Features** | Complete tariff breakdown (MFN + 301 + IEEPA + Fentanyl + Reciprocal) |
| **Files** | `tariffRegistry.ts`, `tariffRegistrySync.ts` |
| **API** | `POST /api/tariff-registry/sync` |
| **Tier** | Internal |

#### 3. Landed Cost Calculator
| Status | ✅ LIVE |
|--------|---------|
| **What it does** | Full landed cost comparison across countries |
| **Data Sources** | **USITC DataWeb API** - REAL import volume/value by country |
| **Key Features** | Product cost (from real import data), shipping estimates, tariff breakdown, MPF/HMF fees |
| **Files** | `landedCost.ts`, `usitcDataWeb.ts` |
| **API** | `GET /api/sourcing/landed-cost` |
| **Tier** | Pro |

#### 4. Tariff Monitoring System
| Status | ✅ LIVE |
|--------|---------|
| **What it does** | Track tariff changes for saved products |
| **Key Features** | Dashboard card, product drawer, rate history, bulk actions |
| **Files** | `TariffMonitoringTab.tsx`, `ProductDetailDrawer.tsx`, `tariffAlerts.ts` |
| **Missing** | Email notifications, automated daily sync |
| **Tier** | Pro |

#### 5. Sourcing Intelligence
| Status | ✅ LIVE |
|--------|---------|
| **What it does** | Compare sourcing options across countries |
| **Key Features** | Country comparison table, savings calculations, supplier explorer |
| **Files** | `sourcingAdvisor.ts`, `SourcingRecommendations.tsx` |
| **API** | `/api/sourcing/analyze`, `/api/sourcing/quick` |
| **Tier** | Pro |

---

### SPEC'D 📐 (Designed, Not Built)

#### 6. Duty Optimizer
| Status | 📐 ARCHITECTURE COMPLETE |
|--------|---------|
| **What it does** | Exhaustive HTS code analysis - find ALL applicable codes, not just "best match" |
| **User Value** | "Here are 8 codes that could apply. One saves you 15% on duties." |
| **Architecture** | [`ARCHITECTURE_DUTY_OPTIMIZER.md`](./ARCHITECTURE_DUTY_OPTIMIZER.md) |
| **Key Features** | AI-powered product interpretation, condition extraction, plain English translations, smart questions |
| **Complexity** | Medium-High - V10 foundation + AI layer |
| **Tier** | Pro |

#### 7. CBP Ruling Research
| Status | 📐 SPEC'D |
|--------|---------|
| **What it does** | Match products to CBP CROSS rulings for classification defensibility |
| **User Value** | "3 CBP rulings support this classification" |
| **Data Source** | CBP CROSS (scrapeable) |
| **Complexity** | High - need scraper + matching logic |
| **Tier** | Business |

#### 8. Bulk Classification / Portfolio Analysis
| Status | 📐 SPEC'D |
|--------|---------|
| **What it does** | CSV/Excel upload, batch classification, portfolio-wide optimization |
| **User Value** | "These 5 products have the biggest savings opportunity" |
| **Key Features** | AI enrichment, Savings Report Generator (PDF) |
| **Complexity** | Medium |
| **Tier** | Business |

#### 9. What-If Simulator / Explore Mode
| Status | 📐 SPEC'D |
|--------|---------|
| **What it does** | Interactive duty calculator for product development |
| **User Value** | "Change material/value/country → see duty impact instantly" |
| **Key Features** | Scenario comparison, annual cost projections |
| **Wireframe** | `DESIGN_GUIDED_CLASSIFICATION.md` lines 565-641 |
| **Complexity** | Medium |
| **Tier** | Pro |

#### 10. Weekly Digest Email
| Status | 📐 SPEC'D |
|--------|---------|
| **What it does** | Automated weekly summary of tariff changes + opportunities |
| **Key Features** | Personalized alerts, dollar impact estimates, action items |
| **Complexity** | Medium - need email service (Resend) |
| **Tier** | Free (engagement driver) |

#### 11. Competitor Watchlist
| Status | 📐 SPEC'D |
|--------|---------|
| **What it does** | Track competitor import activity |
| **User Value** | "Your competitor started importing from Vietnam last month" |
| **Data Source** | Bill of Lading data (expensive: $10k-50k/year) |
| **Complexity** | High - expensive data |
| **Tier** | Enterprise |

#### 12. Market Trends Dashboard
| Status | 📐 SPEC'D |
|--------|---------|
| **What it does** | Volume/value trends by HTS chapter, country origin shifts |
| **Data Source** | USITC DataWeb (already integrated!) |
| **Complexity** | Low-Medium - data exists |
| **Tier** | Business |

---

### NOT SPEC'D 🆕 (New Opportunities)

#### 13. FTA Qualification Analyzer
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Detailed rules of origin analysis, Certificate of Origin guidance |
| **User Value** | "Is my product USMCA-qualified?" calculator |
| **Use Case** | Importers want to know if they can claim FTA benefits |
| **Complexity** | High - complex rules per FTA |
| **Tier** | Business |

#### 14. Tariff Engineering Advisor
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Suggest product modifications to qualify for lower tariffs |
| **User Value** | "Change from >50% cotton to >50% synthetic, duty drops 15%" |
| **Use Case** | Product designers optimizing for duty savings |
| **Complexity** | High - need deep HTS knowledge |
| **Tier** | Business |

#### 15. Duty Drawback Identification
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Identify products eligible for duty drawback (refunds on re-exported goods) |
| **User Value** | "You may be eligible for $X in duty refunds" |
| **Use Case** | Manufacturers who import and re-export |
| **Complexity** | Medium |
| **Tier** | Business |

#### 16. Section 301 Exclusion Tracker
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Track product exclusion requests, alert when exclusions expire |
| **User Value** | "Your exclusion expires in 30 days - duty will increase 25%" |
| **Data Source** | Federal Register (already integrated!) |
| **Complexity** | Medium |
| **Tier** | Pro |

#### 17. De Minimis Calculator
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Calculate if shipments qualify for duty-free de minimis entry (<$800) |
| **User Value** | "Split into 3 shipments to qualify for de minimis" |
| **Use Case** | Small importers, DTC brands |
| **Complexity** | Low |
| **Tier** | Free |

#### 18. Port/Entry Optimization
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Compare entry costs by port, FTZ benefit analysis |
| **User Value** | "Entry via Port of Savannah saves $X vs LA" |
| **Complexity** | Medium - need port data |
| **Tier** | Business |

#### 19. Supplier Verification & Due Diligence
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Verify supplier legitimacy, denied party screening |
| **Key Features** | CTPAT/AEO status check, ESG scoring |
| **Data Sources** | BIS Entity List, OFAC SDN List |
| **Complexity** | Medium |
| **Tier** | Business |

#### 20. Product Safety Screening
| Status | 🆕 NEW |
|--------|---------|
| **What it does** | Check products/suppliers against FDA alerts, CPSC recalls |
| **User Value** | "Warning: This supplier has 3 active FDA import alerts" |
| **Data Sources** | FDA API, CPSC API |
| **Complexity** | Low - APIs are free |
| **Tier** | Pro |

---

### Service Priority Matrix

| Service | Revenue Impact | Build Effort | Data Available | Priority |
|---------|----------------|--------------|----------------|----------|
| **Duty Optimizer** | High | Medium | ✅ Yes | **P0** |
| Weekly Digest Email | Medium | Medium | ✅ Yes | **P0** |
| Section 301 Exclusion Tracker | High | Medium | ✅ Yes | **P1** |
| De Minimis Calculator | Low | Low | ✅ Yes | **P1** |
| Market Trends Dashboard | Medium | Low | ✅ Yes | **P1** |
| What-If Simulator | Medium | Medium | ✅ Yes | **P2** |
| Product Safety Screening | Medium | Low | ✅ Yes | **P2** |
| Bulk Classification | High | Medium | ✅ Yes | **P2** |
| CBP Ruling Research | High | High | 🔲 Scraper | **P3** |
| FTA Qualification Analyzer | High | High | 🔲 Rules | **P3** |
| Tariff Engineering Advisor | High | High | 🔲 Knowledge | **P3** |
| Duty Drawback ID | Medium | Medium | 🔲 Rules | **P3** |
| Supplier Verification | Medium | Medium | 🔲 APIs | **P3** |
| Port Optimization | Medium | Medium | 🔲 Data | **P4** |
| Competitor Watchlist | High | High | 💰 Expensive | **P4** |

---

## 🗺️ Roadmap Overview

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SOURCIFY ROADMAP 2025-2026                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  PHASE 0: CORE CLASSIFICATION (✅ COMPLETE)                  Dec 30, 2025       │
│  ═══════════════════════════════════════════                                    │
│  ✅ Semantic Search Engine (~4s classification)                                 │
│  ✅ 27,061 HTS codes with embeddings                                            │
│  ✅ Conditional classification (size/value)                                     │
│  ✅ Country Tariff Registry (199 countries, 7 data sources)                     │
│  ✅ Frontend UI with alternatives + duty breakdown                              │
│                                                                                  │
│  PHASE 1: SOURCING FOUNDATION (✅ COMPLETE)                  Dec 30, 2025       │
│  ═══════════════════════════════════════════                                    │
│  ✅ USITC DataWeb Integration (real import volume/value)                        │
│  ✅ Landed Cost Calculator (full breakdown)                                     │
│  ✅ Country Comparison Table                                                    │
│  ✅ Supplier Explorer                                                           │
│                                                                                  │
│  PHASE 2: TARIFF MONITORING (✅ 95% COMPLETE)                Jan 1, 2026        │
│  ═══════════════════════════════════════════                                    │
│  ✅ Tariff Alert System (backend + UI)                                          │
│  ✅ Saved Products Monitoring (full flow)                                       │
│  ✅ Intelligence Dashboard Card                                                 │
│  ✅ Product Detail Drawer                                                       │
│  🔲 Weekly Digest Email                                                         │
│  🔲 Automated Daily Sync (cron)                                                 │
│                                                                                  │
│  PHASE 3: PAID FEATURES FOUNDATION (Current)                 Target: Jan 2026   │
│  ══════════════════════════════════════════                                     │
│  ✅ Subscription schema (tier, Stripe IDs, usage tracking)                      │
│  ✅ Pricing page (/pricing) with tier comparison                                │
│  ✅ Navigation redesign (Classify, My Products, Sourcing, Feature Lab)          │
│  ✅ My Products page (consolidated product management)                          │
│  📐 Duty Optimizer architecture complete (ARCHITECTURE_DUTY_OPTIMIZER.md)       │
│  🔲 Duty Optimizer implementation (exhaustive HTS code finder)                  │
│  🔲 De Minimis Calculator (<$800 duty free)                                     │
│  🔲 Section 301 Exclusion Tracker                                               │
│  🔲 Upsell teasers on classification results                                    │
│  🔲 Stripe integration (after features complete)                                │
│                                                                                  │
│  PHASE 4: ADVANCED OPTIMIZATION                              Target: Q1 2026    │
│  ══════════════════════════════════════                                         │
│  🔲 What-If Simulator / Explore Mode                                            │
│  🔲 Market Trends Dashboard                                                     │
│  🔲 Product Safety Screening (FDA/CPSC)                                         │
│  🔲 FTA Qualification Analyzer                                                  │
│                                                                                  │
│  PHASE 5: ENTERPRISE / PORTFOLIO                             Target: Q2 2026    │
│  ══════════════════════════════════                                             │
│  🔲 Bulk Classification (CSV/Excel)                                             │
│  🔲 Portfolio Optimizer                                                         │
│  🔲 Savings Report Generator (PDF)                                              │
│  🔲 CBP Ruling Research                                                         │
│                                                                                  │
│  PHASE 6: COMPETITIVE INTELLIGENCE                           Target: Q3 2026    │
│  ════════════════════════════════════                                           │
│  🔲 Competitor Watchlist (requires BOL data)                                    │
│  🔲 Supplier Activity Monitoring                                                │
│  🔲 Supplier Verification & Due Diligence                                       │
│  🔲 Tariff Engineering Advisor                                                  │
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

#### 2.5 Tariff Data Sources Integration ✅ COMPLETE
**Priority:** P0 | **Effort:** 2-3 days | **Status:** ✅ Complete (Dec 20, 2025)

> **See:** [`ARCHITECTURE_TARIFF_REGISTRY.md`](./ARCHITECTURE_TARIFF_REGISTRY.md) for full technical details.

We built the **Country Tariff Registry** - a centralized service that is the single source of truth for all tariff data. All other services (classification, sourcing, alerts) pull from this registry.

**Active Data Sources (7):**
| Source | Data | Status |
|--------|------|--------|
| ISO 3166-1 | 199 countries | ✅ Active |
| USITC HTS API | Chapter 99 rates (301, IEEPA, 232) | ✅ Active |
| USITC DataWeb | Import volume & value | ✅ Active |
| Federal Register API | Executive orders, tariff rules | ✅ Active |
| USTR FTA List | 20 FTA partners | ✅ Active |
| OFAC Sanctions | Sanctioned countries | ✅ Active |
| AD/CVD Orders | Risk warnings | ✅ Active |

**Key Files:**
- `src/services/tariffRegistry.ts` - Core service (what other services import)
- `src/services/tariffRegistrySync.ts` - Data sync engine
- `/api/tariff-registry/sync` - Sync endpoint

**Usage:**
```typescript
import { getEffectiveTariff } from '@/services/tariffRegistry';
const tariff = await getEffectiveTariff('CN', '8518.30.20');
```

**⚠️ Requires daily sync** (not yet automated):
```bash
curl -X POST "http://localhost:3000/api/tariff-registry/sync?type=comprehensive"
```

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
- **Database:** PostgreSQL (Prisma ORM) + pgvector
- **AI:** Grok (xAI) for classification and insights
- **Auth:** Better Auth
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)

### Core Data Services

| Service | Purpose | File | Doc |
|---------|---------|------|-----|
| **Country Tariff Registry** | Single source of truth for all tariff data | `tariffRegistry.ts` | [Architecture Doc](./ARCHITECTURE_TARIFF_REGISTRY.md) |
| **Classification Engine** | AI-powered HTS classification | `classificationEngineV10.ts` | [Architecture Doc](./ARCHITECTURE_HTS_CLASSIFICATION.md) |
| **Duty Optimizer** | Exhaustive HTS code finder | `dutyOptimizer.ts` (planned) | [Architecture Doc](./ARCHITECTURE_DUTY_OPTIMIZER.md) |
| **Landed Cost Calculator** | Country comparison & full cost breakdown | `landedCost.ts` | - |
| **USITC DataWeb** | Real import volume/value statistics | `usitcDataWeb.ts` | - |
| **Sourcing Advisor** | Recommendations & savings analysis | `sourcingAdvisor.ts` | - |
| **Tariff Alerts** | Monitoring & change detection | `tariffAlerts.ts` | [Architecture Doc](./ARCHITECTURE_TARIFF_MONITORING.md) |

### Data Sources (Already Integrated ✅)

| Source | Service | Data Provided | Status |
|--------|---------|---------------|--------|
| **USITC HTS API** | `tariffRegistry.ts` | Chapter 99 rates, Section 301, IEEPA, 232 | ✅ Active |
| **USITC DataWeb API** | `usitcDataWeb.ts` | **Import volume & value by country** | ✅ Active |
| **Federal Register API** | `tariffRegistrySync.ts` | Executive orders, tariff announcements | ✅ Active |
| **ISO 3166-1** | `tariffRegistrySync.ts` | 199 countries | ✅ Active |
| **USTR FTA List** | `tariffRegistrySync.ts` | 20 FTA partners | ✅ Active |
| **OFAC Sanctions** | `tariffRegistrySync.ts` | Sanctioned countries | ✅ Active |
| **AD/CVD Orders** | `tariffRegistrySync.ts` | Antidumping risk warnings | ✅ Active |
| **OpenAI Embeddings** | `htsEmbeddings.ts` | 27,061 HTS code vectors | ✅ Active |

### Data Sources (Planned 🔲)

| Source | Data | Use Case | Complexity |
|--------|------|----------|------------|
| **Census Bureau API** | Granular trade stats, port-level | Market trends | Medium |
| **CBP CROSS** | Customs rulings | Ruling research | High (scraper) |
| **UN Comtrade** | Global bilateral trade | Market intelligence | Medium |
| **ImportYeti** | Importer/exporter names | Competitor tracking | Medium (scraper) |
| **FDA API** | Import alerts | Supplier screening | Low |
| **CPSC API** | Product recalls | Safety screening | Low |
| **BIS Entity List** | Denied parties | Compliance screening | Low |

### Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/classify-v10` | POST | HTS classification |
| `/api/tariff-registry/sync` | POST | Sync all tariff data |
| `/api/sourcing/analyze` | POST | Full sourcing analysis |
| `/api/sourcing/quick` | GET | Quick country comparison |
| `/api/sourcing/landed-cost` | GET | Landed cost calculation |
| `/api/sourcing/sync-data` | POST | Sync USITC DataWeb |
| `/api/saved-products` | GET/POST | Product library |
| `/api/tariff-alerts` | GET/POST | Alert management |

**Data Flow:**
```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER REQUEST                                 │
│                    (classify or source)                              │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    COUNTRY TARIFF REGISTRY                           │
│                    (tariffRegistry.ts)                               │
│                                                                      │
│  • getTariffProfile(countryCode)                                    │
│  • getEffectiveTariff(countryCode, htsCode)                         │
│                                                                      │
│  Data from: USITC HTS API, Federal Register, OFAC, FTA List, etc.  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     RESPONSE TO USER                                 │
│  • Effective tariff rate with breakdown                             │
│  • FTA status, IEEPA baseline, Section 301, AD/CVD warnings         │
└─────────────────────────────────────────────────────────────────────┘
```

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

### ✅ Completed Sprints (Dec 2025 - Jan 2026)

| Sprint | Theme | Status |
|--------|-------|--------|
| Sprint 1 | Classification Engine | ✅ Complete |
| Sprint 2 | Country Tariff Registry | ✅ Complete |
| Sprint 3 | Tariff Monitoring UI | ✅ Complete |
| Sprint 4 | HTS Database & Semantic Search | ✅ Complete |
| Sprint 5 | Classification UI/UX Refinement | ✅ Complete |
| Sprint 6 | Subscription Foundation | ✅ Complete |

---

### Sprint 7 (Current - Week of Jan 2)
**Theme:** Duty Optimizer Foundation

> **📐 Architecture Doc:** [`ARCHITECTURE_DUTY_OPTIMIZER.md`](./ARCHITECTURE_DUTY_OPTIMIZER.md)

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Duty Optimizer API - Layer 1 | P0 | 4h | V10 + sibling expansion |
| Duty Optimizer API - Layer 2 | P0 | 6h | AI product interpretation, condition extraction |
| Duty Optimizer UI - Page | P0 | 6h | `/dashboard/optimizer` full interface |
| Duty Optimizer UI - Teaser | P1 | 2h | "X more codes found" in Classify results |
| Plain English Cache | P1 | 3h | Pre-generate interpretations for common codes |

**Sprint Goal:** Duty Optimizer MVP working end-to-end

---

### Sprint 8 (Week of Jan 8)
**Theme:** Polish & Payments Prep

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Usage Limits Enforcement | P0 | 4h | 5 classifications/day for free tier |
| Pro Feature Gating | P1 | 4h | Lock Sourcing, bulk, exports for free tier |
| Stripe Checkout Integration | P1 | 6h | Pro/Business tier checkout |
| Stripe Webhook Handlers | P1 | 4h | subscription.created, updated, deleted |
| Weekly Digest Email - Setup | P2 | 4h | Resend integration |

**Sprint Goal:** Ready to accept payments

---

### Sprint 9 (Week of Jan 15)
**Theme:** Market Intelligence

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Market Trends Dashboard | P1 | 6h | Use existing USITC DataWeb data |
| Product Safety Screening | P2 | 4h | FDA/CPSC API integration |
| Weekly Digest Email - Templates | P1 | 4h | Email content |
| Automated Daily Sync | P1 | 3h | Vercel Cron for tariff registry |

**Sprint Goal:** Proactive intelligence features

---

### Sprint 10 (Week of Jan 22)
**Theme:** What-If & Exploration

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| What-If Simulator | P2 | 8h | Interactive duty calculator |
| FTA Qualification Check | P3 | 4h | USMCA focus first |
| De Minimis Calculator | P1 | 3h | Simple rule: <$800 = duty free |

**Sprint Goal:** Product development use case supported

---

### Sprint 11 (Week of Jan 29)
**Theme:** Portfolio Features

| Task | Priority | Est. Hours | Notes |
|------|----------|------------|-------|
| Bulk Classification - Upload | P2 | 6h | CSV/Excel parsing |
| Bulk Classification - Processing | P2 | 8h | Batch API calls |
| Savings Report Generator | P2 | 6h | PDF export |

**Sprint Goal:** Enterprise-ready bulk features

---

## 📈 KPIs & Goals

### North Star Metric
**Weekly Active Analyzers:** Users who run at least one classification or sourcing analysis per week

### Funnel Metrics

| Stage | Metric | Target |
|-------|--------|--------|
| **Acquisition** | Classifications/week | 500+ |
| **Activation** | Upsell CTA click rate | 15%+ |
| **Retention** | Weekly return rate | 30%+ |
| **Revenue** | Free → Pro conversion | 5%+ |
| **Referral** | NPS Score | 50+ |

### Phase 3 Goals (Paid Features Foundation)
- [x] Subscription schema and database migration
- [x] Pricing page live at `/pricing`
- [x] Navigation redesign complete
- [x] My Products consolidated view
- [x] Duty Optimizer architecture documented
- [ ] Duty Optimizer MVP working end-to-end
- [ ] Duty Optimizer teaser in Classify results
- [ ] De Minimis Calculator working
- [ ] Section 301 Exclusion Tracker working
- [ ] Stripe checkout integration (after features complete)
- [ ] First $99/mo Pro subscriber

### Phase 4 Goals (Advanced Optimization)
- [ ] What-If Simulator used by 100+ users
- [ ] 40%+ weekly digest email open rate
- [ ] 5 users using Market Trends Dashboard weekly

### Phase 5 Goals (Enterprise)
- [ ] 10 bulk classification uploads/week
- [ ] First Business ($299/mo) subscriber
- [ ] 3 Savings Reports generated/week

### Revenue Milestones

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| First paying user | Jan 15, 2026 | 🔲 |
| $1,000 MRR | Feb 28, 2026 | 🔲 |
| $5,000 MRR | Q2 2026 | 🔲 |
| $10,000 MRR | Q3 2026 | 🔲 |

---

## 🚧 Parking Lot (Future Ideas)

Ideas to evaluate after core services are profitable:

### Platform Features
- [ ] Mobile app (scan barcode → classify)
- [ ] API for third-party integrations (ERP, WMS, TMS)
- [ ] Team collaboration & approval workflows
- [ ] White-label for freight forwarders
- [ ] SSO/SAML for enterprise

### Marketplace & Network
- [ ] Customs broker marketplace
- [ ] Supplier RFQ system
- [ ] Freight forwarder matching
- [ ] Trade finance connections

### Logistics & Operations
- [ ] Freight rate integration (real-time quotes)
- [ ] Container tracking
- [ ] Port congestion monitoring
- [ ] Currency hedging recommendations

### Compliance & Documentation
- [ ] Compliance document generation (CO, ISF, etc.)
- [ ] ACE filing integration
- [ ] ISF bond management
- [ ] PGA (Partner Government Agency) screening

### Advanced Intelligence
- [ ] AI news monitoring (tariff policy changes)
- [ ] Predictive tariff alerts (ML on Federal Register patterns)
- [ ] Trade war scenario modeling
- [ ] Supply chain risk scoring

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

