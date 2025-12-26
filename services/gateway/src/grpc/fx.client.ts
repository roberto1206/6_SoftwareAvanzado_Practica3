import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Transport } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';
import { Observable } from 'rxjs';

interface GetExchangeRateRequest {
  base: string;
  quote: string;
}

interface GetExchangeRateResponse {
  base: string;
  quote: string;
  rate: number;
  timestamp: string;
  source: string;
}

interface ConvertAmountRequest {
  from: string;
  to: string;
  amount: number;
}

interface ConvertAmountResponse {
  original_amount: number;
  converted_amount: number;
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  source: string;
}

interface FxServiceGrpc {
  getExchangeRate(data: GetExchangeRateRequest): Observable<GetExchangeRateResponse>;
  convertAmount(data: ConvertAmountRequest): Observable<ConvertAmountResponse>;
  healthCheck(data: {}): Observable<any>;
}

@Injectable()
export class FxGrpcClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'quetzalship.fx.v1',
      protoPath: join(__dirname, '../../contracts/proto/fx/fx.proto'),
      url: process.env.FX_SERVICE_URL || 'fx:50055',
    },
  })
  private client: ClientGrpc;

  private fxService: FxServiceGrpc;

  onModuleInit() {
    this.fxService = this.client.getService<FxServiceGrpc>('FxService');
  }

  getExchangeRate(base: string, quote: string): Observable<GetExchangeRateResponse> {
    return this.fxService.getExchangeRate({ base, quote });
  }

  convertAmount(from: string, to: string, amount: number): Observable<ConvertAmountResponse> {
    return this.fxService.convertAmount({ from, to, amount });
  }

  healthCheck(): Observable<any> {
    return this.fxService.healthCheck({});
  }
}
