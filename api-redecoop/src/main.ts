import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  ClassSerializerInterceptor,
  INestApplication,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { errorFormatter } from './_common/helpers/errorFormatter.helper';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { initializeTransactionalContext, StorageDriver } from 'typeorm-transactional';
import { CustomResponseInterceptor } from './_common/interceptors/response.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import initSwagger from './swagger';

async function bootstrap() {
  process.env.TZ = 'Etc/Universal';
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  registerGlobals(app);
  app.useStaticAssets(join(__dirname, '..', 'upload'), {
    index: false,
    prefix: '/storage',
  });
  app.setGlobalPrefix('api');
  app.enableCors();
  initSwagger(app);

  await app.listen(process.env.PORT || 3000);
}

export function registerGlobals(app: INestApplication) {
  app.useGlobalInterceptors(new CustomResponseInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const formattedErrors = errorFormatter(errors);
        return new BadRequestException({ errors: formattedErrors });
      },
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector), {
      excludeExtraneousValues: true,
    }),
  );
}

bootstrap();
