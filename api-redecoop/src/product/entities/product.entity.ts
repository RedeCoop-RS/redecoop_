import { TravelRouteProduct } from '@/travel/entities/travelRouteProduct.entity';
import { Catalog } from '../../catalog/entities/catalog.entity';
import { ProductCategory } from '../../productCategory/entities/productCategory.entity';
import { ProductType } from '../../productType/entities/productType.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  OneToMany,
  RelationId,
  DeleteDateColumn,
} from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  productTypeId: number;

  @Column()
  productCategoryId: number;

  @Column()
  img: string;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => ProductType, (productType) => productType.products)
  @JoinColumn({ name: 'product_type_id' })
  productType: ProductType;

  @ManyToOne(() => ProductCategory, (productCategory) => productCategory.products)
  @JoinColumn({ name: 'product_category_id' })
  productCategory: ProductCategory;

  @OneToMany(() => Catalog, (catalog) => catalog.product)
  catalogs: Catalog[];

  @OneToMany(() => TravelRouteProduct, (routeProduct) => routeProduct.product)
  routeProduct: TravelRouteProduct[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
