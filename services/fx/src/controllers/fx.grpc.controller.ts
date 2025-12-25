import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { FxService } from '../services/fx.service';

interface GetExchangeRateRequest {
  base: string;
  quote: string;
}

interface ConvertAmountRequest {
  from: string;
  to: string;
  amount: number;
}

interface HealthCheckRequest {}

@Controller()
export class FxGrpcController {
  constructor(private readonly fxService: FxService) {}

  @GrpcMethod('FxService', 'GetExchangeRate')
  async getExchangeRate(data: GetExchangeRateRequest) {
    const result = await this.fxService.getExchangeRate(data.base, data.quote);
    
    return {
      base: result.base,
      quote: result.quote,
      rate: result.rate,
      timestamp: result.timestamp,
      source: result.source,
    };
  }

  @GrpcMethod('FxService', 'ConvertAmount')
  async convertAmount(data: ConvertAmountRequest) {
    const result = await this.fxService.convertAmount({
      from: data.from,
      to: data.to,
      amount: data.amount,
    });

    return {
      original_amount: result.originalAmount,
      converted_amount: result.convertedAmount,
      from: result.from,
      to: result.to,
      rate: result.rate,
      timestamp: result.timestamp,
      source: result.source,
    };
  }

  @GrpcMethod('FxService', 'HealthCheck')
  async healthCheck(data: HealthCheckRequest) {
    const health = await this.fxService.getHealth();

    return {
      status: health.status,
      redis: health.redis,
      primary_circuit: {
        state: health.circuitBreakers.primary.state,
        stats: {
          failures: health.circuitBreakers.primary.stats.failures,
          successes: health.circuitBreakers.primary.stats.successes,
          timeouts: health.circuitBreakers.primary.stats.timeouts,
          fires: health.circuitBreakers.primary.stats.fires,
        },
      },
      secondary_circuit: {
        state: health.circuitBreakers.secondary.state,
        stats: {
          failures: health.circuitBreakers.secondary.stats.failures,
          successes: health.circuitBreakers.secondary.stats.successes,
          timeouts: health.circuitBreakers.secondary.stats.timeouts,
          fires: health.circuitBreakers.secondary.stats.fires,
        },
      },
    };
  }
}
