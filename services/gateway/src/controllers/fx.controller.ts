import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { FxGrpcClient } from '../grpc/fx.client';
import {
  FxConvertRequestDto,
  FxConvertResponseDto,
  FxHealthResponseDto,
  FxRateResponseDto,
} from '../dto/fx.dto';

@ApiTags('fx')
@Controller('fx')
export class FxController {
  constructor(private readonly fxClient: FxGrpcClient) {}

  @Get('rate')
  @ApiOperation({ summary: 'Obtener tasa de cambio (vía gRPC)' })
  @ApiQuery({ name: 'base', required: true, example: 'USD' })
  @ApiQuery({ name: 'quote', required: true, example: 'GTQ' })
  @ApiOkResponse({ type: FxRateResponseDto })
  async getRate(
    @Query('base') base: string,
    @Query('quote') quote: string,
  ): Promise<FxRateResponseDto> {
    return await firstValueFrom(this.fxClient.getExchangeRate(base, quote)) as any;
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convertir monto (vía gRPC)' })
  @ApiBody({ type: FxConvertRequestDto })
  @ApiOkResponse({ type: FxConvertResponseDto })
  async convert(
    @Body() body: FxConvertRequestDto,
  ): Promise<FxConvertResponseDto> {
    const { from, to, amount } = body;
    return await firstValueFrom(this.fxClient.convertAmount(from, to, amount)) as any;
  }

  @Get('health')
  @ApiOperation({ summary: 'HealthCheck de FX (vía gRPC)' })
  @ApiOkResponse({ type: FxHealthResponseDto })
  async health(): Promise<FxHealthResponseDto> {
    return await firstValueFrom(this.fxClient.healthCheck()) as any;
  }
}
