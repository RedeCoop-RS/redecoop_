import { MigrationInterface, QueryRunner } from 'typeorm';

export class CooperationTermOfficialLayout1795100000000 implements MigrationInterface {
  name = 'CooperationTermOfficialLayout1795100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('cooperation_term_item', 'item_number'))) {
      await queryRunner.query(
        'ALTER TABLE `cooperation_term_item` ADD `item_number` int NULL AFTER `position`',
      );
      await queryRunner.query(
        'UPDATE `cooperation_term_item` SET `item_number` = `position` WHERE `item_number` IS NULL',
      );
    }

    if (!(await queryRunner.hasColumn('cooperation_term_email_log', 'kind'))) {
      await queryRunner.query(
        "ALTER TABLE `cooperation_term_email_log` ADD `kind` enum('TERM','DIVISION') NOT NULL DEFAULT 'TERM' AFTER `term_id`",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('cooperation_term_email_log', 'kind')) {
      await queryRunner.query('ALTER TABLE `cooperation_term_email_log` DROP COLUMN `kind`');
    }
    if (await queryRunner.hasColumn('cooperation_term_item', 'item_number')) {
      await queryRunner.query('ALTER TABLE `cooperation_term_item` DROP COLUMN `item_number`');
    }
  }
}
