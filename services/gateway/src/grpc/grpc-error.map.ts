import { HttpException, HttpStatus } from '@nestjs/common';

export function mapGrpcToHttp(e: any): never {
  const code = e?.code;
  const message = e?.details || e?.message || 'Internal error';

  // Códigos grpc-js:
  // 3 INVALID_ARGUMENT
  // 5 NOT_FOUND
  // 9 FAILED_PRECONDITION
  // 14 UNAVAILABLE
  // 4 DEADLINE_EXCEEDED
  if (code === 3) throw new HttpException({ error: 'Bad Request', message }, HttpStatus.BAD_REQUEST);
  if (code === 5) throw new HttpException({ error: 'Not Found', message }, HttpStatus.NOT_FOUND);
  if (code === 9) throw new HttpException({ error: 'Conflict', message }, HttpStatus.CONFLICT);
  if (code === 14) throw new HttpException({ error: 'Service Unavailable', message }, HttpStatus.SERVICE_UNAVAILABLE);
  if (code === 4) throw new HttpException({ error: 'Gateway Timeout', message }, HttpStatus.GATEWAY_TIMEOUT);

  throw new HttpException({ error: 'Internal Server Error', message }, HttpStatus.INTERNAL_SERVER_ERROR);
}
