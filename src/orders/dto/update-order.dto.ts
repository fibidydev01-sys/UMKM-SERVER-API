import { IsString, IsOptional, IsNumber, IsObject, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
