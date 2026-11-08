import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DomainException } from '../../common/exceptions/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioProfileResponseDto } from '../auth/dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(idUsuario: string): Promise<UsuarioProfileResponseDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: idUsuario },
    });

    if (!usuario) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Usuário não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      id: usuario.id,
      nomeCompleto: usuario.nomeCompleto,
      email: usuario.email,
      provedorOauth: usuario.provedorOauth,
      horasSonoDiarias: usuario.horasSonoDiarias,
      onboardingConcluido: usuario.onboardingConcluido,
      dataCadastro: usuario.dataCadastro,
      updatedAt: usuario.updatedAt,
    };
  }

  async updateMe(
    idUsuario: string,
    dto: UpdateProfileDto,
  ): Promise<UsuarioProfileResponseDto> {
    const existente = await this.prisma.usuario.findUnique({
      where: { id: idUsuario },
    });

    if (!existente) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Usuário não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const data: Prisma.UsuarioUpdateInput = {};

    if (dto.nomeCompleto !== undefined) {
      data.nomeCompleto = dto.nomeCompleto.trim();
    }
    if (dto.horasSonoDiarias !== undefined) {
      data.horasSonoDiarias = dto.horasSonoDiarias;
    }
    if (dto.onboardingConcluido !== undefined) {
      data.onboardingConcluido = dto.onboardingConcluido;
    }

    const atualizado = await this.prisma.usuario.update({
      where: { id: idUsuario },
      data,
    });

    return {
      id: atualizado.id,
      nomeCompleto: atualizado.nomeCompleto,
      email: atualizado.email,
      provedorOauth: atualizado.provedorOauth,
      horasSonoDiarias: atualizado.horasSonoDiarias,
      onboardingConcluido: atualizado.onboardingConcluido,
      dataCadastro: atualizado.dataCadastro,
      updatedAt: atualizado.updatedAt,
    };
  }

  async deleteMe(idUsuario: string): Promise<{ message: string }> {
    const existente = await this.prisma.usuario.findUnique({
      where: { id: idUsuario },
    });

    if (!existente) {
      throw new DomainException(
        {
          errorCode: 'RESOURCE_NOT_FOUND',
          message: 'Usuário não encontrado.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.usuario.delete({
      where: { id: idUsuario },
    });

    return {
      message:
        'Conta e todos os dados associados foram excluídos permanentemente (LGPD — RNF07).',
    };
  }
}
