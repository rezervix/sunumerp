-- CreateTable
CREATE TABLE "CalculationHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productName" TEXT,
    "productCost" REAL NOT NULL,
    "shippingCost" REAL NOT NULL,
    "commissionRate" REAL NOT NULL,
    "vatRate" REAL NOT NULL,
    "variantPrice" REAL,
    "subtractVariant" BOOLEAN NOT NULL DEFAULT false,
    "baseCost" REAL NOT NULL,
    "commissionAmount" REAL NOT NULL,
    "vatAmount" REAL NOT NULL,
    "totalCost" REAL NOT NULL,
    "appliedProfitRate" REAL NOT NULL,
    "profitAmount" REAL NOT NULL,
    "calculatedPrice" REAL NOT NULL,
    "finalPrice" REAL NOT NULL,
    "roundingStrategy" TEXT NOT NULL DEFAULT 'hundred',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalculationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CalculationHistory_userId_idx" ON "CalculationHistory"("userId");
