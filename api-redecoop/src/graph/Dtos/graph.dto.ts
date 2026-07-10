import { Expose } from 'class-transformer';

export class GraphDto {
  @Expose() categories?: any[];
  @Expose() data: any[];
}
