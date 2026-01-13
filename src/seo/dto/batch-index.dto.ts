import {
  IsArray,
  IsString,
  IsNotEmpty,
  ArrayMinSize,
  ArrayMaxSize,
  IsUrl,
} from 'class-validator';

// ==========================================
// BATCH INDEX DTO
// For bulk URL submission
// ==========================================

export class BatchIndexDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 URL' })
  @ArrayMaxSize(100, { message: 'Maksimal 100 URL per batch' })
  @IsString({ each: true })
  @IsUrl({}, { each: true, message: 'Semua URL harus valid' })
  urls: string[];
}

export class BatchReindexTenantsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Minimal 1 slug' })
  @ArrayMaxSize(50, { message: 'Maksimal 50 tenants per batch' })
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  slugs: string[];
}
