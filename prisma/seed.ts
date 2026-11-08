import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PILARES_MESTRES = [
  {
    id: 1,
    codigo: 'SAUDE',
    nome: 'Saúde',
    corHex: '#EF4444',
    corFundoHex: '#FEF2F2',
    icone: 'heart_pulse',
    descricao:
      'Práticas saudáveis diárias, nutrição, exames de rotina e consultas preventivas.',
  },
  {
    id: 2,
    codigo: 'MOVIMENTO',
    nome: 'Movimento',
    corHex: '#F97316',
    corFundoHex: '#FFF7ED',
    icone: 'activity',
    descricao:
      'Atividade física, meta semanal de treinos e consistência corporal.',
  },
  {
    id: 3,
    codigo: 'SONO',
    nome: 'Sono',
    corHex: '#6366F1',
    corFundoHex: '#EEF2FF',
    icone: 'moon',
    descricao:
      'Quantidade/qualidade de horas dormidas e higiene do sono sem telas.',
  },
  {
    id: 4,
    codigo: 'MENTE',
    nome: 'Mente',
    corHex: '#8B5CF6',
    corFundoHex: '#F5F3FF',
    icone: 'brain',
    descricao:
      'Meditação, diário de reflexão, pausas de descompressão, alongamento e hidratação.',
  },
  {
    id: 5,
    codigo: 'ESTUDOS',
    nome: 'Estudos',
    corHex: '#10B981',
    corFundoHex: '#ECFDF5',
    icone: 'book_open',
    descricao:
      'Leitura, cursos, projetos acadêmicos e aquisição de novos conhecimentos.',
  },
  {
    id: 6,
    codigo: 'FINANCAS',
    nome: 'Finanças',
    corHex: '#CA8A04',
    corFundoHex: '#FEFCE8',
    icone: 'wallet',
    descricao:
      'Controle manual de despesas recorrentes, orçamento e metas de investimento.',
  },
  {
    id: 7,
    codigo: 'CARREIRA',
    nome: 'Carreira',
    corHex: '#0EA5E9',
    corFundoHex: '#F0F9FF',
    icone: 'briefcase',
    descricao:
      'Projetos profissionais, entregas estratégicas e objetivos de longo prazo.',
  },
];

async function main(): Promise<void> {
  for (const pilar of PILARES_MESTRES) {
    await prisma.pilarVida.upsert({
      where: { id: pilar.id },
      update: {
        codigo: pilar.codigo,
        nome: pilar.nome,
        corHex: pilar.corHex,
        corFundoHex: pilar.corFundoHex,
        icone: pilar.icone,
        descricao: pilar.descricao,
      },
      create: pilar,
    });
  }
  console.log(`Seed concluído: ${PILARES_MESTRES.length} Pilares de Vida populados.`);
}

main()
  .catch((err) => {
    console.error('Erro ao executar seed dos Pilares de Vida:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
