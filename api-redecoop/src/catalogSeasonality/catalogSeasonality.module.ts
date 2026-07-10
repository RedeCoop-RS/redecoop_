import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogSeasonality } from "./entities/catalogSeasonality.entity";

@Module({
    imports: [TypeOrmModule.forFeature([CatalogSeasonality])],
    controllers: [],
})
export class CatalogSeasonalityModule { }
