import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1743452489559 implements MigrationInterface {
    name = 'SchemaUpdate1743452489559'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cooperative\` ADD \`type\` enum ('CENTRAL', 'SINGULAR') NOT NULL DEFAULT 'SINGULAR'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cooperative\` DROP COLUMN \`type\``);
    }

}
