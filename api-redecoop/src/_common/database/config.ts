import { config } from 'dotenv';
import path, { join } from 'path';
import { Cooperative } from 'src/cooperative/entities/cooperative.entity';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

config();
export const typeOrmModuleOptions: DataSourceOptions = {
    type: process.env.DATABASE_TYPE as 'mysql',
    host: process.env.DATABASE_HOST,
    port: +process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    synchronize: false,
    namingStrategy: new SnakeNamingStrategy(),
    entities: [join(__dirname, '..', '..', '**', 'entities', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', '..', 'migrations', '*.{ts,js}')],
    
}

export const AppDataSource = new DataSource(typeOrmModuleOptions);