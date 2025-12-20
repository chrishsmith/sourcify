-- Enhanced Schema Migration for TradeForge/Sourcify
-- Adds: SearchHistory, SavedProducts, TariffAlerts, Enhanced Suppliers, Country Costs, etc.

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TYPE "SearchStatus" AS ENUM ('COMPLETED', 'FAILED', 'PENDING');
CREATE TYPE "SearchType" AS ENUM ('SINGLE', 'BULK_CSV', 'API');
CREATE TYPE "AlertType" AS ENUM ('ANY_CHANGE', 'INCREASE_ONLY', 'DECREASE_ONLY', 'THRESHOLD');
CREATE TYPE "EmployeeRange" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');
CREATE TYPE "RevenueRange" AS ENUM ('UNDER_1M', 'ONE_TO_10M', 'TEN_TO_50M', 'FIFTY_TO_100M', 'OVER_100M');
CREATE TYPE "CostTier" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "SupplierTier" AS ENUM ('UNVERIFIED', 'BASIC', 'VERIFIED', 'PREMIUM');
CREATE TYPE "BatchStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEARCH HISTORY - Every classification search is saved here
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "productName" TEXT,
    "productSku" TEXT,
    "productDescription" TEXT NOT NULL,
    "countryOfOrigin" TEXT,
    "materialComposition" TEXT,
    "intendedUse" TEXT,
    "htsCode" TEXT NOT NULL,
    "htsDescription" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "fullResult" JSONB NOT NULL,
    "baseDutyRate" TEXT,
    "effectiveRate" DOUBLE PRECISION,
    "hasAdditionalDuties" BOOLEAN NOT NULL DEFAULT false,
    "status" "SearchStatus" NOT NULL DEFAULT 'COMPLETED',
    "searchType" "SearchType" NOT NULL DEFAULT 'SINGLE',
    "batchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "search_history_userId_createdAt_idx" ON "search_history"("userId", "createdAt" DESC);
CREATE INDEX "search_history_htsCode_idx" ON "search_history"("htsCode");
CREATE INDEX "search_history_batchId_idx" ON "search_history"("batchId");

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAVED PRODUCTS - Products user wants to track long-term
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "saved_product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sku" TEXT,
    "htsCode" TEXT NOT NULL,
    "htsDescription" TEXT NOT NULL,
    "countryOfOrigin" TEXT,
    "materialComposition" TEXT,
    "intendedUse" TEXT,
    "baseDutyRate" TEXT,
    "effectiveDutyRate" DOUBLE PRECISION,
    "latestClassification" JSONB,
    "isMonitored" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceSearchId" TEXT,

    CONSTRAINT "saved_product_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_product_sourceSearchId_key" ON "saved_product"("sourceSearchId");
CREATE INDEX "saved_product_userId_createdAt_idx" ON "saved_product"("userId", "createdAt" DESC);
CREATE INDEX "saved_product_htsCode_idx" ON "saved_product"("htsCode");

-- ═══════════════════════════════════════════════════════════════════════════════
-- TARIFF ALERTS - Monitor tariff changes
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "tariff_alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "htsCode" TEXT NOT NULL,
    "countryOfOrigin" TEXT,
    "originalRate" DOUBLE PRECISION NOT NULL,
    "currentRate" DOUBLE PRECISION,
    "alertType" "AlertType" NOT NULL DEFAULT 'ANY_CHANGE',
    "threshold" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastChecked" TIMESTAMP(3),
    "lastAlertSent" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "savedProductId" TEXT,
    "searchHistoryId" TEXT,

    CONSTRAINT "tariff_alert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tariff_alert_htsCode_countryOfOrigin_idx" ON "tariff_alert"("htsCode", "countryOfOrigin");
CREATE INDEX "tariff_alert_userId_isActive_idx" ON "tariff_alert"("userId", "isActive");

CREATE TABLE "tariff_alert_event" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "previousRate" DOUBLE PRECISION NOT NULL,
    "newRate" DOUBLE PRECISION NOT NULL,
    "changePercent" DOUBLE PRECISION NOT NULL,
    "changeType" TEXT NOT NULL,
    "changeReason" TEXT,
    "details" JSONB,
    "notifiedAt" TIMESTAMP(3),
    "notifyMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_alert_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tariff_alert_event_alertId_createdAt_idx" ON "tariff_alert_event"("alertId", "createdAt" DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENHANCED SUPPLIER TABLE - Replace existing with enhanced version
-- ═══════════════════════════════════════════════════════════════════════════════

-- First, drop the old supplier table if it exists
DROP TABLE IF EXISTS "supplier" CASCADE;

CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "region" TEXT,
    "city" TEXT,
    "address" TEXT,
    "productCategories" TEXT[],
    "htsChapters" TEXT[],
    "materials" TEXT[],
    "employeeCount" "EmployeeRange",
    "yearEstablished" INTEGER,
    "annualRevenue" "RevenueRange",
    "exportPercentage" INTEGER,
    "certifications" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationDate" TIMESTAMP(3),
    "verificationNotes" TEXT,
    "reliabilityScore" DOUBLE PRECISION,
    "qualityScore" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "costTier" "CostTier",
    "minOrderValue" DOUBLE PRECISION,
    "typicalLeadDays" INTEGER,
    "tier" "SupplierTier" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_slug_key" ON "supplier"("slug");
CREATE INDEX "supplier_countryCode_idx" ON "supplier"("countryCode");
CREATE INDEX "supplier_htsChapters_idx" ON "supplier" USING GIN ("htsChapters");
CREATE INDEX "supplier_overallScore_idx" ON "supplier"("overallScore" DESC);

CREATE TABLE "user_saved_supplier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "notes" TEXT,
    "tags" TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_saved_supplier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_saved_supplier_userId_supplierId_key" ON "user_saved_supplier"("userId", "supplierId");

-- ═══════════════════════════════════════════════════════════════════════════════
-- COUNTRY MANUFACTURING COSTS - Powers the global map
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "country_manufacturing_cost" (
    "id" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "htsChapter" TEXT,
    "productCategory" TEXT,
    "laborCostIndex" DOUBLE PRECISION NOT NULL,
    "overheadCostIndex" DOUBLE PRECISION,
    "materialCostIndex" DOUBLE PRECISION,
    "shippingCostIndex" DOUBLE PRECISION,
    "typicalTransitDays" INTEGER,
    "baseTariffRate" DOUBLE PRECISION,
    "additionalDuties" DOUBLE PRECISION,
    "effectiveTariffRate" DOUBLE PRECISION,
    "hasFTA" BOOLEAN NOT NULL DEFAULT false,
    "ftaName" TEXT,
    "politicalRiskScore" DOUBLE PRECISION,
    "supplyChainRisk" DOUBLE PRECISION,
    "qualityReputation" DOUBLE PRECISION,
    "overallCostScore" DOUBLE PRECISION,
    "dataSource" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "country_manufacturing_cost_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "country_manufacturing_cost_countryCode_htsChapter_key" ON "country_manufacturing_cost"("countryCode", "htsChapter");
CREATE INDEX "country_manufacturing_cost_htsChapter_overallCostScore_idx" ON "country_manufacturing_cost"("htsChapter", "overallCostScore");

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUPPLIER MATCHING & COST COMPARISON
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "supplier_match" (
    "id" TEXT NOT NULL,
    "savedProductId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchReasons" TEXT[],
    "estimatedUnitCost" DOUBLE PRECISION,
    "estimatedDutyRate" DOUBLE PRECISION,
    "estimatedShippingCost" DOUBLE PRECISION,
    "estimatedTotalCost" DOUBLE PRECISION,
    "estimatedSavings" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_match_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_match_savedProductId_supplierId_key" ON "supplier_match"("savedProductId", "supplierId");
CREATE INDEX "supplier_match_matchScore_idx" ON "supplier_match"("matchScore" DESC);

CREATE TABLE "cost_comparison" (
    "id" TEXT NOT NULL,
    "savedProductId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "estimatedLaborCost" DOUBLE PRECISION,
    "estimatedMaterialCost" DOUBLE PRECISION,
    "estimatedShippingCost" DOUBLE PRECISION,
    "estimatedDutyRate" DOUBLE PRECISION,
    "estimatedTotalCost" DOUBLE PRECISION,
    "savingsVsCurrent" DOUBLE PRECISION,
    "savingsPercent" DOUBLE PRECISION,
    "assumptions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_comparison_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cost_comparison_savedProductId_countryCode_key" ON "cost_comparison"("savedProductId", "countryCode");
CREATE INDEX "cost_comparison_savingsPercent_idx" ON "cost_comparison"("savingsPercent" DESC);

CREATE TABLE "supplier_cost_data" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "htsChapter" TEXT,
    "productCategory" TEXT NOT NULL,
    "minUnitCost" DOUBLE PRECISION,
    "maxUnitCost" DOUBLE PRECISION,
    "typicalUnitCost" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "minOrderQty" INTEGER,
    "minOrderValue" DOUBLE PRECISION,
    "typicalLeadDays" INTEGER,
    "quotedAt" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_cost_data_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_cost_data_supplierId_productCategory_idx" ON "supplier_cost_data"("supplierId", "productCategory");

-- ═══════════════════════════════════════════════════════════════════════════════
-- BULK IMPORT BATCHES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE "bulk_import_batch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_import_batch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bulk_import_batch_userId_createdAt_idx" ON "bulk_import_batch"("userId", "createdAt" DESC);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FOREIGN KEYS
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "search_history" ADD CONSTRAINT "search_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "saved_product" ADD CONSTRAINT "saved_product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_product" ADD CONSTRAINT "saved_product_sourceSearchId_fkey" FOREIGN KEY ("sourceSearchId") REFERENCES "search_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tariff_alert" ADD CONSTRAINT "tariff_alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tariff_alert" ADD CONSTRAINT "tariff_alert_savedProductId_fkey" FOREIGN KEY ("savedProductId") REFERENCES "saved_product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tariff_alert" ADD CONSTRAINT "tariff_alert_searchHistoryId_fkey" FOREIGN KEY ("searchHistoryId") REFERENCES "search_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tariff_alert_event" ADD CONSTRAINT "tariff_alert_event_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "tariff_alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_saved_supplier" ADD CONSTRAINT "user_saved_supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_saved_supplier" ADD CONSTRAINT "user_saved_supplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_match" ADD CONSTRAINT "supplier_match_savedProductId_fkey" FOREIGN KEY ("savedProductId") REFERENCES "saved_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_match" ADD CONSTRAINT "supplier_match_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "cost_comparison" ADD CONSTRAINT "cost_comparison_savedProductId_fkey" FOREIGN KEY ("savedProductId") REFERENCES "saved_product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_cost_data" ADD CONSTRAINT "supplier_cost_data_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DROP OLD TABLES (if they exist from previous schema)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS "product" CASCADE;
DROP TABLE IF EXISTS "classification" CASCADE;
DROP TYPE IF EXISTS "ClassificationStatus";
