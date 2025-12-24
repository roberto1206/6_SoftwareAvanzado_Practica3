import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { FxService } from '../services/fx.service';
import { ConvertAmountRequest } from '../interfaces/fx.interface';

@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('health')
  async health() {
    return this.fxService.getHealth();
  }

  @Get('rate')
  async getExchangeRate(
    @Query('base') base: string,
    @Query('quote') quote: string,
  ) {
    if (!base || !quote) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Both base and quote parameters are required',
      };
    }

    return this.fxService.getExchangeRate(base, quote);
  }

  @Post('convert')
  @HttpCode(HttpStatus.OK)
  async convertAmount(@Body() request: ConvertAmountRequest) {
    return this.fxService.convertAmount(request);
  }
}
