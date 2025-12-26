import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersClient } from '../grpc/orders.client';
import { ReceiptClient } from '../grpc/receipt.client';
import { CreateOrderDto } from '../dto/order.dto';
import { mapGrpcToHttp } from '../grpc/grpc-error.map';

@ApiTags('orders')
@Controller('/v1/orders')
export class OrdersRestController {
  constructor(
    private readonly orders: OrdersClient,
    private readonly receipt: ReceiptClient,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear una nueva orden de envío',
    description: 'Crea una nueva orden de envío en el sistema',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Clave para garantizar idempotencia en la creación de órdenes',
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiResponse({
    status: 201,
    description: 'Orden creada exitosamente',
    schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string', example: 'ORD-20231214-001' },
        status: { type: 'string', example: 'ORDER_STATUS_ACTIVE' },
        created_at: { type: 'string', example: '2023-12-14T10:30:00Z' },
        breakdown: {
          type: 'object',
          properties: {
            order_billable_kg: { type: 'number', example: 5.8 },
            base_subtotal: { type: 'number', example: 46.4 },
            service_subtotal: { type: 'number', example: 62.64 },
            fragile_surcharge: { type: 'number', example: 7 },
            insurance_surcharge: { type: 'number', example: 12.5 },
            subtotal_with_surcharges: { type: 'number', example: 82.14 },
            discount_amount: { type: 'number', example: 8.21 },
            total: { type: 'number', example: 73.93 },
          },
        },
        total: { type: 'number', example: 73.93 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Solicitud inválida - validación fallida',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Bad Request' },
        message: { type: 'string', example: 'El campo weight_kg debe ser mayor a 0' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - Idempotency-Key con payload diferente',
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio no disponible - dependencia interna falló',
  })
  @ApiResponse({
    status: 504,
    description: 'Gateway Timeout - dependencia interna no respondió a tiempo',
  })
  async create(
    @Body() body: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    try {
      const res = await this.orders.call('CreateOrder', {
        ...body,
        idempotency_key: idempotencyKey ?? '',
      });
      return res;
    } catch (e: any) {
      mapGrpcToHttp(e);
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas las órdenes',
    description: 'Obtiene una lista paginada de órdenes',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    type: Number,
    description: 'Cantidad de órdenes por página (default: 20, máximo: 100)',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'CANCELLED'],
    description: 'Filtrar por estado de orden',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de órdenes recuperada exitosamente',
    schema: {
      type: 'object',
      properties: {
        orders: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              order_id: { type: 'string' },
              destination_zone: { type: 'string' },
              service_type: { type: 'string' },
              status: { type: 'string' },
              total: { type: 'number' },
              created_at: { type: 'string' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            page_size: { type: 'number' },
            total_items: { type: 'number' },
            total_pages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Parámetros de consulta inválidos',
  })
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: 'ACTIVE' | 'CANCELLED',
  ) {
    try {
      const payload: any = {
        page: page ? Number(page) : 1,
        page_size: pageSize ? Number(pageSize) : 20,
      };

      // Mapear status REST a enum grpc
      if (status === 'ACTIVE') payload.status = 'ORDER_STATUS_ACTIVE';
      if (status === 'CANCELLED') payload.status = 'ORDER_STATUS_CANCELLED';

      return await this.orders.call('ListOrders', payload);
    } catch (e: any) {
      mapGrpcToHttp(e);
    }
  }

  @Get(':orderId')
  @ApiOperation({
    summary: 'Obtener detalle completo de una orden',
    description: 'Obtiene toda la información de una orden específica',
  })
  @ApiParam({
    name: 'orderId',
    type: String,
    description: 'ID único de la orden',
    example: 'ORD-20231214-001',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la orden recuperado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden no encontrada',
  })
  async get(@Param('orderId') orderId: string) {
    try {
      return await this.orders.call('GetOrder', { order_id: orderId });
    } catch (e: any) {
      mapGrpcToHttp(e);
    }
  }

  @Post(':orderId/cancel')
  @ApiOperation({
    summary: 'Cancelar una orden existente',
    description: 'Cancela una orden que está activa',
  })
  @ApiParam({
    name: 'orderId',
    type: String,
    description: 'ID único de la orden a cancelar',
  })
  @ApiResponse({
    status: 200,
    description: 'Orden cancelada exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflicto - orden ya está cancelada',
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio no disponible',
  })
  async cancel(@Param('orderId') orderId: string) {
    try {
      return await this.orders.call('CancelOrder', { order_id: orderId });
    } catch (e: any) {
      mapGrpcToHttp(e);
    }
  }

  @Get(':orderId/receipt')
  @ApiOperation({
    summary: 'Generar recibo de una orden',
    description: 'Genera el recibo detallado de una orden',
  })
  @ApiParam({
    name: 'orderId',
    type: String,
    description: 'ID único de la orden',
  })
  @ApiResponse({
    status: 200,
    description: 'Recibo generado exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Orden no encontrada',
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio de recibos no disponible',
  })
  async getReceipt(@Param('orderId') orderId: string) {
    try {
      return await this.receipt.call({ order_id: orderId });
    } catch (e: any) {
      mapGrpcToHttp(e);
    }
  }
}