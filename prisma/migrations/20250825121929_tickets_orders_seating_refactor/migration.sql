/*
  Warnings:

  - You are about to drop the `Team` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `events` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "public"."TicketState" ADD VALUE 'REFUNDED';

-- DropForeignKey
ALTER TABLE "public"."Team" DROP CONSTRAINT "Team_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Ticket" DROP CONSTRAINT "Ticket_teamId_fkey";

-- DropTable
DROP TABLE "public"."Team";

-- DropTable
DROP TABLE "public"."Ticket";

-- DropTable
DROP TABLE "public"."User";

-- DropTable
DROP TABLE "public"."events";

-- CreateTable
CREATE TABLE "public"."Admins" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "phrase" VARCHAR(255) NOT NULL,
    "role" "public"."UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(255) NOT NULL,
    "subscriber" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Orders" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Events" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1020) NOT NULL,
    "venueId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Teams" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1020) NOT NULL,
    "logoUrl" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" UUID NOT NULL,

    CONSTRAINT "Teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tickets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "orderId" UUID,
    "teamId" UUID,
    "eventId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "state" "public"."TicketState" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventSeats" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "EventSeats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Seats" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "section" VARCHAR(50) NOT NULL,
    "row" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "category" VARCHAR(255) NOT NULL,

    CONSTRAINT "Seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Venues" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(1020) NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeatCategories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "venueId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatCategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admins_name_key" ON "public"."Admins"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Admins_email_key" ON "public"."Admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_username_key" ON "public"."Users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "public"."Users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_phone_key" ON "public"."Users"("phone");

-- CreateIndex
CREATE INDEX "Events_active_idx" ON "public"."Events"("active");

-- CreateIndex
CREATE INDEX "Events_startsAt_idx" ON "public"."Events"("startsAt");

-- CreateIndex
CREATE INDEX "Events_active_startsAt_idx" ON "public"."Events"("active", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Teams_name_key" ON "public"."Teams"("name");

-- CreateIndex
CREATE INDEX "Tickets_eventId_idx" ON "public"."Tickets"("eventId");

-- CreateIndex
CREATE INDEX "Tickets_state_idx" ON "public"."Tickets"("state");

-- CreateIndex
CREATE INDEX "Tickets_expiresAt_idx" ON "public"."Tickets"("expiresAt");

-- CreateIndex
CREATE INDEX "Tickets_eventId_state_idx" ON "public"."Tickets"("eventId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Tickets_seatId_eventId_key" ON "public"."Tickets"("seatId", "eventId");

-- CreateIndex
CREATE INDEX "EventSeats_eventId_seatId_idx" ON "public"."EventSeats"("eventId", "seatId");

-- CreateIndex
CREATE UNIQUE INDEX "Venues_name_key" ON "public"."Venues"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SeatCategories_name_key" ON "public"."SeatCategories"("name");

-- AddForeignKey
ALTER TABLE "public"."Orders" ADD CONSTRAINT "Orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Events" ADD CONSTRAINT "Events_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Teams" ADD CONSTRAINT "Teams_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tickets" ADD CONSTRAINT "Tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tickets" ADD CONSTRAINT "Tickets_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tickets" ADD CONSTRAINT "Tickets_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tickets" ADD CONSTRAINT "Tickets_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSeats" ADD CONSTRAINT "EventSeats_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventSeats" ADD CONSTRAINT "EventSeats_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "public"."Seats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Seats" ADD CONSTRAINT "Seats_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."SeatCategories"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Seats" ADD CONSTRAINT "Seats_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatCategories" ADD CONSTRAINT "SeatCategories_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
