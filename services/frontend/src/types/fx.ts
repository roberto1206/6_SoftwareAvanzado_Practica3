// src/types/fx.ts

export interface FxRateResponse {
  base: string;
  quote: string;
  rate: number;
  timestamp: string;
  source: string;
}

export interface FxConvertRequest {
  from: string;
  to: string;
  amount: number;
}

export interface FxConvertResponse {
  original_amount: number;
  converted_amount: number;
  from: string;
  to: string;
  rate: number;
  timestamp: string;
  source: string;
}
