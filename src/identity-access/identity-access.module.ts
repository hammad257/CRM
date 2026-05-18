import { Module } from '@nestjs/common';
import { AccessService } from './access.service';
import { PermissionsCatalogService } from './permissions-catalog.service';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  controllers: [RolesController, PermissionsController],
  providers: [AccessService, RolesService, PermissionsCatalogService],
  exports: [AccessService],
})
export class IdentityAccessModule {}
