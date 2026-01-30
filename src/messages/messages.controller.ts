import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessageDto } from './dto/query-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /api/messages/send
   * Send message to customer
   */
  @Post('send')
  async sendMessage(@Req() req, @Body() dto: SendMessageDto) {
    const tenantId = req.user.id;
    return this.messagesService.sendMessage(tenantId, dto);
  }

  /**
   * GET /api/messages
   * Get messages for conversation
   */
  @Get()
  async getMessages(@Req() req, @Query() query: QueryMessageDto) {
    const tenantId = req.user.id;
    return this.messagesService.getMessages(tenantId, query);
  }
}
