import { DataSource } from 'typeorm';
import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import * as cities from './cities.json';
import { City } from '../../../city/entities/city.entity';

export default class CitySeeder implements Seeder {
  public async run(dataSource: DataSource, factoryManager: SeederFactoryManager): Promise<any> {
    const repository = dataSource.getRepository(City);

    console.log('Inserindo as cidades do Brasil');
    await Promise.all(
      cities.map((city) => {
        const { id, state_id, name, latitude, longitude, corede, functional_region } = city;
        const newCity = repository.create({
          id: Number(id),
          stateId: state_id,
          name,
          latitude: latitude ? Number(latitude) : null,
          longitude: longitude ? Number(longitude) : null,
          corede: corede ? corede : null,
          functional_region: functional_region ? functional_region : null,
        });
        return repository.save(newCity);
      }),
    );
  }
}
