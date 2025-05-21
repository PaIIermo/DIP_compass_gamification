-- AlterTable
ALTER TABLE "UserSnapshot" ADD COLUMN     "publication_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "time_weighted_value" DECIMAL(10,4) NOT NULL DEFAULT 0;
