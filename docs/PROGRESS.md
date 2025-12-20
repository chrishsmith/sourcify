# Sourcify Development Progress

> **Last Updated:** December 20, 2025  
> **Current Phase:** Phase 2 - Trade Intelligence  
> **Current Sprint:** Sprint 3

---

## 🎯 Current Sprint: Sprint 3

**Theme:** Tariff Monitoring UI  
**Dates:** Dec 20 - Dec 27, 2025  
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

### Phase 2: Trade Intelligence ~95%

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

---

## 🔧 Technical Debt / Known Issues

| Issue | Priority | Notes |
|-------|----------|-------|
| ~~Classification engine not using registry~~ | ✅ Fixed | Now uses `tariffRegistry.ts` |
| No automated daily sync | High | Must run sync manually |
| Email notifications not set up | Medium | No Resend/SendGrid integration |
| Pre-existing `classify-db.ts` error | Medium | Uses `prisma.product` which doesn't exist |

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
- [ ] Automated daily sync configured
- [ ] First paying customer

---

## ⚠️ Critical Reminders

### Daily Sync Required

The tariff registry **must be synced** to stay accurate. Until automated:

```bash
# Run this after deploying or when tariff news breaks
curl -X POST "http://localhost:3000/api/tariff-registry/sync?type=comprehensive"
```

### FTA ≠ Duty Free

As of April 2025:
- FTAs (Singapore, Korea, etc.) waive **base duty** only
- **10% IEEPA still applies** to most FTA countries
- Only USMCA (MX/CA) may fully exempt compliant goods

---

## 🗃️ Data Sources Status

### Active (7)

| Source | Status | Last Sync |
|--------|--------|-----------|
| ISO 3166-1 Countries | ✅ | Dec 20, 2025 |
| USITC HTS API | ✅ | Dec 20, 2025 |
| USITC DataWeb | ✅ | Dec 20, 2025 |
| Federal Register | ✅ | Dec 20, 2025 |
| USTR FTA List | ✅ | Dec 20, 2025 |
| OFAC Sanctions | ✅ | Dec 20, 2025 |
| AD/CVD Orders | ✅ | Dec 20, 2025 |

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
