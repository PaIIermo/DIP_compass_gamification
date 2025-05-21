/*
  Warnings:

  - You are about to drop the column `authorSc` on the `Citation` table. All the data in the column will be lost.
  - You are about to drop the column `creationDate` on the `Citation` table. All the data in the column will be lost.
  - You are about to drop the column `publicationId` on the `Citation` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[publication_id,oci]` on the table `Citation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `publication_id` to the `Citation` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Citation" DROP CONSTRAINT "Citation_publicationId_fkey";

-- DropIndex
DROP INDEX "Citation_publicationId_oci_key";

-- AlterTable
ALTER TABLE "Citation" DROP COLUMN "authorSc",
DROP COLUMN "creationDate",
DROP COLUMN "publicationId",
ADD COLUMN     "authord_sc" BOOLEAN,
ADD COLUMN     "creation_date" TIMESTAMP(3),
ADD COLUMN     "publication_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Citation_publication_id_oci_key" ON "Citation"("publication_id", "oci");

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
