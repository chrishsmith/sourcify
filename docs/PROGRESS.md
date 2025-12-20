# Sourcify Development Progress

> **Last Updated:** December 20, 2025  
> **Current Phase:** Phase 1.5 - Tariff Data Infrastructure  
> **Current Sprint:** Sprint 2

---

## 🎯 Current Sprint: Sprint 2

**Theme:** Country Tariff Registry (Single Source of Truth)  
**Dates:** Dec 20 - Dec 23, 2025  
**Goal:** Centralized, accurate tariff data consumed by all services

### Why This Sprint?

We identified that tariff data was scattered across multiple files with inconsistent rates:
- Classification and sourcing were showing different tariffs for the same country
- FTA countries like Singapore were incorrectly shown as "duty-free" when they actually face 10% IEEPA
- The April 2025 tariff landscape changes weren't properly reflected

### Tasks

| Task | Status | Notes |
|------|--------|-------|
| 2.1 Architecture Documentation | ✅ Complete | See `docs/ARCHITECTURE_TARIFF_REGISTRY.md` |
| 2.2 Prisma Schema | ✅ Complete | CountryTariffProfile, TariffProgram, HtsTariffOverride |
| 2.3 TariffRegistry Service | ✅ Complete | `getTariffProfile()`, `getEffectiveTariff()` in `services/tariffRegistry.ts` |
| 2.4 Data Sync Service | ✅ Complete | `services/tariffRegistrySync.ts` - syncs 196 countries from real sources |
| 2.5 Migrate Classification | 🔲 Pending | Use registry instead of scattered logic |
| 2.6 Migrate Sourcing | 🔲 Pending | Use registry for landed cost |

### Key Decisions
- **Single Source of Truth:** All tariff data lives in the registry
- **FTA Clarification:** FTAs waive BASE duty but NOT IEEPA (except USMCA)
- **Universal Baseline:** 10% IEEPA applies to nearly all countries as of April 2025

---

## 📋 Previous Sprint: Sprint 1 (Complete ✅)

**Theme:** Classification → Sourcing Flow  
**Dates:** Dec 19 - Dec 22, 2024  
**Goal:** Users can click from classification result to sourcing analysis

### Tasks

| Task | Status | Notes |
|------|--------|-------|
| 1.1 Dynamic Sourcing CTA | ✅ Complete | SourcingPreview component + API |
| 1.2 URL Parameter Support | ✅ Complete | Sourcing page accepts ?hts=X&from=Y |
| 1.3 Natural Language Input | ✅ Complete | Shared ProductInputForm component |
| 1.4 Results Enhancement | ✅ Complete | Current source highlight, skeleton loading, better table |
| 1.5 Supplier Integration | ✅ Complete | Click country → filtered suppliers |
| UI/UX Polish | ✅ Complete | Concise tariff breakdown, teal badges, spacing |

### Daily Log

#### Dec 19, 2024 (cont.) - MAJOR: Real Data Integration! 🎉
- [x] **USITC DataWeb API Integration** - REAL import statistics!
  - Created `/services/usitcDataWeb.ts` with full API integration
  - Queries actual US import data by HTS code and country
  - Returns customs value, quantity, avg unit value for 40+ countries
  - Tested with HTS 851830 (earphones): China $3.57B, Vietnam $3.18B imports
  - API docs: https://www.usitc.gov/applications/dataweb/api/dataweb_query_api.html
- [x] `/api/sourcing/sync-data` endpoint for syncing USITC data to DB
- [x] Verified end-to-end flow with real data

#### Dec 19, 2024
- [x] Created product roadmap document
- [x] Created progress tracker
- [x] Created `/api/sourcing/quick` endpoint for lightweight preview data
- [x] Created `SourcingPreview` component with real cost data
- [x] Replaced static teaser in `ClassificationResult.tsx` with dynamic preview
- [x] Added URL parameter support to sourcing page with Suspense
- [x] Added context banner when navigating from classification
- [x] UI/UX Polish:
  - Simplified TariffBreakdown to show concise +X% rates
  - Added teal HTS code badges with inline styles
  - Removed row-by-row coloring, kept severity color for total rate
  - Fixed card spacing with inline marginBottom (24px) for Ant Design compatibility
- [x] Test end-to-end flow in browser
- [x] Created shared components architecture:
  - `/components/shared/ProductInputForm.tsx` - Reusable product input
  - `/components/shared/constants.ts` - Shared COUNTRIES with helpers
  - Refactored ClassificationForm to use shared component
  - Added "Describe my product" mode to Sourcing page (classify → analyze flow)
- [x] Results Enhancement (1.4):
  - Added "Current Source" highlight card when country provided
  - Added "CURRENT" and "BEST" tags in comparison table
  - Row highlighting for current vs best option
  - Improved skeleton loading states
  - Better "vs Current" column with directional arrows
- [x] Supplier Integration (1.5):
  - Added "Find Suppliers" button per country row in analysis
  - SupplierExplorer now accepts initialCountry/initialHtsCode props
  - Clicking suppliers switches tab with pre-filtered results
  - "Back to Analysis" button to return to cost comparison
  - Filter indicator dot on tab when filtered

---

## 📊 Overall Progress

### Phase 1: Sourcing Intelligence
| Task | Status | Completion |
|------|--------|------------|
| 1.1 Dynamic Sourcing CTA | ✅ | 100% |
| 1.2 URL Parameter Support | ✅ | 100% |
| 1.3 Natural Language Input | ✅ | 100% |
| 1.4 Results Enhancement | ✅ | 100% |
| 1.5 Supplier Integration | ✅ | 100% |

**Phase 1 Overall: 100% ✅**

### Phase 2: Trade Intelligence
| Task | Status | Completion |
|------|--------|------------|
| 2.1 Tariff Alert System | 🔲 | 0% |
| 2.2 Saved Products Monitoring | 🔲 | 0% |
| 2.3 Intelligence Dashboard | 🔲 | 0% |
| 2.4 Weekly Digest Email | 🔲 | 0% |
| 2.5 Data Sources Integration | ✅ | 100% |

**Phase 2 Overall: 20%** (Real data sources integrated!)

### Data Sources Integrated
| Source | Type | Status |
|--------|------|--------|
| USITC DataWeb API | Import Statistics | ✅ Live |
| USITC HTS API | Tariff Rates | ✅ Live |
| Grok AI | Analysis & Insights | ✅ Live |

---

## 🏆 Completed Milestones

- [x] **Dec 19, 2024** - Product roadmap created
- [x] **Dec 19, 2024** - Phase 1: Sourcing Intelligence complete! 🎉
- [x] **Dec 19, 2024** - USITC DataWeb API integrated - REAL import data! 📊
- [ ] Tariff alerts launched
- [ ] Intelligence dashboard launched
- [ ] First paying customer

---

## ⚠️ Critical Updates (December 2025)

### Tariff Accuracy Enhancement
**Date:** December 20, 2025

We identified and fixed a significant gap in tariff calculation accuracy:

1. **Problem Identified:**
   - USITC DataWeb provides import VOLUME/VALUE statistics, NOT tariff rates
   - Sourcing intelligence was using simplified/hardcoded tariff rates
   - FTA countries were incorrectly shown as "duty-free" when they now face 10% IEEPA

2. **April 2025 Tariff Changes:**
   - Universal 10% IEEPA reciprocal baseline now applies to NEARLY ALL countries
   - FTAs (Singapore, Korea, Australia, etc.) do NOT exempt from this 10%
   - Only USMCA (MX/CA) may have exemptions for compliant goods
   - Some countries have even HIGHER reciprocal rates (Vietnam 46%, Cambodia 49%)

3. **Changes Made:**
   - Updated `tariffPrograms.ts` with universal baseline + country-specific rates
   - Updated `landedCost.ts` to use centralized tariff calculation
   - Updated `usitcDataWeb.ts` with proper tariff data and documentation
   - FTA treatment now correctly shows: "Base duty waived but IEEPA still applies"

4. **Sources:**
   - Enterprise Singapore FAQs (USSFTA impact)
   - Reuters, PwC trade analyses from 2025
   - U.S. trade policy announcements (Executive Orders 14195, 14257)

---

## 🐛 Known Issues / Blockers

| Issue | Priority | Status |
|-------|----------|--------|
| None currently | - | - |

---

## 📝 Notes & Decisions

### Dec 19, 2024
- Decided to prioritize sourcing flow (Phase 1) before intelligence (Phase 2)
- MVP will focus on connecting classification → sourcing seamlessly
- Will use free tariff data sources initially, paid data for competitor intel later

---

## 🔑 Legend

| Symbol | Meaning |
|--------|---------|
| 🔲 | Not Started |
| 🟡 | In Progress |
| ✅ | Complete |
| ❌ | Blocked |
| ⏸️ | On Hold |
