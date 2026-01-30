-- ============================================
-- DATA MIGRATION: statusTrigger → keywords
-- ============================================
-- This migration consolidates ORDER_STATUS and PAYMENT_STATUS
-- to use the existing keywords array field

-- Step 1: Migrate existing data
-- Copy statusTrigger values into keywords array
UPDATE "AutoReplyRule"
SET keywords = ARRAY["statusTrigger"]
WHERE
  ("triggerType" = 'ORDER_STATUS' OR "triggerType" = 'PAYMENT_STATUS')
  AND "statusTrigger" IS NOT NULL
  AND "statusTrigger" != ''
  AND (keywords IS NULL OR array_length(keywords, 1) IS NULL OR array_length(keywords, 1) = 0);

-- Step 2: Add unique constraint (prevent duplicate rules per status)
ALTER TABLE "AutoReplyRule"
ADD CONSTRAINT "AutoReplyRule_tenantId_triggerType_keywords_key"
UNIQUE ("tenantId", "triggerType", keywords);

-- Step 3: Drop old statusTrigger column
ALTER TABLE "AutoReplyRule"
DROP COLUMN "statusTrigger";
