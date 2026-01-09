-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'IDR',
ADD COLUMN     "defaultShippingCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "freeShippingThreshold" DOUBLE PRECISION,
ADD COLUMN     "paymentMethods" JSONB,
ADD COLUMN     "shippingMethods" JSONB,
ADD COLUMN     "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
