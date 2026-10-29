import { MigrationInterface, QueryRunner } from 'typeorm';

export class GhostConnection1772300000000 implements MigrationInterface {
  name = 'GhostConnection1772300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('ghost_connection')) return;
    await queryRunner.query(`
      CREATE TABLE \`ghost_connection\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`admin_url\` varchar(500) NOT NULL,
        \`api_key_cipher\` text NULL,
        \`key_hint\` varchar(16) NULL,
        \`updated_by_user_id\` int NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('ghost_connection')) {
      await queryRunner.query('DROP TABLE `ghost_connection`');
    }
  }
}
