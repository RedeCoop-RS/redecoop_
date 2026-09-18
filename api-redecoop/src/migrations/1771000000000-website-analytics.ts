import { MigrationInterface, QueryRunner } from 'typeorm';

export class WebsiteAnalytics1771000000000 implements MigrationInterface {
  name = 'WebsiteAnalytics1771000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable('website_session'))) {
      await queryRunner.query(`
        CREATE TABLE \`website_session\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`visitor_id\` varchar(36) NOT NULL,
          \`session_id\` varchar(36) NOT NULL,
          \`device_type\` varchar(16) NOT NULL DEFAULT 'desktop',
          \`referrer\` varchar(300) NULL,
          \`landing_path\` varchar(180) NOT NULL,
          \`user_agent\` varchar(180) NULL,
          \`viewport_w\` int NULL,
          \`viewport_h\` int NULL,
          \`started_at\` datetime NOT NULL,
          \`last_seen_at\` datetime NOT NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX \`IDX_website_session_visitor_id\` (\`visitor_id\`),
          INDEX \`IDX_website_session_started_at\` (\`started_at\`),
          INDEX \`IDX_website_session_last_seen_at\` (\`last_seen_at\`),
          UNIQUE INDEX \`IDX_website_session_session_id\` (\`session_id\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('website_page_view'))) {
      await queryRunner.query(`
        CREATE TABLE \`website_page_view\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`visitor_id\` varchar(36) NOT NULL,
          \`session_id\` varchar(36) NOT NULL,
          \`path\` varchar(180) NOT NULL,
          \`title\` varchar(180) NULL,
          \`duration_ms\` int NOT NULL DEFAULT 0,
          \`max_scroll_pct\` tinyint UNSIGNED NOT NULL DEFAULT 0,
          \`started_at\` datetime NOT NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          INDEX \`IDX_website_page_view_path_created\` (\`path\`, \`created_at\`),
          INDEX \`IDX_website_page_view_session_id\` (\`session_id\`),
          INDEX \`IDX_website_page_view_visitor_created\` (\`visitor_id\`, \`created_at\`),
          INDEX \`IDX_website_page_view_created_at\` (\`created_at\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }

    if (!(await queryRunner.hasTable('website_click'))) {
      await queryRunner.query(`
        CREATE TABLE \`website_click\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`visitor_id\` varchar(36) NOT NULL,
          \`session_id\` varchar(36) NOT NULL,
          \`path\` varchar(180) NOT NULL,
          \`x_pct\` tinyint UNSIGNED NOT NULL,
          \`y_pct\` tinyint UNSIGNED NOT NULL,
          \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX \`IDX_website_click_path_created\` (\`path\`, \`created_at\`),
          INDEX \`IDX_website_click_created_at\` (\`created_at\`),
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('website_click')) {
      await queryRunner.query(`DROP TABLE \`website_click\``);
    }
    if (await queryRunner.hasTable('website_page_view')) {
      await queryRunner.query(`DROP TABLE \`website_page_view\``);
    }
    if (await queryRunner.hasTable('website_session')) {
      await queryRunner.query(`DROP TABLE \`website_session\``);
    }
  }
}
