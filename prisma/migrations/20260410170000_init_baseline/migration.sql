-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPERADMIN', 'DIRECTOR', 'DY_DIRECTOR', 'MANAGER', 'INCHARGE', 'EMPLOYEE') NOT NULL DEFAULT 'EMPLOYEE',
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `canCreateTasks` BOOLEAN NOT NULL DEFAULT false,
    `canManageComplexities` BOOLEAN NOT NULL DEFAULT false,
    `canManagePersonnel` BOOLEAN NOT NULL DEFAULT false,
    `canManageWorkcenters` BOOLEAN NOT NULL DEFAULT false,
    `canManagePriorities` BOOLEAN NOT NULL DEFAULT false,
    `canManageUsers` BOOLEAN NOT NULL DEFAULT false,
    `canManageSettings` BOOLEAN NOT NULL DEFAULT false,
    `canManageReceives` BOOLEAN NOT NULL DEFAULT false,
    `canViewAllSubmissions` BOOLEAN NOT NULL DEFAULT false,
    `canApproveCompletions` BOOLEAN NOT NULL DEFAULT false,
    `canRevertCompletions` BOOLEAN NOT NULL DEFAULT false,
    `canViewReports` BOOLEAN NOT NULL DEFAULT false,
    `includeInAllStaff` BOOLEAN NOT NULL DEFAULT true,
    `designation` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `workcenterId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_staffId_key`(`staffId`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_role_idx`(`role`),
    INDEX `User_workcenterId_idx`(`workcenterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `recordNumber` VARCHAR(191) NOT NULL,
    `fileNumber` VARCHAR(191) NULL,
    `submissionMode` ENUM('SINGLE', 'MULTIPLE') NOT NULL DEFAULT 'MULTIPLE',
    `issuanceDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `issuanceMessage` TEXT NULL,
    `descriptionOfWork` TEXT NOT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `externalAssigneeName` VARCHAR(191) NULL,
    `externalAssigneeEmail` VARCHAR(191) NULL,
    `receiveId` VARCHAR(191) NULL,
    `priorityId` VARCHAR(191) NOT NULL,
    `complexityId` VARCHAR(191) NOT NULL,
    `assignedPersonnelId` VARCHAR(191) NULL,
    `workcenterId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `assignedCompletionDate` DATETIME(3) NOT NULL,
    `lastDeadlineReminder` DATETIME(3) NULL,
    `acknowledgedById` VARCHAR(191) NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `isNotice` BOOLEAN NOT NULL DEFAULT false,
    `noticeGroupId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Task_recordNumber_key`(`recordNumber`),
    INDEX `Task_recordNumber_idx`(`recordNumber`),
    INDEX `Task_fileNumber_idx`(`fileNumber`),
    INDEX `Task_assignedToId_idx`(`assignedToId`),
    INDEX `Task_status_idx`(`status`),
    INDEX `Task_createdById_idx`(`createdById`),
    INDEX `Task_assignedCompletionDate_idx`(`assignedCompletionDate`),
    INDEX `Task_isNotice_idx`(`isNotice`),
    INDEX `Task_noticeGroupId_idx`(`noticeGroupId`),
    INDEX `Task_receiveId_idx`(`receiveId`),
    INDEX `Task_priorityId_idx`(`priorityId`),
    INDEX `Task_complexityId_idx`(`complexityId`),
    INDEX `Task_assignedPersonnelId_idx`(`assignedPersonnelId`),
    INDEX `Task_workcenterId_idx`(`workcenterId`),
    UNIQUE INDEX `Task_receiveId_key`(`receiveId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `filepath` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaskAttachment_taskId_idx`(`taskId`),
    INDEX `TaskAttachment_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskAction` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `actionType` ENUM('CREATED', 'ASSIGNED', 'FORWARDED', 'SUBMITTED', 'ADD_INFO', 'CLOSED', 'REVERTED', 'EDITED', 'ACKNOWLEDGED', 'REJECTED') NOT NULL,
    `description` TEXT NULL,
    `performedById` VARCHAR(191) NOT NULL,
    `forwardedToId` VARCHAR(191) NULL,
    `forwardedToEmail` VARCHAR(191) NULL,
    `referenceNumber` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaskAction_taskId_idx`(`taskId`),
    INDEX `TaskAction_performedById_idx`(`performedById`),
    INDEX `TaskAction_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskHistory` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `oldValue` TEXT NULL,
    `newValue` TEXT NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaskHistory_taskId_idx`(`taskId`),
    INDEX `TaskHistory_changedById_idx`(`changedById`),
    INDEX `TaskHistory_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `type` ENUM('TASK_ASSIGNED', 'TASK_FORWARDED', 'TASK_CLOSED', 'TASK_UPDATED') NOT NULL,
    `message` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `lastReminderSent` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_read_idx`(`read`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isOriginal` BOOLEAN NOT NULL DEFAULT false,
    `isCc` BOOLEAN NOT NULL DEFAULT false,
    `originalAssigneeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaskAssignment_taskId_idx`(`taskId`),
    INDEX `TaskAssignment_userId_idx`(`userId`),
    INDEX `TaskAssignment_isOriginal_idx`(`isOriginal`),
    INDEX `TaskAssignment_isCc_idx`(`isCc`),
    INDEX `TaskAssignment_originalAssigneeId_idx`(`originalAssigneeId`),
    UNIQUE INDEX `TaskAssignment_taskId_userId_key`(`taskId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'SUBMITTED', 'ACKNOWLEDGED', 'REJECTED', 'FORWARDED') NOT NULL DEFAULT 'PENDING',
    `submissionDescription` TEXT NULL,
    `attachmentFilename` VARCHAR(191) NULL,
    `attachmentFilepath` VARCHAR(191) NULL,
    `attachmentMimeType` VARCHAR(191) NULL,
    `attachmentSize` INTEGER NULL,
    `submittedAt` DATETIME(3) NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `acknowledgedById` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectedById` VARCHAR(191) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TaskSubmission_taskId_idx`(`taskId`),
    INDEX `TaskSubmission_userId_idx`(`userId`),
    INDEX `TaskSubmission_status_idx`(`status`),
    UNIQUE INDEX `TaskSubmission_taskId_userId_key`(`taskId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Workcenter` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Workcenter_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Receive` (
    `id` VARCHAR(191) NOT NULL,
    `referenceNumber` VARCHAR(191) NOT NULL,
    `letterReferenceNumber` VARCHAR(191) NULL,
    `receivedFrom` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `receivedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('OPEN', 'ASSIGNED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdById` VARCHAR(191) NOT NULL,
    `closedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `closedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Receive_referenceNumber_key`(`referenceNumber`),
    INDEX `Receive_status_idx`(`status`),
    INDEX `Receive_createdById_idx`(`createdById`),
    INDEX `Receive_closedById_idx`(`closedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SequenceCounter` (
    `name` VARCHAR(191) NOT NULL,
    `value` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`name`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppConfig` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'default',
    `currentFy` VARCHAR(191) NOT NULL,
    `dispatchStartNumber` INTEGER NOT NULL DEFAULT 1,
    `receiveStartNumber` INTEGER NOT NULL DEFAULT 1,
    `masterfileStartNumber` INTEGER NOT NULL DEFAULT 1,
    `smtpHost` VARCHAR(191) NULL,
    `smtpPort` INTEGER NULL,
    `smtpSecure` BOOLEAN NOT NULL DEFAULT false,
    `smtpUser` VARCHAR(191) NULL,
    `smtpPassEncrypted` TEXT NULL,
    `smtpFrom` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MasterfileRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `fiscalYear` VARCHAR(191) NOT NULL,
    `masterfileNumber` VARCHAR(191) NOT NULL,
    `masterfileTotal` INTEGER NOT NULL,
    `subjectOfLetter` VARCHAR(191) NOT NULL,
    `descriptionOfLetter` TEXT NOT NULL,
    `letterAddressedTo` VARCHAR(191) NOT NULL,
    `pdfFilename` VARCHAR(191) NULL,
    `pdfFilepath` VARCHAR(191) NULL,
    `pdfMimeType` VARCHAR(191) NULL,
    `pdfSize` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MasterfileRequest_masterfileNumber_key`(`masterfileNumber`),
    INDEX `MasterfileRequest_userId_idx`(`userId`),
    INDEX `MasterfileRequest_fiscalYear_idx`(`fiscalYear`),
    INDEX `MasterfileRequest_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Complexity` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Complexity_name_key`(`name`),
    UNIQUE INDEX `Complexity_order_key`(`order`),
    INDEX `Complexity_order_idx`(`order`),
    INDEX `Complexity_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AssignedPersonnel` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AssignedPersonnel_name_key`(`name`),
    UNIQUE INDEX `AssignedPersonnel_order_key`(`order`),
    INDEX `AssignedPersonnel_order_idx`(`order`),
    INDEX `AssignedPersonnel_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Priority` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Priority_name_key`(`name`),
    UNIQUE INDEX `Priority_order_key`(`order`),
    INDEX `Priority_order_idx`(`order`),
    INDEX `Priority_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_workcenterId_fkey` FOREIGN KEY (`workcenterId`) REFERENCES `Workcenter`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_acknowledgedById_fkey` FOREIGN KEY (`acknowledgedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_receiveId_fkey` FOREIGN KEY (`receiveId`) REFERENCES `Receive`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_priorityId_fkey` FOREIGN KEY (`priorityId`) REFERENCES `Priority`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_complexityId_fkey` FOREIGN KEY (`complexityId`) REFERENCES `Complexity`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assignedPersonnelId_fkey` FOREIGN KEY (`assignedPersonnelId`) REFERENCES `AssignedPersonnel`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_workcenterId_fkey` FOREIGN KEY (`workcenterId`) REFERENCES `Workcenter`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAttachment` ADD CONSTRAINT `TaskAttachment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAttachment` ADD CONSTRAINT `TaskAttachment_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAction` ADD CONSTRAINT `TaskAction_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAction` ADD CONSTRAINT `TaskAction_performedById_fkey` FOREIGN KEY (`performedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAction` ADD CONSTRAINT `TaskAction_forwardedToId_fkey` FOREIGN KEY (`forwardedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskHistory` ADD CONSTRAINT `TaskHistory_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskHistory` ADD CONSTRAINT `TaskHistory_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignment` ADD CONSTRAINT `TaskAssignment_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskAssignment` ADD CONSTRAINT `TaskAssignment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskSubmission` ADD CONSTRAINT `TaskSubmission_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskSubmission` ADD CONSTRAINT `TaskSubmission_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskSubmission` ADD CONSTRAINT `TaskSubmission_acknowledgedById_fkey` FOREIGN KEY (`acknowledgedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskSubmission` ADD CONSTRAINT `TaskSubmission_rejectedById_fkey` FOREIGN KEY (`rejectedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receive` ADD CONSTRAINT `Receive_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Receive` ADD CONSTRAINT `Receive_closedById_fkey` FOREIGN KEY (`closedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MasterfileRequest` ADD CONSTRAINT `MasterfileRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

