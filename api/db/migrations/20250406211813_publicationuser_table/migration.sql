-- CreateTable
CREATE TABLE "PublicationUser" (
    "id" SERIAL NOT NULL,
    "publication_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "PublicationUser_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicationUser_publication_id_user_id_key" ON "PublicationUser"("publication_id", "user_id");

-- AddForeignKey
ALTER TABLE "PublicationUser" ADD CONSTRAINT "PublicationUser_publication_id_fkey" FOREIGN KEY ("publication_id") REFERENCES "Publication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationUser" ADD CONSTRAINT "PublicationUser_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
