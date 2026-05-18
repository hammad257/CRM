import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiProperty({
    enum: UserStatus,
    example: UserStatus.INACTIVE,
    description:
      'ACTIVE users can authenticate. INACTIVE and SUSPENDED cannot. ' +
      'Changing away from ACTIVE revokes refresh tokens and invalidates existing access tokens.',
  })
  @IsEnum(UserStatus)
  status!: UserStatus;
}
