import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { ExampleObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

interface PaginatedSwaggerDocsOptions {
  sortableColumns?: string[];
  filterableColumns?: string[];
}

export function PaginatedSwagger(options: PaginatedSwaggerDocsOptions = {}) {
  const sortByDescription = `Campos e direções de ordenação, ex: createdAt:DESC. Opções disponíveis: ${options.sortableColumns?.join(', ')}`;

  const queries = [
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Número da página para a paginação',
      example: 1,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Número de itens por página',
      example: 20,
    }),
    ApiQuery({
      name: 'filter',
      required: false,
      type: Object,
      description: 'Campos e valores para filtro',
    }),
  ];

  if (options.filterableColumns) {
    options.filterableColumns.forEach((field) => {
      queries.push(
        ApiQuery({
          name: `filter.${field}`,
          required: false,
          type: Number,
          description: `Filtrar por ${field}`,
        }),
      );
    });
  }

  if (options.sortableColumns) {
    const sortByExamples: Record<string, ExampleObject> = {};
    options.sortableColumns.forEach((column) => {
      sortByExamples[`${column}:ASC`] = { value: `${column}:ASC` };
      sortByExamples[`${column}:DESC`] = { value: `${column}:DESC` };
    });
    queries.push(
      ApiQuery({
        name: 'sortBy',
        required: false,
        type: String,
        isArray: true,
        description: sortByDescription,
        examples: sortByExamples,
      }),
    );
  }

  return applyDecorators(...queries);
}
