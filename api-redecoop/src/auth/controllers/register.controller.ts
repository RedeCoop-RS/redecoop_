import { Body, Controller, HttpStatus, Post, Res } from "@nestjs/common";
import { Public } from "../../_common/decorators/skipAuth.decorator";
import { AuthRegisterService } from "../services/register.service";
import { registerVisitantDto } from "../Dtos/register.dto";
import { Response } from "express";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthRegisterController {

    constructor(private authRegisterService: AuthRegisterService) { }

    @Post('register-visitant')
    async createVisitant(@Body() postData: registerVisitantDto, @Res() res: Response) {
        await this.authRegisterService.registerVisitant(postData);
        return res.status(HttpStatus.OK).json({
            status: true,
            message: "Cadastrado com sucesso, efetue o login",
        });

    }
}