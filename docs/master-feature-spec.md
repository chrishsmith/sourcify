# SOURCIFY MASTER FEATURE SPECIFICATION

> **Created:** January 19, 2026  
> **Status:** PLANNING  
> **Purpose:** Comprehensive feature specification for building the world's best trade intelligence platform  
> **Architecture:** Ralph-compatible PRD structure with bite-sized user stories

---

# EXECUTIVE SUMMARY

## Vision
Build the world's best trade intelligence platform that combines:
- **AI-powered HTS classification** (our unique advantage)
- **Comprehensive duty calculation** with all special tariffs
- **Trade intelligence** (compete with Datamyne)
- **Compliance tools** (compete with CustomsInfo)
- **Supplier discovery & sourcing optimization**
- **Modern, intuitive UX** (2026 standards)
- **Accessible pricing** (no demos, transparent, buy online)

## Target Users
| Persona | Primary Needs | Tier |
|---------|---------------|------|
| **SMB Importer** | Classify products, understand duties, find suppliers | Free → Pro |
| **Customs Broker** | Bulk classification, compliance tools, audit trails | Pro → Business |
| **Compliance Manager** | Denied party screening, ADD/CVD, rulings research | Business |
| **Supply Chain Analyst** | Trade statistics, supplier discovery, cost optimization | Pro → Business |
| **Sales/BD** | Competitor intelligence, supplier contacts, market research | Business |

## Success Criteria
1. User can classify a product and understand total landed cost in < 60 seconds
2. User can discover alternative suppliers/countries and see potential savings
3. User can screen against denied parties and check compliance requirements
4. User can access trade statistics and market intelligence
5. All features work on mobile

---

# PART 1: CURRENT STATE ANALYSIS

## What We Already Have ✅

### Authentication & Users
- [x] Email/password authentication (Better Auth)
- [x] Google OAuth
- [x] User profiles with subscription tiers (free/pro/business/enterprise)
- [x] Usage tracking (classifications per day)
- [x] Stripe integration placeholders

### Classification Engine
- [x] AI-powered HTS classification (V10 engine)
- [x] Confidence scoring with breakdown
- [x] Full HTS hierarchy path display
- [x] Alternative classifications
- [x] Conditional classification (value/size thresholds)
- [x] Material detection
- [x] Chapter detection
- [x] Batch/bulk classification API

### Tariff & Duty Calculation
- [x] Base MFN duty rates from HTS database
- [x] Section 301 tariffs (China Lists 1-4)
- [x] IEEPA tariffs (fentanyl + reciprocal)
- [x] AD/CVD warnings with lookup links
- [x] Special program rates (FTA, GSP)
- [x] Effective rate calculation with full breakdown
- [x] Country tariff profiles database

### Sourcing & Suppliers
- [x] Supplier database schema
- [x] Supplier explorer UI
- [x] Country manufacturing cost database
- [x] HTS cost by country data model
- [x] Shipment records schema (BOL data model)
- [x] Supplier verification schema
- [x] Cost comparison tool

### Data & History
- [x] Search history storage
- [x] Saved products
- [x] Tariff alerts (monitoring)
- [x] Complete HTS database (USITC import)
- [x] HTS embeddings for semantic search

### UI/UX
- [x] Dashboard layout with sidebar navigation
- [x] Mobile-responsive design
- [x] Classification results UI
- [x] Tariff breakdown component
- [x] Dark mode support (partial)

---

## What Competitors Have That We're Missing ❌

### From Datamyne (Trade Intelligence)
| Feature | Datamyne | Sourcify Status |
|---------|----------|-----------------|
| US BOL shipment search | ✅ 22 years | ❌ Schema only |
| Global trade database (50+ countries) | ✅ 575M records | ❌ Not started |
| Company profiles (D&B integration) | ✅ Full | ❌ Not started |
| Contact database (emails, phones) | ✅ Full | ❌ Not started |
| Corporate hierarchy (parent/subsidiary) | ✅ D&B | ❌ Not started |
| Trade statistics visualizations | ✅ Good | ⚠️ Placeholder |
| Trend charts over time | ✅ Good | ❌ Not started |
| Total by (aggregations) | ✅ 28 dimensions | ❌ Not started |
| Search alerts | ✅ Email alerts | ⚠️ Schema only |
| Export to Excel/PDF | ✅ Full | ❌ Not started |
| Saved searches | ✅ Full | ⚠️ Basic |
| Company trade profiles | ✅ Full | ❌ Not started |

### From CustomsInfo (Compliance & Research)
| Feature | CustomsInfo | Sourcify Status |
|---------|-------------|-----------------|
| CBP rulings database search | ✅ Full | ❌ Not started |
| 300+ FTA rules of origin | ✅ Full | ❌ Not started |
| FTA qualification calculator | ❌ | ❌ Not started |
| Historical HTS archives (30 years) | ✅ 1996-present | ❌ Not started |
| HTS version mapper | ✅ 4 mappers | ❌ Not started |
| Denied party screening (10 lists) | ✅ Basic | ❌ Not started |
| PGA requirements lookup | ✅ Full | ❌ Not started |
| ADD/CVD case lookup | ✅ Full | ⚠️ Warning only |
| Federal Register archive | ✅ 29 years | ❌ Not started |
| WCO Explanatory Notes | ✅ Full | ❌ Not started |
| Export control (ITAR/EAR) | ✅ Full | ❌ Not started |
| Schedule B export codes | ✅ Full | ❌ Not started |

---

# PART 2: COMPLETE FEATURE MAP

## 🏠 Module 1: Dashboard & Overview

### 1.1 Home Dashboard
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Recent activity feed | High | Low | ⚠️ Mock |
| Quick classification widget | High | Low | ❌ |
| Saved products summary | High | Low | ❌ |
| Active alerts summary | Medium | Low | ❌ |
| Tariff news/updates feed | Low | Medium | ❌ |
| Usage stats (classifications this month) | Medium | Low | ❌ |
| Quick stats cards (savings, products, etc.) | Low | Low | ✅ Mock |

### 1.2 Global Search
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Universal search bar | High | Medium | ❌ |
| Search HTS codes | High | Low | ✅ |
| Search rulings | Medium | Medium | ❌ |
| Search suppliers | Medium | Low | ⚠️ Basic |
| Search saved products | Medium | Low | ❌ |
| Search trade statistics | Low | Medium | ❌ |
| Recent searches dropdown | Medium | Low | ❌ |

---

## 🏷️ Module 2: HTS Classification

### 2.1 Classification Input
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Product description input | High | Low | ✅ |
| Country of origin selector | High | Low | ✅ |
| Material composition input | Medium | Low | ✅ |
| Intended use input | Medium | Low | ✅ |
| Product images upload | Low | Medium | ❌ |
| Technical specifications input | Low | Low | ❌ |
| Value/quantity input (for conditionals) | Medium | Low | ⚠️ Partial |
| SKU/reference number | Low | Low | ✅ |
| Voice input for description | Low | High | ❌ |

### 2.2 Classification Results
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Primary HTS code with confidence | High | Low | ✅ |
| Full HTS hierarchy path | High | Medium | ✅ |
| Alternative classifications | High | Medium | ✅ |
| Confidence score breakdown | Medium | Low | ✅ |
| AI reasoning/justification | High | Medium | ⚠️ Basic |
| CBP ruling citations | High | High | ❌ |
| Related rulings lookup | Medium | High | ❌ |
| "Why not X" explanations | Medium | High | ❌ |
| Classification history comparison | Low | Medium | ❌ |

### 2.3 Conditional Classification
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Value threshold questions | High | Medium | ✅ |
| Size/weight threshold questions | High | Medium | ✅ |
| Material-based decisions | Medium | Medium | ⚠️ Partial |
| Interactive decision tree | Low | High | ❌ |
| "What if" scenario comparison | Medium | Medium | ❌ |

### 2.4 Classification Actions
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Save to My Products | High | Low | ⚠️ Basic |
| Copy HTS code | High | Low | ✅ |
| Calculate duties (→ Duty Calculator) | High | Low | ✅ |
| Find suppliers (→ Sourcing) | High | Low | ⚠️ Basic |
| Set up tariff alert | Medium | Low | ⚠️ Schema |
| Export classification report (PDF) | Medium | Medium | ❌ |
| Share classification | Low | Low | ❌ |
| Submit for expert review | Low | High | ❌ |

### 2.5 Bulk Classification
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| CSV upload | High | Medium | ⚠️ API only |
| CSV template download | High | Low | ❌ |
| Progress indicator | High | Low | ❌ |
| Error handling/validation | High | Medium | ❌ |
| Results download (Excel) | High | Medium | ❌ |
| Batch history | Medium | Low | ⚠️ Schema |
| Scheduled batch processing | Low | High | ❌ |

---

## 💰 Module 3: Duty Calculation

### 3.1 Duty Calculator
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| HTS code input (manual or from classification) | High | Low | ✅ |
| Country of origin selector | High | Low | ✅ |
| Base MFN duty rate | High | Low | ✅ |
| Section 301 tariffs (China) | High | Medium | ✅ |
| IEEPA tariffs (fentanyl + reciprocal) | High | Medium | ✅ |
| Section 232 tariffs (steel/aluminum) | Medium | Medium | ⚠️ Partial |
| AD/CVD lookup | High | High | ⚠️ Warning only |
| FTA preferential rates | High | High | ⚠️ Basic |
| GSP rates | Medium | Medium | ⚠️ Basic |
| Total effective rate calculation | High | Low | ✅ |

### 3.2 Tariff Breakdown Display
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Visual tariff stack | High | Low | ✅ |
| Program explanations (tooltips) | Medium | Low | ✅ |
| Legal references/citations | Medium | Low | ⚠️ Partial |
| Historical rate comparison | Low | Medium | ❌ |
| Rate change alerts | Medium | Medium | ⚠️ Schema |

### 3.3 Landed Cost Calculator
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Product value input | High | Low | ⚠️ Basic |
| Shipping cost input | High | Low | ⚠️ Basic |
| Insurance cost input | Medium | Low | ❌ |
| Customs fees (MPF, HMF) | High | Medium | ❌ |
| Brokerage fees estimate | Medium | Medium | ❌ |
| Total landed cost | High | Low | ❌ |
| Per-unit cost breakdown | Medium | Low | ❌ |
| Currency conversion | Low | Medium | ❌ |
| Save/compare scenarios | Medium | Medium | ❌ |

### 3.4 Duty Optimization
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Alternative HTS suggestions | High | High | ⚠️ Basic |
| FTA qualification check | High | High | ❌ |
| Country sourcing alternatives | High | Medium | ⚠️ Basic |
| Foreign Trade Zone benefits | Low | Medium | ❌ |
| Drawback eligibility | Low | High | ❌ |
| Temporary import options | Low | Medium | ❌ |
| Savings estimate | High | Medium | ⚠️ Basic |

---

## 🌍 Module 4: Sourcing Intelligence

### 4.1 Country Comparison
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Interactive world map | High | High | ❌ |
| Manufacturing cost by country | High | Medium | ✅ Schema |
| Tariff rate by country | High | Low | ✅ |
| FTA status indicators | High | Low | ⚠️ Basic |
| Lead time estimates | Medium | Medium | ⚠️ Schema |
| Risk scores (political, supply chain) | Low | Medium | ⚠️ Schema |
| Side-by-side country comparison | High | Medium | ❌ |
| Export comparison report | Medium | Medium | ❌ |

### 4.2 Supplier Discovery
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Search by product/HTS code | High | Medium | ⚠️ Basic |
| Filter by country | High | Low | ✅ |
| Filter by certifications | Medium | Low | ⚠️ Schema |
| Filter by company size | Low | Low | ⚠️ Schema |
| Supplier cards with key info | High | Low | ✅ |
| Supplier detail drawer/page | Medium | Medium | ⚠️ Basic |
| Verification badges | Medium | Low | ⚠️ Basic |
| Contact info (paid tier) | Medium | Low | ❌ |
| Save supplier to list | Medium | Low | ⚠️ Schema |
| Request quote (RFQ) | Low | High | ❌ |

### 4.3 Supplier Profiles
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Company overview | High | Low | ⚠️ Basic |
| Location details | Medium | Low | ⚠️ Basic |
| Product categories/capabilities | High | Low | ⚠️ Schema |
| Certifications list | Medium | Low | ⚠️ Schema |
| Quality/reliability scores | Medium | Medium | ⚠️ Schema |
| Trade history (from BOL) | High | High | ❌ |
| Top products shipped | Medium | High | ❌ |
| US importers they supply | Medium | High | ❌ |
| Contact information | Medium | Low | ❌ |
| Similar suppliers | Low | Medium | ❌ |

### 4.4 Trade Intelligence (BOL Data)
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Shipment search | High | High | ❌ |
| Search by company name | High | Medium | ❌ |
| Search by HTS code | High | Medium | ❌ |
| Search by product description | High | Medium | ❌ |
| Search by port | Medium | Low | ❌ |
| Date range filter | High | Low | ❌ |
| Results table with key fields | High | Medium | ❌ |
| Shipment detail view | Medium | Medium | ❌ |
| Export results | Medium | Medium | ❌ |
| Save search | Medium | Low | ❌ |
| Search alerts | Medium | Medium | ❌ |

### 4.5 Trade Statistics & Analytics
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Import volumes by HTS code | High | Medium | ❌ |
| Import volumes by country | High | Medium | ❌ |
| Trade trends over time | High | Medium | ❌ |
| Top importers by product | Medium | High | ❌ |
| Top suppliers by product | Medium | High | ❌ |
| Port statistics | Low | Medium | ❌ |
| Interactive charts (bar, line, pie) | High | Medium | ❌ |
| Data export (CSV, Excel) | Medium | Low | ❌ |
| Dashboard widgets | Medium | Medium | ❌ |

---

## ✅ Module 5: Compliance Tools

### 5.1 Denied Party Screening
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Single entity search | High | Medium | ❌ |
| Search all 10+ government lists | High | High | ❌ |
| OFAC SDN list | High | Medium | ❌ |
| BIS Entity List | High | Medium | ❌ |
| BIS Denied Persons | High | Medium | ❌ |
| Uyghur Forced Labor Entity List | High | Medium | ❌ |
| Other sanctioned lists | Medium | Medium | ❌ |
| Batch screening (CSV upload) | Medium | High | ❌ |
| Fuzzy name matching | Medium | High | ❌ |
| Screening results with match scores | High | Medium | ❌ |
| Export screening report | Medium | Medium | ❌ |
| Audit trail | Medium | Medium | ❌ |
| Scheduled re-screening | Low | High | ❌ |

### 5.2 ADD/CVD Lookup
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Search by HTS code | High | Medium | ❌ |
| Filter by country | High | Low | ❌ |
| Active cases list | High | Medium | ❌ |
| Case details (duties, scope) | Medium | Medium | ❌ |
| Scope determinations | Medium | High | ❌ |
| Link to ITA lookup tool | Medium | Low | ⚠️ |
| New case alerts | Low | Medium | ❌ |

### 5.3 PGA Requirements
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| PGA lookup by HTS code | High | Medium | ❌ |
| List of affected agencies (FDA, EPA, etc.) | High | Low | ❌ |
| Requirement descriptions | Medium | Medium | ❌ |
| Links to agency resources | Medium | Low | ❌ |
| PGA message set codes | Low | Medium | ❌ |

### 5.4 CBP Rulings Database
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Full-text ruling search | High | High | ❌ |
| Search by HTS code | High | Medium | ❌ |
| Search by keyword | High | Medium | ❌ |
| Ruling detail view | High | Medium | ❌ |
| Ruling citations in classification | High | High | ❌ |
| CIT/CAFC case search | Low | High | ❌ |
| Save/bookmark rulings | Low | Low | ❌ |

### 5.5 FTA Rules of Origin
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| FTA lookup by HTS code | High | High | ❌ |
| Show applicable FTAs | High | Medium | ❌ |
| Rule of origin text display | High | Medium | ❌ |
| Tariff shift rules | High | Medium | ❌ |
| Regional Value Content (RVC) rules | High | Medium | ❌ |
| FTA qualification calculator | High | High | ❌ |
| Bill of Materials input | Medium | Medium | ❌ |
| RVC calculation | Medium | High | ❌ |
| Qualification result with savings | High | Medium | ❌ |
| Certificate of Origin guidance | Low | Medium | ❌ |

---

## 📦 Module 6: My Products & Inventory

### 6.1 Products List
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Products table/grid view | High | Medium | ⚠️ Basic |
| Search/filter products | High | Low | ❌ |
| Sort by name, date, HTS, duty | Medium | Low | ❌ |
| Bulk actions (delete, export) | Medium | Medium | ❌ |
| Quick re-classify action | Medium | Low | ❌ |
| Tags/folders for organization | Low | Medium | ❌ |

### 6.2 Product Detail
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Product info summary | High | Low | ⚠️ Basic |
| Classification history | Medium | Medium | ❌ |
| Current duty breakdown | High | Low | ⚠️ Via search |
| Tariff alert status | Medium | Low | ⚠️ Schema |
| Supplier matches | Medium | Medium | ⚠️ Schema |
| Cost comparison chart | Medium | Medium | ❌ |
| Edit product details | Medium | Low | ❌ |
| Notes/comments | Low | Low | ❌ |

### 6.3 Tariff Monitoring
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Enable monitoring for product | High | Low | ⚠️ Schema |
| Alert threshold settings | Medium | Low | ⚠️ Schema |
| Alert history | Medium | Medium | ⚠️ Schema |
| Email notifications | High | Medium | ❌ |
| In-app notifications | Medium | Medium | ❌ |
| Webhook notifications | Low | Medium | ❌ |

---

## 🔔 Module 7: Alerts & Notifications

### 7.1 Alert Types
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Tariff rate changes | High | Medium | ⚠️ Schema |
| New ADD/CVD cases | Medium | High | ❌ |
| New CBP rulings | Medium | High | ❌ |
| HTS code changes | Medium | Medium | ❌ |
| Denied party list updates | Medium | High | ❌ |
| Shipment alerts (BOL) | Low | High | ❌ |

### 7.2 Alert Management
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Alert list view | High | Low | ❌ |
| Create new alert | High | Medium | ⚠️ Schema |
| Edit alert settings | Medium | Low | ❌ |
| Pause/resume alerts | Medium | Low | ❌ |
| Delete alerts | Medium | Low | ❌ |
| Alert history/log | Medium | Medium | ⚠️ Schema |

### 7.3 Notification Delivery
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| In-app notification center | High | Medium | ❌ |
| Email digest (daily/weekly) | High | Medium | ❌ |
| Instant email alerts | Medium | Medium | ❌ |
| Notification preferences | Medium | Low | ❌ |
| Mark as read/unread | Medium | Low | ❌ |

---

## 📤 Module 8: Export & Reporting

### 8.1 Export Formats
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Export to Excel (.xlsx) | High | Medium | ❌ |
| Export to CSV | High | Low | ❌ |
| Export to PDF | Medium | High | ❌ |
| Branded PDF reports | Low | High | ❌ |

### 8.2 Report Types
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Classification report | High | Medium | ❌ |
| Duty calculation report | High | Medium | ❌ |
| Compliance screening report | Medium | Medium | ❌ |
| Supplier comparison report | Medium | Medium | ❌ |
| Trade statistics report | Low | Medium | ❌ |
| Custom report builder | Low | High | ❌ |

---

## ⚙️ Module 9: Settings & Account

### 9.1 User Settings
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Profile management | High | Low | ❌ |
| Change password | High | Low | ❌ |
| Email preferences | Medium | Low | ❌ |
| Notification settings | Medium | Low | ❌ |
| Default country of origin | Low | Low | ❌ |
| Dark mode toggle | Low | Low | ⚠️ Partial |
| Language selection | Low | High | ❌ |

### 9.2 Team/Organization (Business tier)
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Team member management | Medium | Medium | ❌ |
| Invite team members | Medium | Medium | ❌ |
| Role-based permissions | Medium | High | ❌ |
| Shared products/searches | Low | Medium | ❌ |
| Activity audit log | Low | Medium | ❌ |

### 9.3 Billing & Subscription
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Current plan display | High | Low | ⚠️ Schema |
| Usage dashboard | Medium | Medium | ⚠️ Schema |
| Upgrade/downgrade plan | High | Medium | ❌ |
| Payment method management | High | Medium | ❌ |
| Invoice history | Medium | Low | ❌ |
| Cancel subscription | Medium | Low | ❌ |

---

## 🔌 Module 10: API & Integrations

### 10.1 REST API
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| API key management | High | Medium | ❌ |
| Classification endpoint | High | Low | ✅ |
| Duty calculation endpoint | High | Low | ⚠️ Partial |
| Supplier search endpoint | Medium | Low | ⚠️ Basic |
| Denied party screening endpoint | Medium | Medium | ❌ |
| Rate limiting | High | Medium | ❌ |
| Usage tracking | High | Medium | ⚠️ Schema |
| Webhook configuration | Low | High | ❌ |

### 10.2 Third-party Integrations
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Zapier integration | Low | High | ❌ |
| ERP connectors (SAP, Oracle) | Low | Very High | ❌ |
| TMS integration | Low | Very High | ❌ |
| Customs broker software | Low | Very High | ❌ |

---

## 🎨 Module 11: UI/UX & Design

### 11.1 Navigation
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Left sidebar navigation | High | Low | ✅ |
| Collapsible sidebar | Medium | Low | ✅ |
| Mobile hamburger menu | High | Low | ✅ |
| Breadcrumb navigation | Medium | Low | ❌ |
| Quick action bar | Low | Medium | ❌ |

### 11.2 Responsive Design
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Desktop layout (1200px+) | High | Low | ✅ |
| Tablet layout (768-1199px) | High | Medium | ⚠️ Partial |
| Mobile layout (<768px) | High | Medium | ⚠️ Partial |
| Touch-friendly controls | High | Low | ⚠️ Partial |
| Progressive disclosure on mobile | Medium | Medium | ❌ |

### 11.3 Design System
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Consistent color palette | High | Low | ✅ |
| Typography scale | High | Low | ✅ |
| Component library (Ant Design) | High | Low | ✅ |
| Loading states | High | Low | ⚠️ Partial |
| Error states | High | Low | ⚠️ Partial |
| Empty states | Medium | Low | ⚠️ Partial |
| Micro-interactions | Low | Medium | ❌ |

### 11.4 Accessibility (WCAG 2.1 AA)
| Feature | Priority | Complexity | Status |
|---------|----------|------------|--------|
| Keyboard navigation | High | Medium | ⚠️ Partial |
| Screen reader support | High | Medium | ❌ |
| Color contrast compliance | High | Low | ⚠️ Partial |
| Focus indicators | High | Low | ⚠️ Partial |
| Alt text for images | Medium | Low | ❌ |
| ARIA labels | Medium | Medium | ❌ |

---

# PART 3: NAVIGATION & INFORMATION ARCHITECTURE

## Proposed Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SOURCIFY NAVIGATION STRUCTURE                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  PRIMARY NAV (Sidebar)                                                       │
│  ═══════════════════                                                         │
│                                                                              │
│  🏠 Dashboard                    ← Overview, quick stats, recent activity   │
│     └─ Overview                                                              │
│                                                                              │
│  🏷️ Classify                     ← HTS Classification (core feature)        │
│     ├─ New Classification                                                    │
│     ├─ My Classifications        (history)                                   │
│     └─ Bulk Upload                                                           │
│                                                                              │
│  💰 Duties                        ← Duty calculation & landed cost          │
│     ├─ Calculator                                                            │
│     ├─ FTA Qualification                                                     │
│     └─ Optimization                                                          │
│                                                                              │
│  🌍 Sourcing                      ← Trade intelligence & suppliers          │
│     ├─ Country Comparison                                                    │
│     ├─ Supplier Discovery                                                    │
│     ├─ Trade Statistics          (USITC data)                               │
│     └─ Shipment Search           (BOL data - paid)                          │
│                                                                              │
│  ✅ Compliance                    ← Compliance tools                         │
│     ├─ Denied Party Screening                                                │
│     ├─ ADD/CVD Lookup                                                        │
│     ├─ PGA Requirements                                                      │
│     ├─ CBP Rulings               (search rulings database)                  │
│     └─ FTA Rules                 (rules of origin)                          │
│                                                                              │
│  📦 My Products                   ← Saved products & monitoring             │
│     ├─ All Products                                                          │
│     ├─ Monitored                 (with tariff alerts)                       │
│     └─ Alerts                                                                │
│                                                                              │
│  ─────────────────────                                                       │
│                                                                              │
│  ⚙️ Settings                                                                 │
│  📖 Help & Docs                                                              │
│                                                                              │
│  HEADER                                                                      │
│  ═══════                                                                     │
│  [🔍 Global Search                          ] [🔔 Alerts] [👤 Profile ▼]   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# PART 4: PHASED ROADMAP (Ralph-Compatible)

## Phase 0: Foundation & Polish (Week 1-2)
*Clean up existing features, establish patterns*

### User Stories:
1. Polish classification results UI with CBP ruling placeholder
2. Complete saved products functionality
3. Complete search history with re-run capability
4. Fix mobile responsiveness issues
5. Add loading and error states consistently
6. Set up export service foundation (Excel/CSV)

## Phase 1: Core Classification Excellence (Week 3-4)
*Make classification best-in-class*

### User Stories:
1. Add AI reasoning/justification to classification results
2. Implement bulk classification UI (CSV upload + results)
3. Add classification report export (PDF)
4. Improve alternative classifications with duty comparison
5. Add "What if different country?" quick comparison

## Phase 2: Landed Cost Calculator (Week 5-6)
*Complete duty/cost calculation*

### User Stories:
1. Build landed cost calculator page
2. Add customs fees (MPF, HMF) to calculation
3. Add scenario comparison (save and compare multiple)
4. Add currency conversion support
5. Export landed cost breakdown

## Phase 3: Compliance Tools (Week 7-9)
*Build compliance features from public data*

### User Stories:
1. Build denied party screening (ingest OFAC/BIS lists)
2. Build batch denied party screening (CSV upload)
3. Build ADD/CVD case lookup
4. Build PGA requirements lookup
5. Index CBP rulings database
6. Build CBP rulings search

## Phase 4: FTA & Optimization (Week 10-12)
*FTA rules and optimization*

### User Stories:
1. Index FTA rules of origin by HTS code
2. Build FTA lookup UI (show applicable FTAs)
3. Build FTA qualification calculator (BOM input)
4. Calculate RVC and tariff shift compliance
5. Show savings from FTA qualification

## Phase 5: Trade Statistics (Week 13-14)
*USITC trade statistics visualization*

### User Stories:
1. Build trade statistics page structure
2. Integrate USITC DataWeb API
3. Build import volume charts by country
4. Build trend charts over time
5. Build comparison tools

## Phase 6: Sourcing Enhancement (Week 15-17)
*Enhance supplier discovery*

### User Stories:
1. Build interactive country comparison map
2. Enhance supplier profiles with more data
3. Add supplier contact info (paid tier)
4. Build side-by-side country comparison tool
5. Export sourcing comparison report

## Phase 7: BOL Data Integration (Week 18-20)
*License and integrate shipment data (if validated)*

### User Stories:
1. Integrate BOL data provider API
2. Build shipment search interface
3. Build company trade profile from shipments
4. Show supplier shipping history
5. Build trade intelligence dashboards

## Phase 8: Notifications & Alerts (Week 21-22)
*Complete notification system*

### User Stories:
1. Build notification center UI
2. Implement email notification service
3. Build tariff change monitoring job
4. Build alert management UI
5. Add alert preferences settings

## Phase 9: Team & Enterprise (Week 23-24)
*Team features for Business tier*

### User Stories:
1. Build team member management
2. Build invite flow
3. Add role-based permissions
4. Build team activity audit log
5. Build usage dashboard for admins

---

# PART 5: TECHNICAL ARCHITECTURE

## Tech Stack (Current)
| Layer | Technology | Status |
|-------|------------|--------|
| Framework | Next.js 14+ (App Router) | ✅ |
| Language | TypeScript | ✅ |
| UI Library | Ant Design 5 | ✅ |
| Database | PostgreSQL | ✅ |
| ORM | Prisma | ✅ |
| Auth | Better Auth | ✅ |
| AI/LLM | xAI (Grok) | ✅ |
| Vector DB | pgvector | ✅ |
| File Storage | UploadThing | ✅ |

## Recommended Additions
| Need | Recommendation | Priority |
|------|----------------|----------|
| Background Jobs | Inngest or BullMQ | High |
| Email | Resend or SendGrid | High |
| Charts | Recharts or Chart.js | High |
| Maps | Mapbox or Leaflet | Medium |
| Full-text Search | PostgreSQL FTS or Elasticsearch | Medium |
| PDF Generation | @react-pdf/renderer | Medium |
| Excel Export | SheetJS (xlsx) | High |

## AI/LLM Considerations
- **Current:** xAI (Grok) for classification
- **Alternative:** Claude (Anthropic) has excellent reasoning for complex classification
- **Recommendation:** Keep xAI for speed, consider Claude for complex edge cases or ruling analysis

---

# PART 6: DATA SOURCES

## Free/Public Data Sources
| Source | Data | Integration |
|--------|------|-------------|
| USITC | HTS schedules, trade stats | ✅ API |
| OFAC | SDN List, Sanctions | 🔨 Download CSV |
| BIS | Entity List, Denied Persons | 🔨 Download CSV |
| CBP | Rulings database | 🔨 Scrape/API |
| USTR | FTA text, trade agreements | 🔨 Download PDF |
| ITA | ADD/CVD cases | 🔨 Scrape |
| Federal Register | Trade regulations | 🔨 API |

## Licensed Data Sources (Future)
| Source | Data | Est. Cost |
|--------|------|-----------|
| ImportGenius | US BOL data | $10K-20K/yr |
| ImportKey | US BOL data | $5K-15K/yr |
| Panjiva (S&P) | Global BOL data | $50K+/yr |
| D&B | Company data | $20K-80K/yr |
| ZoomInfo | Contacts | $15K-50K/yr |

---

# PART 7: PRICING TIERS (Draft)

| Feature | Free | Pro ($99/mo) | Business ($299/mo) | Enterprise |
|---------|------|--------------|-------------------|------------|
| Classifications/month | 10 | 100 | Unlimited | Unlimited |
| Saved products | 5 | 50 | Unlimited | Unlimited |
| Bulk upload | ❌ | ✅ 50 rows | ✅ 500 rows | Unlimited |
| Full duty breakdown | Basic | ✅ | ✅ | ✅ |
| FTA qualification | ❌ | ✅ | ✅ | ✅ |
| Denied party screening | ❌ | 10/mo | 100/mo | Unlimited |
| ADD/CVD lookup | ✅ | ✅ | ✅ | ✅ |
| CBP rulings search | Limited | ✅ | ✅ | ✅ |
| Trade statistics | Basic | ✅ | ✅ | ✅ |
| Shipment search (BOL) | ❌ | ❌ | ✅ | ✅ |
| Supplier contacts | ❌ | ❌ | ✅ | ✅ |
| Team members | ❌ | ❌ | 5 | Unlimited |
| API access | ❌ | ❌ | ❌ | ✅ |
| Export reports | ❌ | ✅ | ✅ | ✅ |
| Tariff alerts | 1 | 10 | 50 | Unlimited |
| Support | Community | Email | Priority | Dedicated |

---

# APPENDIX A: Competitive Comparison Summary

| Feature | Datamyne | CustomsInfo | Sourcify (Goal) |
|---------|----------|-------------|-----------------|
| **AI Classification** | ❌ | ⚠️ BOL match | ✅ LLM + reasoning |
| **Classification Reasoning** | ❌ | ❌ | ✅ |
| **Duty Calculation** | ❌ | ❌ | ✅ |
| **Landed Cost** | ❌ | ❌ | ✅ |
| **FTA Qualification Calc** | ❌ | ❌ | ✅ |
| **BOL Shipment Data** | ✅ 22yr | ❌ | 🔨 License |
| **Company Profiles** | ✅ D&B | ❌ | 🔨 Build |
| **Contact Database** | ✅ | ❌ | 🔨 License |
| **CBP Rulings** | ❌ | ✅ | 🔨 Build |
| **FTA Rules** | ❌ | ✅ 300+ | 🔨 Build |
| **Denied Party** | ⚠️ Basic | ⚠️ Basic | 🔨 Build |
| **ADD/CVD** | ❌ | ✅ | 🔨 Build |
| **PGA Requirements** | ❌ | ✅ | 🔨 Build |
| **Trade Statistics** | ✅ | ⚠️ | 🔨 Build |
| **Modern UX** | ❌ 2010s | ❌ 2010s | ✅ 2026 |
| **Mobile** | ❌ | ❌ | ✅ |
| **SMB Pricing** | ❌ $10K+ | ❌ $10K+ | ✅ $0-299/mo |
| **No Demo Required** | ❌ | ❌ | ✅ |

---

*Document version: 1.0*
*Created: January 19, 2026*
*Next: Convert Phase 0-1 into Ralph prd.json format*
