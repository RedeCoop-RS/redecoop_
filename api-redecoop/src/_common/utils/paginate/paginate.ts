import { mixin, Type } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance } from 'class-transformer';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

export interface PaginateQuery {
  page?: number;
  limit?: number;
  filter?: { [key: string]: any };
}

export class MetaPagination {
  @ApiProperty()
  itemsPerPage: number;
  @ApiProperty()
  totalItems: number;
  @ApiProperty()
  currentPage: number;
  @ApiProperty()
  totalPages: number;
}

export class Paginated<T> {
  data: T[];
  @ApiProperty()
  meta: MetaPagination;
}

export async function paginate<T extends ObjectLiteral>(
  query: PaginateQuery,
  repo: SelectQueryBuilder<T> | Repository<T>,
): Promise<Paginated<T>> {
  const page = query.page ? Number(query.page) : 1;
  const limit = query.limit ? Number(query.limit) : 10;

  let items: T[];
  let totalItems: number;

  if (limit === -1) {
    if (repo instanceof SelectQueryBuilder) {
      items = await repo.getMany();
      totalItems = items.length;
    } else if (repo instanceof Repository) {
      items = await (repo as Repository<T>).find();
      totalItems = items.length;
    } else {
      throw new BadRequestException('Invalid repository or query builder provided');
    }
  } else {
    if (repo instanceof SelectQueryBuilder) {
      // clone: não polui o QB original (contagens / filtros posteriores no caller)
      [items, totalItems] = await repo
        .clone()
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
    } else if (repo instanceof Repository) {
      [items, totalItems] = await (repo as Repository<T>).findAndCount({
        skip: (page - 1) * limit,
        take: limit,
      });
    } else {
      throw new BadRequestException('Invalid repository or query builder provided');
    }
  }

  const totalPages = limit === -1 ? 1 : Math.ceil(totalItems / limit);
  

  return {
    data: items,
    meta: {
      itemsPerPage: limit === -1 ? items.length : limit,
      currentPage: page,
      totalPages,
      totalItems,
    },
  };
}
