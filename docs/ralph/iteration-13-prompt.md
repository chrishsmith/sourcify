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

## Self-Documentation & Learning (CRITICAL)

Ralph's power comes from **learning across iterations**. You MUST do this after EVERY story:

### 1. Update progress.txt
Append to `progress.txt` with this format:
```
### Story [ID] - [Date]
**What I Did:** [Summary of implementation]
**Patterns Found:** [Reusable patterns discovered]
**Gotchas:** [Things that didn't work or were tricky]
**For Next Time:** [Advice for future iterations]
```

### 2. Update AGENTS.md
Add permanent learnings to `AGENTS.md`:
- New coding patterns specific to this codebase
- API quirks or undocumented behavior
- File locations that were hard to find
- Dependencies between components

### 3. Add Notes to prd.json
Update the story's `notes` field with implementation details:
```json
{
  "id": "P0-001",
  "passes": true,
  "notes": "Used ClassificationsTable component. formatHtsCode() is in src/utils/htsFormatting.ts"
}
```

## Guardrails (Signs)

Before taking action, check `.ralph/guardrails.md` for lessons from past work.

**Add a Sign ONLY when you discover something that would save future iterations significant time or prevent bugs:**
- A pattern that wasn't obvious but is critical
- A gotcha that caused you to backtrack or debug
- A "wrong path" that future iterations should avoid

**Don't add Signs for:**
- Routine patterns already documented in AGENTS.md
- One-off issues unlikely to recur
- Obvious best practices

Format for new Signs (add to "## Learned Signs" section):
```markdown
### Sign: [Short Name]
- **Trigger:** [When this applies]
- **Instruction:** [What to do instead]
- **Added after:** Story [ID]
```

---

## ⚠️ MANDATORY ACTIONS BEFORE FINISHING

You MUST complete ALL of these before your session ends:

1. **Update prd.json** - Set `"passes": true` for the completed story
2. **Update progress.txt** - Add learnings with the format above
3. **Commit changes** - `git add -A && git commit -m "feat(STORY-ID): description"`

If you don't do these, the work is lost and the next iteration won't know what was done!

---

**Remember:** You are building the world's best trade intelligence platform. Quality over speed. Each feature should delight users. And ALWAYS document what you learn!

---

## Current PRD State

{
  "name": "Sourcify Trade Intelligence Platform",
  "description": "Build the world's best trade intelligence platform combining AI-powered HTS classification, comprehensive duty calculation, trade intelligence, and compliance tools.",
  "branchName": "feature/trade-intelligence-v1",
  "version": "1.0.0",
  "phases": [
    {
      "id": "phase-0",
      "name": "Foundation & Polish",
      "description": "Clean up existing features, establish patterns, fix bugs"
    },
    {
      "id": "phase-1",
      "name": "Core Classification Excellence",
      "description": "Make classification best-in-class with reasoning, bulk upload, exports"
    },
    {
      "id": "phase-2",
      "name": "Landed Cost Calculator",
      "description": "Complete duty calculation with landed cost, fees, scenarios"
    },
    {
      "id": "phase-3",
      "name": "Compliance Tools",
      "description": "Denied party screening, ADD/CVD, PGA, CBP rulings"
    }
  ],
  "userStories": [
    {
      "id": "P0-001",
      "phase": "phase-0",
      "title": "Fix saved products list page",
      "description": "The My Products page should show a proper list of saved products with search, filter, and actions",
      "priority": 1,
      "acceptanceCriteria": [
        "Products page at /dashboard/products shows all saved products",
        "Each product card shows: name, HTS code, country, duty rate, date saved",
        "User can search products by name or HTS code",
        "User can delete a product",
        "User can click a product to view details",
        "Empty state shown when no products saved",
        "Loading state while fetching"
      ],
      "technicalNotes": "Use existing SavedProduct model and /api/saved-products endpoints",
      "passes": true,
      "notes": "Implementation was already complete. Key components: ClassificationsTable.tsx handles list with search/delete/view, ProductDetailDrawer.tsx shows full details. API: /api/saved-products with GET/POST, /api/saved-products/[id] with GET/PATCH/DELETE. Service: src/services/savedProducts.ts. Uses formatHtsCode() from src/utils/htsFormatting.ts."
    },
    {
      "id": "P0-002",
      "phase": "phase-0",
      "title": "Save classification to My Products",
      "description": "After classifying a product, user should be able to save it to their products list",
      "priority": 1,
      "acceptanceCriteria": [
        "Classification result shows 'Save to My Products' button",
        "Clicking save opens modal to confirm/edit product name",
        "Product is saved with: name, description, HTS code, country, duty info",
        "Success toast shown after saving",
        "Button changes to 'Saved ✓' after successful save",
        "Saved product links to search history record"
      ],
      "technicalNotes": "Connect ClassificationV10 component to SavedProduct API",
      "passes": true,
      "notes": "Added save functionality to ClassificationV10.tsx. Button shows 'Save to My Products' with Bookmark icon. Modal allows editing product name with pre-filled default from description. Saves via POST /api/saved-products with sourceSearchId linking to SearchHistory. Button changes to 'Saved ✓' (green) after success. Service updated in savedProducts.ts to accept sourceSearchId parameter."
    },
    {
      "id": "P0-003",
      "phase": "phase-0",
      "title": "Search history with re-run capability",
      "description": "User should see their classification history and be able to re-run searches",
      "priority": 2,
      "acceptanceCriteria": [
        "Classification history panel shows recent searches",
        "Each entry shows: product description (truncated), HTS result, date, confidence",
        "Clicking an entry loads the full result",
        "Re-classify button re-runs the search with same inputs",
        "User can delete history entries",
        "History persists across sessions (stored in DB)"
      ],
      "technicalNotes": "Use existing SearchHistory model and SearchHistoryPanel component",
      "passes": true,
      "notes": "SearchHistoryPanel was mostly complete. Added Re-classify feature: 1) ReClassifyInput interface exported from SearchHistoryPanel, 2) onReClassify callback prop added to SearchHistoryPanel, 3) Re-classify button in actions dropdown and detail modal, 4) ClassificationV10LayoutB now accepts initialDescription/initialOrigin/initialMaterial/autoClassify props, 5) ClassificationsPageContent manages re-classify state and switches to Classify tab with auto-submit. Key files: SearchHistoryPanel.tsx (RotateCcw icon, handleReClassify, onReClassify prop), ClassificationV10LayoutB.tsx (ClassificationV10LayoutBProps, performClassification, auto-classify useEffects), ClassificationsPageContent.tsx (handleReClassify, reClassifyInput state)."
    },
    {
      "id": "P0-004",
      "phase": "phase-0",
      "title": "Add global loading and error states",
      "description": "All pages should have consistent loading spinners and error handling",
      "priority": 2,
      "acceptanceCriteria": [
        "All data-fetching pages show Spin component while loading",
        "Error states show Alert with retry button",
        "Empty states show appropriate message with action",
        "Loading states are consistent across all pages"
      ],
      "technicalNotes": "Create reusable LoadingState, ErrorState, EmptyState components in src/components/shared/",
      "passes": true,
      "notes": "Created three reusable state components in src/components/shared/: LoadingState.tsx (teal spinner with message, supports card/fullHeight modes), ErrorState.tsx (error/warning/info types with retry button), EmptyState.tsx (preset icons for products/search/etc, action buttons with Link support). Also created SearchEmptyState helper. Updated ClassificationsTable to use new components. Exported all from shared/index.ts."
    },
    {
      "id": "P0-005",
      "phase": "phase-0",
      "title": "Fix mobile navigation and layout",
      "description": "Ensure all pages work well on mobile devices",
      "priority": 2,
      "acceptanceCriteria": [
        "Sidebar drawer opens/closes smoothly on mobile",
        "All forms are usable on mobile (proper input sizes)",
        "Classification results scroll properly on mobile",
        "Tariff breakdown is readable on mobile",
        "Tables become scrollable or stack on mobile",
        "No horizontal overflow on any page"
      ],
      "technicalNotes": "Use Ant Design responsive utilities and test with Chrome DevTools mobile view",
      "passes": true,
      "notes": "Comprehensive mobile responsiveness update: 1) globals.css: Added mobile utilities (overflow prevention, touch-friendly input sizes 44px min-height, 16px font to prevent iOS zoom, card/modal/table padding adjustments, horizontal scroll helpers). 2) ClassificationV10.tsx: Form inputs stack on mobile (flex-col sm:flex-row), duty grid responsive (1 col on mobile, 3 on desktop), HTS code smaller text with word-break, decision questions stack on mobile, alternatives have compact layout. 3) ClassificationsTable.tsx: Added scroll={{ x: 800 }} for horizontal scroll, search bar stacks on mobile. 4) SearchHistoryPanel.tsx: Added scroll={{ x: 800 }}, responsive pagination. 5) TariffBreakdown.tsx: Tariff rows stack on mobile (flex-col sm:flex-row), text sizes adjust, total rate responsive. 6) BulkClassificationContent.tsx: Preview table scroll, buttons stack on mobile."
    },
    {
      "id": "P0-006",
      "phase": "phase-0",
      "title": "Set up Excel/CSV export service",
      "description": "Create reusable export utilities for Excel and CSV downloads",
      "priority": 3,
      "acceptanceCriteria": [
        "Export service exists at src/services/exportService.ts",
        "exportToExcel function takes data array and column config",
        "exportToCSV function takes data array",
        "Both trigger browser download with proper filename",
        "Works with classification results, product lists, etc."
      ],
      "technicalNotes": "Use xlsx (SheetJS) library for Excel generation",
      "passes": true,
      "notes": "Created comprehensive export service at src/services/exportService.ts. Features: exportToExcel (with column config), exportToExcelSimple (auto-detect columns), exportToCSV (simple), exportToCSVWithColumns (with transforms). Includes ExportPresets for common types (classificationResults, savedProducts, searchHistory, landedCost). QuickExport helper for one-liners. Updated BulkClassificationContent to use the new service. Handles proper CSV escaping, column widths, transforms, timestamps in filenames."
    },
    {
      "id": "P1-001",
      "phase": "phase-1",
      "title": "Add AI reasoning to classification results",
      "description": "Show WHY the AI chose this classification with clear reasoning",
      "priority": 1,
      "acceptanceCriteria": [
        "Classification result shows 'AI Reasoning' section",
        "Reasoning explains: why this chapter, why this heading, why this code",
        "Key factors highlighted (material, use, construction)",
        "If 'Other' code, explain what was excluded",
        "Reasoning is collapsible (expanded by default)",
        "Reasoning formatted for readability (bullets, bold terms)"
      ],
      "technicalNotes": "Enhance classificationEngineV10 to include reasoning in response, update ClassificationV10 component",
      "passes": true,
      "notes": "Backend already had AIReasoning generation (generateAIReasoning function in classificationEngineV10.ts lines 1181-1343). Added UI display in ClassificationV10.tsx with collapsible panel (expanded by default), numbered steps for Chapter→Heading→Code reasoning, key factors grid with impact indicators (positive/neutral/uncertain), exclusions list for 'Other' codes, and confidence assessment. API already returned aiReasoning; updated to also return searchHistoryId for product save linking."
    },
    {
      "id": "P1-002",
      "phase": "phase-1",
      "title": "Build bulk classification UI",
      "description": "User can upload CSV of products and classify them all at once",
      "priority": 1,
      "acceptanceCriteria": [
        "Bulk upload page at /dashboard/classify/bulk",
        "User can download CSV template with required columns",
        "User can upload CSV file (drag-drop or file picker)",
        "Preview shows first 5 rows before processing",
        "Progress bar shows classification progress",
        "Results table shows all products with HTS codes",
        "User can download results as Excel",
        "Errors shown inline for failed rows"
      ],
      "technicalNotes": "Use existing /api/classify/bulk endpoint, add UI components",
      "passes": true,
      "notes": "Created dedicated bulk page at /dashboard/classify/bulk with BulkClassificationContent component. Features: 4-stage workflow (idle→preview→processing→complete), CSV drag-drop upload with template download, 5-row preview before processing, circular progress bar with live stats, real-time results table with status/HTS/confidence/duty columns, Excel export via xlsx library, inline error display for failed rows. Uses V10 classification API directly. Updated ClassificationsPageContent to link to bulk page instead of modal. Component: src/features/compliance/components/BulkClassificationContent.tsx"
    },
    {
      "id": "P1-003",
      "phase": "phase-1",
      "title": "Classification report PDF export",
      "description": "User can export a professional PDF report of classification",
      "priority": 2,
      "acceptanceCriteria": [
        "Export PDF button on classification results",
        "PDF includes: product description, HTS code, full path, duty breakdown",
        "PDF includes AI reasoning",
        "PDF includes disclaimer text",
        "PDF has Sourcify branding",
        "PDF downloads with sensible filename"
      ],
      "technicalNotes": "Use @react-pdf/renderer for PDF generation",
      "passes": true,
      "notes": "Created pdfExportService.ts at src/services/pdfExportService.ts. Uses @react-pdf/renderer with createElement pattern for SSR compatibility. Page 1: Product info, HTS code, path, duty breakdown, disclaimer. Page 2 (if AI reasoning exists): chapter/heading/code reasoning, key factors, confidence. Added Export PDF button to ClassificationV10.tsx action buttons. Uses teal branding, professional layout. Filename format: sourcify-classification-{hts}-{product}-{date}.pdf"
    },
    {
      "id": "P1-004",
      "phase": "phase-1",
      "title": "Compare alternatives with duty rates",
      "description": "Show duty rate comparison for all alternative classifications",
      "priority": 2,
      "acceptanceCriteria": [
        "Alternative classifications show duty rate for each",
        "Duty rates fetched for selected country of origin",
        "Visual indicator if alternative has lower duty",
        "User can click to see full duty breakdown for any alternative",
        "Sort alternatives by confidence or by duty rate"
      ],
      "technicalNotes": "Fetch duty rates for top 5 alternatives in classification API",
      "passes": true,
      "notes": "Updated classificationEngineV10.ts to fetch duty rates for top 5 alternatives using parallel Promise.all. Alternative interface now includes effectiveNumeric and breakdown fields. ClassificationV10.tsx enhanced with: 1) Sort controls (confidence vs duty rate), 2) Lower Duty badge (green) when alternative has lower rate than primary, 3) Clickable duty buttons that open detailed breakdown modal, 4) Modal shows base MFN, all additional duties, total effective rate, and savings/additional vs primary comparison. Alternatives with lower duty are highlighted with green background."
    },
    {
      "id": "P1-005",
      "phase": "phase-1",
      "title": "What if different country comparison",
      "description": "Quick comparison of duties from different countries",
      "priority": 2,
      "acceptanceCriteria": [
        "After classification, show 'Compare Countries' button",
        "Modal shows duty comparison for: China, Vietnam, India, Mexico, Thailand",
        "Each country shows: effective rate, breakdown summary, savings vs current",
        "Highlight best option (lowest duty)",
        "User can add/remove countries to compare"
      ],
      "technicalNotes": "Use existing tariff registry to calculate rates for multiple countries",
      "passes": true,
      "notes": "Added country comparison modal to ClassificationV10.tsx (~250 lines). Uses existing /api/duty-comparison endpoint. Features: 1) Compare Countries button in action buttons section, 2) Modal with 18 available countries from COMPARISON_COUNTRIES array, 3) Default comparison: CN, VN, IN, MX, TH, 4) Country cards sorted by effective rate (lowest first), 5) Best option highlighted with green Award badge, 6) Current country selection marked with purple tag, 7) Duty breakdown tags (Base, FTA, IEEPA, §301, §232), 8) Savings vs current calculation (green for savings, red for higher), 9) Add/remove countries via Select dropdown with Update Comparison button. API: /api/duty-comparison uses getEffectiveTariff() from tariffRegistry service."
    },
    {
      "id": "P2-001",
      "phase": "phase-2",
      "title": "Build landed cost calculator page",
      "description": "Dedicated page for calculating total landed cost of imports",
      "priority": 1,
      "acceptanceCriteria": [
        "Landed cost page at /dashboard/duties/calculator",
        "Input fields: HTS code, country, product value, quantity",
        "Input fields: shipping cost, insurance cost",
        "Calculate button triggers calculation",
        "Results show: duties, fees, total landed cost",
        "Per-unit cost shown if quantity > 1"
      ],
      "technicalNotes": "Create new page and API endpoint for landed cost",
      "passes": false
    },
    {
      "id": "P2-002",
      "phase": "phase-2",
      "title": "Add customs fees to calculation",
      "description": "Include MPF and HMF in landed cost calculation",
      "priority": 1,
      "acceptanceCriteria": [
        "Merchandise Processing Fee (MPF) calculated correctly",
        "MPF: 0.3464% of value, min $31.67, max $614.35",
        "Harbor Maintenance Fee (HMF) calculated for ocean shipments",
        "HMF: 0.125% of value",
        "Fees shown as separate line items in breakdown",
        "Toggle for ocean vs air shipment (affects HMF)"
      ],
      "technicalNotes": "Add fee calculations to landed cost service",
      "passes": false
    },
    {
      "id": "P2-003",
      "phase": "phase-2",
      "title": "Save and compare scenarios",
      "description": "User can save cost scenarios and compare them",
      "priority": 2,
      "acceptanceCriteria": [
        "Save scenario button stores current calculation",
        "Saved scenarios shown in sidebar",
        "Compare mode shows 2-3 scenarios side by side",
        "Highlight differences between scenarios",
        "Delete saved scenarios"
      ],
      "technicalNotes": "Store scenarios in localStorage or user preferences",
      "passes": false
    },
    {
      "id": "P3-001",
      "phase": "phase-3",
      "title": "Ingest OFAC SDN list",
      "description": "Download and parse OFAC Specially Designated Nationals list",
      "priority": 1,
      "acceptanceCriteria": [
        "Service to download OFAC SDN list (XML or CSV)",
        "Parse and store in database table",
        "Track last update timestamp",
        "Manual sync button for admins",
        "Store: name, aliases, type, country, IDs"
      ],
      "technicalNotes": "OFAC provides SDN list at https://www.treasury.gov/ofac/downloads/sdn.csv",
      "passes": false
    },
    {
      "id": "P3-002",
      "phase": "phase-3",
      "title": "Ingest BIS restricted party lists",
      "description": "Download and parse BIS Entity List and Denied Persons",
      "priority": 1,
      "acceptanceCriteria": [
        "Download BIS Entity List",
        "Download BIS Denied Persons List",
        "Parse and store in same denied party table",
        "Tag each entry with source list",
        "Track last update timestamp"
      ],
      "technicalNotes": "BIS lists available at https://www.bis.doc.gov/",
      "passes": false
    },
    {
      "id": "P3-003",
      "phase": "phase-3",
      "title": "Build denied party search UI",
      "description": "User interface for searching denied party lists",
      "priority": 1,
      "acceptanceCriteria": [
        "Denied party page at /dashboard/compliance/denied-party",
        "Search input for company/person name",
        "Optional country filter",
        "Results show matches with: name, list source, country",
        "Click result to see full details",
        "Clear indication if NO matches found",
        "Show which lists were searched"
      ],
      "technicalNotes": "Create search endpoint with fuzzy matching",
      "passes": false
    },
    {
      "id": "P3-004",
      "phase": "phase-3",
      "title": "Batch denied party screening",
      "description": "Screen multiple parties at once via CSV upload",
      "priority": 2,
      "acceptanceCriteria": [
        "Upload CSV with party names",
        "Process all rows against all lists",
        "Results show: screened count, matches found",
        "Download results as Excel with match details",
        "Audit log entry created for batch screening"
      ],
      "technicalNotes": "Create batch endpoint, use background job for large files",
      "passes": false
    },
    {
      "id": "P3-005",
      "phase": "phase-3",
      "title": "Build ADD/CVD lookup",
      "description": "Look up antidumping and countervailing duty cases",
      "priority": 1,
      "acceptanceCriteria": [
        "ADD/CVD page at /dashboard/compliance/addcvd",
        "Search by HTS code",
        "Filter by country of origin",
        "Results show active cases with: product, country, duty rates",
        "Link to ITA for full case details",
        "Indicate if HTS code has potential ADD/CVD exposure"
      ],
      "technicalNotes": "Use existing ADD/CVD data in adcvdOrders.ts, enhance with API",
      "passes": false
    },
    {
      "id": "P3-006",
      "phase": "phase-3",
      "title": "Build PGA requirements lookup",
      "description": "Show Partner Government Agency requirements for HTS codes",
      "priority": 2,
      "acceptanceCriteria": [
        "PGA lookup at /dashboard/compliance/pga",
        "Enter HTS code (10-digit)",
        "Show list of PGA flags and what they mean",
        "Show which agencies have requirements (FDA, EPA, etc.)",
        "Link to agency resources",
        "Explain common PGA codes (FD2, EP5, etc.)"
      ],
      "technicalNotes": "Build PGA database from ACE PGA Appendix",
      "passes": false
    },
    {
      "id": "P3-007",
      "phase": "phase-3",
      "title": "Index CBP rulings database",
      "description": "Ingest and index CBP classification rulings for search",
      "priority": 2,
      "acceptanceCriteria": [
        "Scraper/ingester for rulings.cbp.gov",
        "Store ruling: number, date, HTS code, product, full text",
        "Index for full-text search",
        "At least 10,000 recent rulings indexed",
        "Daily/weekly update job"
      ],
      "technicalNotes": "CBP rulings available at https://rulings.cbp.gov/",
      "passes": false
    },
    {
      "id": "P3-008",
      "phase": "phase-3",
      "title": "Build CBP rulings search UI",
      "description": "User interface for searching CBP rulings",
      "priority": 2,
      "acceptanceCriteria": [
        "Rulings search at /dashboard/compliance/rulings",
        "Search by keyword in ruling text",
        "Search by HTS code",
        "Filter by date range",
        "Results show: ruling #, date, product, HTS code (snippet)",
        "Click to view full ruling text",
        "Link to original on CBP site"
      ],
      "technicalNotes": "Use PostgreSQL full-text search or add search index",
      "passes": false
    }
  ]
}

---

## Progress So Far

# Sourcify Development Progress

## Project Initialized: January 19, 2026

### Initial State Analysis

**What's Working:**
- Authentication with Better Auth (email/password + Google OAuth)
- HTS classification engine (V10) with confidence scoring
- Full HTS database imported from USITC
- Tariff calculation with Section 301, IEEPA, base MFN rates
- Basic dashboard layout with sidebar navigation
- Supplier database schema (needs data population)

**What Needs Work:**
- ~~Saved products functionality (schema exists, UI incomplete)~~ ✅ P0-001 Complete
- ~~Search history (schema exists, UI incomplete)~~ ✅ P0-003 Complete
- ~~Bulk classification (API exists, no UI)~~ ✅ P1-002 Complete
- ~~Mobile responsiveness (partial)~~ ✅ P0-005 Complete
- ~~Export functionality (partial - Excel export in bulk, needs general service)~~ ✅ P0-006 Complete
- Compliance tools (not implemented)

**Tech Stack:**
- Next.js 14 App Router
- TypeScript
- Ant Design 5
- Prisma + PostgreSQL
- Better Auth
- xAI (Grok) for AI classification
- pgvector for HTS embeddings

---

## Learnings Log

### Story P0-001 - January 19, 2026
**What I Did:** Verified saved products list page implementation. All acceptance criteria were already met by existing code.

**Implementation Details:**
- Page: `src/app/(dashboard)/dashboard/products/page.tsx` - Main page with tabs
- Table: `src/features/compliance/components/ClassificationsTable.tsx` - List component with search, pagination, actions
- Drawer: `src/features/sourcing/components/ProductDetailDrawer.tsx` - Full product details view
- API: `/api/saved-products` (GET list, POST create), `/api/saved-products/[id]` (GET detail, PATCH update, DELETE)
- Service: `src/services/savedProducts.ts` - All database operations

**Patterns Found:**
- Ant Design Table with custom columns pattern
- Debounced search input (300ms) using useRef for timer cleanup
- Dropdown menu for row actions (view, favorite, monitor, delete)
- Modal.confirm for delete confirmation
- ProductDetailDrawer accepts `onViewClassification` callback to support both internal modal and external drawer patterns

**Gotchas:**
- The page uses tab-based navigation with URL sync (`?tab=all|monitored|alerts|analysis`)
- ClassificationsTable can work with either ProductDetailDrawer (via `onViewClassification` prop) or internal Modal
- `formatHtsCode()` in `src/utils/htsFormatting.ts` formats codes for display (with dots)
- API returns `items` array and `total` count for pagination

**For Next Time:**
- Check existing implementation before building - functionality may already exist
- The Products page has 4 tabs: All Products, Monitored, Alerts, Portfolio Analysis
- Tariff enrichment is optional via `includeTariffData=true` query param

---

### Story P0-002 - January 19, 2026
**What I Did:** Added "Save to My Products" functionality to the ClassificationV10 component.

**Implementation Details:**
- Modified: `src/features/compliance/components/ClassificationV10.tsx` - Added save button, modal, and handlers
- Modified: `src/services/savedProducts.ts` - Added `sourceSearchId` parameter to `saveProductDirect`
- Modified: `src/app/api/saved-products/route.ts` - Pass `sourceSearchId` to service

**Changes Made:**
1. Added state for save modal, product name, saving status, and saved flag
2. Added `openSaveModal()` function that pre-populates product name from description
3. Added `handleSaveProduct()` function that POSTs to `/api/saved-products` with all classification data
4. Added Modal with Form for editing product name before save
5. Added "Save to My Products" button (teal gradient) that changes to "Saved ✓" (green) after success
6. Links saved product to search history via `sourceSearchId` field

**Patterns Found:**
- Use `Form.useForm()` hook to control form state externally (for pre-populating values)
- Use `message.useMessage()` for toast notifications with JSX content (includes links)
- Conditional button rendering: show save button when not saved, show disabled "Saved ✓" when saved
- The `searchHistoryId` is returned in V10 API response and used to link SavedProduct to SearchHistory

**Gotchas:**
- The V10 response already includes `searchHistoryId` - no API changes needed to get it
- SavedProduct schema has `sourceSearchId` (unique) that links to SearchHistory
- Effective duty rate needs to be parsed from string (e.g., "25.3%") to float for storage
- Need to reset `isSaved` state when user starts a new classification

**For Next Time:**
- ClassificationResult.tsx has similar save functionality but with monitoring options
- Consider consolidating save logic into a shared hook if more components need it
- The Products page (/dashboard/products) will show newly saved products

---

## Notes for Future Sessions

1. The classification engine has gone through 10 versions - V10 is current
2. Tariff data is stored in CountryTariffProfile model
3. HTS codes use pgvector for semantic search
4. User tier checking is partial - needs completion
5. Stripe integration is placeholder only

---

## Useful Commands

```bash
# Start dev server
npm run dev

# Build
npm run build

# Prisma commands
npx prisma studio      # View database
npx prisma generate    # Regenerate client
npx prisma db push     # Push schema changes

# Test HTS import
npx ts-node prisma/seed-hts.ts
```

---

### Iteration 1 - 2026-01-19 15:17
- Story: P0-002
- Duration: 214s
- Status: Completed ✅

### Iteration 2 - 2026-01-19 15:20
- Story: P1-001
- Duration: 207s
- Status: Completed ✅

---

### Story P1-001 - January 19, 2026
**What I Did:** Added AI Reasoning display section to the ClassificationV10 component. Backend already generated the reasoning; only needed UI implementation.

**Implementation Details:**
- Modified: `src/features/compliance/components/ClassificationV10.tsx` - Added collapsible AI Reasoning panel
- Modified: `src/app/api/classify-v10/route.ts` - Added searchHistoryId to response, included aiReasoning in fullResult

**Changes Made:**
1. Added ~160 lines of UI code for the AI Reasoning section after HTS Path
2. Collapsible panel using Ant Design Collapse with defaultActiveKey (expanded by default)
3. Three numbered steps showing Chapter → Heading → Code reasoning with explanations
4. Key Factors grid (2-column on desktop) with impact indicators (positive=green, uncertain=amber, neutral=slate)
5. Exclusions section for "Other" codes showing what was excluded and why
6. Confidence Assessment with colored background based on level (high/medium/low)
7. API now returns searchHistoryId after creating history record

**Patterns Found:**
- Backend already had `generateAIReasoning()` function (lines 1181-1343) in classificationEngineV10.ts
- AIReasoning interface already defined in both backend and frontend (matching structure)
- Use numbered step indicators with colored circles for visual hierarchy
- Impact-based styling: 'positive'→green, 'uncertain'→amber, 'neutral'→slate backgrounds
- Collapse component with defaultActiveKey for expanded-by-default behavior

**Gotchas:**
- The classification engine already generates aiReasoning - check backend before implementing
- Icons from lucide-react: Brain (for AI section header), CheckCircle2, HelpCircle, XCircle for impact indicators
- The API was NOT returning searchHistoryId previously - had to modify route.ts to capture and return it
- fullResult in SearchHistory now includes aiReasoning for history replay

**For Next Time:**
- Always read existing backend code first - it may already have the feature implemented
- The AIReasoning interface has: summary, chapterReasoning, headingReasoning, codeReasoning, keyFactors, exclusions, confidence
- Chapter descriptions are hardcoded in CHAPTER_DESCRIPTIONS constant (lines 37-136 of engine)
- The reasoning quality depends on detected material, product type, and keyword matches

### Iteration 3 - 2026-01-19 15:24
- Story: P1-001
- Duration: 217s
- Status: Completed ✅

---

### Story P1-002 - January 19, 2026
**What I Did:** Built complete bulk classification UI with dedicated page, CSV upload, preview, progress tracking, results table, and Excel export.

**Implementation Details:**
- Created: `src/app/(dashboard)/dashboard/classify/bulk/page.tsx` - Dedicated bulk page
- Created: `src/features/compliance/components/BulkClassificationContent.tsx` - Full bulk classification component (~740 lines)
- Modified: `src/features/compliance/components/ClassificationsPageContent.tsx` - Changed Bulk Import button to navigate to bulk page
- Modified: `src/components/layouts/DashboardLayout.tsx` - Added 'bulk' to page title mapping

**Key Features:**
1. **4-stage workflow**: idle → preview → processing → complete
2. **CSV Upload**: Drag-drop with Ant Design Dragger, accepts .csv files
3. **Template Download**: CSV template with 5 sample products and all columns
4. **Preview**: Shows first 5 rows in table before processing starts
5. **Processing**: Circular progress indicator, live success/failed counts, cancel button
6. **Results Table**: Row status, HTS code (formatted), confidence, duty rate, error column
7. **Excel Export**: Uses xlsx library with proper column widths and formatted data
8. **Abort Support**: useRef with AbortController to cancel in-flight requests

**Patterns Found:**
- Use `useRef<AbortController | null>(null)` for cancellable fetch operations
- Process rows sequentially with state updates for live feedback (better UX than batch)
- CSV parsing handles quoted values correctly (track `inQuotes` flag)
- Table with `scroll={{ x: 1200 }}` for horizontal scroll on mobile
- State machine pattern (ProcessingState type) for complex UI workflows
- `message.useMessage()` hook returns [messageApi, contextHolder] - must render contextHolder

**Gotchas:**
- Used V10 API directly (`/api/classify-v10`) instead of old bulk endpoint for better results
- The xlsx library export: `XLSX.utils.json_to_sheet()` then `XLSX.writeFile()`
- Ant Design Upload's beforeUpload receives file object, return false to prevent default upload
- AbortController.signal passed to fetch, check `signal.aborted` in loop to stop early

**For Next Time:**
- Bulk processing could be optimized with batching (currently sequential for better UX feedback)
- The old `/api/classify/bulk` endpoint uses streaming - consider keeping for background jobs
- xlsx library is already in package.json dependencies
- Consider adding batch size limit warning (500+ products = long wait)

### Iteration 4 - 2026-01-19 15:29
- Story: P1-002
- Duration: 295s
- Status: Completed ✅

---

### Story P0-003 - January 19, 2026
**What I Did:** Added re-classify capability to the search history panel. Most of the history functionality was already complete; added the missing re-run feature.

**Implementation Details:**
- Modified: `src/features/compliance/components/SearchHistoryPanel.tsx`
  - Added `ReClassifyInput` interface (exported)
  - Added `SearchHistoryPanelProps` with optional `onReClassify` callback
  - Added `handleReClassify` function that calls the callback with search inputs
  - Added "Re-classify" option to actions dropdown (RotateCcw icon)
  - Added "Re-classify" button in detail modal header
- Modified: `src/features/compliance/components/ClassificationV10LayoutB.tsx`
  - Added `ClassificationV10LayoutBProps` interface
  - Added props: `initialDescription`, `initialOrigin`, `initialMaterial`, `autoClassify`, `onClassifyComplete`
  - Added useEffect hooks to update state when initial values change
  - Added auto-classify logic with `hasAutoClassified` flag to prevent infinite loops
  - Refactored `handleClassify` to use shared `performClassification` function
- Modified: `src/features/compliance/components/ClassificationsPageContent.tsx`
  - Added `reClassifyInput` and `autoClassify` state
  - Added `handleReClassify` callback that sets state and switches to classify tab
  - Added `handleClassifyComplete` to reset auto-classify flag
  - Passed props to `ClassificationV10LayoutB` and `onReClassify` to `SearchHistoryPanel`

**Patterns Found:**
- Export interfaces from child components when parent needs them (ReClassifyInput)
- Use callback props to communicate from child to parent for cross-component actions
- Use `autoClassify` flag + `hasAutoClassified` to prevent infinite re-classification loops
- Refactor shared logic into helper functions (performClassification) for reuse
- Use setTimeout with cleanup in useEffect for delayed actions after state updates

**Gotchas:**
- SearchHistoryPanel was already mostly complete - just needed re-classify
- useEffect with auto-classify needs careful dependency management to avoid loops
- TypeScript requires explicit type annotation for spread array items in menu: `as const`
- Detail modal's handleReClassify needs to pass selectedSearch which extends SearchHistoryItem

**For Next Time:**
- The SearchHistoryPanel is feature-complete (view, delete, re-classify, bulk monitor)
- ClassificationV10LayoutB can now be controlled externally via props
- Consider adding keyboard shortcuts for re-classify (e.g., Ctrl+R)
- Could add "Re-classify with changes" option that pre-fills but doesn't auto-submit

### Iteration 5 - 2026-01-19
- Story: P0-003
- Status: Completed ✅

### Iteration 5 - 2026-01-19 15:33
- Story: P2-001
- Duration: 266s
- Status: Completed ✅

---

### Story P0-004 - January 19, 2026
**What I Did:** Created reusable loading, error, and empty state components for consistent UI across the application.

**Implementation Details:**
- Created: `src/components/shared/LoadingState.tsx` - Reusable loading spinner with message
- Created: `src/components/shared/ErrorState.tsx` - Error display with retry button
- Created: `src/components/shared/EmptyState.tsx` - Empty state with preset icons and actions
- Modified: `src/components/shared/index.ts` - Export all new components and types
- Modified: `src/features/compliance/components/ClassificationsTable.tsx` - Use new components

**Key Components:**

1. **LoadingState**
   - Props: `message`, `size` (small/default/large), `card`, `fullHeight`
   - Teal-colored spinner with custom icon (Loader2 from lucide-react)
   - `InlineSpinner` helper for simple inline use

2. **ErrorState**
   - Props: `title`, `message`, `onRetry`, `retryText`, `onBack`, `type` (error/warning/info)
   - Supports card and fullHeight modes
   - `InlineError` helper using Ant Design Alert for inline errors

3. **EmptyState**
   - Props: `title`, `description`, `icon` (preset or custom), `action`, `secondaryAction`
   - Preset icons: products, search, folder, notifications, analytics, default
   - Actions support both onClick and href (uses Next.js Link)
   - `SearchEmptyState` helper for search-specific empty states

**Patterns Found:**
- Use preset icon types (`EmptyIconType`) for common use cases (products, search, etc.)
- Support both `onClick` and `href` in action configs for flexibility
- `InlineSpinner` and `InlineError` helpers for simpler use cases
- Consistent styling: teal accent for loading, red/amber/blue for errors, slate for empty
- All components support `card` and `fullHeight` props for layout flexibility

**Gotchas:**
- Import from `@/components/shared` for cleaner imports
- The `icon` prop in EmptyState accepts either preset string or React node
- `SearchEmptyState` is a pre-configured wrapper for search results empty state
- Action buttons default to type="primary" for main action

**For Next Time:**
- Components are exported from `src/components/shared/index.ts`
- Use `LoadingState` for page/section loading, `InlineSpinner` for inline
- Use `ErrorState` for full errors, `InlineError` for form/inline errors
- Preset icons: 'products', 'search', 'folder', 'notifications', 'analytics', 'default'
- Components can be progressively adopted - not all existing pages need immediate update

### Iteration 6 - 2026-01-19
- Story: P0-004
- Status: Completed ✅

### Iteration 6 - 2026-01-19 15:37
- Story: P2-001
- Duration: 220s
- Status: Completed ✅

---

### Story P0-005 - January 19, 2026
**What I Did:** Implemented comprehensive mobile responsiveness across all major components and pages.

**Implementation Details:**
- Modified: `src/app/globals.css` - Added extensive mobile utility CSS
- Modified: `src/features/compliance/components/ClassificationV10.tsx` - Made form and results responsive
- Modified: `src/features/compliance/components/ClassificationsTable.tsx` - Added horizontal scroll, responsive search bar
- Modified: `src/features/compliance/components/SearchHistoryPanel.tsx` - Added table scroll
- Modified: `src/features/compliance/components/TariffBreakdown.tsx` - Responsive tariff rows
- Modified: `src/features/compliance/components/BulkClassificationContent.tsx` - Responsive preview and buttons

**Key Changes:**

1. **globals.css Mobile Utilities:**
   - Overflow prevention: `overflow-x: hidden; max-width: 100vw` on html/body
   - Touch-friendly inputs: `min-height: 44px`, `font-size: 16px` (prevents iOS zoom)
   - Card/modal padding adjustments at `@media (max-width: 640px)`
   - Table wrapper overflow-x: auto with `-webkit-overflow-scrolling: touch`
   - Pagination responsive (hides size changer on mobile)
   - `.mobile-scroll-x` helper class for horizontal scroll containers

2. **ClassificationV10.tsx:**
   - Form inputs: `flex-col sm:flex-row` for country/material selects
   - Duty grid: `grid-cols-1 sm:grid-cols-3` for responsive layout
   - HTS code: `text-2xl sm:text-4xl` with `break-all` for overflow
   - Decision questions: `grid-cols-1 sm:grid-cols-2`
   - Alternatives: compact padding `p-3 sm:p-4`

3. **Tables (ClassificationsTable, SearchHistoryPanel):**
   - Added `scroll={{ x: 800 }}` for horizontal scrolling
   - Added `responsive: true` to pagination
   - Search bar stacks on mobile: `flex-col sm:flex-row`

4. **TariffBreakdown:**
   - Tariff rows: `flex-col sm:flex-row` for label + value stacking
   - HTS code tags: `max-w-[120px] truncate sm:max-w-none`
   - Text sizes adjust: `text-sm sm:text-base`

**Patterns Found:**
- Use `sm:` breakpoint (640px) consistently as mobile threshold
- Use `flex-col sm:flex-row` for elements that should stack on mobile
- Use `scroll={{ x: NUMBER }}` on Ant Design tables for horizontal scroll
- Use `text-sm sm:text-base` for font sizes that should be smaller on mobile
- Set min-height: 44px on touch targets (Apple HIG recommendation)
- Font size 16px on inputs prevents iOS auto-zoom on focus

**Gotchas:**
- iOS Safari auto-zooms on input focus if font-size < 16px
- Ant Design Table needs explicit scroll.x for horizontal scrolling
- overflow-x on parent containers can clip fixed/sticky positioned children
- The responsive: true pagination option was added in newer Ant Design versions
- Use `break-all` not `break-words` for long alphanumeric strings (HTS codes)

**For Next Time:**
- Mobile CSS utilities are in globals.css, ~120 lines of mobile-specific rules
- Standard breakpoint: 640px (sm:) for mobile → desktop transition
- Test with Chrome DevTools: iPhone SE (375px), iPhone 12 Pro (390px), iPad (768px)
- Touch targets: 44x44px minimum for buttons and interactive elements
- Consider adding safe-area-inset for notched devices if needed

### Iteration 7 - 2026-01-19
- Story: P0-005
- Status: Completed ✅

### Iteration 7 - 2026-01-19 15:42
- Story: P2-001
- Duration: 317s
- Status: Completed ✅

---

### Story P0-006 - January 19, 2026
**What I Did:** Created a comprehensive reusable export service for Excel and CSV downloads.

**Implementation Details:**
- Created: `src/services/exportService.ts` - Full export service (~350 lines)
- Modified: `src/features/compliance/components/BulkClassificationContent.tsx` - Updated to use the new export service

**Key Features:**

1. **Excel Export Functions:**
   - `exportToExcel(data, columns, options)` - Full control with column configuration
   - `exportToExcelSimple(data, options)` - Auto-detect columns from data keys
   - Column config supports: key, header, width, transform function

2. **CSV Export Functions:**
   - `exportToCSV(data, options)` - Simple CSV with auto-detected headers
   - `exportToCSVWithColumns(data, columns, options)` - CSV with column transforms
   - Proper CSV escaping for quotes, commas, newlines

3. **Presets (ExportPresets):**
   - `classificationResults` - For bulk classification exports
   - `savedProducts` - For saved products list
   - `searchHistory` - For classification history
   - `landedCost` - For landed cost scenarios

4. **QuickExport Helper:**
   - One-liner exports: `QuickExport.classificationResults(data)`
   - Pre-configured with presets and default filenames

5. **Options:**
   - `filename` - Base filename (default: 'export')
   - `includeTimestamp` - Add date to filename (default: true)
   - `sheetName` - Excel sheet name (default: 'Sheet1')
   - `delimiter` - CSV delimiter (default: ',')

**Patterns Found:**
- Use `XLSX.utils.json_to_sheet()` for converting array to worksheet
- Use `worksheet['!cols']` array for column widths in characters
- Trigger download: create Blob → createObjectURL → create/click link → revokeObjectURL
- CSV escaping: wrap in quotes if value contains comma/quote/newline, double-escape quotes
- Transform functions allow formatting during export (e.g., percentages, dates)

**Gotchas:**
- `XLSX.writeFile()` handles Excel download automatically (no manual blob needed)
- For CSV, must handle BOM for Excel compatibility with special characters
- Transform functions receive (value, row) to allow cross-field calculations
- Column width in XLSX is in "characters" not pixels (`wch` property)

**For Next Time:**
- Import from `@/services/exportService` for all export needs
- Use `ExportPresets.classificationResults` etc. for standard data types
- Use `QuickExport.savedProducts(data)` for one-liner exports
- Transform functions are useful for: date formatting, percentage display, boolean→Yes/No
- The service is client-side only (uses document for download trigger)

### Iteration 8 - 2026-01-19
- Story: P0-006
- Status: Completed ✅

### Iteration 8 - 2026-01-19 15:46
- Story: P2-001
- Duration: 194s
- Status: Completed ✅

---

### Story P1-003 - January 19, 2026
**What I Did:** Created PDF export service and added "Export PDF Report" button to classification results.

**Implementation Details:**
- Created: `src/services/pdfExportService.ts` - PDF generation service using @react-pdf/renderer (~400 lines)
- Modified: `src/features/compliance/components/ClassificationV10.tsx` - Added export button, handler, and state
- Modified: `package.json` - Added @react-pdf/renderer dependency

**Key Features:**

1. **PDF Structure (Page 1 - Classification Report):**
   - Sourcify branding header with teal accent
   - Product information section (description, country, material)
   - HTS code display with confidence badge
   - Full HTS classification path (Chapter → Heading → Subheading → Tariff → Statistical)
   - Duty breakdown grid (Base MFN, Additional, Effective rate)
   - Legal disclaimer

2. **PDF Structure (Page 2 - AI Reasoning, if available):**
   - Classification summary
   - Step-by-step reasoning (Chapter → Heading → Code)
   - Key classification factors with impact indicators
   - Confidence assessment

3. **Styling:**
   - Professional appearance with styled components
   - Color-coded confidence badges (green/amber/orange)
   - Structured layout with section headers
   - Footer with page numbers

4. **Export Features:**
   - `exportClassificationPDF(data)` - Generate and download PDF
   - `generateClassificationPDFBlob(data)` - Get blob for preview/attachment
   - Sensible filename: `sourcify-classification-{hts}-{product}-{date}.pdf`

**Patterns Found:**
- Use `createElement` pattern instead of JSX for @react-pdf/renderer (better SSR/bundling compatibility)
- StyleSheet.create() for defining reusable styles
- `pdf(doc).toBlob()` for generating PDF blob
- Conditional page rendering for optional sections (AI reasoning)
- Download trigger: createObjectURL → click link → revokeObjectURL

**Gotchas:**
- @react-pdf/renderer requires React 18+ compatibility
- Use 'Helvetica' and 'Helvetica-Bold' for built-in fonts (no custom font loading)
- Page 2 only renders if aiReasoning exists
- The `fixed` prop on View for footer keeps it at bottom of each page
- Must use `render` prop function for dynamic content like page numbers

**For Next Time:**
- Import from `@/services/pdfExportService`
- ClassificationPDFData interface defines required data structure
- PDF service is client-side only (uses document for download)
- Consider adding watermark for unofficial reports
- Could extend to batch PDF export for multiple classifications

### Iteration 9 - 2026-01-19
- Story: P1-003
- Status: Completed ✅

### Iteration 9 - 2026-01-19 15:50
- Story: P2-001
- Duration: 266s
- Status: Completed ✅

---

### Story P1-004 - January 19, 2026
**What I Did:** Added duty rate comparison for alternative classifications with visual indicators, sorting controls, and detailed breakdown modals.

**Implementation Details:**
- Modified: `src/services/classificationEngineV10.ts`
  - Updated Alternative interface to include `effectiveNumeric` and `breakdown` fields
  - Added parallel duty fetching for top 5 alternatives using Promise.all
  - Duty breakdown includes IEEPA (baseline/fentanyl/reciprocal), Section 301, Section 232
- Modified: `src/features/compliance/components/ClassificationV10.tsx`
  - Added `alternativeSortBy`, `selectedAlternative`, `dutyModalOpen` state
  - Added sort controls (by confidence or by duty rate)
  - Added "Lower Duty" badge when alternative has lower rate than primary
  - Added clickable duty buttons that open detailed breakdown modal
  - Green highlighting for alternatives with lower duty rates

**Key Features:**

1. **Duty Rate Fetching (Backend):**
   - Parallel fetching for top 5 alternatives using Promise.all
   - Inherits generalRate from parent code if not on leaf node
   - Includes full breakdown (IEEPA, Section 301, Section 232)
   - effectiveNumeric field enables sorting

2. **Sort Controls (UI):**
   - Button.Group with confidence vs duty rate options
   - Sorting by duty shows lowest rate first
   - Icons: BarChart3 for confidence, DollarSign for duty
   - Responsive (icon-only on mobile, with labels on desktop)

3. **Lower Duty Indicator:**
   - Green "Lower Duty" badge with ArrowDownCircle icon
   - Tooltip shows exact savings percentage
   - Card highlighted with green background/border
   - Helps users find cost-saving alternatives quickly

4. **Duty Breakdown Modal:**
   - Opens on clicking duty rate button
   - Shows: HTS code, description, base MFN rate
   - Lists all additional duties with program names
   - Total effective rate with amber styling
   - Comparison vs primary (green for savings, red for additional)
   - Copy HTS code button in footer

**Patterns Found:**
- Use IIFE with return to handle complex inline rendering: `{(() => { ... })()}`
- Sort alternatives with spread to avoid mutating original: `[...arr].sort()`
- Use effectiveNumeric ?? 999 for sorting so N/A goes to end
- Button.Group for toggle-style radio selection
- Parallel Promise.all for fetching multiple duty rates efficiently

**Gotchas:**
- Must spread result.alternatives before sorting to avoid mutation
- parseFloat on effective rate string (e.g., "25.3%") needs .replace('%', '')
- alternativeDuties Map uses code as key, populated by parallel fetches
- Duty breakdown only populated for top 5 alternatives (performance)
- Green styling only when altRate < primaryRate (strictly less than)

**For Next Time:**
- Alternative interface now has: effectiveNumeric, breakdown (for sorting/display)
- Duty comparison works automatically when both primary and alternative have duty
- Consider adding "Apply Alternative" button to switch primary classification
- Could extend to country comparison (P1-005) using similar pattern
- The sorting preserves rank numbers (#{idx + 2}) which may confuse users

### Iteration 10 - 2026-01-19
- Story: P1-004
- Status: Completed ✅

### Iteration 10 - 2026-01-19 15:55
- Story: P2-001
- Duration: 286s
- Status: Completed ✅

### Iteration 11 - 2026-01-19 16:01
- Story: P2-001
- Duration: 351s
- Status: In Progress

---

### Story P1-005 - January 19, 2026
**What I Did:** Added country comparison modal to ClassificationV10.tsx for comparing duty rates across different sourcing countries.

**Implementation Details:**
- Modified: `src/features/compliance/components/ClassificationV10.tsx` - Added country comparison modal (~250 lines)
- Used existing: `src/app/api/duty-comparison/route.ts` - API endpoint already existed with full functionality

**Key Features:**

1. **Compare Countries Button:**
   - Purple-themed button in action buttons section after classification
   - Opens modal and triggers comparison fetch

2. **Country Selection:**
   - Default countries: CN, VN, IN, MX, TH (top 5 sourcing countries)
   - 18 countries available from COMPARISON_COUNTRIES array in API
   - Add countries via Select dropdown
   - Remove countries via Tag's closable X button
   - Update Comparison button re-fetches with new country list

3. **Comparison Display:**
   - Countries sorted by effective rate (lowest first)
   - Best option highlighted with green background + Award badge
   - Current selection (user's origin) marked with purple tag
   - Each country card shows: flag, name, effective rate, FTA status

4. **Duty Breakdown Tags:**
   - Base MFN (cyan)
   - FTA discount (green, negative)
   - IEEPA (orange)
   - Section 301 (red)
   - Section 232 (magenta)

5. **Savings Comparison:**
   - Green highlight when country has lower duty than current
   - Red highlight when higher
   - Shows exact percentage difference

**Patterns Found:**
- API endpoint at `/api/duty-comparison` handles all calculation via tariffRegistry service
- GET returns available countries, POST compares specific countries
- Modal can manage its own state for country selection without affecting main component
- Spread and sort pattern: `[...countryComparisons].sort((a, b) => a.effectiveRate - b.effectiveRate)`
- Use conditional styling with ternary chains for multiple states (best/current/default)

**Gotchas:**
- The `handleCompareCountries` function is called on button click, NOT on modal open
- Need to call `fetchAvailableCountries()` first time to populate dropdown
- `handleRefreshComparison` re-uses `handleCompareCountries` but checks if modal is open
- CountryDutyComparison interface was already defined in ClassificationV10.tsx (lines 154-173)
- The API calculates `savingsVsCurrent` based on `currentCountry` and `currentRate` params

**For Next Time:**
- The duty-comparison API supports any country with a CountryTariffProfile in the database
- COMPARISON_COUNTRIES constant in the API file lists all supported countries
- Consider adding "Use This Country" button to switch the origin in the classification form
- Country comparison works best when base MFN rate is known (passed from classification result)
- Modal width of 800px works well for desktop; cards stack on mobile

### Iteration 12 - 2026-01-19
- Story: P1-005
- Status: Completed ✅

### Iteration 12 - 2026-01-19 16:07
- Story: P2-001
- Duration: 356s
- Status: Completed ✅

---

## Guardrails (Read First!)

# Ralph Guardrails (Signs)

> Lessons learned from past failures. **READ THESE BEFORE ACTING.**

## Core Signs

### Sign: Read Before Writing
- **Trigger**: Before modifying any file
- **Instruction**: Always read the existing file first to understand current implementation
- **Added after**: Core principle

### Sign: Test After Changes
- **Trigger**: After any code change
- **Instruction**: Run `npm run build` to verify nothing broke
- **Added after**: Core principle

### Sign: Commit Checkpoints
- **Trigger**: Before risky changes
- **Instruction**: Commit current working state first
- **Added after**: Core principle

### Sign: One Story At A Time
- **Trigger**: Starting work
- **Instruction**: Complete ONE story fully before moving to the next. Don't half-implement multiple things.
- **Added after**: Core principle

---

## Project-Specific Signs (Sourcify)

### Sign: HTS Code Formatting
- **Trigger**: Displaying HTS codes to users
- **Instruction**: Always use `formatHtsCode()` from `src/utils/htsFormatting.ts`. Codes are stored WITHOUT dots but displayed WITH dots.
- **Added after**: Initial setup - HTS display inconsistency

### Sign: Use V10 Classification Engine
- **Trigger**: Working with classification
- **Instruction**: There are multiple versions (V4-V10). ALWAYS use V10: `classificationEngineV10.ts`, `/api/classify-v10`, `ClassificationV10.tsx`
- **Added after**: Initial setup - Multiple engine versions exist

### Sign: Country Codes Are ISO Alpha-2
- **Trigger**: Working with country data
- **Instruction**: Use 2-letter codes (CN, VN, MX) not names. CountryTariffProfile model has full data.
- **Added after**: Initial setup - Country code format

### Sign: Prisma Client Location
- **Trigger**: Accessing database
- **Instruction**: Import from `src/lib/db.ts` NOT directly from @prisma/client
- **Added after**: Initial setup - Prisma singleton pattern

### Sign: Auth Session Access
- **Trigger**: Getting current user
- **Instruction**: Use `useSession()` from `src/lib/auth-client.ts` in client components
- **Added after**: Initial setup - Better Auth pattern

### Sign: Large Files Fill Context
- **Trigger**: Reading codebase files
- **Instruction**: Don't read files > 500 lines unless necessary. Read only the sections you need.
- **Added after**: Iteration loops - Context filled before implementing

---

## Learned Signs

(New signs will be added here as failures occur)

---

## Your Task This Iteration

**Story:** P2-001 - Build landed cost calculator page

**Instructions:**
1. Read the story's acceptance criteria from prd.json above
2. Implement the required changes (modify files, create components, etc.)
3. Run: npm run build
4. If build passes, update prd.json to set passes: true for story P2-001
5. Append learnings to progress.txt with format:
   ### Story P2-001 - 2026-01-19
   **What I Did:** [summary]
   **Patterns Found:** [patterns]
   **Gotchas:** [gotchas]
   **For Next Time:** [advice]
6. Commit: git add -A && git commit -m "feat(P2-001): [description]"

**CRITICAL:** You MUST update progress.txt with learnings and set passes: true in prd.json when done!

When ALL stories have passes: true, output: COMPLETE
