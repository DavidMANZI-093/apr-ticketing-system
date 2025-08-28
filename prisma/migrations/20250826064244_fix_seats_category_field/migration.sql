/*
  Warnings:

  - You are about to drop the column `category` on the `Seats` table. All the data in the column will be lost.
  - You are about to drop the `SeatCategories` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `category` to the `EventSeats` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."SeatCategories" DROP CONSTRAINT "SeatCategories_venueId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Seats" DROP CONSTRAINT "Seats_category_fkey";

-- AlterTable
ALTER TABLE "public"."EventSeats" ADD COLUMN     "category" VARCHAR(255) NOT NULL;

-- AlterTable
ALTER TABLE "public"."Seats" DROP COLUMN "category";

-- DropTable
DROP TABLE "public"."SeatCategories";
