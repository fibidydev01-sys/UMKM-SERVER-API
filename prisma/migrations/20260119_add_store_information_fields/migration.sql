-- AlterTable: Add Store Information Fields to Tenant
-- Migration: add_store_information_fields
-- Date: 2026-01-19

-- ==========================================
-- HERO SECTION FIELDS
-- ==========================================
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "heroTitle" VARCHAR(200);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "heroSubtitle" VARCHAR(300);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "heroCtaText" VARCHAR(50);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "heroCtaLink" VARCHAR(500);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "heroBackgroundImage" TEXT;

-- ==========================================
-- ABOUT SECTION FIELDS
-- ==========================================
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "aboutTitle" VARCHAR(200);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "aboutSubtitle" VARCHAR(300);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "aboutContent" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "aboutImage" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "aboutFeatures" JSONB;

-- ==========================================
-- TESTIMONIALS SECTION FIELDS
-- ==========================================
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "testimonialsTitle" VARCHAR(200);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "testimonialsSubtitle" VARCHAR(300);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "testimonials" JSONB;

-- ==========================================
-- CONTACT SECTION FIELDS
-- ==========================================
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "contactTitle" VARCHAR(200);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "contactSubtitle" VARCHAR(300);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "contactMapUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "contactShowMap" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "contactShowForm" BOOLEAN NOT NULL DEFAULT true;

-- ==========================================
-- CTA SECTION FIELDS
-- ==========================================
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ctaTitle" VARCHAR(200);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ctaSubtitle" VARCHAR(300);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ctaButtonText" VARCHAR(50);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ctaButtonLink" VARCHAR(500);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "ctaButtonStyle" VARCHAR(20) DEFAULT 'primary';
