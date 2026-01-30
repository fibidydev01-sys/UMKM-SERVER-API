import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  QueryOrderDto,
} from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.create(tenantId, dto);
  }

  @Get()
  async findAll(
    @CurrentTenant('id') tenantId: string,
    @Query() query: QueryOrderDto,
  ) {
    return this.ordersService.findAll(tenantId, query);
  }

  @Get('sample/preview')
  async getSampleForPreview(@CurrentTenant('id') tenantId: string) {
    return this.ordersService.getSampleOrderForPreview(tenantId);
  }

  @Get(':id')
  async findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.findOne(tenantId, orderId);
  }

  @Patch(':id')
  async update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(tenantId, orderId, dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @CurrentTenant('id') tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(tenantId, orderId, dto);
  }

  @Patch(':id/payment')
  async updatePaymentStatus(
    @CurrentTenant('id') tenantId: string,
    @Param('id') orderId: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(tenantId, orderId, dto);
  }

  // ✅ NEW: Cancel order endpoint
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @CurrentTenant('id') tenantId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.cancelOrder(tenantId, orderId);
  }

  @Delete(':id')
  async remove(
    @CurrentTenant('id') tenantId: string,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.remove(tenantId, orderId);
  }
}
