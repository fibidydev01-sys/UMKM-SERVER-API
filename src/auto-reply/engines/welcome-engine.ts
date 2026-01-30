import { Injectable } from '@nestjs/common';
import { Conversation } from '@prisma/client';

@Injectable()
export class WelcomeEngine {
  /**
   * Check if this is first contact (for welcome message)
   */
  isFirstContact(conversation: Conversation): boolean {
    // Welcome message should trigger only on first message
    return conversation.totalMessages === 0;
  }

  /**
   * Check if welcome message should be sent
   * Can be extended to include more conditions
   */
  shouldSendWelcome(conversation: Conversation): boolean {
    return this.isFirstContact(conversation);
  }
}
