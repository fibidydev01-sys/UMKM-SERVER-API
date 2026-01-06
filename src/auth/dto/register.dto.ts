import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Slug tidak boleh kosong' })
  @MinLength(3, { message: 'Slug minimal 3 karakter' })
  @MaxLength(30, { message: 'Slug maksimal 30 karakter' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug hanya boleh huruf kecil, angka, dan strip (-)',
  })
  slug: string;

  @IsString()
  @IsNotEmpty({ message: 'Nama toko tidak boleh kosong' })
  @MinLength(3, { message: 'Nama toko minimal 3 karakter' })
  @MaxLength(100, { message: 'Nama toko maksimal 100 karakter' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Kategori tidak boleh kosong' })
  category: string;

  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password tidak boleh kosong' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp tidak boleh kosong' })
  @Matches(/^62[0-9]{9,13}$/, {
    message: 'Format WhatsApp harus diawali 62 (contoh: 6281234567890)',
  })
  whatsapp: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
