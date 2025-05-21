-- CreateTable
CREATE TABLE "Topic" (
    "id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationTopic" (
    "id" SERIAL NOT NULL,
    "publication_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,

    CONSTRAINT "PublicationTopic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicationTopic_publication_id_topic_id_key" ON "PublicationTopic"("publication_id", "topic_id");

-- AddForeignKey
ALTER TABLE "PublicationTopic" ADD CONSTRAINT "PublicationTopic_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationTopic" ADD CONSTRAINT "PublicationTopic_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
