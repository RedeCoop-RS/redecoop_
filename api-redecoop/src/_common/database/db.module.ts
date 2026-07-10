import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { addTransactionalDataSource, deleteDataSourceByName } from 'typeorm-transactional';
import { DataSource } from 'typeorm';
import { typeOrmModuleOptions } from './config';
import { join } from 'path';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory() {
        return {
          ...typeOrmModuleOptions,
          autoLoadEntities: true,
          cli: {
            migrationsDir: __dirname + '/migrations/',
          },
        };
      },
      async dataSourceFactory(options) {
        deleteDataSourceByName('default');
        if (!options) {
          throw new Error('Invalid options passed');
        }
        return addTransactionalDataSource(new DataSource(options));
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DbModule {}
