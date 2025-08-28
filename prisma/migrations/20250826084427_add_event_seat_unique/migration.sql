/*
  Warnings:

  - A unique constraint covering the columns `[eventId,seatId]` on the table `EventSeats` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."EventSeats" ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "EventSeats_eventId_seatId_key" ON "public"."EventSeats"("eventId", "seatId");
