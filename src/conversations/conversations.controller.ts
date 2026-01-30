import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Post,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QueryConversationDto } from './dto/query-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  /**
   * GET /api/conversations
   * Get conversations list
   */
  @Get()
  async getConversations(@Req() req, @Query() query: QueryConversationDto) {
    const tenantId = req.user.id;
    return this.conversationsService.getConversations(tenantId, query);
  }

  /**
   * GET /api/conversations/:id
   * Get single conversation with messages
   */
  @Get(':id')
  async getConversation(@Req() req, @Param('id') conversationId: string) {
    const tenantId = req.user.id;
    return this.conversationsService.getConversation(conversationId, tenantId);
  }

  /**
   * PATCH /api/conversations/:id
   * Update conversation status
   */
  @Patch(':id')
  async updateConversation(
    @Req() req,
    @Param('id') conversationId: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const tenantId = req.user.id;
    return this.conversationsService.updateConversation(
      conversationId,
      tenantId,
      dto,
    );
  }

  /**
   * POST /api/conversations/:id/mark-read
   * Mark conversation as read
   */
  @Post(':id/mark-read')
  async markAsRead(@Req() req, @Param('id') conversationId: string) {
    const tenantId = req.user.id;
    return this.conversationsService.markAsRead(conversationId, tenantId);
  }
}
