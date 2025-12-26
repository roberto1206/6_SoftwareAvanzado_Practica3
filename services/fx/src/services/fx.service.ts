import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ExternalApiService } from './external-api.service';
import {
  ExchangeRateResponse,
  ConvertAmountRequest,
  ConvertAmountResponse,
} from '../interfaces/fx.interface';

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly externalApiService: ExternalApiService,
  ) {}

  /**
   * Get exchange rate between two currencies with full resilience:
   * 1. Try cache
   * 2. Try primary API
   * 3. Try secondary API (fallback)
   * 4. Try stale cache
   * 5. Fail gracefully
   */
  async getExchangeRate(
    base: string,
    quote: string,
  ): Promise<ExchangeRateResponse> {
    const baseUpper = base.toUpperCase();
    const quoteUpper = quote.toUpperCase();

    this.logger.log(`Getting exchange rate: ${baseUpper}/${quoteUpper}`);

    // Step 1: Try cache first
    const cached = await this.redisService.getCachedRate(baseUpper, quoteUpper);
    if (cached) {
      return {
        base: baseUpper,
        quote: quoteUpper,
        rate: cached.rate,
        timestamp: cached.timestamp,
        source: 'cache',
      };
    }

    // Step 2 & 3: Try external APIs (primary -> secondary)
    try {
      const externalRate = await this.externalApiService.getExchangeRate(
        baseUpper,
        quoteUpper,
      );

      // Cache the fresh rate
      await this.redisService.setCachedRate(
        baseUpper,
        quoteUpper,
        externalRate.rate,
        'primary', // Could be improved to detect which API was used
      );

      return {
        base: baseUpper,
        quote: quoteUpper,
        rate: externalRate.rate,
        timestamp: new Date(),
        source: 'primary',
      };
    } catch (externalError) {
      this.logger.error(
        `External APIs failed: ${externalError.message}`,
      );

      // Step 4: Try stale cache as last resort
      const staleCache = await this.redisService.getStaleRate(
        baseUpper,
        quoteUpper,
      );

      if (staleCache) {
        this.logger.warn(
          `Using stale cache for ${baseUpper}/${quoteUpper}`,
        );
        return {
          base: baseUpper,
          quote: quoteUpper,
          rate: staleCache.rate,
          timestamp: staleCache.timestamp,
          source: 'stale-cache',
        };
      }

      // Step 5: Fail gracefully
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Exchange rate service temporarily unavailable',
          error: 'Service Unavailable',
          details: 'All providers failed and no cached data available',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    request: ConvertAmountRequest,
  ): Promise<ConvertAmountResponse> {
    const { amount, from, to } = request;

    if (amount <= 0) {
      throw new HttpException(
        'Amount must be greater than 0',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(`Converting ${amount} ${from} to ${to}`);

    const exchangeRate = await this.getExchangeRate(from, to);
    const convertedAmount = amount * exchangeRate.rate;

    return {
      originalAmount: amount,
      convertedAmount: parseFloat(convertedAmount.toFixed(2)),
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: exchangeRate.rate,
      timestamp: exchangeRate.timestamp,
      source: exchangeRate.source,
    };
  }

  /**
   * Get service health including circuit breaker status
   */
  async getHealth() {
    const redisHealthy = await this.redisService.healthCheck();
    const circuitBreakerStats = this.externalApiService.getCircuitBreakerStats();

    return {
      status: redisHealthy ? 'healthy' : 'degraded',
      redis: redisHealthy ? 'connected' : 'disconnected',
      circuitBreakers: circuitBreakerStats,
      timestamp: new Date(),
    };
  }
}
