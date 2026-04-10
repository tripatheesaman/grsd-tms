ALTER TABLE `Task` ADD FULLTEXT INDEX `Task_fulltext_body` (`descriptionOfWork`, `issuanceMessage`);
ALTER TABLE `Task` ADD FULLTEXT INDEX `Task_fulltext_numbers` (`recordNumber`, `fileNumber`);
ALTER TABLE `Receive` ADD FULLTEXT INDEX `Receive_fulltext_subject` (`subject`);
ALTER TABLE `User` ADD FULLTEXT INDEX `User_fulltext_identity` (`name`, `email`);
