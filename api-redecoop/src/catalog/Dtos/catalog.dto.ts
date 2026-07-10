
import { CatalogPackagingDTO } from "@/catalogPackaging/dtos/catalogPackaging.dto";
import { PackagingType } from "@/catalogPackaging/entities/catalogPackaging.entity";
import { CatalogSeasonalityDto } from "@/catalogSeasonality/dtos/catalogSeasonality.dto";
import { ProductDto } from "@/product/Dtos/product.dto";
import { Expose, Transform, Type } from "class-transformer";

export class CatalogDto {
    @Expose()
    id: number;
    @Expose()
    cooperativeId: number;
    @Expose()
    productId: number;

    @Expose()
    customImage?: string | null;

    @Expose()
    @Type(() => ProductDto)
    product: ProductDto

    @Expose()
    hasSeasonality: boolean;

    @Expose()
    @Type(() => CatalogSeasonalityDto)
    seasonalities?: CatalogSeasonalityDto;

    @Expose()
    highEstimate: number;
    @Expose()
    mediumEstimate: number;
    @Expose()
    lowEstimate: number;
    @Expose()
    hasPrimaryPackaging: boolean;
    @Expose()
    @Transform(({ obj }) => { if (obj.hasPrimaryPackaging) { return obj.packaging?.find(packaging => packaging.type === PackagingType.PRIMARY) } })
    @Type(() => CatalogPackagingDTO)
    primaryPackagingDetails?: CatalogPackagingDTO;
    @Expose()
    hasSecondaryPackaging: boolean;
    @Expose()
    @Transform(({ obj }) => { if (obj.hasSecondaryPackaging) { return obj.packaging?.find(packaging => packaging.type === PackagingType.SECONDARY) } })
    @Type(() => CatalogPackagingDTO)
    secondaryPackagingDetails?: CatalogPackagingDTO;

}