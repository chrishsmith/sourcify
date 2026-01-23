# Sourcify Product Roadmap

> **Last Updated:** January 22, 2026  
> **Source of Truth:** [`prd-trade-intelligence.md`](./prd-trade-intelligence.md)  
> **Task Tracking:** [`prd.json`](./prd.json)

---

## Vision

**Sourcify** is the affordable, AI-powered alternative to enterprise trade intelligence platforms (Datamyne, CustomsInfo).

We help SMB importers:
1. **Classify** products with AI reasoning (free hook)
2. **Optimize** duties and sourcing (paid value)
3. **Stay compliant** with screening and alerts (paid value)

---

## Competitive Position

| | Datamyne/CustomsInfo | Sourcify |
|---|---------------------|----------|
| **Target** | Enterprise ($10K+/yr) | SMB ($99-299/mo) |
| **AI** | Basic/none | Core differentiator |
| **UX** | 2010s enterprise | Modern 2026 |
| **Value** | "Here's the data" | "Here's what to DO" |

---

## Current Status

### ✅ Phase 1-2: Complete (Public Data Features)

| Feature | Status |
|---------|--------|
| AI Classification (V10) | ✅ Done |
| Tariff Registry (199 countries) | ✅ Done |
| Landed Cost Calculator | ✅ Done |
| Trade Statistics Dashboard | ✅ Done |
| FTA Rules Engine | ✅ Done |
| FTA Qualification Calculator | ✅ Done |
| Historical HTS Archives | ✅ Done |
| PGA Requirements | ✅ Done |
| Denied Party Screening | ✅ Done |
| ADD/CVD Lookup | ✅ Done |
| Tariff Tracker | ✅ Done |
| Compliance Alerts | ✅ Done |
| Bulk Classification | ✅ Done |
| PDF/Excel Export | ✅ Done |

### 🟡 Monetization: In Progress

| Task | Status |
|------|--------|
| Stripe Integration | 🔲 Not Started |
| Usage Limits (5/day free) | 🔲 Not Started |
| Feature Gating | 🔲 Not Started |
| Upsell Teasers | 🔲 Not Started |

### ⏸️ Deferred

| Feature | Reason |
|---------|--------|
| CBP Rulings Search | Complex web scraping |

### 🔲 Future (Requires Investment)

| Phase | Features | Data Cost |
|-------|----------|-----------|
| Phase 3 | BOL Data, Supplier Discovery | $10K-50K/yr |
| Phase 4 | Company Profiles, Contacts | $20K-80K/yr |

---

## Pricing Tiers

| Tier | Price | Key Features |
|------|-------|--------------|
| **Free** | $0 | 5 classifications/day, basic features |
| **Pro** | $99/mo | Unlimited classifications, sourcing, FTA calc, compliance |
| **Business** | $299/mo | Bulk upload, API, team features |
| **Enterprise** | Custom | BOL data, company intel, white-label |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| UI | Ant Design 5 |
| Database | PostgreSQL (Neon) + pgvector |
| Auth | Better Auth |
| AI | xAI (Grok) |

---

## Key Documents

| Document | Purpose |
|----------|---------|
| [`prd-trade-intelligence.md`](./prd-trade-intelligence.md) | **Source of Truth** - Vision, features, status |
| [`prd.json`](./prd.json) | Task tracking (what's done, what's next) |
| [`architecture.md`](./architecture.md) | Technical architecture |
| [`competitive-analysis-datamyne.md`](./competitive-analysis-datamyne.md) | Competitor research |

---

## Revenue Milestones

| Milestone | Target |
|-----------|--------|
| First paying user | TBD |
| $1,000 MRR | TBD |
| $5,000 MRR | TBD |

---

*For detailed feature specs and implementation status, see [`prd-trade-intelligence.md`](./prd-trade-intelligence.md)*
