import { IsNumber, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateStockDto {
  @IsNumber({}, { message: 'Jumlah harus berupa angka' })
  @IsNotEmpty({ message: 'Jumlah tidak boleh kosong' })
  @Type(() => Number)
  quantity: number; // Positive = add, Negative = subtract

  @IsOptional()
  @IsString()
  reason?: string; // "Restok", "Penjualan", "Rusak", etc.
}
