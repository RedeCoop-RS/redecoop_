import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1755279984771 implements MigrationInterface {
    name = 'SchemaUpdate1755279984771'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`catalog\` ADD \`deleted_at\` datetime(6) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`catalog\` DROP COLUMN \`deleted_at\``);
    }

}
