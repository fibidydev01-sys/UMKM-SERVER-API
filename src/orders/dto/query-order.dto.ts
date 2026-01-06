import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryOrderDto {
  @IsOptional()
  @IsString()
  search?: string; // Search by orderNumber

  @IsOptional()
  @IsString()
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  paymentStatus?: 'PENDING' | 'PAID' | 'PARTIAL' | 'FAILED';

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string; // ISO date

  @IsOptional()
  @IsString()
  dateTo?: string; // ISO date

  @IsOptional()
  @IsString()
  sortBy?: 'orderNumber' | 'total' | 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
