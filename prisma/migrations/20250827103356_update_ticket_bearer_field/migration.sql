/*
  Warnings:

  - You are about to drop the column `bearerId` on the `Tickets` table. All the data in the column will be lost.
  - Added the required column `bearer` to the `Tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Tickets" DROP COLUMN "bearerId",
ADD COLUMN     "bearer" JSONB NOT NULL;
