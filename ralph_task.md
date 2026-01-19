---
task: Build Sourcify Trade Intelligence Platform - Phase 0 Foundation
test_command: "npm run build"
---

# Task: Sourcify Phase 0 - Foundation & Polish

Build the foundational features for Sourcify, a trade intelligence platform competing with Descartes Datamyne and CustomsInfo.

## Context

Read these files first:
- `docs/MASTER_FEATURE_SPEC.md` - Full feature specification
- `docs/COMPETITIVE_ANALYSIS_DATAMYNE.md` - Competitive landscape
- `AGENTS.md` - Project patterns and gotchas
- `prisma/schema.prisma` - Database schema

## Success Criteria

### P0-001: Fix Saved Products List Page
1. [ ] My Products page (`/dashboard/products`) loads without errors
2. [ ] Products display in a table with: name, HTS code, country, duty rate, date saved
3. [ ] Search filters products by name or HTS code
4. [ ] Empty state shows helpful message when no products saved
5. [ ] Loading state shows skeleton while fetching
6. [ ] Delete action works with confirmation dialog
7. [ ] Click row opens product detail drawer

### P0-002: Save Classification to My Products
1. [ ] "Save to My Products" button appears on classification results
2. [ ] Clicking save stores: HTS code, product description, country, duty breakdown
3. [ ] Success toast confirms save with link to My Products
4. [ ] Duplicate detection warns if same HTS+country already saved
5. [ ] Saved products appear immediately in My Products list

### P0-003: Mobile Navigation
1. [ ] Sidebar collapses to hamburger menu on mobile (<768px)
2. [ ] Hamburger opens drawer with full navigation
3. [ ] Active route highlighted in mobile nav
4. [ ] Drawer closes on route change
5. [ ] Touch targets are at least 44px

### P0-004: Dashboard Statistics
1. [ ] Dashboard shows real user statistics (not mock data)
2. [ ] "Total Classifications" counts user's saved products
3. [ ] "Countries Tracked" counts unique countries in saved products
4. [ ] "Recent Activity" shows last 5 classifications
5. [ ] Stats update when products are added/removed

## Technical Notes

- Use Prisma client from `src/lib/db.ts`
- Use Better Auth session from `src/lib/auth-client.ts`
- Follow existing patterns in `src/features/compliance/components/`
- HTS codes stored WITHOUT dots, displayed WITH dots (use `formatHtsCode()`)
- Test with `npm run build` - must compile without errors

## Definition of Done

- [ ] All acceptance criteria checked
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] Code follows existing patterns
- [ ] Changes committed with descriptive messages
