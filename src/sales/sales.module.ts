import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { LeadCustomerConversionService } from './lead-customer-conversion.service';
import { StagesController } from './stages.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PipelinesController, StagesController, DealsController],
  providers: [PipelinesService, DealsService, LeadCustomerConversionService],
})
export class SalesModule {}
