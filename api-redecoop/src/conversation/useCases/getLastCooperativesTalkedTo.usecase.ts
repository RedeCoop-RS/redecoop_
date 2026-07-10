import { Injectable } from '@nestjs/common';
import { Conversation } from '../entities/conversation.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserLoggedDto } from '@/_common/dto/userLogged.dto';
import { plainToInstance } from 'class-transformer';
import { CooperativeDto } from '@/cooperative/Dtos/cooperativeResponse.dto';

@Injectable()
export class GetLastCooperativesTalkedToUseCase {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
  ) {}

  async execute(user: UserLoggedDto) {
    const query = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoinAndSelect('conversation.initiatorCooperative', 'initiator')
      .innerJoinAndSelect('conversation.participantCooperative', 'participant')
      .innerJoinAndSelect('conversation.messages', 'message')
      .where('initiator.id = :cooperativeLoggedId OR participant.id = :cooperativeLoggedId', {
        cooperativeLoggedId: user.sub,
      })
      .andWhere('conversation.isDirect = TRUE')
      .orderBy('message.createdAt', 'DESC')
      .select(['conversation.id','initiator.id', 'initiator.companyName', 'participant.id', 'participant.companyName'])
      .limit(20)
      .getMany();

    const cooperatives = query.map((conversation) => {
      const cooperative =
        conversation.initiatorCooperative.id === user.sub
          ? conversation.participantCooperative
          : conversation.initiatorCooperative;

      return {
        id: cooperative.id,
        companyName: cooperative.companyName,
      };
    });

    const uniqueCooperatives = cooperatives.filter(
      (coop, index, self) => index === self.findIndex((t) => t.id === coop.id),
    );

    return plainToInstance(CooperativeDto, uniqueCooperatives);
  }
}
