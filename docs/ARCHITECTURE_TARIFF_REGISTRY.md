# Country Tariff Registry Architecture

> **Created:** December 20, 2025  
> **Status:** ✅ LIVE - Phase 1 Complete  
> **Last Sync:** December 20, 2025 @ 16:45 UTC  
> **Owner:** Core Platform

---

## Overview

The **Country Tariff Registry** is a centralized service that maintains accurate, up-to-date tariff data for all countries. All other services (classification, sourcing intelligence, alerts) consume this data rather than maintaining their own tariff logic.

### 📊 Current Registry Stats

| Metric | Value |
|--------|-------|
| **Total Countries** | 199 |
| **Normal Trade Status** | 172 |
| **FTA Partners** | 20 |
| **Sanctioned Countries** | 7 |
| **Active Data Sources** | 7 |
| **Planned Data Sources** | 6 |

**AD/CVD Risk Coverage:**
- ⚠️ High Risk: Iron/Steel (Ch. 72-73)
- ⚡ Medium Risk: Aluminum (76), Electrical (85), Rubber (40), Wood (44), Paper (48)

### Why This Architecture?

Before this change, tariff logic was scattered across multiple files:
- `tariffPrograms.ts` - Hardcoded program definitions
- `landedCost.ts` - Inline rate helpers  
- `usitcDataWeb.ts` - Its own rate calculations
- `additionalDuties.ts` - Live rate fetching + fallbacks
- `chapter99.ts` - Chapter 99 lookups

This led to **inconsistent rates** between classification and sourcing, and made updates error-prone.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUNTRY TARIFF REGISTRY                       │
│                    (Single Source of Truth)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DATA SOURCES (Ingest Layer)                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Federal      │  │ USITC API    │  │ CBP/USTR             │   │
│  │ Register API │  │ (Chapter 99) │  │ (Scrapers/Webhooks)  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│         └────────────────►│◄─────────────────────┘               │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    TARIFF REGISTRY DB                      │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  CountryTariffProfile                                │  │  │
│  │  │  - Country-level tariff programs                     │  │  │
│  │  │  - FTA status & IEEPA rates                         │  │  │
│  │  │  - Pre-computed effective rates                      │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  TariffProgram                                       │  │  │
│  │  │  - Individual tariff programs (Section 301, etc.)    │  │  │
│  │  │  - Active status, rates, legal references           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  HtsTariffOverride                                   │  │  │
│  │  │  - Product-specific rate overrides                   │  │  │
│  │  │  - Section 301 lists, AD/CVD orders                 │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                           │                                      │
│                           ▼                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              tariffRegistry.ts (Service)                   │  │
│  │                                                            │  │
│  │  • getTariffProfile(countryCode)                          │  │
│  │  • getEffectiveTariff(countryCode, htsCode)               │  │
│  │  • getAllActivePrograms(countryCode)                      │  │
│  │  • syncFromUSITC()                                        │  │
│  │  • validateRates()                                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │  Single API for all consumers
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│Classification │    │   Sourcing    │    │   Alerts &    │
│    Engine     │    │ Intelligence  │    │  Monitoring   │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## Data Models

### CountryTariffProfile

The main table storing country-level tariff information.

```typescript
model CountryTariffProfile {
  id                String   @id @default(cuid())
  
  // Country identification
  countryCode       String   @unique  // ISO 3166-1 alpha-2 (e.g., 'SG', 'CN')
  countryName       String
  region            String?            // 'Asia', 'Europe', 'Americas', etc.
  
  // Trade status
  tradeStatus       TradeStatus        // 'normal', 'fta', 'elevated', 'sanctioned'
  
  // FTA information
  hasFta            Boolean  @default(false)
  ftaName           String?            // 'USMCA', 'Singapore FTA', etc.
  ftaWaivesBaseDuty Boolean  @default(false)
  ftaWaivesIeepa    Boolean  @default(false)  // Only USMCA currently
  ftaNotes          String?
  
  // IEEPA baseline (April 2025+)
  ieepaBaselineRate Float    @default(10)     // Universal 10% or country-specific
  ieepaExempt       Boolean  @default(false)  // True for USMCA compliant goods
  
  // Fentanyl tariffs (CN, MX, CA)
  fentanylRate      Float?             // 20% for CN, 25% for MX/CA
  fentanylActive    Boolean  @default(false)
  
  // Reciprocal tariffs (country-specific higher rates)
  reciprocalRate    Float?             // 46% for VN, 49% for KH, etc.
  
  // Pre-computed totals (for quick queries)
  totalAdditionalRate Float  @default(0)  // Sum of all additional duties
  
  // Metadata
  lastVerified      DateTime @default(now())
  lastUpdated       DateTime @updatedAt
  sources           String[] @default([])  // Legal references
  notes             String?
  
  // Relations
  programs          TariffProgram[]
  overrides         HtsTariffOverride[]
  
  @@index([countryCode])
  @@index([tradeStatus])
}

enum TradeStatus {
  normal      // Standard MFN treatment
  fta         // Free Trade Agreement partner
  elevated    // Higher than normal tariffs (China, Vietnam, etc.)
  sanctioned  // Trade restrictions apply
}
```

### TariffProgram

Individual tariff programs that apply to a country.

```typescript
model TariffProgram {
  id                String   @id @default(cuid())
  
  // Program identification
  programId         String             // 'section301_list3', 'ieepa_fentanyl_cn'
  programName       String             // 'Section 301 List 3'
  programType       ProgramType
  
  // Rate information
  rate              Float              // Percentage (e.g., 25.0)
  rateType          RateType @default(ad_valorem)
  specificAmount    Float?             // For specific duties ($/unit)
  specificUnit      String?            // 'kg', 'unit', etc.
  
  // Status
  active            Boolean  @default(true)
  effectiveDate     DateTime
  expirationDate    DateTime?
  
  // Legal basis
  htsChapter99Code  String?            // '9903.88.03'
  authority         String             // 'USTR', 'President', 'Commerce'
  legalReference    String             // 'Trade Act of 1974, Section 301'
  executiveOrder    String?            // 'EO 14257'
  federalRegister   String?            // '90 FR 12345'
  
  // Scope
  appliesToAllHts   Boolean  @default(true)
  description       String?
  
  // Relation
  countryProfileId  String
  countryProfile    CountryTariffProfile @relation(fields: [countryProfileId], references: [id])
  
  @@unique([countryProfileId, programId])
  @@index([programType])
  @@index([active])
}

enum ProgramType {
  section_301       // China trade tariffs
  ieepa_fentanyl    // Fentanyl emergency (CN, MX, CA)
  ieepa_reciprocal  // Reciprocal/baseline tariffs
  section_232       // Steel/Aluminum/Auto
  adcvd             // Antidumping/Countervailing duties
  gsp               // Generalized System of Preferences
  other
}

enum RateType {
  ad_valorem        // Percentage of value
  specific          // Fixed amount per unit
  compound          // Both ad valorem and specific
}
```

### HtsTariffOverride

Product-specific tariff overrides (Section 301 lists, AD/CVD orders).

```typescript
model HtsTariffOverride {
  id                String   @id @default(cuid())
  
  // HTS targeting
  htsCode           String             // Full or partial (e.g., '8518.30', '85')
  htsDescription    String?
  matchType         HtsMatchType @default(prefix)  // 'exact', 'prefix', 'chapter'
  
  // Override details
  overrideType      ProgramType
  rate              Float
  rateType          RateType @default(ad_valorem)
  
  // Status
  active            Boolean  @default(true)
  effectiveDate     DateTime
  expirationDate    DateTime?
  
  // Legal reference
  listName          String?            // 'List 3', 'List 4A'
  legalReference    String
  federalRegister   String?
  
  // Relation
  countryProfileId  String
  countryProfile    CountryTariffProfile @relation(fields: [countryProfileId], references: [id])
  
  @@index([htsCode])
  @@index([countryProfileId, htsCode])
}

enum HtsMatchType {
  exact             // Must match exactly
  prefix            // Matches HTS codes starting with this
  chapter           // Matches entire chapter
}
```

---

## Service API

### Core Functions

```typescript
// Get complete tariff profile for a country
getTariffProfile(countryCode: string): Promise<CountryTariffProfile>

// Get effective tariff rate (includes product-specific overrides)
getEffectiveTariff(
  countryCode: string, 
  htsCode: string,
  options?: { 
    includeBase?: boolean,  // Include base MFN rate
    baseMfnRate?: number    // If known
  }
): Promise<EffectiveTariffResult>

// Get all active programs for a country
getAllActivePrograms(countryCode: string): Promise<TariffProgram[]>

// Check for product-specific overrides
getHtsOverrides(
  htsCode: string, 
  countryCode: string
): Promise<HtsTariffOverride[]>

// Sync rates from USITC API
syncFromUSITC(): Promise<SyncResult>

// Validate stored rates against live sources
validateRates(): Promise<ValidationResult>
```

### Example Usage

```typescript
import { getTariffProfile, getEffectiveTariff } from '@/services/tariffRegistry';

// Classification engine
const profile = await getTariffProfile('SG');
// Returns: { ieepaBaselineRate: 10, hasFta: true, ftaWaivesIeepa: false, ... }

// Sourcing intelligence  
const tariff = await getEffectiveTariff('SG', '8518.30.20', { baseMfnRate: 4.9 });
// Returns: {
//   baseMfnRate: 4.9,
//   ftaDiscount: 4.9,      // FTA waives base
//   ieepaRate: 10,          // But IEEPA still applies!
//   section301Rate: 0,
//   effectiveRate: 10,
//   breakdown: [...],
//   warnings: ['FTA waives base duty but 10% IEEPA still applies']
// }
```

---

## Data Sources

**NO MOCK DATA** - All tariff data comes from official government APIs.

### ✅ Active Data Sources (7 total)

| Source | Data | Update Frequency | Status |
|--------|------|------------------|--------|
| **ISO 3166-1** | Complete list of 199 countries/territories | One-time | ✅ ACTIVE |
| **USTR FTA List** | 20 US Free Trade Agreement partners | As needed | ✅ ACTIVE |
| **OFAC Sanctions** | 7 sanctioned countries (Cuba, Iran, NK, etc.) | As needed | ✅ ACTIVE |
| **USITC HTS API** | Chapter 99 codes (Section 301, IEEPA, 232) | On sync | ✅ ACTIVE |
| **USITC DataWeb** | Import volume & value by country | On sync | ✅ ACTIVE |
| **Federal Register API** | Executive orders, tariff announcements | On sync | ✅ ACTIVE |
| **AD/CVD Orders** | Antidumping/Countervailing duty warnings | On sync | ✅ ACTIVE |

### Sync Endpoints
```bash
# Comprehensive sync (all sources)
POST /api/tariff-registry/sync?type=comprehensive

# Individual syncs
POST /api/tariff-registry/sync?type=all
POST /api/tariff-registry/sync?type=countries
POST /api/tariff-registry/sync?type=rates
POST /api/tariff-registry/sync?type=federal-register

# Check status
GET /api/tariff-registry/sync
```

### 🔲 Planned Data Sources (6 total)

| Source | Data | Method | Status |
|--------|------|--------|--------|
| **Census Bureau API** | Granular trade stats by partner/port | API | 🔲 Planned |
| **CBP CROSS** | AD/CVD official rulings database | Scrape | 🔲 Planned |
| **UN Comtrade** | Global bilateral trade flows | API | 🔲 Planned |
| **ImportYeti** | Importer/exporter intelligence | Scrape | 🔲 Planned |
| **FDA Import Alerts** | Product safety & detention alerts | API | 🔲 Planned |
| **CPSC Recalls** | Consumer product safety recalls | API | 🔲 Planned |

---

## Implementation Phases

### Phase 1: Core Infrastructure ✅ COMPLETE
- [x] Document architecture
- [x] Create Prisma schema (`CountryTariffProfile`, `TariffProgram`, `HtsTariffOverride`)
- [x] Create `tariffRegistry.ts` service
- [x] Create `tariffRegistrySync.ts` with real data sources (NO mock data)
- [x] Migrate classification to use registry
- [x] Migrate sourcing to use registry
- [x] API endpoint: `POST /api/tariff-registry/sync`

### Phase 2: Automated Updates (Next Sprint)
- [x] USITC API sync function (Chapter 99) ✅
- [x] Federal Register API integration ✅
- [ ] **Cron job for automated daily sync** ← NOT YET IMPLEMENTED
- [ ] Rate change detection + email alerts
- [ ] Admin dashboard for rate management

### Phase 3: Advanced Features (Future)
- [ ] Historical rate tracking
- [ ] Rate change notifications to users
- [ ] AI-powered news monitoring
- [ ] Predictive tariff alerts

---

## Current Tariff Landscape (December 2025)

### Universal IEEPA Baseline
As of April 2025, a **10% minimum tariff** applies to nearly ALL imports:
- Applies even to FTA partners (Singapore, Korea, Australia, etc.)
- Only USMCA (MX/CA) may be exempt for compliant goods
- Some countries have higher rates (Vietnam 46%, Cambodia 49%)

### Country-Specific Rates (Reference Only)

⚠️ **DO NOT HARDCODE THESE VALUES** - All rates come from the database via `tariffRegistry.ts`.

This table is for **documentation reference only**. Actual rates are fetched via:
```typescript
import { getEffectiveTariff } from '@/services/tariffRegistry';
const tariff = await getEffectiveTariff('SG', '8518.30.20');
```

| Country | Trade Status | ~IEEPA Rate | Notes |
|---------|--------------|-------------|-------|
| China | Elevated | ~145%+ | Rates from `CountryTariffProfile` table |
| Vietnam | Elevated | ~46% | Query `tariffRegistry.getEffectiveTariff()` |
| Singapore | FTA | ~10% | FTA does NOT exempt IEEPA! |
| Mexico | FTA (USMCA) | ~0-25% | May be exempt for compliant goods |

**Get actual rates**: `SELECT * FROM country_tariff_profiles ORDER BY total_additional_rate DESC;`

---

## Migration Guide

### For Classification Engine

**Before:**
```typescript
import { calculateEffectiveTariff } from '@/services/additionalDuties';
const result = await calculateEffectiveTariff(htsCode, description, baseMfn, country);
```

**After:**
```typescript
import { getEffectiveTariff } from '@/services/tariffRegistry';
const result = await getEffectiveTariff(country, htsCode, { baseMfnRate: parsedMfn });
```

### For Sourcing Intelligence

**Before:**
```typescript
import { calculateEffectiveTariff } from '@/services/landedCost';
const tariffs = calculateEffectiveTariff(baseRate, countryCode, htsCode);
```

**After:**
```typescript
import { getEffectiveTariff } from '@/services/tariffRegistry';
const tariffs = await getEffectiveTariff(countryCode, htsCode, { baseMfnRate: baseRate });
```

---

---

## 🌐 Government Data Sources (Comprehensive)

### Priority 1: Core Trade Data ✅ COMPLETE

| Source | Data Provided | Access | Freshness | Status |
|--------|--------------|--------|-----------|--------|
| **USITC DataWeb API** | Import/export volume & value by country, HTS | ✅ API (Bearer token) | ~3 month lag | ✅ ACTIVE |
| **USITC HTS API** | Tariff rates, HTS descriptions, Chapter 99 | ✅ API (free) | Real-time | ✅ ACTIVE |
| **Federal Register API** | Tariff changes, executive orders, rules | ✅ API (free) | Real-time | ✅ ACTIVE |
| **Census Bureau USA Trade Online** | More granular trade stats, port-level data | ✅ API (free) | Monthly | 🔲 PLANNED |

#### Census Bureau USA Trade Online
```
URL: https://api.census.gov/data/timeseries/intltrade
Data: Import/export by HTS, country, district, port
Granularity: Monthly, can get HS6 or HS10
API Key: Required (free)
```

#### Federal Register API
```
URL: https://www.federalregister.gov/api/v1/
Data: Executive orders, tariff rules, trade policy
Use Case: Auto-detect tariff changes, new Section 301/232 actions
API Key: None required
```

### Priority 2: Tariff & Compliance Data

| Source | Data Provided | Access | Status |
|--------|--------------|--------|--------|
| **AD/CVD Warnings** | High-risk chapters, product alerts | Internal data | ✅ ACTIVE |
| **CBP CROSS** | AD/CVD orders, scope rulings | Scrape | 🔲 PLANNED |
| **CBP ACE Reports** | Entry data, trade statistics | Enrollment required | 🔲 PLANNED |
| **USTR** | Section 301 lists, exclusion requests | Scrape/RSS | 🔲 PLANNED |
| **Commerce BIS** | Export controls, Entity List | API/Scrape | 🔲 PLANNED |

#### CBP CROSS (Customs Rulings Online Search System)
```
URL: https://rulings.cbp.gov/
Data: Classification rulings, AD/CVD scope determinations
Use Case: Validate HTS classifications, check AD/CVD applicability
Access: Web scraping (structured data available)
```

### Priority 3: Importer/Exporter Data (BOL Data) 🔲 PLANNED

**This is the GOLD for competitive intelligence:**

| Source | Data Provided | Access | Cost | Status |
|--------|--------------|--------|------|--------|
| **CBP AMS Data** | Bill of Lading, importer names, shipper names | FOIA or aggregators | Free (FOIA) | 🔲 PLANNED |
| **ImportYeti** | US importers, foreign suppliers, shipment details | Scrape/API | Free tier | 🔲 PLANNED |
| **Panjiva (S&P)** | Comprehensive global trade | API | $$$$$ | 🔲 PLANNED |
| **ImportGenius** | US BOL data | API | $$$ | 🔲 PLANNED |

#### What BOL Data Contains:
```
- Importer Name & Address (US company receiving goods)
- Shipper/Exporter Name (foreign supplier)
- Consignee (ultimate recipient)
- Product Description (free text)
- HTS Code (sometimes)
- Quantity, Weight, Container Count
- Port of Entry & Departure
- Vessel Name, Voyage, Arrival Date
```

#### CBP Public BOL Records
```
Source: CBP Automated Manifest System (AMS)
Access: FOIA requests or third-party aggregators
Coverage: Ocean shipments only (air is confidential)
Delay: ~5-7 days from vessel arrival
Note: Some importers file for confidentiality
```

### Priority 4: Product Safety & Compliance 🔲 PLANNED

| Source | Data Provided | Access | Use Case | Status |
|--------|--------------|--------|----------|--------|
| **FDA Import Alerts** | Detained products, blocked importers | ✅ API | Supplier risk screening | 🔲 PLANNED |
| **CPSC Recalls** | Product recalls by company/product | ✅ API | Supplier risk screening | 🔲 PLANNED |
| **EPA TSCA** | Chemical compliance | API | Compliance checking | 🔲 PLANNED |
| **FCC Equipment Auth** | Electronics certification | Database | Compliance checking | 🔲 PLANNED |

#### FDA Import Alerts API
```
URL: https://api.fda.gov/
Data: Import alerts, product detentions, blocked firms
Use Case: Flag risky suppliers/products automatically
```

### Priority 5: Logistics & Shipping 🔲 PLANNED

| Source | Data Provided | Access | Status |
|--------|--------------|--------|--------|
| **MARAD** | US port statistics, vessel data | ✅ Download | 🔲 PLANNED |
| **Port of LA/LB** | Container volumes, vessel schedules | ✅ Public | 🔲 PLANNED |
| **BLS Price Indices** | Import/export price trends | ✅ API | 🔲 PLANNED |
| **MarineTraffic** | Vessel tracking, port congestion | API (paid) | 🔲 FUTURE |

### Priority 6: International Sources 🔲 PLANNED

| Source | Data Provided | Access | Coverage | Status |
|--------|--------------|--------|----------|--------|
| **UN Comtrade** | Global bilateral trade flows | ✅ API (free tier) | 200+ countries | 🔲 PLANNED |
| **WTO Tariff Data** | Global tariff schedules | ✅ API | WTO members | 🔲 PLANNED |
| **World Bank WITS** | Trade statistics & tariffs | ✅ API | Global | 🔲 PLANNED |
| **EU TARIC** | EU tariff database | ✅ API | EU imports | 🔲 PLANNED |
| **UK Trade Tariff** | UK post-Brexit tariffs | ✅ API | UK imports | 🔲 PLANNED |

#### UN Comtrade API
```
URL: https://comtradeapi.un.org/
Data: Bilateral trade flows for all countries
Use Case: "How much does Country X export to Country Y?"
Rate Limit: 500 calls/day free
```

---

## 📊 Data Integration Roadmap

### Sprint 2 (Current): Core Registry ✅
- [x] USITC DataWeb API - Import statistics ✅
- [x] USITC HTS API - Tariff rates ✅
- [x] Federal Register API - Policy changes ✅
- [x] Country Tariff Registry service ✅
- [x] AD/CVD warnings integration ✅
- [x] Comprehensive sync service ✅

### Sprint 3: Enhanced Trade Data 🔲 NEXT
- [ ] Census Bureau API - Granular trade stats
- [ ] CBP CROSS - AD/CVD rulings
- [ ] UN Comtrade - Global trade flows

### Sprint 4: Competitive Intelligence 🔲 PLANNED
- [ ] ImportYeti scraper - Importer/exporter names
- [ ] FDA Import Alerts - Supplier risk
- [ ] CPSC Recalls - Product safety

### Sprint 5: Real-time Monitoring 🔲 PLANNED
- [ ] Federal Register webhooks - Auto-detect tariff changes
- [ ] News API integration - Trade policy alerts
- [ ] Port data - Supply chain visibility

---

## ⚠️ REQUIRED: Daily Sync

The tariff registry **must be synced daily** to stay accurate. Tariff rates change frequently due to:
- Executive orders (can happen any day)
- Federal Register announcements
- Section 301/232 modifications
- New AD/CVD orders

### What the Sync Does

1. **Countries** - Updates trade status, FTA info, sanction status for all 199 countries
2. **Rates** - Fetches latest Chapter 99 rates from USITC HTS API (Section 301, IEEPA, 232)
3. **Federal Register** - Checks for new executive orders and tariff announcements
4. **AD/CVD** - Updates antidumping/countervailing duty risk warnings

### How to Run Sync

**Manual (current implementation):**
```bash
# Full comprehensive sync (~60 seconds)
curl -X POST "http://localhost:3000/api/tariff-registry/sync?type=comprehensive"

# Check current status
curl "http://localhost:3000/api/tariff-registry/sync"
```

**Automated (NOT YET IMPLEMENTED):**
```bash
# TODO: Set up cron job to run daily at 6am UTC
0 6 * * * curl -X POST "https://your-domain.com/api/tariff-registry/sync?type=comprehensive"
```

### Sync Options

| Type | What it syncs | Duration |
|------|---------------|----------|
| `comprehensive` | All sources (recommended) | ~60s |
| `countries` | Country profiles only | ~20s |
| `rates` | USITC tariff rates only | ~40s |
| `federal-register` | New rules/orders only | ~5s |

### 🔲 TODO: Automated Daily Sync

The automated cron job is **not yet implemented**. Options:
1. **Vercel Cron** - Add to `vercel.json` for serverless
2. **GitHub Actions** - Schedule workflow to hit endpoint
3. **External cron service** - cron-job.org, EasyCron, etc.
4. **Railway/Render cron** - If deployed there

Until automated, **run the sync manually after deploying or when tariff news breaks**.

---

## 🔧 Integration Patterns

### Pattern 1: Direct API
```typescript
// For APIs with good documentation
const response = await fetch('https://api.census.gov/data/...', {
  headers: { 'X-API-Key': process.env.CENSUS_API_KEY }
});
```

### Pattern 2: Scheduled Sync
```typescript
// For data that changes infrequently
// Run daily via cron job
async function syncFederalRegister() {
  const newRules = await fetchFederalRegister({ 
    topics: ['tariffs', 'trade'], 
    since: lastSync 
  });
  await processNewRules(newRules);
}
```

### Pattern 3: Web Scraping
```typescript
// For sources without APIs
import { chromium } from 'playwright';

async function scrapeImportYeti(htsCode: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`https://www.importyeti.com/hts/${htsCode}`);
  // Extract importer data...
}
```

### Pattern 4: FOIA Requests
```
For CBP BOL data:
1. Submit FOIA request for specific HTS codes
2. Receive data dump (CSV/Excel)
3. Parse and load into database
4. Repeat monthly
```

---

## References

- [USITC HTS API](https://hts.usitc.gov/api)
- [USITC DataWeb API](https://www.usitc.gov/applications/dataweb/api/dataweb_query_api.html)
- [Federal Register API](https://www.federalregister.gov/developers/documentation/api/v1)
- [Census Bureau Trade API](https://api.census.gov/data/timeseries/intltrade.html)
- [UN Comtrade API](https://comtradeapi.un.org/)
- [FDA API](https://open.fda.gov/apis/)
- [CBP CROSS](https://rulings.cbp.gov/)
- [CBP ACE](https://www.cbp.gov/trade/automated)
- Executive Order 14257 (IEEPA Reciprocal Tariffs)
- Executive Order 14195 (IEEPA Fentanyl Emergency)

