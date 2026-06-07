import { MovimentoCaixa, CategoriaFinanceira, GrupoDRE, ContaReceber, ContaPagar } from '@/types';

/**
 * Cálculo do DRE (Demonstração do Resultado do Exercício) a partir de dados reais.
 *
 * Dois regimes:
 *  - CAIXA: usa movimentos_caixa (dinheiro que efetivamente entrou/saiu).
 *  - COMPETÊNCIA: usa as parcelas das contas (fato gerador), independente do pagamento.
 *
 * O agrupamento é feito pela categoria financeira (grupoDRE). Movimentos/contas
 * sem categoria caem em grupos default conforme o tipo (entrada→receita_bruta,
 * saída→despesa_operacional).
 */

export type RegimeDRE = 'caixa' | 'competencia';

export interface LinhaGrupoDRE {
  grupo: GrupoDRE;
  total: number;
  porCategoria: { categoriaId: string; categoriaNome: string; total: number }[];
}

export interface ResultadoDRE {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  cmv: number;
  lucroBruto: number;
  despesasOperacionais: number;
  despesasPessoal: number;
  despesasFinanceiras: number;
  outrasReceitas: number;
  lucroOperacional: number;
  lucroLiquido: number;
  margemBruta: number;
  margemOperacional: number;
  margemLiquida: number;
  grupos: Record<GrupoDRE, LinhaGrupoDRE>;
}

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function dentroDoPeriodo(data: Date | null, inicio: Date, fim: Date): boolean {
  if (!data) return false;
  return data >= inicio && data <= fim;
}

function grupoVazio(grupo: GrupoDRE): LinhaGrupoDRE {
  return { grupo, total: 0, porCategoria: [] };
}

function inicializarGrupos(): Record<GrupoDRE, LinhaGrupoDRE> {
  return {
    receita_bruta: grupoVazio('receita_bruta'),
    deducoes: grupoVazio('deducoes'),
    cmv: grupoVazio('cmv'),
    despesa_operacional: grupoVazio('despesa_operacional'),
    despesa_pessoal: grupoVazio('despesa_pessoal'),
    despesa_financeira: grupoVazio('despesa_financeira'),
    outras_receitas: grupoVazio('outras_receitas'),
    nao_operacional: grupoVazio('nao_operacional'),
  };
}

function acumular(
  grupos: Record<GrupoDRE, LinhaGrupoDRE>,
  grupo: GrupoDRE,
  categoriaId: string,
  categoriaNome: string,
  valor: number
) {
  const g = grupos[grupo];
  g.total += valor;
  const existente = g.porCategoria.find((c) => c.categoriaId === categoriaId);
  if (existente) {
    existente.total += valor;
  } else {
    g.porCategoria.push({ categoriaId, categoriaNome, total: valor });
  }
}

/**
 * Calcula o DRE pelo regime de CAIXA (movimentos_caixa).
 */
export function calcularDRECaixa(
  movimentos: MovimentoCaixa[],
  categorias: CategoriaFinanceira[],
  inicio: Date,
  fim: Date
): ResultadoDRE {
  const grupos = inicializarGrupos();
  const catMap = new Map(categorias.map((c) => [c.id, c]));

  for (const mov of movimentos) {
    if (mov.origemTipo === 'transferencia') continue; // transferências não afetam resultado
    const data = toDate(mov.data);
    if (!dentroDoPeriodo(data, inicio, fim)) continue;

    const cat = mov.categoriaId ? catMap.get(mov.categoriaId) : undefined;
    let grupo: GrupoDRE;
    if (cat) {
      grupo = cat.grupoDRE;
    } else {
      grupo = mov.tipo === 'entrada' ? 'receita_bruta' : 'despesa_operacional';
    }
    const nome = cat?.nome || (mov.tipo === 'entrada' ? 'Outras Entradas' : 'Outras Saídas');
    acumular(grupos, grupo, mov.categoriaId || 'sem_categoria', nome, mov.valor);
  }

  return consolidar(grupos);
}

/**
 * Calcula o DRE pelo regime de COMPETÊNCIA (parcelas das contas pelo vencimento/competência).
 */
export function calcularDRECompetencia(
  contasReceber: ContaReceber[],
  contasPagar: ContaPagar[],
  categorias: CategoriaFinanceira[],
  inicio: Date,
  fim: Date
): ResultadoDRE {
  const grupos = inicializarGrupos();
  const catMap = new Map(categorias.map((c) => [c.id, c]));

  // Receitas (contas a receber).
  for (const conta of contasReceber) {
    const cat = conta.categoriaId ? catMap.get(conta.categoriaId) : undefined;
    const grupo: GrupoDRE = cat?.grupoDRE || 'receita_bruta';
    const nome = cat?.nome || 'Vendas';
    for (const p of conta.parcelas || []) {
      const data = toDate(conta.dataCompetencia) || toDate(p.vencimento);
      if (!dentroDoPeriodo(data, inicio, fim)) continue;
      acumular(grupos, grupo, conta.categoriaId || 'sem_categoria', nome, p.valor);
    }
  }

  // Despesas (contas a pagar).
  for (const conta of contasPagar) {
    const cat = conta.categoriaId ? catMap.get(conta.categoriaId) : undefined;
    const grupo: GrupoDRE = cat?.grupoDRE || 'despesa_operacional';
    const nome = cat?.nome || 'Despesas';
    for (const p of conta.parcelas || []) {
      const data = toDate(conta.dataCompetencia) || toDate(p.vencimento);
      if (!dentroDoPeriodo(data, inicio, fim)) continue;
      acumular(grupos, grupo, conta.categoriaId || 'sem_categoria', nome, p.valor);
    }
  }

  return consolidar(grupos);
}

function consolidar(grupos: Record<GrupoDRE, LinhaGrupoDRE>): ResultadoDRE {
  const receitaBruta = grupos.receita_bruta.total;
  const deducoes = grupos.deducoes.total;
  const receitaLiquida = receitaBruta - deducoes;
  const cmv = grupos.cmv.total;
  const lucroBruto = receitaLiquida - cmv;
  const despesasOperacionais = grupos.despesa_operacional.total;
  const despesasPessoal = grupos.despesa_pessoal.total;
  const despesasFinanceiras = grupos.despesa_financeira.total;
  const outrasReceitas = grupos.outras_receitas.total;
  const lucroOperacional =
    lucroBruto - despesasOperacionais - despesasPessoal + outrasReceitas;
  const lucroLiquido = lucroOperacional - despesasFinanceiras;

  const pct = (v: number) => (receitaLiquida > 0 ? (v / receitaLiquida) * 100 : 0);

  return {
    receitaBruta,
    deducoes,
    receitaLiquida,
    cmv,
    lucroBruto,
    despesasOperacionais,
    despesasPessoal,
    despesasFinanceiras,
    outrasReceitas,
    lucroOperacional,
    lucroLiquido,
    margemBruta: pct(lucroBruto),
    margemOperacional: pct(lucroOperacional),
    margemLiquida: pct(lucroLiquido),
    grupos,
  };
}

/**
 * Retorna o intervalo [inicio, fim] de um período relativo a uma data base.
 */
export function intervaloPeriodo(
  periodo: 'mes' | 'trimestre' | 'ano',
  base: Date = new Date()
): { inicio: Date; fim: Date } {
  const ano = base.getFullYear();
  const mes = base.getMonth();
  if (periodo === 'ano') {
    return {
      inicio: new Date(ano, 0, 1, 0, 0, 0),
      fim: new Date(ano, 11, 31, 23, 59, 59),
    };
  }
  if (periodo === 'trimestre') {
    const trimestreInicio = Math.floor(mes / 3) * 3;
    return {
      inicio: new Date(ano, trimestreInicio, 1, 0, 0, 0),
      fim: new Date(ano, trimestreInicio + 3, 0, 23, 59, 59),
    };
  }
  // mês
  return {
    inicio: new Date(ano, mes, 1, 0, 0, 0),
    fim: new Date(ano, mes + 1, 0, 23, 59, 59),
  };
}
