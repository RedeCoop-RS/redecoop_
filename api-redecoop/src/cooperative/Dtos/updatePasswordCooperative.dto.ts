import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, Matches } from "class-validator";

export class UpdatePasswordCooperativeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Matches(/^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=\D*\d).{8,}$/, { message: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais' })
    newPassword:string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    @Matches(/^(?=[^A-Z]*[A-Z])(?=[^a-z]*[a-z])(?=\D*\d).{8,}$/, { message: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais' })
    repeatNewPassword:string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    password:string;

}
