-- CreateEnum
CREATE TYPE "public"."TicketState" AS ENUM ('PENDING', 'PAID', 'USED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Ticket" ADD COLUMN     "state" "public"."TicketState" NOT NULL DEFAULT 'PENDING';
