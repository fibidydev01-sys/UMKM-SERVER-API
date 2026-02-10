import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { MidtransService } from './midtrans.service';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [SubscriptionModule],
  controllers: [PaymentController],
  providers: [MidtransService],
  exports: [MidtransService],
})
export class PaymentModule {}
