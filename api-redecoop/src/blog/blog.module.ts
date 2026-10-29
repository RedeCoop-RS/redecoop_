import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlogController } from './blog.controller';
import { BlogService } from './blog.service';
import { BlogCryptoService } from './crypto/blog-crypto.service';
import { GhostConnection } from './entities/ghost-connection.entity';
import { GhostAdminClient } from './ghost/ghost-admin.client';
import { BlogSuperAdminGuard } from './security/blog-super-admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([GhostConnection])],
  controllers: [BlogController],
  providers: [BlogCryptoService, GhostAdminClient, BlogService, BlogSuperAdminGuard],
})
export class BlogModule {}
