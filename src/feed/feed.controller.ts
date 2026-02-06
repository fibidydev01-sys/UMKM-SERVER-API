import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import {
  CreateFeedDto,
  UpdateFeedDto,
  QueryFeedDto,
  CreateCommentDto,
  CreateReplyDto,
  QueryCommentDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('feed')
export class FeedController {
  constructor(private feedService: FeedService) {}

  // ══════════════════════════════════════════════════════════════
  // PUBLIC ENDPOINTS (with optional auth for isLiked/isBookmarked)
  // ══════════════════════════════════════════════════════════════

  /**
   * Get feed list (chronological, paginated)
   * GET /api/feed?page=1&limit=20
   * Optional auth: kalau login, return isLiked & isBookmarked per feed
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Query() query: QueryFeedDto, @Req() req: any) {
    const tenantId = req.user?.id ?? undefined;
    return this.feedService.findAll(query, tenantId);
  }

  /**
   * Get my bookmarks (private - only own bookmarks)
   * GET /api/feed/bookmarks?page=1&limit=20
   */
  @Get('bookmarks')
  @UseGuards(JwtAuthGuard)
  async getMyBookmarks(
    @CurrentTenant('id') tenantId: string,
    @Query() query: QueryFeedDto,
  ) {
    return this.feedService.getMyBookmarks(tenantId, query);
  }

  /**
   * Get single feed detail
   * GET /api/feed/:id
   * Optional auth: kalau login, return isLiked & isBookmarked
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id') feedId: string, @Req() req: any) {
    const tenantId = req.user?.id ?? undefined;
    return this.feedService.findOne(feedId, tenantId);
  }

  /**
   * Get comments for a feed (public, paginated)
   * GET /api/feed/:id/comments?page=1&limit=20
   */
  @Get(':id/comments')
  async getComments(
    @Param('id') feedId: string,
    @Query() query: QueryCommentDto,
  ) {
    return this.feedService.getComments(feedId, query);
  }

  // ══════════════════════════════════════════════════════════════
  // PROTECTED ENDPOINTS (Auth Required)
  // ══════════════════════════════════════════════════════════════

  /**
   * Create feed post (from own product)
   * POST /api/feed
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateFeedDto,
  ) {
    return this.feedService.create(tenantId, dto);
  }

  /**
   * Update feed caption (owner only)
   * PATCH /api/feed/:id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') feedId: string,
    @Body() dto: UpdateFeedDto,
  ) {
    return this.feedService.update(tenantId, feedId, dto);
  }

  /**
   * Delete own feed post
   * DELETE /api/feed/:id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @CurrentTenant('id') tenantId: string,
    @Param('id') feedId: string,
  ) {
    return this.feedService.remove(tenantId, feedId);
  }

  /**
   * Toggle like on a feed
   * POST /api/feed/:id/like
   */
  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(
    @CurrentTenant('id') tenantId: string,
    @Param('id') feedId: string,
  ) {
    return this.feedService.toggleLike(tenantId, feedId);
  }

  /**
   * Toggle bookmark on a feed
   * POST /api/feed/:id/bookmark
   */
  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  async toggleBookmark(
    @CurrentTenant('id') tenantId: string,
    @Param('id') feedId: string,
  ) {
    return this.feedService.toggleBookmark(tenantId, feedId);
  }

  /**
   * Track view on a feed (unique per user)
   * POST /api/feed/:id/view
   */
  @Post(':id/view')
  @UseGuards(JwtAuthGuard)
  async trackView(
    @CurrentTenant('id') tenantId: string,
    @Param('id') feedId: string,
  ) {
    return this.feedService.trackView(tenantId, feedId);
  }

  /**
   * Add comment to a feed
   * POST /api/feed/:id/comments
   */
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addComment(
    @CurrentTenant('id') tenantId: string,
    @Param('id') feedId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.feedService.addComment(tenantId, feedId, dto);
  }

  /**
   * Reply to a comment (1 level nesting)
   * POST /api/feed/comments/:commentId/reply
   */
  @Post('comments/:commentId/reply')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async replyToComment(
    @CurrentTenant('id') tenantId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.feedService.replyToComment(tenantId, commentId, dto);
  }

  /**
   * Delete a comment (author or feed owner)
   * DELETE /api/feed/comments/:commentId
   */
  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  async deleteComment(
    @CurrentTenant('id') tenantId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.feedService.deleteComment(tenantId, commentId);
  }
}
