import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ConnectWhatsAppDto } from './dto/connect-whatsapp.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  /**
   * POST /api/whatsapp/connect
   * Initialize WhatsApp connection
   */
  @Post('connect')
  async connect(@Req() req, @Body() dto: ConnectWhatsAppDto) {
    const tenantId = req.user.id;

    const result = await this.whatsappService.connectWhatsApp(tenantId);

    return {
      status: result.status,
      qrCode: result.qrCode,
      phoneNumber: result.phoneNumber,
      sessionId: result.sessionId,
    };
  }

  /**
   * DELETE /api/whatsapp/disconnect
   * Disconnect WhatsApp session
   */
  @Delete('disconnect')
  async disconnect(@Req() req) {
    const tenantId = req.user.id;

    const result = await this.whatsappService.disconnectWhatsApp(tenantId);

    return {
      success: result.success,
      message: 'WhatsApp disconnected successfully',
    };
  }

  /**
   * GET /api/whatsapp/status
   * Get WhatsApp connection status
   */
  @Get('status')
  async getStatus(@Req() req) {
    const tenantId = req.user.id;

    const status = await this.whatsappService.getStatus(tenantId);

    return {
      status: status.status,
      phoneNumber: status.phoneNumber,
      lastConnected: status.lastConnected,
      isOnline: status.isOnline,
    };
  }

  /**
   * POST /api/whatsapp/send
   * Send WhatsApp message (for testing)
   */
  @Post('send')
  async sendMessage(@Req() req, @Body() dto: SendMessageDto) {
    const tenantId = req.user.id;

    const result = await this.whatsappService.sendMessage(
      tenantId,
      dto.to,
      dto.content,
      dto.messageType as 'text' | 'image',
      dto.mediaUrl,
    );

    return {
      success: result.success,
      messageId: result.messageId,
    };
  }
}
