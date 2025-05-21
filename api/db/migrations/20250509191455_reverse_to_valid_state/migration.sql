/*
  Warnings:

  - You are about to drop the column `publication_count` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `time_weighted_value` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `publication_count` on the `UserSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `time_weighted_value` on the `UserSnapshot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "publication_count",
DROP COLUMN "time_weighted_value";

-- AlterTable
ALTER TABLE "UserSnapshot" DROP COLUMN "publication_count",
DROP COLUMN "time_weighted_value";
