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
import { ConvertLeadToDealDto } from './dto/convert-lead-to-deal.dto';
import { CreateDealDto } from './dto/create-deal.dto';
import { ForecastDealsQueryDto } from './dto/forecast-deals.query';
import { ListDealsQueryDto } from './dto/list-deals.query';
import { MoveDealStageDto } from './dto/move-deal-stage.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { DealsService } from './deals.service';

@ApiTags('Sales — Deals')
@ApiBearerAuth()
@Controller('sales/deals')
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @RequirePermissions('deals.deal.read')
  @Get('forecast')
  @ApiOperation({
    summary: 'Revenue forecast (weighted pipeline)',
    description:
      'Aggregates OPEN deals: total amount and weighted value (amount × stage win probability). Optional filters by pipeline, owner, and expected close window.',
  })
  forecast(@Query() query: ForecastDealsQueryDto) {
    return this.deals.forecast(query);
  }

  @RequirePermissions('deals.deal.read')
  @Get()
  @ApiOperation({ summary: 'List deals (paginated)' })
  list(@Query() query: ListDealsQueryDto) {
    return this.deals.list(query);
  }

  @RequirePermissions('deals.deal.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get deal by id' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.deals.findById(id);
  }

  @RequirePermissions('deals.deal.create')
  @Post('from-lead/:leadId')
  @ApiOperation({
    summary: 'Convert lead to deal',
    description:
      'Creates an OPEN deal linked to the lead, sets lead status to CONVERTED, and defaults stage to the first stage of the default pipeline when omitted.',
  })
  convertFromLead(
    @Param('leadId', ParseUUIDPipe) leadId: string,
    @Body() body: ConvertLeadToDealDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.deals.createFromLead(leadId, body, user.id);
  }

  @RequirePermissions('deals.deal.create')
  @Post()
  @ApiOperation({
    summary: 'Create deal',
    description: 'Defaults owner to the current user when `ownerId` is omitted.',
  })
  create(@Body() body: CreateDealDto, @CurrentUser() user: AuthUser) {
    return this.deals.create(body, user.id);
  }

  @RequirePermissions('deals.deal.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update deal' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateDealDto,
  ) {
    return this.deals.update(id, body);
  }

  @RequirePermissions('deals.deal.update')
  @Patch(':id/stage')
  @ApiOperation({ summary: 'Move deal to another pipeline stage' })
  moveStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MoveDealStageDto,
  ) {
    return this.deals.moveStage(id, body.stageId);
  }

  @RequirePermissions('deals.deal.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete deal' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.deals.remove(id);
  }
}
