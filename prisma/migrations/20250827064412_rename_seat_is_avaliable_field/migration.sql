/*
  Warnings:

  - You are about to drop the column `available` on the `EventSeats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."EventSeats" DROP COLUMN "available",
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;
