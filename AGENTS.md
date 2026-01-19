# AGENTS.md - Sourcify Project Context

This file contains important context for AI agents working on the Sourcify codebase.

## Project Overview

Sourcify is a trade intelligence platform that helps importers:
1. **Classify products** - AI-powered HTS code classification
2. **Calculate duties** - Full duty breakdown including special tariffs
3. **Find suppliers** - Discover and compare global suppliers
4. **Stay compliant** - Denied party screening, ADD/CVD lookup, etc.

**Competition:** Descartes Datamyne ($10K+/yr) and Descartes CustomsInfo ($10K+/yr)
**Our advantage:** Modern UX, AI reasoning, SMB pricing ($0-$299/mo), no demos required

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

*Last updated: January 19, 2026*
