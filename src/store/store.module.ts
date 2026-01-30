import { Module } from '@nestjs/common';
import { StoreController } from './store.controller';
import { OrdersModule } from '../orders/orders.module';
import { TenantsModule } from '../tenants/tenants.module';

/**
 * Store Module
 * Handles public store frontend endpoints
 * - Checkout flow
 * - Order tracking
 */
@Module({
  imports: [
    OrdersModule,   // For OrdersService (createFromCheckout, findOnePublic)
    TenantsModule,  // For TenantsService (findBySlug)
  ],
  controllers: [StoreController],
})
export class StoreModule {}
