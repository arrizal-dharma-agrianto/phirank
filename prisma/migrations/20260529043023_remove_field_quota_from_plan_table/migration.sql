/*
  Warnings:

  - You are about to drop the column `max_projects` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `max_storage_mb` on the `plans` table. All the data in the column will be lost.
  - You are about to drop the column `max_users` on the `plans` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "plans" DROP COLUMN "max_projects",
DROP COLUMN "max_storage_mb",
DROP COLUMN "max_users";
