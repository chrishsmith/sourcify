# Sourcify Master Feature Specification

> **Last Updated:** January 22, 2026  
> **Source of Truth:** [`prd-trade-intelligence.md`](./prd-trade-intelligence.md)  
> **Status Tracking:** [`prd.json`](./prd.json)

**Note:** This document provides a feature inventory. For current implementation status, see the source of truth documents above.

---

## Executive Summary

### Vision
Build the world's best trade intelligence platform combining:
- AI-powered HTS classification (unique advantage)
- Comprehensive duty calculation
- Trade intelligence (compete with Datamyne)
- Compliance tools (compete with CustomsInfo)
- Modern UX, accessible pricing

### Target Users

| Persona | Primary Needs | Tier |
|---------|---------------|------|
| SMB Importer | Classify, understand duties, find suppliers | Free → Pro |
| Customs Broker | Bulk classification, compliance, audit trails | Pro → Business |
| Compliance Manager | Denied party, ADD/CVD, rulings | Business |
| Supply Chain Analyst | Trade stats, supplier discovery, optimization | Pro → Business |

---

## Module Overview

### Core Modules (Built ✅)

| Module | Features | Status |
|--------|----------|--------|
| **Classification** | AI classification, bulk upload, alternatives, PDF export | ✅ Complete |
| **Duty Calculation** | Base MFN, Section 301, IEEPA, AD/CVD warnings, landed cost | ✅ Complete |
| **Compliance** | Denied party screening, ADD/CVD lookup, PGA requirements | ✅ Complete |
| **FTA Tools** | Rules engine, qualification calculator | ✅ Complete |
| **Trade Intelligence** | Statistics dashboard, tariff tracker, alerts | ✅ Complete |

### Future Modules (Requires Licensed Data)

| Module | Features | Status |
|--------|----------|--------|
| **BOL Search** | Shipment data, supplier discovery | 🔲 Phase 3 |
| **Company Intel** | Profiles, contacts, hierarchy | 🔲 Phase 4 |

---

## Feature Details by Module

### Module 1: HTS Classification

**Core Features:**
- Product description input with material/use detection
- AI-powered classification with confidence scoring
- Full HTS hierarchy path display (Chapter → Heading → Subheading → Tariff)
- Alternative classifications with duty comparison
- Conditional classification (value/size thresholds)
- AI reasoning/justification
- Bulk classification (CSV upload)
- Classification PDF export

**Status:** ✅ Complete (V10 semantic search engine)

---

### Module 2: Duty Calculation

**Core Features:**
- HTS code + country → full duty breakdown
- Base MFN rate from HTS database
- Section 301 tariffs (China Lists 1-4)
- IEEPA tariffs (baseline, fentanyl, reciprocal)
- Section 232 (steel/aluminum)
- AD/CVD warnings
- FTA preferential rates
- Landed cost calculator (MPF, HMF, customs fees)
- Save/compare scenarios

**Status:** ✅ Complete (Tariff Registry + Landed Cost Calculator)

---

### Module 3: Compliance Tools

**Core Features:**
- Denied party screening (OFAC SDN, BIS Entity List, BIS Denied Persons)
- Batch screening with CSV upload
- ADD/CVD case lookup by HTS/country
- PGA requirements lookup (FDA, EPA, etc.)
- Section 301/IEEPA tariff tracker
- Compliance alerts system

**Deferred:**
- CBP rulings search (complex scraping)

**Status:** ✅ Mostly Complete (CBP rulings deferred)

---

### Module 4: FTA Tools

**Core Features:**
- FTA rules engine (14 FTAs, 30+ rules)
- Rules lookup by HTS code
- FTA qualification calculator
- Bill of Materials input
- RVC calculation (4 methods)
- Tariff shift analysis
- Duty savings display

**Status:** ✅ Complete

---

### Module 5: Trade Intelligence

**Core Features:**
- Trade statistics dashboard (USITC DataWeb)
- Top import sources by HTS
- Trade trends over time
- Country comparison
- Historical HTS archives (code changes 2020-2025)

**Status:** ✅ Complete

---

### Module 6: Products & Monitoring

**Core Features:**
- Saved products list
- Product detail view
- Tariff alert subscriptions
- Alert history
- Notification preferences

**Status:** ✅ Complete

---

### Module 7: Export & Reporting

**Core Features:**
- Excel export (.xlsx)
- CSV export
- PDF classification reports

**Status:** ✅ Complete

---

## Navigation Structure

```
📊 Dashboard
🏷️ Classify
   ├─ New Classification
   ├─ Bulk Upload
   └─ History
💰 Duties
   ├─ Calculator
   └─ Landed Cost
🌍 Sourcing
   ├─ Country Comparison
   └─ Supplier Explorer
✅ Compliance
   ├─ Denied Party Screening
   ├─ ADD/CVD Lookup
   ├─ PGA Requirements
   ├─ FTA Rules
   ├─ FTA Calculator
   ├─ HTS History
   ├─ Tariff Tracker
   └─ Alerts
📦 My Products
⚙️ Settings
```

---

## Pricing Tiers

| Feature | Free | Pro ($99) | Business ($299) |
|---------|------|-----------|-----------------|
| Classifications/day | 5 | Unlimited | Unlimited |
| Saved products | 10 | 100 | Unlimited |
| Bulk upload | ❌ | ❌ | 500 rows |
| FTA qualification | ❌ | ✅ | ✅ |
| Denied party screening | ❌ | ✅ | ✅ |
| Compliance alerts | 1 | 25 | Unlimited |
| Export (PDF/Excel) | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | 1,000 calls/mo |
| Team members | ❌ | ❌ | 5 |

---

## Technical Architecture

See [`architecture.md`](./architecture.md) for:
- System overview
- Core services
- Data flow
- Database schema
- API endpoints

---

*For detailed status tracking, see [`prd.json`](./prd.json)*
