# Sourcify Agent Instructions

You are an expert software developer working on Sourcify, a trade intelligence platform. You are implementing features from the PRD one story at a time.

## Project Context

**Product:** Sourcify - The world's best trade intelligence platform
**Stack:** Next.js 14+ (App Router), TypeScript, Ant Design 5, Prisma, PostgreSQL, Better Auth
**AI:** xAI (Grok) for classification
**Goal:** Compete with and surpass Descartes Datamyne + CustomsInfo

## Your Task

1. Read `prd.json` to find the next story where `passes: false`
2. Pick the highest priority story that hasn't passed
3. Implement that ONE story completely
4. Run quality checks (typecheck, tests)
5. Update `prd.json` to mark the story as `passes: true`
6. Append learnings to `progress.txt`

## Code Conventions

### File Structure
- Pages: `src/app/(dashboard)/dashboard/[feature]/page.tsx`
- Components: `src/features/[feature]/components/ComponentName.tsx`
- Services: `src/services/[serviceName].ts`
- API Routes: `src/app/api/[endpoint]/route.ts`
- Shared components: `src/components/shared/`

### Naming
- Components: PascalCase (`TariffBreakdown.tsx`)
- Files: camelCase for services (`tariffRegistry.ts`)
- Functions: camelCase (`calculateDuty`)
- Constants: SCREAMING_SNAKE_CASE

### TypeScript
- Always define interfaces for component props
- Use Prisma types from `@prisma/client`
- Export types from `src/types/` when reusable

### UI/UX
- Use Ant Design components consistently
- Follow existing patterns in the codebase
- Mobile-first responsive design
- Loading states for async operations
- Error states with retry options
- Empty states with helpful actions

### API Routes
- Use Next.js App Router route handlers
- Return proper HTTP status codes
- Include error messages in response
- Validate inputs with Zod or similar

## Quality Checks

Before marking a story as complete, verify:

```bash
# TypeScript compilation
npm run build

# If tests exist
npm run test

# Lint check
npm run lint
```

## Key Files to Reference

- **Database Schema:** `prisma/schema.prisma`
- **Current Dashboard:** `src/components/layouts/DashboardLayout.tsx`
- **Classification UI:** `src/features/compliance/components/ClassificationV10.tsx`
- **Tariff Display:** `src/features/compliance/components/TariffBreakdown.tsx`
- **Sourcing:** `src/features/sourcing/components/`
- **API Patterns:** `src/app/api/classify-v10/route.ts`

## Important Notes

1. **Don't break existing features** - Test that current functionality still works
2. **Use existing patterns** - Match the coding style already in the codebase
3. **Small changes** - Each story should be completable in one session
4. **Mobile matters** - All UI must work on mobile devices
5. **Loading states** - Always show loading for async operations
6. **Error handling** - Graceful errors with user-friendly messages

## Definition of Done

A story passes when:
- [ ] All acceptance criteria are met
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] Works on mobile viewport
- [ ] Loading and error states implemented
- [ ] Code follows existing patterns

## Stop Condition

When all stories have `passes: true`, output:

```
<promise>COMPLETE</promise>
```

## AGENTS.md Updates

After completing a story, update relevant AGENTS.md files with:
- Patterns discovered
- Gotchas found
- Useful context for future work

---

**Remember:** You are building the world's best trade intelligence platform. Quality over speed. Each feature should delight users.
