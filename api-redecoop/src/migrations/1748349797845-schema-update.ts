import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1748349797845 implements MigrationInterface {
    name = 'SchemaUpdate1748349797845'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`deleted_at\` \`is_active\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`is_active\``);
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`product\` DROP COLUMN \`is_active\``);
        await queryRunner.query(`ALTER TABLE \`product\` ADD \`is_active\` datetime(6) NULL`);
        await queryRunner.query(`ALTER TABLE \`product\` CHANGE \`is_active\` \`deleted_at\` datetime(6) NULL`);
    }

}
