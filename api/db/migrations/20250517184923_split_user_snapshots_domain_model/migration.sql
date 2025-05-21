/*
  Warnings:

  - You are about to drop the `UserSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserSnapshot" DROP CONSTRAINT "UserSnapshot_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "UserSnapshot" DROP CONSTRAINT "UserSnapshot_user_id_fkey";

-- DropTable
DROP TABLE "UserSnapshot";

-- CreateTable
CREATE TABLE "UserTopicSnapshot" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMPTZ(6) NOT NULL,
    "mean_value" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "UserTopicSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOverallSnapshot" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMPTZ(6) NOT NULL,
    "mean_value" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "UserOverallSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_user_topic_latest" ON "UserTopicSnapshot"("user_id", "topic_id", "snapshot_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserTopicSnapshot_user_id_topic_id_snapshot_date_key" ON "UserTopicSnapshot"("user_id", "topic_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "idx_user_overall_latest" ON "UserOverallSnapshot"("user_id", "snapshot_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "UserOverallSnapshot_user_id_snapshot_date_key" ON "UserOverallSnapshot"("user_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "UserTopicSnapshot" ADD CONSTRAINT "UserTopicSnapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTopicSnapshot" ADD CONSTRAINT "UserTopicSnapshot_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOverallSnapshot" ADD CONSTRAINT "UserOverallSnapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
