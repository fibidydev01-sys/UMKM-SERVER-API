import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppGateway } from './whatsapp.gateway';
import { HybridAuthStateService } from './hybrid-auth-state.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AutoReplyModule } from '../auto-reply/auto-reply.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => AutoReplyModule),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppGateway, HybridAuthStateService],
  exports: [WhatsAppService, WhatsAppGateway, HybridAuthStateService],
})
export class WhatsAppModule {}
