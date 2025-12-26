import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Transport } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';

interface ReceiptServiceClient {
  GenerateReceipt(req: any): any;
}

// Calcular rutas según el entorno
const receiptProtoPath =
  process.env.NODE_ENV === 'production'
    ? join(process.cwd(), 'contracts/proto/receipt/receipt.proto') // Docker: usar cwd()
    : join(__dirname, '../../../contracts/proto/receipt/receipt.proto'); // Local

const includeDir =
  process.env.NODE_ENV === 'production'
    ? join(process.cwd(), 'contracts/proto') // Docker: usar cwd()
    : join(__dirname, '../../../contracts/proto'); // Local

@Injectable()
export class ReceiptClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      url: 'receipt:50054',
      package: 'quetzalship.receipt.v1',
      protoPath: receiptProtoPath,
      loader: {
        keepCase: true,
        includeDirs: [includeDir],
      },
    },
  })
  private readonly client!: ClientGrpc;

  private svc!: ReceiptServiceClient;

  onModuleInit() {
    this.svc = this.client.getService<ReceiptServiceClient>('ReceiptService');
  }

  call<T = any>(payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const obs: any = this.svc.GenerateReceipt(payload);
      obs.subscribe({ next: resolve, error: reject });
    });
  }
}
