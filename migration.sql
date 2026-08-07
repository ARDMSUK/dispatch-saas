-- CreateIndex
CREATE UNIQUE INDEX "vehicles_tenantId_reg_key" ON "public"."vehicles"("tenantId", "reg");

-- RenameIndex
ALTER INDEX "public"."bookings_tenantid_idempotencykey_key" RENAME TO "bookings_tenantId_idempotencyKey_key";

