// Motor de precificação e pontuação (fonte única de cálculo).
//
// Fluxo, por item:
//   1. CMV unitário        = custo + icms + ipi + frete
//   2. Preço à vista base   = CMV × pontuação (especial do produto OU padrão da loja)
//   3. Subtotal à vista     = Σ (preço à vista base × qtd)
//   4. Desconto global %     aplicado sobre o preço à vista  →  VISTA base líquido
//   5. Comissão do especificador: VISTA com comissão = VISTA base ÷ (1 − comissão%)
//      (assim, depois de pagar a comissão, a loja retém o VISTA base).
//   6. Fator da condição     = converte VISTA → PROPOSTA (Tabela Price)
//   7. PROPOSTA              = entrada (à vista, sem juros) + saldo financiado × fator
//   8. Parcelas              = proposta distribuída (com entrada editável)
//
// Pontuação = Preço à vista base ÷ CMV (markup da LOJA; a comissão é repassada
// ao especificador e não altera a pontuação da loja).

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
  precoVistaUnitario: number; // de tabela (CMV × pontuação), antes do desconto
  precoVistaTotal: number; // unitário × qtd, com desconto + comissão (à vista final)
  pontuacao: number; // preço base (com desconto) ÷ CMV — markup da loja
}

export interface ResumoCarrinho {
  subtotalVista: number; // soma à vista SEM desconto (base de tabela)
  descontoPercentual: number; // 0..100
  valorDescontos: number; // subtotal − vistaBaseLiquido
  vistaBaseLiquido: number; // total à vista COM desconto, SEM comissão (loja retém)
  comissaoPercentual: number; // 0..100
  comissaoValor: number; // R$ adicionado para cobrir a comissão
  vistaLiquido: number; // total à vista COM desconto E comissão (cliente paga à vista)
  cmvTotal: number;
  pontuacaoMedia: number; // vistaBaseLiquido ÷ cmvTotal (markup da loja)
  itens: ItemResumo[];
}

/** Fator de comissão: 1 / (1 − c%). Garante que a loja retenha o valor base. */
export function fatorComissao(comissaoPercentual: number): number {
  const c = Math.max(0, Math.min(99.9, comissaoPercentual || 0)) / 100;
  return 1 / (1 - c);
}

/**
 * Resume o carrinho à vista, aplicando o desconto global percentual
 * proporcionalmente a todos os itens (sobre o preço de tabela) e, em seguida,
 * o markup da comissão do especificador.
 */
export function resumirCarrinho(
  itens: ItemCarrinho[],
  pontuacaoPadrao: number,
  descontoPercentual: number = 0,
  comissaoPercentual: number = 0
): ResumoCarrinho {
  const fatorDesc = 1 - (descontoPercentual || 0) / 100;
  const fatorCom = fatorComissao(comissaoPercentual);
  let subtotalVista = 0;
  let vistaBaseLiquido = 0;
  let cmvTotal = 0;
  const itensResumo: ItemResumo[] = [];

  itens.forEach((item) => {
    const cmv = calcularCMV(item.produto);
    const precoVistaUnit = item.precoAplicado; // já é CMV × pontuação ao adicionar
    const totalTabela = precoVistaUnit * item.quantidade;
    const totalBaseLiquido = totalTabela * fatorDesc;
    const cmvItem = cmv * item.quantidade;

    subtotalVista += totalTabela;
    vistaBaseLiquido += totalBaseLiquido;
    cmvTotal += cmvItem;

    itensResumo.push({
      produtoId: item.produtoId,
      nome: item.produto.nome,
      qtd: item.quantidade,
      cmvUnitario: cmv,
      precoVistaUnitario: precoVistaUnit,
      // valor à vista final (com comissão) para que a soma das linhas bata com o total
      precoVistaTotal: totalBaseLiquido * fatorCom,
      pontuacao: calcularPontuacaoReal(precoVistaUnit * fatorDesc, cmv),
    });
  });

  const vistaLiquido = vistaBaseLiquido * fatorCom;

  return {
    subtotalVista,
    descontoPercentual: descontoPercentual || 0,
    valorDescontos: subtotalVista - vistaBaseLiquido,
    vistaBaseLiquido,
    comissaoPercentual: comissaoPercentual || 0,
    comissaoValor: vistaLiquido - vistaBaseLiquido,
    vistaLiquido,
    cmvTotal,
    pontuacaoMedia: cmvTotal > 0 ? vistaBaseLiquido / cmvTotal : 0,
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
 * - Parcelado Nx: juros sobre todo o valor; N parcelas iguais a partir de +1 mês.
 * - Entrada + Nx: a ENTRADA é paga hoje à vista (SEM juros). Apenas o saldo
 *   (vistaLiquido − entrada) é financiado com juros (Tabela Price) em N parcelas.
 *   Alterar a entrada reduz o saldo financiado e, portanto, o total da proposta.
 *   A entrada é editável (`entradaManual`, em valor à vista).
 */
export function gerarPlanoPagamento(
  vistaLiquido: number,
  condicao: CondicaoPagamentoConfig,
  taxaMensal: number,
  opts: { entradaManual?: number; dataBase?: Date } = {}
): ResultadoCondicao {
  const dataBase = opts.dataBase ?? new Date();
  const n = condicao.parcelas;
  const temEntrada = condicao.tipo === 'entrada_parcelado' || condicao.temEntrada;

  // À vista: paga hoje, sem juros.
  if (condicao.tipo === 'avista' || n <= 0) {
    return {
      condicaoId: condicao.id,
      condicaoNome: condicao.nome,
      tipo: condicao.tipo,
      vistaLiquido,
      proposta: vistaLiquido,
      juros: 0,
      entrada: 0,
      parcelas: [{ numero: 1, valor: vistaLiquido, vencimento: dataBase }],
    };
  }

  // Entrada + Nx: entrada à vista (sem juros) + saldo financiado com juros.
  if (temEntrada) {
    const entradaPadrao = vistaLiquido / (n + 1); // valor à vista
    let entrada = opts.entradaManual ?? entradaPadrao;
    entrada = Math.max(0, Math.min(entrada, vistaLiquido));
    const baseFinanciada = vistaLiquido - entrada; // à vista, sem juros
    const totalParcelado = baseFinanciada * coefPrice(taxaMensal, n) * n; // com juros
    const proposta = entrada + totalParcelado;
    const valorParcela = totalParcelado / n;
    const parcelas: PlanoParcela[] = [];
    for (let i = 1; i <= n; i++) {
      parcelas.push({ numero: i, valor: valorParcela, vencimento: addMeses(dataBase, i) });
    }
    return {
      condicaoId: condicao.id,
      condicaoNome: condicao.nome,
      tipo: condicao.tipo,
      vistaLiquido,
      proposta,
      juros: proposta - vistaLiquido,
      entrada,
      parcelas,
    };
  }

  // Parcelado Nx (sem entrada): juros sobre todo o valor.
  const proposta = vistaLiquido * fatorCondicao(condicao, taxaMensal);
  const valorParcela = proposta / n;
  const parcelas: PlanoParcela[] = [];
  for (let i = 1; i <= n; i++) {
    parcelas.push({ numero: i, valor: valorParcela, vencimento: addMeses(dataBase, i) });
  }
  return {
    condicaoId: condicao.id,
    condicaoNome: condicao.nome,
    tipo: condicao.tipo,
    vistaLiquido,
    proposta,
    juros: proposta - vistaLiquido,
    entrada: 0,
    parcelas,
  };
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
