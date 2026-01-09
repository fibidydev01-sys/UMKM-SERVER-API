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
  IsNumber,
  Min,
  Max,
  IsArray,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// ==========================================
// SOCIAL LINKS DTO
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
// PAYMENT SETTINGS DTOs
// ==========================================

class BankAccountDto {
  @IsString()
  id: string;

  @IsString()
  @IsIn(
    [
      'BCA',
      'Mandiri',
      'BNI',
      'BRI',
      'BSI',
      'CIMB',
      'Permata',
      'Danamon',
      'Other',
    ],
    {
      message: 'Bank tidak valid',
    },
  )
  bank: string;

  @IsString()
  @MinLength(5, { message: 'Nomor rekening minimal 5 digit' })
  @MaxLength(20, { message: 'Nomor rekening maksimal 20 digit' })
  accountNumber: string;

  @IsString()
  @MinLength(3, { message: 'Nama pemilik rekening minimal 3 karakter' })
  @MaxLength(100, { message: 'Nama pemilik rekening maksimal 100 karakter' })
  accountName: string;

  @IsBoolean()
  enabled: boolean;
}

class EWalletDto {
  @IsString()
  id: string;

  @IsString()
  @IsIn(['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja', 'Other'], {
    message: 'Provider e-wallet tidak valid',
  })
  provider: string;

  @IsString()
  @Matches(/^(\+62|62|0)[0-9]{9,13}$/, {
    message: 'Format nomor e-wallet tidak valid',
  })
  number: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsBoolean()
  enabled: boolean;
}

class CodSettingsDto {
  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Catatan COD maksimal 200 karakter' })
  note?: string;
}

class PaymentMethodsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BankAccountDto)
  bankAccounts?: BankAccountDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EWalletDto)
  eWallets?: EWalletDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CodSettingsDto)
  cod?: CodSettingsDto;
}

// ==========================================
// SHIPPING SETTINGS DTOs
// ==========================================

class CourierDto {
  @IsString()
  id: string;

  @IsString()
  @IsIn(
    [
      'JNE',
      'J&T Express',
      'SiCepat',
      'AnterAja',
      'Ninja Express',
      'ID Express',
      'SAP Express',
      'Lion Parcel',
      'Pos Indonesia',
      'TIKI',
      'Other',
    ],
    {
      message: 'Kurir tidak valid',
    },
  )
  name: string;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Catatan kurir maksimal 100 karakter' })
  note?: string;
}

class ShippingMethodsDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourierDto)
  couriers?: CourierDto[];
}

// ==========================================
// TESTIMONIAL ITEM DTO (NEW - FIXED!)
// ==========================================

class TestimonialItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsNumber()
  rating?: number;
}

// ==========================================
// FEATURE ITEM DTO
// ==========================================

class FeatureItemDto {
  @IsOptional()
  @IsString()
  icon?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;
}

// ==========================================
// LANDING SECTION CONFIG DTOs (SEPARATED!)
// ==========================================

class HeroSectionConfigDto {
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
  @IsNumber()
  overlayOpacity?: number;
}

class AboutSectionConfigDto {
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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureItemDto)
  features?: FeatureItemDto[];
}

class ProductsSectionConfigDto {
  @IsOptional()
  @IsString()
  displayMode?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsBoolean()
  showViewAll?: boolean;
}

// ✅ FIXED: Separate DTO for testimonials config with proper Transform
class TestimonialsSectionConfigDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestimonialItemDto)
  @Transform(({ value }) => {
    // ✅ FIX: Flatten nested arrays during transformation
    if (!value) return [];

    let items = value;

    // Handle nested array bug: [[item]] -> [item]
    while (
      Array.isArray(items) &&
      items.length > 0 &&
      Array.isArray(items[0])
    ) {
      items = items[0];
    }

    if (!Array.isArray(items)) return [];

    // Filter valid items
    return items.filter(
      (item: any) =>
        item &&
        typeof item === 'object' &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        typeof item.content === 'string',
    );
  })
  items?: TestimonialItemDto[];
}

class ContactSectionConfigDto {
  @IsOptional()
  @IsBoolean()
  showMap?: boolean;

  @IsOptional()
  @IsBoolean()
  showForm?: boolean;

  @IsOptional()
  @IsBoolean()
  showSocialMedia?: boolean;
}

class CtaSectionConfigDto {
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

// ==========================================
// LANDING SECTION DTOs (SEPARATED BY TYPE!)
// ==========================================

class HeroSectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => HeroSectionConfigDto)
  config?: HeroSectionConfigDto;
}

class AboutSectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AboutSectionConfigDto)
  config?: AboutSectionConfigDto;
}

class ProductsSectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductsSectionConfigDto)
  config?: ProductsSectionConfigDto;
}

// ✅ FIXED: Testimonials section with proper config type
class TestimonialsSectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TestimonialsSectionConfigDto)
  config?: TestimonialsSectionConfigDto;
}

class ContactSectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactSectionConfigDto)
  config?: ContactSectionConfigDto;
}

class CtaSectionDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CtaSectionConfigDto)
  config?: CtaSectionConfigDto;
}

// ==========================================
// LANDING CONFIG DTO (FIXED!)
// ==========================================

class LandingConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => HeroSectionDto)
  hero?: HeroSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AboutSectionDto)
  about?: AboutSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProductsSectionDto)
  products?: ProductsSectionDto;

  // ✅ FIXED: Use specific TestimonialsSectionDto
  @IsOptional()
  @ValidateNested()
  @Type(() => TestimonialsSectionDto)
  testimonials?: TestimonialsSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactSectionDto)
  contact?: ContactSectionDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CtaSectionDto)
  cta?: CtaSectionDto;
}

// ==========================================
// MAIN UPDATE TENANT DTO
// ==========================================

export class UpdateTenantDto {
  // ==========================================
  // BASIC INFO
  // ==========================================

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
  // SEO FIELDS
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

  // ==========================================
  // PAYMENT SETTINGS
  // ==========================================

  @IsOptional()
  @IsString()
  @IsIn(['IDR', 'USD', 'SGD', 'MYR'], { message: 'Mata uang tidak valid' })
  currency?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Tax rate harus berupa angka' })
  @Min(0, { message: 'Tax rate tidak boleh negatif' })
  @Max(100, { message: 'Tax rate maksimal 100%' })
  @Type(() => Number)
  taxRate?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMethodsDto)
  paymentMethods?: PaymentMethodsDto;

  // ==========================================
  // SHIPPING SETTINGS
  // ==========================================

  @IsOptional()
  @IsNumber({}, { message: 'Free shipping threshold harus berupa angka' })
  @Min(0, { message: 'Free shipping threshold tidak boleh negatif' })
  @Type(() => Number)
  freeShippingThreshold?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'Default shipping cost harus berupa angka' })
  @Min(0, { message: 'Default shipping cost tidak boleh negatif' })
  @Type(() => Number)
  defaultShippingCost?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingMethodsDto)
  shippingMethods?: ShippingMethodsDto;
}
