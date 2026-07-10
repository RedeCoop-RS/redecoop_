import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1755535931130 implements MigrationInterface {
    name = 'SchemaUpdate1755535931130'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_2a69d61de839a24cee7bcd4a12\` ON \`cooperative\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_2a69d61de839a24cee7bcd4a12\` ON \`cooperative\` (\`email\`)`);
    }

}
