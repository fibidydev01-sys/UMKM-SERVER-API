-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PAST_DUE');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "logo" TEXT,
    "theme" JSONB,
    "landingConfig" JSONB,
    "metaTitle" VARCHAR(60),
    "metaDescription" VARCHAR(160),
    "socialLinks" JSONB,
    "customDomain" TEXT,
    "customDomainVerified" BOOLEAN NOT NULL DEFAULT false,
    "customDomainToken" TEXT,
    "sslStatus" TEXT DEFAULT 'pending',
    "sslIssuedAt" TIMESTAMP(3),
    "dnsRecords" JSONB,
    "customDomainAddedAt" TIMESTAMP(3),
    "customDomainVerifiedAt" TIMESTAMP(3),
    "customDomainRemovedAt" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentMethods" JSONB,
    "freeShippingThreshold" DOUBLE PRECISION,
    "defaultShippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shippingMethods" JSONB,
    "heroTitle" VARCHAR(200),
    "heroSubtitle" VARCHAR(300),
    "heroCtaText" VARCHAR(50),
    "heroCtaLink" VARCHAR(500),
    "heroBackgroundImage" TEXT,
    "aboutTitle" VARCHAR(200),
    "aboutSubtitle" VARCHAR(300),
    "aboutContent" TEXT,
    "aboutImage" TEXT,
    "aboutFeatures" JSONB,
    "testimonialsTitle" VARCHAR(200),
    "testimonialsSubtitle" VARCHAR(300),
    "testimonials" JSONB,
    "contactTitle" VARCHAR(200),
    "contactSubtitle" VARCHAR(300),
    "contactMapUrl" TEXT,
    "contactShowMap" BOOLEAN NOT NULL DEFAULT false,
    "contactShowForm" BOOLEAN NOT NULL DEFAULT true,
    "ctaTitle" VARCHAR(200),
    "ctaSubtitle" VARCHAR(300),
    "ctaButtonText" VARCHAR(50),
    "ctaButtonLink" VARCHAR(500),
    "ctaButtonStyle" VARCHAR(20) DEFAULT 'primary',
    "password" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "category" TEXT,
    "sku" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "comparePrice" DOUBLE PRECISION,
    "costPrice" DOUBLE PRECISION,
    "stock" INTEGER,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "images" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "is_trial" BOOLEAN NOT NULL DEFAULT false,
    "trial_ends_at" TIMESTAMP(3),
    "price_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "midtrans_order_id" TEXT NOT NULL,
    "midtrans_transaction_id" TEXT,
    "snap_token" TEXT,
    "snap_redirect_url" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "payment_type" TEXT,
    "bank" TEXT,
    "va_number" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'pending',
    "fraud_status" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "raw_notification" JSONB,
    "metadata" JSONB,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_email_key" ON "Tenant"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomainToken_key" ON "Tenant"("customDomainToken");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_category_idx" ON "Tenant"("category");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- CreateIndex
CREATE INDEX "Tenant_customDomain_idx" ON "Tenant"("customDomain");

-- CreateIndex
CREATE INDEX "Tenant_customDomainVerified_idx" ON "Tenant"("customDomainVerified");

-- CreateIndex
CREATE INDEX "Product_tenantId_isActive_idx" ON "Product"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Product_tenantId_category_idx" ON "Product"("tenantId", "category");

-- CreateIndex
CREATE INDEX "Product_tenantId_isFeatured_idx" ON "Product"("tenantId", "isFeatured");

-- CreateIndex
CREATE INDEX "Product_tenantId_slug_idx" ON "Product"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Product_tenantId_createdAt_idx" ON "Product"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_slug_key" ON "Product"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_tenantId_key" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions"("plan");

-- CreateIndex
CREATE INDEX "subscriptions_current_period_end_idx" ON "subscriptions"("current_period_end");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_midtrans_order_id_key" ON "subscription_payments"("midtrans_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_midtrans_transaction_id_key" ON "subscription_payments"("midtrans_transaction_id");

-- CreateIndex
CREATE INDEX "subscription_payments_tenant_id_idx" ON "subscription_payments"("tenant_id");

-- CreateIndex
CREATE INDEX "subscription_payments_subscription_id_idx" ON "subscription_payments"("subscription_id");

-- CreateIndex
CREATE INDEX "subscription_payments_midtrans_order_id_idx" ON "subscription_payments"("midtrans_order_id");

-- CreateIndex
CREATE INDEX "subscription_payments_payment_status_idx" ON "subscription_payments"("payment_status");

-- CreateIndex
CREATE INDEX "subscription_payments_tenant_id_created_at_idx" ON "subscription_payments"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "domain_logs_tenantId_idx" ON "domain_logs"("tenantId");

-- CreateIndex
CREATE INDEX "domain_logs_action_idx" ON "domain_logs"("action");

-- CreateIndex
CREATE INDEX "domain_logs_createdAt_idx" ON "domain_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_logs" ADD CONSTRAINT "domain_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
