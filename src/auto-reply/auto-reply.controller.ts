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
  Patch,
} from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';

@Controller('auto-reply')
@UseGuards(JwtAuthGuard)
export class AutoReplyController {
  constructor(private readonly autoReplyService: AutoReplyService) {}

  /**
   * GET /api/auto-reply/rules
   * Get all auto-reply rules
   */
  @Get('rules')
  async getRules(@Req() req) {
    const tenantId = req.user.id;
    return this.autoReplyService.getRules(tenantId);
  }

  /**
   * GET /api/auto-reply/rules/:id
   * Get single rule with logs
   */
  @Get('rules/:id')
  async getRule(@Req() req, @Param('id') ruleId: string) {
    const tenantId = req.user.id;
    return this.autoReplyService.getRule(ruleId, tenantId);
  }

  /**
   * POST /api/auto-reply/rules
   * Create new auto-reply rule
   */
  @Post('rules')
  async createRule(@Req() req, @Body() dto: CreateRuleDto) {
    const tenantId = req.user.id;
    return this.autoReplyService.createRule(tenantId, dto);
  }

  /**
   * PUT /api/auto-reply/rules/:id
   * Update auto-reply rule
   */
  @Put('rules/:id')
  async updateRule(
    @Req() req,
    @Param('id') ruleId: string,
    @Body() dto: UpdateRuleDto,
  ) {
    const tenantId = req.user.id;
    return this.autoReplyService.updateRule(ruleId, tenantId, dto);
  }

  /**
   * DELETE /api/auto-reply/rules/:id
   * Delete auto-reply rule
   */
  @Delete('rules/:id')
  async deleteRule(@Req() req, @Param('id') ruleId: string) {
    const tenantId = req.user.id;
    return this.autoReplyService.deleteRule(ruleId, tenantId);
  }

  /**
   * PATCH /api/auto-reply/rules/:id/toggle
   * Toggle rule active status
   */
  @Patch('rules/:id/toggle')
  async toggleRule(@Req() req, @Param('id') ruleId: string) {
    const tenantId = req.user.id;
    return this.autoReplyService.toggleRule(ruleId, tenantId);
  }
}
