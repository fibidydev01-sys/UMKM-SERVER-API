import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

/**
 * DTO for store checkout (public endpoint)
 * Used when customer places an order from store page
 */
export class CheckoutDto {
  // ==========================================
  // CUSTOMER INFO (from checkout form)
  // ==========================================

  @IsString()
  @IsNotEmpty({ message: 'Nama tidak boleh kosong' })
  @MaxLength(100, { message: 'Nama maksimal 100 karakter' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Nomor WhatsApp tidak boleh kosong' })
  @Matches(/^(\+62|62|0)[0-9]{9,13}$/, {
    message: 'Format nomor WhatsApp tidak valid (contoh: 081234567890)',
  })
  phone: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsString()
  @IsNotEmpty({ message: 'Alamat pengiriman tidak boleh kosong' })
  @MaxLength(500, { message: 'Alamat maksimal 500 karakter' })
  address: string;

  // ==========================================
  // ORDER ITEMS (from cart)
  // ==========================================

  @IsArray()
  @ArrayMinSize(1, { message: 'Keranjang belanja kosong' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  // ==========================================
  // OPTIONAL FIELDS
  // ==========================================

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Metode pembayaran maksimal 50 karakter' })
  paymentMethod?: string; // cash, transfer, qris, cod, etc

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Nama kurir maksimal 50 karakter' })
  courier?: string; // JNE, JNT, Gojek, Grab, etc

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  notes?: string; // Customer notes/requests
}
