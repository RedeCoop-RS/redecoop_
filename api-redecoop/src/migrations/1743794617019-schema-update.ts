import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1743794617019 implements MigrationInterface {
    name = 'SchemaUpdate1743794617019'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`cooperative_delivery_cities\` (\`id\` int NOT NULL AUTO_INCREMENT, \`cooperative_id\` int NULL, \`city_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`city\` ADD \`corede\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`city\` ADD \`functional_region\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`cooperative_delivery_cities\` ADD CONSTRAINT \`FK_aefe63d1e45fee450afac297f98\` FOREIGN KEY (\`cooperative_id\`) REFERENCES \`cooperative\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`cooperative_delivery_cities\` ADD CONSTRAINT \`FK_8f94023589f5ac7b0c9c2a8f24d\` FOREIGN KEY (\`city_id\`) REFERENCES \`city\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`cooperative_delivery_cities\` DROP FOREIGN KEY \`FK_8f94023589f5ac7b0c9c2a8f24d\``);
        await queryRunner.query(`ALTER TABLE \`cooperative_delivery_cities\` DROP FOREIGN KEY \`FK_aefe63d1e45fee450afac297f98\``);
        await queryRunner.query(`ALTER TABLE \`city\` DROP COLUMN \`functional_region\``);
        await queryRunner.query(`ALTER TABLE \`city\` DROP COLUMN \`corede\``);
        await queryRunner.query(`DROP TABLE \`cooperative_delivery_cities\``);
    }

}
