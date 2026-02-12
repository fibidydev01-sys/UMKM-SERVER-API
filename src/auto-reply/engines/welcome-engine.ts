import { Injectable } from '@nestjs/common';
import { Contact } from '@prisma/client';

@Injectable()
export class WelcomeEngine {
  /**
   * Check if this is first contact (for welcome message)
   * ✅ UPDATED: Sekarang pakai Contact, bukan Conversation
   */
  isFirstContact(contact: Contact): boolean {
    // Welcome message should trigger only on first contact
    // Check if this is the first time customer ever contacted
    const now = new Date();
    const firstContactTime = contact.firstContactAt;

    // If contact was just created (within last 5 seconds), it's first contact
    if (firstContactTime) {
      const diffMs = now.getTime() - firstContactTime.getTime();
      const diffSeconds = diffMs / 1000;
      return diffSeconds <= 5; // First contact if created within 5 seconds
    }

    return false;
  }

  /**
   * Check if welcome message should be sent
   * ✅ UPDATED: Sekarang pakai Contact, bukan Conversation
   */
  shouldSendWelcome(contact: Contact): boolean {
    return this.isFirstContact(contact);
  }
}