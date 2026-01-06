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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, QueryCustomerDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../common/decorators/tenant.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(tenantId, dto);
  }

  @Get()
  async findAll(
    @CurrentTenant('id') tenantId: string,
    @Query() query: QueryCustomerDto,
  ) {
    return this.customersService.findAll(tenantId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentTenant('id') tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.findOne(tenantId, customerId);
  }

  @Patch(':id')
  async update(
    @CurrentTenant('id') tenantId: string,
    @Param('id') customerId: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenantId, customerId, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentTenant('id') tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.remove(tenantId, customerId);
  }

  @Get(':id/orders')
  async findCustomerOrders(
    @CurrentTenant('id') tenantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customersService.findCustomerOrders(tenantId, customerId);
  }
}
