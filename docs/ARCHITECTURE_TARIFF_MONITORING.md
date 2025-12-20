# Tariff Monitoring System Architecture

> **Created:** December 20, 2025  
> **Status:** UI Design Complete | Backend ✅ | Frontend 🔲  
> **Owner:** Core Platform

---

## Overview

The Tariff Monitoring System allows users to track tariff rates for their products and get alerted when rates change. This document details the UI/UX design, data flow, and implementation plan.

### Design Principles

1. **NO MOCK DATA** - All rates from centralized Country Tariff Registry via `getEffectiveTariff()`
2. **Persona-driven** - Different users have different needs
3. **Proactive value** - Show users data they didn't know they needed

---

## User Personas & Use Cases

| Persona | What They Monitor | Key Needs |
|---------|-------------------|-----------|
| **Importer/Sourcer** | Active product catalog (5-50 SKUs) | $ impact, alternatives ready |
| **Compliance Officer** | HTS chapters relevant to company | Historical data, exports |
| **Procurement Manager** | Countries they're evaluating | Comparison data |
| **Entrepreneur** | 1-3 products in validation | Simple "is this still viable?" |

---

## Architecture: Hybrid Approach

### Why Hybrid?

| Component | Location | Purpose | Persona Fit |
|-----------|----------|---------|-------------|
| **Summary Card** | Main Dashboard | "What needs attention NOW?" | Entrepreneur, all |
| **Full Monitoring Tab** | Sourcing Intelligence | Detailed table + actions | Importer, Compliance |

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
│  SOURCING INTELLIGENCE                    ← Full detail: Monitoring tab        │
│  [Analyze] [Suppliers] [📊 Monitoring]                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  (Full table with history, actions, alternatives)                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Component 1: Dashboard Intelligence Summary Card

### Location
`src/features/dashboard/components/IntelligenceSummaryCard.tsx`

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

## Component 2: Sourcing Monitoring Tab

### Location
`src/features/sourcing/components/MonitoringTab.tsx`

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

## Component 3: Product Detail Drawer

### Location
`src/features/sourcing/components/ProductDetailDrawer.tsx`

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

## Component 4: Entry Points

### 4.1 Classification Results - "Save & Monitor" Button

**Location:** `src/features/compliance/components/SaveAndMonitorButton.tsx`

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

### 4.2 Search History - "Monitor" Action

**Location:** `src/features/compliance/components/SearchHistoryPanel.tsx`

Add to row actions:
```
[View] [Classify Again] [Monitor 🔔] [Delete]
```

### 4.3 Monitoring Tab - "+ Add Product" Form

**Location:** `src/features/sourcing/components/AddProductForm.tsx`

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

### Phase 1: Core Table (2-3 days)
- [ ] 1.1 Create `MonitoringTab.tsx` component
- [ ] 1.2 Create `MonitoredProductsTable.tsx` with Ant Design Table
- [ ] 1.3 Add `/api/saved-products?monitored=true` with live rate enrichment
- [ ] 1.4 Add `/api/tariff-alerts/summary` endpoint
- [ ] 1.5 Integrate with Sourcing page as third tab

### Phase 2: Detail & Actions (1-2 days)
- [ ] 2.1 Create `ProductDetailDrawer.tsx` with rate breakdown
- [ ] 2.2 Add rate history chart (using TariffAlertEvent data)
- [ ] 2.3 Add alternatives section (calls `compareLandedCosts`)
- [ ] 2.4 Connect "Analyze" and "Find Suppliers" buttons

### Phase 3: Entry Points (1 day)
- [ ] 3.1 Create `SaveAndMonitorButton.tsx` for classification results
- [ ] 3.2 Add "Monitor" action to `SearchHistoryPanel.tsx`
- [ ] 3.3 Create `AddProductForm.tsx` for manual entry

### Phase 4: Dashboard Card (0.5 day)
- [ ] 4.1 Create `IntelligenceSummaryCard.tsx`
- [ ] 4.2 Add to main dashboard layout

---

## Files to Create

```
src/features/sourcing/components/
├── MonitoringTab.tsx              # Tab container
├── MonitoredProductsTable.tsx     # Main table
├── ProductDetailDrawer.tsx        # Slide-out detail view
├── AddProductForm.tsx             # Manual add form
└── index.ts                       # Exports

src/features/dashboard/components/
└── IntelligenceSummaryCard.tsx    # Dashboard card

src/features/compliance/components/
└── SaveAndMonitorButton.tsx       # CTA on classification results

src/app/api/
├── tariff-alerts/
│   └── summary/
│       └── route.ts               # GET summary stats
└── saved-products/
    └── [id]/
        └── monitor/
            └── route.ts           # POST toggle monitoring
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

