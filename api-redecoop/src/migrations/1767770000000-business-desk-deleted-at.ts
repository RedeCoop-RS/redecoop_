import { MigrationInterface, QueryRunner } from 'typeorm';

export class BusinessDeskDeletedAt1767770000000 implements MigrationInterface {
  name = 'BusinessDeskDeletedAt1767770000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`business_desk\` ADD \`deleted_at\` datetime(6) NULL DEFAULT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX \`IDX_business_desk_deleted_at\` ON \`business_desk\` (\`deleted_at\`)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX \`IDX_business_desk_deleted_at\` ON \`business_desk\``);
    await queryRunner.query(`ALTER TABLE \`business_desk\` DROP COLUMN \`deleted_at\``);
  }
}
