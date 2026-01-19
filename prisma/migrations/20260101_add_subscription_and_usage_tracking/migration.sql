-- Add subscription and usage tracking fields to User model

-- Create enums
CREATE TYPE "SubscriptionTier" AS ENUM ('free', 'pro', 'business', 'enterprise');
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'trialing', 'past_due', 'canceled', 'unpaid');
CREATE TYPE "UsageFeature" AS ENUM ('classification', 'sourcing_analysis', 'landed_cost', 'supplier_search', 'bulk_upload', 'api_call', 'export_csv', 'export_pdf');

-- Add columns to user table
ALTER TABLE "user" ADD COLUMN "tier" "SubscriptionTier" NOT NULL DEFAULT 'free';
ALTER TABLE "user" ADD COLUMN "stripe_customer_id" TEXT;
ALTER TABLE "user" ADD COLUMN "stripe_subscription_id" TEXT;
ALTER TABLE "user" ADD COLUMN "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "user" ADD COLUMN "subscription_start" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "subscription_end" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "trial_ends_at" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "classifications_today" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "classifications_reset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for user table
CREATE INDEX "user_tier_idx" ON "user"("tier");
CREATE INDEX "user_stripe_customer_id_idx" ON "user"("stripe_customer_id");

-- Create usage_log table
CREATE TABLE "usage_log" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature" "UsageFeature" NOT NULL,
    "metadata" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_log_pkey" PRIMARY KEY ("id")
);

-- Create indexes for usage_log table
CREATE INDEX "usage_log_user_id_feature_created_at_idx" ON "usage_log"("user_id", "feature", "created_at");
CREATE INDEX "usage_log_feature_created_at_idx" ON "usage_log"("feature", "created_at");

-- Add foreign key
ALTER TABLE "usage_log" ADD CONSTRAINT "usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;


