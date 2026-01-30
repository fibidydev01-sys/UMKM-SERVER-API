import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { ConversationsService } from '../conversations/conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessageDto } from './dto/query-message.dto';
import { MessageSenderType, MessageStatus, MessageType } from '@prisma/client';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappService: WhatsAppService,
    private conversationsService: ConversationsService,
  ) {}

  /**
   * Send message to customer
   */
  async sendMessage(tenantId: string, dto: SendMessageDto) {
    const { conversationId, messageType, content, mediaUrl } = dto;

    // Verify conversation exists and belongs to tenant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Send via WhatsApp
    const result = await this.whatsappService.sendMessage(
      tenantId,
      conversation.customerPhone,
      content,
      messageType as any,
      mediaUrl,
    );

    if (!result.success) {
      throw new Error('Failed to send message');
    }

    // Save to database
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        waMessageId: result.messageId,
        senderType: MessageSenderType.OWNER,
        senderId: tenantId,
        messageType: messageType,
        content,
        mediaUrl,
        status: MessageStatus.SENT,
        sentAt: new Date(),
      },
    });

    // Update conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessageContent: content,
        lastMessageFrom: 'owner',
        totalMessages: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Message sent: ${message.id}`);

    return {
      success: true,
      message: {
        id: message.id,
        waMessageId: message.waMessageId,
        status: message.status,
        sentAt: message.sentAt.toISOString(),
      },
    };
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(tenantId: string, query: QueryMessageDto) {
    const { conversationId, before, limit = 50 } = query;

    // Verify conversation exists and belongs to tenant
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Build where clause
    const where: any = {
      conversationId,
    };

    // Cursor-based pagination (load older messages)
    if (before) {
      const beforeMessage = await this.prisma.message.findUnique({
        where: { id: before },
      });

      if (beforeMessage) {
        where.sentAt = {
          lt: beforeMessage.sentAt,
        };
      }
    }

    // Get messages
    const messages = await this.prisma.message.findMany({
      where,
      orderBy: {
        sentAt: 'desc',
      },
      take: limit,
    });

    // Check if there are more messages
    const hasMore = messages.length === limit;

    return {
      messages: messages.map((msg) => ({
        id: msg.id,
        senderType: msg.senderType,
        senderName: msg.senderName,
        messageType: msg.messageType,
        content: msg.content,
        mediaUrl: msg.mediaUrl,
        status: msg.status,
        sentAt: msg.sentAt.toISOString(),
        deliveredAt: msg.deliveredAt?.toISOString(),
        readAt: msg.readAt?.toISOString(),
      })),
      hasMore,
    };
  }

  /**
   * Save incoming message from WhatsApp
   */
  async saveIncomingMessage(
    tenantId: string,
    from: string,
    content: string,
    waMessageId: string,
    messageType: MessageType = MessageType.TEXT,
    mediaUrl?: string,
  ) {
    try {
      // Get or create conversation
      const conversation =
        await this.conversationsService.getOrCreateConversation(
          tenantId,
          from,
        );

      // Save message
      const message = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          waMessageId,
          senderType: MessageSenderType.CUSTOMER,
          senderId: from,
          senderName: conversation.customerName || from,
          messageType,
          content,
          mediaUrl,
          status: MessageStatus.DELIVERED,
          sentAt: new Date(),
          deliveredAt: new Date(),
        },
      });

      // Update conversation
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessageContent: content,
          lastMessageFrom: 'customer',
          totalMessages: {
            increment: 1,
          },
          unreadCount: {
            increment: 1,
          },
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Incoming message saved: ${message.id}`);

      return {
        message,
        conversation,
      };
    } catch (error) {
      this.logger.error(
        `Failed to save incoming message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update message status (delivered, read)
   */
  async updateMessageStatus(
    waMessageId: string,
    status: MessageStatus,
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
      };

      if (status === MessageStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      } else if (status === MessageStatus.READ) {
        updateData.readAt = new Date();
      }

      await this.prisma.message.updateMany({
        where: { waMessageId },
        data: updateData,
      });

      this.logger.log(`Message status updated: ${waMessageId} -> ${status}`);
    } catch (error) {
      this.logger.error(
        `Failed to update message status: ${error.message}`,
        error.stack,
      );
    }
  }
}
