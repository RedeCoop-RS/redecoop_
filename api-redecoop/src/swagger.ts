import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export default function initSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Redecoop API Documentação')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      in: 'header',
    })
    .addTag('Auth')
    .addTag('Business')
    .addTag('BusinessDesk')
    .addTag('Catalog')
    .addTag('City')
    .addTag('CollectivePurchase')
    .addTag('ConfigSystem')
    .addTag('Conversation')
    .addTag('Cooperative')
    .addTag('Driver')
    .addTag('Faq')
    .addTag('Maps')
    .addTag('Packaging')
    .addTag('Product')
    .addTag('ProductCategory')
    .addTag('ProductType', 'ProductType ou Tipo de carga são a mesma coisa')
    .addTag('State')
    .addTag('Travel')
    .addTag('TravelOffer')
    .addTag('Vehicle')
    .addTag('VehicleType')
    .addTag('Visitant')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);
}
