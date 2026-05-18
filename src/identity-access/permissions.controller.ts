import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { ListPermissionsQueryDto } from './dto/list-permissions.query';
import { PermissionsCatalogService } from './permissions-catalog.service';

@ApiTags('Identity & access — Permissions')
@ApiBearerAuth()
@Controller('identity-access/permissions')
export class PermissionsController {
  constructor(private readonly catalog: PermissionsCatalogService) {}

  @RequirePermissions('identity.permission.read')
  @Get('grouped')
  @ApiOperation({
    summary: 'Full permission catalog grouped by module and resource',
    description:
      'Intended for admin UIs: nested tree of modules → resources → permission rows.',
  })
  grouped() {
    return this.catalog.listGrouped();
  }

  @RequirePermissions('identity.permission.read')
  @Get()
  @ApiOperation({ summary: 'Flat permission list (paginated)' })
  list(@Query() query: ListPermissionsQueryDto) {
    return this.catalog.listFlat(query);
  }
}
