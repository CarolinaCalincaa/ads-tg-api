import { HttpException, HttpStatus } from '@nestjs/common';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED_OR_INVALID'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'RESET_TOKEN_INVALID'
  | 'MAX_ACTIVE_PILLARS_EXCEEDED'
  | 'MENTAL_FATIGUE_LIMIT_EXCEEDED'
  | 'RESOURCE_NOT_FOUND'
  | 'INTERNAL_SERVER_ERROR';

export interface DomainExceptionPayload {
  errorCode: ErrorCode;
  message: string;
  details?: Record<string, unknown> | string[] | null;
}

export class DomainException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly details: Record<string, unknown> | string[] | null;

  constructor(
    payload: DomainExceptionPayload,
    status: HttpStatus = HttpStatus.UNPROCESSABLE_ENTITY,
  ) {
    super(
      {
        errorCode: payload.errorCode,
        message: payload.message,
        details: payload.details ?? null,
      },
      status,
    );
    this.errorCode = payload.errorCode;
    this.details = payload.details ?? null;
  }

  static maxActivePillarsExceeded(
    details?: Record<string, unknown>,
  ): DomainException {
    return new DomainException(
      {
        errorCode: 'MAX_ACTIVE_PILLARS_EXCEEDED',
        message: 'Selecione apenas 3 pilares por mês!',
        details: details ?? null,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  static mentalFatigueLimitExceeded(
    details: Record<string, unknown>,
  ): DomainException {
    return new DomainException(
      {
        errorCode: 'MENTAL_FATIGUE_LIMIT_EXCEEDED',
        message: 'Limite de horas atingido, reagende a atividade.',
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
