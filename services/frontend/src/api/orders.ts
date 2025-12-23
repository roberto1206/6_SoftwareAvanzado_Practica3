import apiClient from './client';
import { 
  transformCreateOrderRequestToBackend, 
  transformOrderFromBackend 
} from './mappers';
import type { 
  CreateOrderRequest, 
  CreateOrderResponse, 
  Order, 
  OrderSummary,
  Zone,
  ServiceType,
  Status
} from '../types/orders';

// Funciones de mapeo reutilizadas del mapper
function mapZoneFromBackend(zone: string | number): Zone {
  if (typeof zone === 'number') {
    switch (zone) {
      case 1: return 'METRO';
      case 2: return 'INTERIOR';
      case 3: return 'FRONTERA';
      default: return 'METRO';
    }
  }
  return zone.replace('ZONE_', '') as Zone;
}

function mapServiceTypeFromBackend(serviceType: string | number): ServiceType {
  if (typeof serviceType === 'number') {
    switch (serviceType) {
      case 1: return 'STANDARD';
      case 2: return 'EXPRESS';
      case 3: return 'SAME_DAY';
      default: return 'STANDARD';
    }
  }
  return serviceType.replace('SERVICE_TYPE_', '') as ServiceType;
}

function mapStatusFromBackend(status: string | number): Status {
  if (typeof status === 'number') {
    switch (status) {
      case 1: return 'ACTIVE';
      case 2: return 'CANCELLED';
      default: return 'ACTIVE';
    }
  }
  return status as Status;
}

// Generar una clave de idempotencia única
export const generateIdempotencyKey = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const ordersApi = {
  // POST /v1/orders - Crear orden
  createOrder: async (
    orderData: CreateOrderRequest,
    idempotencyKey?: string
  ): Promise<CreateOrderResponse> => {
    try {
      const headers = idempotencyKey 
        ? { 'Idempotency-Key': idempotencyKey }
        : {};
      
      const backendRequest = transformCreateOrderRequestToBackend(orderData);
      console.log('[API] Enviando orden al backend:', backendRequest);
      console.log('[API] Headers:', headers);
      
      const response = await apiClient.post(
        '/v1/orders',
        backendRequest,
        { headers }
      );
      
      console.log('[API] Respuesta del backend:', response.data);
      
      const backendOrder = response.data;
      const order = transformOrderFromBackend(backendOrder);
      
      return {
        orderId: order.orderId,
        status: order.status,
        createdAt: order.createdAt,
        breakdown: order.breakdown,
        total: order.total,
      };
    } catch (error: any) {
      console.error('[API] Error al crear orden:', error);
      console.error('[API] Error details:', error.response?.data);
      throw error;
    }
  },

  // GET /v1/orders - Listar órdenes
  listOrders: async (): Promise<OrderSummary[]> => {
    try {
      console.log('[API] Solicitando listado de órdenes...');
      const response = await apiClient.get('/v1/orders');
      console.log('[API] Respuesta recibida completa:', JSON.stringify(response.data, null, 2));
      console.log('[API] Tipo de respuesta:', typeof response.data);
      console.log('[API] Es array?', Array.isArray(response.data));
      console.log('[API] Keys del objeto:', Object.keys(response.data));
      
      // El backend puede devolver las órdenes en diferentes formatos
      let backendOrders = response.data;
      
      // Si es un objeto con una propiedad "orders" o similar, extraerla
      if (!Array.isArray(backendOrders)) {
        console.log('[API] La respuesta no es un array, buscando propiedad de órdenes...');
        if (backendOrders.orders) {
          backendOrders = backendOrders.orders;
        } else if (backendOrders.data) {
          backendOrders = backendOrders.data;
        } else {
          // Puede ser una sola orden, convertirla a array
          backendOrders = [backendOrders];
        }
      }
      
      // Si la respuesta es un array vacío, retornarlo directamente
      if (!backendOrders || backendOrders.length === 0) {
        console.log('[API] No hay órdenes en el sistema');
        return [];
      }
      
      return backendOrders.map((backendOrder: any): OrderSummary => {
        // El listado solo tiene campos básicos, transformarlos directamente
        return {
          orderId: backendOrder.order_id,
          destinationZone: mapZoneFromBackend(backendOrder.destination_zone),
          serviceType: mapServiceTypeFromBackend(backendOrder.service_type),
          status: mapStatusFromBackend(backendOrder.status),
          total: backendOrder.total,
        };
      });
    } catch (error: any) {
      console.error('[API] Error al listar órdenes:', error);
      console.error('[API] Error details:', error.response?.data);
      throw error;
    }
  },

  // GET /v1/orders/{orderId} - Obtener detalle
  getOrderDetail: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get(`/v1/orders/${orderId}`);
    return transformOrderFromBackend(response.data);
  },

  // POST /v1/orders/{orderId}/cancel - Cancelar orden
  cancelOrder: async (orderId: string): Promise<Order> => {
    const response = await apiClient.post(
      `/v1/orders/${orderId}/cancel`
    );
    return transformOrderFromBackend(response.data);
  },

  // GET /v1/orders/{orderId}/receipt - Obtener recibo
  getReceipt: async (orderId: string): Promise<Order> => {
    const response = await apiClient.get(
      `/v1/orders/${orderId}/receipt`
    );
    return transformOrderFromBackend(response.data);
  },
};