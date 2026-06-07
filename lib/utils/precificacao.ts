// Motor de precificação e pontuação (fonte única de cálculo).
//
// Fluxo, por item:
//   1. CMV unitário      = custo + icms + ipi + frete
//   2. Preço à vista     = CMV × pontuação (especial do produto OU padrão da loja)
//   3. Subtotal à vista  = Σ (preço à vista × qtd)
//   4. Desconto global % aplicado sobre o preço à vista  →  VISTA líquido
//   5. Fator da condição = converte VISTA → PROPOSTA (Tabela Price)
//   6. PROPOSTA          = VISTA líquido × fator
//   7. Parcelas          = proposta distribuída (com entrada editável)
//
// Pontuação = Preço à vista ÷ CMV (markup; ex.: 2.0 = preço dobro do custo).

import { Produto, CondicaoPagamentoConfig } from '@/types';

export interface ItemCarrinho {
  produtoId: string;
  produto: Produto & { id: string };
  quantidade: number;
  precoAplicado: number; // preço à vista UNITÁRIO aplicado (antes do desconto global)
  desconto: number; // reservado (desconto por item em reais) — não usado no fluxo % global
  // Modalidade de fornecimento na venda:
  // 'estoque' = baixa do estoque disponível; 'encomenda' = dispara pedido de compra.
  modalidade?: 'estoque' | 'encomenda';
}

// ===================== CÁLCULO BASE (PRODUTO) =====================

/** CMV de um produto: custo + ICMS + IPI + frete (por unidade). */
export function calcularCMV(produto: Produto): number {
  return produto.custoProduto + produto.icms + produto.ipi + produto.frete;
}

/** Pontuação aplicável ao produto (especial do produto OU padrão da loja). */
export function pontuacaoDoProduto(produto: Produto, pontuacaoPadrao: number): number {
  return produto.tipoPontuacao === 'especial'
    ? produto.pontuacaoEspecial ?? pontuacaoPadrao
    : pontuacaoPadrao;
}

/** Preço à vista UNITÁRIO de tabela = CMV × pontuação. */
export function calcularPrecoTabela(produto: Produto, pontuacaoPadrao: number): number {
  return calcularCMV(produto) * pontuacaoDoProduto(produto, pontuacaoPadrao);
}

/** Pontuação real = preço à vista ÷ CMV (markup efetivo). */
export function calcularPontuacaoReal(precoVista: number, cmv: number): number {
  if (cmv === 0) return 0;
  return precoVista / cmv;
}

// ===================== RESUMO DO CARRINHO (À VISTA) =====================

export interface ItemResumo {
  produtoId: string;
  nome: string;
  qtd: number;
  cmvUnitario: number;
  precoVistaUnitario: number; // de tabela (CMV × pontuação)
  precoVistaTotal: number; // unitário × qtd, já com desconto global aplicado
  pontuacao: number; // preço (com desconto) ÷ CMV
}

export interface ResumoCarrinho {
  subtotalVista: number; // soma à vista SEM desconto
  descontoPercentual: number; // 0..100
  valorDescontos: number; // subtotal − vistaLiquido
  vistaLiquido: number; // total à vista COM desconto
  cmvTotal: number;
  pontuacaoMedia: number; // vistaLiquido ÷ cmvTotal
  itens: ItemResumo[];
}

/**
 * Resume o carrinho à vista, aplicando o desconto global percentual
 * proporcionalmente a todos os itens (sobre o preço de tabela).
 */
export function resumirCarrinho(
  itens: ItemCarrinho[],
  pontuacaoPadrao: number,
  descontoPercentual: number = 0
): ResumoCarrinho {
  const fatorDesc = 1 - (descontoPercentual || 0) / 100;
  let subtotalVista = 0;
  let vistaLiquido = 0;
  let cmvTotal = 0;
  const itensResumo: ItemResumo[] = [];

  itens.forEach((item) => {
    const cmv = calcularCMV(item.produto);
    const precoVistaUnit = item.precoAplicado; // já é CMV × pontuação ao adicionar
    const totalTabela = precoVistaUnit * item.quantidade;
    const totalLiquido = totalTabela * fatorDesc;
    const cmvItem = cmv * item.quantidade;

    subtotalVista += totalTabela;
    vistaLiquido += totalLiquido;
    cmvTotal += cmvItem;

    itensResumo.push({
      produtoId: item.produtoId,
      nome: item.produto.nome,
      qtd: item.quantidade,
      cmvUnitario: cmv,
      precoVistaUnitario: precoVistaUnit,
      precoVistaTotal: totalLiquido,
      pontuacao: calcularPontuacaoReal(precoVistaUnit * fatorDesc, cmv),
    });
  });

  return {
    subtotalVista,
    descontoPercentual: descontoPercentual || 0,
    valorDescontos: subtotalVista - vistaLiquido,
    vistaLiquido,
    cmvTotal,
    pontuacaoMedia: cmvTotal > 0 ? vistaLiquido / cmvTotal : 0,
    itens: itensResumo,
  };
}

// ===================== TABELA PRICE (CONDIÇÕES) =====================

/**
 * Coeficiente de financiamento (Tabela Price) para um valor presente unitário.
 * coef = i(1+i)ⁿ / [(1+i)ⁿ − 1]. Multiplicado por n dá o fator total/PV.
 */
export function coefPrice(taxaMensal: number, n: number): number {
  if (n <= 0) return 1;
  if (taxaMensal <= 0) return 1 / n;
  const fator = Math.pow(1 + taxaMensal, n);
  return (taxaMensal * fator) / (fator - 1);
}

/**
 * Fator que converte VISTA → PROPOSTA para uma condição.
 * À vista = 1 (sem juros). Parcelado/entrada = juros compostos sobre N parcelas.
 */
export function fatorCondicao(condicao: CondicaoPagamentoConfig, taxaMensal: number): number {
  if (condicao.tipo === 'avista' || condicao.parcelas <= 0) return 1;
  return coefPrice(taxaMensal, condicao.parcelas) * condicao.parcelas;
}

/** Soma N meses a uma data (mantendo o dia quando possível). */
export function addMeses(data: Date, meses: number): Date {
  const d = new Date(data);
  const dia = d.getDate();
  d.setMonth(d.getMonth() + meses);
  if (d.getDate() < dia) d.setDate(0); // ajusta meses mais curtos
  return d;
}

export interface PlanoParcela {
  numero: number;
  valor: number;
  vencimento: Date;
}

export interface ResultadoCondicao {
  condicaoId: string;
  condicaoNome: string;
  tipo: CondicaoPagamentoConfig['tipo'];
  vistaLiquido: number; // base à vista (com desconto)
  proposta: number; // total com juros
  juros: number; // proposta − vistaLiquido
  entrada: number; // valor da entrada (0 se não houver)
  parcelas: PlanoParcela[]; // parcelas APÓS a entrada
}

/**
 * Gera o plano de pagamento de uma condição a partir do valor à vista líquido.
 *
 * - À vista: 1 pagamento hoje, sem juros.
 * - Parcelado Nx: N parcelas iguais (proposta ÷ N), a partir de +1 mês.
 * - Entrada + Nx: entrada hoje (default = proposta ÷ (N+1)) + N parcelas iguais
 *   com o restante. A entrada é editável (`entradaManual`) e redistribui o
 *   restante igualmente entre as N parcelas.
 */
export function gerarPlanoPagamento(
  vistaLiquido: number,
  condicao: CondicaoPagamentoConfig,
  taxaMensal: number,
  opts: { entradaManual?: number; dataBase?: Date } = {}
): ResultadoCondicao {
  const dataBase = opts.dataBase ?? new Date();
  const proposta = vistaLiquido * fatorCondicao(condicao, taxaMensal);
  const base = {
    condicaoId: condicao.id,
    condicaoNome: condicao.nome,
    tipo: condicao.tipo,
    vistaLiquido,
    proposta,
    juros: proposta - vistaLiquido,
  };

  // À vista: paga hoje.
  if (condicao.tipo === 'avista' || condicao.parcelas <= 0) {
    return {
      ...base,
      entrada: 0,
      parcelas: [{ numero: 1, valor: proposta, vencimento: dataBase }],
    };
  }

  const n = condicao.parcelas;

  // Entrada + Nx: entrada hoje + N parcelas mensais.
  if (condicao.tipo === 'entrada_parcelado' || condicao.temEntrada) {
    const entradaPadrao = proposta / (n + 1);
    let entrada = opts.entradaManual ?? entradaPadrao;
    entrada = Math.max(0, Math.min(entrada, proposta)); // limita entre 0 e proposta
    const valorParcela = (proposta - entrada) / n;
    const parcelas: PlanoParcela[] = [];
    for (let i = 1; i <= n; i++) {
      parcelas.push({ numero: i, valor: valorParcela, vencimento: addMeses(dataBase, i) });
    }
    return { ...base, entrada, parcelas };
  }

  // Parcelado Nx (sem entrada): N parcelas iguais a partir de +1 mês.
  const valorParcela = proposta / n;
  const parcelas: PlanoParcela[] = [];
  for (let i = 1; i <= n; i++) {
    parcelas.push({ numero: i, valor: valorParcela, vencimento: addMeses(dataBase, i) });
  }
  return { ...base, entrada: 0, parcelas };
}

// ===================== TRAVAS DE NEGOCIAÇÃO =====================

/** Valida se a pontuação média respeita o limite do perfil. */
export function validarTravaNegociacao(
  pontuacaoMedia: number,
  limitePerfil: number
): { valido: boolean; motivo?: string } {
  if (pontuacaoMedia < limitePerfil) {
    return {
      valido: false,
      motivo: `Pontuação de ${pontuacaoMedia.toFixed(2)} está abaixo do limite (${limitePerfil}) para seu perfil. Solicite aprovação de quem tem maior limite.`,
    };
  }
  return { valido: true };
}

// ===================== CONDIÇÕES PADRÃO (AUTO-SEED) =====================

/**
 * Conjunto inicial de condições de pagamento, criado quando a loja ainda
 * não tem nenhuma cadastrada: À Vista, 1x→12x, Entrada + 1x→12x.
 */
export function condicoesPadrao(): CondicaoPagamentoConfig[] {
  const lista: CondicaoPagamentoConfig[] = [
    { id: 'avista', nome: 'À Vista', tipo: 'avista', parcelas: 1, temEntrada: false, ativo: true, ordem: 0 },
  ];
  for (let n = 1; n <= 12; n++) {
    lista.push({
      id: `${n}x`,
      nome: `${n}x`,
      tipo: 'parcelado',
      parcelas: n,
      temEntrada: false,
      ativo: true,
      ordem: n,
    });
  }
  for (let n = 1; n <= 12; n++) {
    lista.push({
      id: `e${n}`,
      nome: `Entrada + ${n}x`,
      tipo: 'entrada_parcelado',
      parcelas: n,
      temEntrada: true,
      ativo: true,
      ordem: 100 + n,
    });
  }
  return lista;
}
