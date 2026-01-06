import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password lama tidak boleh kosong' })
  currentPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Password baru tidak boleh kosong' })
  @MinLength(6, { message: 'Password baru minimal 6 karakter' })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Konfirmasi password tidak boleh kosong' })
  confirmPassword: string;
}
