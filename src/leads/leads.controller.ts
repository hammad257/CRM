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
import { type AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads.query';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('Leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @RequirePermissions('leads.lead.read')
  @Get()
  @ApiOperation({ summary: 'List leads (paginated)' })
  list(@Query() query: ListLeadsQueryDto) {
    return this.leads.list(query);
  }

  @RequirePermissions('leads.lead.export')
  @Get('export')
  @ApiOperation({
    summary: 'Export leads as JSON (same filters as list; max 5000 rows)',
  })
  export(@Query() query: ListLeadsQueryDto) {
    return this.leads.export(query);
  }

  @RequirePermissions('leads.lead.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get lead by id' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.leads.findById(id);
  }

  @RequirePermissions('leads.lead.create')
  @Post()
  @ApiOperation({
    summary: 'Create lead',
    description: 'Defaults owner to the current user if `ownerId` is omitted.',
  })
  create(@Body() body: CreateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leads.create(body, user.id);
  }

  @RequirePermissions('leads.lead.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update lead' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateLeadDto,
  ) {
    return this.leads.update(id, body);
  }

  @RequirePermissions('leads.lead.assign')
  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign or unassign owner' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignLeadDto,
  ) {
    return this.leads.assign(id, body);
  }

  @RequirePermissions('leads.lead.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete lead' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.leads.remove(id);
  }
}
