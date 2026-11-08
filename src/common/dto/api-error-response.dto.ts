import { ApiProperty } from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode: number;

  @ApiProperty({ example: 'MENTAL_FATIGUE_LIMIT_EXCEEDED' })
  errorCode: string;

  @ApiProperty({ example: 'Limite de horas atingido, reagende a atividade.' })
  message: string;

  @ApiProperty({ required: false, nullable: true })
  details: Record<string, unknown> | string[] | null;

  @ApiProperty({ example: '2026-10-15T14:20:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/api/v1/tarefas' })
  path: string;
}
