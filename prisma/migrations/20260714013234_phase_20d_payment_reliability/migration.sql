-- AlterTable
ALTER TABLE "public"."bookings" ADD COLUMN     "paymentLinkExpiresAt" TIMESTAMP(3),
ADD COLUMN     "paymentProblemAt" TIMESTAMP(3),
ADD COLUMN     "paymentProblemReason" TEXT,
ADD COLUMN     "paymentProblemStatus" TEXT,
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeCheckoutSessionId" TEXT;
