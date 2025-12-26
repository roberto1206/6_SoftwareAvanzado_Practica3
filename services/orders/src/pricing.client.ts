import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Transport } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';

interface CalculatePricingRequest {
  origin_zone: any;
  destination_zone: any;
  service_type: any;
  packages: any[];
  discount?: any;
  insurance_enabled: boolean;
}

interface CalculatePricingResponse {
  breakdown: any;
  total: number;
}

interface PricingServiceClient {
  CalculatePricing(req: CalculatePricingRequest): any; // Observable<CalculatePricingResponse>
}

// Calcular la ruta del proto según el entorno
const pricingProtoPath =
  process.env.NODE_ENV === 'production'
    ? join(__dirname, '../contracts/proto/pricing/pricing.proto') // Docker: 1 nivel arriba
    : join(__dirname, '../../../contracts/proto/pricing/pricing.proto'); // Local: 3 niveles arriba

@Injectable()
export class PricingClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      url: 'pricing:50052', // en docker-compose este será el nombre del servicio
      package: 'quetzalship.pricing.v1',
      protoPath: pricingProtoPath,
      loader: { keepCase: true },
    },
  })
  private readonly client!: ClientGrpc;

  private pricingService!: PricingServiceClient;

  onModuleInit() {
    this.pricingService = this.client.getService('PricingService');
  }

  async calculatePricing(
    payload: CalculatePricingRequest,
  ): Promise<CalculatePricingResponse> {
    // Convertimos Observable a Promise sin meter RxJS extra
    return await new Promise((resolve, reject) => {
      const obs = this.pricingService.CalculatePricing(payload);
      obs.subscribe({
        next: (v: CalculatePricingResponse) => resolve(v),
        error: (e: any) => reject(e),
      });
    });
  }
}