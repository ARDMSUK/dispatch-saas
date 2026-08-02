-- AlterTable
ALTER TABLE "students" ADD COLUMN "isSEN" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "passengerAssistantRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "wheelchairRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "emergencyContactName" TEXT,
ADD COLUMN "emergencyContactPhone" TEXT,
ADD COLUMN "pickupHandoverInstructions" TEXT,
ADD COLUMN "dropoffHandoverInstructions" TEXT,
ADD COLUMN "authorisedPickupPerson" TEXT,
ADD COLUMN "authorisedDropoffPerson" TEXT,
ADD COLUMN "driverSafeNotes" TEXT,
ADD COLUMN "internalSafeguardingNotes" TEXT;
