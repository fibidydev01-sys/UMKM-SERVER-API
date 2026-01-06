import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama pelanggan tidak boleh kosong' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor telepon tidak boleh kosong' })
  @Matches(/^(\+62|62|0)[0-9]{9,13}$/, {
    message: 'Format nomor telepon tidak valid',
  })
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Alamat maksimal 300 karakter' })
  address?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
  // WARUNG: { totalDebt: 0, creditLimit: 200000 }
  // BENGKEL: { vehicles: [{ plate: "B 1234 XY", brand: "Honda" }] }
  // SALON: { preferences: "..." }
}
