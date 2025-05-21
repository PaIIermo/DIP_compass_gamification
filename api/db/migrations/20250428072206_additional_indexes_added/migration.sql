-- CreateIndex
CREATE INDEX "idx_pubsnap_pub_latest" ON "PublicationSnapshot"("publication_id", "snapshot_date" DESC);

-- CreateIndex
CREATE INDEX "idx_topicsnap_latest" ON "TopicSnapshot"("topic_id", "snapshot_date" DESC);

-- CreateIndex
CREATE INDEX "idx_usersnap_latest" ON "UserSnapshot"("user_id", "topic_id", "snapshot_date" DESC);
