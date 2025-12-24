export interface FxConfig {
  // Primary API provider
  primaryApiUrl: string;
  primaryApiKey: string;

  // Secondary API provider (fallback)
  secondaryApiUrl: string;
  secondaryApiKey: string;

  // Redis configuration
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  redisTtl: number; // TTL in seconds

  // Resilience configuration
  timeout: number; // Request timeout in milliseconds
  retryAttempts: number;
  retryDelay: number; // Initial delay for exponential backoff
  
  // Circuit breaker configuration
  circuitBreakerThreshold: number; // Error percentage to open circuit
  circuitBreakerTimeout: number; // Time before attempting to close circuit
  circuitBreakerResetTimeout: number; // Time before resetting error count
}

export const getFxConfig = (): FxConfig => ({
  // Primary: exchangerate-api.com (free tier)
  primaryApiUrl: process.env.FX_PRIMARY_API_URL || 'https://api.exchangerate-api.com/v4/latest',
  primaryApiKey: process.env.FX_PRIMARY_API_KEY || '',

  // Secondary: frankfurter.app (free, no key required)
  secondaryApiUrl: process.env.FX_SECONDARY_API_URL || 'https://api.frankfurter.app/latest',
  secondaryApiKey: process.env.FX_SECONDARY_API_KEY || '',

  // Redis
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),
  redisPassword: process.env.REDIS_PASSWORD,
  redisTtl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour default

  // Resilience
  timeout: parseInt(process.env.FX_TIMEOUT || '5000', 10), // 5 seconds
  retryAttempts: parseInt(process.env.FX_RETRY_ATTEMPTS || '3', 10),
  retryDelay: parseInt(process.env.FX_RETRY_DELAY || '1000', 10), // 1 second

  // Circuit Breaker
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '50', 10), // 50% error rate
  circuitBreakerTimeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT || '60000', 10), // 1 minute
  circuitBreakerResetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '30000', 10), // 30 seconds
});
