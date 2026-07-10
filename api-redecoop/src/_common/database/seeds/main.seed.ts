import { DataSource } from 'typeorm';
import { runSeeder, Seeder, SeederFactoryManager } from 'typeorm-extension';
import UserSeeder from './user.seed';
import StateSeeder from './state.seed';
import CitySeeder from './city.seed';
import ConfigSeeder from './config.seed';

export default class MainSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    await runSeeder(dataSource, UserSeeder);
    await runSeeder(dataSource, StateSeeder);
    await runSeeder(dataSource, CitySeeder);
    await runSeeder(dataSource, ConfigSeeder);
  }
}
