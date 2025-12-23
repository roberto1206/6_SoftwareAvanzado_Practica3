import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('/health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: 'Health check del Gateway',
    description: 'Verifica el estado del API Gateway',
  })
  @ApiResponse({
    status: 200,
    description: 'Gateway está funcionando correctamente',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
