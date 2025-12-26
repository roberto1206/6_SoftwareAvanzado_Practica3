import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum Zone {
  ZONE_METRO = 'ZONE_METRO',
  ZONE_INTERIOR = 'ZONE_INTERIOR',
  ZONE_FRONTERA = 'ZONE_FRONTERA',
}

export enum ServiceType {
  SERVICE_TYPE_STANDARD = 'SERVICE_TYPE_STANDARD',
  SERVICE_TYPE_EXPRESS = 'SERVICE_TYPE_EXPRESS',
  SERVICE_TYPE_SAME_DAY = 'SERVICE_TYPE_SAME_DAY',
}

export enum DiscountType {
  DISCOUNT_TYPE_NONE = 'DISCOUNT_TYPE_NONE',
  DISCOUNT_TYPE_PERCENT = 'DISCOUNT_TYPE_PERCENT',
  DISCOUNT_TYPE_FIXED = 'DISCOUNT_TYPE_FIXED',
}

export class PackageDto {
  @ApiProperty({
    description: 'Peso del paquete en kilogramos',
    example: 2.5,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.000001)
  weight_kg!: number;

  @ApiProperty({
    description: 'Alto del paquete en centímetros',
    example: 30,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.000001)
  height_cm!: number;

  @ApiProperty({
    description: 'Ancho del paquete en centímetros',
    example: 20,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.000001)
  width_cm!: number;

  @ApiProperty({
    description: 'Largo del paquete en centímetros',
    example: 40,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.000001)
  length_cm!: number;

  @ApiProperty({
    description: 'Indica si el paquete es frágil',
    example: false,
  })
  @IsBoolean()
  fragile!: boolean;

  @ApiProperty({
    description: 'Valor declarado del paquete en quetzales',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  declared_value_q!: number;
}

export class DiscountDto {
  @ApiProperty({
    description: 'Tipo de descuento aplicado',
    enum: DiscountType,
    example: DiscountType.DISCOUNT_TYPE_PERCENT,
  })
  @IsEnum(DiscountType)
  type!: DiscountType;

  @ApiProperty({
    description: 'Valor del descuento (porcentaje 0-35 o monto fijo)',
    example: 10,
    minimum: 0,
    maximum: 35,
  })
  @IsNumber()
  @Min(0)
  value!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'Zona geográfica de origen',
    enum: Zone,
    example: Zone.ZONE_METRO,
  })
  @IsEnum(Zone)
  origin_zone!: Zone;

  @ApiProperty({
    description: 'Zona geográfica de destino',
    enum: Zone,
    example: Zone.ZONE_INTERIOR,
  })
  @IsEnum(Zone)
  destination_zone!: Zone;

  @ApiProperty({
    description: 'Tipo de servicio de envío',
    enum: ServiceType,
    example: ServiceType.SERVICE_TYPE_STANDARD,
  })
  @IsEnum(ServiceType)
  service_type!: ServiceType;

  @ApiProperty({
    description: 'Lista de paquetes (mínimo 1)',
    type: [PackageDto],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  packages!: PackageDto[];

  @ApiPropertyOptional({
    description: 'Descuento opcional',
    type: DiscountDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DiscountDto)
  discount?: DiscountDto;

  @ApiProperty({
    description: 'Indica si se requiere seguro',
    example: true,
  })
  @IsBoolean()
  insurance_enabled!: boolean;
}