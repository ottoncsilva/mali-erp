// Lógica de negócio de precificação e pontuação

import { Produto } from '@/types';

export interface ItemCarrinho {
  produtoId: string;
  produto: Produto & { id: string };
  quantidade: number;
  precoAplicado: number; // Preço que será cobrado
  desconto: number; // Desconto em reais
  // Modalidade de fornecimento na venda:
  // 'estoque' = baixa do estoque disponível; 'encomenda' = dispara pedido de compra.
  modalidade?: 'estoque' | 'encomenda';
}

export interface CondicaoPagamento {
  forma: 'pix' | 'cartao' | 'dinheiro' | 'cheque';
  parcelas: number;
  valor?: number;
}

export interface SimuladorResultado {
  subtotal: number; // Soma dos itens sem desconto
  totalDescontos: number; // Soma de todos os descontos
  totalFinal: number; // Total com descontos
  pontuacaoMedia: number; // Média de pontuação da venda
  precoTabela: number; // Preço sem negociação
  descontoPercentual: number; // % de desconto total
  itensComPontuacao: Array<{
    nome: string;
    cmv: number;
    precoAplicado: number;
    pontuacao: number;
  }>;
}

export interface ResultadoSimulacao extends SimuladorResultado {
  condicoesPagamento: CondicaoPagamento[];
  parcelasInfo: Array<{
    numero: number;
    valor: number;
  }>;
}

/**
 * Calcula CMV de um produto
 */
export function calcularCMV(produto: Produto): number {
  return produto.custoProduto + produto.icms + produto.ipi + produto.frete;
}

/**
 * Calcula preço à vista baseado no CMV e pontuação
 */
export function calcularPrecoTabela(
  produto: Produto,
  pontuacaoPadrao: number
): number {
  const cmv = calcularCMV(produto);
  const pontuacao = produto.tipoPontuacao === 'especial' ? produto.pontuacaoEspecial! : pontuacaoPadrao;
  return cmv * pontuacao;
}

/**
 * Calcula pontuação reversa: CMV / Preço Aplicado
 */
export function calcularPontuacaoReal(cmv: number, precoAplicado: number): number {
  if (precoAplicado === 0) return 0;
  return cmv / precoAplicado;
}

/**
 * Simula o carrinho com descontos aplicados
 */
export function simularCarrinho(
  itens: ItemCarrinho[],
  pontuacaoPadrao: number
): SimuladorResultado {
  let subtotal = 0;
  let totalDescontos = 0;
  let somaPontuacoes = 0;
  const itensComPontuacao: SimuladorResultado['itensComPontuacao'] = [];

  itens.forEach((item) => {
    const cmv = calcularCMV(item.produto);
    const precoTabela = calcularPrecoTabela(item.produto, pontuacaoPadrao);
    const precoTotalItem = precoTabela * item.quantidade;
    const precoAplicadoTotal = item.precoAplicado * item.quantidade;
    const descontoItem = precoTotalItem - precoAplicadoTotal;
    const pontuacao = calcularPontuacaoReal(cmv, item.precoAplicado);

    subtotal += precoTotalItem;
    totalDescontos += descontoItem;
    somaPontuacoes += pontuacao * item.quantidade;

    itensComPontuacao.push({
      nome: item.produto.nome,
      cmv: cmv,
      precoAplicado: item.precoAplicado,
      pontuacao: pontuacao,
    });
  });

  const totalFinal = subtotal - totalDescontos;
  const pontuacaoMedia = itens.length > 0 ? somaPontuacoes / itens.length : 0;

  return {
    subtotal,
    totalDescontos,
    totalFinal,
    pontuacaoMedia: Math.round(pontuacaoMedia * 100) / 100,
    precoTabela: subtotal,
    descontoPercentual: subtotal > 0 ? (totalDescontos / subtotal) * 100 : 0,
    itensComPontuacao,
  };
}

/**
 * Valida se a venda respeta o limite de pontuação do usuário
 */
export function validarTrvasdaNegociacao(
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

/**
 * Simula parcelamento com juros
 */
export function simularParcelamento(
  valor: number,
  parcelas: number,
  taxaMensal: number = 0.02 // 2% ao mês por padrão
): CondicaoPagamento[] {
  const pagamentos: CondicaoPagamento[] = [];

  if (parcelas === 1) {
    pagamentos.push({
      forma: 'pix',
      parcelas: 1,
      valor: valor,
    });
  } else {
    // Calcula juros compostos
    const fator = Math.pow(1 + taxaMensal, parcelas);
    const valorParcela = (valor * taxaMensal * fator) / (fator - 1);

    pagamentos.push({
      forma: 'cartao',
      parcelas: parcelas,
      valor: valorParcela * parcelas, // Valor total com juros
    });
  }

  return pagamentos;
}

/**
 * Processa simulação completa com parcelamento
 */
export function processarSimulacaoCompleta(
  itens: ItemCarrinho[],
  pontuacaoPadrao: number,
  condicoesPagamento: CondicaoPagamento[]
): ResultadoSimulacao {
  const simulacao = simularCarrinho(itens, pontuacaoPadrao);

  const parcelasInfo: ResultadoSimulacao['parcelasInfo'] = [];
  condicoesPagamento.forEach((cond) => {
    if (cond.forma === 'pix') {
      parcelasInfo.push({
        numero: 1,
        valor: simulacao.totalFinal,
      });
    } else if (cond.forma === 'cartao' && cond.parcelas) {
      const valorParcela = (cond.valor || simulacao.totalFinal) / cond.parcelas;
      for (let i = 1; i <= cond.parcelas; i++) {
        parcelasInfo.push({
          numero: i,
          valor: valorParcela,
        });
      }
    } else {
      parcelasInfo.push({
        numero: 1,
        valor: cond.valor || simulacao.totalFinal,
      });
    }
  });

  return {
    ...simulacao,
    condicoesPagamento,
    parcelasInfo,
  };
}
