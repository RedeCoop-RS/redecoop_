import { MigrationInterface, QueryRunner } from 'typeorm';

export class CooperationTerm1795000000000 implements MigrationInterface {
  name = 'CooperationTerm1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('cooperation_term'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`family_id\` varchar(36) NOT NULL,
          \`version\` int NOT NULL DEFAULT 1,
          \`name\` varchar(255) NOT NULL,
          \`process_number\` varchar(80) NOT NULL,
          \`buyer_institution\` varchar(255) NOT NULL,
          \`buyer_email\` varchar(191) NULL,
          \`model\` enum('GHC','STANDARD') NOT NULL,
          \`status\` enum('DRAFT','SIGNED') NOT NULL DEFAULT 'DRAFT',
          \`division_released\` tinyint NOT NULL DEFAULT 0,
          \`signed_at\` datetime NULL,
          \`signed_by_user_id\` int NULL,
          \`created_by_user_id\` int NULL,
          \`predecessor_id\` int NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX \`IDX_cooperation_term_family\` (\`family_id\`),
          INDEX \`IDX_cooperation_term_status\` (\`status\`),
          PRIMARY KEY (\`id\`),
          CONSTRAINT \`FK_cooperation_term_signed_by\` FOREIGN KEY (\`signed_by_user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`FK_cooperation_term_created_by\` FOREIGN KEY (\`created_by_user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL,
          CONSTRAINT \`FK_cooperation_term_predecessor\` FOREIGN KEY (\`predecessor_id\`) REFERENCES \`cooperation_term\`(\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('cooperation_term_hospital_unit'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term_hospital_unit\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`term_id\` int NOT NULL,
          \`name\` varchar(180) NOT NULL,
          \`position\` int NOT NULL DEFAULT 0,
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_cooperation_term_hospital_unit_term\` (\`term_id\`),
          CONSTRAINT \`FK_cooperation_term_hospital_unit_term\` FOREIGN KEY (\`term_id\`) REFERENCES \`cooperation_term\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('cooperation_term_item'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term_item\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`term_id\` int NOT NULL,
          \`position\` int NOT NULL DEFAULT 0,
          \`description\` varchar(500) NOT NULL,
          \`unit\` varchar(30) NOT NULL DEFAULT 'KG',
          \`estimated_quantity\` decimal(16,3) NOT NULL DEFAULT 0,
          \`unit_price\` decimal(16,2) NULL,
          \`total_price\` decimal(16,2) NULL,
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_cooperation_term_item_term\` (\`term_id\`),
          CONSTRAINT \`FK_cooperation_term_item_term\` FOREIGN KEY (\`term_id\`) REFERENCES \`cooperation_term\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('cooperation_term_item_hospital_qty'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term_item_hospital_qty\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`item_id\` int NOT NULL,
          \`hospital_unit_id\` int NOT NULL,
          \`quantity\` decimal(16,3) NOT NULL DEFAULT 0,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`UQ_cooperation_term_item_hospital\` (\`item_id\`, \`hospital_unit_id\`),
          CONSTRAINT \`FK_cooperation_term_item_hospital_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`cooperation_term_item\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_cooperation_term_item_hospital_unit\` FOREIGN KEY (\`hospital_unit_id\`) REFERENCES \`cooperation_term_hospital_unit\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('cooperation_term_interest'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term_interest\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`item_id\` int NOT NULL,
          \`cooperative_id\` int NOT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`UQ_cooperation_term_interest\` (\`item_id\`, \`cooperative_id\`),
          CONSTRAINT \`FK_cooperation_term_interest_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`cooperation_term_item\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_cooperation_term_interest_cooperative\` FOREIGN KEY (\`cooperative_id\`) REFERENCES \`cooperative\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('cooperation_term_allocation'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term_allocation\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`item_id\` int NOT NULL,
          \`cooperative_id\` int NOT NULL,
          \`quantity\` decimal(16,3) NOT NULL DEFAULT 0,
          \`max_capacity\` decimal(16,3) NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`UQ_cooperation_term_allocation\` (\`item_id\`, \`cooperative_id\`),
          CONSTRAINT \`FK_cooperation_term_allocation_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`cooperation_term_item\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_cooperation_term_allocation_cooperative\` FOREIGN KEY (\`cooperative_id\`) REFERENCES \`cooperative\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('cooperation_term_supply_month'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term_supply_month\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`item_id\` int NOT NULL,
          \`cooperative_id\` int NOT NULL,
          \`months\` json NOT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`UQ_cooperation_term_supply_month\` (\`item_id\`, \`cooperative_id\`),
          CONSTRAINT \`FK_cooperation_term_supply_item\` FOREIGN KEY (\`item_id\`) REFERENCES \`cooperation_term_item\`(\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('cooperation_term_email_log'))) {
      await queryRunner.query(`
        CREATE TABLE \`cooperation_term_email_log\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`term_id\` int NOT NULL,
          \`sent_by_user_id\` int NULL,
          \`status\` enum('SENT','SKIPPED') NOT NULL,
          \`recipients\` json NOT NULL,
          \`detail\` text NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (\`id\`),
          INDEX \`IDX_cooperation_term_email_log_term\` (\`term_id\`),
          CONSTRAINT \`FK_cooperation_term_email_log_term\` FOREIGN KEY (\`term_id\`) REFERENCES \`cooperation_term\`(\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`FK_cooperation_term_email_log_user\` FOREIGN KEY (\`sent_by_user_id\`) REFERENCES \`user\`(\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'cooperation_term_email_log',
      'cooperation_term_supply_month',
      'cooperation_term_allocation',
      'cooperation_term_interest',
      'cooperation_term_item_hospital_qty',
      'cooperation_term_item',
      'cooperation_term_hospital_unit',
      'cooperation_term',
    ]) {
      if (await queryRunner.hasTable(table)) {
        await queryRunner.query(`DROP TABLE \`${table}\``);
      }
    }
  }
}
