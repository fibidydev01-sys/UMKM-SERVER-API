-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AutoReplyTriggerType" ADD VALUE 'ORDER_STATUS';
ALTER TYPE "AutoReplyTriggerType" ADD VALUE 'PAYMENT_STATUS';

-- AlterTable
ALTER TABLE "AutoReplyRule" ADD COLUMN     "statusTrigger" TEXT;
