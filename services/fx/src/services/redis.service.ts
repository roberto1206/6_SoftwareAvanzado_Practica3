import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { getFxConfig } from '../config/fx.config';
import { CachedRate } from '../interfaces/fx.interface';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private readonly config = getFxConfig();

  async onModuleInit() {
    this.client = new Redis({
      host: this.config.redisHost,
      port: this.config.redisPort,
      password: this.config.redisPassword,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.client.on('error', (err) => {
      this.logger.error('Redis client error', err);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  private getCacheKey(base: string, quote: string): string {
    return `fx:${base.toUpperCase()}:${quote.toUpperCase()}`;
  }

  async getCachedRate(base: string, quote: string): Promise<CachedRate | null> {
    try {
      const key = this.getCacheKey(base, quote);
      const cached = await this.client.get(key);
      
      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);
      this.logger.debug(`Cache hit for ${base}/${quote}`);
      return data;
    } catch (error) {
      this.logger.error('Error getting cached rate', error);
      return null;
    }
  }

  async setCachedRate(
    base: string,
    quote: string,
    rate: number,
    source: 'primary' | 'secondary',
  ): Promise<void> {
    try {
      const key = this.getCacheKey(base, quote);
      const data: CachedRate = {
        rate,
        timestamp: new Date(),
        source,
      };

      await this.client.setex(
        key,
        this.config.redisTtl,
        JSON.stringify(data),
      );

      this.logger.debug(`Cached rate for ${base}/${quote}: ${rate} (TTL: ${this.config.redisTtl}s)`);
    } catch (error) {
      this.logger.error('Error setting cached rate', error);
    }
  }

  async getStaleRate(base: string, quote: string): Promise<CachedRate | null> {
    try {
      const key = this.getCacheKey(base, quote);
      // Try to get even expired keys (stale data)
      const cached = await this.client.get(key);
      
      if (!cached) {
        // If not in cache with TTL, check if we have it without TTL
        return null;
      }

      const data = JSON.parse(cached);
      this.logger.warn(`Using stale cache for ${base}/${quote}`);
      return data;
    } catch (error) {
      this.logger.error('Error getting stale rate', error);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      this.logger.error('Redis health check failed', error);
      return false;
    }
  }
}
