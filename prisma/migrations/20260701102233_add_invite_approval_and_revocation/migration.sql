-- AlterTable
ALTER TABLE `space_invites` ADD COLUMN `email` VARCHAR(255) NULL,
    ADD COLUMN `is_revoked` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `message` TEXT NULL,
    ADD COLUMN `requires_approval` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `space_members` ADD COLUMN `join_request_message` TEXT NULL,
    ADD COLUMN `status` ENUM('PENDING', 'ACTIVE', 'REJECTED') NOT NULL DEFAULT 'ACTIVE';
