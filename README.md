# Sourcify

**AI-powered trade intelligence for modern importers.**

Classify products, calculate duties, optimize sourcing—in seconds, not hours.

![Status](https://img.shields.io/badge/status-active%20development-brightgreen)
![License](https://img.shields.io/badge/license-proprietary-blue)

<!-- TODO: Add screenshot -->
<!-- ![Sourcify Dashboard](public/screenshot.png) -->

---

## What is Sourcify?

Sourcify is an affordable, intuitive alternative to enterprise trade intelligence platforms like Datamyne and CustomsInfo. We help importers:

- **Classify** products with AI-powered HTS code detection (~4 seconds)
- **Calculate** total landed costs including all tariff layers (Section 301, IEEPA, AD/CVD)
- **Optimize** sourcing by comparing 199+ countries side-by-side
- **Monitor** tariff changes and get alerts before they impact your margins

### Why Sourcify?

| | Enterprise Tools | Sourcify |
|---|-----------------|----------|
| **Pricing** | $10k+/year, requires demo | Free tier + $99-299/mo |
| **UX** | Built for analysts | Built for operators |
| **AI** | Limited or none | Core differentiator |
| **Speed** | Minutes per classification | ~4 seconds |

---

## Core Features

- **HTS Classification Engine** — Semantic search across 27,000+ codes with confidence scoring
- **Duty Calculator** — Full tariff breakdown: MFN + Section 301 + IEEPA + Fentanyl + AD/CVD
- **Sourcing Intelligence** — Country comparison with real USITC import data
- **Tariff Monitoring** — Track rate changes on your products
- **Bulk Classification** — CSV upload for portfolio analysis (Pro+)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + pgvector |
| ORM | Prisma |
| UI | Ant Design + Tailwind CSS |
| Auth | Better Auth |
| AI/LLM | xAI (Grok) |
| Embeddings | OpenAI text-embedding-3-small |

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/sourcify.git
cd sourcify

# Copy environment variables
cp .env.example .env.local
# Fill in your API keys (see .env.example for required vars)

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push schema to database (or run migrations)
npx prisma db push

# Seed demo data (optional)
npx tsx scripts/seeds/seed-demo-user.ts
npx tsx scripts/seeds/seed-countries.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## Project Structure

```
sourcify/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   ├── components/       # Shared UI components
│   ├── features/         # Feature-specific components (auth, compliance, sourcing)
│   ├── services/         # Business logic (classification, tariffs, etc.)
│   ├── lib/              # Utilities (auth, db, AI clients)
│   └── types/            # TypeScript type definitions
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # SQL migrations
├── docs/                 # Product specs, architecture, progress tracking
├── scripts/              # Database seeds, utilities
└── public/               # Static assets
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Master Feature Spec](docs/master-feature-spec.md) | Complete feature map and competitive analysis |
| [Product Roadmap](docs/product-roadmap.md) | Phased roadmap with sprint planning |
| [Progress Tracker](docs/progress.md) | Sprint-by-sprint development log |
| [Architecture Overview](docs/architecture.md) | System design and data flow |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow, commit conventions, and coding standards.

---

## Status

**Current Phase:** Phase 3 - Paid Features Foundation  
**Target:** Paid beta with Pro/Business tiers

---

## License

Proprietary. All rights reserved.
