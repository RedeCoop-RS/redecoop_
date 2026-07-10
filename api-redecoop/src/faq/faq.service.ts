import { InjectRepository } from '@nestjs/typeorm';
import { Faq } from './entities/faq.entity';
import { Repository } from 'typeorm';
import { CreateFaqDto } from './Dtos/createFaq.dto';
import { faqDto } from './Dtos/faq.dto';
import { plainToInstance } from 'class-transformer';
import { NotFoundException } from '@nestjs/common';
import { UpdateFaqDto } from './Dtos/updateFaq.dto';
import { paginate, Paginated, PaginateQuery } from '@/_common/utils/paginate/paginate';

export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepository: Repository<Faq>,
  ) {}

  async create(data: CreateFaqDto): Promise<void> {
    const newFaq = this.faqRepository.create({
      title: data.title,
      content: data.content,
    });

    await this.faqRepository.save(newFaq);
  }

  async view(id: number) {
    const faq = await this.faqRepository.findOneBy({ id });

    if (!faq) {
      throw new NotFoundException('Pergunta não encontrada no FAQ!');
    }
    return plainToInstance(faqDto, faq);
  }

  async update(id: number, data: UpdateFaqDto): Promise<void> {
    const faq = await this.faqRepository.findOneBy({ id });

    if (!faq) {
      throw new NotFoundException('Pergunta não encontrada no FAQ!');
    }

    if (data.content) faq.content = data.content;
    if (data.title) faq.title = data.title;

    await this.faqRepository.save(faq);
  }

  async delete(id: number) {
    const faq = await this.faqRepository.findOneBy({ id });

    if (!faq) {
      throw new NotFoundException('Pergunta não encontrada no FAQ!');
    }
    await this.faqRepository.softRemove(faq);
  }

  async findAll(query: PaginateQuery): Promise<Paginated<faqDto>> {
    const queryBuilder = this.faqRepository.createQueryBuilder('faq');

    const { filter } = query;

    if (filter && filter.content) {
      queryBuilder.andWhere('(faq.title LIKE  :content OR faq.content LIKE  :content)', {
        content: `%${filter.content}%`,
      });
    }

    const paginated = await paginate(query, queryBuilder);

    const { data, ...pagination } = paginated;

    const transformData = plainToInstance(faqDto, data);

    return { data: transformData, ...pagination } as Paginated<faqDto>;
  }
}
