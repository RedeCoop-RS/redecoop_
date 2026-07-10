import { Body, Controller, Delete, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { FaqService } from '../faq.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/_common/decorators/role.decorator';
import { UserRole } from '@/User/entities/user.entity';
import { CreateFaqDto } from '../Dtos/createFaq.dto';
import { UpdateFaqDto } from '../Dtos/updateFaq.dto';

@ApiBearerAuth()
@ApiTags('Faq')
@Controller('root/faq')
@Roles(UserRole.ADMIN)
export class AdminFaqController {
  constructor(private readonly faqService: FaqService) {}

  @Post('create')
  @ApiOperation({
    summary: 'Criar Pergunta do FAQ',
  })
  async createFaq(@Body() postData: CreateFaqDto) {
    return await this.faqService.create(postData);
  }

  @Put('update/:id')
  @ApiOperation({
    summary: 'Atualizar Pergunta do FAQ',
  })
  async update(@Body() postData: UpdateFaqDto, @Param('id', ParseIntPipe) id: number) {
    return await this.faqService.update(id, postData);
  }

  @Delete('delete/:id')
  @ApiOperation({
    summary: 'Deletar Pergunta do FAQ',
  })
  async delete(@Param('id', ParseIntPipe) id: number) {
    return await this.faqService.delete(id);
  }
}
