export type Zone = 'METRO' | 'INTERIOR' | 'FRONTERA';
export type ServiceType = 'STANDARD' | 'EXPRESS' | 'SAME_DAY';
export type Status = 'ACTIVE' | 'CANCELLED';
export type DiscountType = 'NONE' | 'PERCENT' | 'FIXED';

export interface Package {
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  fragile: boolean;
  declaredValueQ: number;
}

export interface Discount {
  type: DiscountType;
  value: number;
}

export interface Breakdown {
  orderBillableKg: number;
  baseSubtotal: number;
  serviceSubtotal: number;
  fragileSurcharge: number;
  insuranceSurcharge: number;
  subtotalWithSurcharges: number;
  discount: number;
}

export interface Order {
  orderId: string;
  createdAt: string;
  originZone: Zone;
  destinationZone: Zone;
  serviceType: ServiceType;
  packages: Package[];
  discount?: Discount;
  insuranceEnabled: boolean;
  status: Status;
  breakdown: Breakdown;
  total: number;
}

export interface CreateOrderRequest {
  originZone: Zone;
  destinationZone: Zone;
  serviceType: ServiceType;
  packages: Package[];
  discount?: Discount;
  insuranceEnabled: boolean;
}

export interface CreateOrderResponse {
  orderId: string;
  status: Status;
  createdAt: string;
  breakdown: Breakdown;
  total: number;
}

export interface OrderSummary {
  orderId: string;
  destinationZone: Zone;
  serviceType: ServiceType;
  status: Status;
  total: number;
}