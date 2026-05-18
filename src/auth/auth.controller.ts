import { Body, Controller, Ip, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Obtain access + refresh tokens' })
  login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    return this.auth.login(body.email, body.password, {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    });
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token; returns new access + refresh' })
  refresh(
    @Body() body: RefreshDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    return this.auth.refresh(body.refreshToken, {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    });
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() body: RefreshDto): Promise<{ ok: true }> {
    await this.auth.logout(body.refreshToken);
    return { ok: true };
  }

  @ApiBearerAuth()
  @Post('logout-all')
  @ApiOperation({ summary: 'Revoke all sessions for current user' })
  async logoutAll(@CurrentUser() user: AuthUser): Promise<{ ok: true }> {
    await this.auth.logoutAll(user.id);
    return { ok: true };
  }
}
