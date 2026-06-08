import { Cargo, Usuario } from '@/types';
import { BaseComissao, BASE_COMISSAO_LABEL } from '@/lib/auth';

/**
 * Engenharia de comissão de venda.
 *
 * Regras (definidas com o cliente):
 * - Comissão NÃO altera o preço — apenas gera contas a pagar aos envolvidos.
 * - Regras fixas POR CARGO (sem seleção manual na venda):
 *     • modo `vendedor`  → paga ao colaborador que FECHOU a venda (se for deste cargo).
 *     • modo `override`  → paga a TODOS os colaboradores ativos do cargo (ex.: gerente
 *       ganha um % sobre todas as vendas).
 * - O percentual vem do cargo (padrão) e pode ser sobrescrito por colaborador.
 * - A base de cálculo (forma de remuneração) é definida por cargo.
 */

export interface ValoresVenda {
  /** Preço à vista líquido (com desconto). */
  vista: number;
  /** Valor total da proposta (com juros do parcelamento). */
  proposta: number;
  /** CMV total dos itens (para base "margem"). */
  cmv: number;
}

export interface ComissaoCalculada {
  colaboradorId: string;
  colaboradorNome: string;
  cargoId: string;
  cargoNome: string;
  pct: number;
  base: BaseComissao;
  baseLabel: string;
  baseValor: number;
  valor: number;
}

function valorDaBase(base: BaseComissao, v: ValoresVenda): number {
  switch (base) {
    case 'proposta':
      return v.proposta;
    case 'margem':
      return Math.max(0, v.vista - v.cmv);
    case 'vista':
    default:
      return v.vista;
  }
}

interface ParamsCalculo {
  vendedorId: string | undefined;
  cargos: (Cargo & { id: string })[];
  colaboradores: (Usuario & { id: string })[];
  valores: ValoresVenda;
}

export function calcularComissoesVenda({
  vendedorId,
  cargos,
  colaboradores,
  valores,
}: ParamsCalculo): ComissaoCalculada[] {
  const resultados: ComissaoCalculada[] = [];
  const vistos = new Set<string>();
  const cargoPorId = new Map(cargos.map((c) => [c.id, c]));

  const adicionar = (colab: Usuario & { id: string }, cargo: Cargo & { id: string }) => {
    if (vistos.has(colab.id)) return;
    const pct = typeof colab.comissaoPct === 'number' ? colab.comissaoPct : cargo.comissaoPct;
    if (!pct || pct <= 0) return;
    const base = cargo.baseComissao;
    const baseValor = valorDaBase(base, valores);
    // Arredonda para 2 casas — evita dízimas (R$ 73,3333) na conta a pagar.
    const valor = Math.round(((baseValor * pct) / 100) * 100) / 100;
    if (valor <= 0) return;
    vistos.add(colab.id);
    resultados.push({
      colaboradorId: colab.id,
      colaboradorNome: colab.nome,
      cargoId: cargo.id,
      cargoNome: cargo.nome,
      pct,
      base,
      baseLabel: BASE_COMISSAO_LABEL[base],
      baseValor,
      valor,
    });
  };

  // 1) Vendedor que fechou a venda (recebe pelo seu próprio cargo).
  if (vendedorId) {
    const vendedor = colaboradores.find((c) => c.id === vendedorId);
    const cargo = vendedor ? cargoPorId.get(vendedor.perfil) : undefined;
    if (vendedor && cargo && cargo.comissaoAtiva) {
      adicionar(vendedor, cargo);
    }
  }

  // 2) Overrides: todos os colaboradores ativos de cargos com modo "override".
  for (const cargo of cargos) {
    if (!cargo.comissaoAtiva || cargo.modoComissao !== 'override') continue;
    for (const colab of colaboradores) {
      if (colab.perfil === cargo.id && colab.ativo !== false) {
        adicionar(colab, cargo);
      }
    }
  }

  return resultados;
}

export function totalComissoes(comissoes: ComissaoCalculada[]): number {
  return comissoes.reduce((s, c) => s + c.valor, 0);
}
