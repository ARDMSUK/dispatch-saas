ALTER TABLE "public"."bookings" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "bookings_tenantId_idempotencyKey_key" ON "public"."bookings"("tenantId", "idempotencyKey");
