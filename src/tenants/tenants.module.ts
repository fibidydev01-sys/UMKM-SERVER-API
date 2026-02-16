import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { DomainController } from './domain.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SeoModule } from '../seo/seo.module'; // 🔥 CRITICAL: Import SeoModule!

@Module({
  imports: [
    PrismaModule,
    SeoModule, // 🔥 CRITICAL: Add SeoModule to imports!
  ],
  controllers: [
    TenantsController,
    DomainController, // 🚀 Custom domain controller
  ],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
