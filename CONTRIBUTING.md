# Contributing to Sourcify

Welcome! This guide covers the development workflow, conventions, and best practices for contributing to Sourcify—even if it's just future-you coming back to this codebase.

---

## Development Setup

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Start dev server
npm run dev
```

---

## Branch Naming

Use descriptive, kebab-case branch names:

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/<description>` | `feature/bulk-classification-ui` |
| Bug fix | `fix/<description>` | `fix/classification-null-crash` |
| Refactor | `refactor/<area>` | `refactor/services-layer` |
| Documentation | `docs/<topic>` | `docs/update-roadmap` |
| Experiment | `spike/<name>` | `spike/redis-caching` |

Main branches:
- `main` — Production-ready code
- `develop` — Integration branch (if used)

---

## Commit Conventions

We use **Conventional Commits** for clean history and potential auto-changelogs.

### Format

```
<type>(<scope>): <short description>

[optional body]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructure (no behavior change) |
| `docs` | Documentation only |
| `style` | Formatting, whitespace, semicolons |
| `test` | Adding or fixing tests |
| `chore` | Maintenance (deps, tooling, config) |
| `perf` | Performance improvement |

### Scopes (optional)

Common scopes: `classification`, `prisma`, `ui`, `auth`, `docs`, `tariff`, `sourcing`

### Examples

```bash
feat(classification): add bulk CSV upload endpoint
fix: handle null result in TariffBreakdown component
docs: update master-feature-spec with compliance tools
refactor(services): extract tariff logic to registry service
chore(deps): upgrade prisma to 5.22
```

Keep subject line under 72 characters. Add a body for context on *why* if needed.

---

## File & Folder Conventions

Refer to `.cursor/rules/` for detailed conventions:

- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for React components
- **Folders:** `kebab-case/`
- **API routes:** `src/app/api/<feature>/route.ts`
- **Features:** `src/features/<feature>/components/`

---

## Adding a Feature

1. **Update progress tracking** — Add tasks to `docs/progress.md`
2. **Create a branch** — `feature/<your-feature>`
3. **Build incrementally** — Commit every 10-20 minutes or logical chunk
4. **Respect existing patterns** — Check similar features for conventions
5. **Update docs** — If adding APIs or services, document in relevant `docs/architecture/` file

---

## Using Cursor / AI Assistants

This repo is optimized for AI-assisted development:

- **Rules live in `.cursor/rules/`** — Project structure, naming, commits, docs tracking
- **Docs are the knowledge base** — PRDs, architecture docs, and progress.md guide development
- **Incremental commits** — Small, atomic commits make it easier to review and revert

When using Cursor Composer or similar tools:
1. Reference the relevant docs or rules
2. Ask for changes in bite-sized chunks
3. Commit frequently

---

## Code Quality

- **TypeScript** — Strict mode enabled; avoid `any`
- **Linting** — Run `npm run lint` before committing
- **No magic numbers** — Use named constants
- **Error handling** — Always handle errors with try/catch and meaningful messages

---

## Testing (Future)

Testing infrastructure is planned. When added:
- Unit tests for services
- Integration tests for API routes
- E2E tests for critical flows

---

## Questions?

Check the docs first:
- `docs/master-feature-spec.md` — What we're building
- `docs/product-roadmap.md` — When we're building it
- `docs/progress.md` — What's done and what's next

---

*Happy vibe-coding!*
