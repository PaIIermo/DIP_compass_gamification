/*
  Warnings:

  - You are about to drop the column `authord_sc` on the `Citation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Citation" DROP COLUMN "authord_sc",
ADD COLUMN     "author_sc" BOOLEAN;
