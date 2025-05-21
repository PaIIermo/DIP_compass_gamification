/*
  Warnings:

  - A unique constraint covering the columns `[publication_id,snapshot_date]` on the table `PublicationSnapshot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,topic_id,snapshot_date]` on the table `ResearcherSnapshot` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[topic_id,snapshot_date]` on the table `TopicSnapshot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PublicationSnapshot_publication_id_snapshot_date_key" ON "PublicationSnapshot"("publication_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "ResearcherSnapshot_user_id_topic_id_snapshot_date_key" ON "ResearcherSnapshot"("user_id", "topic_id", "snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "TopicSnapshot_topic_id_snapshot_date_key" ON "TopicSnapshot"("topic_id", "snapshot_date");
