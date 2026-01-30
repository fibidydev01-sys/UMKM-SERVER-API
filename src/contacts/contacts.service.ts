import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all contacts for a tenant
   */
  async getContacts(tenantId: string) {
    const contacts = await this.prisma.contact.findMany({
      where: { tenantId },
      orderBy: {
        lastContactAt: 'desc',
      },
      include: {
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    return {
      data: contacts.map((contact) => ({
        id: contact.id,
        phone: contact.phone,
        name: contact.name,
        avatarUrl: contact.avatarUrl,
        totalConversations: contact.totalConversations,
        firstContactAt: contact.firstContactAt?.toISOString(),
        lastContactAt: contact.lastContactAt?.toISOString(),
        createdAt: contact.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Get single contact
   */
  async getContact(contactId: string, tenantId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId,
      },
      include: {
        conversations: {
          orderBy: {
            lastMessageAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return {
      id: contact.id,
      phone: contact.phone,
      name: contact.name,
      avatarUrl: contact.avatarUrl,
      totalConversations: contact.totalConversations,
      firstContactAt: contact.firstContactAt?.toISOString(),
      lastContactAt: contact.lastContactAt?.toISOString(),
      createdAt: contact.createdAt.toISOString(),
      conversations: contact.conversations.map((conv) => ({
        id: conv.id,
        status: conv.status,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        lastMessageContent: conv.lastMessageContent,
      })),
    };
  }

  /**
   * Create new contact
   */
  async createContact(tenantId: string, dto: CreateContactDto) {
    // Check if contact already exists
    const existing = await this.prisma.contact.findUnique({
      where: {
        tenantId_phone: {
          tenantId,
          phone: dto.phone,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Contact already exists');
    }

    const contact = await this.prisma.contact.create({
      data: {
        tenantId,
        phone: dto.phone,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        firstContactAt: new Date(),
        lastContactAt: new Date(),
      },
    });

    return {
      success: true,
      contact: {
        id: contact.id,
        phone: contact.phone,
        name: contact.name,
        avatarUrl: contact.avatarUrl,
        createdAt: contact.createdAt.toISOString(),
      },
    };
  }

  /**
   * Update contact
   */
  async updateContact(
    contactId: string,
    tenantId: string,
    dto: UpdateContactDto,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      data: {
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      contact: {
        id: updated.id,
        phone: updated.phone,
        name: updated.name,
        avatarUrl: updated.avatarUrl,
        updatedAt: updated.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string, tenantId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: {
        id: contactId,
        tenantId,
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.contact.delete({
      where: { id: contactId },
    });

    return {
      success: true,
      message: 'Contact deleted successfully',
    };
  }
}
