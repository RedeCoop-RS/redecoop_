import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { BlogResource, BlogVisibility } from '../ghost/ghost.types';

const RESOURCES: BlogResource[] = ['post', 'page'];
const VISIBILITIES: BlogVisibility[] = ['public', 'members', 'paid'];
const ORDERS = [
  'updated_at desc',
  'updated_at asc',
  'published_at desc',
  'published_at asc',
  'created_at desc',
  'title asc',
  'title desc',
];

export class SaveGhostConnectionDto {
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  adminUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  apiKey?: string;

  @IsOptional()
  @IsBoolean()
  clearKey?: boolean;
}

export class TestGhostConnectionDto {
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  adminUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  apiKey?: string;
}

export class ListBlogDto {
  @IsOptional()
  @IsIn(RESOURCES)
  resource?: BlogResource;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsIn(['all', 'draft', 'published', 'scheduled', 'sent'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  tag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(ORDERS)
  order?: string;
}

export class BlogResourceDto {
  @IsIn(RESOURCES)
  resource: BlogResource;
}

export class SaveBlogPostDto {
  @IsIn(RESOURCES)
  resource: BlogResource;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  html?: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customExcerpt?: string;

  @IsOptional()
  @IsIn(['draft', 'published', 'scheduled'])
  status?: 'draft' | 'published' | 'scheduled';

  @IsOptional()
  @IsIn(VISIBILITIES)
  visibility?: BlogVisibility;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  publishedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  featureImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  featureImageAlt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  featureImageCaption?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  metaDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  ogImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  ogTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  ogDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  twitterImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  twitterTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  twitterDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  canonicalUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  tagIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  authorIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  updatedAt?: string;
}

export class BlogActionDto {
  @IsIn(RESOURCES)
  resource: BlogResource;

  @IsString()
  @MinLength(10)
  @MaxLength(40)
  updatedAt: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  publishedAt?: string;
}

export class BulkBlogItemDto {
  @IsString()
  @MinLength(10)
  @MaxLength(40)
  id: string;

  @IsIn(RESOURCES)
  resource: BlogResource;

  @IsString()
  @MinLength(10)
  @MaxLength(40)
  updatedAt: string;
}

export class BulkBlogDto {
  @IsIn(['publish', 'unpublish', 'delete', 'feature', 'unfeature'])
  action: 'publish' | 'unpublish' | 'delete' | 'feature' | 'unfeature';

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BulkBlogItemDto)
  items: BulkBlogItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  publishedAt?: string;
}

export class SaveBlogTagDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  updatedAt?: string;
}
