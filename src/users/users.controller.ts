import {
  Body,
  Controller,
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
import { UserStatus } from '@prisma/client';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users.query';
import { SetUserRolesDto } from './dto/set-user-roles.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser() user: AuthUser) {
    return this.users.findById(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (no email/password)' })
  updateMe(@CurrentUser() user: AuthUser, @Body() body: UpdateMeDto) {
    return this.users.updateMe(user.id, body);
  }

  @RequirePermissions('identity.user.read')
  @Get()
  @ApiOperation({ summary: 'List users (paginated, filterable)' })
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @RequirePermissions('identity.user.create')
  @Post()
  @ApiOperation({ summary: 'Create user' })
  create(@Body() body: CreateUserDto) {
    return this.users.create(body);
  }

  @RequirePermissions('identity.user.update')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Set account status (token revoke when not ACTIVE)' })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return this.users.setStatus(id, body.status);
  }

  @RequirePermissions('identity.user.update')
  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate user (status → ACTIVE)' })
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.setStatus(id, UserStatus.ACTIVE);
  }

  @RequirePermissions('identity.user.update')
  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate user (status → INACTIVE, sessions ended)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.setStatus(id, UserStatus.INACTIVE);
  }

  @RequirePermissions('identity.user.update')
  @Patch(':id/roles')
  @ApiOperation({ summary: 'Replace roles for a user' })
  setRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SetUserRolesDto,
  ) {
    return this.users.setRoles(id, body);
  }

  @RequirePermissions('identity.user.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findById(id);
  }

  @RequirePermissions('identity.user.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update user fields (admin)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.users.update(id, body);
  }
}
