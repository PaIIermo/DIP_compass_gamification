-- DropIndex
DROP INDEX "Citation_publication_id_oci_key";

-- CreateIndex
CREATE INDEX "idx_citation_publication" ON "Citation"("publication_id");

-- CreateIndex
CREATE INDEX "idx_citation_date" ON "Citation"("creation_date");

-- CreateIndex
CREATE INDEX "idx_publication_conference" ON "Publication"("conference");

-- CreateIndex
CREATE INDEX "idx_publication_date" ON "Publication"("date_published");

-- CreateIndex
CREATE INDEX "idx_publication_score" ON "Publication"("overall_score");

-- CreateIndex
CREATE INDEX "idx_pubtopic_topic" ON "PublicationTopic"("topic_id");

-- CreateIndex
CREATE INDEX "idx_pubuser_user" ON "PublicationUser"("user_id");
