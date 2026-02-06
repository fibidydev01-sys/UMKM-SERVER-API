import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFeedDto,
  UpdateFeedDto,
  QueryFeedDto,
  CreateCommentDto,
  CreateReplyDto,
  QueryCommentDto,
} from './dto';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create feed post - ambil dari product milik tenant
   */
  async create(tenantId: string, dto: CreateFeedDto) {
    // Check: Apakah product milik tenant ini?
    const product = await this.prisma.product.findFirst({
      where: {
        id: dto.productId,
        tenantId,
        isActive: true,
      },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException('Produk tidak ditemukan atau tidak aktif');
    }

    // Check: Apakah product sudah pernah di-post?
    const existing = await this.prisma.feed.findUnique({
      where: {
        tenantId_productId: {
          tenantId,
          productId: dto.productId,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Produk ini sudah di-post ke feed');
    }

    // Create feed
    const feed = await this.prisma.feed.create({
      data: {
        tenantId,
        productId: dto.productId,
        caption: dto.caption,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    return {
      message: 'Produk berhasil di-post ke feed',
      feed,
    };
  }

  /**
   * Get feed list - chronological (newest first), paginated
   * tenantId optional: kalau login, return isLiked per feed
   */
  async findAll(query: QueryFeedDto, currentTenantId?: string) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.feed.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // CHRONOLOGICAL - newest first
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              comparePrice: true,
              images: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
          // Jika user login, cek apakah sudah like dan bookmark
          ...(currentTenantId
            ? {
                likes: {
                  where: { tenantId: currentTenantId },
                  select: { id: true },
                },
                bookmarks: {
                  where: { tenantId: currentTenantId },
                  select: { id: true },
                },
              }
            : {}),
        },
      }),
      this.prisma.feed.count(),
    ]);

    const hasMore = skip + data.length < total;

    // Map data: tambahkan isLiked & isBookmarked flags
    const feedsWithStatus = data.map((feed) => {
      const { likes, bookmarks, ...rest } = feed as typeof feed & {
        likes?: { id: string }[];
        bookmarks?: { id: string }[];
      };
      return {
        ...rest,
        isLiked: likes ? likes.length > 0 : false,
        isBookmarked: bookmarks ? bookmarks.length > 0 : false,
      };
    });

    return {
      data: feedsWithStatus,
      meta: {
        total,
        page,
        limit,
        hasMore, // false = "You're all caught up"
      },
    };
  }

  /**
   * Get single feed detail (with optional auth for isLiked/isBookmarked)
   */
  async findOne(feedId: string, currentTenantId?: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            price: true,
            comparePrice: true,
            images: true,
            stock: true,
            trackStock: true,
            unit: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            whatsapp: true,
          },
        },
        ...(currentTenantId
          ? {
              likes: {
                where: { tenantId: currentTenantId },
                select: { id: true },
              },
              bookmarks: {
                where: { tenantId: currentTenantId },
                select: { id: true },
              },
            }
          : {}),
      },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    const { likes, bookmarks, ...rest } = feed as typeof feed & {
      likes?: { id: string }[];
      bookmarks?: { id: string }[];
    };

    return {
      ...rest,
      isLiked: likes ? likes.length > 0 : false,
      isBookmarked: bookmarks ? bookmarks.length > 0 : false,
    };
  }

  /**
   * Update feed caption - only owner can edit
   */
  async update(tenantId: string, feedId: string, dto: UpdateFeedDto) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true, tenantId: true },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    if (feed.tenantId !== tenantId) {
      throw new ForbiddenException('Kamu tidak bisa mengedit feed orang lain');
    }

    const updated = await this.prisma.feed.update({
      where: { id: feedId },
      data: { caption: dto.caption },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            comparePrice: true,
            images: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    return {
      message: 'Caption berhasil diperbarui',
      feed: updated,
    };
  }

  /**
   * Delete own feed post - only owner can delete
   */
  async remove(tenantId: string, feedId: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true, tenantId: true },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    if (feed.tenantId !== tenantId) {
      throw new ForbiddenException('Kamu tidak bisa menghapus feed orang lain');
    }

    await this.prisma.feed.delete({ where: { id: feedId } });

    return {
      message: 'Feed berhasil dihapus',
    };
  }

  // ══════════════════════════════════════════════════════════════
  // INTERACTIONS - Like & Comment
  // ══════════════════════════════════════════════════════════════

  /**
   * Toggle like - like/unlike dalam satu endpoint
   * Atomic: pakai $transaction agar counter selalu sinkron
   */
  async toggleLike(tenantId: string, feedId: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    // Cek apakah sudah like
    const existing = await this.prisma.feedLike.findUnique({
      where: {
        feedId_tenantId: { feedId, tenantId },
      },
    });

    if (existing) {
      // Unlike - hapus like + decrement counter (atomic)
      await this.prisma.$transaction([
        this.prisma.feedLike.delete({
          where: { id: existing.id },
        }),
        this.prisma.feed.update({
          where: { id: feedId },
          data: { likeCount: { decrement: 1 } },
        }),
      ]);

      return { liked: false, message: 'Like dihapus' };
    } else {
      // Like - buat like + increment counter (atomic)
      await this.prisma.$transaction([
        this.prisma.feedLike.create({
          data: { feedId, tenantId },
        }),
        this.prisma.feed.update({
          where: { id: feedId },
          data: { likeCount: { increment: 1 } },
        }),
      ]);

      return { liked: true, message: 'Berhasil like' };
    }
  }

  /**
   * Add comment to feed
   * Atomic: create comment + increment counter
   */
  async addComment(tenantId: string, feedId: string, dto: CreateCommentDto) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    // Create comment + increment counter (atomic)
    const [comment] = await this.prisma.$transaction([
      this.prisma.feedComment.create({
        data: {
          feedId,
          tenantId,
          content: dto.content,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      }),
      this.prisma.feed.update({
        where: { id: feedId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    return {
      message: 'Komentar berhasil ditambahkan',
      comment,
    };
  }

  /**
   * Get comments for a feed - top-level only, newest first, paginated
   * Each comment includes its replies (nested 1 level)
   */
  async getComments(feedId: string, query: QueryCommentDto, feedOwnerTenantId?: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true, tenantId: true },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    const ownerTenantId = feedOwnerTenantId ?? feed.tenantId;
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const tenantSelect = { id: true, name: true, slug: true, logo: true };

    const [data, total] = await Promise.all([
      this.prisma.feedComment.findMany({
        where: { feedId, parentId: null }, // Only top-level comments
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tenant: { select: tenantSelect },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              tenant: { select: tenantSelect },
            },
          },
        },
      }),
      this.prisma.feedComment.count({ where: { feedId, parentId: null } }),
    ]);

    const hasMore = skip + data.length < total;

    // Add isOwner flag to each comment and reply
    const dataWithOwnerFlag = data.map((comment) => ({
      ...comment,
      isOwner: comment.tenantId === ownerTenantId,
      replies: comment.replies.map((reply) => ({
        ...reply,
        isOwner: reply.tenantId === ownerTenantId,
      })),
    }));

    return {
      data: dataWithOwnerFlag,
      meta: {
        total,
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Delete comment - only comment author or feed owner can delete
   */
  async deleteComment(tenantId: string, commentId: string) {
    const comment = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        tenantId: true,
        feedId: true,
        parentId: true,
        feed: { select: { tenantId: true } },
        _count: { select: { replies: true } },
      },
    });

    if (!comment) {
      throw new NotFoundException('Komentar tidak ditemukan');
    }

    // Only comment author or feed owner can delete
    const isFeedOwner = comment.feed.tenantId === tenantId;
    const isCommentAuthor = comment.tenantId === tenantId;

    if (!isCommentAuthor && !isFeedOwner) {
      throw new ForbiddenException('Kamu tidak bisa menghapus komentar ini');
    }

    // Count how many comments will be deleted (this comment + its replies)
    const deleteCount = 1 + comment._count.replies;

    await this.prisma.$transaction([
      this.prisma.feedComment.delete({ where: { id: commentId } }),
      this.prisma.feed.update({
        where: { id: comment.feedId },
        data: { commentCount: { decrement: deleteCount } },
      }),
    ]);

    return { message: 'Komentar berhasil dihapus' };
  }

  /**
   * Reply to a comment (nested 1 level)
   */
  async replyToComment(tenantId: string, commentId: string, dto: CreateReplyDto) {
    const parent = await this.prisma.feedComment.findUnique({
      where: { id: commentId },
      select: { id: true, feedId: true, parentId: true },
    });

    if (!parent) {
      throw new NotFoundException('Komentar tidak ditemukan');
    }

    // Only allow 1 level of nesting - reply to top-level comment only
    if (parent.parentId !== null) {
      throw new BadRequestException('Tidak bisa membalas reply, hanya bisa membalas komentar utama');
    }

    const [reply] = await this.prisma.$transaction([
      this.prisma.feedComment.create({
        data: {
          feedId: parent.feedId,
          tenantId,
          content: dto.content,
          parentId: commentId,
        },
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
            },
          },
        },
      }),
      this.prisma.feed.update({
        where: { id: parent.feedId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    return {
      message: 'Balasan berhasil ditambahkan',
      reply,
    };
  }

  // ══════════════════════════════════════════════════════════════
  // VIEW TRACKING
  // ══════════════════════════════════════════════════════════════

  /**
   * Track unique view - 1 tenant hanya dihitung 1x per feed
   */
  async trackView(tenantId: string, feedId: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true, viewCount: true },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    // Check if already viewed
    const existing = await this.prisma.feedView.findUnique({
      where: {
        feedId_tenantId: { feedId, tenantId },
      },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.feedView.create({
          data: { feedId, tenantId },
        }),
        this.prisma.feed.update({
          where: { id: feedId },
          data: { viewCount: { increment: 1 } },
        }),
      ]);

      return { viewCount: feed.viewCount + 1 };
    }

    return { viewCount: feed.viewCount };
  }

  // ══════════════════════════════════════════════════════════════
  // BOOKMARK
  // ══════════════════════════════════════════════════════════════

  /**
   * Get my bookmarks - private, hanya user login yang bisa lihat bookmark sendiri
   */
  async getMyBookmarks(tenantId: string, query: QueryFeedDto) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.feedBookmark.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // newest bookmark first
        include: {
          feed: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  comparePrice: true,
                  images: true,
                },
              },
              tenant: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                },
              },
              likes: {
                where: { tenantId },
                select: { id: true },
              },
              bookmarks: {
                where: { tenantId },
                select: { id: true },
              },
            },
          },
        },
      }),
      this.prisma.feedBookmark.count({ where: { tenantId } }),
    ]);

    const hasMore = skip + data.length < total;

    // Map: extract feed from bookmark, add isLiked/isBookmarked flags
    const feedsWithStatus = data.map((bookmark) => {
      const { likes, bookmarks, ...rest } = bookmark.feed as typeof bookmark.feed & {
        likes?: { id: string }[];
        bookmarks?: { id: string }[];
      };
      return {
        ...rest,
        isLiked: likes ? likes.length > 0 : false,
        isBookmarked: bookmarks ? bookmarks.length > 0 : false,
      };
    });

    return {
      data: feedsWithStatus,
      meta: {
        total,
        page,
        limit,
        hasMore,
      },
    };
  }

  /**
   * Toggle bookmark - save/unsave feed post
   */
  async toggleBookmark(tenantId: string, feedId: string) {
    const feed = await this.prisma.feed.findUnique({
      where: { id: feedId },
      select: { id: true },
    });

    if (!feed) {
      throw new NotFoundException('Feed tidak ditemukan');
    }

    const existing = await this.prisma.feedBookmark.findUnique({
      where: {
        feedId_tenantId: { feedId, tenantId },
      },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.feedBookmark.delete({ where: { id: existing.id } }),
        this.prisma.feed.update({
          where: { id: feedId },
          data: { bookmarkCount: { decrement: 1 } },
        }),
      ]);

      return { bookmarked: false, message: 'Bookmark dihapus' };
    } else {
      await this.prisma.$transaction([
        this.prisma.feedBookmark.create({
          data: { feedId, tenantId },
        }),
        this.prisma.feed.update({
          where: { id: feedId },
          data: { bookmarkCount: { increment: 1 } },
        }),
      ]);

      return { bookmarked: true, message: 'Feed disimpan' };
    }
  }
}
