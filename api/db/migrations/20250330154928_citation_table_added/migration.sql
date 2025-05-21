-- CreateTable
CREATE TABLE "Citation" (
    "id" SERIAL NOT NULL,
    "publicationId" INTEGER NOT NULL,
    "citingDoi" VARCHAR(255),
    "oci" TEXT,
    "creationDate" TIMESTAMP(3),

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
