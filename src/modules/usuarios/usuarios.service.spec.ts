import { HttpStatus } from '@nestjs/common';
import { ProvedorOAuth } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsuariosService } from './usuarios.service';

describe('UsuariosService & UpdateProfileDto (E02-T02 — RF05, RNF07)', () => {
  let usuariosService: UsuariosService;
  let prismaMock: {
    usuario: {
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockUser = {
    id: 'uuid-user-1',
    nomeCompleto: 'Carolina Calinca',
    email: 'carolina@fatec.sp.gov.br',
    senhaHash: '$argon2id$secret',
    provedorOauth: ProvedorOAuth.LOCAL,
    oauthSubjectId: null,
    horasSonoDiarias: 8,
    onboardingConcluido: false,
    dataCadastro: new Date('2026-11-08T19:00:00.000Z'),
    updatedAt: new Date('2026-11-08T19:00:00.000Z'),
  };

  beforeEach(() => {
    prismaMock = {
      usuario: {
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    usuariosService = new UsuariosService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('Validação de UpdateProfileDto (RF05)', () => {
    it('deve aceitar horasSonoDiarias entre 4 e 12', async () => {
      const dto = plainToInstance(UpdateProfileDto, {
        nomeCompleto: 'Carolina Atualizada',
        horasSonoDiarias: 7,
        onboardingConcluido: true,
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar horasSonoDiarias menor que 4 ou maior que 12', async () => {
      const dtoBaixo = plainToInstance(UpdateProfileDto, {
        horasSonoDiarias: 3,
      });
      const dtoAlto = plainToInstance(UpdateProfileDto, {
        horasSonoDiarias: 14,
      });

      await expect(validate(dtoBaixo)).resolves.toHaveLength(1);
      await expect(validate(dtoAlto)).resolves.toHaveLength(1);
    });
  });

  describe('getMe', () => {
    it('deve retornar o perfil do usuário sem expor senhaHash', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(mockUser);

      const profile = await usuariosService.getMe('uuid-user-1');

      expect(profile).toEqual({
        id: mockUser.id,
        nomeCompleto: mockUser.nomeCompleto,
        email: mockUser.email,
        provedorOauth: mockUser.provedorOauth,
        horasSonoDiarias: 8,
        onboardingConcluido: false,
        dataCadastro: mockUser.dataCadastro,
        updatedAt: mockUser.updatedAt,
      });
      expect(
        (profile as unknown as Record<string, unknown>).senhaHash,
      ).toBeUndefined();
    });

    it('deve lançar 404 RESOURCE_NOT_FOUND se usuário não existir', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(null);

      await expect(usuariosService.getMe('inexistente')).rejects.toMatchObject({
        errorCode: 'RESOURCE_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('updateMe', () => {
    it('deve atualizar horasSonoDiarias e nomeCompleto', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(mockUser);
      prismaMock.usuario.update.mockResolvedValue({
        ...mockUser,
        nomeCompleto: 'Carolina FATEC',
        horasSonoDiarias: 7,
        onboardingConcluido: true,
      });

      const updated = await usuariosService.updateMe('uuid-user-1', {
        nomeCompleto: 'Carolina FATEC',
        horasSonoDiarias: 7,
        onboardingConcluido: true,
      });

      expect(updated.nomeCompleto).toBe('Carolina FATEC');
      expect(updated.horasSonoDiarias).toBe(7);
      expect(updated.onboardingConcluido).toBe(true);
    });
  });

  describe('deleteMe (LGPD — RNF07)', () => {
    it('deve excluir definitivamente o usuário no banco disparando ON DELETE CASCADE', async () => {
      prismaMock.usuario.findUnique.mockResolvedValue(mockUser);
      prismaMock.usuario.delete.mockResolvedValue(mockUser);

      const result = await usuariosService.deleteMe('uuid-user-1');

      expect(prismaMock.usuario.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-user-1' },
      });
      expect(result.message).toContain('LGPD');
    });
  });
});
