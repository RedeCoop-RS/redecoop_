import { DataSource, DataSourceOptions } from "typeorm";
import { runSeeders, SeederOptions } from "typeorm-extension";
import { typeOrmModuleOptions } from "../config";
import MainSeeder from "./main.seed";

const options: DataSourceOptions & SeederOptions = {
    ...typeOrmModuleOptions,
    seeds: [MainSeeder]
};

export const AppDataSource = new DataSource(options);