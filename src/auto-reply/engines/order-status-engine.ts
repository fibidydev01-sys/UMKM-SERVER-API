import { Injectable } from '@nestjs/common';
import { AutoReplyRule } from '@prisma/client';

/**
 * Order Status Engine
 * Handles matching logic for ORDER_STATUS and PAYMENT_STATUS triggers
 */
@Injectable()
export class OrderStatusEngine {
  /**
   * Check if rule matches the current status
   * For ORDER_STATUS/PAYMENT_STATUS, the status is stored in keywords array
   */
  matchesStatus(rule: AutoReplyRule, currentStatus: string): boolean {
    if (!rule.keywords || rule.keywords.length === 0) {
      return false;
    }

    // Check if currentStatus exists in keywords array
    return rule.keywords.includes(currentStatus);
  }

  /**
   * Validate status value based on trigger type
   */
  isValidStatus(triggerType: string, status: string): boolean {
    const validOrderStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
    const validPaymentStatuses = ['PAID', 'PARTIAL', 'FAILED'];

    if (triggerType === 'ORDER_STATUS') {
      return validOrderStatuses.includes(status);
    }

    if (triggerType === 'PAYMENT_STATUS') {
      return validPaymentStatuses.includes(status);
    }

    return false;
  }
}
