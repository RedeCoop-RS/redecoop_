import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1738008384146 implements MigrationInterface {
    name = 'SchemaUpdate1738008384146'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cooperative\` ADD \`male_associates\` int NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE \`cooperative\` ADD \`female_associates\` int NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cooperative\` DROP COLUMN \`female_associates\``);
        await queryRunner.query(`ALTER TABLE \`cooperative\` DROP COLUMN \`male_associates\``);
    }

}
