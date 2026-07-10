import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { ConfigSystem } from '@/configSystem/entities/configSystem.entity';

export default class ConfigSeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    const configRepository = dataSource.getRepository(ConfigSystem);

    console.log('Criando configuração inicial...');

    await configRepository.upsert({ id: 1, serviceTax: 2, minimumServiceTax: 80 }, ['id']);
  }
}
