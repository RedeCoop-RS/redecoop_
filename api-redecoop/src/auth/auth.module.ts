import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { HashService } from '../_common/services/passwordHash.service';
import { AuthRecoverPassowrd } from './controllers/recover.controller';
import { AuthRecoverService } from './services/recover.service';
import { AuthRegisterController } from './controllers/register.controller';
import { AuthRegisterService } from './services/register.service';
import { VisitantModule } from 'src/visitant/visitant.module';
import { ConfigService } from '@nestjs/config';
import { UserModule } from 'src/User/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResetPassword } from './entities/resetPassword.entity';
import { AuthToken } from './entities/authToken.entity';
import { City } from 'src/city/entities/city.entity';
import { Cooperative } from '@/cooperative/entities/cooperative.entity';

@Module({
  imports: [
    UserModule,
    VisitantModule,
    TypeOrmModule.forFeature([
      ResetPassword,
      AuthToken,
      City,
      Cooperative,
    ]),
  ],
  controllers: [
    AuthController,
    AuthRecoverPassowrd,
    AuthRegisterController,
  ],
  providers: [
    AuthService,
    HashService,
    AuthRecoverService,
    AuthRegisterService,
    ConfigService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
