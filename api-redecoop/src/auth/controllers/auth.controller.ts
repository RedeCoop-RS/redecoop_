import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { Public } from '../../_common/decorators/skipAuth.decorator';
import {
  AuthLoginDto,
  AuthLoginResponseDto,
  ExchangeTokenDto,
  ExchangeTokenResponseDto,
} from '../Dtos/auth.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
@Public()
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiResponse({ type: AuthLoginResponseDto })
  @ApiOperation({
    summary: 'Login no sistema',
    description:
      'Se o login for efetuado por uma cooperativa deve ser efetuado a troca do token temporario',
  })
  async login(@Body() postData: AuthLoginDto): Promise<AuthLoginResponseDto> {
    return await this.authService.login(postData);
  }

  @Post('exchange-token')
  @ApiResponse({ type: ExchangeTokenResponseDto })
  @ApiOperation({
    summary: '(Cooperativa|Admin) Trocar Token Temporario',
  })
  async exchangeToken(@Body() postData: ExchangeTokenDto): Promise<ExchangeTokenResponseDto> {
    const { token } = postData;
    return await this.authService.validateTemporaryToken(token);
  }
}
