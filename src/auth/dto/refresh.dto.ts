import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    example:
      'xJ9s2k...base64url-opaque-token-from-login-or-refresh-response',
    description: 'Opaque refresh token returned by /auth/login or /auth/refresh.',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
