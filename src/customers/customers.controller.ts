import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AddCustomerHistoryDto } from './dto/add-customer-history.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListCustomersQueryDto } from './dto/list-customers.query';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomersService } from './customers.service';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @RequirePermissions('customers.customer.read')
  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  list(@Query() query: ListCustomersQueryDto) {
    return this.customers.list(query);
  }

  @RequirePermissions('customers.customer.export')
  @Get('export')
  @ApiOperation({ summary: 'Export customers (JSON, max 5000)' })
  export(@Query() query: ListCustomersQueryDto) {
    return this.customers.export(query);
  }

  @RequirePermissions('customers.customer.create')
  @Post()
  @ApiOperation({ summary: 'Create customer profile (staff)' })
  create(
    @Body() body: CreateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customers.create(body, user.id);
  }

  @RequirePermissions('customers.customer.read')
  @Get(':id')
  @ApiOperation({
    summary: 'Customer profile',
    description:
      'Includes contact & company fields, linked user, lead summaries, and full history.',
  })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findByIdWithRelations(id);
  }

  @RequirePermissions('customers.customer.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update customer profile / contact / company' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customers.update(id, body, user.id);
  }

  @RequirePermissions('customers.history.create')
  @Post(':id/history')
  @ApiOperation({ summary: 'Add a history entry (note / timeline)' })
  addHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AddCustomerHistoryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.customers.addHistory(id, body, user.id);
  }

  @RequirePermissions('customers.customer.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer (cascades history; leads unlinked)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.remove(id);
  }
}
