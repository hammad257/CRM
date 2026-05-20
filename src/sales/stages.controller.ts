import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PipelinesService } from './pipelines.service';

@ApiTags('Sales — Pipeline stages')
@ApiBearerAuth()
@Controller('sales/stages')
export class StagesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @RequirePermissions('pipelines.stage.update')
  @Patch(':id')
  @ApiOperation({
    summary: 'Update stage',
    description: 'Returns the parent pipeline with all stages.',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateStageDto,
  ) {
    return this.pipelines.updateStage(id, body);
  }

  @RequirePermissions('pipelines.stage.delete')
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete stage',
    description: 'Fails if any deals reference this stage.',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelines.removeStage(id);
  }
}
