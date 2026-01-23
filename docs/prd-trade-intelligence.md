# PRD: Trade Intelligence & Competitive Features

> **Created:** January 8, 2026  
> **Updated:** January 22, 2026  
> **Status:** ACTIVE (Source of Truth)  
> **Owner:** Product  
> **Related:** `competitive-analysis-datamyne.md` (competitor research)

**This document is the source of truth for Sourcify's product vision and feature roadmap. All other docs should align to this.**

---

## 1. VISION & GOALS

### Vision
Transform Sourcify from a **duty calculation tool** into a **comprehensive trade intelligence platform** that competes with and surpasses Descartes (Datamyne + CustomsInfo) while maintaining our core advantages: AI-powered classification, modern UX, and SMB-friendly pricing.

### Strategic Goals

| Goal | Success Metric |
|------|----------------|
| **Expand TAM** | Move beyond duty calculation to capture trade intelligence market |
| **Increase stickiness** | Users come for classification, stay for intelligence |
| **Enable upsell** | Free → Paid tier conversion via premium data |
| **Competitive moat** | Features they can't easily copy (AI reasoning, optimization) |

---

## 2. COMPETITIVE POSITIONING

### The Market Today

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRADE INTELLIGENCE MARKET                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ENTERPRISE ($10K+/year)          SMB ($100-1000/year)           │
│  ┌─────────────────────┐          ┌─────────────────────┐        │
│  │ Descartes Datamyne  │          │                     │        │
│  │ Descartes CustomsInfo│         │    OPPORTUNITY      │        │
│  │ Panjiva             │          │    (Sourcify)       │        │
│  │ ImportGenius        │          │                     │        │
│  └─────────────────────┘          └─────────────────────┘        │
│                                                                   │
│  FEATURES:                        NEED:                          │
│  - Trade data ✅                  - Same features                │
│  - Company intel ✅               - Modern UX                    │
│  - Classification (basic) ✅      - AI-powered                   │
│  - Compliance tools ✅            - Affordable pricing           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Our Unique Advantages

| Advantage | Why It Matters | Hard to Copy? |
|-----------|----------------|---------------|
| **AI Classification with Reasoning** | Users understand WHY, not just what | Yes - requires LLM expertise |
| **Integrated Duty Calculation** | One workflow, not multiple tools | Medium - but we're ahead |
| **Optimization Suggestions** | Proactive savings, not just lookup | Yes - requires AI |
| **Modern UX** | 10x better than 2010s enterprise UI | Medium - but takes time |
| **SMB Pricing** | Opens new market segment | Yes - their cost structure prohibits |

---

## 3. FEATURE ROADMAP

### Phase 1: Enhance Core (Q1 2026) - LOW COST
*Build on what we have*

| Feature | Description | Effort | Value | Status |
|---------|-------------|--------|-------|--------|
| **Trade Statistics Dashboard** | Visualize USITC data we already have | M | High | ✅ Done |
| **FTA Rules Engine** | Index 300+ FTA rules by HTS code | L | High | ✅ Done |
| **FTA Qualification Calculator** | "Do I qualify?" based on BOM | M | Very High | ✅ Done |
| **Historical HTS Archives** | Archive HTS changes over time | S | Medium | ✅ Done |
| **PGA Requirements Lookup** | Build PGA flag database | S | Medium | ✅ Done |

**Data Sources:** Public/free (USITC, USTR, CBP, FDA/EPA)  
**Phase 1 Status: COMPLETE** ✅

### Phase 2: Compliance Tools (Q2 2026) - LOW COST
*Add compliance features from public data*

| Feature | Description | Effort | Value | Status |
|---------|-------------|--------|-------|--------|
| **Denied Party Screening** | Search OFAC/BIS lists | M | High | ✅ Done |
| **ADD/CVD Database** | Active orders by HTS + country | M | High | ✅ Done |
| **CBP Rulings Search** | Index rulings.cbp.gov | L | High | ⏸️ Deferred |
| **Section 301/IEEPA Tracker** | Current special tariffs | S | High | ✅ Done |
| **Compliance Alerts** | Notify on tariff changes | M | Medium | ✅ Done |

**Data Sources:** Public/free (OFAC, BIS, CBP, USTR)  
**Phase 2 Status: 80% COMPLETE** (CBP Rulings deferred - requires complex scraping)

### Phase 3: Trade Intelligence (Q3-Q4 2026) - MEDIUM COST
*Licensed data for competitive intelligence*

| Feature | Description | Effort | Cost/Year | Status |
|---------|-------------|--------|-----------|--------|
| **BOL Shipment Data** | US import/export shipments | L | $10K-50K | 🔲 Not Started |
| **Supplier Discovery** | Find suppliers by product | M | (included) | 🔲 Not Started |
| **Competitor Analysis** | Who imports what from whom | M | (included) | 🔲 Not Started |
| **Trade Trend Charts** | Volume/value over time | M | (included) | 🔲 Not Started |

**Data Sources:** ImportGenius, ImportKey, or similar  
**Phase 3 Status: NOT STARTED** (Requires data license investment)

### Phase 4: Company Intelligence (2027+) - HIGH COST
*Premium company data*

| Feature | Description | Effort | Cost/Year | Status |
|---------|-------------|--------|-----------|--------|
| **Company Profiles** | Revenue, employees, hierarchy | M | $20K-80K | 🔲 Not Started |
| **Contact Database** | Decision-maker emails/phones | M | $10K-30K | 🔲 Not Started |
| **Corporate Hierarchy** | Parent/subsidiary relationships | M | (included) | 🔲 Not Started |

**Data Sources:** D&B, ZoomInfo, Apollo  
**Phase 4 Status: NOT STARTED** (Future - depends on Phase 3 success)

---

## 4. DETAILED FEATURE SPECS

### 4.1 FTA Rules Engine & Qualification Calculator

**Problem:** CustomsInfo shows FTA rules but doesn't help users APPLY them.

**Solution:** 
1. Index all FTA rules of origin by HTS code
2. Let users input their Bill of Materials
3. Calculate if they qualify (RVC, tariff shift)
4. Show potential duty savings

**User Flow:**
```
1. User classifies product → gets HTS 8471.30.0100
2. System shows: "5 FTAs may apply"
3. User clicks "Check USMCA Qualification"
4. User enters BOM with origin of each component
5. System calculates: "RVC = 67% ✓ (minimum 60%)"
6. System shows: "You qualify! Save $X in duties"
```

**Data Required:**
- FTA text from USTR (free)
- Rules structured by HTS (we index)
- User's BOM data (user input)

**Competitive Advantage:** Neither Datamyne nor CustomsInfo does this!

---

### 4.2 Denied Party Screening

**Problem:** CustomsInfo has basic lookup, links out to OFAC for details.

**Solution:**
1. Ingest all 10+ government denied party lists
2. Build unified search interface
3. Add batch screening capability
4. Provide audit trail/reports

**Lists to Ingest:**
| List | Source | Update Frequency |
|------|--------|------------------|
| SDN | OFAC | Daily |
| Entity List | BIS | Weekly |
| Denied Persons | BIS | Weekly |
| Debarred Parties | State | Weekly |
| Unverified List | BIS | Monthly |
| Uyghur Forced Labor | DHS | As updated |
| Foreign Sanctions Evaders | OFAC | As updated |

**Data Required:** All public, available via government APIs/downloads

---

### 4.3 Trade Statistics Dashboard

**Problem:** We have USITC data but don't visualize it well.

**Solution:**
1. Build interactive dashboards
2. Trend charts (volume, value over time)
3. Country/product breakdowns
4. Compare to previous periods

**Visualizations:**
- Top 10 import sources by product
- Trade balance trends
- Tariff rate distributions
- YoY growth by HS chapter

**Data Required:** USITC API (we already have integration)

---

## 5. BUILD VS BUY ANALYSIS

### Build (Free/Public Data)

| Capability | Source | Effort | Maintenance | Status |
|------------|--------|--------|-------------|--------|
| HTS schedules | USITC | Done | Low | ✅ Done |
| Trade statistics | USITC API | Done | Low | ✅ Done |
| FTA rules text | USTR | Medium | Low | ✅ Done |
| CBP rulings | rulings.cbp.gov | Medium | Medium | ⏸️ Deferred |
| Denied party lists | OFAC/BIS | Medium | Medium | ✅ Done |
| PGA requirements | ACE appendix | Small | Low | ✅ Done |
| ADD/CVD orders | ITA | Small | Medium | ✅ Done |
| Federal Register | federalregister.gov | Medium | Medium | ✅ Done |

### Buy (Licensed Data)

| Capability | Vendor Options | Cost Range | ROI |
|------------|----------------|------------|-----|
| BOL data | ImportGenius, ImportKey, Panjiva | $10K-100K/yr | Medium |
| Company data | D&B, ZoomInfo | $20K-80K/yr | Low initially |
| Contact data | ZoomInfo, Apollo, Lusha | $5K-30K/yr | Medium |

### Recommendation

**Phase 1-2:** Build everything from public data first
- Proves demand before spending on licenses
- $0 data cost, just dev time
- Differentiates on AI/UX, not data access

**Phase 3+:** License BOL data if demand proven
- Start with cheapest provider (ImportKey ~$10K)
- Upsell to Pro tier to cover costs
- Only expand to company data if strong demand

---

## 6. PRICING STRATEGY

### Current Tiers (Reference)
| Tier | Price | Current Features |
|------|-------|------------------|
| Free | $0 | Basic classification |
| Pro | $99/mo | Full classification, duty calc |
| Enterprise | Custom | API, volume |

### Proposed Additions

| Tier | Price | New Features |
|------|-------|--------------|
| Free | $0 | + Trade stats dashboard (basic) |
| Pro | $99/mo | + FTA qualification, compliance tools |
| **Business** | $299/mo | + BOL data, supplier discovery |
| Enterprise | Custom | + Company data, contacts, API |

### Revenue Model for Licensed Data

| Data Cost | Required Subscribers | Break-even |
|-----------|---------------------|------------|
| $10K/yr BOL | 3 Business users | Month 4 |
| $30K/yr BOL | 9 Business users | Month 4 |
| $50K/yr Company | 14 Business users | Month 4 |

---

## 7. SUCCESS METRICS

### Phase 1-2 (Free Data Features)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Feature adoption | 40% of Pro users try FTA tools | Analytics |
| Engagement | 2x time in app | Session duration |
| Conversion | +10% Free→Pro | Funnel |

### Phase 3+ (Licensed Data)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Intelligence tier subscribers | 50 in 6 months | Billing |
| Data cost coverage | 100% by month 4 | Revenue vs cost |
| NPS for intelligence features | >50 | Survey |

---

## 8. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| BOL data cost too high | Can't offer competitively | Start with cheapest provider, prove demand first |
| Low demand for intelligence | Wasted dev time | Build free features first, validate interest |
| Data quality issues | Bad user experience | QA pipeline, user feedback loops |
| Competitor response | Price war | Focus on AI/UX advantages they can't copy |
| Regulatory changes | Data access restricted | Diversify data sources |

---

## 9. TIMELINE

```
2026
├── Q1: Phase 1 - Enhance Core
│   ├── Trade stats dashboard
│   ├── FTA rules engine
│   └── FTA qualification calculator
│
├── Q2: Phase 2 - Compliance Tools
│   ├── Denied party screening
│   ├── ADD/CVD database
│   └── CBP rulings search
│
├── Q3: Phase 3 - Trade Intelligence (if validated)
│   ├── License BOL data
│   ├── Supplier discovery
│   └── Launch Intelligence tier
│
└── Q4: Iteration
    ├── User feedback integration
    ├── Feature refinement
    └── 2027 planning

2027
└── Phase 4 - Company Intelligence (if demand)
```

---

## 10. CURRENT STATUS & NEXT STEPS

### Completed ✅
- [x] Phase 1: All features built (Trade Stats, FTA Rules, FTA Calc, HTS History, PGA)
- [x] Phase 2: Most features built (Denied Party, ADD/CVD, Tariff Tracker, Alerts)
- [x] Core infrastructure (Classification V10, Tariff Registry, Landed Cost)

### In Progress 🟡
- [ ] Monetization infrastructure (Stripe, usage limits, feature gating)

### Deferred ⏸️
- [ ] CBP Rulings Search (complex web scraping required)

### Next Steps (Priority Order)
1. **Stripe Integration** - Enable payment collection
2. **Usage Limits** - Enforce free tier limits (5 classifications/day)
3. **Feature Gating** - Lock Pro features (sourcing, FTA calc, exports)
4. **Upsell Teasers** - Show "upgrade to unlock" in free tier

### Future (Requires Investment Decision)
1. **Phase 3 Data License** - Evaluate BOL providers (ImportKey ~$10K/yr)
2. **Phase 4 Company Data** - Only if Phase 3 proves demand

---

## APPENDIX A: Data Source Details

### Public Data APIs

| Source | Data | API? | Format |
|--------|------|------|--------|
| USITC DataWeb | Trade statistics | Yes ✅ | JSON |
| OFAC | SDN list | Yes | XML/CSV |
| BIS | Entity/Denied lists | Download | CSV |
| CBP | Rulings | Scrape | HTML |
| USTR | FTA text | Download | PDF |
| Federal Register | Regulations | Yes | JSON |

### Commercial Data Providers

| Provider | Data | Pricing Model |
|----------|------|---------------|
| ImportGenius | US BOL | Per-search or subscription |
| ImportKey | US BOL | $10K-30K/year |
| Panjiva (S&P) | Global BOL | $50K+/year |
| D&B | Company data | Per-record or subscription |
| ZoomInfo | Contacts | $15K-50K/year |

---

## APPENDIX B: Competitive Feature Matrix

| Feature | Datamyne | CustomsInfo | Sourcify Status |
|---------|----------|-------------|-----------------|
| HTS lookup | ❌ | ✅ | ✅ Done |
| AI classification | ❌ | ⚠️ Basic | ✅ Done |
| Classification reasoning | ❌ | ❌ | ✅ Done |
| Duty calculation | ❌ | ❌ | ✅ Done |
| Landed cost | ❌ | ❌ | ✅ Done |
| Special tariffs (301/IEEPA) | ❌ | ❌ | ✅ Done |
| FTA rules lookup | ❌ | ✅ | ✅ Done |
| FTA qualification calc | ❌ | ❌ | ✅ Done |
| Trade statistics | ⚠️ | ⚠️ | ✅ Done |
| Denied party screening | ⚠️ Basic | ⚠️ Basic | ✅ Done |
| ADD/CVD lookup | ❌ | ✅ | ✅ Done |
| CBP rulings | ❌ | ✅ | ⏸️ Deferred |
| BOL shipment data | ✅ | ❌ | 🔲 Phase 3 |
| Company profiles | ✅ | ❌ | 🔲 Phase 4 |
| Contact database | ✅ | ❌ | 🔲 Phase 4 |
| Modern UX | ❌ | ❌ | ✅ Done |
| SMB pricing | ❌ | ❌ | ✅ Done |

---

## APPENDIX C: What's Built (Current State)

### Core Platform
- AI-powered HTS classification (V10 semantic search engine)
- 27,061 HTS codes with embeddings
- Tariff registry (199 countries, 7 data sources)
- Base MFN + Section 301 + IEEPA + Fentanyl + Section 232 tariffs

### Compliance Tools (Phase 1-2 Complete)
- Trade Statistics Dashboard with USITC DataWeb integration
- FTA Rules Engine (14 FTAs, 30+ rules)
- FTA Qualification Calculator (BOM input, RVC calculation)
- Historical HTS Archives (2020-2025 changes)
- PGA Requirements Lookup (13 agencies, 30+ flags)
- Denied Party Screening (OFAC SDN, BIS Entity List, BIS Denied Persons)
- Batch Denied Party Screening (CSV upload)
- ADD/CVD Lookup (20+ product categories)
- Section 301/IEEPA Tariff Tracker
- Compliance Alerts System

### Additional Features
- Landed Cost Calculator with customs fees (MPF, HMF)
- Save/Compare cost scenarios
- Bulk Classification (CSV upload)
- PDF/Excel/CSV export
- Alternative classifications with duty comparison
- Country comparison ("what if different country")

---

## APPENDIX D: What's Next

### Immediate Priorities (Monetization)
1. **Stripe Integration** - Accept payments
2. **Usage Limits** - 5 classifications/day for free tier
3. **Feature Gating** - Lock Pro features behind paywall
4. **Upsell Teasers** - Show value to free users

### Deferred (Technical Complexity)
- **CBP Rulings Search** - Requires complex web scraping

### Future (Requires Investment)
- **Phase 3: BOL Data** - Requires $10K-50K/yr data license
- **Phase 4: Company Intel** - Requires $20K-80K/yr data license

---

*Document version: 2.0*
*Last updated: January 22, 2026*
