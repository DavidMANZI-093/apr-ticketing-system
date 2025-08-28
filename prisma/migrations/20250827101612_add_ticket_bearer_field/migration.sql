/*
  Warnings:

  - Added the required column `bearerId` to the `Tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Tickets" ADD COLUMN     "bearerId" JSONB NOT NULL;
