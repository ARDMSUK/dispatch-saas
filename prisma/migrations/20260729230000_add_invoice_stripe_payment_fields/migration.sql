-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentLink" TEXT,
ADD COLUMN     "paymentLinkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentReferenceId" TEXT,
ADD COLUMN     "stripeCheckoutSessionId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeCheckoutSessionId_key" ON "public"."invoices"("stripeCheckoutSessionId");

