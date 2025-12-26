export interface ExchangeRateResponse {
  base: string;
  quote: string;
  rate: number;
  timestamp: Date;
  source: 'primary' | 'secondary' | 'cache' | 'stale-cache';
}

export interface ConvertAmountRequest {
  amount: number;
  from: string;
  to: string;
}

export interface ConvertAmountResponse {
  originalAmount: number;
  convertedAmount: number;
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: 'primary' | 'secondary' | 'cache' | 'stale-cache';
}

export interface CachedRate {
  rate: number;
  timestamp: Date;
  source: 'primary' | 'secondary';
}
