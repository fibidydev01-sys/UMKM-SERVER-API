import { IsString, IsNotEmpty, IsUrl, IsOptional, IsIn } from 'class-validator';

// ==========================================
// INDEX URL DTO
// For single URL submission
// ==========================================

export class IndexUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'URL tidak boleh kosong' })
  @IsUrl({}, { message: 'Format URL tidak valid' })
  url: string;

  @IsOptional()
  @IsString()
  @IsIn(['URL_UPDATED', 'URL_DELETED'], {
    message: 'Type harus URL_UPDATED atau URL_DELETED',
  })
  type?: 'URL_UPDATED' | 'URL_DELETED' = 'URL_UPDATED';
}
