import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryConversationDto } from './dto/query-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ConversationStatus } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get conversations list with pagination and filters
   */
  async getConversations(tenantId: string, query: QueryConversationDto) {
    const { status, search, unreadOnly, page = 1, limit = 20 } = query;

    const where: any = {
      tenantId,
    };

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by unread only
    if (unreadOnly) {
      where.unreadCount = {
        gt: 0,
      };
    }

    // Search by customer name or phone
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;
    const take = limit;

    // Get total count
    const total = await this.prisma.conversation.count({ where });

    // Get conversations
    const conversations = await this.prisma.conversation.findMany({
      where,
      include: {
        contact: {
          select: {
            phone: true,
            name: true,
            avatarUrl: true,
            totalConversations: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      skip,
      take,
    });

    // Format response
    const data = conversations.map((conv) => ({
      id: conv.id,
      customerPhone: conv.customerPhone,
      customerName: conv.customerName,
      customerAvatar: conv.customerAvatarUrl,
      status: conv.status,
      unreadCount: conv.unreadCount,
      lastMessage: {
        content: conv.lastMessageContent || '',
        from: conv.lastMessageFrom || 'customer',
        timestamp: conv.lastMessageAt.toISOString(),
      },
      createdAt: conv.createdAt.toISOString(),
      contact: conv.contact,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single conversation with messages
   */
  async getConversation(conversationId: string, tenantId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
      include: {
        contact: {
          select: {
            phone: true,
            name: true,
            avatarUrl: true,
            totalConversations: true,
            firstContactAt: true,
            lastContactAt: true,
          },
        },
        messages: {
          orderBy: {
            sentAt: 'desc',
          },
          take: 50, // Load last 50 messages
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      conversation: {
        id: conversation.id,
        customerPhone: conversation.customerPhone,
        customerName: conversation.customerName,
        customerAvatar: conversation.customerAvatarUrl,
        status: conversation.status,
        unreadCount: conversation.unreadCount,
        totalMessages: conversation.totalMessages,
        contact: conversation.contact,
        createdAt: conversation.createdAt.toISOString(),
      },
      messages: conversation.messages.map((msg) => ({
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
    };
  }

  /**
   * Update conversation status
   */
  async updateConversation(
    conversationId: string,
    tenantId: string,
    dto: UpdateConversationDto,
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: dto.status,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      conversation: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Mark conversation as read (reset unread count)
   */
  async markAsRead(conversationId: string, tenantId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        tenantId,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        unreadCount: 0,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
    };
  }

  /**
   * Get or create conversation for a customer
   */
  async getOrCreateConversation(
    tenantId: string,
    customerPhone: string,
    customerName?: string,
  ) {
    // Try to find existing conversation
    let conversation = await this.prisma.conversation.findUnique({
      where: {
        tenantId_customerPhone: {
          tenantId,
          customerPhone,
        },
      },
      include: {
        contact: true,
      },
    });

    // Create if doesn't exist
    if (!conversation) {
      // Get or create contact
      let contact = await this.prisma.contact.findUnique({
        where: {
          tenantId_phone: {
            tenantId,
            phone: customerPhone,
          },
        },
      });

      if (!contact) {
        contact = await this.prisma.contact.create({
          data: {
            tenantId,
            phone: customerPhone,
            name: customerName,
            firstContactAt: new Date(),
            lastContactAt: new Date(),
            totalConversations: 1,
          },
        });
      }

      conversation = await this.prisma.conversation.create({
        data: {
          tenantId,
          customerPhone,
          customerName: customerName || contact.name,
          customerAvatarUrl: contact.avatarUrl,
          contactId: contact.id,
          status: ConversationStatus.ACTIVE,
        },
        include: {
          contact: true,
        },
      });
    }

    return conversation;
  }
}
