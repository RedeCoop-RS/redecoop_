import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessDeskDeletedAt1767770000000 implements MigrationInterface {
  name = 'BusinessDeskDeletedAt1767770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('business_desk', 'deleted_at');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE \`business_desk\` ADD \`deleted_at\` datetime(6) NULL DEFAULT NULL`,
      );
    }

    const indexes = await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_desk' AND INDEX_NAME = 'IDX_business_desk_deleted_at'
       LIMIT 1`,
    );
    if (!indexes.length) {
      await queryRunner.query(
        `CREATE INDEX \`IDX_business_desk_deleted_at\` ON \`business_desk\` (\`deleted_at\`)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const indexes = await queryRunner.query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'business_desk' AND INDEX_NAME = 'IDX_business_desk_deleted_at'
       LIMIT 1`,
    );
    if (indexes.length) {
      await queryRunner.query(`DROP INDEX \`IDX_business_desk_deleted_at\` ON \`business_desk\``);
    }
    if (await queryRunner.hasColumn('business_desk', 'deleted_at')) {
      await queryRunner.query(`ALTER TABLE \`business_desk\` DROP COLUMN \`deleted_at\``);
    }
  }
}
