import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama item tidak boleh kosong' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'Harga tidak boleh negatif' })
  @Type(() => Number)
  price: number;

  @IsNumber()
  @Min(1, { message: 'Jumlah minimal 1' })
  @Type(() => Number)
  qty: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
