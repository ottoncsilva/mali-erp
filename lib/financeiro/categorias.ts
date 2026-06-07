import { CategoriaFinanceira, GrupoDRE, TipoCategoriaFinanceira } from '@/types';

/**
 * Categorias financeiras padrão (plano de contas).
 * Semeadas na primeira abertura da página de Categorias Financeiras.
 */
export const CATEGORIAS_PADRAO: CategoriaFinanceira[] = [
  // RECEITAS
  {
    id: 'receita_vendas',
    nome: 'Vendas de Produtos',
    tipo: 'receita',
    grupoDRE: 'receita_bruta',
    sistema: true,
  },
  {
    id: 'receita_servicos',
    nome: 'Vendas de Serviços',
    tipo: 'receita',
    grupoDRE: 'receita_bruta',
    sistema: true,
  },
  {
    id: 'desconto_concedido',
    nome: 'Descontos Concedidos',
    tipo: 'despesa',
    grupoDRE: 'deducoes',
    sistema: true,
  },
  {
    id: 'imposto_venda',
    nome: 'Impostos sobre Venda',
    tipo: 'despesa',
    grupoDRE: 'deducoes',
    sistema: true,
  },
  {
    id: 'devolucao_vendas',
    nome: 'Devoluções de Vendas',
    tipo: 'despesa',
    grupoDRE: 'deducoes',
    sistema: true,
  },

  // CMV
  {
    id: 'cmv',
    nome: 'Custo de Mercadorias Vendidas',
    tipo: 'despesa',
    grupoDRE: 'cmv',
    sistema: true,
  },

  // DESPESAS OPERACIONAIS
  {
    id: 'aluguel',
    nome: 'Aluguel',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },
  {
    id: 'energia_agua',
    nome: 'Energia e Água',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },
  {
    id: 'telefone_internet',
    nome: 'Telefone e Internet',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },
  {
    id: 'manutencao_reparo',
    nome: 'Manutenção e Reparo',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },
  {
    id: 'marketing_publicidade',
    nome: 'Marketing e Publicidade',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },
  {
    id: 'material_escritorio',
    nome: 'Material de Escritório',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },
  {
    id: 'combustivel_transporte',
    nome: 'Combustível e Transporte',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },
  {
    id: 'despesa_legal',
    nome: 'Taxas e Despesas Legais',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
    sistema: true,
  },

  // DESPESAS PESSOAL
  {
    id: 'salarios',
    nome: 'Salários',
    tipo: 'despesa',
    grupoDRE: 'despesa_pessoal',
    sistema: true,
  },
  {
    id: 'comissoes_vendedor',
    nome: 'Comissões - Vendedores',
    tipo: 'despesa',
    grupoDRE: 'despesa_pessoal',
    sistema: true,
  },
  {
    id: 'comissoes_gerencia',
    nome: 'Comissões - Gerência',
    tipo: 'despesa',
    grupoDRE: 'despesa_pessoal',
    sistema: true,
  },
  {
    id: 'encargos_sociais',
    nome: 'Encargos Sociais (FGTS, INSS)',
    tipo: 'despesa',
    grupoDRE: 'despesa_pessoal',
    sistema: true,
  },

  // DESPESAS FINANCEIRAS
  {
    id: 'juros_pagar',
    nome: 'Juros a Pagar',
    tipo: 'despesa',
    grupoDRE: 'despesa_financeira',
    sistema: true,
  },
  {
    id: 'juros_receber',
    nome: 'Juros a Receber',
    tipo: 'receita',
    grupoDRE: 'outras_receitas',
    sistema: true,
  },
  {
    id: 'multa_pagar',
    nome: 'Multas a Pagar',
    tipo: 'despesa',
    grupoDRE: 'despesa_financeira',
    sistema: true,
  },
  {
    id: 'tarifa_bancaria',
    nome: 'Tarifas Bancárias',
    tipo: 'despesa',
    grupoDRE: 'despesa_financeira',
    sistema: true,
  },

  // NÃO-OPERACIONAL (fora do resultado)
  {
    id: 'aporte_capital',
    nome: 'Aportes de Capital',
    tipo: 'receita',
    grupoDRE: 'nao_operacional',
    sistema: true,
  },
  {
    id: 'retirada_lucros',
    nome: 'Retirada de Lucros',
    tipo: 'despesa',
    grupoDRE: 'nao_operacional',
    sistema: true,
  },
  {
    id: 'investimento_fixo',
    nome: 'Investimento em Ativo Fixo',
    tipo: 'despesa',
    grupoDRE: 'nao_operacional',
    sistema: true,
  },
];

export const CATEGORIA_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIAS_PADRAO.map((c) => [c.id, c.nome])
);

export const GRUPO_DRE_LABEL: Record<GrupoDRE, string> = {
  receita_bruta: 'Receita Bruta',
  deducoes: 'Deduções',
  cmv: 'Custo de Mercadorias Vendidas',
  despesa_operacional: 'Despesas Operacionais',
  despesa_pessoal: 'Despesas com Pessoal',
  despesa_financeira: 'Despesas Financeiras',
  outras_receitas: 'Outras Receitas',
  nao_operacional: 'Operações Não-Operacionais',
};

/**
 * Popula a coleção `categorias_financeiras` com as categorias padrão.
 * Idempotente: não sobrescreve se já existirem.
 */
export async function seedCategoriasSeVazio(): Promise<boolean> {
  try {
    const { collection, getDocs, doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase/config');

    const snap = await getDocs(collection(db, 'categorias_financeiras'));
    if (!snap.empty) return false;

    await Promise.all(
      CATEGORIAS_PADRAO.map((c) =>
        setDoc(doc(db, 'categorias_financeiras', c.id), {
          ...c,
          ativo: true,
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        })
      )
    );
    return true;
  } catch (err) {
    console.error('[seedCategoriasSeVazio]', err);
    return false;
  }
}
