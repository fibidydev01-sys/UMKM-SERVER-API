import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password lama tidak boleh kosong' })
  currentPassword: string;

  // ==========================================
  // 🔥 UPDATED: Stronger password policy for change password too
  // ==========================================
  @IsString()
  @IsNotEmpty({ message: 'Password baru tidak boleh kosong' })
  @MinLength(8, { message: 'Password baru minimal 8 karakter' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password baru harus mengandung huruf besar, huruf kecil, dan angka',
  })
  newPassword: string;

  @IsString()
  @IsNotEmpty({ message: 'Konfirmasi password tidak boleh kosong' })
  confirmPassword: string;
}
