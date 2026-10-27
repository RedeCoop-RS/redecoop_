import { MigrationInterface, QueryRunner } from 'typeorm';

export class Mailbox1772000000000 implements MigrationInterface {
  name = 'Mailbox1772000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('mailbox_account'))) {
      await queryRunner.query(`
        CREATE TABLE \`mailbox_account\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`label\` varchar(120) NOT NULL DEFAULT 'Caixa principal',
          \`email\` varchar(191) NOT NULL,
          \`display_name\` varchar(191) NULL,
          \`imap_host\` varchar(191) NOT NULL,
          \`imap_port\` int NOT NULL DEFAULT 993,
          \`imap_secure\` tinyint NOT NULL DEFAULT 1,
          \`smtp_host\` varchar(191) NOT NULL,
          \`smtp_port\` int NOT NULL DEFAULT 465,
          \`smtp_secure\` tinyint NOT NULL DEFAULT 1,
          \`username\` varchar(191) NOT NULL,
          \`password_cipher\` text NOT NULL,
          \`signature_html\` text NULL,
          \`sync_interval_seconds\` int NOT NULL DEFAULT 60,
          \`last_sync_at\` datetime NULL,
          \`last_error\` text NULL,
          \`created_by_user_id\` int NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('mailbox_folder'))) {
      await queryRunner.query(`
        CREATE TABLE \`mailbox_folder\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`account_id\` int NOT NULL,
          \`path\` varchar(500) NOT NULL,
          \`name\` varchar(255) NOT NULL,
          \`special_use\` varchar(32) NOT NULL DEFAULT 'other',
          \`unread_count\` int NOT NULL DEFAULT 0,
          \`total_count\` int NOT NULL DEFAULT 0,
          \`uid_validity\` varchar(40) NULL,
          \`selectable\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`UQ_mailbox_folder_account_path\` (\`account_id\`, \`path\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_mailbox_folder_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`mailbox_account\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('mailbox_message'))) {
      await queryRunner.query(`
        CREATE TABLE \`mailbox_message\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`account_id\` int NOT NULL,
          \`folder_id\` int NOT NULL,
          \`uid\` int UNSIGNED NOT NULL,
          \`message_id\` varchar(512) NULL,
          \`thread_key\` varchar(512) NOT NULL,
          \`in_reply_to\` varchar(512) NULL,
          \`references_header\` text NULL,
          \`subject\` varchar(998) NOT NULL DEFAULT '',
          \`from_name\` varchar(255) NULL,
          \`from_address\` varchar(255) NULL,
          \`to_addresses\` text NULL,
          \`cc_addresses\` text NULL,
          \`reply_to_addresses\` text NULL,
          \`message_date\` datetime NULL,
          \`snippet\` varchar(500) NULL,
          \`seen\` tinyint NOT NULL DEFAULT 0,
          \`flagged\` tinyint NOT NULL DEFAULT 0,
          \`answered\` tinyint NOT NULL DEFAULT 0,
          \`has_attachments\` tinyint NOT NULL DEFAULT 0,
          \`size\` int NOT NULL DEFAULT 0,
          \`text_body\` mediumtext NULL,
          \`html_body\` mediumtext NULL,
          \`attachments_meta\` text NULL,
          \`body_cached\` tinyint NOT NULL DEFAULT 0,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE INDEX \`UQ_mailbox_message_folder_uid\` (\`folder_id\`, \`uid\`),
          INDEX \`IDX_mailbox_message_thread\` (\`account_id\`, \`thread_key\`),
          INDEX \`IDX_mailbox_message_folder_date\` (\`folder_id\`, \`message_date\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_mailbox_message_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`mailbox_account\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_mailbox_message_folder\` FOREIGN KEY (\`folder_id\`) REFERENCES \`mailbox_folder\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('mailbox_draft'))) {
      await queryRunner.query(`
        CREATE TABLE \`mailbox_draft\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`account_id\` int NOT NULL,
          \`to_text\` text NULL,
          \`cc_text\` text NULL,
          \`bcc_text\` text NULL,
          \`subject\` varchar(998) NOT NULL DEFAULT '',
          \`html\` mediumtext NULL,
          \`mode\` varchar(32) NOT NULL DEFAULT 'new',
          \`source_folder\` varchar(500) NULL,
          \`source_uid\` int UNSIGNED NULL,
          \`in_reply_to\` varchar(512) NULL,
          \`references_header\` text NULL,
          \`include_signature\` tinyint NOT NULL DEFAULT 1,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX \`IDX_mailbox_draft_account\` (\`account_id\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_mailbox_draft_account\` FOREIGN KEY (\`account_id\`) REFERENCES \`mailbox_account\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('mailbox_draft_attachment'))) {
      await queryRunner.query(`
        CREATE TABLE \`mailbox_draft_attachment\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`draft_id\` int NOT NULL,
          \`filename\` varchar(255) NOT NULL,
          \`content_type\` varchar(191) NOT NULL DEFAULT 'application/octet-stream',
          \`size\` int NOT NULL,
          \`storage_name\` varchar(255) NOT NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_mailbox_draft_attachment_draft\` (\`draft_id\`),
          CONSTRAINT \`FK_mailbox_draft_attachment_draft\` FOREIGN KEY (\`draft_id\`) REFERENCES \`mailbox_draft\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('mailbox_audit_log'))) {
      await queryRunner.query(`
        CREATE TABLE \`mailbox_audit_log\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`user_id\` int NULL,
          \`account_id\` int NULL,
          \`action\` varchar(32) NOT NULL,
          \`recipients\` text NOT NULL,
          \`subject\` varchar(998) NOT NULL DEFAULT '',
          \`message_id\` varchar(512) NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX \`IDX_mailbox_audit_created\` (\`created_at\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'mailbox_audit_log',
      'mailbox_draft_attachment',
      'mailbox_draft',
      'mailbox_message',
      'mailbox_folder',
      'mailbox_account',
    ]) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.query(`DROP TABLE \`${table}\``);
      }
    }
  }
}
