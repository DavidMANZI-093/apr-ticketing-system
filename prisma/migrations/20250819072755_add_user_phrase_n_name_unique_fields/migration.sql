/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phrase` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "phrase" VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "public"."User"("name");
