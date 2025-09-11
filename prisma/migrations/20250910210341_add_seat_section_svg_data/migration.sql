/*
  Warnings:

  - You are about to drop the column `section` on the `Seats` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `Venues` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(10)`.
  - A unique constraint covering the columns `[venueId,sectionId,row,number]` on the table `Seats` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sectionId` to the `Seats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Seats" DROP COLUMN "section",
ADD COLUMN     "sectionId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."Venues" ALTER COLUMN "name" SET DATA TYPE VARCHAR(10);

-- CreateTable
CREATE TABLE "public"."SeatSections" (
    "id" UUID NOT NULL,
    "venueId" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "svgPathData" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeatSections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeatSections_venueId_name_idx" ON "public"."SeatSections"("venueId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "SeatSections_venueId_name_key" ON "public"."SeatSections"("venueId", "name");

-- CreateIndex
CREATE INDEX "Seats_venueId_sectionId_row_number_idx" ON "public"."Seats"("venueId", "sectionId", "row", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Seats_venueId_sectionId_row_number_key" ON "public"."Seats"("venueId", "sectionId", "row", "number");

-- AddForeignKey
ALTER TABLE "public"."Seats" ADD CONSTRAINT "Seats_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."SeatSections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatSections" ADD CONSTRAINT "SeatSections_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
