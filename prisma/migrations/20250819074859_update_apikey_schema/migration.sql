/*
  Warnings:

  - You are about to drop the column `key` on the `ApiKey` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ApiKey" DROP COLUMN "key",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "ApiKey_id_active_idx" ON "public"."ApiKey"("id", "active");
