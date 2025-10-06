-- AlterTable
ALTER TABLE "users" ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "consentSignature" TEXT,
ADD COLUMN     "fiscalCode" TEXT,
ADD COLUMN     "informedConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "informedConsentAt" TIMESTAMP(3),
ADD COLUMN     "medicalConsentAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "medicalConsentAt" TIMESTAMP(3),
ADD COLUMN     "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
