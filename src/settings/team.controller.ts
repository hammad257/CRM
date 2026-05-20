import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ListTeamQueryDto } from './dto/list-team.query';
import { UpdateTeamScopeDto } from './dto/update-team-scope.dto';
import { TeamService } from './team.service';

@ApiTags('Settings — Team')
@ApiBearerAuth()
@Controller('settings/team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @RequirePermissions('settings.team.read')
  @Get()
  @ApiOperation({
    summary: 'List team members',
    description:
      'Active CRM users with roles, access scope, and owned lead/deal counts. Supports filter by role code.',
  })
  list(@Query() query: ListTeamQueryDto) {
    return this.team.list(query);
  }

  @RequirePermissions('settings.team.update')
  @Patch(':userId/scope')
  @ApiOperation({
    summary: 'Update member scope (campuses / departments)',
    description: 'Team management: assign organizational scope for collaboration and access.',
  })
  updateScope(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateTeamScopeDto,
  ) {
    return this.team.updateScope(userId, body);
  }
}
