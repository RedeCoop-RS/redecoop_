import { MigrationInterface, QueryRunner } from 'typeorm';

export class CooperativeYoungAssociates1767790000000 implements MigrationInterface {
  name = 'CooperativeYoungAssociates1767790000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`cooperative\` ADD \`young_associates\` int NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`cooperative\` DROP COLUMN \`young_associates\``);
  }
}
