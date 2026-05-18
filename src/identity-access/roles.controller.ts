import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { ListRolesQueryDto } from './dto/list-roles.query';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('Identity & access — Roles')
@ApiBearerAuth()
@Controller('identity-access/roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @RequirePermissions('identity.role.read')
  @Get()
  @ApiOperation({ summary: 'List roles (paginated)' })
  list(@Query() query: ListRolesQueryDto) {
    return this.roles.list(query);
  }

  @RequirePermissions('identity.role.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get role by id including permissions' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.getById(id);
  }

  @RequirePermissions('identity.role.create')
  @Post()
  @ApiOperation({ summary: 'Create a custom role' })
  create(@Body() body: CreateRoleDto) {
    return this.roles.create(body);
  }

  @RequirePermissions('identity.role.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update role name / description' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateRoleDto,
  ) {
    return this.roles.update(id, body);
  }

  @RequirePermissions('identity.role.update')
  @Put(':id/permissions')
  @ApiOperation({ summary: 'Replace all permissions granted to a role' })
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetRolePermissionsDto,
  ) {
    return this.roles.setPermissions(id, body);
  }

  @RequirePermissions('identity.role.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a non-system role with no users assigned' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.remove(id);
  }
}
