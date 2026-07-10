import { Injectable } from "@nestjs/common";
import { CreateProductCategoryDto } from "./Dtos/productCategoryCreate.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { ProductCategory } from "./entities/productCategory.entity";
import { Repository } from "typeorm";
import { ProductCategoryResponseDto } from "./Dtos/productCategoryResponse.dto";
import { plainToInstance } from "class-transformer";

@Injectable()
export class ProductCategoryService {

    constructor(
        @InjectRepository(ProductCategory)
        private readonly productCategoryRepository: Repository<ProductCategory>,
    ) { }

    async create(data: CreateProductCategoryDto) {
        const newCategory = this.productCategoryRepository.create(data);
        await this.productCategoryRepository.save(newCategory);
    }

    async list(): Promise<ProductCategoryResponseDto[]> {
        const query = await this.productCategoryRepository.find();
        return plainToInstance(ProductCategoryResponseDto, query);
    }

}