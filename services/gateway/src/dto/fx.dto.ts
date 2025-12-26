import { ApiProperty } from '@nestjs/swagger';

export class FxRateResponseDto {
  @ApiProperty() base: string;
  @ApiProperty() quote: string;
  @ApiProperty() rate: number;
  @ApiProperty() timestamp: string;
  @ApiProperty() source: string;
}

export class FxConvertRequestDto {
  @ApiProperty({ example: 'USD' }) from: string;
  @ApiProperty({ example: 'GTQ' }) to: string;
  @ApiProperty({ example: 100 }) amount: number;
}

export class FxConvertResponseDto {
  @ApiProperty() original_amount: number;
  @ApiProperty() converted_amount: number;
  @ApiProperty() from: string;
  @ApiProperty() to: string;
  @ApiProperty() rate: number;
  @ApiProperty() timestamp: string;
  @ApiProperty() source: string;
}

export class FxHealthResponseDto {
  @ApiProperty() status: string;
  @ApiProperty() redis: string;
  @ApiProperty({ required: false }) primary_circuit?: any;
  @ApiProperty({ required: false }) secondary_circuit?: any;
}
