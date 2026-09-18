import { MigrationInterface, QueryRunner } from 'typeorm';

export class TravelCompletedAt1770000000000 implements MigrationInterface {
  name = 'TravelCompletedAt1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('travel', 'completed_at')) return;
    await queryRunner.query(
      `ALTER TABLE \`travel\` ADD \`completed_at\` timestamp NULL DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('travel', 'completed_at'))) return;
    await queryRunner.query(`ALTER TABLE \`travel\` DROP COLUMN \`completed_at\``);
  }
}
