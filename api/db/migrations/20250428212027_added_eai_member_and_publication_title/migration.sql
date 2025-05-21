-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_eai_member" BOOLEAN NOT NULL DEFAULT false;
