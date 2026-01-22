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
      "passes": true,
      "notes": "Created comprehensive landed cost calculator. Page: /dashboard/duties/calculator. Component: src/features/compliance/components/LandedCostCalculator.tsx (~530 lines). API: /api/landed-cost (POST). Features: Form with HTS code, country (18 options), product value, quantity, shipping/insurance costs. Results show duties breakdown (base MFN + additional), fees breakdown (MPF + HMF), and total landed cost with per-unit when qty>1. Uses existing tariffRegistry service. Added menu item to DashboardLayout."
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
      "passes": true,
      "notes": "Implemented alongside P2-001. MPF: 0.3464% with $31.67 min and $614.35 max. HMF: 0.125% for ocean only. API handles calculations in /api/landed-cost. UI shows MPF and HMF as separate line items in Customs Fees section with info tooltips explaining each fee. Ocean/Air toggle using Switch component with Anchor/Plane icons - disables HMF for air shipments."
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
      "passes": true,
      "notes": "Added save/compare functionality to LandedCostCalculator.tsx (~550 lines of new code). Features: 1) useLocalStorage hook for SSR-safe persistence with key 'sourcify_landed_cost_scenarios', 2) SavedScenario interface with id/name/savedAt/result, 3) Save Scenario button (purple gradient) opens modal with name input and summary preview, 4) Saved scenarios sidebar (3rd column on xl screens) with scrollable list, 5) Compare mode with scenario selection (2-3 scenarios), 6) Side-by-side comparison grid with base scenario highlighted in teal, 7) getDifferenceIndicator shows red/green arrows with percentage/absolute differences, 8) Insights panel shows lowest cost scenario and potential savings, 9) Load scenario feature auto-fills form, 10) Delete with Popconfirm confirmation. UI uses responsive xl:grid-cols-3 layout."
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
      "passes": true,
      "notes": "Created comprehensive OFAC SDN ingestion system. Database: Added DeniedParty model (name, aliases, entityType, countryCode, countryName, addresses, identifiers JSON, sourceList, sourceId, sourcePrograms, remarks, isActive, listedDate) and DeniedPartySyncLog model for tracking sync history. Service: src/services/ofacService.ts downloads 3 CSV files in parallel (sdn.csv, alt.csv, add.csv), parses and merges data, handles upsert with deduplication, marks removed entries as inactive. API: POST /api/denied-party/sync triggers sync, GET /api/denied-party/sync returns status and history, GET /api/denied-party lists/searches parties. Parses identifiers (DOB, Passport, IDs) from OFAC remarks field."
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
      "passes": true,
      "notes": "Created bisService.ts at src/services/bisService.ts. Uses Trade.gov Consolidated Screening List API (includes both BIS lists). Functions: syncBISEntityList(), syncBISDeniedPersons(), syncAllBISLists(). Uses same DeniedParty model with sourceList enum (bis_entity_list, bis_denied). Updated /api/denied-party/sync to accept list param: POST ?list=bis_entity_list or ?list=all. GET returns status for all lists. Each sync creates DeniedPartySyncLog entry. Data source: https://api.trade.gov/static/consolidated_screening_list/consolidated.json"
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
      "passes": true,
      "notes": "Created denied party search page at /dashboard/compliance/denied-party. Component: DeniedPartySearch.tsx (~800 lines). Features: 1) Search input for name/company/alias with debounce, 2) Filters for source list (OFAC/BIS), country (17 common sanctioned countries), entity type (individual/entity/vessel/aircraft), 3) Results table with name, aliases count, source list tag, country, programs, and Details button, 4) Detail modal showing full party info (name, aliases, addresses, identifiers, programs, remarks, federal register), 5) Green checkmark 'No Matches Found' state when search returns empty, 6) Lists searched shown in meta info from API, 7) Warning alerts for matches. Added Shield icon navigation item 'Screening' to DashboardLayout.tsx. Uses existing /api/denied-party endpoint which already supports search, pagination, and filtering."
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
      "passes": true,
      "notes": "Added batch screening feature to DeniedPartySearch.tsx via Tabs component. Tab 1: Single Search (existing). Tab 2: Batch Screening with 4-stage workflow (idle→preview→processing→complete). Features: 1) CSV upload with drag-drop and template download, 2) Preview of first 5 rows before processing, 3) Circular progress during screening, 4) Results table showing status (MATCH/POTENTIAL/CLEAR), match count, top match, 5) Excel export via exportService with comprehensive columns, 6) Batch result detail modal, 7) Summary cards (total/matches/potential/clear). API: POST /api/denied-party/batch - screens parties against all lists, returns results with match scores (exact/alias/partial), creates audit log entry via UsageLog model with batch_screening feature. Added batch_screening to UsageFeature enum in Prisma schema."
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
      "passes": true,
      "notes": "Created ADD/CVD lookup page at /dashboard/compliance/addcvd. Component: ADCVDLookup.tsx (~680 lines). API: /api/adcvd GET endpoint with htsCode, countryCode, and search params. Enhanced adcvdOrders.ts with: ADCVDOrderInfo export (added dutyRange, caseNumbers, notes fields), getAllADCVDOrders(), getADCVDOrdersByCountry(), getADCVDOrdersByHTS(), getTopADCVDCountries(), getHighestRiskCategories(). Features: 1) HTS code search with risk level assessment (high/medium/low/none), 2) Country filter (16 countries with active orders), 3) Product search, 4) Results table with HTS prefix, product category, affected countries (flags), estimated duty range, order count, 5) Detail modal with case numbers, notes, duty ranges, 6) External resource links (CBP AD/CVD Search, ITC Orders Excel, ITA Searchable Database), 7) Risk alert banner showing exposure level. Navigation: AlertTriangle icon 'ADD/CVD' in sidebar."
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
      "passes": true,
      "notes": "Complete implementation. Page: /dashboard/compliance/pga. Component: src/features/compliance/components/PGALookup.tsx (900+ lines). API: src/app/api/pga/route.ts. Data: src/data/pgaFlags.ts (13 agencies, 30+ flags, chapter mappings). Features: HTS code lookup with chapter-level requirements, flag reference table with search/filter by agency, flag detail modal with requirements and common products, agency cards with websites, external resource links (ACE PGA Appendix, PGA Message Sets, CBP Portal). Fixed API response structure mismatch (data returned at root level, not under 'requirements' key)."
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

## Progress So Far (Last 100 lines)

### Iteration 19 - 2026-01-19 16:40
- Story: P3-004
- Duration: 385s
- Status: Completed ✅

### Iteration 1 - 2026-01-19 16:48
- Story: P3-006
- Duration: 323s
- Status: In Progress

### Iteration 20 - 2026-01-19 16:48
- Story: P3-006
- Duration: 475s
- Status: In Progress

### Iteration 2 - 2026-01-19 16:51
- Story: P3-006
- Duration: 145s
- Status: In Progress

### Iteration 3 - 2026-01-19 16:51
- Story: P3-006
- Duration: 34s
- Status: In Progress

### Iteration 4 - 2026-01-19 16:54
- Story: P3-006
- Duration: 132s
- Status: In Progress

### Iteration 5 - 2026-01-19 16:55
- Story: P3-006
- Duration: 109s
- Status: In Progress

### Iteration 6 - 2026-01-19 16:57
- Story: P3-006
- Duration: 115s
- Status: In Progress

### Iteration 7 - 2026-01-19 17:01
- Story: P3-006
- Duration: 187s
- Status: In Progress

### Iteration 8 - 2026-01-19 17:03
- Story: P3-006
- Duration: 173s
- Status: In Progress

### Iteration 9 - 2026-01-19 17:08
- Story: P3-006
- Duration: 260s
- Status: In Progress

### Iteration 10 - 2026-01-19 17:09
- Story: P3-006
- Duration: 50s
- Status: In Progress

### Story P3-006 - 2026-01-19 17:15
**What I Did:** Completed PGA (Partner Government Agency) requirements lookup feature. The implementation was mostly complete from previous iterations but had a critical bug - the frontend expected API data under `data.requirements` but the API returned it directly at `data` root level. Fixed the data structure alignment in PGALookup.tsx component.

**Implementation Summary:**
- Page: `/dashboard/compliance/pga` with PGALookup component
- API: `/api/pga/route.ts` - handles HTS lookup, agency filter, search, flag details
- Data: `src/data/pgaFlags.ts` - 13 PGA agencies, 30+ flag codes, HTS chapter mappings
- Features: HTS code input, flag reference table with search/filter, flag detail modals, agency cards with websites, external resource links (ACE PGA Appendix, PGA Message Sets, CBP Portal)

**Patterns Found:**
- Static data files in `src/data/` for reference data (like PGA flags, ADD/CVD orders)
- Chapter-level HTS mapping pattern: map 2-digit chapter to list of agencies/flags
- Agency icons/colors mapping pattern: AGENCY_ICONS and AGENCY_COLORS records for consistent UI
- API returns flat data structure with type guards (requirementLevel, hasRequirements flags)

**Gotchas:**
- API and frontend data structure mismatch: Frontend used `data.requirements?.X` but API returned `data.X` directly. Always verify API response shape matches frontend interface.
- PGA requirements are chapter-level in this implementation, not 10-digit HTS specific. This is a simplification - real ACE PGA appendix has more granular mappings.
- Agency codes in data may differ from display codes (USDA_APHIS vs USDA/APHIS) - need consistent mapping

**For Next Time:**
- Data file: `src/data/pgaFlags.ts` has PGA_AGENCIES, PGA_FLAGS, HTS_CHAPTER_PGA_MAP, helper functions
- Component pattern: APIResponse interface should match actual API response shape
- External resources: ACE PGA Appendix at cbp.gov/trade/ace/catair/appendix-pga
- When frontend shows "unknown chapter" or missing data, check if API response structure matches interface

### Iteration 1 - 2026-01-19 18:39
- Story: P3-006
- Duration: 211s
- Status: Completed ✅

### Iteration 2 - 2026-01-19 18:42
- Story: P3-007
- Duration: 216s
- Status: In Progress

### Iteration 3 - 2026-01-19 18:44
- Story: P3-007
- Duration: 107s
- Status: In Progress

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

**Story:** P3-007 - Index CBP rulings database

**Instructions:**
1. Read the story's acceptance criteria from prd.json above
2. Implement the required changes (modify files, create components, etc.)
3. Run: npm run build
4. If build passes, update prd.json to set passes: true for story P3-007
5. Append learnings to progress.txt with format:
   ### Story P3-007 - 2026-01-19
   **What I Did:** [summary]
   **Patterns Found:** [patterns]
   **Gotchas:** [gotchas]
   **For Next Time:** [advice]
6. Commit: git add -A && git commit -m "feat(P3-007): [description]"

**CRITICAL:** You MUST update progress.txt with learnings and set passes: true in prd.json when done!

When ALL stories have passes: true, output: COMPLETE
