-- CreateTable
CREATE TABLE "PublicationSnapshot" (
    "id" SERIAL NOT NULL,
    "publication_id" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "PublicationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearcherSnapshot" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mean_value" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "ResearcherSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicSnapshot" (
    "id" SERIAL NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "snapshot_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mean_value" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "TopicSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PublicationSnapshot_publication_id_snapshot_date_idx" ON "PublicationSnapshot"("publication_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "ResearcherSnapshot_user_id_topic_id_snapshot_date_idx" ON "ResearcherSnapshot"("user_id", "topic_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "TopicSnapshot_topic_id_snapshot_date_idx" ON "TopicSnapshot"("topic_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "PublicationSnapshot" ADD CONSTRAINT "PublicationSnapshot_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearcherSnapshot" ADD CONSTRAINT "ResearcherSnapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearcherSnapshot" ADD CONSTRAINT "ResearcherSnapshot_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicSnapshot" ADD CONSTRAINT "TopicSnapshot_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
