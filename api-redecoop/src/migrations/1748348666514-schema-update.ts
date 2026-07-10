import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1748348666514 implements MigrationInterface {
    name = 'SchemaUpdate1748348666514'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`deleted_at\` datetime(6) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`deleted_at\``);
    }

}
