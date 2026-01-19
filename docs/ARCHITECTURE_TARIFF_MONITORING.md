image.pngimage.png# Tariff Monitoring System Architecture

> **Created:** December 20, 2025  
> **Last Updated:** December 20, 2025  
> **Status:** Backend ✅ | Core UI ✅ | Entry Points ✅ | Detail View ✅  
> **Owner:** Core Platform

---

## Overview

The Tariff Monitoring System allows users to track tariff rates for their products and get alerted when rates change. This document details the UI/UX design, data flow, and implementation plan.

### Design Principles

1. **NO MOCK DATA** - All rates from centralized Country Tariff Registry via `getEffectiveTariff()`
2. **Persona-driven** - Different users have different needs
3. **Proactive value** - Show users data they didn't know they needed

---

## Implementation Status

| Component | Status | File Location |
|-----------|--------|---------------|
| **Dashboard Intelligence Card** | ✅ COMPLETE | `src/features/dashboard/components/TariffIntelligenceCard.tsx` |
| **Monitoring Tab (in Sourcing)** | ✅ COMPLETE | `src/features/sourcing/components/TariffMonitoringTab.tsx` |
| **"Save & Monitor" Button** | ✅ COMPLETE | `src/features/compliance/components/ClassificationResult.tsx` |
| **"Add Product Manually" Form** | ✅ COMPLETE | Built into `TariffMonitoringTab.tsx` (modal) |
| **Product Detail Drawer** | ✅ COMPLETE | `src/features/sourcing/components/ProductDetailDrawer.tsx` |
| **Bulk Actions in Search History** | ✅ COMPLETE | `src/features/compliance/components/SearchHistoryPanel.tsx` |

---

## User Personas & Use Cases

| Persona | What They Monitor | Key Needs | Current Entry Point |
|---------|-------------------|-----------|---------------------|
| **Importer/Sourcer** | Active product catalog (5-50 SKUs) | $ impact, alternatives ready | ✅ "Add by HTS Code" modal |
| **Compliance Officer** | HTS chapters relevant to company | Historical data, exports | ✅ "Add by HTS Code" modal |
| **Procurement Manager** | Countries they're evaluating | Comparison data | ✅ "Add by HTS Code" or "From Cost Analysis" |
| **Entrepreneur** | 1-3 products in validation | Simple "is this still viable?" | ✅ "Classify a Product" |

All personas now have appropriate entry points in the monitoring tab's empty state.

---

## Architecture: Hybrid Approach

### Why Hybrid?

| Component | Location | Purpose | Persona Fit |
|-----------|----------|---------|-------------|
| **Summary Card** | Main Dashboard | "What needs attention NOW?" | Entrepreneur, all |
| **Full Monitoring Tab** | My Products | Detailed table + actions | Importer, Compliance |

### Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  MAIN DASHBOARD                           ← Quick summary: "What needs attention"│
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🔔 TARIFF INTELLIGENCE                               [View All →]         │ │
│  │                                                                            │ │
│  │  ⚠️ 2 changes affecting your products this week                           │ │
│  │  • Section 301 List 4A → +7.5% on Bluetooth Earbuds                       │ │
│  │  • Vietnam reciprocal → +36% on Cotton T-shirts                           │ │
│  │                                                                            │ │
│  │  12 products monitored | Last sync: 2 hours ago                           │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                              ↓ "View All" clicks to...
┌─────────────────────────────────────────────────────────────────────────────────┐
│  MY PRODUCTS                              ← Full detail: Monitoring tab         │
│  [All Products] [Monitored] [Alerts] [Portfolio Analysis]                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  (Full table with history, actions, alternatives)                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Dashboard Intelligence Summary Card ✅ COMPLETE

### Location
`src/features/dashboard/components/TariffIntelligenceCard.tsx`

### Current Implementation
- Shows monitored products count
- Displays rate increases/decreases/elevated risk stats
- Lists top 3 products with rate changes
- Portfolio health score
- Links to monitoring tab via "View All Monitored Products"

### Wireframe
```
┌────────────────────────────────────────────────────────────────────────────────┐
│ 🔔 TARIFF INTELLIGENCE                                      [View All →]      │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ⚠️ 2 changes affecting your products this week                               │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │ • Section 301 List 4A → +7.5% on Bluetooth Earbuds                       │ │
│  │ • Vietnam reciprocal → +36% on Cotton T-shirts                           │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                        │
│  │ 12           │  │ 2            │  │ $16,500      │                        │
│  │ Monitored    │  │ Alerts       │  │ Est. Impact  │                        │
│  └──────────────┘  └──────────────┘  └──────────────┘                        │
│                                                                                │
│  Last sync: 2 hours ago                                                       │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Data Source
```typescript
// API: GET /api/tariff-alerts/summary
interface AlertSummary {
  monitoredCount: number;
  recentChanges: Array<{
    productName: string;
    htsCode: string;
    changeReason: string;
    changePercent: number;
    dollarImpact?: number;
  }>;
  totalDollarImpact: number;
  lastSyncTime: Date;
}
```

---

## Component 2: Sourcing Monitoring Tab ✅ COMPLETE

### Location
`src/features/sourcing/components/TariffMonitoringTab.tsx`

### Current Implementation (780 lines)
- Full table with real API integration (`/api/saved-products?monitoredOnly=true`)
- Stats header showing monitored count, alerts, rate increases/decreases
- Rate change indicators with previous/current comparison
- Tariff program breakdown tags (Section 301, IEEPA, etc.)
- Trade status badges (elevated, restricted, normal)
- Toggle monitoring/favorites per product
- Search and filter controls
- Empty state with "Classify a Product" CTA

### Full Table Wireframe
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 📊 MONITORED PRODUCTS                                        [+ Add] [Export] [⚙️ Alert Settings]  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                      │
│  📊 SUMMARY: 12 products | 2 alerts this month | $16,500 est. impact                                │
│                                                                                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Product         │ HTS        │ Origin │ Current │ Change   │ $ Impact   │ Alt.   │ Actions          │
│                 │            │        │ Rate    │ (30d)    │ (Annual)   │ Best   │                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Bluetooth       │ 8518.30.20 │ 🇨🇳 CN  │ 32.5%   │ ⚠️ +7.5%  │ +$4,500    │ 🇲🇽 0%  │ [···] [↗️]       │
│ Earbuds         │            │        │         │ 📈 Trend  │            │        │                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Silicone Case   │ 4202.32.20 │ 🇨🇳 CN  │ 27.5%   │ ✅ Stable │ —          │ 🇻🇳 46% │ [···] [↗️]       │
│                 │            │        │         │           │            │        │                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Cotton Tees     │ 6109.10.00 │ 🇻🇳 VN  │ 46%     │ 🔴 +36%   │ +$12,000   │ 🇲🇽 0%  │ [···] [↗️]       │
│                 │            │        │         │ ⚡ High    │            │ 💡 USMCA│                  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ USB Cables      │ 8544.42.90 │ 🇲🇽 MX  │ 0%      │ ✅ Stable │ —          │ —      │ [···] [↗️]       │
│ (USMCA)         │            │        │         │           │            │        │                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘

Legend: ✅ Stable  ⚠️ Changed  🔴 Major change  📈 Uptrend  📉 Downtrend  ⚡ High volatility
```

### Table Column Specifications

| Column | Data Source | Format | Notes |
|--------|-------------|--------|-------|
| **Product** | `SavedProduct.name` | Text | User-defined name |
| **HTS** | `SavedProduct.htsCode` | `XXXX.XX.XX` | With copy button |
| **Origin** | `SavedProduct.countryOfOrigin` | Flag + code | 🇨🇳 CN |
| **Current Rate** | `getEffectiveTariff()` | `XX.X%` | LIVE from registry |
| **Change (30d)** | `TariffAlertEvent` delta | `+X.X%` / `-X.X%` | Color-coded |
| **$ Impact** | Calculated | `+$X,XXX` | Requires `annualVolume` |
| **Alt. Best** | `compareLandedCosts()` | Flag + rate | LIVE from registry |
| **Actions** | UI | Menu + link | Details, Edit, Delete |

### Status Indicators

| Icon | Meaning | Condition |
|------|---------|-----------|
| ✅ | Stable | No change in 30 days |
| ⚠️ | Changed | 1-10% change |
| 🔴 | Major change | >10% change |
| 📈 | Uptrend | Increasing 2+ times |
| 📉 | Downtrend | Decreasing 2+ times |
| ⚡ | Volatile | 3+ changes in 6 months |

---

## Component 3: Product Detail Drawer ✅ COMPLETE

### Location
`src/features/sourcing/components/ProductDetailDrawer.tsx`

### Purpose
When a user clicks a row in the Monitoring Tab table, a slide-out drawer shows comprehensive details about that monitored product including tariff breakdown, rate history, and sourcing alternatives.

### Props Interface
```typescript
interface ProductDetailDrawerProps {
  open: boolean;
  productId: string | null;
  onClose: () => void;
  onProductUpdate?: () => void;  // Refresh parent table
  onAnalyze?: (htsCode: string, country: string) => void;
  onFindSuppliers?: (htsCode: string, country: string) => void;
}
```

### Data Sources
| Section | API/Service | Purpose |
|---------|-------------|---------|
| Header | `SavedProduct` | Product identity |
| Tariff Breakdown | `getEffectiveTariff()` | Live rate from registry |
| Rate History | `TariffAlertEvent` | Past rate changes |
| Alternatives | `compareLandedCosts()` | Other country options |
| Alert Settings | `TariffAlert` | Notification config |

### Wireframe
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ BLUETOOTH EARBUDS                                                     [Edit] [×]│
│ HTS 8518.30.20 from 🇨🇳 China                                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  CURRENT RATE BREAKDOWN                                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ Base MFN Rate                                               4.9%           │ │
│  │ Section 301 (List 4A)                                      +7.5%           │ │
│  │ IEEPA Fentanyl Emergency                                  +20.0%           │ │
│  │ ───────────────────────────────────────────────────────────────────────    │ │
│  │ TOTAL EFFECTIVE RATE                                       32.5%           │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  RATE HISTORY (12 months)                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │    25% ─────────────────────────┐                                          │ │
│  │                                 │                                          │ │
│  │    20% ─────────────────────────┼────────────────────────────────          │ │
│  │                                 │                          ┌────           │ │
│  │    15% ─────────────────────────┼──────────────────────────┤               │ │
│  │         Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec         │ │
│  │                           ↑ IEEPA started                                  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  💡 INSIGHT                                                                     │
│  Rate increased in April 2025 due to IEEPA Fentanyl tariffs on China.          │
│  Consider alternative sourcing from Mexico (USMCA) for 0% duty.                │
│                                                                                  │
│  📅 UPCOMING CHANGES                                                            │
│  No scheduled changes affecting this product.                                   │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  SOURCING ALTERNATIVES                                                          │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🇲🇽 Mexico         │ 0% (USMCA)      │ Save $4,500/yr │ [Analyze] [Suppliers]│ │
│  │ 🇻🇳 Vietnam        │ 46%            │ +$1,350/yr     │ [Analyze]           │ │
│  │ 🇮🇳 India          │ 36%            │ +$350/yr       │ [Analyze]           │ │
│  │ 🇰🇷 South Korea    │ 10% (KORUS)    │ Save $2,250/yr │ [Analyze] [Suppliers]│ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│                                                                                  │
│  ALERT SETTINGS                                                                 │
│  ☑️ Notify on any change    ☐ Only increases    ☐ Only > 5%                    │
│                                                                                  │
│  ANNUAL VOLUME                                                                  │
│  [10,000] units/year @ [$12.00] per unit = $120,000 annual value               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component 4: Entry Points 🔲 PENDING

> **Critical Gap:** Users currently have limited ways to add products to monitoring. Only "Classify a Product" is available, which doesn't serve Importers, Compliance Officers, or Procurement Managers who already know their HTS codes.

### 4.1 Classification Results - "Save & Monitor" Button ✅ COMPLETE

**Location:** `src/features/compliance/components/ClassificationResult.tsx` (lines 754-801)

**Current Implementation:**
- Primary button: "Save & Monitor Tariffs" with bell icon
- Dropdown option: "Save without monitoring"
- Saves product with `isMonitored: true`
- Shows success message with link to monitoring tab

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  CLASSIFICATION RESULT                                                         │
│  ══════════════════════════════════════════════════════════════════════════   │
│  HTS Code: 8518.30.20                                                          │
│  Description: Headphones and earphones...                                      │
│  Duty Rate: 32.5%                                                              │
│                                                                                │
│  [Save & Monitor 🔔]    [View Alternatives]    [Share]                        │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

**On Click:**
1. Opens modal to name the product
2. Creates `SavedProduct` with `isMonitored: true`
3. Creates `TariffAlert` linked to product
4. Shows confirmation with link to monitoring tab

### 4.2 Search History - Bulk Actions + Monitor 🔲 PENDING

**Location:** `src/features/compliance/components/SearchHistoryPanel.tsx`

**Features:**
- Row selection with checkboxes
- Bulk action bar appears when items selected
- "Monitor Selected" sends multiple products to tariff monitoring at once

**Wireframe:**
```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Classification History                                                    [Refresh] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────────────────────────┐│
││ ☑️ 3 selected                    [🔔 Monitor Selected]  [🗑️ Delete]  [✕ Clear]   ││
│ └──────────────────────────────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────────────────────────────┤
│ ☑️ │ Product                 │ HTS Code    │ Origin │ Duty Rate │ Confidence │ Date │
├────┼─────────────────────────┼─────────────┼────────┼───────────┼────────────┼──────┤
│ ☑️ │ Bluetooth Earbuds       │ 8518.30.20  │ CN     │ 32.5%     │ 95%        │ ...  │
│ ☑️ │ Cotton T-Shirts         │ 6109.10.00  │ VN     │ 46%       │ 92%        │ ...  │
│ ☐  │ Silicone Phone Case     │ 3926.90.99  │ CN     │ 27.5%     │ 88%        │ ...  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
```
User Action                    API Call                          Result
───────────────────────────────────────────────────────────────────────────────
[Select 3 rows]           →  (UI only)                      →  Bulk bar appears
[Click "Monitor Selected"]→  POST /api/saved-products/bulk  →  3 SavedProducts created
                                { items: [...], isMonitored }     with isMonitored: true
                          →  Success message + link         →  "3 products added to monitoring"
```

### 4.3 Monitoring Tab - "+ Add Product" Form 🔲 PENDING (HIGH PRIORITY)

> **Serves:** Importers, Compliance Officers, Procurement Managers who know their HTS codes

**Location (Planned):** `src/features/sourcing/components/AddProductForm.tsx`

**Current Empty State Issue:**
The empty state only shows "Classify a Product" which requires going through classification flow. Users who already know their HTS codes should be able to add products directly.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  + ADD PRODUCT TO MONITOR                                              [×]    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  PRODUCT NAME *                                                                │
│  [Bluetooth Earbuds                                              ]            │
│                                                                                │
│  HTS CODE *                                                                    │
│  [8518.30.20      ] [🔍 Lookup]                                               │
│                                                                                │
│  COUNTRY OF ORIGIN *                                                           │
│  [🇨🇳 China                                                    ▼]            │
│                                                                                │
│  ANNUAL VOLUME (optional - for $ impact)                                       │
│  [10,000         ] units @ [$12.00     ] per unit                             │
│                                                                                │
│                                              [Cancel]  [Add & Monitor]        │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### Adding a Monitored Product

```
User Action                    API Call                          Database
───────────────────────────────────────────────────────────────────────────────
[Click "Save & Monitor"]  →  POST /api/saved-products      →  SavedProduct created
                                 { isMonitored: true }           ↓
                          →  POST /api/tariff-alerts       →  TariffAlert created
                                 { savedProductId }              (linked)
```

### Fetching Monitored Products Table

```
UI Request                     API Call                          Data Sources
───────────────────────────────────────────────────────────────────────────────
[Load Monitoring Tab]     →  GET /api/saved-products       →  SavedProduct records
                                ?monitored=true
                                                            
For each product:         →  getEffectiveTariff()          →  Country Tariff Registry
                                (countryCode, htsCode)           (LIVE rates)
                                                            
                          →  compareLandedCosts()          →  HtsCostByCountry + Registry
                                (htsCode)                        (alternatives)
                                                            
                          →  TariffAlertEvent history      →  Alert events (changes)
```

### Checking for Rate Changes (Background)

```
Cron Job / Manual Trigger      Service Call                      Result
───────────────────────────────────────────────────────────────────────────────
[Daily at 6am UTC]        →  checkAndUpdateAlerts()        →  For each active alert:
                                                                
                          →  getEffectiveTariff()          →  Get current rate
                                (from tariffRegistry.ts)        
                                                            
                          →  Compare to alert.currentRate  →  If changed:
                                                                - Create TariffAlertEvent
                                                                - Update alert.currentRate
                                                                - (Future: send email)
```

---

## API Endpoints

### Existing (Backend Complete ✅)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tariff-alerts` | List user's alerts |
| POST | `/api/tariff-alerts` | Create new alert |
| GET | `/api/tariff-alerts/[id]` | Get alert details + events |
| PATCH | `/api/tariff-alerts/[id]` | Update alert settings |
| DELETE | `/api/tariff-alerts/[id]` | Delete alert |

### New Endpoints Needed

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/tariff-alerts/summary` | Dashboard summary card data |
| GET | `/api/saved-products?monitored=true` | Monitored products with live rates |
| POST | `/api/saved-products/[id]/monitor` | Toggle monitoring for existing product |

---

## Implementation Plan

### Phase 1: Core Table ✅ COMPLETE
- [x] 1.1 Create `TariffMonitoringTab.tsx` component
- [x] 1.2 Table with Ant Design, real API integration
- [x] 1.3 `/api/saved-products?monitored=true` with live rate enrichment
- [x] 1.4 Stats header, rate change indicators
- [x] 1.5 Integrated with Sourcing page as third tab

### Phase 2: Dashboard Card ✅ COMPLETE
- [x] 2.1 Create `TariffIntelligenceCard.tsx`
- [x] 2.2 Added to main dashboard layout
- [x] 2.3 Real data from saved products API

### Phase 3: Entry Points ✅ COMPLETE
- [x] 3.1 "Save & Monitor" button on classification results (already in `ClassificationResult.tsx`)
- [x] 3.2 "Add by HTS Code" modal in monitoring tab
- [x] 3.3 Multiple entry point empty state (Classify / Add by HTS / From Cost Analysis)
- [x] 3.4 Bulk "Monitor Selected" action in `SearchHistoryPanel.tsx`

### Phase 4: Detail View ✅ COMPLETE
- [x] 4.1 Create `ProductDetailDrawer.tsx` with rate breakdown
- [x] 4.2 Rate history timeline (using TariffAlertEvent data)
- [x] 4.3 Sourcing alternatives section (fetches from `/api/sourcing/hts-costs`)
- [x] 4.4 Connected "Analyze" and "Find Suppliers" buttons with tab switching

---

## Files

### All Complete
```
src/features/sourcing/components/
├── TariffMonitoringTab.tsx        # ✅ Full monitoring tab with row click → drawer
├── ProductDetailDrawer.tsx        # ✅ Product detail drawer with ClassificationPath
└── index.ts                       # ✅ Exports

src/features/dashboard/components/
└── TariffIntelligenceCard.tsx     # ✅ Dashboard card (380 lines)

src/features/compliance/components/
├── ClassificationResult.tsx       # ✅ "Save & Monitor" button built-in
├── ClassificationPath.tsx         # ✅ Direct lineage display (no siblings by default)
└── SearchHistoryPanel.tsx         # ✅ Bulk "Monitor Selected" action + smart names

src/hooks/
└── useHTSHierarchy.ts             # ✅ Reusable hook for fetching HTS hierarchy

src/utils/
└── productNameGenerator.ts        # ✅ Smart name extraction from descriptions
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Products monitored per user | 5+ avg | Count `SavedProduct` where `isMonitored` |
| Alert engagement | 30%+ | Clicks on alerts / total alerts shown |
| Time to first monitored product | < 2 min | Track from signup to first monitor |
| Return rate for monitoring users | 3x/week | Users who return to check table |

---

## References

- [Country Tariff Registry Architecture](./ARCHITECTURE_TARIFF_REGISTRY.md)
- [Product Roadmap - Phase 2](./PRODUCT_ROADMAP.md)
- Prisma Schema: `SavedProduct`, `TariffAlert`, `TariffAlertEvent`

