import { BadRequestException, Injectable } from '@nestjs/common';
import { ReportDto, ReportTypes } from '../Dtos/report.dto';
import { ProductsByCooperativeReportUseCase } from './productsByCooperative.usecase';
import { TravelsMadeByCooperativeUseCase } from './travelsMadeByCooperative.usecase';
import { ProductsTransportedByCooperativeUseCase } from './productsTransportedByCooperative.usecase';
import { TravelPriceReportUseCase } from './travelPrices.usecase';

@Injectable()
export class HandleReportsUseCase {
  constructor(
    private readonly productsByCooperativeReportUseCase: ProductsByCooperativeReportUseCase,
    private readonly travelsMadeByCooperativeUseCase: TravelsMadeByCooperativeUseCase,
    private readonly productsTransportedByCooperativeUseCase: ProductsTransportedByCooperativeUseCase,
    private readonly travelPriceReportUseCase: TravelPriceReportUseCase,
  ) {}

  public async execute(body: ReportDto) {

    if (body.type === ReportTypes.PRODUCTS_COOPERATIVE) {
      if (!body.cooperativeId) {
        throw new BadRequestException('Informe a cooperativa');
      }

      return await this.productsByCooperativeReportUseCase.execute(
        body.cooperativeId,
        body.productCategoryId,
      );
    } else if (body.type === ReportTypes.TRAVELS_MADE_COOPERATIVE) {
      if (!body.startDate || !body.endDate) {
        throw new BadRequestException('Informe o periodo desejado!');
      }

      return await this.travelsMadeByCooperativeUseCase.execute(body.startDate, body.endDate);
    } else if (body.type === ReportTypes.PRODUCTS_TRANSPORTED_BY_COOPERATIVE) {
      if (!body.cooperativeId) {
        throw new BadRequestException('Informe a cooperativa');
      }

      if (!body.startDate || !body.endDate) {
        throw new BadRequestException('Informe o periodo desejado!');
      }

      if (new Date(body.startDate) > new Date(body.endDate)) {
        throw new BadRequestException('A data de início deve ser anterior à data de término.');
      }

      return await this.productsTransportedByCooperativeUseCase.execute(
        body.cooperativeId,
        body.startDate,
        body.endDate,
      );
    } else if (body.type === ReportTypes.TRAVELS_PRICE_FINISHED) {
      if (!body.startDate || !body.endDate) {
        throw new BadRequestException('Informe o periodo desejado!');
      }

      if (new Date(body.startDate) > new Date(body.endDate)) {
        throw new BadRequestException('A data de início deve ser anterior à data de término.');
      }

      return await this.travelPriceReportUseCase.execute(body.startDate, body.endDate);
    } else {
      throw new BadRequestException('Relatório não implementado.');
    }
  }
}
