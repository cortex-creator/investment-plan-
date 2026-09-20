-- Add external market-data metadata and daily portfolio snapshots.

ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'FOREX';

ALTER TABLE "Asset"
  ADD COLUMN IF NOT EXISTS "externalSymbol" TEXT,
  ADD COLUMN IF NOT EXISTS "externalId" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS "marketCap" DECIMAL(20,2),
  ADD COLUMN IF NOT EXISTS "volume24h" DECIMAL(20,2),
  ADD COLUMN IF NOT EXISTS "dataSource" TEXT,
  ADD COLUMN IF NOT EXISTS "lastFetchedAt" TIMESTAMP(3);

ALTER TABLE "PriceCandle"
  ADD COLUMN IF NOT EXISTS "volume" DECIMAL(20,8),
  ADD COLUMN IF NOT EXISTS "dataSource" TEXT;

CREATE INDEX IF NOT EXISTS "Asset_dataSource_lastFetchedAt_idx"
  ON "Asset" ("dataSource", "lastFetchedAt");

CREATE INDEX IF NOT EXISTS "PriceCandle_dataSource_timestamp_idx"
  ON "PriceCandle" ("dataSource", "timestamp");

CREATE TABLE IF NOT EXISTS "PortfolioSnapshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "totalValue" DECIMAL(18,2) NOT NULL,
  "cashBalance" DECIMAL(18,2) NOT NULL,
  "investedValue" DECIMAL(18,2) NOT NULL,
  "tradeValue" DECIMAL(18,2) NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PortfolioSnapshot_userId_capturedAt_key"
  ON "PortfolioSnapshot" ("userId", "capturedAt");

CREATE INDEX IF NOT EXISTS "PortfolioSnapshot_userId_capturedAt_idx"
  ON "PortfolioSnapshot" ("userId", "capturedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PortfolioSnapshot_userId_fkey'
  ) THEN
    ALTER TABLE "PortfolioSnapshot"
      ADD CONSTRAINT "PortfolioSnapshot_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
