
import { Expose, Transform } from "class-transformer";
import { SeasonalityLevel } from "../entities/catalogSeasonality.entity";

export class CatalogSeasonalityDto {
    @Expose()
    id: number;
    @Expose()
    catalogId: number;
    @Expose()
    month: number;
    @Expose()
    @Transform(({ obj }) => getMonthName(obj.month))
    monthName: string;
    @Expose()
    seasonality: SeasonalityLevel;
}

const getMonthName = (monthNumber: number) => {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthNumber - 1];
};