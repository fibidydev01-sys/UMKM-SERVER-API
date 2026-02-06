-- CreateTable
CREATE TABLE "Feed" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "caption" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feed_createdAt_idx" ON "Feed"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Feed_tenantId_idx" ON "Feed"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Feed_tenantId_productId_key" ON "Feed"("tenantId", "productId");

-- AddForeignKey
ALTER TABLE "Feed" ADD CONSTRAINT "Feed_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feed" ADD CONSTRAINT "Feed_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
