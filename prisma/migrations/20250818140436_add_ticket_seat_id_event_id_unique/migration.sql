/*
  Warnings:

  - A unique constraint covering the columns `[seatId,eventId]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Ticket_seatId_eventId_client_key";

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_seatId_eventId_key" ON "public"."Ticket"("seatId", "eventId");
