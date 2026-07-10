import { CooperativeSummaryDto } from '@/cooperative/Dtos/cooperativeResponse.dto';
import { Expose, Type } from 'class-transformer';
import { ConversationMessage, MessageStatus } from '../entities/conversationMessage.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConversationMessageDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  content: string;

  @ApiProperty()
  @Expose()
  @Type(() => Boolean)
  seen: boolean;

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeSummaryDto)
  cooperative: CooperativeSummaryDto;

  @ApiProperty()
  @Expose()
  cooperativeId:number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiPropertyOptional()
  @Expose()
  isSender?: boolean;

  @ApiProperty({ enum: MessageStatus })
  @Expose()
  status: MessageStatus;

  @ApiProperty()
  @Expose()
  revisedAt: Date;
}
