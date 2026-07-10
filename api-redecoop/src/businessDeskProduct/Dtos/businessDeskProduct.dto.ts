import { CatalogDto } from "@/catalog/Dtos/catalog.dto";
import { ProductDto } from "@/product/Dtos/product.dto";
import { Expose, Type } from "class-transformer";

export class BusinessDeskProductDto {

    @Expose()
    id: number;
    @Expose()
    weight: number;

    @Expose()
    @Type(() => ProductDto)
    product: ProductDto;
}