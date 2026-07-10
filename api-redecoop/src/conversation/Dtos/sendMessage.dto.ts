import { IsString } from "class-validator";

export class sendMessageDto {

    @IsString()
    content:string;
}