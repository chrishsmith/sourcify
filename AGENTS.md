# AGENTS.md - Sourcify Project Context

This file contains important context for AI agents working on the Sourcify codebase.

## Documentation Hierarchy

| Document | Purpose |
|----------|---------|
| `docs/prd-trade-intelligence.md` | **SOURCE OF TRUTH** - Vision, features, status |
| `docs/prd.json` | Task tracking (what's done, what's next) |
| `docs/architecture.md` | Technical architecture |
| `docs/product-roadmap.md` | Quick reference roadmap |
| `docs/competitive-analysis-datamyne.md` | Competitor research |

## Project Overview

Sourcify is a trade intelligence platform that helps importers:
1. **Classify products** - AI-powered HTS code classification
2. **Calculate duties** - Full duty breakdown including special tariffs
3. **Find suppliers** - Discover and compare global suppliers
4. **Stay compliant** - Denied party screening, ADD/CVD lookup, FTA qualification, etc.

**Competition:** Descartes Datamyne ($10K+/yr) and Descartes CustomsInfo ($10K+/yr)
**Our advantage:** Modern UX, AI reasoning, SMB pricing ($0-$299/mo), no demos required

## Current Status

**Phase 1-2 (Public Data): COMPLETE**
- AI Classification (V10 semantic search)
- Tariff Registry (199 countries)
- Trade Statistics Dashboard
- FTA Rules Engine + Qualification Calculator
- Denied Party Screening (OFAC, BIS)
- ADD/CVD Lookup
- PGA Requirements
- Tariff Tracker
- Compliance Alerts

**Next: Monetization (Stripe, usage limits, feature gating)**

## Architecture

### Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **UI:** Ant Design 5
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** Better Auth (session-based)
- **AI:** xAI (Grok) via `/src/lib/xai.ts`
- **Vector Search:** pgvector for HTS semantic search

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login)
│   ├── (dashboard)/       # Dashboard pages (protected)
│   ├── api/               # API route handlers
│   └── actions/           # Server actions
├── components/            # Shared UI components
│   ├── layouts/          # Layout components
│   └── shared/           # Reusable components
├── features/              # Feature-specific code
│   ├── auth/             # Auth components
│   ├── compliance/       # Classification, tariffs
│   ├── dashboard/        # Dashboard widgets
│   ├── onboarding/       # Onboarding flow
│   └── sourcing/         # Supplier discovery
├── services/              # Business logic services
├── lib/                   # Third-party integrations
├── hooks/                 # React hooks
├── types/                 # TypeScript types
└── utils/                 # Utility functions
```

## Key Patterns

### API Routes
API routes are in `src/app/api/`. Example pattern:

```typescript
// src/app/api/example/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // ... logic
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Error message' },
      { status: 500 }
    );
  }
}
```

### Feature Components
Components are organized by feature in `src/features/`. Example:

```typescript
// src/features/compliance/components/ComponentName.tsx
'use client';

import React from 'react';
import { Card } from 'antd';

interface ComponentNameProps {
  // Define props
}

export const ComponentName: React.FC<ComponentNameProps> = ({ ...props }) => {
  return <Card>...</Card>;
};
```

### Database Access
Always use Prisma client from `src/lib/db.ts`:

```typescript
import { prisma } from '@/lib/db';

const result = await prisma.searchHistory.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' },
});
```

## Important Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema - READ THIS FIRST |
| `src/lib/db.ts` | Prisma client singleton |
| `src/lib/auth.ts` | Better Auth configuration |
| `src/lib/xai.ts` | xAI API client |
| `src/services/classificationEngineV10.ts` | Current classification engine |
| `src/services/tariffRegistry.ts` | Tariff calculation logic |
| `src/components/layouts/DashboardLayout.tsx` | Main layout |
| `src/features/compliance/components/ClassificationV10.tsx` | Classification UI |
| `src/features/compliance/components/TariffBreakdown.tsx` | Duty display |
| `src/services/ofacService.ts` | OFAC SDN list ingestion & search |
| `src/services/exportService.ts` | Excel/CSV export utilities |
| `src/services/pdfExportService.ts` | PDF report generation |

## Compliance Tools

### Denied Party Screening (Phase 3)
- **Database:** `DeniedParty` model stores entries from OFAC, BIS, etc.
- **Enums:** `DeniedPartyList` (ofac_sdn, bis_entity_list, bis_denied, etc.), `DeniedPartyType` (individual, entity, vessel, aircraft)
- **Services:** 
  - `src/services/ofacService.ts` - OFAC SDN list sync and search
  - `src/services/bisService.ts` - BIS Entity List and Denied Persons sync
- **API:** `/api/denied-party/sync` (POST to sync, GET for status), `/api/denied-party` (GET to search/list)

### OFAC SDN Data Sources
- Main list: https://www.treasury.gov/ofac/downloads/sdn.csv
- Alternate names: https://www.treasury.gov/ofac/downloads/alt.csv
- Addresses: https://www.treasury.gov/ofac/downloads/add.csv

### BIS Restricted Party Lists
- **Entity List:** Companies/individuals subject to export restrictions
- **Denied Persons List:** Persons denied export privileges
- **Data Source:** Trade.gov Consolidated Screening List API (includes BIS data)
- **API URL:** https://api.trade.gov/static/consolidated_screening_list/consolidated.json
- **Sync Functions:**
  - `syncBISEntityList()` - Syncs BIS Entity List entries
  - `syncBISDeniedPersons()` - Syncs BIS Denied Persons entries
  - `syncAllBISLists()` - Syncs both BIS lists in parallel

### Denied Party Sync API Usage
```bash
# Sync specific list
POST /api/denied-party/sync?list=ofac_sdn
POST /api/denied-party/sync?list=bis_entity_list
POST /api/denied-party/sync?list=bis_denied

# Sync all lists
POST /api/denied-party/sync?list=all

# Get sync status
GET /api/denied-party/sync
GET /api/denied-party/sync?list=bis_entity_list

# Search/list denied parties
GET /api/denied-party?q=searchterm
GET /api/denied-party?sourceList=bis_entity_list&countryCode=CN
```

### ADD/CVD (Antidumping & Countervailing Duty) Lookup
- **Data File:** `src/data/adcvdOrders.ts` - Static data for 20+ product categories
- **API:** `/api/adcvd` (GET with ?htsCode, ?countryCode, ?search params)
- **Page:** `/dashboard/compliance/addcvd`
- **Component:** `src/features/compliance/components/ADCVDLookup.tsx`
- **Key Functions:**
  - `checkADCVDWarning(htsCode, countryCode)` - Returns warning if HTS may have ADD/CVD exposure
  - `getAllADCVDOrders()` - Returns all known ADD/CVD orders
  - `getADCVDOrdersByHTS(htsCode)` - Orders matching HTS prefix
  - `getADCVDOrdersByCountry(countryCode)` - Orders affecting a country

### ADD/CVD Risk Levels
- **High Risk:** Chapters 72, 73 (Iron & Steel) - Most orders
- **Medium Risk:** Chapters 76 (Aluminum), 85 (Electrical), 40 (Rubber), 44 (Wood), 48 (Paper)
- **Low Risk:** Other products with known orders
- **None:** No known ADD/CVD exposure

### ADD/CVD Data Sources
- CBP AD/CVD Search: https://aceservices.cbp.dhs.gov/adcvdweb
- ITC Orders List: https://www.usitc.gov/trade_remedy/documents/orders.xls
- ITA Searchable Database: https://www.trade.gov/data-visualization/adcvd-orders-searchable-database

## Gotchas

### 1. Classification Engine Versions
There are multiple classification engine versions (V4-V10). **Always use V10**:
- `src/services/classificationEngineV10.ts`
- `src/app/api/classify-v10/route.ts`
- `src/features/compliance/components/ClassificationV10.tsx`

### 2. Country Codes
Use ISO 3166-1 alpha-2 codes (e.g., 'CN', 'VN', 'MX'). The `CountryTariffProfile` model has full country data.

### 3. HTS Codes
- Store WITHOUT dots: `6109100012`
- Display WITH dots: `6109.10.00.12`
- Use `formatHtsCode()` from `src/utils/htsFormatting.ts`

### 4. Tariff Layers
Tariffs stack in layers:
1. Base MFN rate (from HTS schedule)
2. Section 301 (China only, by list)
3. IEEPA fentanyl (CN, MX, CA)
4. IEEPA reciprocal (varies by country)
5. Section 232 (steel/aluminum)
6. AD/CVD (product+country specific)

### 5. User Session
Get current user with Better Auth:

```typescript
import { useSession } from '@/lib/auth-client';

const { data: session, isPending } = useSession();
const user = session?.user;
```

### 6. Ant Design Imports
Import components individually, not from 'antd' bundle:

```typescript
// Good
import { Card, Button, Table } from 'antd';

// Also good (but verbose)
import Card from 'antd/es/card';
```

## Testing Locally

```bash
# Start dev server
npm run dev

# Open in browser
http://localhost:3000

# For dev login without email:
http://localhost:3000/dashboard?dev=1
```

## Database Migrations

```bash
# After schema changes
npx prisma generate          # Regenerate types
npx prisma db push          # Push to dev DB (creates migration)
npx prisma migrate deploy   # Apply migrations in prod
```

## Common Tasks

### Adding a New Page
1. Create `src/app/(dashboard)/dashboard/[name]/page.tsx`
2. Create component in `src/features/[feature]/components/`
3. Add navigation item in `DashboardLayout.tsx`

### Adding an API Endpoint
1. Create `src/app/api/[name]/route.ts`
2. Add service logic in `src/services/`
3. Add types in `src/types/`

### Adding a Database Table
1. Add model to `prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push`

---

## Additional Compliance Tools

### FTA Rules & Qualification
- **Data:** `src/data/ftaRules.ts` - 14 FTAs, 30+ rules
- **API:** `/api/fta-rules` (GET), `/api/fta-calculator` (POST)
- **Pages:** `/dashboard/compliance/fta-rules`, `/dashboard/compliance/fta-calculator`
- **Components:** `FTARulesLookup.tsx`, `FTAQualificationCalculator.tsx`

### PGA Requirements
- **Data:** `src/data/pgaFlags.ts` - 13 agencies, 30+ flags
- **API:** `/api/pga` (GET)
- **Page:** `/dashboard/compliance/pga`
- **Component:** `PGALookup.tsx`

### Historical HTS Archives
- **Data:** `src/data/htsCodeChanges.ts` - 2020-2025 changes
- **API:** `/api/hts-history` (GET)
- **Page:** `/dashboard/compliance/hts-history`
- **Component:** `HTSHistoryLookup.tsx`

### Tariff Tracker (301/IEEPA/232)
- **Data:** `src/data/specialTariffs.ts` - All special tariff programs
- **API:** `/api/tariff-tracker` (GET)
- **Page:** `/dashboard/compliance/tariff-tracker`
- **Component:** `TariffTrackerContent.tsx`

### Trade Statistics
- **Service:** `src/services/usitcDataWeb.ts` - USITC DataWeb integration
- **API:** `/api/trade-stats` (GET)
- **Page:** `/dashboard/intelligence/trade-stats`
- **Component:** `TradeStatsDashboard.tsx`

---

*Last updated: January 22, 2026*
