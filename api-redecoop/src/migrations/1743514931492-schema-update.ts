import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1743514931492 implements MigrationInterface {
    name = 'SchemaUpdate1743514931492'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cooperative\` ADD \`dap\` varchar(255) NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cooperative\` DROP COLUMN \`dap\``);
    }

}
