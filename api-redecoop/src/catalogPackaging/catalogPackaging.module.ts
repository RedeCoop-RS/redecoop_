import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogPackaging } from "./entities/catalogPackaging.entity";

@Module({
    imports: [TypeOrmModule.forFeature([CatalogPackaging])],
    controllers: [],
    providers: [],
    exports: []
})
export class CatalogPackagingModule { }
