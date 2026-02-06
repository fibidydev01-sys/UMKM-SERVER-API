import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateFeedDto {
  @IsString()
  @IsNotEmpty({ message: 'Product ID tidak boleh kosong' })
  productId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Caption maksimal 500 karakter' })
  caption?: string;
}
