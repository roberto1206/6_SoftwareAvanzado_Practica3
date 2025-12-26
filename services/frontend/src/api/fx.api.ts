// src/api/fx.api.ts
import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

export const fxApi = {
  async getRate(base: string, quote: string) {
    const { data } = await axios.get(`${API_BASE_URL}/fx/rate`, {
      params: { base, quote },
    });
    return data as { base: string; quote: string; rate: number; timestamp: string; source: string };
  },
};
