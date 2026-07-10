import { CityDto } from "@/city/Dtos/city.dto";
import { Expose, Type } from "class-transformer";

export class CollectivePruchaseDto {
    @Expose()
    id: number;
    @Expose()
    cityId: number;
    @Expose()
    products: JSON;
    @Expose()
    description: string;
    @Expose()
    active: boolean;
    @Expose()
    createdAt: Date;
    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => CityDto)
    city?: CityDto;

}