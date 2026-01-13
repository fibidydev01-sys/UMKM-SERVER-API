import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { SeoModule } from '../seo/seo.module'; // ✅ TAMBAH INI

@Module({
  imports: [SeoModule], // ✅ TAMBAH INI
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
