-- DropForeignKey
ALTER TABLE "UserSnapshot" DROP CONSTRAINT "UserSnapshot_topic_id_fkey";

-- AlterTable
ALTER TABLE "UserSnapshot" ALTER COLUMN "topic_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "UserSnapshot" ADD CONSTRAINT "UserSnapshot_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
