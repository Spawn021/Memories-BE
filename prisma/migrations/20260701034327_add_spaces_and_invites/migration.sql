-- CreateTable
CREATE TABLE `spaces` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `uuid` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `avatar_url` TEXT NULL,
    `cover_url` TEXT NULL,
    `type` ENUM('PERSONAL', 'COUPLE', 'FAMILY', 'FRIENDS') NOT NULL DEFAULT 'FRIENDS',
    `visibility` ENUM('PRIVATE', 'INVITE_ONLY', 'PUBLIC') NOT NULL DEFAULT 'INVITE_ONLY',
    `owner_id` INTEGER NOT NULL,
    `theme_key` VARCHAR(191) NOT NULL DEFAULT 'default',
    `layout_key` VARCHAR(191) NOT NULL DEFAULT 'timeline',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `spaces_uuid_key`(`uuid`),
    UNIQUE INDEX `spaces_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `space_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `space_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'CONTRIBUTOR', 'VIEWER') NOT NULL DEFAULT 'CONTRIBUTOR',
    `joined_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `invited_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `space_members_space_id_user_id_key`(`space_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `space_invites` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `space_id` INTEGER NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'CONTRIBUTOR', 'VIEWER') NOT NULL DEFAULT 'CONTRIBUTOR',
    `token` VARCHAR(255) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `space_invites_token_key`(`token`),
    INDEX `idx_space_invites_lookup`(`space_id`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `spaces` ADD CONSTRAINT `spaces_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `space_members` ADD CONSTRAINT `space_members_space_id_fkey` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `space_members` ADD CONSTRAINT `space_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `space_members` ADD CONSTRAINT `space_members_invited_by_fkey` FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `space_invites` ADD CONSTRAINT `space_invites_space_id_fkey` FOREIGN KEY (`space_id`) REFERENCES `spaces`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `space_invites` ADD CONSTRAINT `space_invites_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
