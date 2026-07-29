-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "invoiceLastSentAt" TIMESTAMP(3),
ADD COLUMN     "invoiceSentTo" TEXT,
ADD COLUMN     "invoiceShareToken" TEXT,
ADD COLUMN     "invoiceShareTokenExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceShareToken_key" ON "Invoice"("invoiceShareToken");
