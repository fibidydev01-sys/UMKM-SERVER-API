/**
 * Midtrans Notification Types
 * Based on Midtrans API Documentation
 * @see https://docs.midtrans.com/en/after-payment/http-notification
 */

export interface MidtransVANumber {
  bank: string;
  va_number: string;
}

export interface MidtransNotification {
  // Transaction Info
  transaction_id: string;
  order_id: string;
  gross_amount: string;

  // Status
  transaction_status: string;
  fraud_status?: string;

  // Payment Method
  payment_type: string;

  // Bank Transfer (VA)
  va_numbers?: MidtransVANumber[];

  // Mandiri Bill Payment
  bill_key?: string;
  biller_code?: string;

  // E-Wallet
  approval_code?: string;

  // Timestamps
  transaction_time?: string;
  settlement_time?: string;

  // Security
  signature_key: string;

  // Status Code
  status_code: string;

  // Metadata
  currency?: string;
  merchant_id?: string;

  // Card (jika pakai kartu kredit)
  masked_card?: string;
  card_type?: string;

  // Additional data
  [key: string]: any; // For rawNotification flexibility
}
