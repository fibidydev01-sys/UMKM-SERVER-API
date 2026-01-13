import { Module } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { SeoModule } from '../seo/seo.module'; // ✅ TAMBAH INI

@Module({
  imports: [SeoModule], // ✅ TAMBAH INI
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
