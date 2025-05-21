-- DropIndex
DROP INDEX "PublicationSnapshot_publication_id_snapshot_date_idx";

-- DropIndex
DROP INDEX "TopicSnapshot_topic_id_snapshot_date_idx";

-- DropIndex
DROP INDEX "UserSnapshot_user_id_topic_id_snapshot_date_idx";

-- AlterTable
ALTER TABLE "PublicationSnapshot" ALTER COLUMN "snapshot_date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TopicSnapshot" ALTER COLUMN "snapshot_date" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserSnapshot" ALTER COLUMN "snapshot_date" DROP DEFAULT;
