import { applyDecorators, createParamDecorator, ExecutionContext, Type } from '@nestjs/common';
import { Paginated, PaginateQuery } from './paginate';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

export const Paginate = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PaginateQuery => {
    let query: Record<string, unknown>;

    const request = ctx.switchToHttp().getRequest();
    query = request.query as Record<string, unknown>;

    const filter = Object.keys(query)
      .filter(
        (name) =>
          name.includes('filter.') &&
          (typeof query[name] === 'string' ||
            (Array.isArray(query[name]) &&
              (query[name] as any[]).every((p) => typeof p === 'string'))),
      )
      .reduce(
        (acc, name) => {
          const newKey = name.replace('filter.', '');
          acc[newKey] = query[name] as string | string[];
          return acc;
        },
        {} as { [key: string]: string | string[] },
      );

    return {
      page: query.page ? parseInt(query.page.toString(), 10) : undefined,
      limit: query.limit ? parseInt(query.limit.toString(), 10) : undefined,
      filter: Object.keys(filter).length ? filter : undefined,
    };
  },
);

export const ApiOkResponsePaginated = <DataDto extends Type<unknown>>(dataDto: DataDto) =>
  applyDecorators(
    ApiExtraModels(Paginated, dataDto),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(Paginated) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(dataDto) },
              },
            },
          },
        ],
      },
    }),
  );
