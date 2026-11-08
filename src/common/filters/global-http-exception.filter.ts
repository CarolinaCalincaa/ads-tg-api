import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException, ErrorCode } from '../exceptions/domain.exception';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: ErrorCode | string = 'INTERNAL_SERVER_ERROR';
    let message = 'Erro interno inesperado no servidor.';
    let details: Record<string, unknown> | string[] | null = null;

    if (exception instanceof DomainException) {
      statusCode = exception.getStatus();
      errorCode = exception.errorCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (typeof resObj.errorCode === 'string') {
          errorCode = resObj.errorCode;
        } else {
          errorCode = this.mapStatusToDefaultErrorCode(statusCode);
        }

        if (Array.isArray(resObj.message)) {
          errorCode = 'VALIDATION_ERROR';
          message = 'Falha na validação dos campos enviados.';
          details = resObj.message as string[];
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        }

        if (resObj.details !== undefined && details === null) {
          details = resObj.details as Record<string, unknown> | string[] | null;
        }
      } else if (typeof res === 'string') {
        errorCode = this.mapStatusToDefaultErrorCode(statusCode);
        message = res;
      }
    } else if (this.isPrismaRn01TriggerError(exception)) {
      statusCode = HttpStatus.UNPROCESSABLE_ENTITY;
      errorCode = 'MAX_ACTIVE_PILLARS_EXCEEDED';
      message = 'Selecione apenas 3 pilares por mês!';
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    }

    response.status(statusCode).json({
      statusCode,
      errorCode,
      message,
      details,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private mapStatusToDefaultErrorCode(status: number): ErrorCode | string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'TOKEN_EXPIRED_OR_INVALID';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'EMAIL_ALREADY_REGISTERED';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }

  private isPrismaRn01TriggerError(exception: unknown): boolean {
    if (typeof exception === 'object' && exception !== null) {
      const msg = String((exception as { message?: unknown }).message ?? '');
      return msg.includes('RN01_VIOLATION');
    }
    return false;
  }
}
