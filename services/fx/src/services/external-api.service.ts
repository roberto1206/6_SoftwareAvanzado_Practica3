import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import CircuitBreaker from 'opossum';
import { getFxConfig } from '../config/fx.config';

interface ExternalApiResponse {
  rate: number;
  base: string;
  quote: string;
}

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly config = getFxConfig();
  private readonly primaryClient: AxiosInstance;
  private readonly secondaryClient: AxiosInstance;
  private readonly primaryBreaker: CircuitBreaker;
  private readonly secondaryBreaker: CircuitBreaker;

  constructor() {
    // Initialize HTTP clients
    this.primaryClient = axios.create({
      baseURL: this.config.primaryApiUrl,
      timeout: this.config.timeout,
    });

    this.secondaryClient = axios.create({
      baseURL: this.config.secondaryApiUrl,
      timeout: this.config.timeout,
    });

    // Initialize circuit breakers
    this.primaryBreaker = new CircuitBreaker(
      this.callPrimaryApi.bind(this),
      {
        timeout: this.config.timeout,
        errorThresholdPercentage: this.config.circuitBreakerThreshold,
        resetTimeout: this.config.circuitBreakerResetTimeout,
      },
    );

    this.secondaryBreaker = new CircuitBreaker(
      this.callSecondaryApi.bind(this),
      {
        timeout: this.config.timeout,
        errorThresholdPercentage: this.config.circuitBreakerThreshold,
        resetTimeout: this.config.circuitBreakerResetTimeout,
      },
    );

    // Circuit breaker event listeners
    this.primaryBreaker.on('open', () => {
      this.logger.warn('Primary API circuit breaker opened');
    });

    this.primaryBreaker.on('halfOpen', () => {
      this.logger.log('Primary API circuit breaker half-open');
    });

    this.primaryBreaker.on('close', () => {
      this.logger.log('Primary API circuit breaker closed');
    });

    this.secondaryBreaker.on('open', () => {
      this.logger.warn('Secondary API circuit breaker opened');
    });

    this.secondaryBreaker.on('halfOpen', () => {
      this.logger.log('Secondary API circuit breaker half-open');
    });

    this.secondaryBreaker.on('close', () => {
      this.logger.log('Secondary API circuit breaker closed');
    });
  }

  private async callPrimaryApi(base: string, quote: string): Promise<ExternalApiResponse> {
    try {
      // exchangerate-api.com format: /v4/latest/{BASE}
      const response = await this.primaryClient.get(`/${base}`);
      
      if (!response.data || !response.data.rates || !response.data.rates[quote]) {
        throw new Error(`Quote ${quote} not found in primary API response`);
      }

      const rate = response.data.rates[quote];

      this.logger.debug(`Primary API: ${base}/${quote} = ${rate}`);

      return {
        rate,
        base,
        quote,
      };
    } catch (error) {
      this.logger.error(`Primary API error: ${error.message}`);
      throw error;
    }
  }

  private async callSecondaryApi(base: string, quote: string): Promise<ExternalApiResponse> {
    try {
      // frankfurter.app format: /latest?from={BASE}&to={QUOTE}
      const response = await this.secondaryClient.get('', {
        params: {
          from: base,
          to: quote,
        },
      });

      if (!response.data || !response.data.rates || !response.data.rates[quote]) {
        throw new Error(`Quote ${quote} not found in secondary API response`);
      }

      const rate = response.data.rates[quote];

      this.logger.debug(`Secondary API: ${base}/${quote} = ${rate}`);

      return {
        rate,
        base,
        quote,
      };
    } catch (error) {
      this.logger.error(`Secondary API error: ${error.message}`);
      throw error;
    }
  }

  async getExchangeRate(base: string, quote: string): Promise<ExternalApiResponse> {
    // Try primary API with retry and exponential backoff
    try {
      return await this.retryWithBackoff(
        () => this.primaryBreaker.fire(base, quote),
        'primary',
      );
    } catch (primaryError) {
      this.logger.warn(
        `Primary API failed after retries: ${primaryError.message}`,
      );

      // Fallback to secondary API with retry and exponential backoff
      try {
        return await this.retryWithBackoff(
          () => this.secondaryBreaker.fire(base, quote),
          'secondary',
        );
      } catch (secondaryError) {
        this.logger.error(
          `Secondary API also failed: ${secondaryError.message}`,
        );
        throw new Error('Both primary and secondary APIs failed');
      }
    }
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    apiName: string,
  ): Promise<T> {
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < this.config.retryAttempts - 1) {
          // Exponential backoff: delay * 2^attempt
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          this.logger.debug(
            `${apiName} API retry ${attempt + 1}/${this.config.retryAttempts} after ${delay}ms`,
          );
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getCircuitBreakerStats() {
    return {
      primary: {
        state: this.primaryBreaker.opened
          ? 'open'
          : this.primaryBreaker.halfOpen
            ? 'half-open'
            : 'closed',
        stats: this.primaryBreaker.stats,
      },
      secondary: {
        state: this.secondaryBreaker.opened
          ? 'open'
          : this.secondaryBreaker.halfOpen
            ? 'half-open'
            : 'closed',
        stats: this.secondaryBreaker.stats,
      },
    };
  }
}
