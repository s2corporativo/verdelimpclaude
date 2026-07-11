-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'm²',
    "costPerM2" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "profitMargin" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "minPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "maxPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "marketReference" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_serviceType_key" ON "PricingRule"("serviceType");
