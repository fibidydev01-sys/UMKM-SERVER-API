import { Controller, Get, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';

// ==========================================
// CATEGORIES CONTROLLER
// Public endpoints - NO AUTH REQUIRED
// ==========================================

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Get all unique categories from active tenants
   * GET /api/categories
   * Public endpoint
   *
   * Returns: string[] - Array of unique category strings
   * Example: ["WARUNG_KELONTONG", "BENGKEL_MOTOR", "Distro Streetwear", ...]
   */
  @Get()
  async getAllCategories() {
    return this.categoriesService.getAllUniqueCategories();
  }

  /**
   * Get category statistics (count of tenants per category)
   * GET /api/categories/stats
   * Public endpoint
   *
   * Returns: { category: string, count: number }[]
   * Example: [
   *   { category: "WARUNG_KELONTONG", count: 150 },
   *   { category: "Distro Streetwear", count: 5 },
   *   ...
   * ]
   */
  @Get('stats')
  async getCategoryStats() {
    return this.categoriesService.getCategoryStats();
  }

  /**
   * Search categories (autocomplete)
   * GET /api/categories/search?q=distro
   * Public endpoint
   *
   * Returns: string[] - Matching categories
   * Example: ["Distro Streetwear", "Distro Vintage", ...]
   */
  @Get('search')
  async searchCategories(@Query('q') query: string) {
    return this.categoriesService.searchCategories(query);
  }
}
