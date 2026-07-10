import { Injectable } from '@nestjs/common';
import { ReportFilters, ReportTypes } from '../Dtos/report.dto';

@Injectable()
export class ReportsAvailableUseCase {
  public async execute() {
    return [
      {
        type: ReportTypes.PRODUCTS_COOPERATIVE,
        name: 'Produtos Cadastrados Por Cooperativa',
        filters: [
          {
            type: ReportFilters.COOPERATIVEID,
            required: true,
          },
          {
            type: ReportFilters.PRODUCTCATEGORYID,
            required: false,
          },
        ],
      },
      {
        type: ReportTypes.TRAVELS_MADE_COOPERATIVE,
        name: 'Viagens Realizadas pelas Cooperativas',
        filters: [
          {
            type: ReportFilters.PERIOD,
            required: true,
          },
        ],
      },
      {
        type: ReportTypes.PRODUCTS_TRANSPORTED_BY_COOPERATIVE,
        name: 'Produtos transportados por Cooperativa, Peso e Período',
        filters: [
          {
            type: ReportFilters.PERIOD,
            required: true,
          },
          {
            type: ReportFilters.COOPERATIVEID,
            required: true,
          },
        ],
      },
      {
        type: ReportTypes.TRAVELS_PRICE_FINISHED,
        name: 'Preço Viagens Finalizadas',
        filters: [
          {
            type: ReportFilters.PERIOD,
            required: true,
          },
        ],
      },
    ];
  }
}
