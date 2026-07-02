/*
  Warnings:

  - You are about to alter the column `visibility` on the `spaces` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(7))` to `Enum(EnumId(5))`.

*/
-- AlterTable
ALTER TABLE `spaces` MODIFY `visibility` ENUM('PRIVATE', 'PUBLIC') NOT NULL DEFAULT 'PUBLIC';
