/*
  Warnings:

  - You are about to drop the column `lastUsedAt` on the `ApiKey` table. All the data in the column will be lost.
  - You are about to drop the column `revokedAt` on the `ApiKey` table. All the data in the column will be lost.
  - Added the required column `revokesAt` to the `ApiKey` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."ApiKey" DROP COLUMN "lastUsedAt",
DROP COLUMN "revokedAt",
ADD COLUMN     "revokesAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
