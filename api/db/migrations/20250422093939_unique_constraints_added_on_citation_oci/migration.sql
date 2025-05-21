/*
  Warnings:

  - A unique constraint covering the columns `[oci]` on the table `Citation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Citation_oci_key" ON "Citation"("oci");
