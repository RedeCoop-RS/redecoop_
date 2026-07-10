import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1748006384615 implements MigrationInterface {
    name = 'SchemaUpdate1748006384615'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`visitant\` ADD \`type\` enum ('PRIVADO', 'PUBLICO') NOT NULL DEFAULT 'PRIVADO'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`visitant\` DROP COLUMN \`type\``);
    }

}
