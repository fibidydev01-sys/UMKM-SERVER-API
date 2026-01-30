import { Module } from '@nestjs/common';
import { AutoReplyService } from './auto-reply.service';
import { AutoReplyController } from './auto-reply.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { KeywordEngine } from './engines/keyword-engine';
import { TimeBasedEngine } from './engines/time-based-engine';
import { WelcomeEngine } from './engines/welcome-engine';
import { OrderStatusEngine } from './engines/order-status-engine';

@Module({
  imports: [PrismaModule, WhatsAppModule, ConversationsModule],
  controllers: [AutoReplyController],
  providers: [
    AutoReplyService,
    KeywordEngine,
    TimeBasedEngine,
    WelcomeEngine,
    OrderStatusEngine,
  ],
  exports: [AutoReplyService],
})
export class AutoReplyModule {}
