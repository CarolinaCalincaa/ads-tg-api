import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { DomainException } from '../exceptions/domain.exception';
import { GlobalHttpExceptionFilter } from './global-http-exception.filter';

describe('GlobalHttpExceptionFilter', () => {
  let filter: GlobalHttpExceptionFilter;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalHttpExceptionFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => ({ status: mockStatus }),
        getRequest: () => ({ url: '/api/v1/pilares/ativos/2026-10-01', method: 'PUT' }),
      }),
    } as unknown as ArgumentsHost;
  });

  it('deve formatar DomainException RN01 no envelope padronizado', () => {
    const exception = DomainException.maxActivePillarsExceeded({ mesAno: '2026-10-01' });

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        errorCode: 'MAX_ACTIVE_PILLARS_EXCEEDED',
        message: 'Selecione apenas 3 pilares por mês!',
        details: { mesAno: '2026-10-01' },
        path: '/api/v1/pilares/ativos/2026-10-01',
        timestamp: expect.any(String),
      }),
    );
  });

  it('deve formatar DomainException RN02 no envelope padronizado', () => {
    const exception = DomainException.mentalFatigueLimitExceeded({
      percentualOcupacao: 82,
    });

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        errorCode: 'MENTAL_FATIGUE_LIMIT_EXCEEDED',
        message: 'Limite de horas atingido, reagende a atividade.',
        details: { percentualOcupacao: 82 },
      }),
    );
  });

  it('deve traduzir BadRequestException com lista de erros do ValidationPipe para VALIDATION_ERROR', () => {
    const exception = new BadRequestException(['email deve ser um e-mail válido']);

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        errorCode: 'VALIDATION_ERROR',
        message: 'Falha na validação dos campos enviados.',
        details: ['email deve ser um e-mail válido'],
      }),
    );
  });

  it('deve traduzir NotFoundException para RESOURCE_NOT_FOUND', () => {
    const exception = new NotFoundException('Tarefa não encontrada.');

    filter.catch(exception, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: 'RESOURCE_NOT_FOUND',
        message: 'Tarefa não encontrada.',
        details: null,
      }),
    );
  });

  it('deve interceptar erro da trigger SQL RN01_VIOLATION e retornar 422 MAX_ACTIVE_PILLARS_EXCEEDED', () => {
    const dbTriggerError = new Error(
      'Invalid `prisma.pilarAtivoMes.create()` invocation: RN01_VIOLATION: Selecione apenas 3 pilares por mês!',
    );

    filter.catch(dbTriggerError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        errorCode: 'MAX_ACTIVE_PILLARS_EXCEEDED',
        message: 'Selecione apenas 3 pilares por mês!',
      }),
    );
  });
});
