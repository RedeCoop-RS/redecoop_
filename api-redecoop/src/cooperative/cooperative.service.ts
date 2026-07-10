import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Cooperative } from './entities/cooperative.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from '@/email/services/email.service';
import { CooperativeDeliveryCity } from './entities/cooperative-delivery-city.entity';

@Injectable()
export class CooperativeService {
  constructor(
    @InjectRepository(Cooperative)
    private readonly cooperativeRepository: Repository<Cooperative>,
    @InjectRepository(CooperativeDeliveryCity)
    private readonly deliveryCityRepository: Repository<CooperativeDeliveryCity>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  //Fluxo Mudou
/*   async generateTokenForCooperativeSignup(cooperativeId: number): Promise<string> {
    const payload = { cooperativeId };
    return this.jwtService.sign(payload, { expiresIn: '1h' });
  } */

  async validateTokenCooperativeSignup(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return payload.cooperativeId;
    } catch (error) {
      throw new BadRequestException('Token inválido ou Expirado!');
    }
  }

  //Fluxo mudou
  /*   async sendRegistrationCompletionEmail(email: string, token: string) {
    const websiteUrl = process.env.WEBSITE_URL + '/completar-cadastro/' + token;
    const content = `
    <p>Seja bem-vindo a plataforma da Redecoop</P
    <p>Falta pouco para você aproveitar todos os beneficios da nossa plataforma, <a href="${websiteUrl}">Clique aqui</a> e complete seu cadastro</p>
    <br/>
    <p>Não esta conseguindo clicar? copie a url a seguir e cole no seu navegador: ${websiteUrl}</p>
    `;

    await this.emailService.sendEmail({
      to: email,
      subject: 'Seja bem-vindo a plataforma da Redecoop - Completar Cadastro',
      body: content,
    });
  } */

  async calculateTotalProductsPerCategory(cooperativeId: number) {
    const cooperative = await this.cooperativeRepository.findOne({
      where: { id: cooperativeId },
      relations: {
        catalogs: { product: { productCategory: true } },
      },
    });
    if (!cooperative?.catalogs?.length) {
      return {};
    }
    return cooperative.catalogs.reduce<Record<string, number>>((acc, catalog) => {
      const category = catalog.product?.productCategory?.name;
      if (!category) {
        return acc;
      }
      acc[category] = (acc[category] ?? 0) + 1;
      return acc;
    }, {});
  }

  async updateDeliveryCities(cooperativeId: number, cityIds: number[]) {
    await this.deliveryCityRepository.delete({ cooperative: { id: cooperativeId } });

    const newCities = cityIds.map((cityId) => ({
      cooperative: { id: cooperativeId },
      city: { id: cityId },
    }));

    await this.deliveryCityRepository.insert(newCities);
  }
}
