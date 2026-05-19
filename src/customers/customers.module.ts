import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PublicCustomerInquiryController } from './public-customer-inquiry.controller';
import { LeadAssignmentService } from './lead-assignment.service';

@Module({
  controllers: [CustomersController, PublicCustomerInquiryController],
  providers: [CustomersService, LeadAssignmentService],
  exports: [CustomersService],
})
export class CustomersModule {}
