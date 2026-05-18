import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PublicCustomerInquiryController } from './public-customer-inquiry.controller';

@Module({
  controllers: [CustomersController, PublicCustomerInquiryController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}
