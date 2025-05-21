/*
  Warnings:

  - You are about to drop the column `citingDoi` on the `Citation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publicationId,oci]` on the table `Citation` will be added. If there are existing duplicate values, this will fail.
  - Made the column `oci` on table `Citation` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Citation" DROP COLUMN "citingDoi",
ADD COLUMN     "authorSc" BOOLEAN,
ADD COLUMN     "citing" TEXT,
ALTER COLUMN "oci" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Citation_publicationId_oci_key" ON "Citation"("publicationId", "oci");
