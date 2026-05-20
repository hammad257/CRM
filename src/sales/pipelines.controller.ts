import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { PipelinesService } from './pipelines.service';

@ApiTags('Sales — Pipelines')
@ApiBearerAuth()
@Controller('sales/pipelines')
export class PipelinesController {
  constructor(private readonly pipelines: PipelinesService) {}

  @RequirePermissions('pipelines.pipeline.read')
  @Get()
  @ApiOperation({ summary: 'List pipelines and stages' })
  list() {
    return this.pipelines.list();
  }

  @RequirePermissions('pipelines.pipeline.read')
  @Get(':id')
  @ApiOperation({ summary: 'Get pipeline with ordered stages' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelines.findById(id);
  }

  @RequirePermissions('pipelines.pipeline.create')
  @Post()
  @ApiOperation({ summary: 'Create pipeline' })
  create(@Body() body: CreatePipelineDto) {
    return this.pipelines.create(body);
  }

  @RequirePermissions('pipelines.pipeline.update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update pipeline' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdatePipelineDto,
  ) {
    return this.pipelines.update(id, body);
  }

  @RequirePermissions('pipelines.pipeline.delete')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete pipeline (no deals in its stages)' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pipelines.remove(id);
  }

  @RequirePermissions('pipelines.stage.create')
  @Post(':id/stages')
  @ApiOperation({ summary: 'Add a stage to a pipeline' })
  addStage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CreateStageDto,
  ) {
    return this.pipelines.createStage(id, body);
  }
}
