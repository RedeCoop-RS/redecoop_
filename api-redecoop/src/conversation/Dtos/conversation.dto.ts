import { Expose, Type } from 'class-transformer';
import { ConversationMessageDto } from './conversationMessage.dto';
import { CooperativeDto, CooperativeSummaryDto } from '@/cooperative/Dtos/cooperativeResponse.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessDto } from '@/business/Dtos/business.dto';

export class ConversationDto {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  title: string | null;

  @ApiProperty()
  @Expose()
  @Type(() => ConversationMessageDto)
  messages: ConversationMessageDto[];

  @ApiProperty()
  @Expose()
  @Type(() => Date)
  lastMessage: Date;

  @ApiProperty()
  @Expose()
  awaitingMediation: boolean;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Number)
  messageCount?: number;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Number)
  totalMessagesNotSeenByMe?: number; // Total de mensagens que foram enviadas a mim e não visualizei

  @ApiPropertyOptional()
  @Expose()
  @Type(() => Number)
  totalMyMessagesNotSeen?: number; // Total de minhas mensagens enviadas que não foram vistas

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeSummaryDto)
  initiatorCooperative?: CooperativeSummaryDto;

  @ApiProperty()
  @Expose()
  @Type(() => CooperativeSummaryDto)
  participantCooperative?: CooperativeSummaryDto;

  @ApiPropertyOptional()
  @Expose()
  @Type(() => BusinessDto)
  business: BusinessDto;
}
