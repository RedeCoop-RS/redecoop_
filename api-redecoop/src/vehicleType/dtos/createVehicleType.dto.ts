import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreateVehicleTypeDto {

    @IsNotEmpty()
    @IsString()
    name:string;

    @IsNotEmpty()
    @IsNumber()
    mpy:number;

}
