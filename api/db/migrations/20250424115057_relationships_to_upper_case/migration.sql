/*
  Warnings:

  - You are about to drop the `ResearcherSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ResearcherSnapshot" DROP CONSTRAINT "ResearcherSnapshot_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "ResearcherSnapshot" DROP CONSTRAINT "ResearcherSnapshot_user_id_fkey";

-- DropTable
DROP TABLE "ResearcherSnapshot";

-- CreateTable
CREATE TABLE "UserSnapshot" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mean_value" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "UserSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSnapshot_user_id_topic_id_snapshot_date_idx" ON "UserSnapshot"("user_id", "topic_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "UserSnapshot_user_id_topic_id_snapshot_date_key" ON "UserSnapshot"("user_id", "topic_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "UserSnapshot" ADD CONSTRAINT "UserSnapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSnapshot" ADD CONSTRAINT "UserSnapshot_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
