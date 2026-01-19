# Descartes Trade Intelligence Suite - Competitive Analysis

> **Created:** January 8, 2026  
> **Updated:** January 8, 2026  
> **Status:** COMPLETE  
> **Purpose:** Document Descartes trade intelligence capabilities for competitive positioning
> **Related:** See `PRD_TRADE_INTELLIGENCE.md` for Sourcify's strategy

---

# EXECUTIVE SUMMARY

## Two Descartes Products Analyzed

| Product | URL | Focus | Target User |
|---------|-----|-------|-------------|
| **Datamyne** | datamyne.com | Trade intelligence & shipment data | Sales, supply chain, market research |
| **CustomsInfo** | customsinfo.com | Tariff research & compliance | Customs brokers, compliance teams |

---

## DATAMYNE: Trade Intelligence Platform

### What It Does
Answers: **"Who is trading what, with whom, and where?"**

### Key Use Cases
- **Competitor Intelligence** - See what competitors import/export
- **Supplier Discovery** - Find suppliers by seeing who ships to competitors
- **Market Research** - Trade flows, volumes, trends
- **Lead Generation** - Buyer/supplier contacts
- **Due Diligence** - Company trade history

### Data Products

| Product | Scale | Source | History |
|---------|-------|--------|---------|
| **US Maritime BOL** | ~200K records/week | CBP AMS License | 22 years (2004-present) |
| **Global Trade** | 575M+ records/year | 50+ country customs | 8 years (2018-present) |

### Core Functionality Matrix

| Feature | Description |
|---------|-------------|
| **BOL Search** | Search by company, product, HS code, port, carrier |
| **Filters** | Country, port, carrier, date range, containerized, weight |
| **Visualizations** | Pie charts, bar charts, trend lines, maps |
| **Aggregations** | Total by carrier, country, HS code, company, time |
| **Company Profiles** | D&B integration with hierarchy, contacts, revenue |
| **Contact Database** | Employee names, titles, emails, phones |
| **Denied Party Screening** | Basic lookup against 10 lists |
| **Alerts** | Email alerts on search criteria |
| **Export** | Excel, PDF exports |

### Data Sources
- **CBP AMS** - US Bill of Lading data (licensed)
- **Foreign Customs** - 50+ country declarations
- **US Census** - Aggregated trade statistics
- **Dun & Bradstreet** - Company enrichment

---

## CUSTOMSINFO: Tariff Research & Compliance Platform

### What It Does
Answers: **"What is the tariff classification and duty rate?"**

### Key Use Cases
- **HTS Classification** - Find correct tariff code
- **Duty Research** - Look up rates, FTAs, special programs
- **Rulings Research** - Search CBP rulings database
- **Rules of Origin** - FTA qualification requirements
- **Compliance** - PGA requirements, ADD/CVD, denied parties

### Core Functionality Matrix

| Feature | Description |
|---------|-------------|
| **HTS Lookup** | Search tariff schedules (US, Canada, Mexico, EU, UK, etc.) |
| **Classification Tool** | AI suggestions based on BOL data + confidence scores |
| **Trade Agreements** | 300+ FTAs with rules of origin text |
| **Rulings Database** | CBP rulings, CIT cases, CAFC decisions |
| **PGA Lookup** | Check HTS for agency requirements (FDA, EPA, etc.) |
| **ADD/CVD Lookup** | Antidumping/countervailing duty by HTS + country |
| **HTS Mapper** | Map old HTS codes to new versions |
| **Denied Party Lookup** | Basic search of 10 government lists |
| **Federal Register** | 29 years of trade regulations |
| **Historical Archives** | HTS schedules back to 1996 |

### Data Sources
- **USITC** - HTS schedules
- **CBP** - Rulings, decisions, bulletins
- **WCO** - Explanatory notes, opinions
- **USTR** - Trade agreement text
- **OFAC/BIS** - Denied party lists (links to government)

---

## KEY INSIGHTS FOR SOURCIFY

### What They Have That We Don't (Yet)

| Capability | Datamyne | CustomsInfo | Sourcify Status |
|------------|----------|-------------|-----------------|
| BOL shipment data | ✅ Licensed | ❌ | ❌ Needs license |
| Company contacts | ✅ D&B | ❌ | ❌ Needs license |
| 300+ FTA rules | ❌ | ✅ Indexed docs | ❌ Could build |
| 30 years HTS archives | ❌ | ✅ | ❌ Could build |
| CBP rulings database | ❌ | ✅ | ❌ Could build |
| PGA requirements | ❌ | ✅ | ❌ Could build |

### What We Have That They Don't

| Capability | Datamyne | CustomsInfo | Sourcify Status |
|------------|----------|-------------|-----------------|
| **AI Classification** | ❌ BOL matching | ❌ BOL matching | ✅ LLM-powered |
| **Classification Reasoning** | ❌ | ❌ | ✅ Full justification |
| **Ruling Citations** | ❌ | ❌ in results | ✅ Inline |
| **Duty Calculation** | ❌ | ❌ | ✅ Automatic |
| **Landed Cost** | ❌ | ❌ | ✅ Full calculator |
| **Special Tariffs** | ❌ | ❌ inline | ✅ 301/IEEPA/AD/CVD |
| **FTA Qualification Calc** | ❌ | ❌ | 🔨 Can build |
| **Modern UX** | ❌ 2010s | ❌ 2010s | ✅ 2025 |
| **SMB Pricing** | ❌ Enterprise | ❌ Enterprise | ✅ $99-999/mo |

### Their Weaknesses

1. **Dated UI/UX** - Both products look like 2010s enterprise software
2. **No AI reasoning** - Classification is text matching, not understanding
3. **No duty calculation** - Have to look up rates separately
4. **No optimization** - Don't suggest better codes or FTA savings
5. **Enterprise pricing** - $10K+/year excludes SMBs
6. **Siloed products** - Datamyne and CustomsInfo are separate

### Estimated Costs to Compete

| Capability | Data Source | Est. Cost/Year |
|------------|-------------|----------------|
| BOL data | ImportGenius/Panjiva | $10K-100K |
| Company data | D&B/ZoomInfo | $20K-80K |
| Contact data | ZoomInfo/Apollo | $5K-30K |
| Trade agreements | Build/scrape USTR | $0 (dev time) |
| Rulings database | Build/scrape CBP | $0 (dev time) |
| Denied party | OFAC/BIS feeds | $0 (public) |

---

## DOCUMENT STRUCTURE

This document contains detailed screen-by-screen analysis:

**PART 1: DATAMYNE (datamyne.com)**
- Screens 1-18: BOL search, filters, visualizations, company profiles, contacts

**PART 2: CUSTOMSINFO (customsinfo.com)**
- Screens 1-16: HTS lookup, classification, trade agreements, compliance tools

---

# PART 1: DATAMYNE (Trade Intelligence)

---

## 🎯 Datamyne Product Overview

### Core Value Proposition
Datamyne is a **trade intelligence platform** that answers: **"Who is trading what, with whom, and where?"**

It's primarily used for:
- **Competitor Intelligence** - See what competitors are importing/exporting
- **Supplier Discovery** - Find new suppliers by seeing who ships to your competitors
- **Market Research** - Understand trade flows, volumes, trends
- **Lead Generation** - Find buyers/suppliers with contact info
- **Compliance** - Denied party screening integration

### Two Main Data Products

| Product | Scale | Source | Detail Level | Company Intel |
|---------|-------|--------|--------------|---------------|
| **US Maritime (Bills of Lading)** | ~200K records/week | CBP AMS | High - shipper/consignee names, addresses, contacts | Full D&B integration |
| **Global Trade Database** | 575M+ records/year | 50+ country customs | Medium - basic company names | None |

---

## 📊 Data Sources & How They Get It

### US Maritime Data (Their Crown Jewel)
**Source:** CBP Automated Manifest System (AMS)
- Ocean carriers must file manifests electronically with CBP
- Datamyne has **commercial license** to access this data
- Contains: Shipper, Consignee, Notify Party, Vessel, Container, Product description
- **22+ years of history** (back to 2004)
- Near real-time updates (within days)

**Data Types:**
| Type | What It Is |
|------|------------|
| Cargo HOUSES | House Bills of Lading (freight forwarder level) |
| Cargo MASTERS | Master Bills of Lading (ocean carrier level) |
| Census District/Port/State | US Census Bureau aggregated statistics |

### Global Trade Database
**Sources:** Country customs agencies worldwide
- **50+ countries** with varying data availability
- Mix of **Bills of Lading** and **Customs Declarations**
- 8 years of history (2018-2025)

**Countries with data include:**
- Americas: USA, Mexico, Brazil, Argentina, Colombia, Ecuador, Peru, Chile, etc.
- Asia: China, Vietnam, India, Indonesia, Japan, Korea, Bangladesh, etc.
- Europe: EU, UK, Spain, Germany, etc.
- Others: Australia, South Africa, Turkey, etc.

### Enrichment Data (D&B Integration)
**Source:** Dun & Bradstreet
- DUNS numbers
- Corporate hierarchy (Domestic Ultimate, Global Ultimate)
- Employee counts, revenue
- Executive contacts with titles
- SIC/NAICS codes

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATA SOURCES                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  CBP AMS     │  │  Foreign     │  │  US Census   │  │  Dun &       │    │
│  │  (US BOL)    │  │  Customs     │  │  Bureau      │  │  Bradstreet  │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
│         │                 │                 │                 │             │
│         ▼                 ▼                 ▼                 ▼             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    DATAMYNE DATA WAREHOUSE                           │   │
│  │  • Entity Resolution (company name matching/normalization)          │   │
│  │  • "Unified" company names                                           │   │
│  │  • HS Code enrichment                                                │   │
│  │  • Value estimation algorithms                                       │   │
│  │  • DUNS linking                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         USER INTERFACE                               │   │
│  │                                                                      │   │
│  │  • Search (by company, product, HS code, port, etc.)                │   │
│  │  • Filters (country, carrier, date range, etc.)                     │   │
│  │  • Views (Results, Visualize, Trend, Total by, Grid Report)         │   │
│  │  • Company Intelligence (profiles, contacts, hierarchy)             │   │
│  │  • Alerts & Saved Queries                                           │   │
│  │  • Export (Excel, PDF)                                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Key Technical Capabilities

### 1. Entity Resolution / Company Matching
- Raw data has inconsistent company names
- They create "Unified" and "Consolidated" versions
- Links to DUNS numbers for definitive matching
- Shows corporate hierarchy (who owns whom)

### 2. Value Estimation
- Many records don't have declared values
- "Total calculated value (US$)" is **estimated by Datamyne**
- Based on HS code, quantity, historical data
- Disclaimer: "estimated figures derived from calculations conducted by Datamyne"

### 3. Search & Filtering
- Full-text search across multiple fields
- Boolean operators (AND, OR)
- Wildcard support ("indoor temperature sensor*")
- 70+ filterable/displayable fields
- Save queries for repeated use

### 4. Analytics
- Aggregation by any dimension (Total by)
- Time series trends (Trend by)
- Interactive charts (pie, bar, line)
- Rankings
- Grid/pivot reports

### 5. Company Intelligence (US only)
- Full company profiles with D&B data
- Employee directory with titles
- Contact request system (likely paid per contact)
- Denied party screening integration

---

## 💰 Likely Cost Structure

Based on what we've seen:

| Component | Estimated Cost | Notes |
|-----------|----------------|-------|
| **CBP AMS License** | $50K-$200K+/year | Core data access |
| **D&B Integration** | $20K-$100K+/year | Company data enrichment |
| **Foreign Customs Data** | Varies by country | Individual agreements |
| **Infrastructure** | Significant | 575M+ records, 22 years history |
| **Platform Subscription** | $10K-$50K+/year | Enterprise pricing |

**This is why Datamyne is enterprise-only** - the underlying data costs are substantial.

---

## 🎯 Competitive Strategy: Building a Better Datamyne

### Goal: Full Competition + Additional Functionality

We want to **compete directly with Datamyne** and **exceed their capabilities** by combining:
- Trade intelligence (what they do)
- Duty optimization (what we do better)
- AI-powered classification (our advantage)
- Modern UX (their platform is dated)
- SMB-friendly pricing (they're enterprise-only)

### Feature Parity Roadmap

#### Phase 1: Trade Statistics (Low Cost)
| Feature | Data Source | Status |
|---------|-------------|--------|
| Import/Export volumes by HS code | USITC DataWeb | ✅ Have API |
| Country of origin breakdown | USITC DataWeb | ✅ Have API |
| Port statistics | USITC DataWeb | ✅ Have API |
| Historical trends | USITC DataWeb | ✅ Have API |
| Saved searches & alerts | Internal DB | 🔨 Build |
| Visualizations (pie, bar, trend) | Internal | 🔨 Build |

#### Phase 2: Bill of Lading Data (Investment Required)
| Option | Provider | Est. Cost | Data Quality |
|--------|----------|-----------|--------------|
| **ImportGenius** | ImportGenius.com | $5K-20K/year | Good, US focus |
| **Panjiva** | S&P Global | $20K-100K/year | Excellent, global |
| **ImportKey** | ImportKey.com | $3K-10K/year | Good, US focus |
| **Enigma** | Enigma.com | Custom | Good, US focus |
| **Direct CBP License** | CBP | $50K+/year | Raw data, full access |

**Recommendation:** Start with ImportGenius or ImportKey for proof of concept, scale to Panjiva or direct CBP if traction.

#### Phase 3: Company Intelligence (Investment Required)
| Feature | Provider Options | Est. Cost |
|---------|------------------|-----------|
| Company profiles | D&B, Clearbit, ZoomInfo | $10K-50K/year |
| Corporate hierarchy | D&B, PrivCo | $20K-100K/year |
| Employee contacts | ZoomInfo, Apollo, Lusha | $5K-30K/year |
| DUNS numbers | D&B only | Part of D&B sub |

**Alternative:** Build basic company profiles from BOL data + free sources (LinkedIn, company websites) using AI enrichment.

#### Phase 4: Global Trade Data
| Region | Approach |
|--------|----------|
| US | BOL data (Phase 2) + Census |
| Mexico | ImportGenius/Panjiva include this |
| Latin America | Panjiva, or country-specific |
| Asia | Panjiva, or trade.gov data |
| Europe | Limited public data, need Panjiva |

### Our Competitive Advantages

| Advantage | Why It Matters |
|-----------|----------------|
| **AI Classification** | They don't classify - we do it better than anyone |
| **Duty Optimization** | They show data, we show savings |
| **Landed Cost Calculator** | They don't have this |
| **Modern UX** | Their UI is 2010s enterprise - we can be 10x better |
| **SMB Pricing** | They're $10K+/year, we can be $99-999/month |
| **Tariff Monitoring** | We alert on rate changes, they don't |
| **Section 301/IEEPA Integration** | We have full special tariff coverage |
| **FTA Qualification** | We show how to qualify for lower rates |

### Combined Value Proposition

```
DATAMYNE: "See who's importing what"
          → Passive intelligence
          → "Here's the data, figure it out"

SOURCIFY: "See who's importing what AND how to import it cheaper"
          → Active optimization
          → "Here's the data AND here's how to save money"
```

### Build vs Buy Analysis

| Capability | Build | Buy | Recommendation |
|------------|-------|-----|----------------|
| Trade statistics | ✅ Free data | - | **Build** |
| BOL search/filter | ✅ We can build | - | **Build** |
| BOL data | ❌ Too complex | ✅ License | **Buy** |
| Company profiles | ⚠️ AI enrichment | ✅ D&B/ZoomInfo | **Hybrid** |
| Contact database | ❌ Not feasible | ✅ ZoomInfo/Apollo | **Buy** |
| Visualizations | ✅ Charts.js/D3 | - | **Build** |
| Entity resolution | ✅ AI matching | ✅ D&B | **Hybrid** |
| Denied party screening | ❌ Complex | ✅ Descartes MK | **Buy/Partner** |

### Investment Estimate to Compete

| Phase | Features | Data Cost | Dev Time | Total Est. |
|-------|----------|-----------|----------|------------|
| **Phase 1** | Trade stats, viz, alerts | $0 | 4-6 weeks | $0 + dev |
| **Phase 2** | BOL data integration | $10K-50K/yr | 6-8 weeks | $10-50K |
| **Phase 3** | Company intelligence | $20K-80K/yr | 4-6 weeks | $30-130K |
| **Phase 4** | Global expansion | $50K-200K/yr | 8-12 weeks | $100-300K |

**To fully compete:** $50K-300K/year in data licensing + 6-12 months dev time

### Revenue Model to Support This

| Tier | Price | Target | Required Customers |
|------|-------|--------|-------------------|
| **Pro** | $199/month | SMB importers | 100 to break even on Phase 2 |
| **Business** | $499/month | Mid-market | 50 to break even on Phase 3 |
| **Enterprise** | $2,000+/month | Large importers | 20 to break even on Phase 4 |

### Differentiation Even With Same Data

Even if we license the same BOL data as Datamyne, we win by:

1. **AI-powered insights** - "Based on this import pattern, you could save $X by..."
2. **Duty integration** - Show tariff rates inline with shipment data
3. **Optimization suggestions** - "This HS code has alternatives with lower rates"
4. **FTA analysis** - "This supplier's country qualifies for USMCA"
5. **Landed cost on every shipment** - Calculate true cost, not just CIF value
6. **Modern experience** - Mobile-friendly, fast, beautiful UI
7. **Accessible pricing** - 10x cheaper than Datamyne

---

## 🗂️ Screen Index

| # | Screen Name | Category | Status |
|---|-------------|----------|--------|
| 1 | [Home / Data Explorer](#screen-1-home--data-explorer) | Navigation | ✅ Done |
| 2 | [BOL Search & Results](#screen-2-bill-of-lading-search--results-maritime-imports) | Search/Results | ✅ Done |
| 3 | [Visualize View Tab](#screen-3-visualize-view-tab) | Analytics | ✅ Done |
| 4 | [Total by Tab](#screen-4-total-by-tab-aggregation-view) | Analytics | ✅ Done |
| 5 | [Supplier Tab](#screen-5-supplier-tab-foreign-shipper-intelligence) | Company Intel | ✅ Done |
| 6 | [Buyer Tab](#screen-6-buyer-tab-us-importer-intelligence) | Company Intel | ✅ Done |
| 7 | [Company Trade Profile](#screen-7-company-trade-profile-page) | Company Intel | ✅ Done |
| 8 | [Contact Info Modal](#screen-8-contact-info-modal-company-contacts) | Company Intel | ✅ Done |
| 9 | [Global Trade Database](#screen-9-global-trade-database-multi-country-trade-data) | Global Search | ✅ Done |
| 10 | [TBD](#screen-10-tbd) | | 🔲 |

---

## Screen 1: Home / Data Explorer

**Purpose:** Main entry point - select country and data type to search

### Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  DESCARTES Datamyne                              [?] [i] [👤] [Log-out]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     Home / ↺ Return to last query                        │
│  │Latest updates│                                                           │
│  │Resource Ctr  │     ┌─────────────────────────┐  ┌──────────────────────┐│
│  ├──────────────┤     │     EXPLORE DATA        │  │  MY SAVED QUERIES    ││
│  │              │     │                         │  │                      ││
│  │ 🇺🇸 US Export │     │ 1. Select country  [▼] │  │  Select country [▼]  ││
│  │   Census Dist│     │                         │  │                      ││
│  │   Jan 8→Oct31│     │ 2. Select database [▼] │  │  Nothing selected[▼] ││
│  │              │     │                         │  │                      ││
│  │ 🇺🇸 US Import │     │      [  Search  ]      │  │     [ View ]         ││
│  │   Census Dist│     │                         │  │                      ││
│  │   Jan 8→Oct31│     └─────────────────────────┘  └──────────────────────┘│
│  │              │                                                           │
│  │ 🇺🇸 US Import │                                                          │
│  │   Census State│                                                          │
│  │   ...         │                                                          │
│  └──────────────┘                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Header** | Logo, help icon, info icon, user profile, logout |
| **Latest Updates Sidebar** | List of recent data refreshes with country flag, data type, date range |
| **Resource Center Tab** | Toggle to resource center (not explored yet) |
| **Explore Data Panel** | 2-step search: select country → select database type → search |
| **My Saved Queries Panel** | Quick access to previously saved searches |
| **Return to Last Query** | Breadcrumb link to reload previous search |

### Country Selector Options

Countries with trade data available:
- Global Trade Database
- 🇺🇸 United States
- 🇦🇷 Argentina
- 🇦🇺 Australia
- 🇧🇩 Bangladesh
- 🇧🇴 Bolivia
- 🇧🇷 Brazil
- 🇨🇲 Cameroon
- *(more countries visible in scroll)*
- 🇰🇷 Korea Republic (visible in sidebar)
- "Booking Bills" option (unclear what this is)

### Database Types by Country

**🇺🇸 United States:**
| Database | Description |
|----------|-------------|
| Maritime Imports | Bill of Lading data for ocean imports |
| Maritime Exports | Bill of Lading data for ocean exports |
| Import Census District | Census import data by customs district |
| Export Census District | Census export data by customs district |
| Import Census Port | Census import data by port |
| Export Census Port | Census export data by port |
| Import Census State | Census import data by state |
| Export Census State | Census export data by state |

**🇦🇷 Argentina:**
| Database | Description |
|----------|-------------|
| Import Declarations | Full customs import declarations |
| Import Declarations (2007-2017) | Historical import data |
| Export Declarations (2007-2017) | Historical export data |
| Census Import | Aggregated import statistics |
| Census Export | Aggregated export statistics |

### Data Sources

| Database Type | Underlying Source |
|---------------|-------------------|
| **Maritime Imports/Exports** | CBP AMS (Automated Manifest System) - Bill of Lading records |
| **Census District/Port/State** | US Census Bureau trade statistics |
| **Import/Export Declarations** | Country-specific customs agencies |
| **Global Trade Database** | Aggregated multi-country data |

### Latest Updates Sidebar Examples

Data freshness indicators shown:
- "United States - Export Census District: on Jan 8, 2026 up to Oct 31, 2025"
- "United States - Import Census District: on Jan 8, 2026 up to Oct 31, 2025"
- "United States - Import Census State: on Jan 8, 2026 up to Oct 31, 2025"
- "United States - Export Census State: on Jan 8, 2026 up to Oct 31, 2025"
- "United States - Export Census Port: on Jan 8, 2026 up to Oct 31, 2025"
- "United States - Import Census Port: on Jan 8, 2026 up to Oct 31, 2025"
- "Korea Republic of - Import" (cut off)

**Pattern:** Shows when data was last updated and what date range it covers (~2-3 month lag)

### User Interactions

| Action | Result |
|--------|--------|
| Click country dropdown | Shows searchable list with country flags |
| Select a country | Database dropdown updates with available options for that country |
| Select database type | Enables Search button |
| Click Search | Navigates to search/filter screen for selected database |
| Click "Return to last query" | Reloads previous search |
| Select saved query | Loads saved search parameters |
| Click View (saved queries) | Executes saved query |

---

## Screen 2: Bill of Lading Search & Results (Maritime Imports)

**Purpose:** Search and browse US import Bill of Lading records with extensive filtering and multiple view options

### Breadcrumb Navigation

```
Home / [Country ▼] / [Cargo Type ▼] / [In Transit ▼]
```

**Country Selector** (50+ countries):
- Global Trade Database, GlobalStats
- 🇺🇸 United States, 🇵🇷 Puerto Rico
- 🇦🇷 Argentina, 🇦🇺 Australia, 🇧🇩 Bangladesh, 🇧🇴 Bolivia, 🇧🇷 Brazil
- 🇨🇲 Cameroon, 🇨🇦 Canada, 🇨🇱 Chile, 🇨🇳 China, 🇨🇴 Colombia
- 🇨🇮 Côte d'Ivoire, 🇨🇷 Costa Rica, 🇩🇴 Dominican Republic, 🇪🇨 Ecuador
- 🇪🇺 European Union, 🇪🇹 Ethiopia, 🇬🇭 Ghana, 🇬🇹 Guatemala, 🇭🇳 Honduras
- 🇮🇳 India, 🇮🇩 Indonesia, 🇯🇵 Japan, 🇰🇿 Kazakhstan, 🇲🇽 Mexico
- 🇲🇩 Moldova, 🇳🇮 Nicaragua, 🇳🇬 Nigeria, 🇵🇰 Pakistan, 🇵🇦 Panama
- 🇵🇾 Paraguay, 🇵🇪 Peru, 🇵🇭 Philippines, 🇷🇺 Russia, 🇿🇦 South Africa
- 🇰🇷 South Korea, 🇪🇸 Spain, 🇱🇰 Sri Lanka, 🇹🇭 Thailand, 🇹🇷 Turkey
- 🇺🇬 Uganda, 🇺🇦 Ukraine, 🇬🇧 United Kingdom, 🇺🇾 Uruguay, 🇺🇿 Uzbekistan
- 🇻🇪 Venezuela, 🇻🇳 Vietnam
- "Booking Bills" (special category)

**Cargo Type Selector:**
| Option | Description |
|--------|-------------|
| Cargo HOUSES | House bills of lading (freight forwarder level) |
| Cargo MASTERS | Master bills of lading (ocean carrier level) |

**In Transit Filter:**
| Option | Description |
|--------|-------------|
| No | Arrived shipments only |
| Yes | In-transit shipments only |
| All | Both |

### Header Actions

| Button | Function |
|--------|----------|
| **View Alert** | Set up alerts for this search |
| **Load Query** | Load a previously saved search |
| **Save** | Save current search parameters |

### Search Bar

**Search Field Dropdown** - Search within specific fields:
| Field | What it searches |
|-------|------------------|
| Commodity | Product description text |
| Consignee Declared | US importer/buyer name |
| Entire B/L | Full bill of lading text |
| Final Destination | Inland destination |
| HS Code | Harmonized System code |
| Notify Party | Party to notify on arrival |
| Place of Receipt | Origin pickup location |
| Port of Departure | Foreign port of loading |
| Shipper Declared | Foreign supplier/seller name |
| US Region/Port of Arrival | US destination port |
| World Region/Country of Departure | Origin region/country |
| World Region/Country of Origin | Manufacturing country |

**Search Operators:** AND (visible), likely OR and NOT available

**Advanced Query:** Link to build complex queries

### Date Range Filter

- Date picker: `01/01/2026 - 01/06/2026` with Apply button
- **Data available:** Jan 1, 2004 to Jan 6, 2026 (22+ years of history!)

### Results Summary

- Shows total: **"Results [ 203,028 shipments]"**
- Export options: Excel download, table/grid view toggle

### View Tabs

| Tab | Purpose |
|-----|---------|
| **Result View** | Default table of individual shipments |
| **Visualize View** | Charts/graphs of data |
| **Trend by ▼** | Time-series trends (dropdown for options) |
| **Total by ▼** | Aggregations/summaries (dropdown for options) |
| **Buyer** | Analysis by US importer |
| **Supplier** | Analysis by foreign shipper |
| **Grid Report** | Pivot table / cross-tab analysis |
| **Rankings** | Top shippers, consignees, etc. |
| **Duty Rates** | Tariff/duty information |
| **NEW: Contacts** | Contact information extraction |

### Left Sidebar Filters

**Refine Results** header with settings gear and Metric Tons toggle

**Country of Origin** (with shipment counts):
| Country | Shipments |
|---------|-----------|
| CHINA | 878.49 K |
| CANADA | 862.81 K |
| MEXICO | 695.39 K |
| BRAZIL | 408.94 K |
| VIETNAM | 367.69 K |
| *"see more"* | expands list |

**Port of Arrival** (with shipment counts):
| Port | Shipments |
|------|-----------|
| NEW YORK/NEWARK | 919.32 K |
| NEW ORLEANS, LA | 901.23 K |
| LOS ANGELES, CA | 619.04 K |
| LONG BEACH, CA | 588.51 K |
| PHILADELPHIA, PA | 402.85 K |
| *"see more"* | expands list |

**Carrier** (with shipment counts):
| Carrier | Shipments |
|---------|-----------|
| AET INC PTE L... | 427.50 K |
| MAERSK LINE | 277.29 K |
| MSC-MEDITERRANEA | 276.45 K |
| CMA-CGM (CMDU) | 245.99 K |
| DAMPSKIBSSELS... | 224.58 K |
| *"see more"* | expands list |

**More Filters** (expandable):
| Filter | Type | Options |
|--------|------|---------|
| Consignee Email | Yes/No dropdown | YES / NO |
| Consignee Telephone | Yes/No dropdown | YES / NO |
| Consignee Type | Category | (expandable) |
| Consignees Blank | Yes/No | Show records with no consignee |
| Consignees Not Blank | Yes/No | Show records with consignee |
| Containerized | Yes/No | Container vs bulk cargo |
| Metric Tons | Range buckets | < 1000, 1000-2500, 2500-5000, > 5000 |

### Expanded Filter: Country of Origin (Full List)

Modal: **"Select Country of Origin to add (Shipments)"** with search filter

| Country | Shipments | | Country | Shipments | | Country | Shipments |
|---------|-----------|---|---------|-----------|---|---------|-----------|
| 🇨🇳 CHINA | 878.49 K | | 🇹🇭 THAILAND | 147.28 K | | 🇭🇰 HONG KONG | 81.43 K |
| 🇨🇦 CANADA | 862.81 K | | 🇪🇬 EGYPT | 142.70 K | | 🇱🇾 LIBYA | 79.73 K |
| 🇲🇽 MEXICO | 695.39 K | | 🇨🇴 COLOMBIA | 137.48 K | | 🇲🇾 MALAYSIA | 69.50 K |
| 🇧🇷 BRAZIL | 408.94 K | | 🇵🇪 PERU | 130.54 K | | 🇬🇹 GUATEMALA | 64.75 K |
| 🇻🇳 VIETNAM | 367.69 K | | 🇬🇧 UNITED KINGDOM | 120.05 K | | 🇮🇱 ISRAEL | 49.12 K |
| 🇺🇸 UNITED STATES | 352.09 K | | 🇩🇪 GERMANY | 119.67 K | | 🇧🇪 BELGIUM | 49.07 K |
| 🇮🇳 INDIA | 336.79 K | | 🇷🇺 RUSSIA | 114.24 K | | 🇸🇬 SINGAPORE | 48.13 K |
| 🇦🇪 UNITED ARAB EMIRATES | 332.16 K | | 🇻🇪 VENEZUELA | 108.07 K | | 🇪🇨 ECUADOR | 45.24 K |
| 🇰🇷 SOUTH KOREA | 326.64 K | | 🇿🇦 SOUTH AFRICA | 107.80 K | | 🇶🇦 QATAR | 44.77 K |
| 🇯🇵 JAPAN | 192.97 K | | 🇮🇶 IRAQ | 96.76 K | | 🇳🇱 NETHERLANDS | 43.05 K |
| 🇦🇷 ARGENTINA | 189.22 K | | 🇮🇩 INDONESIA | 93.32 K | | 🇫🇷 FRANCE | 40.47 K |
| 🇩🇿 ALGERIA | 181.18 K | | 🇪🇸 SPAIN | 90.78 K | | 🇸🇪 SWEDEN | 40.19 K |
| 🇹🇷 TURKEY | 180.21 K | | 🇹🇼 TAIWAN | 90.48 K | | 🇷🇴 ROMANIA | 40.12 K |
| 🇳🇱 NETHERLANDS ANTILLES | 179.12 K | | 🇨🇱 CHILE | 89.70 K | | 🇦🇺 AUSTRALIA | 36.81 K |
| 🇧🇸 BAHAMAS | 152.91 K | | 🇮🇹 ITALY | 83.98 K | | 🇰🇭 CAMBODIA | 36.27 K |

### Expanded Filter: Port of Arrival (Full List)

Modal: **"Select Port of Arrival to add (Shipments)"** with search filter

| Port | Shipments | | Port | Shipments | | Port | Shipments |
|------|-----------|---|------|-----------|---|------|-----------|
| NEW YORK/NEWARK A... | 919.32 K | | WILMINGTON, DE | 126.45 K | | SEATTLE, WA | 68.20 K |
| NEW ORLEANS, LA | 901.23 K | | FREEPORT, TX (5311...) | 126.37 K | | TACOMA, WA | 67.16 K |
| LOS ANGELES, CA | 619.04 K | | NEW HAVEN, CT | 121.71 K | | PORT CANAVERAL, FL | 60.20 K |
| LONG BEACH, CA | 588.51 K | | BELLINGHAM, WA | 120.00 K | | PONCE, PR | 59.02 K |
| PHILADELPHIA, PA | 402.85 K | | NEW YORK, NY | 112.26 K | | PASCAGOULA, MS | 54.35 K |
| HOUSTON, TX | 374.60 K | | TAMPA, FL | 106.54 K | | GALVESTON, TX | 50.49 K |
| PORT ARTHUR, TX | 327.96 K | | BATON ROUGE, LA | 104.46 K | | PANAMA CITY, FL | 49.20 K |
| GRAMERCY, LA | 313.24 K | | BOSTON, MA | 102.46 K | | LAKE CHARLES, LA | 46.68 K |
| CORPUS CHRISTI, TX | 311.77 K | | MIAMI, FL | 101.91 K | | WILMINGTON, NC | 43.37 K |
| SAVANNAH, GA | 304.64 K | | OAKLAND, CA | 97.59 K | | PORT MANATEE, FL | 40.55 K |
| CHARLESTON, SC | 215.46 K | | PORT EVERGLADES, F... | 93.77 K | | ALBANY, NY | 40.38 K |
| HONOLULU, HI | 181.59 K | | JACKSONVILLE, FL | 90.81 K | | FAJARDO, PR | 38.43 K |
| NORFOLK, VA | 164.93 K | | PROVIDENCE, RI | 86.79 K | | CHESTER, PA | 37.35 K |
| BALTIMORE, MD | 162.85 K | | BROWNSVILLE-CAMER... | 69.50 K | | PORTLAND, ME | 36.93 K |
| MOBILE, AL | 150.70 K | | MARTINEZ, CA | 69.34 K | | BUFFALO-NIAGARA F... | 36.82 K |

### Expanded Filter: Carrier (Full List)

Modal: **"Select Carrier to add (Shipments)"** with search filter

| Carrier | Shipments | | Carrier | Shipments | | Carrier | Shipments |
|---------|-----------|---|---------|-----------|---|---------|-----------|
| AET INC PTE LTD | 427.50 K | | INTERNATIONAL SEA... | 119.13 K | | ORIENT OVERSEAS C... | 73.39 K |
| MAERSK LINE | 277.29 K | | COSCO SHIPPING LI... | 117.78 K | | ITIRO DMCC | 70.93 K |
| MSC-MEDITERRANEAN... | 276.45 K | | GLOBAL CHARTERING... | 108.17 K | | EASTERN PACIFIC S... | 69.34 K |
| CMA-CGM | 245.99 K | | MAERSK TANKERS | 105.30 K | | CHEVRON SHIPPING... | 68.48 K |
| DAMPSKIBSSELSKABE... | 224.58 K | | OCEAN NETWORK EXP... | 102.46 K | | SEABOARD MARINE L... | 67.83 K |
| TEEKAY TANKERS LT... | 189.02 K | | ULTIMAR DMCC | 102.33 K | | VALERO MARKETING... | 65.70 K |
| ST SHIPPING TRANS... | 179.82 K | | OLDENDORFF CARRIE... | 100.34 K | | PS TANKER ONE LIM... | 65.23 K |
| TRAFIGURA MARITIM... | 167.06 K | | ULTRABULK | 100.33 K | | PAN OCEAN CO LTD | 62.93 K |
| THE CSL GROUP INC | 155.78 K | | SEAWORLD MANAGEME... | 94.33 K | | VITOL INTERNATION... | 60.88 K |
| MINERVA MARINE IN... | 149.98 K | | PREMUDA SPA | 92.03 K | | SCORPIO MR POOL L... | 58.92 K |
| THENAMARIS (SHIPS... | 142.80 K | | EVERGREEN LINE | 82.60 K | | MITSUI O S K LINE... | 54.53 K |
| ENESEL BULK LOGIS... | 140.23 K | | BLUE ANCHOR AMERI... | 81.92 K | | TSAKOS SHIPPING A... | 53.38 K |
| HAPAG LLOYD A G | 135.15 K | | UNISEA SHIPPING L... | 79.73 K | | SMT SHIPPING (CYP... | 52.01 K |
| VROON B V | 121.73 K | | CARGILL INTERNATI... | 77.00 K | | HAFNIA POOLS PTE... | 51.01 K |
| ILIADA MARITIME L... | 120.00 K | | PEGASUS DENIZCILI... | 75.72 K | | STAR BULK CARRIER... | 50.48 K |

### Filter Modal Behavior

- **Search/Filter box** at top of modal
- **Multi-column layout** (3-4 columns)
- **Shipment counts** shown in blue badges
- **Cancel / Add buttons** at bottom
- Can select multiple items to add as filter

### Column Selector: Select Fields

Modal: **"Select Fields"** - Customize which columns appear in results

**Limit:** Select up to 12 fields

**Actions:**
- Clear all fields
- Restore default fields
- Restore my default fields
- Save as my default columns

#### Available Fields by Category

**Importer / Shipper (26 fields):**
| Field | Description |
|-------|-------------|
| Date | Arrival/filing date |
| Month | Month grouping |
| Consignee Declared | US importer name (as filed) |
| Consignee Declared Address | US importer address |
| Consignee Type | Company type classification |
| Consignee Telephone | Phone number |
| Consignee Email | Email address |
| Shipper Declared | Foreign supplier name (as filed) |
| Shipper Declared Address | Foreign supplier address |
| Notify | Notify party |
| Carrier Code | SCAC code |
| Carrier | Carrier name |
| Master Consignee Declared Address | Master BOL consignee |
| Master Shipper Address | Master BOL shipper |
| Bill Master Carrier | Master BOL carrier |
| Master Consignee (Unified) | Normalized consignee |
| Master Shipper | Master BOL shipper |
| Master Notify | Master BOL notify party |
| Consignee (Unified) | Normalized/cleaned consignee name |
| Consignee (Consolidated) | Grouped consignee entities |
| Consignee DUNS | D&B DUNS number |
| Consignee Dom. Ult. DUNS | Domestic ultimate parent DUNS |
| Shipper (Unified) | Normalized shipper name |
| Consignee State | US state |
| Consignee City | US city |
| Consignee Zip Code | US zip code |
| Consignee County | US county |

**Commodity (17 fields):**
| Field | Description |
|-------|-------------|
| In Transit | Transit status |
| Bill of Lading Nbr. | BOL number |
| Master/House | Master vs House indicator |
| Mode of Transport | Ocean/Air/etc |
| Estimated Date | ETA |
| In bond entry type | Customs bond type |
| Short Container Description | Brief product description |
| IMO Code Declared | Hazmat code (declared) |
| IMO Code | Hazmat code |
| High Cube | High cube container flag |
| *Calculated value by HS (US$)* | Estimated value (italic = calculated) |
| Master Short Container Description | Master BOL description |
| *Master Container Description* | Full master description |
| Bill Master | Master BOL number |
| HS Code | 2-digit HS |
| HS Code (2) | 2-digit HS |
| HS Code (4) | 4-digit HS |
| HS Description | HS code description |
| *Full Container Description* | Complete product text |
| Free Trade Agreement | FTA indicator |

**Geography (16 fields):**
| Field | Description |
|-------|-------------|
| Port of Arrival | US destination port |
| Foreign Destination | If re-export |
| US Region | US geographic region |
| World Region by Port of Departure | Origin region |
| Country by Port of Departure | Origin country |
| Port of Departure | Foreign loading port |
| State of Port of Arrival | US state |
| Vessel | Ship name |
| Vessel Country | Ship flag country |
| Final Destination | Inland US destination |
| Country of Origin | Manufacturing country |
| World Region by Country of Origin | Origin region |
| Place of Receipt | Pickup location |
| Country by Place of Receipt | Receipt country |
| World Region by Place of Receipt | Receipt region |

**Measures (11 fields):**
| Field | Description |
|-------|-------------|
| Quantity | Package count |
| Quantity Unit | Package type (CTN, PLT, etc) |
| Weight | Gross weight |
| Weight Unit | Weight UOM (KG, LB) |
| Measure | Volume/dimensions |
| Measure Unit | Volume UOM |
| Container Quantity | Number of containers |
| Metric Tons | Weight in metric tons |
| Kilograms | Weight in kg |
| Total calculated value (US$) | Estimated shipment value |
| FCL/LCL | Full container vs less-than-container |

#### Default Selected Fields
The right column shows currently selected fields (removable with ×):
1. Date
2. Bill of Lading Nbr.
3. Consignee Declared
4. Shipper Declared
5. Short Container Description
6. Country of Origin
7. Port of Arrival
8. Final Destination
9. Weight
10. Weight Unit
11. Quantity
12. Quantity Unit

**Total available fields:** 70+ fields across 4 categories

### Results Table Columns

| Column | Description | Example |
|--------|-------------|---------|
| Row | Checkbox for selection | ☐ |
| Date | Arrival/filing date | 01/06/2026 |
| Bill of Lading Nbr. | Unique BOL identifier | ZYIAYH251208007 |
| Consignee Declared | US importer name | RICHOUX TRADE LIMITED |
| Shipper Declared | Foreign supplier name | SHANGHAI YU GARMENT TRADE CO., LTD |
| Short Container Description | Product description | ELECTRIC STACKER, GLASS CUP, LADIES'S SHIRT |
| Country of Origin | Manufacturing country | CHINA |
| Port of Arrival | US port | NEW YORK/NEWARK AREA, NEWARK, NEW JERSEY |
| Final Destination | Inland destination | NOT DECLARED |
| Weight Unit | Unit of measure | KG |
| Weight Quantity | Weight amount | 9,500.00 |
| Quantity Unit | Package unit | CTN (cartons) |

### Sample Data (Products Visible)

| Product | Shipper | Consignee | Weight |
|---------|---------|-----------|--------|
| Electric Stacker | Shanghai Yu Garment Trade | Richoux Trade Limited | 9,500 kg |
| Glass Cup | Shanghai Yu Garment Trade | Richoux Trade Limited | 12,688 kg |
| Ladies's Shirt | Shanghai Yu Garment Trade | Richoux Trade Limited | 14,535 kg |
| Comforter Set | Shanghai Yu Garment Trade | Richoux Trade Limited | 9,329 kg |
| PVC Placemat | Yiwu Haicheng Trading | Grand Wisdom Worldwide | 13,300 kg |
| Display Stand | Shanghai Tuyantong Trading | IQ Robot Technology | 6,930 kg |
| Pillow Cover | Shanghai Tuyantong Trading | IQ Robot Technology | 20,054 kg |
| Display Picture Frame | Shanghai Runchicheng Trading | K-C Crop Science | 8,844 kg |
| Bath Mat | Shanghai Runchicheng Trading | K-C Crop Science | 16,850 kg |

### User Actions Available

| Action | How |
|--------|-----|
| Search by keyword | Type in search bar, select field, click Search |
| Filter by date range | Use date picker, click Apply |
| Filter by country/port/carrier | Click items in left sidebar |
| Switch country context | Use breadcrumb dropdown |
| Switch cargo type | Use breadcrumb dropdown (HOUSES vs MASTERS) |
| Filter in-transit status | Use breadcrumb dropdown |
| View trends | Click "Trend by" tab |
| View aggregations | Click "Total by" tab |
| Analyze buyers | Click "Buyer" tab |
| Analyze suppliers | Click "Supplier" tab |
| View rankings | Click "Rankings" tab |
| See duty rates | Click "Duty Rates" tab |
| Export to Excel | Click Excel button |
| Save search | Click Save button |
| Load saved search | Click Load Query button |
| Set up alerts | Click View Alert button |
| Select multiple rows | Use row checkboxes |
| Advanced search | Click "Advanced Query" link |
| **Drill into Data Source** | Click on Data Source link (e.g., "USA - BILLS IMPORTS") to filter |

### Clickable Links in Results

Many fields in the results table are **clickable links** that filter/drill down:
- **Data Source** (e.g., "USA - BILLS IMPORTS") → filters to that source
- **Consignee/Buyer names** → opens company profile
- **Shipper/Supplier names** → opens company profile
- **Bill of Lading number** → opens shipment detail
- **Dates** → likely filters by date

### Data Source

**CBP AMS (Automated Manifest System)** - Bill of Lading data
- Updated: Near real-time (within days of filing)
- History: Back to January 1, 2004 (22+ years)
- Records: 203K+ in just 6 days of 2026

---

## Screen 3: Visualize View Tab

**Purpose:** Dashboard overview with multiple summary charts and tables showing data breakdowns

### Export Options
- **Configure** (gear icon) - customize dashboard
- **Excel** export
- **PDF** export

### Dashboard Cards (6 widgets)

**Row 1:**

| Card | Chart Type | Shows | Sample Data |
|------|------------|-------|-------------|
| **Month** | Bar chart + table | Metric Tons per Month | Jan 2026: 8.57M metric tons (100%) |
| **Carrier** | Pie chart + table | Top Carrier by volume | AET Inc (5%), Maersk (3%), MSC (3%), CMA-CGM (3%), Others (83.1%) |
| **Country of Origin** | Pie chart + table | Top Country of Origin | China (10%), Canada (10%), Mexico (8%), Brazil (5%), Vietnam (4%), Others (62.5%) |

**Row 2:**

| Card | Chart Type | Shows | Sample Data |
|------|------------|-------|-------------|
| **Port of Arrival** | Pie chart + table | Top Port of Arrival | NY/Newark (11%), New Orleans (11%), LA (7%), Long Beach (7%), Philadelphia (5%), Others (60%) |
| **Shipper (Unified)** | Pie chart + table | Top Shipper (normalized names) | PMI Comercio (3%), Irving Oil (2%), Bolanter (2%), Petroleo Brasil (1%), Shell Wetern (1%), Others (90%) |
| **Consignee (Unified)** | Pie chart + table | Top Consignee (normalized names) | Valero Marketing (5%), PBF Manufacturing (2%), Saudi Refining (2%), Irving Oil Terminal (2%), BP Products (1%), Others (88.1%) |

### Each Card Contains
- **Title header** (e.g., "Carrier", "Country of Origin")
- **Pie/Bar chart** with hover tooltips
- **Legend** with color-coded entries
- **Data table** with columns: #, Name, Metric Tons, %
- **"see more" link** → navigates to Total by tab

### Footer
- "Obs.: DATA SUBJECT TO MODIFICATIONS"
- "Source: U.S. Customs and Border Protection (CBP)"
- Links: "Country of Origin - HS code"

---

## Screen 4: Total by Tab (Aggregation View)

**Purpose:** Detailed aggregation/grouping of data by any dimension with interactive charts

### Header
- Results count: **"Results [ 2,180 rows]"**
- **Hide Chart** button - toggle chart visibility
- **Excel** export
- View toggle (list/grid)

### Interactive Bar Chart
- **Title:** "Carrier by Bill of Lading" (dynamic based on grouping)
- **Y-axis:** Bill of Lading count (0 - 20,000)
- **X-axis:** Carrier names
- **Hover tooltip:** Shows exact values (e.g., "CMA-CGM, Bill of Lading: 12,539")
- Bars are clickable/interactive

### Aggregation Table

**Columns:**
| Column | Description | Example |
|--------|-------------|---------|
| Checkbox | Row selection | ☐ |
| Carrier | Grouped dimension (clickable links) | MAERSK LINE |
| Bill of Lading | Count of BOLs | 17,116 |
| Container Quantity | Total containers | 20,207.29 |
| Metric Tons | Total weight | 277,285.97 |
| Total calculated value (US$) | Estimated value | 2,405,463,893.30 |

### Sample Carrier Data (Top 20)

| # | Carrier | BOLs | Containers | Metric Tons | Value (US$) |
|---|---------|------|------------|-------------|-------------|
| 1 | MAERSK LINE | 17,116 | 20,207 | 277,285 | $2.4B |
| 2 | MSC-MEDITERRANEAN | 13,810 | 18,155 | 276,453 | $6.3B |
| 3 | CMA-CGM | 12,539 | 14,304 | 245,987 | $6.3B |
| 4 | HAPAG LLOYD A G | 7,093 | 9,962 | 135,145 | $1.5B |
| 5 | COSCO SHIPPING LINES | 5,643 | 10,063 | 117,782 | $932M |
| 6 | OCEAN NETWORK EXPRESS | 5,615 | 8,549 | 102,455 | $1.2B |
| 7 | BLUE ANCHOR AMERICA LINE | 5,610 | 6,362 | 81,916 | $1.3B |
| 8 | EVERGREEN LINE | 5,576 | 7,467 | - | - |
| 9 | FEDEX LOGISTICS INC | 342 | 265 | 2,679 | $39.6M |
| 10 | AMASS INTERNATIONAL GROUP | 331 | 46 | 721 | $7.0M |

*(Additional carriers: Guangdong Manbin, McLean Cargo, Saco Shipping, MCL-Multi Container, EFL Container Lines, Sun Track Express, Ningbo Ouran, CIMC Wetrans, Global Freight Services, Scanwell Container, Multimodal Ocean Services, Cool Carriers)*

### Summary Rows

| Row | BOLs | Containers | Metric Tons | Value (US$) |
|-----|------|------------|-------------|-------------|
| **Page Subtotal** | 152,488 | 176,878.98 | 2,480,036.34 | $37.0B |
| **Total** | 203,028 | 226,554.12 | 8,569,550.17 | **$54.8B** |

### Pagination
- First | Previous | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Next
- 2,180 total rows across pages

### Key Metrics Visible
- **203,028 total shipments** in date range
- **226,554 containers**
- **8.57 million metric tons**
- **$54.8 billion total calculated value**

### Grouping Options (Total by dropdown)

**28 aggregation dimensions available:**

| Dimension | Notes |
|-----------|-------|
| Carrier | Shipping line |
| Consignee (Consolidated) | Grouped company entities |
| Consignee (Unified) | Normalized importer names |
| Consignee City | US city |
| Consignee County | US county |
| Consignee Declared | Raw importer name |
| Consignee Dom. Ult. DUNS | D&B ultimate parent |
| Consignee DUNS | D&B identifier |
| Consignee State | US state |
| Consignee Zip Code | US zip |
| Country by Place of Receipt | *with maps* |
| Country by Port of Departure | *with maps* |
| Country of Origin | *with maps* |
| Final Destination | Inland US destination |
| HS Code (2) | 2-digit chapter |
| HS Code (4) | 4-digit heading |
| HS Code (6) | 6-digit subheading |
| Master Consignee (Unified) | Master BOL consignee |
| Month | Time grouping |
| Place of Receipt | Origin pickup |
| Port of Arrival | US port |
| Port of Departure | Foreign port |
| Shipper (Unified) | Normalized supplier names |
| Shipper Declared | Raw supplier name |
| State of Port of Arrival | US state |
| US Region | Geographic region |
| World Region by Country of Origin | Origin region |
| World Region by Place of Receipt | Receipt region |
| World Region by Port of Departure | Departure region |

**Note:** 3 options include **"with maps"** - geographic visualization:
- Country by Place of Receipt
- Country by Port of Departure  
- Country of Origin

---

## Screen 5: Supplier Tab (Foreign Shipper Intelligence)

**Purpose:** Company intelligence view of foreign suppliers/shippers with business details

### Header
- Results count: **"Results [ 56,482 companies]"**
- **D&B filters** dropdown
- Excel export

### Table Columns

| Column | Description | Example |
|--------|-------------|---------|
| Checkbox | Row selection | ☐ |
| Supplier | Company name (clickable link) + country code | HONGKONG FAMILY CO LTD (HK) |
| (Icons) | Flag + verification badges | 🇭🇰 🏢 📊 |
| Business Name | Formal business name | HONG KONG FAMILY CO., LIMITED |
| Address | Full address | Rm 17-18 10/f Landmark North, Sheung Shui, NT, HONG KONG |
| (Icons) | Country flag + location pin + company profile | 🇭🇰 📍 🏢 |
| Bill of Lading | Count of shipments (clickable) | 455 |
| Metric Tons | Total weight | 5,660.86 |
| Total calculated value (US$) | Estimated value | 105,931,377.36 |

### Sample Supplier Data

| Supplier | Country | BOLs | Metric Tons | Value (US$) |
|----------|---------|------|-------------|-------------|
| HONGKONG FAMILY CO LTD | 🇭🇰 HK | 455 | 5,660 | $105.9M |
| XYLEM EUROPE GMBH | 🇸🇪 SE | 423 | 249 | $6.4M |
| UNION DE BANANEROS ECUATORIANOS | 🇪🇨 EC | 420 | 9,429 | $4.5M |
| APM TERMINALS INDIA PVT LTD | 🇮🇳 IN | 360 | 1,104 | $15.5M |
| APL LOGISTICS VIETNAM | 🇻🇳 VN | 297 | 2,611 | $52.8M |
| SAMSUUNG ELECTRONICS CO. LTD | 🇰🇷 KR | 294 | 1,441 | $16.8M |
| ZHEJIANG HENGJIAN HOME FURNISHINGCO | 🇨🇳 CN | 280 | 5,752 | $17.4M |
| SAILUN GROUP (HONGKONG) COMPANY | 🇭🇰 HK | 255 | 4,428 | $18.2M |
| REFAT GARMENTS LIMITED | 🇧🇩 BD | 233 | 291 | $3.0M |
| ROYAL CARIBBEAN CRUISES LTD | 🇻🇳 VN | 229 | - | - |

### Icon Legend
- 🏳️ Country flag
- 📍 Location/map link
- 🏢 Company profile link
- 📊 Additional data available

---

## Screen 6: Buyer Tab (US Importer Intelligence)

**Purpose:** Company intelligence view of US importers/consignees with D&B corporate hierarchy data

### Header
- Results count: **"Results [ 45,392 companies]"**
- **D&B filters** dropdown
- Excel export

### Table Columns

| Column | Description | Example |
|--------|-------------|---------|
| Checkbox | Row selection | ☐ |
| Buyer | Company name (clickable) + state code | OLD NAVY INC (CA) |
| (Icons) | Flag + verification + D&B badges | 🏢 👤 📊 |
| Business Name | Full legal name + DUNS + address | OLD NAVY INC. 170823376, 2 Folsom St, San Francisco, CA 94105-1205, USA |
| Domestic Ultimate Name | US parent company + DUNS + address | THE GAP, INC. 048626915, 2 Folsom St, San Francisco, CA 94105-1205 |
| Global Ultimate Name | Worldwide parent + DUNS + address | THE GAP, INC. 048626915, 2 Folsom St, San Francisco, USA 94105-1205 |
| Bill of Lading | Shipment count (clickable) | 1,437 |
| Metric Tons | Total weight | 3,064.09 |
| Total calculated value (US$) | Estimated value | 56,441,656.93 |

### D&B Corporate Hierarchy Feature

**Key differentiator:** Shows corporate ownership structure
- **Business Name** = Operating entity
- **Domestic Ultimate Name** = US headquarters/parent
- **Global Ultimate Name** = Worldwide parent company

### Sample Buyer Data

| Buyer | Business | Domestic Ultimate | Global Ultimate | BOLs | Value |
|-------|----------|-------------------|-----------------|------|-------|
| OLD NAVY INC (CA) | Old Navy Inc. | THE GAP, INC. | THE GAP, INC. | 1,437 | $56.4M |
| HOME DEPOT USA, INC (GA) | Home Depot U.S.A., Inc. | THE HOME DEPOT, INC. | THE HOME DEPOT, INC. | 895 | $147.3M |
| WALMART INC (AR) | Walmart Inc. | WALMART INC. | WALMART INC. | 834 | $43.1M |
| DOLE FOOD COMPANY, INC (CA) | Dole Food Company, Inc. | DOLE FOOD COMPANY, INC. | DOLE PUBLIC LIMITED COMPANY (Ireland) | 669 | $5.9M |
| THE GAP, INC (CA) | The Gap, Inc. | THE GAP, INC. | THE GAP, INC. | 490 | $11.5M |
| XYLEM WATER SYSTEMS USA LLC (WO) | Xylem Water Systems USA Llc | Xylem Water Systems USA Llc | Xylem Water Systems USA Llc | 442 | $7.3M |

### Data Points Per Company

Each company record includes:
- **DUNS Number** (e.g., 170823376)
- **Full Address** with zip code
- **Country Flag**
- **Location Pin** (map link)
- **Company Profile Link**
- **Corporate hierarchy** (domestic + global parent)

### D&B Filters Dropdown
Filter by D&B company attributes (not expanded in screenshot)

### Company Row Icons (3 action buttons)

| Icon | Color | Action | Description |
|------|-------|--------|-------------|
| 🏳️ Flag | Green | **Denied Party Screening** | "Request further information about this company from Descartes MK Denied Party Screening. *Match was made based on Company Name and Company Address*" |
| 👤 Person | Blue | **View company's Contacts** | Opens contact information for the company |
| 🪪 ID Card | Blue | **View company's trade profile** | Opens detailed company profile page |

---

## Screen 7: Company Trade Profile Page

**Purpose:** Comprehensive company intelligence profile with trade history and analytics

### Header
- Company name: **OLD NAVY INC.**
- Subtitle: "Company profile by Descartes Datamyne"
- Actions: Print, PDF export
- Social sharing: QR code, LinkedIn, Facebook, Twitter

### Site Profile Section

**Company Information (Left Column):**
| Field | Value |
|-------|-------|
| Company Name | OLD NAVY INC. |
| Address | 2 Folsom St, San Francisco, CA 94105-1205 US |
| Phone | 415-427-0100 |
| Fax | - |
| URL | OLDNAVY.GAP.COM, WWW.AOLDNAVY.COM, WWW.OLDNAVYA.COM, WWW.GAPINC.COM, WWW.NOLDNAVY.COM |
| Trade Style | OLD NAVY |
| Ownership | Partnership of Unknown |
| Location Type | Headquarter |
| Parent Company | THE GAP, INC. (048626915) ← clickable link |
| NAICS | 458110 - CLOTHING AND CLOTHING ACCESSORIES RETAILERS |

**D&B Data (Right Column):**
| Field | Value |
|-------|-------|
| DUNS Number | 170823376 |
| Executive Contact | STACEY LAVALLE FRASER (SENIOR VICE PRESIDENT) |
| Total Number of Employees | 5,000 |
| Sales Volume (US$) | $558,623,980 |
| Line of Business | RET FAMILY CLOTHING |
| SIC | 5651 - FAMILY CLOTHING STORES |
| In Business Since | 1997 (29 years) |
| Stock Ticker Symbol | - |
| Trading Status | Imports |

### Visualize Section

**Metric Selector Dropdown:**
| Option | Description |
|--------|-------------|
| Shipments | Number of shipment records (default) |
| Bill of Lading | Count of BOL documents |
| Container Quantity | Number of containers |
| Metric Tons | Weight in metric tons |
| Total calculated value (US$) | Estimated value |

### Analytics Widgets (6 charts for OLD NAVY)

**1. Records per Month**
- Line chart + table
- Shows import activity over time
- Sample: Dec 2025: 1.5K, Oct 2025: 2.3K, Sep 2025: 2.6K
- Total: 9.3K records

**2. Top Shipper (Unified)**
| Shipper | Country | Records |
|---------|---------|---------|
| AYESHA CLOTHING CO LTD | 🇧🇩 BD | 787 |
| REFAT GARMENTS LIMITED | 🇧🇩 BD | 583 |
| ARTISTIC MILLINERS PVT LTD | 🇵🇰 PK | 317 |
| SQ CELSIUS LTD | 🇧🇩 BD | 222 |
| ANANTA APPARELS LTD. | 🇧🇩 BD | 214 |
| STANDARD STITCHES LTD WOVEN UNIT | 🇧🇩 BD | 134 |
| ZYTA APPARELS LTD | 🇧🇩 BD | 100 |
| LAILA STYLES LTD | 🇧🇩 BD | 100 |

**3. Top HS Code (6)**
| HS Code | Description | Records |
|---------|-------------|---------|
| 610110 | MEN'S OR BOYS' OVERCOATS, CARCOATS, CAPES, CLOAKS, ANORAKS | 5.4K |
| 611020 | SWEATERS, PULLOVERS, SWEATSHIRTS, VESTS, KNITTED/CROCHETED | 905 |
| 620342 | MEN'S OR BOYS' TROUSERS, BIB AND BRACE OVERALLS, COTTON | 389 |
| 611120 | BABIES' GARMENTS AND CLOTHING ACCESSORIES, COTTON | 368 |
| 620462 | WOMEN'S OR GIRLS' TROUSERS, BIB AND BRACE, COTTON | 360 |
| 611030 | SWEATERS, PULLOVERS, MANMADE FIBERS, KNITTED/CROCHETED | 250 |
| 621142 | WOMEN'S OR GIRLS' GARMENTS, COTTON, NOT KNITTED | 202 |
| 610462 | WOMEN'S OR GIRLS' TROUSERS, COTTON, KNITTED/CROCHETED | 160 |
| 610463 | WOMEN'S OR GIRLS' TROUSERS, SYNTHETIC FIBERS | 154 |
| 640419 | FOOTWEAR, RUBBER/PLASTICS SOLES, TEXTILE UPPERS | 112 |

**4. Top Carrier**
| Carrier | Records |
|---------|---------|
| MAERSK LINE (MAEU) | 5.9K |
| CMA-CGM (CMDU) | 1.5K |
| MSC-MEDITERRANEAN (MSCU) | 580 |
| OCEAN NETWORK EXPRESS (ONEY) | 457 |
| HYUNDAI MERCHANT MARINE (HDMU) | 246 |
| SEABOARD MARINE LTD (SMLU) | 246 |
| CROWLEY LATIN AMERICA (CLAM) | 221 |
| EFL CONTAINER LINES (EFLR) | 75 |

**5. Top Country of Origin**
| Country | Records |
|---------|---------|
| 🇧🇩 BANGLADESH | 2.5K |
| 🇻🇳 VIETNAM | 2.1K |
| 🇮🇩 INDONESIA | 1.3K |
| 🇮🇳 INDIA | 1.1K |
| 🇰🇭 CAMBODIA | 750 |
| 🇵🇰 PAKISTAN | 596 |
| 🇬🇹 GUATEMALA | 373 |
| 🇱🇰 SRI LANKA | 131 |
| 🇨🇳 CHINA | 126 |
| 🇭🇰 HONG KONG | 86 |

**6. Top Port of Arrival**
| Port | Records |
|------|---------|
| LOS ANGELES, CA | 4.7K |
| NEW YORK/NEWARK AREA, NJ | 3.5K |
| LONG BEACH, CA | 442 |
| MIAMI, FL | 268 |
| PORT EVERGLADES, FL | 249 |
| SAVANNAH, GA | 31 |
| NEW YORK, NY | 12 |

### Key Insights from OLD NAVY Profile

This company profile reveals:
- **Primary sourcing:** Bangladesh (27%), Vietnam (23%), Indonesia (14%)
- **Main products:** Apparel (HS 61-62), primarily overcoats and sweaters
- **Primary carrier:** Maersk (63% of shipments)
- **Entry ports:** West Coast (LA/Long Beach ~55%), East Coast (NY/Newark ~38%)
- **Revenue:** $558M in sales
- **Trade status:** Importer only

---

## Screen 8: Contact Info Modal (Company Contacts)

**Purpose:** Access individual employee contacts at a company for sales/outreach

### Filter Options

| Filter | Type | Options |
|--------|------|---------|
| Job function | Dropdown | Filter by job function |
| Job level | Dropdown | Filter by job level |
| Job title | Dropdown | Filter by job title |

**Includes checkboxes:**
- ☐ Email
- ☐ Phone number

### Contact Table Columns

| Column | Description |
|--------|-------------|
| Checkbox | Select contact to request |
| Contact Name | First & last name |
| Title/Position | Job title |
| Company | Company name |
| DUNS | D&B identifier |
| Email Address | ✓ if available |
| Telephone number | ✓ if available |

### Sample Contacts (OLD NAVY INC - DUNS 170823376)

| Name | Title/Position | Email | Phone |
|------|----------------|-------|-------|
| JASON LAMOUREUX | District Manager | ✓ | ✓ |
| NOAH PALMER | Vice-President | ✓ | ✓ |
| SARAH HOLME | Executive | ✓ | ✓ |
| MARVIN DEYRO | Operations Manager | ✓ | ✓ |
| ALISSA COOPER | Assistant | ✓ | ✓ |
| JAZMIN SOLTERO | Associate | ✓ | ✓ |
| ELIZABETH SCANZELLO | Sales & Marketing Staff | ✓ | ✓ |
| CYNTHIA MOUZON | Technician | ✓ | ✓ |
| RICARDO ALANIZ | Regional Director | ✓ | ✓ |
| CARISSA MAGLUTAC | Program Manager | ✓ | ✓ |
| KRISTY BOYD | District Manager | ✓ | ✓ |
| LOUIE REYES | District Manager | ✓ | ✓ |
| RACHEL HOFFMAN | Planning Manager | ✓ | ✓ |
| DANIELLE CURTIN | Planning Manager | ✓ | ✓ |
| CHRISTINA JUNG | Graphic Layouter | ✓ | ✓ |
| HEATHER BRINGMAN | Layout Engineer | ✓ | ✓ |
| DANIELLE VELAZQUEZ | Graphic Layouter | ✓ | ✓ |

### Pagination
- 21 pages of contacts for OLD NAVY
- Pagination: 1 | 2 | 3 | 4 | 5 | ... | 20 | 21

### Actions
- **Selected contacts: 0** - counter of selected
- **[Request Contacts (0)]** - button to request selected contacts

### Data Source
Contact data appears to come from D&B (Dun & Bradstreet) business database, linked via DUNS number.

### Key Functionality
- Browse employee directory for any company
- Filter by role/level/function
- Select specific contacts
- Request contact details (email/phone)
- Likely a **paid/credit-based feature** for actual contact info

---

## Screen 9: Global Trade Database (Multi-Country Trade Data)

**Purpose:** Search across global import/export records from multiple countries (not just US)

### Breadcrumb Navigation
```
Home / Global Trade Database / [Year ▼] / Type: [Import/Export ▼]
```

**Year Selector:**
| Year | Notes |
|------|-------|
| 2025 | Current/latest |
| 2024 | |
| 2023 | |
| 2022 | |
| 2021 | |
| 2020 | |
| 2019 | |
| 2018 | Oldest available |
| **Global Stats** | Aggregated statistics view |

**8 years of historical data** (2018-2025)

**Type Selector:**
| Option | Description |
|--------|-------------|
| Export | Export records only |
| Import | Import records only |
| Import/Export | Both directions |

### Active Search Filter Display

When filters are applied, shows query string:
```
Supplier Country : CHINA AND Entire Fields : "indoor temperature sensor*"
```

With links: **Queries detail** | **Clear All**

### Scale
- **574,785,216 records** - nearly 575 million trade records!
- Date range: Jan 1, 2025 to Dec 31, 2025 (full year)

### Tabs Available
- Result View
- Visualize View
- Trend by
- Total by
- Grid Report
- Rankings

*(Note: No Buyer/Supplier/Duty Rates/Contacts tabs like US data)*

### Left Sidebar Filters

**Buyer** (with record counts):
| Buyer | Records |
|-------|---------|
| TMM ALMACENADORA... | 95.32 M |
| REDPACK SA DE... | 10.82 M |
| IMILE DELIVER... | 10.69 M |
| ENVOGUE STYLE... | 4.97 M |
| DHL EXPRESS M... | 3.48 M |

**Supplier** (with record counts):
| Supplier | Records |
|----------|---------|
| AMAZON EXPORT... | 6.54 M |
| MARYLEBONE (CN) | 4.79 M |
| AMAZON EXPORT... | 2.29 M |
| AMAZON EXPORT... | 1.68 M |
| MOTOROLA MOBI... | 1.04 M |

**HS Code (6)** (with record counts):
| HS Code | Records |
|---------|---------|
| 990100 - SPEC... | 125.43 M |
| 392690 - ARTI... | 12.94 M |
| 980710 - SPEC... | 9.64 M |
| 732690 - ARTI... | 6.51 M |
| 870899 - PART... | 5.51 M |

**Data Source** (country data origin):
| Source | Records |
|--------|---------|
| MEXICO - IMPORT | 158.02 M |
| VIETNAM - IMPORT | 69.67 M |
| INDIA - IMPORT | 57.30 M |
| VIETNAM - EXPORT | 56.07 M |
| INDIA - EXPORT | 39.85 M |

**Trade Direction:**
| Direction | Records |
|-----------|---------|
| IMPORT | 437.70 M |
| EXPORT | 137.16 M |

**Trade Type:**
| Type | Description |
|------|-------------|
| BILLS | Bill of Lading records |
| DECLARATIONS | Customs declaration records |

### Results Table Columns

| Column | Description | Example |
|--------|-------------|---------|
| Row | Checkbox | ☐ |
| Date | Transaction date | 12/31/2025 |
| Data Source | Country + type | 🇺🇸 USA - BILLS IMPORTS |
| Buyer | Importing company | BLESSING INC |
| Buyer Country | Buyer's country | UNITED STATES OF AMERICA |
| Supplier | Exporting company | SHENZHENSHI ZHAOMU |
| Supplier Country | Supplier's country | CHINA |
| HS Code | Full code + description | 621600 - GLOVES, MITTENS AND MITTS, NOT KNIT OR CROCHETED |
| Product Description | Item detail | GLOVES, PAPER TRAY COVER, MEN'S % POLYESTER % SPANDEX |
| Quantity | Amount | 9,680.00 |
| Unit | UOM | KILOGRAMS |
| Value | Monetary value | 100,920.26 |
| Trade Direction | IMPORT or EXPORT | IMPORT |

### Sample Data Visible

| Date | Buyer | Supplier | Country | HS Code | Product | Qty | Value |
|------|-------|----------|---------|---------|---------|-----|-------|
| 12/31/2025 | NOT AVAILABLE | SHENZHENSHI ZHAOMU | CHINA | 621600 | GLOVES | 9,680 kg | $100,920 |
| 12/31/2025 | BLESSING INC | SHENZHENSHI ZHAOMU | CHINA | 482390 | PAPER TRAY COVER | 18,620 kg | $59,557 |
| 12/31/2025 | AUKRU HIGH TECH CO | HANGZHOU QIANQI | CHINA | 620343 | MEN'S POLYESTER SHORTS | 11,120 kg | $143,980 |
| 12/31/2025 | AUKRU HIGH TECH CO | HANGZHOU QIANQI | CHINA | 610443 | LADIES POLYESTER DRESS | 11,740 kg | $79,213 |
| 12/31/2025 | AUKRU HIGH TECH CO | HANGZHOU QIANQI | CHINA | 611030 | LADIES KNITTED JACKET | 14,300 kg | $130,943 |
| 12/31/2025 | BLESSING INC | SHENZHENSHI ZHAOMU | CHINA | 610990 | T-SHIRTS, SINGLETS | 16,950 kg | $116,418 |
| 12/31/2025 | YOLONG INDUSTRIAL | SHENZHEN YIJUN I&E | CHINA | 961700 | VACUUM FLASKS, STEEL CUP | 10,370 kg | - |

### Buyer Filter Modal (Select Buyer to add)

Top buyers in Global Trade Database:

| Buyer | Records | | Buyer | Records | | Buyer | Records |
|-------|---------|---|-------|---------|---|-------|---------|
| TMM ALMACENADORA | 95.32 M | | FORD VN CO, LTD | 778.64 K | | CORREOS DE COSTA RICA | 532.80 K |
| REDPACK SA DE CV | 10.82 M | | INDITEX TRENT RET... | 748.66 K | | ROLCARGO EXPRESS | 514.19 K |
| IMILE DELIVERY SE... | 10.73 M | | MS FUYU CO LTD | 722.88 K | | HMCL NILOY BANGLA | 503.87 K |
| ENVOGUE STYLES GL... | 4.97 M | | HARASHIMA SHINJI | 680.71 K | | MYNTRA JABONG INDIA | 503.51 K |
| DHL EXPRESS MEXIC... | 3.48 M | | BERSHKA MEXICO SA | 677.72 K | | TOYOTA KIRLOSKAR | 497.55 K |
| LAAR COURIER EXPR... | 2.38 M | | CONG TY TNHH HANW... | 670.83 K | | SAMSUNG INDIA ELE... | 492.10 K |
| ESTAFETA MEXICANA | 2.11 M | | ELCA COSMETICS PR... | 591.87 K | | ATI MOTORS (BD) | 478.16 K |
| EMPRESA PUBLICA S... | 1.59 M | | ZARA MEXICO SA DE... | 582.72 K | | YUSK UKRAINE LLC | 464.92 K |
| PADGET ELECTRONIC... | 1.53 M | | SEHC (VN) | 576.91 K | | LUXOTTICA INDIA E... | 450.08 K |
| IMPORTADORA AMAZO... | 1.44 M | | TOYOTA VIETNAM MO... | 574.12 K | | LIMITED LIABILITY... | 444.72 K |
| FEDERAL EXPRESS H... | 862.96 K | | SNC VIETNAM ELECT... | 533.87 K | | BMW INDIA PRIVATE... | 423.11 K |

### Supplier Filter Modal (Select Supplier to add)

Top suppliers in Global Trade Database:

| Supplier | Records | | Supplier | Records | | Supplier | Records |
|----------|---------|---|----------|---------|---|----------|---------|
| AMAZON EXPORT SAL... | 6.54 M | | TRUPER SA DE CV | 644.10 K | | SAMSUNG ELECTRONI... | 410.94 K |
| MARYLEBONE (CN) | 4.79 M | | NISSAN MOTOR INDI... | 586.47 K | | ISUZU MOTORS OPER... | 407.23 K |
| AMAZON EXPORT SAL... | 2.29 M | | AMAZON.COM, LLC | 562.87 K | | HONGKONG BOSUN LI... | 398.48 K |
| AMAZON EXPORT SAL... | 1.71 M | | MAZDA MOTOR (JP) | 528.76 K | | SEVT (VN) | 357.21 K |
| MOTOROLA MOBILITY... | 1.06 M | | GUAPISACA VASQUEZ... | 509.65 K | | SEHC (VN) | 354.73 K |
| TTI PARTNERS SPC | 832.42 K | | TOYOTA MOTOR MANU... | 495.12 K | | LUXSHARE PRECISIO... | 354.56 K |
| NO DETERMINADO (B... | 822.43 K | | HERO MOTOCORP LIM... | 492.33 K | | SUZUKI MOTORCYCLE... | 350.34 K |
| CLOUD NETWORK TEC... | 734.29 K | | TVS MOTOR COMPANY... | 486.19 K | | CVC (VN) | 333.30 K |
| INDIA YAMAHA MOTO... | 728.93 K | | XIAOMI HK (CN) | 486.06 K | | TOYOTA KIRLOSKAR | 329.05 K |
| GUAPISACA VASQUEZ... | 706.33 K | | SKYPOSTAL INC (US... | 470.24 K | | MCFLY (CN) | 318.99 K |
| MARUTI SUZUKI IND... | 694.36 K | | KIRAN GEMS PRIVAT... | 453.67 K | | WISTRON TECHNOLOG... | 314.15 K |
| BAJAJ AUTO LIMITE... | 658.41 K | | EICHER MOTORS LIM... | 431.55 K | | NIVODA LLP (IN) | 311.72 K |

### Key Differences from US Maritime Data

| Feature | US Maritime | Global Trade Database |
|---------|-------------|----------------------|
| Data source | CBP AMS only | Multiple countries |
| Record types | Bills of Lading | Bills + Declarations |
| Tabs | 10 tabs (inc. Buyer, Supplier, Contacts) | 6 tabs (no company intel) |
| Scale | ~200K in 6 days | ~575M in 1 year |
| Company details | D&B integration, contacts | Basic names only |
| Trade direction | Import only | Import + Export |

### Countries with Data (from Data Source filter)
- Mexico (Import)
- Vietnam (Import + Export)
- India (Import + Export)
- *And likely many more in "see more"*

### Visualize View (Global Trade Database)

**4 Dashboard Widgets:**

| Widget | Chart | Top Values |
|--------|-------|------------|
| **Supplier Country** | Pie | China 39.8%, Vietnam 26.1%, USA 9%, India 8%, Mexico 4% |
| **Buyer Country** | Pie | Mexico 33.7%, Vietnam 27.7%, India 10%, USA 9%, Indonesia 4% |
| **Supplier** | Pie | Amazon Export (97.2% of shown), Marylebone, Motorola |
| **Buyer** | Pie | TMM Almacenadora 16.6%, others |

**Export options:** Configure, Excel, PDF

### Total by / Trend by Dropdown Options (Global)

**17 aggregation dimensions:**

| Dimension | Description |
|-----------|-------------|
| Buyer | Importing company |
| Buyer Country | Buyer's country |
| Buyer Region | Buyer's geographic region |
| Data Source | Country + direction |
| HS Code | Full HS code |
| HS Code (2) | 2-digit chapter |
| HS Code (4) | 4-digit heading |
| HS Code (6) | 6-digit subheading |
| Month | Time grouping |
| Supplier | Exporting company |
| Supplier Country | Supplier's country |
| Supplier Region | Supplier's geographic region |
| Trade Direction | Import vs Export |
| Trade Lane | Origin→Destination route |
| Trade Type | Bills vs Declarations |
| Transport Method | Ocean/Air/Land |

### Total by Supplier Country (Sample Data)

**Pie chart:** Top Supplier Country

**Massive quantities visible:**

| # | Supplier Country | Quantity | % |
|---|------------------|----------|---|
| 1 | 🇨🇳 CHINA | 2,515,821,258,514 | 25.72% |
| 2 | 🇺🇸 UNITED STATES | 1,223,691,437,171 | 12.51% |
| 3 | 🇧🇷 BRAZIL | 939,747,461,374 | 9.61% |
| 4 | 🇻🇳 VIET NAM | 873,719,086,994 | 8.93% |
| 5 | 🇮🇳 INDIA | 435,503,607,051 | 4.45% |
| 6 | 🇯🇵 JAPAN | 414,339,757,263 | 4.24% |
| 7 | 🇮🇩 INDONESIA | 347,753,495,678 | 3.56% |
| 8 | 🇲🇽 MEXICO | 254,763,049,410 | 2.60% |
| 9 | 🇰🇷 KOREA (REPUBLIC OF) | 251,546,872,930 | 2.57% |
| 10 | 🇰🇿 KAZAKHSTAN | 239,938,249,696 | 2.45% |
| | **TOTALS** | **9,782,050,484,354** | **100%** |

**Pagination:** 26 pages of countries

**Note at bottom:** "Values for Data Sources USA Import Bills and USA Export Bills are estimated figures derived from calculations conducted by Datamyne."

### Key Global Trade Insights

**Top 5 Exporting Countries (by quantity):**
1. China (25.7%) - dominant
2. USA (12.5%)
3. Brazil (9.6%)
4. Vietnam (8.9%)
5. India (4.5%)

**Top 5 Importing Countries (by records):**
1. Mexico (159M records, 28%)
2. Vietnam (91M, 16%)
3. India (59M, 10%)
4. USA (51M, 9%)
5. Indonesia (20M, 4%)

---

## Screen 10: Global Trade Database - Trend by View (Time Series Analysis)

**Purpose:** Analyze trade data over time with stacked area charts and monthly breakdown tables

### Breadcrumb Navigation
```
Home / Global Trade Database / 2025 / Type: Import/Export
```

### Tabs Available
```
Result View | Visualize View | [Trend by ▼] | Total by ▼ | Grid Report | Rankings
```

### Chart Controls

**4 Control Dropdowns:**

| Control | Options | Description |
|---------|---------|-------------|
| **Measure** | - | Fixed label (not dropdown) |
| **Records ▼** | Records, Quantity, Value, Teus | Y-axis metric |
| **Time Scale** | - | Fixed label (not dropdown) |
| **Months ▼** | Months, Quarters, Halves, Years | X-axis grouping |

**Measure Dropdown Options:**
| Option | Description |
|--------|-------------|
| Records | Count of trade records |
| Quantity | Total quantity in units |
| Value | Total USD value |
| Teus | Twenty-foot Equivalent Units (containers) |

**Time Scale Dropdown Options:**
| Option | Description |
|--------|-------------|
| Months | Monthly breakdown (Jan-Dec) |
| Quarters | Q1, Q2, Q3, Q4 |
| Halves | H1, H2 |
| Years | Annual totals |

### Stacked Area Chart

**Chart Title:** "Data Source"

**Visualization:**
- Multi-series stacked area chart
- X-axis: Months (01/2025 - 12/2025)
- Y-axis: Records (0 - 50,000)
- Each data source shown as different colored layer

**Legend (Data Sources Shown):**
| Color | Data Source |
|-------|-------------|
| 🔵 Blue | VIETNAM - IMPORT - DECLARATIONS |
| 🔴 Red | INDIA - IMPORTS - DECLARATIONS |
| 🟡 Yellow | VIETNAM - EXPORT - DECLARATIONS |
| 🟢 Green | MEXICO - IMPORTS - DECLARATIONS |
| 🟣 Purple | MEXICO - EXPORTS - DECLARATIONS |
| 🔷 Light Blue | INDIA - EXPORT - DECLARATIONS |
| 🟤 Brown | INDONESIA - IMPORT - DECLARATIONS |
| 🟠 Orange | UKRAINE - IMPORT - DECLARATIONS |
| ⚪ Gray | PHILIPPINES - IMPORT - DECLARATIONS |
| ⬛ Dark | USA - IMPORTS - BILLS |

### Chart Actions
| Button | Function |
|--------|----------|
| Hide Chart | Collapse chart to show only table |
| Excel ▼ | Export data to Excel |
| ☰ | Additional view options |

### Data Table Below Chart

**Columns:**
| Column | Description |
|--------|-------------|
| Data Source | Country + Direction + Type (clickable link) |
| 01/2025 | January value |
| 02/2025 | February value |
| ... | (all 12 months) |
| 12/2025 | December value |
| Total | Row total |

### Sample Monthly Data (2025)

| Data Source | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | **Total** |
|-------------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----------|
| VIETNAM - IMPORT - DECLARATIONS | 31,499 | 32,433 | 41,033 | 42,429 | 44,979 | 44,268 | 46,727 | 45,836 | 47,838 | 47,477 | 0 | 0 | **424,519** |
| INDIA - IMPORTS - DECLARATIONS | 21,486 | 17,694 | 22,169 | 20,923 | 23,667 | 19,218 | 25,283 | 23,833 | 23,060 | 23,774 | 21,032 | 0 | **242,139** |
| VIETNAM - EXPORT - DECLARATIONS | 16,925 | 17,351 | 21,173 | 20,965 | 21,640 | 22,524 | 23,616 | 24,638 | 24,121 | 25,588 | 0 | 0 | **218,541** |
| MEXICO - IMPORTS - DECLARATIONS | 14,229 | 14,140 | 15,096 | 15,239 | 14,865 | 14,364 | 16,201 | 15,339 | 14,983 | 16,598 | 13,964 | 0 | **165,018** |
| MEXICO - EXPORTS - DECLARATIONS | 6,149 | 7,273 | 7,346 | 7,516 | 7,495 | 7,458 | 7,958 | 7,271 | 7,243 | 8,393 | 6,888 | 0 | **80,990** |
| INDIA - EXPORTS - DECLARATIONS | 7,518 | 6,395 | 8,094 | 7,533 | 6,346 | 7,115 | 7,342 | 8,146 | 6,800 | 7,644 | 5,638 | 0 | **78,571** |
| INDONESIA - IMPORT - DECLARATIONS | 8,060 | 8,414 | 8,188 | 8,099 | 7,878 | 6,678 | 9,928 | 9,262 | 0 | 0 | 0 | 0 | **66,507** |
| UKRAINE - IMPORT - DECLARATIONS | 3,401 | 3,515 | 3,958 | 3,990 | 4,100 | 4,208 | 4,634 | 4,066 | 4,341 | 4,425 | 0 | 0 | **40,638** |
| PHILIPPINES - IMPORT - DECLARATIONS | 4,156 | 4,220 | 4,951 | 4,328 | 3,883 | 4,296 | 4,865 | 4,106 | 0 | 0 | 0 | 0 | **34,805** |
| USA - IMPORTS - BILLS | 3,887 | 2,621 | 3,039 | 2,858 | 2,793 | 2,633 | 2,990 | 2,706 | 2,020 | 2,152 | 1,916 | 2,004 | **31,619** |

**Table Totals Row:**
| | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | **Grand Total** |
|---|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----------------|
| **Total** | 117,310 | 114,056 | 135,047 | 133,880 | 137,646 | 132,762 | 149,544 | 145,203 | 130,406 | 136,051 | 49,438 | 2,004 | **1,383,347** |

### Pagination
- **Results: 61 rows** across 7 pages
- Navigation: 1 | 2 | 3 | 4 | 5 | 6 | 7

### Data Observations

**Key Patterns Visible:**
- Vietnam (imports) dominates with 424K records
- Nov/Dec 2025 data not yet available for most sources (shows 0.00)
- USA Bills data available through December
- Monthly volumes range from ~114K to ~149K records

---

## Screen 11: Global Trade Database - Total by View (Aggregation)

**Purpose:** Aggregate trade data by any dimension with bar chart visualization

### Total by Dropdown Options

**17 Dimensions Available:**

| Dimension | Description |
|-----------|-------------|
| Buyer | Aggregate by importing company |
| Buyer Country | Aggregate by buyer's country |
| Buyer Region | Aggregate by buyer's region |
| **Data Source** | Aggregate by country/direction/type |
| HS Code | Aggregate by full HS code |
| HS Code (2) | Aggregate by 2-digit chapter |
| HS Code (4) | Aggregate by 4-digit heading |
| HS Code (6) | Aggregate by 6-digit subheading |
| Month | Aggregate by month |
| Supplier | Aggregate by exporting company |
| Supplier Country | Aggregate by supplier's country |
| Supplier Region | Aggregate by supplier's region |
| Trade Direction | Aggregate by import/export |
| Trade Lane | Aggregate by origin→destination route |
| Trade Type | Aggregate by bills vs declarations |
| Transport Method | Aggregate by ocean/air/land |

### Total by Data Source View

**Bar Chart:**
- Title: "Data Source by Records"
- Vertical bars showing record counts by data source
- Interactive - clicking drills into that data source

**Table Columns:**
| Column | Description |
|--------|-------------|
| ☐ | Checkbox for selection |
| Data Source | Country + Direction + Type (clickable link) |
| Records | Count of records (clickable) |
| Quantity | Total quantity |
| Value | Total USD value |
| Teus | Container count |

### Complete Data Source List (All 50+ Sources)

**Top Data Sources (Full List):**

| Data Source | Records | Quantity | Value | Teus |
|-------------|---------|----------|-------|------|
| VIETNAM - IMPORT - DECLARATIONS | 424,519 | 1,382,804,895.63 | 2,501,410,326.80 | 0.00 |
| INDIA - IMPORTS - DECLARATIONS | 242,139 | 26,854,865.81 | 1,319,452,735.91 | 0.00 |
| VIETNAM - EXPORT - DECLARATIONS | 218,541 | 279,790,344.04 | 3,001,381,619.24 | 0.00 |
| MEXICO - IMPORTS - DECLARATIONS | 165,018 | 126,958,515.69 | 3,092,619,185.62 | 0.00 |
| MEXICO - EXPORTS - DECLARATIONS | 80,990 | 246,222,579.68 | 8,365,447,023.57 | 0.00 |
| INDIA - EXPORTS - DECLARATIONS | 78,571 | 50,665,345.35 | 726,729,560.83 | 0.00 |
| INDONESIA - IMPORT - DECLARATIONS | 66,507 | 25,456,071.05 | 620,194,101.09 | 0.00 |
| UKRAINE - IMPORT - DECLARATIONS | 40,638 | 4,418,002.96 | 214,429,868.63 | 0.00 |
| PHILIPPINES - IMPORT - DECLARATIONS | 34,805 | 10,220,415.21 | 450,704,267.42 | 0.00 |
| USA - IMPORTS - BILLS | 31,619 | 404,605,920.91 | 15,173,500,289.18 | 69,427.69 |
| ARGENTINA - IMPORT - DECLARATIONS | 31,135 | 2,497,821.00 | 230,489,346.81 | 0.00 |
| BRASIL - IMPORT - BILLS | 30,882 | 651,628,163.97 | 0.00 | 131,736.00 |
| USA - EXPORTS - BILLS | 18,293 | 273,507,178.39 | 7,570,680,803.60 | 85,531.85 |
| KAZAKHSTAN - IMPORT - DECLARATIONS | 17,606 | 4,071,127.92 | 175,848,157.40 | 0.00 |
| CHILE - IMPORT - DECLARATIONS | 17,158 | 5,993,478.00 | 260,032,922.70 | 0.00 |
| PERU - IMPORT - DECLARATIONS | 16,913 | 3,506,303.83 | 117,822,655.22 | 0.00 |
| UZBEKISTAN - IMPORT - DECLARATIONS | 16,726 | 10,932,963.36 | 383,049,576.52 | 0.00 |
| INDONESIA - EXPORT - DECLARATIONS | 16,170 | 10,974,369.97 | 280,003,864.38 | 0.00 |
| ECUADOR - IMPORT - DECLARATIONS | 12,956 | 1,557,082.55 | 63,696,904.70 | 0.00 |
| PAKISTAN - IMPORT - DECLARATIONS | 11,359 | 1,094,434.57 | 56,654,528.36 | 0.00 |
| SRI LANKA - IMPORTS - DECLARATIONS | 10,573 | 1,684,885.13 | 37,190,547.82 | 0.00 |
| COSTA RICA - IMPORT - DECLARATIONS | 10,533 | 1,570,242.87 | 58,582,540.28 | 0.00 |
| BANGLADESH - IMPORT | 8,118 | 7,941,650.63 | 188,950,991.04 | 0.00 |
| COLOMBIA - IMPORT - DECLARATIONS | 7,916 | 4,516,017.62 | 116,407,756.08 | 0.00 |
| UKRAINE - EXPORT - DECLARATIONS | 6,285 | 2,882,777.09 | 57,616,269.36 | 0.00 |
| PANAMA - IMPORT - DECLARATIONS | 4,069 | 1,258,295.38 | 34,925,682.71 | 0.00 |
| URUGUAY - IMPORT - DECLARATIONS | 4,010 | 1,173,100.78 | 36,105,629.01 | 0.00 |
| BOLIVIA - IMPORT DECLARATIONS | 3,703 | 246,960.09 | 10,011,148.67 | 0.00 |
| PARAGUAY - IMPORT - DECLARATIONS | 3,330 | 693,919.16 | 27,765,729.08 | 0.00 |
| NIGERIA - IMPORT | 3,201 | 8,585,719.53 | 70,790,288.76 | 0.00 |
| GHANA - IMPORT | 3,131 | 2,267,607.58 | 21,140,616.53 | 0.00 |
| COSTA RICA - EXPORT - DECLARATIONS | 3,001 | 809,372.87 | 33,509,916.39 | 0.00 |
| INDIA FREE TRADE ZONE - IMPORT | 2,882 | 399,532.00 | 29,443,293.60 | 0.00 |
| ETHIOPIA - IMPORT - DECLARATIONS | 2,580 | 10,472,315.22 | 112,648,916.13 | 0.00 |
| COTE D'IVOIRE - IMPORT | 2,181 | 3,516,068.00 | 31,366,381.33 | 0.00 |
| INDIA FREE TRADE ZONE - EXPORT | 2,162 | 2,436,226.00 | 101,572,771.77 | 0.00 |
| ECUADOR - EXPORT - DECLARATIONS | 1,878 | 79,179.34 | 2,393,817.43 | 0.00 |
| NICARAGUA - IMPORT | 1,799 | 1,049,661.37 | 25,949,112.59 | 0.00 |
| PHILIPPINES - EXPORT - DECLARATIONS | 1,766 | 59,973.66 | 49,233,273.16 | 0.00 |
| RUSSIA - IMPORT - DECLARATIONS | 1,473 | 2,082,602.09 | 114,975,822.25 | 0.00 |
| CAMEROON - IMPORT - DECLARATIONS | 1,181 | 1,726,306.28 | 44,723,866.34 | 0.00 |
| KAZAKHSTAN - EXPORT - DECLARATIONS | 1,107 | 235,779.36 | 15,578,869.88 | 0.00 |
| CHILE - EXPORT - DECLARATIONS | 989 | 318,244.00 | 10,959,830.07 | 0.00 |
| SRI LANKA - EXPORTS - DECLARATIONS | 854 | 1,407,743.61 | 34,378,368.25 | 0.00 |
| PERU - EXPORT - DECLARATIONS | 732 | 82,628.26 | 1,740,182.55 | 0.00 |
| COLOMBIA - EXPORT - DECLARATIONS | 654 | 1,116,741.05 | 42,126,732.54 | 0.00 |
| UZBEKISTAN - EXPORT - DECLARATIONS | 627 | 122,288.20 | 4,050,313.86 | 0.00 |
| COTE D'IVOIRE - EXPORT | 354 | 1,038,699.00 | 10,978,425.27 | 0.00 |
| URUGUAY - EXPORT - DECLARATIONS | 343 | 39,086.10 | 2,487,748.18 | 0.00 |
| RUSSIA - EXPORT - DECLARATIONS | 276 | 447,754.50 | 50,187,667.78 | 0.00 |
| BRASIL - EXPORT - BILLS | 249 | 6,574,710.33 | 0.00 | 705.00 |
| BANGLADESH - EXPORT | 127 | 86,116.13 | 1,809,252.64 | 0.00 |
| GHANA - EXPORT | 105 | 92,456.88 | 9,857,616.08 | 0.00 |
| PARAGUAY - EXPORT - DECLARATIONS | 79 | 46,283.16 | 1,086,437.38 | 0.00 |
| PANAMA - EXPORT - DECLARATIONS | 61 | 30,232.53 | 699,207.18 | 0.00 |
| BOLIVIA - EXPORT DECLARATIONS | 58 | 894.98 | 190,204.57 | 0.00 |
| CAMEROON - EXPORT - DECLARATIONS | 48 | 156,859.01 | 2,642,079.48 | 0.00 |
| PAKISTAN - EXPORT - DECLARATIONS | 32 | 8,788.00 | 184,876.01 | 0.00 |
| NICARAGUA - EXPORT | 29 | 3,011.33 | 46,196.04 | 0.00 |
| ETHIOPIA - EXPORT - DECLARATIONS | 18 | 288,373.50 | 3,048.45 | 0.00 |
| NIGERIA - EXPORT | 5 | 71,719.00 | 21,289.51 | 0.00 |

### Grand Totals

| Metric | Value |
|--------|-------|
| **Total Records** | 1,665,065 |
| **Total Quantity** | 3,591,380,701.51 |
| **Total Value (USD)** | $45,998,480,454.02 |
| **Total TEUs** | 287,400.55 |

### Key Observations from Data

**Data Type Distribution:**
| Type | Count | Notes |
|------|-------|-------|
| DECLARATIONS | ~50 sources | Most countries provide customs declarations |
| BILLS | 4 sources | USA Import/Export, Brasil Import/Export |

**Countries with Both Import + Export:**
- Vietnam ✓
- India ✓
- Mexico ✓
- Indonesia ✓
- Ukraine ✓
- Chile ✓
- Peru ✓
- Colombia ✓
- Costa Rica ✓
- Sri Lanka ✓
- Paraguay ✓
- Uruguay ✓
- Bolivia ✓
- Cameroon ✓
- Ecuador ✓
- Russia ✓
- Kazakhstan ✓
- Uzbekistan ✓
- Panama ✓
- Philippines ✓
- Bangladesh ✓
- Ghana ✓
- Nigeria ✓
- Ethiopia ✓
- Cote d'Ivoire ✓

**Countries with Import Only:**
- Argentina
- Pakistan
- Nicaragua

**Countries with Bill of Lading Data (not declarations):**
- USA (Import + Export Bills)
- Brasil (Import + Export Bills)

**Special Data Sources:**
- India Free Trade Zone (Import + Export) - separate from regular India data

### Footer Disclaimers

**Note 1:** "Values for Data Sources USA Import Bills and USA Export Bills are estimated figures derived from calculations conducted by Datamyne."

**Note 2:** "Data is based on Bills of Lading or Customs Declarations for the following countries: Argentina, Bangladesh, Bolivia, Brazil, Cameroon, Chile, Colombia, Costa Rica, Côte d'Ivoire, Ecuador, Ethiopia, Ghana, India, India FTZ, Indonesia (data available through September 2021 and 2023 - current), Kazakhstan, Mexico, Moldova (data available through May 2023), Nicaragua, Nigeria, Pakistan, Panama, Paraguay, Peru, Philippines, Russia, Sri Lanka, Turkey (data available from 2021 - September 2024), Ukraine, United States, Uruguay, Uzbekistan, Venezuela, Vietnam."

### Countries with Limited Data Availability

| Country | Data Availability |
|---------|-------------------|
| Indonesia | Through Sept 2021 and 2023-current (gap) |
| Moldova | Through May 2023 |
| Turkey | From 2021 - September 2024 |

---

## Screen 12: Global Trade Database - Total by Transport Method

**Purpose:** Analyze trade data by mode of transportation

### Bar Chart
**Title:** "Transport Method by Records"
- X-axis: Transport Method categories
- Y-axis: Records (0 - 500,000)
- Results: **7 rows**

### Transport Method Data

| Transport Method | Records | Quantity | Value (USD) | TEUs |
|------------------|---------|----------|-------------|------|
| **AIR** | 434,550 | 68,011,210.89 | $2,636,783,620.73 | 0.00 |
| **MARITIME** | 426,184 | 1,788,565,698.62 | $27,210,041,440.29 | 287,400.55 |
| **ROAD** | 230,395 | 349,574,507.55 | $9,635,862,978.99 | 0.00 |
| **OTHERS** | 218,836 | 287,492,151.80 | $1,757,342,286.01 | 0.00 |
| **RAIL** | 1,900 | 1,188,866.15 | $37,473,505.95 | 0.00 |
| **NOT CLASSIFIED** | 259,881 | 1,061,533,829.99 | $3,565,198,732.39 | 0.00 |
| **NOT DECLARED** | 93,319 | 35,014,436.50 | $1,155,777,889.67 | 0.00 |
| **Total** | **1,665,065** | **3,591,380,701.51** | **$45,998,480,454.02** | **287,400.55** |

### Key Insights

**Record Distribution:**
| Mode | % of Records | Notes |
|------|--------------|-------|
| Air | 26.1% | High volume, lower per-shipment quantity |
| Maritime | 25.6% | Only mode with TEU data |
| Road | 13.8% | Cross-border trucking |
| Others | 13.1% | Mixed/multimodal |
| Not Classified | 15.6% | Data quality issue |
| Not Declared | 5.6% | Missing data |
| Rail | 0.1% | Very small share |

**Value Distribution:**
| Mode | % of Value | Avg Value/Record |
|------|------------|------------------|
| Maritime | 59.2% | $63,851 |
| Road | 21.0% | $41,825 |
| Not Classified | 7.8% | $13,720 |
| Air | 5.7% | $6,068 |
| Others | 3.8% | $8,030 |
| Not Declared | 2.5% | $12,386 |
| Rail | 0.08% | $19,723 |

**Key Observation:** Maritime has highest value despite similar record count to Air because ship freight = bulk cargo

---

## Screen 13: Global Trade Database - Total by Trade Lane

**Purpose:** Analyze trade flows between origin and destination countries

### Bar Chart
**Title:** "Trade Lane by Records"
- Shows top trade corridors
- Results: **3,211 rows** (many country pairs!)

### Top Trade Lanes

| Trade Lane | Records | Quantity | Value (USD) | TEUs |
|------------|---------|----------|-------------|------|
| CHINA → VIET NAM | 219,155 | 1,221,497,047.09 | $1,138,534,101.23 | 0.00 |
| VIET NAM → VIET NAM | 188,250 | 276,362,677.71 | $1,683,979,098.61 | 0.00 |
| MEXICO → UNITED STATES | 64,923 | 236,753,052.93 | $7,743,749,879.18 | 966.40 |
| CHINA → INDIA | 54,983 | 13,964,599.51 | $336,924,369.34 | 0.00 |
| GERMANY → INDIA | 40,317 | 565,811.05 | $156,211,293.64 | 0.00 |
| UNITED STATES → MEXICO | 39,215 | 76,262,224.05 | $868,613,470.46 | 122.85 |
| JAPAN → VIET NAM | 36,836 | 9,149,832.05 | $73,022,175.69 | 0.00 |
| CHINA → MEXICO | 30,738 | 20,304,769.51 | $707,569,184.90 | 47.10 |
| JAPAN → INDIA | 28,884 | 1,706,828.64 | $124,595,722.69 | 0.00 |
| KOREA (REP.) → VIET NAM | 28,127 | 9,838,988.77 | $127,944,979.95 | 0.00 |
| CHINA → INDONESIA | 26,953 | 10,090,303.55 | $292,217,323.26 | 0.00 |
| VIET NAM → UNITED STATES | 23,647 | 66,772,718.18 | $1,136,966,177.22 | 5,257.17 |
| INDIA → UNITED STATES | 23,446 | 31,122,048.68 | - | - |

### Trade Lane Pattern Analysis

**Top Export Origins (from → ):**
1. CHINA → multiple destinations (dominant)
2. VIET NAM → multiple destinations
3. MEXICO → USA
4. UNITED STATES → Mexico
5. GERMANY → India
6. JAPAN → Vietnam, India

**Top Import Destinations (→ to):**
1. VIET NAM (from China, Japan, Korea)
2. INDIA (from China, Germany, Japan)
3. UNITED STATES (from Mexico, Vietnam, India)
4. MEXICO (from USA, China)
5. INDONESIA (from China)

**Intra-Country Trade:**
- VIET NAM → VIET NAM: 188,250 records (domestic/re-export?)

### Trade Lane Format
```
[ORIGIN COUNTRY] -> [DESTINATION COUNTRY]
```

---

## Screen 14: Global Trade Database - Total by Trade Type

**Purpose:** Compare Bills of Lading vs Customs Declarations

### Bar Chart
**Title:** "Trade Type by Records"
- Only 2 categories
- Results: **2 rows**

### Trade Type Breakdown

| Trade Type | Records | Quantity | Value (USD) | TEUs |
|------------|---------|----------|-------------|------|
| **DECLARATIONS** | 1,584,021 | 2,255,064,727.91 | $23,254,299,361.25 | 0.00 |
| **BILLS** | 81,044 | 1,336,315,973.60 | $22,744,181,092.77 | 287,400.55 |
| **Total** | **1,665,065** | **3,591,380,701.51** | **$45,998,480,454.02** | **287,400.55** |

### Key Insights

**Distribution:**
| Type | % Records | % Quantity | % Value |
|------|-----------|------------|---------|
| Declarations | **95.1%** | 62.8% | 50.6% |
| Bills | **4.9%** | 37.2% | 49.4% |

**Critical Observations:**

1. **Declarations dominate by count** - 95% of records are customs declarations
2. **Bills have higher per-record value** - $280,646 avg vs $14,681 for declarations
3. **TEU data ONLY from Bills** - Container counts only available for BOL data
4. **Value nearly equal** - Despite fewer records, Bills represent nearly 50% of value

**Why This Matters:**
- Bills of Lading = high-value maritime shipments with container details
- Declarations = customs records from foreign countries, higher granularity but less detail

---

## Screen 15: Global Trade Database - Total by Supplier Region

**Purpose:** Analyze global trade by geographic region of supplier/exporter

### Bar Chart
**Title:** "Supplier Region by Records"
- Results: **23 rows** (UN geographic regions)

### Complete Supplier Region Data

| Supplier Region | Records | Quantity | Value (USD) | TEUs |
|-----------------|---------|----------|-------------|------|
| **EASTERN ASIA** | 596,597 | 1,897,824,813.07 | $9,549,111,790.59 | 102,319.52 |
| **SOUTH-EASTERN ASIA** | 391,862 | 519,617,695.58 | $6,473,237,510.74 | 18,972.61 |
| **NORTHERN AMERICA** | 248,569 | 667,384,111.66 | $18,209,920,831.80 | 99,804.14 |
| **WESTERN EUROPE** | 143,338 | 225,828,455.86 | $4,493,816,274.70 | 42,872.81 |
| **SOUTHERN ASIA** | 96,928 | 95,995,796.74 | $1,396,759,681.46 | 4,814.53 |
| **EASTERN EUROPE** | 55,894 | 39,166,063.64 | $2,023,863,289.34 | 1,093.99 |
| **SOUTHERN EUROPE** | 46,706 | 52,956,891.21 | $1,017,049,538.30 | 8,337.57 |
| **NORTHERN EUROPE** | 31,488 | 36,537,074.91 | $1,396,687,031.64 | 5,501.41 |
| **NOT AVAILABLE** | 20,140 | 11,045,417.37 | $337,643,417.85 | 0.18 |
| **SOUTH AMERICA** | 12,974 | 31,657,761.23 | $672,502,927.68 | 2,898.59 |
| **WESTERN ASIA** | 5,732 | 4,066,543.03 | $120,862,934.06 | 341.90 |
| **CENTRAL AMERICA** | 4,144 | 3,007,876.47 | $69,390,827.12 | 174.25 |
| **NORTHERN AFRICA** | 3,792 | 1,062,958.71 | $37,698,010.11 | 46.81 |
| **AUSTRALIA AND NEW ZEALAND** | 3,264 | 684,975.63 | $101,690,874.41 | 83.14 |
| **CENTRAL ASIA** | 2,043 | 850,554.60 | $29,987,632.27 | 13.60 |
| **SOUTHERN AFRICA** | 552 | 459,407.66 | $15,414,897.74 | 25.19 |
| **WESTERN AFRICA** | 545 | 1,952,089.47 | $24,146,157.53 | 5.40 |
| **CARIBBEAN** | 387 | 774,822.23 | $23,204,789.90 | 77.94 |
| **EASTERN AFRICA** | 63 | 343,968.90 | $704,604.44 | 0.00 |
| **MIDDLE AFRICA** | 32 | 112,406.76 | $3,245,089.56 | 5.17 |
| **MICRONESIA** | 6 | 34,919.33 | $970,990.87 | 8.29 |
| **POLYNESIA** | 6 | 16,096.44 | $569,029.79 | 3.50 |
| **MELANESIA** | 1 | 1.00 | $2,322.16 | 0.00 |
| **Total** | **1,665,065** | **3,591,380,701.51** | **$45,998,480,454.02** | **287,400.55** |

### Regional Analysis

**Top 5 Export Regions by Records:**
| Rank | Region | Share |
|------|--------|-------|
| 1 | Eastern Asia (China, Japan, Korea) | 35.8% |
| 2 | South-Eastern Asia (Vietnam, Indonesia) | 23.5% |
| 3 | Northern America (USA, Canada, Mexico) | 14.9% |
| 4 | Western Europe | 8.6% |
| 5 | Southern Asia (India, Pakistan) | 5.8% |

**Top 5 Export Regions by Value:**
| Rank | Region | Value | Avg $/Record |
|------|--------|-------|--------------|
| 1 | Northern America | $18.2B | $73,257 |
| 2 | Eastern Asia | $9.5B | $16,009 |
| 3 | South-Eastern Asia | $6.5B | $16,522 |
| 4 | Western Europe | $4.5B | $31,353 |
| 5 | Eastern Europe | $2.0B | $36,209 |

**Key Insight:** Northern America has highest total value despite fewer records = high-value exports (machinery, vehicles, tech)

### Geographic Region Definitions (UN Standard)

| Region | Countries Include |
|--------|-------------------|
| Eastern Asia | China, Japan, South Korea, Taiwan, Hong Kong |
| South-Eastern Asia | Vietnam, Indonesia, Philippines, Thailand, Malaysia |
| Northern America | USA, Canada, Mexico |
| Western Europe | Germany, France, Netherlands, Belgium |
| Southern Asia | India, Pakistan, Bangladesh, Sri Lanka |
| Eastern Europe | Russia, Ukraine, Poland, Kazakhstan |
| Southern Europe | Italy, Spain, Portugal |
| Northern Europe | UK, Sweden, Denmark, Norway |

---

## Screen 16: US Maritime Data - Total by Dropdown (Full Options)

**Purpose:** Shows all aggregation dimensions available for US BOL data (more than Global Trade)

### Total by Dropdown - 29 Dimensions

**Note:** 3 dimensions include **"with maps"** visualization option

| Dimension | Description | Map? |
|-----------|-------------|------|
| Carrier | Shipping line/vessel operator | |
| Consignee (Consolidated) | Consolidated importer name | |
| Consignee (Unified) | Entity-resolved importer | |
| Consignee City | Importer city | |
| Consignee County | Importer county | |
| Consignee Declared | Raw declared importer name | |
| Consignee Dom. Ult. Duns | Domestic Ultimate DUNS | |
| Consignee DUNS | Company DUNS number | |
| Consignee State | Importer state | |
| Consignee Zip Code | Importer ZIP | |
| Country by Place of Receipt | Origin country by receipt location | **with maps** |
| Country by Port of Departure | Origin country by departure port | **with maps** |
| Country of Origin | Country where goods originated | **with maps** |
| Final Destination | Ultimate destination in US | |
| HS Code (2) | 2-digit chapter | |
| HS Code (4) | 4-digit heading | |
| HS Code (6) | 6-digit subheading | |
| Master Consignee (Unified) | Parent company importer | |
| Month | Time period | |
| Place of Receipt | Foreign location of receipt | |
| Port of Arrival | US port of entry | |
| Port of Departure | Foreign port of departure | |
| Shipper (Unified) | Entity-resolved exporter | |
| Shipper Declared | Raw declared exporter name | |
| State of Port of Arrival | US state of entry | |
| US Region | Geographic US region | |
| World Region by Country of Origin | UN region of origin | |
| World Region by Place of Receipt | UN region by receipt | |
| World Region by Port of Departure | UN region by departure | |

### Comparison: US Maritime vs Global Trade Dimensions

| US Maritime Only | Global Trade Only | Both Have |
|------------------|-------------------|-----------|
| Consignee (Consolidated) | Buyer | Month |
| Consignee (Unified) | Buyer Country | HS Code (2,4,6) |
| Consignee City/County/State/Zip | Buyer Region | Supplier/Shipper |
| Consignee DUNS (2 types) | Data Source | Trade Direction |
| Master Consignee | Trade Lane | Country of Origin |
| Final Destination | Trade Type | Transport Method |
| Place of Receipt | Supplier Country | |
| Port of Arrival/Departure | Supplier Region | |
| US Region | | |
| World Region (3 types) | | |
| **with maps** options | | |

**Key Difference:** US Maritime has much richer consignee/importer data (DUNS, geography, entity resolution) because it comes from CBP AMS with D&B enrichment.

---

## Screen 17: US Maritime - Contacts Tab (Company Contact Search)

**Purpose:** Search for employee contacts at importing/exporting companies

### Tab Location
```
Result View | Visualize View | Trend by | Total by | Buyer | Supplier | Grid Report | Rankings | Duty Rates | [NEW: Contacts]
```

**Results indicator:** "Results [ 0 contacts ]" - shows contact count

### Contact Search Interface

**Company Search:**
```
[Company name] [Type at least 3 to add filter...]
```

**Contact Filters:**

| Filter | Type | Description |
|--------|------|-------------|
| **Includes:** | | |
| Email | ☐ Checkbox | Filter to contacts with email |
| Phone number | ☐ Checkbox | Filter to contacts with phone |
| **Dropdowns:** | | |
| Job function | Dropdown | Filter by job function ▼ |
| Job level | Dropdown | Filter by job level ▼ |
| Job title | Dropdown | Filter by job title ▼ |

### Left Sidebar Filters (While on Contacts Tab)

**Country of Origin:**
| Country | Records |
|---------|---------|
| 🇨🇳 CHINA | 878.49 K |
| 🇨🇦 CANADA | 862.81 K |
| 🇲🇽 MEXICO | 695.39 K |
| 🇧🇷 BRAZIL | 408.94 K |
| 🇻🇳 VIETNAM | 367.69 K |

**Port of Arrival:**
| Port | Records |
|------|---------|
| NEW YORK/NEWARK | 919.32 K |
| NEW ORLEANS, LA | 901.23 K |
| LOS ANGELES, CA | 619.04 K |
| LONG BEACH, CA | 588.51 K |
| PHILADELPHIA, PA | 402.85 K |

**Carrier:**
| Carrier | Records |
|---------|---------|
| AET INC PTE L... | 427.50 K |
| MAERSK LINE | 277.29 K |
| MSC-MEDITERRANEAN | 276.45 K |
| CMA-CGM (CMDU) | 245.99 K |
| DAMPSKIBSSELS... | 224.58 K |

### More Filters (Expanded)

| Filter | Type | Options |
|--------|------|---------|
| Consignee Email | Expand | Has/doesn't have email |
| Consignee Telephone | Expand | Has/doesn't have phone |
| Consignee Type | Expand | Company type |
| Consignees Blank | Expand | Missing consignee |
| Consignees Not Blank | Expand | Has consignee |
| Containerized | Expand | Yes/No |
| Metric Tons | Expand | Weight ranges |

### Contact Data Source

Based on integration with **D&B (Dun & Bradstreet)** database:
- Employee directories from D&B business data
- Linked via DUNS numbers
- Includes email, phone, job titles
- **Likely a premium/credit-based feature** for actual contact reveal

### Use Case

1. Find all companies importing from China
2. Filter to specific HS codes (your products)
3. Go to Contacts tab
4. Search for decision-makers (job level: VP, Director)
5. Filter for contacts with email
6. Request contact details for outreach

**Sales Intelligence Feature** - This is how trade data becomes sales leads.

---

## Screen 18: USA Bills Import MASTERS (Primary BOL View)

**Purpose:** Main Bill of Lading search results - the core shipment-level data view

### Header & Navigation

**Breadcrumb:**
```
Home / 🇺🇸 United States ▼ / Cargo MASTERS ▼ / In Transit: No ▼
```

**Page Title:** USA Bills Import MASTERS

**Date Range Available:** **Jan 1, 2004 to Jan 6, 2026** (22+ years of historical data!)

**Results:** 165,885 shipments

### Search Controls

| Control | Options |
|---------|---------|
| Field Selector | Entire B/L ▼ |
| Search Input | "Start Here" placeholder |
| Boolean | AND ▼ |
| [Search] | Execute search |
| Advanced Query ✓ | Toggle advanced mode |

### Tabs Available
```
Result View | Visualize View | Trend by ▼ | Total by ▼ | Buyer | Supplier | Grid Report | Rankings | [NEW: Contacts]
```

### Export Options
- Excel ▼ (export dropdown)
- 📅 Calendar view
- ☰ Grid/list toggle

### Left Sidebar Filters

**Country of Origin:**
| Country | Records |
|---------|---------|
| 🇨🇳 CHINA | 56.50 K |
| 🇻🇳 VIET NAM | 18.90 K |
| 🇮🇳 INDIA | 9.57 K |
| 🇹🇭 THAILAND | 6.26 K |
| 🇭🇰 HONG KONG | 5.68 K |

**Port of Arrival:**
| Port | Records |
|------|---------|
| LOS ANGELES, CA | 32.01 K |
| NEW YORK/NEWARK | 31.58 K |
| LONG BEACH, CA | 24.40 K |
| SAVANNAH, GA | 13.13 K |
| HOUSTON, TX | 11.53 K |

**Carrier:**
| Carrier | Records |
|---------|---------|
| MAERSK LINE | 24.45 K |
| MSC-MEDITERRANEAN | 21.09 K |
| CMA-CGM (CMDU) | 20.71 K |
| HAPAG LLOYD A... | 14.94 K |
| COSCO SHIPPING | 13.77 K |

**More Filters:**
- Consignee Email
- Consignee Telephone
- Consignee Type
- Consignees Blank
- Consignees Not Blank
- Containerized
- Metric Tons

### Results Table Columns

| Column | Description | Example |
|--------|-------------|---------|
| Row | Row # + checkbox | 1 ☐ |
| Date | Shipment date | 01/06/2026 |
| Bill of Lading Nbr. | Unique BOL ID | ZIMUZSH1038149 |
| Consignee Declared | US importer name | THE AMES COMPANIES, INC. |
| Shipper Declared | Foreign exporter name | EAST CROWN INTERNATIONAL TRADING |
| Short Container Description | Product description | STANDARD, TUBE, ANGLE SUPPORT HTS CODE: ... |
| Country of Origin | Source country | CHINA |
| Port of Arrival | US entry port | TAMPA, FL |
| Final Destination | US final destination | NOT DECLARED |
| Weight | Shipment weight | 51,671.00 |
| Weight Unit | Weight unit | LB |
| Quantity | Package count | 30.00 |
| Quantity Unit | Package type | PKG, CTN |

### Sample BOL Records

| # | Date | BOL# | Consignee | Shipper | Description | Origin | Port |
|---|------|------|-----------|---------|-------------|--------|------|
| 1 | 01/06/2026 | ZIMUZSH1038149 | THE AMES COMPANIES, INC. | EAST CROWN INTERNATIONAL TRADING | STANDARD, TUBE, ANGLE SUPPORT HTS CODE: ... | CHINA | TAMPA,FL |
| 2 | 01/06/2026 | ZIMUXNG7007254 | OEC MIAMI | OEC LOGISTICS (QINGDAO) CO.,LTD | LIGHT WELDED WIRE MESH... EMAIL:ALL.TJN@OECGROUP.COM.CN | CHINA | TAMPA,FL |
| 3 | 01/06/2026 | ZIMUXIA8522749 | TANERA TRANSPORT LLC | ORIENT STAR TRANSPORT INT'L LTD. | GRANITE BASES GRANITE MEMORIALS... IMPORT@TANERATRANSPORT.COM | HONG KONG | TAMPA,FL |
| 4 | 01/06/2026 | ZIMUXIA8522730 | TANERA TRANSPORT LLC | ORIENT STAR TRANSPORT INT'L LTD. | IRON DOORS THIS SHIPMENT CONTAINS NO WOOD... | HONG KONG | TAMPA,FL |
| 5 | 01/06/2026 | ZIMUXIA8522041 | MTS LOGISTICS INC | HONOUR LANE SHIPPING LTD | STORAGE CABINET... ANNIEXIEXM@HLSHOLDING.COM.CN | HONG KONG | TAMPA,FL |
| 6 | 01/06/2026 | ZIMUXIA8519934 | EVEREST GLOBAL FREIGHT SERVICES INC | MAXWILL LOGISTICS INC. | STORAGE CABINET... E:EGFARRIVALNOTICE@EVERES | CHINA | TAMPA,FL |
| 7 | 01/06/2026 | ZIMUTPE8265572 | BTX GLOBAL | M&R | PARTS OF WATER PUMP HS CODE: ... | TAIWAN | TAMPA,FL |

### Key Observations

**1. Contact Info Embedded in Descriptions:**
The product description field often contains:
- Email addresses (EMAIL:ALL.TJN@OECGROUP.COM.CN)
- Fax numbers (FAX: ...)
- Attention contacts (ATTN: IMPORT@...)
- This is likely how Datamyne extracts contact data!

**2. [MORE] Links:**
Truncated descriptions have [MORE] clickable links to expand

**3. Real-Time Data:**
- Data available through Jan 6, 2026 (2 days ago as of Jan 8)
- Near real-time CBP AMS data feed

**4. 22 Years Historical:**
- Data goes back to Jan 1, 2004
- Massive historical database for trend analysis

**5. BOL Number Format:**
- Carrier prefix (ZIM = Zim Shipping)
- Unique identifier
- Can be used to track specific shipments

### Data Sources Revealed

This view shows **CBP AMS (Automated Manifest System)** data:
- Required for all ocean shipments to US
- Filed 24-48 hours before vessel departure
- Contains shipper, consignee, product description, weight, quantity
- Does NOT contain value (no customs value on BOL)

---

## Screen 19: [TBD]

*Waiting for screenshot*

---

## 📊 Data Types Reference

### Bill of Lading (Maritime) Data
Contains shipment-level detail:
- Shipper name & address
- Consignee name & address
- Notify party
- Vessel name
- Port of lading / unlading
- Container numbers
- Product description
- Weight / quantity
- HTS codes (sometimes)

**Source:** CBP Automated Manifest System (AMS)

### Census Trade Data
Aggregated statistics:
- Total import/export value by HTS code
- Quantity by unit of measure
- Country of origin/destination
- By district, port, or state

**Source:** US Census Bureau

### Customs Declarations (Foreign)
Full customs entry records:
- Importer/exporter details
- Product descriptions
- Values and quantities
- HTS codes
- Duties paid

**Source:** Country-specific customs agencies

---

## 🔧 Technical Requirements (To Build Similar)

*To be filled in after all screens documented*

### APIs & Data Sources Needed

| Data Type | Source | Access Method |
|-----------|--------|---------------|
| US Maritime BOL | CBP AMS | Commercial license required |
| US Census Trade | Census Bureau | Public API (free) |
| Foreign Declarations | Various customs agencies | Country-specific agreements |
| Company Intelligence | D&B, proprietary | Commercial APIs |

### Database Requirements

| Table | Purpose |
|-------|---------|
| Countries | List of available countries |
| DataSources | Available databases per country |
| DataFreshness | Last update timestamps |
| SavedQueries | User saved searches |
| *[More TBD based on search results screens]* |

---

## 📝 Running Notes

- Data has ~2-3 month lag (Jan 8 update shows data through Oct 31)
- Different countries have different data availability
- US has most options (8 database types)
- Other countries typically have declarations + census
- UI is functional but dated (circa 2010s enterprise)

---

*Continue adding Datamyne screens as captured*

---
---

# PART 2: DESCARTES CUSTOMSINFO (customsinfo.com)

**A separate Descartes product focused on tariff research, classification, and compliance**

## Product Comparison

| Attribute | CustomsInfo | Datamyne |
|-----------|-------------|----------|
| **Focus** | Tariff research & classification | Trade intelligence & BOL data |
| **Primary Users** | Customs brokers, compliance teams | Sales, supply chain analysts |
| **Data Type** | Regulations, rulings, HTS codes | Shipment records, company data |
| **URL** | customsinfo.com | datamyne.com |

---

## CI Screen 1: CustomsInfo Dashboard (Landing Page)

**Purpose:** Central hub for tariff research and compliance tools

### Header Navigation (12 modules!)

| Tab | Color | Description |
|-----|-------|-------------|
| Home | Gray | Dashboard |
| CI Search | Gray | Search across all databases |
| Research Tools | Gray | Tariff schedules, rulings |
| Classification* | Gray | Classification tools |
| GTIM | Blue | Global Trade Item Management |
| GistNet | Blue | GistNet integration |
| Trade Tools | Blue | Trade calculation tools |
| Export Control | Blue | Export compliance |
| **U.S. Census Analytics** | Orange | Census trade data |
| **Compliance Workbench** | Orange | Compliance management |
| **Alternative Supplier Search** | Orange | Supplier sourcing |
| **Denied Party Screening** | Orange | Restricted party screening |

**Orange tabs = Premium modules (likely separate subscription)**

### Dashboard Layout

**Page Title:** "Search Descartes CustomsInfo™ January Edition"

**Sub-tabs:** Dashboard | CIAlerts | Projects

**Left Panel:**
- ☐ Recently Viewed
- ☐ Saved Searches

**Center Panel - News and Events:**
1. CI Reference Version 25-07 Release Notes
2. CI Reference Version 25-01 Release Notes
3. US Penalty Rates
4. CI Reference Version 24-08 Release Notes

**Descartes Customs Info Solution Suite:**
1. CI Manager
2. Free CI Reference Training and User Guidance

---

## CI Screen 2: Research Tools - North America Tab

**Purpose:** Access tariff schedules, rulings, regulations for US, Canada, Mexico

### Regional Tabs
```
[North America] | Europe | Trade Agreements
```

### United States Section (26 document types!)

| Document | Description |
|----------|-------------|
| US Ruling Documents | CBP classification rulings |
| **US 2026 Harmonized Tariff** | Current HTS schedule |
| WCO Explanatory Notes | HS classification guidance |
| US CBP Decisions | Customs decisions |
| US CBP Bulletins | Official bulletins |
| US CIT Cases | Court of International Trade |
| US CAFC Cases | Federal Circuit Court of Appeals |
| US Code of Federal Regulations Title 19 | 19 CFR customs regs |
| US Schedule B Export tables | Export codes |
| US Title 19 Code | Customs statutes |
| TSCA Chemical Substances Inventory | Chemical regs |
| ADD/CVD and Scope Decisions | Antidumping/Countervailing |
| US Ports and Brokers | Directory |
| Administrative Messages | CBP notices |
| US Customs related documents | Misc docs |
| US Title 15 Code | Commerce statutes |
| US Export Commerce Control documents | EAR regs |
| 2026 Federal Register | Current Fed Register |
| Commodity Jurisdiction Final Determination | ITAR/EAR jurisdiction |
| Ozone Depleting Chemicals | Environmental |
| US State Dept ITAR | Arms export controls |
| US Quota Book Transmittals | Quotas |
| US Textile Book Transmittals | Textile quotas |
| US Dual Use | Dual-use export controls |

### Canada Section (14 document types)

| Document | Description |
|----------|-------------|
| **Canada 2026 HTS** | Current Canadian tariff |
| Canada Anti-Dumping and Countervailing Duties | AD/CVD orders |
| NAFTA Rules of Origin | Origin rules |
| Canada Advance Rulings for Tariff Classification | Binding rulings |
| Canada Export Codes | Export classifications |
| Canada Case Law (CITT) | Trade tribunal cases |
| Canada Dual Use | Export controls |
| Canadian D-Memos | Customs directives |
| Customs Notices & Proposals | Official notices |
| Acts and Regulations | Legislation |
| Canada Export Control | Export regs |
| NAFTA Decisions and Reports | NAFTA tribunal |

### Mexico Section (3 document types)

- **Mexican HTS** - Current Mexican tariff
- Mexico ADD - Antidumping
- Mexico Dual Use - Export controls

### International Section

- WCO Opinions Compendium
- WCO Explanatory Notes
- WCO Valuation Compendium

### US Federal Register Archive (29 years!)

2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009, 2008, 2007, 2006, 2005, 2004, 2003, 2002, 2001, 2000, 1999, **1998**

---

## CI Screen 3: US Archive (Historical HTS)

**Purpose:** Access historical tariff schedules for retroactive classification

### Archived US HTS (30+ years!)

| Period | Years |
|--------|-------|
| Recent | 2025, 2024, 2023, 2022, 2021, 2020 |
| 2010s | 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010 |
| 2000s | 09, 08, 07, 06, 05, 04, 03, 02, 01, 00 |
| 1990s | 99, 98, 97, **96** |

**Historical data back to 1996!**

### Other Archives

- **Explanatory Notes:** 2012-2025 (14 years)
- **Schedule-B:** 2012-2025
- **Canada Archives:** HTS 2000-2025, Export Codes 2022-2025
- **Mexico Archives:** HTS 2005-2025

---

## CI Screen 4: Research Tools - Europe Tab

**Purpose:** Access European tariff schedules and regulations

### European Union (8 document types)

| Document | Description |
|----------|-------------|
| EU Binding Tariff Information (EBTI) | EU binding rulings |
| **EU 2025 Harmonized Tariff Schedule** | Current EU tariff |
| EUCN Explanatory Notes | EU classification notes |
| EU Export Codes (INTRASTAT) | Export codes |
| Union Customs Code (UCC) | EU customs law |
| ADD/CVD | Trade remedies |
| Rules of Origin | Origin rules |
| EU Dual Use | Export controls |

### United Kingdom (Post-Brexit)

- United Kingdom Rulings
- **United Kingdom 2025 Harmonized Tariff Schedule**
- GB Export Codes

### Switzerland

- Swiss 2025 Harmonized Tariff Schedule
- Swiss Export Codes with OGA
- Swiss Classification Decisions

### Norway

- Norway 2025 Harmonized Tariff Schedule

### Archives

- **EU Archive:** HTS 2011-2025, Export Codes 2011-2025
- **Swiss Archive:** HTS 2011-2025, Export Codes 2011-2025
- **Norway Archive:** HTS 2014-2025
- **UK Archive:** HTS 2021-2025, Export Codes 2021-2025

---

## CI Screen 5: Trade Agreements Database (300+ FTAs!)

**Purpose:** Access rules of origin and preferential rates for ALL global trade agreements

### US Trade Agreements (17)

- NAFTA (legacy)
- USMCA
- CAFTA-DR
- CARICOM
- US-Australia, US-Bahrain, US-Chile, US-Colombia, US-Israel, US-Japan, US-Jordan, US-Korea, US-Morocco, US-Oman, US-Panama, US-Peru, US-Singapore

### Canada Trade Agreements (14)

- USMCA, CPTPP, EU-Canada (CETA), EFTA-Canada
- Bilateral: Chile, Colombia, Costa Rica, Honduras, Israel, Jordan, Korea, Panama, Peru, Ukraine

### Mexico Trade Agreements (25+)

- USMCA, CPTPP, EU-Mexico, EFTA-Mexico, Pacific Alliance
- Bilateral with: Argentina, Brazil, Bolivia, Chile, Colombia, Costa Rica, Cuba, Ecuador, Guatemala, Honduras, Israel, Japan, Nicaragua, Panama, Paraguay, Peru, UK, Uruguay

### Asia Trade Agreements (50+)

**ASEAN Block:**
- ASEAN-Australia-NZ, ASEAN-China, ASEAN-HK, ASEAN-India, ASEAN-Japan, ASEAN-Korea, AFTA, ATISA

**China FTAs:** Cambodia, Costa Rica, Ecuador, Georgia, HK, Macao, Mauritius, NZ, Nicaragua, Korea, Serbia, Singapore

**Japan FTAs:** Australia, Indonesia, Malaysia, Mexico, Mongolia, Peru, Philippines, Singapore, Switzerland, Thailand, Vietnam

**India FTAs:** Afghanistan, Australia, Bhutan, Malaysia, Mauritius, Nepal, Singapore, Thailand, UAE

**Korea FTAs:** Australia, Cambodia, Central America, Chile, Columbia, India, Israel, Singapore, Turkey, Vietnam

**Regional:** RCEP, CPTPP, APTA, CIS

### European Trade Agreements (100+)

**EFTA (30+ partners):** Albania, Bosnia, Canada, Central America, Chile, Colombia, Ecuador, Egypt, Georgia, GCC, HK, Indonesia, Israel, Jordan, Korea, Lebanon, Mexico, Moldova, Montenegro, Morocco, Palestinian Authority, Peru, Philippines, SACU, Serbia, Singapore, Tunisia, Turkey, Ukraine

**EU (50+ partners):** Albania, Algeria, Andorra, Armenia, Bosnia, Cameroon, CARIFORUM, Central America, Chile, Colombia-Peru, Croatia, Eastern/Southern Africa, Egypt, Georgia, Ghana, Iceland, Israel, Japan, Jordan, Kenya, Korea, Lebanon, Mexico, Montenegro, Morocco, NZ, Norway, Palestinian Authority, PNG/Fiji, Moldova, SADC, San Marino, Singapore, South Africa, Switzerland, UK, Vietnam

### UK Trade Agreements (40+ post-Brexit)

Australia, Cameroon, Canada, CARIFORUM, Central America, Chile, Colombia, Cote d'Ivoire, Ecuador-Peru, Egypt, Faroe Islands, Georgia, Ghana, Iceland-Liechtenstein-Norway, Israel, Japan, Jordan, Kenya, Korea, Kosovo, Lebanon, Mexico, Moldova, Morocco, NZ, North Macedonia, Norway, Pacific States, Palestinian Authority, SACU-Mozambique, Serbia, Singapore, Switzerland, Tunisia, Turkey, Ukraine, Vietnam

### Eastern Europe (40+)

**Georgia:** Armenia, Azerbaijan, Kazakhstan, Russia, Turkmenistan, Ukraine
**Kyrgyz Republic:** Armenia, Kazakhstan, Moldova, Russia, Ukraine, Uzbekistan
**Russia:** Azerbaijan, Belarus, Kazakhstan, Moldova, Serbia, Tajikistan, Turkmenistan, Uzbekistan
**Turkey (25+):** Albania, Bolivia, Bosnia, Chile, Croatia, Georgia, Israel, Jordan, Kosovo, Malaysia, Mauritius, Moldova, Montenegro, Morocco, Serbia, Singapore, Syria, Tunisia, UAE
**Ukraine:** Azerbaijan, Belarus, Israel, Kazakhstan, Moldova, Montenegro, Russia, Tajikistan, Turkmenistan, Uzbekistan

### Australian Trade Agreements (10)

ASEAN-ANZ, Australia-Chile, Australia-China, ANZCERTA, PATCRA, Australia-Peru, CPTPP, Japan-Australia, PACER Plus, RCEP, US-Australia

### African Trade Agreements (20+)

**Regional:** AfCFTA, COMESA, EAC, CEMAC, ECOWAS, SACU, SADC, Pan Arab, WAEMU
**Bilateral:** Agadir, EU-Algeria, EU-Cameroon, Morocco-UAE, MERCOSUR-Egypt, MERCOSUR-SACU

### South American Trade Agreements (50+)

**Regional:** Andean Community (CAN), CACM, LAIA, MERCOSUR, Pacific Alliance
**Chile (20+):** China, Colombia, Costa Rica, El Salvador, Guatemala, Honduras, India, Indonesia, Japan, Malaysia, Mexico, Nicaragua, Thailand, Vietnam
**Panama:** Central America, Nicaragua, DR, Peru, Singapore, Taiwan
**Peru:** China, Honduras, Korea, Mexico, Singapore

---

## CustomsInfo vs Datamyne vs Sourcify

| Feature | CustomsInfo | Datamyne | Sourcify Goal |
|---------|-------------|----------|---------------|
| **HTS Lookup** | ✅ Full | ❌ | ✅ Have |
| **Tariff Rates** | ✅ All countries | ❌ | ✅ Have |
| **Trade Agreements** | ✅ 300+ FTAs | ❌ | ⏳ Build |
| **Rulings Database** | ✅ CBP rulings | ❌ | ⏳ Build |
| **Historical HTS** | ✅ 30 years | ❌ | ⏳ Build |
| **Export Codes** | ✅ Schedule B | ❌ | ⏳ Build |
| **BOL Data** | ❌ | ✅ 22 years | 💰 License |
| **Company Intel** | ❌ | ✅ D&B | 💰 License |
| **Contacts** | ❌ | ✅ Database | 💰 License |
| **Census Stats** | ✅ Module | ✅ | ✅ Have API |
| **Denied Party** | ✅ Module | ❌ | ⏳ Build/Buy |
| **Export Control** | ✅ ITAR/EAR | ❌ | ⏳ Build |
| **AI Classification** | ❌ | ❌ | ✅ **Unique!** |
| **Duty Optimization** | ❌ | ❌ | ✅ **Unique!** |
| **Landed Cost** | ❌ | ❌ | ✅ **Unique!** |
| **Modern UX** | ❌ Dated | ❌ Dated | ✅ **Advantage** |
| **SMB Pricing** | ❌ Enterprise | ❌ Enterprise | ✅ **Advantage** |

---

## CI Screen 6: Research Tools - Compliance & Mapping Tools

**Purpose:** Specialized compliance lookup tools and HTS version mapping

### Secondary Navigation Bar
```
DPL Search | 16/17 HTS Mapper | 21/22 HTS Mapper | PGA Info | PGA Lookup | ADD/CVD Info | ADD/CVD Lookup
```

### Denied Parties (DPL) Lookup Tool

| Tool | Description |
|------|-------------|
| **Denied Party Lookup** | Search for People, Companies and other entities that the US government has banned from doing business in the US. **Searches 10 government denied party lists.** |
| **Sanctions Programs** | Link to the US Department of the Treasury's Sanctions Programs |

### HTS Mapper Tool (Historical Code Mapping)

**Purpose:** Map old HTS codes to new codes when schedules change

| Tool | Use Case |
|------|----------|
| 2006/2007 HTS Mapper | Map 2006 or prior US/Canada HTS ↔ 2007 HTS |
| 2011/2012 HTS Mapper | Map 2011 US/Canada HTS ↔ 2012 HTS |
| 2016/2017 HTS Mapper | Map 2016 HTS ↔ 2017 HTS |
| 2021/2022 HTS Mapper | Map 2021 HTS ↔ 2022 HTS |

**Key Feature:** Useful for researching HTS codes found in older documents when codes have changed over time.

### Partner Government Agency Research (PGA)

| Tool | Description |
|------|-------------|
| **PGA Info** | Learn about US Agency codes for importers |
| **PGA Lookup** | Find if HTS has PGA flags (special import restrictions). Requires 10-digit HTS. |
| **ADD/CVD Information** | Find HTS numbers flagged with ADD, CVD or Both |
| **HTS ADDCVD Code Lookup** | Check if specific HTS has ADDCVD codes. Requires 10-digit HTS. |

### External Site Search Links

| Link | Description |
|------|-------------|
| Search United States Sites | Links to search US import/export info |
| Search International Sites | International trade resources |
| Search News Sites | Trade news sources |
| Search Bank and Tool Sites | Financial/tool resources |

### Research Guides for the United States

| Guide | Description |
|-------|-------------|
| **ACE PGA Appendix** | Agency-specific codes and qualifiers for PGA Message Set submission |
| **A Quick Guide to Title 15, Part 30 Foreign Trade Regulations** | Guide for submitting Electronic Export Information (EEI) via AES. Quick reference to FTR. |
| **NCSC-Office of International Trade Telephone Directory** | Contact directory for trade offices |
| **GSP Guidebook** | U.S. Generalized System of Preferences Guidebook |
| **Merchandise Processing Fee and Duty Preference Programs** | How MPF is treated by duty preference programs. Some programs offer MPF exemption. |
| **Most Favored Nations** | WTO Member Nations list |

---

## CI Screen 7: Classification Tool (With AI!)

**Purpose:** Enter product description to get HTS classification suggestions

### Input Interface

| Field | Type | Description |
|-------|------|-------------|
| Item Description | Text input | Free-form product description |
| Country | Dropdown | Target country (e.g., "United States - US") |
| 🔍 | Search button | Execute classification |

---

### Output Section 1: "Datamyne AI Suggestions Based on US Bill of Lading Data"

**Key Feature:** Uses **Datamyne BOL data** to power AI classification suggestions!

| Column | Description |
|--------|-------------|
| **HS Code** | 6-digit HS code (clickable link) |
| **Confidence Score** | Percentage confidence (e.g., 69%, 20%, 11%) |
| **Description** | Full HTS description text |

**How it works:** Analyzes historical BOL shipment descriptions to match your product description.

---

### Output Section 2: "Additional Suggestions"

**Purpose:** Secondary suggestions from import declaration data

| Column | Description |
|--------|-------------|
| **HS Code** | 6-digit code (clickable) |
| **Value** | Short description (from Schedule B/HTS) |
| **Description** | Longer HS description text |
| **CPA Description** | Cross-reference to CPA classification scheme |
| **Source** | Data source (e.g., "US Imports Declarations") |

---

### Key Features Discovered

| Feature | CustomsInfo Has It? | Notes |
|---------|---------------------|-------|
| **AI-powered** | ✅ YES | Based on Datamyne BOL data |
| **Confidence scores** | ✅ YES | Percentages (69%, 20%, 11%) |
| **Multiple suggestions** | ✅ YES | Primary + Additional sections |
| **Ranked results** | ✅ YES | Sorted by confidence |
| **Multiple data sources** | ✅ YES | BOL data + Import Declarations |
| **Cross-reference** | ✅ YES | CPA descriptions included |
| **Clickable codes** | ✅ YES | Links to full HTS details |
| **Justification/reasoning** | ❌ NO | No explanation of WHY |
| **Ruling references** | ❌ NO | No CBP rulings cited |
| **Duty calculation** | ❌ NO | No rates shown |
| **Special tariffs** | ❌ NO | No 301/IEEPA info |
| **Optimization** | ❌ NO | No alternative codes for savings |

---

### Sourcify Competitive Analysis

| Feature | CustomsInfo | Sourcify |
|---------|-------------|----------|
| AI classification | ✅ BOL-based | ✅ LLM-based |
| Confidence scores | ✅ Percentages | ✅ Percentages |
| Multiple suggestions | ✅ 2 tiers | ✅ Ranked list |
| **Reasoning/justification** | ❌ None | ✅ **Full explanation** |
| **CBP rulings** | ❌ None | ✅ **With citations** |
| **Duty rates inline** | ❌ None | ✅ **Automatic** |
| **FTA qualification** | ❌ None | ✅ **Shows savings** |
| **301/IEEPA tariffs** | ❌ None | ✅ **Full coverage** |
| **Optimization** | ❌ None | ✅ **Alternative codes** |

### Key Insight

**CustomsInfo DOES have AI classification** - but it's based on historical BOL text matching, not true semantic understanding. Their approach:
1. Match your description to historical BOL descriptions
2. Return the HS codes from those shipments
3. Show confidence based on frequency/match quality

**Sourcify Advantage:** Our LLM-based approach provides:
- Semantic understanding (not just text matching)
- Reasoning/justification for the classification
- CBP ruling citations as evidence
- Integrated duty calculation and optimization
- Special tariff coverage (301, IEEPA, AD/CVD)

---

## CI Screen 8: ADD/CVD Info (Download)

**Purpose:** Download complete list of HTS codes with ADD/CVD flags

### Interface

**Instruction:** "Click the link below to download the spreadsheet with HTS codes flagged for ADD, CVD or Both."

**Download Link:** [ADD/CVD Flagged HTS CODES]

**Format:** Spreadsheet download (Excel/CSV)

---

## CI Screen 9: HTS ADD/CVD Lookup

**Purpose:** Check if specific HTS code has antidumping or countervailing duties

### Input Fields

| Field | Type | Description |
|-------|------|-------------|
| HTS Code | Text | 10-digit HTS code |
| Description | Text | Optional product description |
| Origin Country | Dropdown | Country of origin |

**Instruction:** "Please enter a valid 10 digit HTS code."

**How it works:** "This tool takes a HTS number and searches for any current ADD/CVD cases that may apply. If a match is found, the result is displayed below."

**Key Feature:** Origin country matters for ADD/CVD - same HTS from different countries may have different duties.

---

## CI Screen 10: HTS PGA Lookup Tool

**Purpose:** Check if HTS code requires Partner Government Agency data submission

### Interface

| Field | Type |
|-------|------|
| HTS Code | Text input |
| [Search] | Button |

**Instruction:** "Please enter a valid HTS code."

**How it works:** "This tool takes a HTS number and searches the US PGA codes for a match. If a match is found, the result is displayed below."

### Example HTS Codes with PGA Requirements

- 2208.90.0100 (spirits/liquor - TTB)
- 3402.11.5050 (detergents - EPA)
- 2208.30.6020 (whiskey - TTB)

---

## CI Screen 11: PGA Info (Complete Agency Code List)

**Purpose:** Reference all Partner Government Agency codes and their meanings

### Header

"Partner Government Agency (PGA) tools are provided to assist in learning what Government Agency restrictions apply to goods."

"Below are links to spreadsheets which contain PGA code information by US Government agency. Click links to download spreadsheets."

### Complete PGA Code Reference

**Lacey Act (Forest/Plant Products):**
| Code | Requirement |
|------|-------------|
| AL1 | Lacey Act specific data **may be required** |
| AL2 | Lacey Act specific data **is required** |

**USDA - Agricultural Marketing Service:**
| Code | Requirement |
|------|-------------|
| AM2 | Shell eggs data is required |
| AM4 | Marketing orders data is required |
| AM6 | Peanuts data is required |
| AM7 | Organics data may be required |
| AM8 | Organics data is required |

**APHIS (Animal & Plant Health):**
| Code | Requirement |
|------|-------------|
| AQ1 | APHIS data may be required |
| AQ2 | APHIS data is required |
| AQX | APHIS data may be required (no disclaim required) |

**DEA (Drug Enforcement):**
| Code | Requirement |
|------|-------------|
| DE1 | DEA data may be required |

**DOT (Transportation):**
| Code | Requirement |
|------|-------------|
| DT1 | NHTSA HS-7 data may be required |
| DT2 | NHTSA HS-7 data is required |

**EPA (Environmental Protection):**
| Code | Requirement |
|------|-------------|
| EH1 | Hydrofluorocarbons data may be required (disclaim A only) |
| EH2 | Hydrofluorocarbons data is required |
| EP1 | Ozone Depleting Substances data may be required |
| EP3 | Vehicle and Engines data may be required |
| EP5 | Pesticides data may be required |
| EP7 | Toxic Substances Control Act data may be required |

**FDA (Food & Drug):**
| Code | Requirement |
|------|-------------|
| FD1 | FDA 801(a) data may be required |
| FD2 | FDA 801(a) data is required |
| FD3 | FDA Prior Notice 801(m) may be required |
| FD4 | FDA Prior Notice 801(m) is required |

**FSIS (Food Safety):**
| Code | Requirement |
|------|-------------|
| FS3 | FSIS data may be required (all programs) |
| FS4 | FSIS data is required (all programs) |

**FWS (Fish & Wildlife):**
| Code | Requirement |
|------|-------------|
| FW1 | FWS notification may be required |
| FW2 | FWS data is required |
| FW3 | FWS data may be required (disclaim C or D only) |

**NMFS (Marine Fisheries):**
| Code | Requirement |
|------|-------------|
| NM1 | 370 specific data may be required |
| NM2 | 370 specific data is required |
| NM4 | Antarctic Marine Living Resources data is required |
| NM5 | Highly Migratory Species data may be required |
| NM6 | Highly Migratory Species data is required |
| NM8 | Seafood Import Monitoring Program (SIMP) data is required |

**State Department:**
| Code | Requirement |
|------|-------------|
| OM2 | Bureau of Oceans, Office of Marine Conservation data is required |

**TTB (Alcohol & Tobacco):**
| Code | Requirement |
|------|-------------|
| TB1 | TTB data may be required (add TTB program codes) |
| TB3 | TTB data may be required (disclaim A or C only) |

---

## CI Screen 12: 2021/2022 HTS Mapping Tool

**Purpose:** Map HTS codes between 2021 and 2022 tariff schedule versions

### Interface

**Title:** "2021/2022 Mapping Tool"

**Instruction:** "Enter a valid 2021 or 2022 HTS code. If there is a change to the 2021/2022 HTS code submitted, the resulting HTS codes will be shown. If there is no change, no results will be shown."

| Field | Type | Options |
|-------|------|---------|
| Country | Dropdown | (see below) |
| HTS Code | Text | Enter code to map |

**Direction Buttons:**
| Button | Function |
|--------|----------|
| [2021 → 2022] | Map 2021 code to 2022 equivalent |
| [2021 ← 2022] | Map 2022 code to 2021 equivalent |

### Country Options (2021/2022 Mapper)

| Country | Code |
|---------|------|
| ✓ WCO Only | (default - 6-digit) |
| Brazil | BR |
| Canada | CA |
| China | CN |
| European Union | EU |
| European Union Export | EU Export |
| Hong Kong | HK |
| United States | US |

---

## CI Screen 13: 2016/2017 HTS Mapping Tool

**Purpose:** Map HTS codes between 2016 and 2017 versions (major HS revision year)

### Interface

| Field | Type |
|-------|------|
| Select Country | Dropdown |
| Enter HTS Code | Text input |

**Direction Buttons:**
- [2016 ==> 2017]
- [2016 <== 2017]

**Note:** "If there is a change to the 2016/2017 HTS code submitted, the resulting HTS codes will be shown. If there is no change to the 2016 code, then no result will be shown."

### Example Codes

| Schedule | Example Codes |
|----------|---------------|
| WCO | 030382, 030389 |
| United States | 0302541100, 5402590000 |
| EU Export | 84238900, 87039010, 85059020 |

### Country Options (2016/2017 Mapper - More Countries!)

| Country |
|---------|
| ✓ WCO Only |
| United States |
| European Union |
| EU Export |
| Canada |
| Switzerland |
| Brazil |
| Hong Kong |

### Upsell

"Have a lot of items to update? Don't forget about our **classification support services**."
Contact: contentinfo@descartes.com

---

## CI Screen 14: Denied Party Lookup (DPL) Tool

**Purpose:** Screen entities against US government denied party lists

### Search Interface

| Field | Type | Options |
|-------|------|---------|
| First | Text | First name |
| Last | Text | Last name |
| Type | Dropdown | Any Type ▼ |
| Country | Dropdown | All Countries ▼ |
| Source | Dropdown | All Sources ▼ (see below) |
| Address | Text | Street address |
| City | Text | City name |
| Other | Text | Additional search |
| [Search] | Button | Execute search |
| Updated since | Date | Filter by update date |
| Calendar | Picker | January 2026 |

### Source Dropdown - The 10 Government Denied Party Lists

| # | List | Agency |
|---|------|--------|
| 1 | **SDN & Blocked Persons** | OFAC (Treasury) |
| 2 | **US BIS EAR Entity List** | BIS (Commerce) |
| 3 | **US BIS Denied Persons List** | BIS (Commerce) |
| 4 | **Statutorily Debarred Parties** | State Dept |
| 5 | **US BIS Unverified List** | BIS (Commerce) |
| 6 | **USDS Nonproliferation Sanctions** | State Dept |
| 7 | **Uyghur Forced Labor Entity List** | DHS/CBP |
| 8 | **WMD Trade Control Regulations** | State Dept |
| 9 | **Iran Sanctions Act** | Treasury/State |
| 10 | **Foreign Sanctions Evaders List** | OFAC (Treasury) |

**Default:** All Sources (searches all 10 lists)

### List Descriptions

| List | What It Covers |
|------|----------------|
| **SDN** | Specially Designated Nationals - terrorists, drug traffickers, WMD proliferators |
| **EAR Entity List** | Export Administration Regulations restricted parties |
| **Denied Persons** | Individuals denied export privileges |
| **Debarred Parties** | Parties barred from defense contracts |
| **Unverified List** | Parties BIS cannot verify legitimacy |
| **Nonproliferation** | WMD/missile proliferation concerns |
| **Uyghur Forced Labor** | Entities using Uyghur forced labor |
| **WMD Trade Control** | Weapons of mass destruction related |
| **Iran Sanctions** | Iran sanctions violators |
| **Foreign Sanctions Evaders** | Parties helping evade US sanctions |

### "Sanctions Programs" Link - External Redirect

**Key Discovery:** Clicking "Sanctions Programs" **links out to the official OFAC website** - they don't host this data themselves!

**Redirects to:** `ofac.treasury.gov/sanctions-programs-and-country-information`

**OFAC Website Shows:**
- Full list of active sanctions programs by country
- Program last updated dates
- Links to SDN List, Consolidated Sanctions List, etc.
- License application info
- Civil penalties information

**Active Sanctions Programs (sample from OFAC site):**
| Program | Last Updated |
|---------|--------------|
| Afghanistan-Related Sanctions | Feb 25, 2022 |
| Balkans-Related Sanctions | Nov 20, 2025 |
| Belarus Sanctions | Dec 15, 2025 |
| Burma-Related Sanctions | Nov 12, 2025 |
| Central African Republic Sanctions | Dec 08, 2023 |

**Insight:** CustomsInfo has a **basic DPL lookup** (searches 10 lists) but for full sanctions program details, they just link to the government source. They don't maintain their own comprehensive sanctions database - that's why they upsell to **Descartes MK DPS** for serious compliance needs.

### Free Trial Upsell (Right Panel)

**"Free Trial of Our Web-Based DPS Service"**

"Companies may be fined up to **US $1 million** for transacting business with denied, restricted or sanctioned parties."

**Descartes MK DPS™ Service:**
- 14-day free trial
- Comprehensive denied/restricted party database
- Web-based solution
- Search, view, sort records

**Link:** https://www.descartes.com/crm/denied-party-screening-dps-complimentary-use

### Key Insight

CustomsInfo has a **basic** DPL lookup, but upsells to **Descartes MK DPS** for comprehensive screening. This suggests:
1. Basic DPL in CustomsInfo is limited
2. Full denied party screening is a separate product
3. Major compliance feature = major upsell opportunity

---

## Summary: CustomsInfo Research Tools Sub-Tabs

| Tool | Purpose | Key Feature |
|------|---------|-------------|
| **DPL Search** | Denied party screening | Searches 10 gov lists |
| **16/17 HTS Mapper** | Historical code mapping | 2016 ↔ 2017 |
| **21/22 HTS Mapper** | Recent code mapping | 2021 ↔ 2022 |
| **PGA Info** | Agency requirements list | Full PGA code reference |
| **PGA Lookup** | Check HTS for PGA flags | Single code lookup |
| **ADD/CVD Info** | Download ADD/CVD list | Spreadsheet download |
| **ADD/CVD Lookup** | Check HTS for duties | By code + country |

### Countries Supported in Mappers

| 2021/2022 Mapper | 2016/2017 Mapper |
|------------------|------------------|
| WCO (6-digit) | WCO (6-digit) |
| Brazil | Brazil |
| Canada | Canada |
| China | - |
| EU | EU |
| EU Export | EU Export |
| Hong Kong | Hong Kong |
| United States | United States |
| - | Switzerland |

---

## CI Screen 15: Trade Agreement Rules Lookup by HTS Code

**Purpose:** Enter an HTS code and see ALL trade agreements with applicable rules of origin

### Input Interface

| Field | Type | Description |
|-------|------|-------------|
| HTS Code | Text input | Enter HS/HTS code to search |
| 🔍 | Search | Execute search |
| [+ Save] | Button | Save search |

### Tabs
```
[North America] | Europe | Trade Agreements
```

### Results Display

**Structure:** Shows trade agreements organized by country/region with **count of applicable rules**

| Column | Description |
|--------|-------------|
| Agreement Name | FTA name (e.g., "USMCA") |
| 📄 Icon | Document icon |
| **Number** | Count of rule excerpts (clickable!) |

### Key Feature: Rule Count Indicators

- **Number displayed** = how many rule provisions apply to that HTS under that FTA
- **Blank** = no specific rules found for this HTS
- **Clickable** = click the number to view actual rule of origin text

### Example: Searching "903289"

**Agreements with rules found:**
| Region | Agreement | Rule Count |
|--------|-----------|------------|
| US | NAFTA | 5 |
| US | CAFTA-DR | 1 |
| US | USMCA | **9** |
| US | US-Chile | 1 |
| US | US-Colombia | 1 |
| US | US-Korea | 1 |
| US | US-Panama | 1 |
| US | US-Peru | 1 |
| Mexico | Chile-Mexico | 1 |
| Mexico | Colombia-Mexico | 1 |
| Mexico | CPTPP | 2 |
| Canada | CA-Chile | 2 |
| Canada | Canada-Colombia | 3 |
| Canada | USMCA | **9** |
| Canada | CPTPP | 2 |
| Asia | ASEAN-China | 2 |
| Asia | AFTA | 2 |

---

## CI Screen 16: Rules of Origin Document Viewer

**Purpose:** View actual rule of origin text from trade agreements

### Left Sidebar - Navigation

| Element | Description |
|---------|-------------|
| **Tabs:** Contents / Results / History | Navigate document |
| **Search count** | "🔍 903289 (9)" - shows result count |
| **Filter** | Filter within results |
| **Reset** | Clear filters |
| **Navigation** | ⏮ ◀ ▶ ⏭ (first/prev/next/last) |

### Results List (Clickable Sections)

Shows all matching sections within the agreement:
1. CHAPTER 4 RULES OF ORIGIN (ANNEX 4-B Part 3) 🔴 ← current
2. CHAPTER 4 RULES OF ORIGIN (ANNEX 4-B Part 3)
3. CHAPTER 4 RULES OF ORIGIN (ANNEX 4-B APPENDIX)
4. CHAPTER 4 RULES OF ORIGIN (ANNEX 4-B APPENDIX)
5. CHAPTER 2 NATIONAL TREATMENT AND MARKET ACCESS FOR GOODS
6. CHAPTER 2 NATIONAL TREATMENT AND MARKET ACCESS FOR GOODS

### Main Content - Rule of Origin Text

**Document Header:**
- Title: "CHAPTER 4 RULES OF ORIGIN (ANNEX 4-B Part 3)"
- Section: "Section XVII - Vehicles, Aircraft, Vessels and Associated Transport Equipment (Chapter 86-89)"

**Rule Structure Displayed:**

| Element | Example |
|---------|---------|
| **HS Range** | 86.01-86.02 |
| **Tariff Shift Rule** | "A change to heading 86.01 through 86.02 from any other heading" |
| **RVC Requirement** | "(a) 60 percent where the transaction value method is used; or (b) 50 percent where the net cost method is used" |
| **Time-phased Rules** | "Beginning on January 1, 2023 or three years after entry into force..." |
| **Exceptions** | "except from heading 72.08 through 72.29 or 73.01 through 73.26" |

### Top Right Actions

| Button | Function |
|--------|----------|
| **Back** | Return to search |
| **Terms** | Search terms lookup |
| **Note** | Add personal notes |
| **Projects** | Add to project |
| **Print** | Print document |
| **es / fr** | Language switch (Spanish/French) |

---

## Key Functionality: FTA Rules of Origin Engine

### What This Tool Does

1. **Enter any HTS code**
2. **Instantly see ALL applicable FTAs** with rules for that product
3. **Click to view actual rule text** - tariff shifts, RVC requirements, etc.
4. **Navigate between multiple provisions** for same HTS
5. **Save/print/annotate** for compliance records

### Rule Types Displayed

| Rule Type | Example |
|-----------|---------|
| **Tariff Shift** | "A change to subheading 8607.11 from any other heading" |
| **Regional Value Content** | "60% transaction value OR 50% net cost" |
| **Specific Process** | Manufacturing requirements |
| **Exceptions** | "except from heading 72.08 through 72.29" |
| **Time-phased** | Rules that change on specific dates |
| **De Minimis** | Allowable non-originating content |

### Document Structure (Contents Tab)

They've imported the **full text** of each trade agreement, organized hierarchically:

```
📁 United States-Mexico-Canada Agreement
   ├── ⊞ Information
   ├── ⊞ Agreement Text
   ├── ⊞ Agreement Annexes
   └── ⊞ Side Letters
```

**Key insight:** This is essentially a **document management system** for trade agreements. They:
1. Import the complete agreement PDFs/text
2. Structure them into navigable sections
3. Index by HTS code to enable lookup
4. Link search results to specific sections

**Not AI-powered** - just well-organized document indexing with HTS cross-references.

---

### Sourcify Opportunity

This is a **powerful feature** we should replicate:

| CustomsInfo Has | Sourcify Should Add |
|-----------------|---------------------|
| FTA lookup by HTS | ✅ Same |
| Rule count per FTA | ✅ Same |
| Full rule text | ✅ Same |
| **RVC calculator** | ❌ They don't have | → **We should add!** |
| **Qualification checker** | ❌ They don't have | → **We should add!** |
| **Savings estimate** | ❌ They don't have | → **We should add!** |

**Our advantage:** We can show not just the rules, but:
- "Do you qualify? Enter your BOM"
- "Potential savings: $X if you qualify"
- "Here's what you need to change to qualify"

---

## CI Screen 17: [TBD]

*Continue documenting CustomsInfo screens*