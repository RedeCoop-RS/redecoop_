import { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogCustomImage1767781000000 implements MigrationInterface {
  name = 'CatalogCustomImage1767781000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn('catalog', 'custom_image')) return;
    await queryRunner.query(`ALTER TABLE \`catalog\` ADD \`custom_image\` varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn('catalog', 'custom_image'))) return;
    await queryRunner.query(`ALTER TABLE \`catalog\` DROP COLUMN \`custom_image\``);
  }
}
