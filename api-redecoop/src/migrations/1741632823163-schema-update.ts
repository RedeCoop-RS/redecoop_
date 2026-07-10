import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdate1741632823163 implements MigrationInterface {
    name = 'SchemaUpdate1741632823163'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`distance_range\` (\`id\` int NOT NULL AUTO_INCREMENT, \`from\` decimal(10,2) NOT NULL, \`to\` decimal(10,2) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`value_range\` (\`id\` int NOT NULL AUTO_INCREMENT, \`value\` decimal(10,2) NOT NULL, \`distance_range_id\` int NOT NULL, \`weight_range_id\` int NOT NULL, \`distanceRangeId\` int NULL, \`weightRangeId\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`weight_range\` (\`id\` int NOT NULL AUTO_INCREMENT, \`from\` decimal(10,2) NOT NULL, \`to\` decimal(10,2) NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`config_system\` DROP COLUMN \`km_cost\``);
        await queryRunner.query(`ALTER TABLE \`config_system\` DROP COLUMN \`mpy_load\``);
        await queryRunner.query(`ALTER TABLE \`config_system\` ADD \`minimum_service_tax\` decimal(5,2) NOT NULL DEFAULT '80.00'`);
        await queryRunner.query(`ALTER TABLE \`value_range\` ADD CONSTRAINT \`FK_ebe840e3896903062d00e0cf19f\` FOREIGN KEY (\`distanceRangeId\`) REFERENCES \`distance_range\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`value_range\` ADD CONSTRAINT \`FK_44c4c72debf6dcc3bdca2e9fb7f\` FOREIGN KEY (\`weightRangeId\`) REFERENCES \`weight_range\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`value_range\` DROP FOREIGN KEY \`FK_44c4c72debf6dcc3bdca2e9fb7f\``);
        await queryRunner.query(`ALTER TABLE \`value_range\` DROP FOREIGN KEY \`FK_ebe840e3896903062d00e0cf19f\``);
        await queryRunner.query(`ALTER TABLE \`config_system\` DROP COLUMN \`minimum_service_tax\``);
        await queryRunner.query(`ALTER TABLE \`config_system\` ADD \`mpy_load\` decimal(5,2) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`config_system\` ADD \`km_cost\` decimal NOT NULL`);
        await queryRunner.query(`DROP TABLE \`weight_range\``);
        await queryRunner.query(`DROP TABLE \`value_range\``);
        await queryRunner.query(`DROP TABLE \`distance_range\``);
    }

}
