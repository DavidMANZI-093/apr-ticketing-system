/*
  Warnings:

  - A unique constraint covering the columns `[seatId,eventId,client]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `seatId` to the `Ticket` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "seatId" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_seatId_eventId_client_key" ON "public"."Ticket"("seatId", "eventId", "client");
