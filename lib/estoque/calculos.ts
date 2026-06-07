import type { ItemNotaFiscal } from '@/types';

/**
 * Lógica de cálculo de Estoque & Compras.
 * Funções puras (sem dependência de Firestore) para facilitar teste e reuso.
 */

export interface ItemParaRateio {
  produtoId: string;
  nomeProduto: string;
  skuProduto: string;
  quantidade: number;
  custoUnitario: number;
  icms: number; // valor total de ICMS do item (não percentual)
  ipi: number; // valor total de IPI do item (não percentual)
}

/**
 * Rateia o frete total proporcionalmente ao subtotal de cada item e calcula o
 * CMV (Custo da Mercadoria Vendida) unitário e total de cada item.
 *
 * Regra de negócio:
 *   subtotalItem      = custoUnitario × quantidade
 *   freteRateado      = (subtotalItem / subtotalGeral) × freteTotal
 *   cmvUnitario       = custoUnitario + (freteRateado + icms + ipi) / quantidade
 *   cmvTotal          = cmvUnitario × quantidade
 *
 * Se o subtotal geral for zero (itens sem custo), o frete é distribuído
 * igualmente entre os itens para não perder o valor.
 */
export function ratearFreteECalcularCMV(
  itens: ItemParaRateio[],
  freteTotal: number
): ItemNotaFiscal[] {
  const subtotais = itens.map((item) => item.custoUnitario * item.quantidade);
  const subtotalGeral = subtotais.reduce((acc, v) => acc + v, 0);

  // Frete já alocado (para corrigir arredondamento no último item).
  let freteAlocadoAcumulado = 0;

  return itens.map((item, index) => {
    const subtotal = subtotais[index];
    const isUltimo = index === itens.length - 1;

    let freteRateado: number;
    if (isUltimo) {
      // Último item recebe o resto, evitando perda por arredondamento.
      freteRateado = arredondar(freteTotal - freteAlocadoAcumulado);
    } else if (subtotalGeral > 0) {
      freteRateado = arredondar((subtotal / subtotalGeral) * freteTotal);
    } else {
      // Sem custo: divide igualmente.
      freteRateado = arredondar(freteTotal / itens.length);
    }
    freteAlocadoAcumulado += freteRateado;

    const qtd = item.quantidade > 0 ? item.quantidade : 1;
    const cmvUnitario = arredondar(
      item.custoUnitario + (freteRateado + item.icms + item.ipi) / qtd
    );
    const cmvTotal = arredondar(cmvUnitario * item.quantidade);

    return {
      produtoId: item.produtoId,
      nomeProduto: item.nomeProduto,
      skuProduto: item.skuProduto,
      quantidade: item.quantidade,
      custoUnitario: item.custoUnitario,
      subtotal: arredondar(subtotal),
      icms: item.icms,
      ipi: item.ipi,
      freteRateado,
      cmvUnitario,
      cmvTotal,
    };
  });
}

/** Totais agregados de uma nota fiscal a partir dos itens já calculados. */
export function calcularTotaisNota(itens: ItemNotaFiscal[], freteTotal: number) {
  const subtotalProdutos = arredondar(
    itens.reduce((acc, i) => acc + i.subtotal, 0)
  );
  const icmsTotal = arredondar(itens.reduce((acc, i) => acc + i.icms, 0));
  const ipiTotal = arredondar(itens.reduce((acc, i) => acc + i.ipi, 0));
  // Valor total da nota = produtos + IPI + frete (ICMS é destacado, já incluso no preço).
  const valorTotal = arredondar(subtotalProdutos + ipiTotal + freteTotal);

  return { subtotalProdutos, icmsTotal, ipiTotal, valorTotal };
}

/** Arredonda para 2 casas decimais evitando erros de ponto flutuante. */
export function arredondar(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}
