import { Injectable } from '@nestjs/common';
import {
  CapacidadeDiaDto,
  FadigaMentalService,
} from '../painel/fadiga-mental.service';

export { CapacidadeDiaDto };

@Injectable()
export class CapacidadeService extends FadigaMentalService {}
