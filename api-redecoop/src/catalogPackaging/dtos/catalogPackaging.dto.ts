import { Expose, Transform } from "class-transformer";

export class CatalogPackagingDTO {
    @Expose()
    id: number;

    @Expose()
    info: string;

    @Expose()
    weight: number;

    @Expose()
    packagingId: number;

}