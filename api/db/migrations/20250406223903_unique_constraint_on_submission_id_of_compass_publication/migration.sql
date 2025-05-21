/*
  Warnings:

  - A unique constraint covering the columns `[submission_id]` on the table `Publication` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "userid" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Publication_submission_id_key" ON "Publication"("submission_id");
