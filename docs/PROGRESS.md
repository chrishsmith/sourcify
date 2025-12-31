# Sourcify Development Progress

> **Last Updated:** December 30, 2025  
> **Current Phase:** Phase 2.5 - HTS Classification System  
> **Current Sprint:** Sprint 4

---

## 🎯 Current Sprint: Sprint 4

**Theme:** HTS Classification System - Local Database  
**Dates:** Dec 23 - Dec 30, 2025  
**Goal:** Build intelligent HTS classification with local database

> **📐 Design Doc:** See [`ARCHITECTURE_HTS_CLASSIFICATION.md`](./ARCHITECTURE_HTS_CLASSIFICATION.md) for full architecture.

### Completed This Sprint (Dec 23-24, 2025)

| Task | Status | Notes |
|------|--------|-------|
| 4.1 HTS Database Schema | ✅ Complete | `HtsCode`, `HtsSyncLog`, `HtsRevision` models |
| 4.2 USITC Excel Parser | ✅ Complete | `htsImport.ts` - parses official HTS xlsx |
| 4.3 HTS Query Service | ✅ Complete | `htsDatabase.ts` - hierarchy, search, siblings |
| 4.4 Smart Revision Checking | ✅ Complete | Only syncs when USITC publishes new version |
| 4.5 API Endpoints | ✅ Complete | `/api/hts/sync`, `/api/hts/search`, `/api/hts/[code]` |
| 4.6 Initial Data Load | ✅ Complete | **30,115 HTS codes imported** |
| 4.7 Dynamic Search Variations | ✅ Complete | "tshirt" finds "t-shirt" automatically |

### Completed This Sprint (Dec 24, 2025 - V5 Classification System)

| Task | Status | Notes |
|------|--------|-------|
| 4.8 Inference Engine V5 | ✅ Complete | `inferenceEngineV5.ts` - extracts stated/inferred/assumed |
| 4.9 Classification Engine V5 | ✅ Complete | `classificationEngineV5.ts` - uses local HTS DB |
| 4.10 Justification Generator | ✅ Complete | `justificationGenerator.ts` - Zonos-style explanations |
| 4.11 V5 API Endpoint | ✅ Complete | `POST /api/classify-v5` |
| 4.12 V5 UI Component | ✅ Complete | `ClassificationV5.tsx` - default on classify page |
| 4.13 Human-readable Justification | ✅ Complete | "designed for men" not "designed for men's" |
| 4.14 Button State UX | ✅ Complete | Shows "Clear & Start Over" / "Re-classify" after first run |
| 4.15 Hierarchy UI Enhancement | ✅ Complete | Shows all descriptions, tree-style arrows |
| 4.16 Parent Groupings Capture | ✅ Complete | Captures HTS indent rows like "Men's or boys':" |
| 4.17 Inline Grouping Display | ✅ Complete | Shows `[Men's or boys'] T-shirts, all white...` |

### Completed This Sprint (Dec 27, 2025 - V8 "Arbiter" Classification Engine)

| Task | Status | Notes |
|------|--------|-------|
| 4.18 V8 Classification Engine | ✅ Complete | "Ask Upfront, Classify with Confidence" |
| 4.19 Product Classifier | ✅ Complete | `productClassifier.ts` - function vs material routing |
| 4.20 HTS Decision Tree | ✅ Complete | `htsDecisionTree.ts` - chapter/heading deterministic rules |
| 4.21 AI-Driven Tree Navigation | ✅ Complete | `selectChildWithAI()` - Grok-3-mini selects best HTS match |
| 4.22 Ask Upfront Flow | ✅ Complete | Returns questions when material unknown |
| 4.23 Carve-Out Avoidance | ✅ Complete | Avoids specific codes like "nursing nipples" for general items |
| 4.24 Full Hierarchy Display | ✅ Complete | Chapter → Heading → Subheading → Tariff → Statistical |
| 4.25 Concatenated Description | ✅ Complete | Shows full path: "Ceramic Products: Tableware..." |
| 4.26 V8 API Endpoint | ✅ Complete | `POST /api/classify-v8` with two-phase flow |
| 4.27 V8 UI Component | ✅ Complete | `ClassificationV8.tsx` - default tab on classifications page |
| 4.28 Transparency Panel | ✅ Complete | Shows stated vs inferred vs assumed |
| 4.29 Question UI | ✅ Complete | Material options with chapter/duty hints |

> **📐 Design Doc:** See [`ARCHITECTURE_HTS_CLASSIFICATION_V8.md`](./ARCHITECTURE_HTS_CLASSIFICATION_V8.md) for full architecture.

### Completed This Sprint (Dec 30, 2025 - Semantic Search Engine)

| Task | Status | Notes |
|------|--------|-------|
| 4.30 pgvector Extension | ✅ Complete | Enabled on Neon database |
| 4.31 Embedding Schema | ✅ Complete | `vector(1536)` column + HNSW index |
| 4.32 Hierarchical Embeddings | ✅ Complete | Full context: chapter + heading + keywords |
| 4.33 Embedding Generation | ✅ Complete | **27,061 HTS codes** embedded (~$0.40 cost) |
| 4.34 Semantic Search | ✅ Complete | `searchHtsBySemantic()` with cosine similarity |
| 4.35 Classification Engine | ✅ Complete | `classificationEngineV10.ts` uses semantic search |
| 4.36 API Endpoint | ✅ Complete | `POST /api/classify-v10` |
| 4.37 UI Component | ✅ Complete | `ClassificationV10.tsx` - default tab |
| 4.38 Frontend Integration | ✅ Complete | Primary tab on Classifications page |
| 4.39 Duty Calculation | ✅ Complete | Shows base MFN + Section 301 + effective rate |
| 4.40 Alternative Rankings | ✅ Complete | Up to 10 alternatives with confidence scores |
| 4.41 Query Enrichment | ✅ Complete | Adds product type context to semantic queries |
| 4.42 Preferred Headings | ✅ Complete | Restricts search to relevant chapters |
| 4.43 Low Confidence Handling | ✅ Complete | Asks for material when confidence < 40% |
| 4.44 Conditional Classification | ✅ Complete | Detects value/size dependent HTS codes |
| 4.45 Decision Flow UI | ✅ Complete | Simple yes/no questions for conditionals |
| 4.46 Conservative Question Filtering | ✅ Complete | Only shows relevant questions |

**Performance Results:**
| Query | HTS Code | Time | Previous |
|-------|----------|------|----------|
| "ceramic coffee mug" | 6912.00.44.00 | ~4s | 20-30s |
| "plastic indoor planter" | 3924.90.56.50 | ~4s | 20-30s |
| "mens cotton t-shirt" | 6109.10.00.40 | ~4s | 20-30s |

**Improvement: 5-7x faster, ~$0.02 per 1000 queries (vs $30,000 for AI-per-query)**

**Query Enrichment Example:**
```
Input: "indoor planter"
Detected Product Type: "planter"
Enriched Query: "indoor planter household article container pot"
Preferred Chapters: [39, 69, 73, 44]
```

**Conditional Classification Example:**
```
Query: "ceramic coffee mug"
Result: 6912.00.44.00 (mugs valued >$38)
        
Conditional Question: "What is the value of your item?"
Options:
  - "$38 or less" → 6912.00.35.10 (4.5% duty)
  - "More than $38" → 6912.00.44.00 (9.8% duty)
```

> **📐 Design Doc:** See [`ARCHITECTURE_HTS_CLASSIFICATION.md`](./ARCHITECTURE_HTS_CLASSIFICATION.md) for full architecture.

---

## 📋 Previous Sprint: Sprint 3 (Complete ✅)

**Theme:** Tariff Monitoring UI  
**Dates:** Dec 20 - Dec 23, 2025  
**Goal:** Build the Tariff Monitoring UI (backend already complete)

> **📐 Design Doc:** See [`ARCHITECTURE_TARIFF_MONITORING.md`](./ARCHITECTURE_TARIFF_MONITORING.md) for full wireframes and specs.

### Priorities This Sprint

| Task | Status | Notes |
|------|--------|-------|
| 3.1 Migrate tariffAlerts.ts to use registry | ✅ Complete | Now uses `tariffRegistry.ts` |
| 3.2 Create Monitoring Tab in Sourcing | ✅ Complete | `TariffMonitoringTab.tsx` (780 lines) |
| 3.3 Dashboard Intelligence Summary Card | ✅ Complete | `TariffIntelligenceCard.tsx` on main dashboard |
| 3.4 Add Entry Points (Persona-driven) | ✅ Complete | See details below |
| 3.5 Create Product Detail Drawer | ✅ Complete | `ProductDetailDrawer.tsx` (680 lines) |
| 3.6 Automated daily sync (cron) | 🔲 Deferred | Until go-live |

**3.4 Entry Points Detail:**
- ✅ "Save & Monitor" button in classification results
- ✅ "Add Product Manually" modal in monitoring tab (for Importers/Compliance who know HTS)
- ✅ Multiple entry point empty state (Add by HTS / Classify / From Cost Analysis)
- ✅ Bulk "Monitor Selected" action in search history panel

### UI/UX Improvements (Completed Dec 20)

| Task | Status | Notes |
|------|--------|-------|
| Classification Path - Hybrid Approach | ✅ Complete | Clean direct lineage with expandable siblings |
| Remove Classification Rationale | ✅ Complete | Was undermining confidence; removed |
| Smart Product Name Generator | ✅ Complete | Auto-generates "Rubber Ring" from "ring for finger made of rubber" |

**Details:**
- New `ClassificationPath.tsx` component shows only direct path to HTS code by default
- Users can expand to see sibling codes (alternatives) at each level on demand
- Removed verbose AI rationale section - the 95% confidence badge says enough
- Updated `htsHierarchy.ts` to properly track direct ancestors vs siblings
- New `useHTSHierarchy` hook for reusable hierarchy fetching
- New `productNameGenerator.ts` utility for smart name extraction from descriptions

---

## 📋 Previous Sprint: Sprint 2 (Complete ✅)

**Theme:** Country Tariff Registry (Single Source of Truth)  
**Dates:** Dec 19 - Dec 20, 2025  
**Goal:** Centralized, accurate tariff data consumed by all services

### Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| 2.1 Architecture Documentation | ✅ Complete | See `docs/ARCHITECTURE_TARIFF_REGISTRY.md` |
| 2.2 Prisma Schema | ✅ Complete | CountryTariffProfile, TariffProgram, HtsTariffOverride |
| 2.3 TariffRegistry Service | ✅ Complete | `getTariffProfile()`, `getEffectiveTariff()` |
| 2.4 Data Sync Service | ✅ Complete | `tariffRegistrySync.ts` - 7 data sources |
| 2.5 Migrate Sourcing (landedCost) | ✅ Complete | Uses `getEffectiveTariff` from registry |
| 2.6 API Endpoint | ✅ Complete | `POST /api/tariff-registry/sync` |

### Key Achievements

- **199 countries** loaded from ISO 3166-1
- **7 active data sources**: USITC HTS API, DataWeb, Federal Register, FTA list, OFAC, AD/CVD
- **20 FTA partners** with proper IEEPA handling (FTAs waive base duty but NOT IEEPA!)
- **Comprehensive sync** endpoint working

---

## 📋 Sprint 1 (Complete ✅)

**Theme:** Classification → Sourcing Flow  
**Dates:** Dec 19 - Dec 22, 2024  
**Goal:** Users can click from classification result to sourcing analysis

### Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Dynamic Sourcing CTA | ✅ Complete | SourcingPreview component + API |
| 1.2 URL Parameter Support | ✅ Complete | Sourcing page accepts ?hts=X&from=Y |
| 1.3 Natural Language Input | ✅ Complete | Shared ProductInputForm component |
| 1.4 Results Enhancement | ✅ Complete | Current source highlight, skeleton loading |
| 1.5 Supplier Integration | ✅ Complete | Click country → filtered suppliers |
| UI/UX Polish | ✅ Complete | Concise tariff breakdown, teal badges |

---

## 📊 Overall Progress

### Phase 1: Sourcing Intelligence ✅ 100%

| Task | Status | Completion |
|------|--------|------------|
| 1.1 Dynamic Sourcing CTA | ✅ | 100% |
| 1.2 URL Parameter Support | ✅ | 100% |
| 1.3 Natural Language Input | ✅ | 100% |
| 1.4 Results Enhancement | ✅ | 100% |
| 1.5 Supplier Integration | ✅ | 100% |

**Phase 1 Overall: 100% ✅**

### Phase 1.5: Country Tariff Registry ✅ 100%

| Task | Status | Completion |
|------|--------|------------|
| Architecture & Schema | ✅ | 100% |
| TariffRegistry Service | ✅ | 100% |
| TariffRegistrySync Service | ✅ | 100% |
| Sourcing Migration | ✅ | 100% |
| Sync API Endpoint | ✅ | 100% |

**Phase 1.5 Overall: 100% ✅**

### Phase 2: Trade Intelligence ✅ 95%

| Task | Status | Completion |
|------|--------|------------|
| 2.1 Tariff Alert System | ✅ | 100% - Backend + UI complete |
| 2.2 Saved Products Monitoring | ✅ | 100% - Table + entry points + drawer complete |
| 2.3 Intelligence Dashboard Card | ✅ | 100% - `TariffIntelligenceCard.tsx` live |
| 2.4 Entry Points (Classification → Monitor) | ✅ | 100% - All paths done including bulk history |
| 2.5 Product Detail Drawer | ✅ | 100% - `ProductDetailDrawer.tsx` with breakdown, history, alternatives |
| 2.6 Weekly Digest Email | 🔲 | 0% |
| 2.7 Data Sources Integration | ✅ | 100% |

**Phase 2 Overall: 95%**

### Phase 2.5: HTS Classification System ✅ 100%

| Task | Status | Completion |
|------|--------|------------|
| Local HTS Database | ✅ | 100% - 30,573 codes imported |
| HTS Query APIs | ✅ | 100% - search, hierarchy, siblings |
| Smart Revision Checking | ✅ | 100% - Only sync when USITC updates |
| Dynamic Search Variations | ✅ | 100% - Handles hyphen/space variants |
| Inference Engine V5 | ✅ | 100% - Extracts stated/inferred/assumed |
| Classification Engine V5 | ✅ | 100% - Uses local HTS DB |
| Justification Generator | ✅ | 100% - Zonos-style explanations |

**Phase 2.5 Overall: 100% ✅**

### Phase 2.6: Semantic Search Engine ✅ 100%

| Task | Status | Completion |
|------|--------|------------|
| pgvector Extension | ✅ | 100% - Enabled on Neon database |
| Embedding Schema | ✅ | 100% - vector(1536) + HNSW index |
| Hierarchical Embeddings | ✅ | 100% - 27,061 codes embedded |
| Semantic Search Function | ✅ | 100% - `searchHtsBySemantic()` |
| Classification Engine | ✅ | 100% - Semantic-first with fallback |
| API Endpoint | ✅ | 100% - `/api/classify-v10` |
| Frontend Component | ✅ | 100% - Default tab on Classifications |
| Duty Calculation | ✅ | 100% - Base MFN + Section 301 |
| Alternative Rankings | ✅ | 100% - Up to 10 with confidence |
| Conditional Classification | ✅ | 100% - Value/size dependent codes |
| Decision Flow UI | ✅ | 100% - Simple questions for conditionals |

**Phase 2.6 Overall: 100% ✅**

> **📐 Architecture:** See [`ARCHITECTURE_HTS_CLASSIFICATION.md`](./ARCHITECTURE_HTS_CLASSIFICATION.md)

---

## 🔧 Technical Debt / Known Issues

| Issue | Priority | Notes |
|-------|----------|-------|
| ~~Classification engine not using registry~~ | ✅ Fixed | Now uses `tariffRegistry.ts` |
| No automated daily sync | High | Must run sync manually |
| Email notifications not set up | Medium | No Resend/SendGrid integration |
| Pre-existing `classify-db.ts` error | Medium | Uses `prisma.product` which doesn't exist |
| V10 cache layer missing | Medium | Redis cache would cut response to <1s |

---

## 🎯 Next Up

### Priority 1: Upsell Teasers
- Add "Lower rate available" badge when alternatives have lower duties
- Add "Save with different sourcing" hint for country optimization
- Wire up CTAs to sign-up / paid service pages
- **Goal:** Convert free classifications to paid service sign-ups

### Priority 2: Redis Cache Layer
- Cache common product queries for instant results
- Target: 40%+ cache hit rate, <1s response time
- Estimated: 2-4 hours

### Priority 3: Scoring Refinement
- Improve classification accuracy for edge cases
- Better handling of multi-material products
- User correction learning loop

---

## 🏆 Completed Milestones

- [x] **Dec 19, 2024** - Product roadmap created
- [x] **Dec 19, 2024** - Phase 1: Sourcing Intelligence complete! 🎉
- [x] **Dec 19, 2024** - USITC DataWeb API integrated - REAL import data! 📊
- [x] **Dec 20, 2025** - Country Tariff Registry LIVE - 199 countries, 7 data sources 🌍
- [x] **Dec 20, 2025** - Tariff Alerts service migrated to registry ✅
- [x] **Dec 20, 2025** - Classification Path UI redesigned - clean lineage + expandable siblings 🎨
- [x] **Dec 20, 2025** - Tariff Monitoring UI complete - entry points, drawer, bulk actions 🔔
- [x] **Dec 20, 2025** - Classification API migrated to registry - consistent rates everywhere! 🔗
- [x] **Dec 23, 2025** - **Local HTS Database LIVE** - 30,115 codes from USITC Excel 📦
- [x] **Dec 23, 2025** - HTS Search API with dynamic variation handling (tshirt → t-shirt) 🔍
- [x] **Dec 23, 2025** - Smart revision checking - only syncs when USITC updates 🧠
- [x] **Dec 23, 2025** - **Classification Engine V5** - "Infer first, ask later" with transparency 🎯
- [x] **Dec 23, 2025** - **Justification Generator** - Zonos-style explanations 📝
- [x] **Dec 24, 2025** - **V5 UI Complete** - Full classification UI with transparency panel 🎨
- [x] **Dec 24, 2025** - **HTS Hierarchy UI** - Tree-view with all descriptions + inline groupings 🌳
- [x] **Dec 24, 2025** - **Parent Groupings** - Captures "Men's or boys':", "Other:" from HTS indent structure 📋
- [x] **Dec 27, 2025** - **V8 "Arbiter" Engine** - Ask Upfront, Classify with Confidence 🎯
- [x] **Dec 27, 2025** - **AI-Driven Tree Navigation** - Grok-3-mini selects best HTS match at each level 🤖
- [x] **Dec 27, 2025** - **Full Hierarchy Display** - Chapter → Statistical with concatenated descriptions 🌳
- [x] **Dec 30, 2025** - **Semantic Search Engine LIVE** - pgvector embeddings ⚡
- [x] **Dec 30, 2025** - **27,061 HTS Embeddings Generated** - Full hierarchical context 🧠
- [x] **Dec 30, 2025** - **5-7x Faster Classification** - ~4 seconds (down from 20-30s) 🚀
- [x] **Dec 30, 2025** - **Frontend Deployed** - Primary tab on Classifications page 🎨
- [x] **Dec 30, 2025** - **Query Enrichment** - Prevents "planter" → "cucumber" mismatches 🎯
- [x] **Dec 30, 2025** - **Low Confidence Handling** - Asks for material when unsure ❓
- [x] **Dec 30, 2025** - **Conditional Classification** - Detects value/size dependent codes 🔀
- [x] **Dec 30, 2025** - **Decision Flow UI** - Simple questions for conditional codes 📝
- [x] **Dec 30, 2025** - **Docs Cleanup** - Archived V5-V9, consolidated to single architecture doc 📚
- [ ] Upsell teasers on classification results
- [ ] Automated daily sync configured
- [ ] Redis cache layer for <1s responses
- [ ] First paying customer

---

## ⚠️ Critical Reminders

### Daily Sync Required

The tariff registry **must be synced** to stay accurate. Until automated:

```bash
# Run this after deploying or when tariff news breaks
curl -X POST "http://localhost:3000/api/tariff-registry/sync?type=comprehensive"
```

### HTS Database Sync

The HTS database uses **smart revision checking** - only syncs when USITC publishes new version:

```bash
# Check status (GET)
curl http://localhost:3000/api/hts/sync

# Force re-import (POST)
curl -X POST "http://localhost:3000/api/hts/sync?force=true"
```

### FTA ≠ Duty Free

As of April 2025:
- FTAs (Singapore, Korea, etc.) waive **base duty** only
- **10% IEEPA still applies** to most FTA countries
- Only USMCA (MX/CA) may fully exempt compliant goods

---

## 🗃️ Data Sources Status

### Active (9)

| Source | Status | Last Sync | Records |
|--------|--------|-----------|---------|
| **USITC HTS Excel** | ✅ | Dec 23, 2025 | **30,573 codes** |
| **HTS Embeddings (pgvector)** | ✅ | Dec 30, 2025 | **27,061 embeddings** |
| ISO 3166-1 Countries | ✅ | Dec 20, 2025 | 199 countries |
| USITC HTS API | ✅ | Dec 20, 2025 | Chapter 99 rates |
| USITC DataWeb | ✅ | Dec 20, 2025 | Import statistics |
| Federal Register | ✅ | Dec 20, 2025 | Policy changes |
| USTR FTA List | ✅ | Dec 20, 2025 | 20 FTA partners |
| OFAC Sanctions | ✅ | Dec 20, 2025 | 7 sanctioned |
| AD/CVD Orders | ✅ | Dec 20, 2025 | High-risk chapters |

### Planned (6)

| Source | Status |
|--------|--------|
| Census Bureau API | 🔲 Sprint 4 |
| CBP CROSS | 🔲 Sprint 4 |
| UN Comtrade | 🔲 Sprint 5 |
| ImportYeti | 🔲 Future |
| FDA Import Alerts | 🔲 Future |
| CPSC Recalls | 🔲 Future |

---

## 🔑 Legend

| Symbol | Meaning |
|--------|---------|
| 🔲 | Not Started |
| 🟡 | In Progress |
| ⚠️ | Partial / Needs Work |
| ✅ | Complete |
| ❌ | Blocked |
| ⏸️ | On Hold |
