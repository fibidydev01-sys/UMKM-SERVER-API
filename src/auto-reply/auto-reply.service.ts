import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationsService } from '../conversations/conversations.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { KeywordEngine } from './engines/keyword-engine';
import { TimeBasedEngine } from './engines/time-based-engine';
import { WelcomeEngine } from './engines/welcome-engine';
import { OrderStatusEngine } from './engines/order-status-engine';
import {
  AutoReplyRule,
  AutoReplyTriggerType,
  Conversation,
  Contact,
} from '@prisma/client';

@Injectable()
export class AutoReplyService {
  private readonly logger = new Logger(AutoReplyService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private conversationsService: ConversationsService,
    private keywordEngine: KeywordEngine,
    private timeBasedEngine: TimeBasedEngine,
    private welcomeEngine: WelcomeEngine,
    private orderStatusEngine: OrderStatusEngine,
  ) {}

  /**
   * Process incoming message and check auto-reply rules
   */
  async processIncomingMessage(
    tenantId: string,
    from: string,
    message: string,
  ): Promise<void> {
    try {
      // Get or create conversation
      const conversation =
        await this.conversationsService.getOrCreateConversation(tenantId, from);

      // Get contact
      const contact = await this.prisma.contact.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone: from,
          },
        },
      });

      if (!contact) {
        this.logger.warn(`Contact not found for phone: ${from}`);
        return;
      }

      // Get active rules (by priority, highest first)
      const rules = await this.prisma.autoReplyRule.findMany({
        where: {
          tenantId,
          isActive: true,
        },
        orderBy: {
          priority: 'desc',
        },
      });

      this.logger.log(
        `Processing ${rules.length} auto-reply rules for tenant: ${tenantId}`,
      );

      // Check each rule
      for (const rule of rules) {
        const matches = await this.evaluateRule(rule, message, conversation);

        if (!matches) continue;

        this.logger.log(`Rule matched: ${rule.name} (${rule.triggerType})`);

        // Generate response with variable replacement
        const response = this.generateResponse(rule, contact);

        // Delay (human-like)
        const delayMs = rule.delaySeconds * 1000;
        await this.sleep(delayMs);

        // Send auto-reply
        const result = await this.whatsappService.sendMessage(
          tenantId,
          from,
          response,
          'text',
        );

        if (result.success) {
          // Log auto-reply
          await this.logAutoReply(rule, conversation, message, response);

          // Update rule stats
          await this.updateRuleStats(rule);

          this.logger.log(`Auto-reply sent for rule: ${rule.name}`);

          // First match wins
          break;
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to process auto-reply: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Evaluate if rule matches
   */
  private async evaluateRule(
    rule: AutoReplyRule,
    message: string,
    conversation: Conversation,
  ): Promise<boolean> {
    switch (rule.triggerType) {
      case AutoReplyTriggerType.WELCOME:
        return this.welcomeEngine.shouldSendWelcome(conversation);

      case AutoReplyTriggerType.KEYWORD:
        return this.keywordEngine.matchKeyword(rule, message);

      case AutoReplyTriggerType.TIME_BASED:
        return this.timeBasedEngine.isOutsideWorkingHours(rule);

      default:
        return false;
    }
  }

  /**
   * Generate response with variable replacement
   */
  private generateResponse(rule: AutoReplyRule, contact: Contact): string {
    let response = rule.responseMessage;

    // Replace variables
    response = response
      .replace(/\{\{name\}\}/g, contact.name || 'Customer')
      .replace(/\{\{phone\}\}/g, contact.phone);

    return response;
  }

  /**
   * Log auto-reply trigger
   */
  private async logAutoReply(
    rule: AutoReplyRule,
    conversation: Conversation,
    triggeredBy: string,
    response: string,
  ): Promise<void> {
    try {
      // Find matched keyword if applicable
      let matchedKeyword: string | null = null;
      if (rule.triggerType === AutoReplyTriggerType.KEYWORD) {
        matchedKeyword = this.keywordEngine.findMatchedKeyword(
          rule,
          triggeredBy,
        );
      }

      await this.prisma.autoReplyLog.create({
        data: {
          ruleId: rule.id,
          conversationId: conversation.id,
          triggeredByMessage: triggeredBy,
          responseSent: response,
          matchedKeyword,
          triggeredAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log auto-reply: ${error.message}`);
    }
  }

  /**
   * Update rule statistics
   */
  private async updateRuleStats(rule: AutoReplyRule): Promise<void> {
    try {
      await this.prisma.autoReplyRule.update({
        where: { id: rule.id },
        data: {
          totalTriggered: {
            increment: 1,
          },
          lastTriggeredAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to update rule stats: ${error.message}`);
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================
  // CRUD Operations for Rules
  // ============================================

  /**
   * Get all auto-reply rules
   */
  async getRules(tenantId: string) {
    const rules = await this.prisma.autoReplyRule.findMany({
      where: { tenantId },
      orderBy: {
        priority: 'desc',
      },
    });

    return {
      rules: rules.map((rule) => ({
        id: rule.id,
        tenantId: rule.tenantId,
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        keywords: rule.keywords,
        matchType: rule.matchType,
        caseSensitive: rule.caseSensitive,
        workingHours: rule.workingHours,
        responseMessage: rule.responseMessage,
        priority: rule.priority,
        delaySeconds: rule.delaySeconds,
        isActive: rule.isActive,
        totalTriggered: rule.totalTriggered,
        lastTriggeredAt: rule.lastTriggeredAt?.toISOString(),
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Get single rule
   */
  async getRule(ruleId: string, tenantId: string) {
    const rule = await this.prisma.autoReplyRule.findFirst({
      where: {
        id: ruleId,
        tenantId,
      },
      include: {
        logs: {
          orderBy: {
            triggeredAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Auto-reply rule not found');
    }

    return {
      id: rule.id,
      tenantId: rule.tenantId,
      name: rule.name,
      description: rule.description,
      triggerType: rule.triggerType,
      keywords: rule.keywords,
      matchType: rule.matchType,
      caseSensitive: rule.caseSensitive,
      workingHours: rule.workingHours,
      responseMessage: rule.responseMessage,
      priority: rule.priority,
      delaySeconds: rule.delaySeconds,
      isActive: rule.isActive,
      totalTriggered: rule.totalTriggered,
      lastTriggeredAt: rule.lastTriggeredAt?.toISOString(),
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString(),
      recentLogs: rule.logs.map((log) => ({
        id: log.id,
        triggeredByMessage: log.triggeredByMessage,
        responseSent: log.responseSent,
        matchedKeyword: log.matchedKeyword,
        triggeredAt: log.triggeredAt.toISOString(),
      })),
    };
  }

  /**
   * Create new auto-reply rule
   */
  async createRule(tenantId: string, dto: CreateRuleDto) {
    // For ORDER_STATUS/PAYMENT_STATUS, status is stored in keywords[0]
    const status =
      dto.triggerType === 'ORDER_STATUS' || dto.triggerType === 'PAYMENT_STATUS'
        ? dto.keywords?.[0]
        : undefined;

    // Auto-assign priority and delay based on trigger type
    const priority = this.getDefaultPriority(
      dto.triggerType as AutoReplyTriggerType,
      status,
    );
    const delaySeconds = this.getDefaultDelay(
      dto.triggerType as AutoReplyTriggerType,
      status,
    );

    let rule;
    try {
      rule = await this.prisma.autoReplyRule.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          triggerType: dto.triggerType,
          keywords: dto.keywords || [],
          matchType: dto.matchType,
          caseSensitive: dto.caseSensitive ?? false,
          workingHours: dto.workingHours as any,
          responseMessage: dto.responseMessage,
          priority, // Auto-assigned
          delaySeconds, // Auto-assigned
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Rule untuk tipe dan status ini sudah ada. Edit rule yang sudah ada atau hapus dulu sebelum membuat baru.',
        );
      }
      throw error;
    }

    this.logger.log(`Auto-reply rule created: ${rule.id}`);

    return {
      success: true,
      rule: {
        id: rule.id,
        tenantId: rule.tenantId,
        name: rule.name,
        description: rule.description,
        triggerType: rule.triggerType,
        keywords: rule.keywords,
        matchType: rule.matchType,
        caseSensitive: rule.caseSensitive,
        workingHours: rule.workingHours,
        responseMessage: rule.responseMessage,
        priority: rule.priority,
        delaySeconds: rule.delaySeconds,
        isActive: rule.isActive,
        totalTriggered: rule.totalTriggered,
        lastTriggeredAt: rule.lastTriggeredAt?.toISOString(),
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Update auto-reply rule
   */
  async updateRule(ruleId: string, tenantId: string, dto: UpdateRuleDto) {
    const rule = await this.prisma.autoReplyRule.findFirst({
      where: {
        id: ruleId,
        tenantId,
      },
    });

    if (!rule) {
      throw new NotFoundException('Auto-reply rule not found');
    }

    // For ORDER_STATUS/PAYMENT_STATUS, status is stored in keywords[0]
    const status =
      dto.triggerType === 'ORDER_STATUS' || dto.triggerType === 'PAYMENT_STATUS'
        ? dto.keywords?.[0]
        : undefined;

    // Auto-assign priority and delay if trigger type or status changed
    const priority =
      dto.triggerType && dto.triggerType !== rule.triggerType
        ? this.getDefaultPriority(
            dto.triggerType as AutoReplyTriggerType,
            status,
          )
        : dto.priority;

    const delaySeconds =
      dto.triggerType && dto.triggerType !== rule.triggerType
        ? this.getDefaultDelay(
            dto.triggerType as AutoReplyTriggerType,
            status,
          )
        : dto.delaySeconds;

    const updated = await this.prisma.autoReplyRule.update({
      where: { id: ruleId },
      data: {
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        keywords: dto.keywords,
        matchType: dto.matchType,
        caseSensitive: dto.caseSensitive,
        workingHours: dto.workingHours as any,
        responseMessage: dto.responseMessage,
        priority,
        delaySeconds,
        isActive: dto.isActive,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Auto-reply rule updated: ${ruleId}`);

    return {
      success: true,
      rule: {
        id: updated.id,
        tenantId: updated.tenantId,
        name: updated.name,
        description: updated.description,
        triggerType: updated.triggerType,
        keywords: updated.keywords,
        matchType: updated.matchType,
        caseSensitive: updated.caseSensitive,
        workingHours: updated.workingHours,
        responseMessage: updated.responseMessage,
        priority: updated.priority,
        delaySeconds: updated.delaySeconds,
        isActive: updated.isActive,
        totalTriggered: updated.totalTriggered,
        lastTriggeredAt: updated.lastTriggeredAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Delete auto-reply rule
   */
  async deleteRule(ruleId: string, tenantId: string) {
    const rule = await this.prisma.autoReplyRule.findFirst({
      where: {
        id: ruleId,
        tenantId,
      },
    });

    if (!rule) {
      throw new NotFoundException('Auto-reply rule not found');
    }

    await this.prisma.autoReplyRule.delete({
      where: { id: ruleId },
    });

    this.logger.log(`Auto-reply rule deleted: ${ruleId}`);

    return {
      success: true,
      message: 'Auto-reply rule deleted successfully',
    };
  }

  /**
   * Toggle rule active status
   */
  async toggleRule(ruleId: string, tenantId: string) {
    const rule = await this.prisma.autoReplyRule.findFirst({
      where: {
        id: ruleId,
        tenantId,
      },
    });

    if (!rule) {
      throw new NotFoundException('Auto-reply rule not found');
    }

    const updated = await this.prisma.autoReplyRule.update({
      where: { id: ruleId },
      data: {
        isActive: !rule.isActive,
      },
    });

    this.logger.log(
      `Auto-reply rule toggled: ${ruleId} -> ${updated.isActive}`,
    );

    return {
      success: true,
      isActive: updated.isActive,
    };
  }

  // ============================================
  // ORDER STATUS NOTIFICATIONS
  // ============================================

  /**
   * Trigger auto-reply notification for order/payment status change
   */
  async triggerOrderStatusNotification(
    tenantId: string,
    customerPhone: string,
    statusType: 'ORDER_STATUS' | 'PAYMENT_STATUS',
    status: string,
    variables: {
      name: string;
      orderNumber: string;
      total: number;
      trackingLink: string;
    },
  ): Promise<{ sent: boolean; reason?: string }> {
    try {
      // Get active rules for this status
      // For ORDER_STATUS/PAYMENT_STATUS, status is stored in keywords array
      const rules = await this.prisma.autoReplyRule.findMany({
        where: {
          tenantId,
          triggerType: statusType as any,
          keywords: { has: status }, // Check if status exists in keywords array
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });

      if (rules.length === 0) {
        this.logger.log(`No active rule for ${statusType}:${status}`);
        return { sent: false, reason: 'No active rule found' };
      }

      // Use first matching rule (highest priority)
      const rule = rules[0];

      this.logger.log(
        `Triggering order status notification: ${rule.name} (${statusType}:${status})`,
      );

      // Generate response with variables
      const message = this.replaceOrderVariables(rule.responseMessage, {
        ...variables,
        phone: customerPhone,
      });

      // Delay (human-like typing effect)
      await this.sleep(rule.delaySeconds * 1000);

      // Send message
      const result = await this.whatsappService.sendMessage(
        tenantId,
        customerPhone,
        message,
        'text',
      );

      if (result.success) {
        // Update rule stats
        await this.updateRuleStats(rule);

        this.logger.log(
          `Order status notification sent: ${rule.name} to ${customerPhone}`,
        );

        return { sent: true };
      } else {
        return { sent: false, reason: 'Failed to send WhatsApp message' };
      }
    } catch (error) {
      this.logger.error(
        `Failed to send order status notification: ${error.message}`,
        error.stack,
      );
      return { sent: false, reason: error.message };
    }
  }

  /**
   * Replace order-specific variables in message template
   */
  private replaceOrderVariables(
    template: string,
    vars: {
      name: string;
      phone: string;
      orderNumber: string;
      total: number;
      trackingLink: string;
    },
  ): string {
    let message = template;

    // Replace variables
    message = message
      .replace(/\{\{name\}\}/g, vars.name || 'Customer')
      .replace(/\{\{phone\}\}/g, vars.phone || '')
      .replace(/\{\{order_number\}\}/g, vars.orderNumber)
      .replace(/\{\{total\}\}/g, this.formatPrice(vars.total))
      .replace(/\{\{tracking_link\}\}/g, vars.trackingLink);

    return message;
  }

  /**
   * Format price to Indonesian Rupiah
   */
  private formatPrice(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Get default priority based on trigger type
   */
  getDefaultPriority(
    triggerType: AutoReplyTriggerType,
    status?: string,
  ): number {
    switch (triggerType) {
      case AutoReplyTriggerType.WELCOME:
        return 100;
      case AutoReplyTriggerType.PAYMENT_STATUS:
        return 80;
      case AutoReplyTriggerType.ORDER_STATUS:
        return 70;
      case AutoReplyTriggerType.KEYWORD:
        return 50;
      case AutoReplyTriggerType.TIME_BASED:
        return 40;
      default:
        return 50;
    }
  }

  /**
   * Get default delay based on trigger type and status
   */
  getDefaultDelay(
    triggerType: AutoReplyTriggerType,
    status?: string,
  ): number {
    // Order Status specific delays
    if (triggerType === AutoReplyTriggerType.ORDER_STATUS) {
      switch (status) {
        case 'PENDING':
          return 3;
        case 'PROCESSING':
          return 5;
        case 'COMPLETED':
          return 2; // Good news, fast!
        case 'CANCELLED':
          return 4;
        default:
          return 3;
      }
    }

    // Payment Status specific delays
    if (triggerType === AutoReplyTriggerType.PAYMENT_STATUS) {
      switch (status) {
        case 'PAID':
          return 2; // Good news!
        case 'PARTIAL':
          return 3;
        case 'FAILED':
          return 4;
        default:
          return 3;
      }
    }

    // Other trigger types
    switch (triggerType) {
      case AutoReplyTriggerType.WELCOME:
        return 2;
      case AutoReplyTriggerType.KEYWORD:
        return 2;
      case AutoReplyTriggerType.TIME_BASED:
        return 3;
      default:
        return 2;
    }
  }
}
