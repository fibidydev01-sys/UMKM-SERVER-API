import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  /**
   * GET /api/contacts
   * Get all contacts
   */
  @Get()
  async getContacts(@Req() req) {
    const tenantId = req.user.id;
    return this.contactsService.getContacts(tenantId);
  }

  /**
   * GET /api/contacts/:id
   * Get single contact
   */
  @Get(':id')
  async getContact(@Req() req, @Param('id') contactId: string) {
    const tenantId = req.user.id;
    return this.contactsService.getContact(contactId, tenantId);
  }

  /**
   * POST /api/contacts
   * Create new contact
   */
  @Post()
  async createContact(@Req() req, @Body() dto: CreateContactDto) {
    const tenantId = req.user.id;
    return this.contactsService.createContact(tenantId, dto);
  }

  /**
   * PUT /api/contacts/:id
   * Update contact
   */
  @Put(':id')
  async updateContact(
    @Req() req,
    @Param('id') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    const tenantId = req.user.id;
    return this.contactsService.updateContact(contactId, tenantId, dto);
  }

  /**
   * DELETE /api/contacts/:id
   * Delete contact
   */
  @Delete(':id')
  async deleteContact(@Req() req, @Param('id') contactId: string) {
    const tenantId = req.user.id;
    return this.contactsService.deleteContact(contactId, tenantId);
  }
}
