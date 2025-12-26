import { HttpStatus } from '@nestjs/common';
import { FxController } from './controllers/fx.controller'; // ajusta la ruta si está distinto
import { FxService } from './services/fx.service';

describe('FxController', () => {
  let controller: FxController;

  const fxServiceMock: Partial<Record<keyof FxService, jest.Mock>> = {
    getHealth: jest.fn(),
    getExchangeRate: jest.fn(),
    convertAmount: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FxController(fxServiceMock as unknown as FxService);
  });

  it('GET rate: si falta base o quote retorna BAD_REQUEST y NO llama al service', async () => {
    // falta quote
    const res1 = await controller.getExchangeRate('USD', '');
    expect(res1).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Both base and quote parameters are required',
    });
    expect(fxServiceMock.getExchangeRate).not.toHaveBeenCalled();

    // falta base
    const res2 = await controller.getExchangeRate('', 'GTQ');
    expect(res2).toEqual({
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Both base and quote parameters are required',
    });
    expect(fxServiceMock.getExchangeRate).not.toHaveBeenCalled();
  });

  it('POST convert: delega en FxService.convertAmount y retorna su respuesta', async () => {
    const req = {
      base: 'USD',
      quote: 'GTQ',
      amount: 100,
    };

    (fxServiceMock.convertAmount as jest.Mock).mockResolvedValue({
      base: 'USD',
      quote: 'GTQ',
      amount: 100,
      rate: 7.8,
      converted: 780,
    });

    const res = await controller.convertAmount(req as any);

    expect(fxServiceMock.convertAmount).toHaveBeenCalledTimes(1);
    expect(fxServiceMock.convertAmount).toHaveBeenCalledWith(req);
    expect(res).toEqual({
      base: 'USD',
      quote: 'GTQ',
      amount: 100,
      rate: 7.8,
      converted: 780,
    });
  });
});
