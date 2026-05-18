import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { WebsiteInquiryDto } from './dto/website-inquiry.dto';
import { CustomersService } from './customers.service';

@ApiTags('Public — Customer inquiries')
@Controller('public/customer-inquiries')
export class PublicCustomerInquiryController {
  constructor(private readonly customers: CustomersService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Website contact / lead form',
    description:
      'No auth. Upserts customer by email, logs history, creates a Lead (source WEBSITE, unassigned).',
  })
  submit(@Body() body: WebsiteInquiryDto) {
    return this.customers.submitWebsiteInquiry(body);
  }
}
