import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama produk tidak boleh kosong' })
  @MaxLength(200, { message: 'Nama produk maksimal 200 karakter' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Deskripsi maksimal 1000 karakter' })
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Kategori maksimal 100 karakter' })
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'SKU maksimal 50 karakter' })
  sku?: string;

  @IsNumber({}, { message: 'Harga harus berupa angka' })
  @Min(0, { message: 'Harga tidak boleh negatif' })
  @Type(() => Number)
  price: number;

  @IsOptional()
  @IsNumber({}, { message: 'Harga coret harus berupa angka' })
  @Min(0, { message: 'Harga coret tidak boleh negatif' })
  @Type(() => Number)
  comparePrice?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Harga modal harus berupa angka' })
  @Min(0, { message: 'Harga modal tidak boleh negatif' })
  @Type(() => Number)
  costPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Stok harus berupa angka' })
  @Min(0, { message: 'Stok tidak boleh negatif' })
  @Type(() => Number)
  stock?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Stok minimum harus berupa angka' })
  @Min(0, { message: 'Stok minimum tidak boleh negatif' })
  @Type(() => Number)
  minStock?: number;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Satuan maksimal 20 karakter' })
  unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
