# Sourcify Development Progress

> **Last Updated:** January 22, 2026  
> **Source of Truth:** [`prd-trade-intelligence.md`](./prd-trade-intelligence.md)  
> **Task Tracking:** [`prd.json`](./prd.json)

---

## Current Status

### ✅ Complete

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Enhance Core (Public Data) | ✅ 100% |
| Phase 2 | Compliance Tools | ✅ 90% (CBP rulings deferred) |

### 🟡 In Progress

| Task | Description | Status |
|------|-------------|--------|
| Monetization | Stripe, usage limits, feature gating | 🔲 Not started |

### 🔲 Future

| Phase | Description | Blocker |
|-------|-------------|---------|
| Phase 3 | BOL Data / Trade Intelligence | $10K-50K/yr license |
| Phase 4 | Company Intelligence | $20K-80K/yr license |

---

## What's Built

### Core Platform
- AI Classification Engine (V10) - 27,061 HTS codes with embeddings
- Country Tariff Registry - 199 countries, 7 data sources
- Landed Cost Calculator - Full breakdown with MPF, HMF

### Phase 1: Enhance Core ✅
- Trade Statistics Dashboard (USITC DataWeb)
- FTA Rules Engine (14 FTAs, 30+ rules)
- FTA Qualification Calculator (BOM, RVC, tariff shift)
- Historical HTS Archives (2020-2025)
- PGA Requirements Lookup (13 agencies)
- Section 301/IEEPA Tariff Tracker

### Phase 2: Compliance Tools ✅
- Denied Party Screening (OFAC, BIS)
- Batch Screening (CSV upload)
- ADD/CVD Lookup (20+ categories)
- Compliance Alerts System

### Additional
- Bulk Classification (CSV upload)
- PDF/Excel/CSV Export
- Country Comparison
- Alternative Classifications with Duty Comparison

---

## What's Next

**Priority: Monetization**

1. Stripe Integration
2. Usage Limits (5/day free tier)
3. Feature Gating
4. Upsell Teasers

See [`prd.json`](./prd.json) for detailed task tracking.

---

## Deferred

| Feature | Reason |
|---------|--------|
| CBP Rulings Search | Complex web scraping required |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14+ (App Router) |
| Database | PostgreSQL (Neon) + pgvector |
| Auth | Better Auth |
| AI | xAI (Grok) |
| UI | Ant Design 5 |

---

## Data Sources (Active)

| Source | Data | Status |
|--------|------|--------|
| USITC HTS | 30K+ codes with embeddings | ✅ Active |
| USITC DataWeb | Trade statistics | ✅ Active |
| Federal Register | Policy changes | ✅ Active |
| OFAC | SDN list | ✅ Active |
| BIS | Entity List, Denied Persons | ✅ Active |
| USTR | FTA list | ✅ Active |

---

*For detailed feature specs and implementation status, see [`prd-trade-intelligence.md`](./prd-trade-intelligence.md)*
