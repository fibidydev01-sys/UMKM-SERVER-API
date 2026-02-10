import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { ProductsModule } from './products/products.module';
import { CustomersModule } from './customers/customers.module';
import { OrdersModule } from './orders/orders.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { SeoModule } from './seo/seo.module';
import { CategoriesModule } from './categories/categories.module';
import { StoreModule } from './store/store.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { ContactsModule } from './contacts/contacts.module';
import { AutoReplyModule } from './auto-reply/auto-reply.module';
import { FeedModule } from './feed/feed.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PaymentModule } from './payment/payment.module';
import midtransConfig from './config/midtrans.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [midtransConfig],
    }),
    // Rate Limiting - 100 requests per 60 seconds per IP
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 60 seconds in milliseconds
        limit: 100, // max 100 requests
      },
    ]),
    PrismaModule,
    RedisModule, // 🔥 Add Redis Module
    AuthModule,
    TenantsModule,
    ProductsModule,
    CustomersModule,
    OrdersModule,
    SitemapModule,
    SeoModule,
    CategoriesModule,
    StoreModule,
    // WhatsApp Chat System Modules
    WhatsAppModule,
    ConversationsModule,
    MessagesModule,
    ContactsModule,
    AutoReplyModule,
    // Feed System
    FeedModule,
    // Subscription & Payment Gateway
    SubscriptionModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
