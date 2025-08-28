/*
  Warnings:

  - Added the required column `type` to the `Tickets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."TicketType" AS ENUM ('SINGLE', 'GROUP', 'FAMILY', 'GIFT');

-- AlterTable
ALTER TABLE "public"."Tickets" ADD COLUMN     "type" "public"."TicketType" NOT NULL;
