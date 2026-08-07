-- CreateIndex
CREATE UNIQUE INDEX "vehicles_tenantId_reg_key" ON "public"."vehicles"("tenantId", "reg");
