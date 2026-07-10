import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Response } from 'express';
import { Public } from './_common/decorators/skipAuth.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Public()
  getHello(@Res() res: Response) {
    return res.status(HttpStatus.OK).json('hello world');
  }
}
