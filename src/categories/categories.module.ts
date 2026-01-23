import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { PrismaModule } from '../prisma/prisma.module';

// ==========================================
// CATEGORIES MODULE
// Provides category listing and search
// ==========================================

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService], // Export for use in other modules (e.g., AuthModule)
})
export class CategoriesModule {}
