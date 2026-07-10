import { BadRequestException, Body, Controller, HttpStatus, Post, Res } from "@nestjs/common";
import { Public } from "../../_common/decorators/skipAuth.decorator";
import { Response } from "express";
import { AuthRecoverService } from "../services/recover.service";
import { RecoverEmailDto, RecoverEmailWithCode, RecoverEmailWithCodeAndPassword } from "../Dtos/recover.dto";
import { ApiTags } from "@nestjs/swagger";


@ApiTags('Auth')
@Controller('auth/password-reset')
@Public()
export class AuthRecoverPassowrd {

    constructor(private authRecoverService: AuthRecoverService) { }

    @Post('request')
    async requestReset(@Body() postData: RecoverEmailDto, @Res() res: Response) {
        const { email } = postData;
        await this.authRecoverService.requestPasswordReset(email);
        return res.status(HttpStatus.OK).json({
            status: true,
            message: "Foi enviado para seu e-email de acesso o codigo de 6 digitos",
        });
    }

    @Post('check-code')
    async checkCode(@Body() postData: RecoverEmailWithCode, @Res() res: Response) {
        const { email, code } = postData;
        await this.authRecoverService.validateResetCode(email, code);
        return res.status(HttpStatus.OK).json({
            status: true,
            message: "Token Válido",
        });
    }

    @Post('reset')
    async resetPassword(@Body() postData: RecoverEmailWithCodeAndPassword, @Res() res: Response) {
        await this.authRecoverService.resetPassword(postData);
        return res.status(HttpStatus.OK).json({
            status: true,
            message: "Senha alterada com sucesso!",
        });
    }
}