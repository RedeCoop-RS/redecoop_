import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1743449456876 implements MigrationInterface {
    name = 'SchemaUpdate1743449456876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`city\` ADD \`latitude\` decimal(10,7) NULL`);
        await queryRunner.query(`ALTER TABLE \`city\` ADD \`longitude\` decimal(10,7) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`city\` DROP COLUMN \`longitude\``);
        await queryRunner.query(`ALTER TABLE \`city\` DROP COLUMN \`latitude\``);
    }

}
