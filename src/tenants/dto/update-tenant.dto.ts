import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsObject,
  IsBoolean,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==========================================
// SOCIAL LINKS DTO (NEW)
// ==========================================

class SocialLinksDto {
  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Instagram harus berupa URL yang valid' })
  instagram?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Facebook harus berupa URL yang valid' })
  facebook?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'TikTok harus berupa URL yang valid' })
  tiktok?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'YouTube harus berupa URL yang valid' })
  youtube?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Twitter/X harus berupa URL yang valid' })
  twitter?: string;
}

// ==========================================
// LANDING CONFIG SUB-DTOs (EXISTING)
// ==========================================

class LandingSectionConfigDto {
  @IsOptional()
  @IsString()
  layout?: string;

  @IsOptional()
  @IsBoolean()
  showCta?: boolean;

  @IsOptional()
  @IsString()
  ctaText?: string;

  @IsOptional()
  @IsString()
  ctaLink?: string;

  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @IsOptional()
  overlayOpacity?: number;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  showImage?: boolean;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  features?: Array<{ icon?: string; title: string; description: string }>;

  @IsOptional()
  @IsString()
  displayMode?: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsBoolean()
  showViewAll?: boolean;

  @IsOptional()
  items?: Array<{
    id: string;
    name: string;
    role?: string;
    avatar?: string;
    content: string;
    rating?: number;
  }>;

  @IsOptional()
  @IsBoolean()
  showMap?: boolean;

  @IsOptional()
  @IsBoolean()
  showForm?: boolean;

  @IsOptional()
  @IsBoolean()
  showSocialMedia?: boolean;

  @IsOptional()
  @IsString()
  buttonText?: string;

  @IsOptional()
  @IsString()
  buttonLink?: string;

  @IsOptional()
  @IsString()
  style?: string;
}

class LandingSectionDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSectionConfigDto)
  config?: LandingSectionConfigDto;
}

class LandingConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSectionDto)
  hero?: LandingSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSectionDto)
  about?: LandingSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSectionDto)
  products?: LandingSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSectionDto)
  testimonials?: LandingSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSectionDto)
  contact?: LandingSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingSectionDto)
  cta?: LandingSectionDto;
}

// ==========================================
// MAIN UPDATE TENANT DTO
// ==========================================

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Nama toko minimal 3 karakter' })
  @MaxLength(100, { message: 'Nama toko maksimal 100 karakter' })
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Deskripsi maksimal 500 karakter' })
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^62[0-9]{9,13}$/, {
    message: 'Format WhatsApp harus diawali 62 (contoh: 6281234567890)',
  })
  whatsapp?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Alamat maksimal 300 karakter' })
  address?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsObject()
  theme?: {
    primaryColor?: string;
  };

  @IsOptional()
  @ValidateNested()
  @Type(() => LandingConfigDto)
  landingConfig?: LandingConfigDto;

  // ==========================================
  // SEO FIELDS (NEW)
  // ==========================================

  @IsOptional()
  @IsString()
  @MaxLength(60, {
    message: 'Meta title maksimal 60 karakter (untuk SEO optimal)',
  })
  metaTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160, {
    message: 'Meta description maksimal 160 karakter (untuk SEO optimal)',
  })
  metaDescription?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}
