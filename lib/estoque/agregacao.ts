import { Produto, EstoqueItem, Deposito, LocalizacaoEstoque } from '@/types';

export interface EstoqueAgregado {
  produtoId: string;
  produtoNome: string;
  produtoSku: string;
  estoqueMinimo: number;
  fotoPrincipal: string;
  status: 'ativo' | 'inativo' | 'esgotado';

  // Agregado por localização
  porLocalizacao: {
    [key in LocalizacaoEstoque]?: {
      quantidade: number;
      quantidadeReservada: number;
      depositos?: Array<{
        depositoId: string;
        depositoNome: string;
        quantidade: number;
        quantidadeReservada: number;
      }>;
    };
  };

  // Campos computados
  totalDisponivel: number; // showroom + deposito
  totalGeral: number; // todas as localizações
  statusEstoque: 'abaixo' | 'normal' | 'zerado';
}

/**
 * Agrega informações de estoque por produto.
 *
 * Itera sobre TODOS os produtos cadastrados (mesmo sem nenhum registro de
 * estoque — aparecem zerados) e calcula totais por localização e status.
 *
 * `emTransitoPorProduto` traz a quantidade comprada mas ainda não recebida
 * (pedidos de compra em aberto), somada à localização "comprado".
 */
export function agregaEstoque(
  itens: (EstoqueItem & { id: string })[],
  produtos: Map<string, Produto & { id: string }>,
  depositos: Map<string, Deposito & { id: string }>,
  emTransitoPorProduto: Map<string, number> = new Map()
): EstoqueAgregado[] {
  // Agrupar itens por produto
  const porProduto = new Map<string, EstoqueItem[]>();
  itens.forEach((item) => {
    if (!porProduto.has(item.produtoId)) {
      porProduto.set(item.produtoId, []);
    }
    porProduto.get(item.produtoId)!.push(item);
  });

  // Construir estoque agregado — uma linha por produto cadastrado.
  const agregado: EstoqueAgregado[] = [];

  produtos.forEach((produto, produtoId) => {
    const estoqueItems = porProduto.get(produtoId) || [];
    const porLocalizacao: EstoqueAgregado['porLocalizacao'] = {};
    let totalDisponivel = 0;
    let totalGeral = 0;

    // Agrupar por localização
    const porLoc = new Map<LocalizacaoEstoque, EstoqueItem[]>();
    estoqueItems.forEach((item) => {
      if (!porLoc.has(item.localizacao)) {
        porLoc.set(item.localizacao, []);
      }
      porLoc.get(item.localizacao)!.push(item);
    });

    // Calcular totais por localização
    porLoc.forEach((items, localizacao) => {
      const quantidade = items.reduce((sum, item) => sum + item.quantidade, 0);
      const quantidadeReservada = items.reduce(
        (sum, item) => sum + item.quantidadeReservada,
        0
      );

      // Se for depósito, agrupar por depósito individual
      const depositos_ =
        localizacao === 'deposito'
          ? items.map((item) => ({
              depositoId: item.id.split('_')[2] || 'default',
              depositoNome: depositos.get(item.id.split('_')[2] || 'default')?.nome || 'Depósito',
              quantidade: item.quantidade,
              quantidadeReservada: item.quantidadeReservada,
            }))
          : undefined;

      porLocalizacao[localizacao] = {
        quantidade,
        quantidadeReservada,
        ...(depositos_ && { depositos: depositos_ }),
      };

      // Somar totais
      totalGeral += quantidade;
      if (localizacao === 'showroom' || localizacao === 'deposito') {
        totalDisponivel += quantidade;
      }
    });

    // Adiciona o que foi comprado mas ainda não chegou (pedidos em aberto).
    const emTransito = emTransitoPorProduto.get(produtoId) || 0;
    if (emTransito > 0) {
      const atual = porLocalizacao.comprado?.quantidade || 0;
      porLocalizacao.comprado = {
        quantidade: atual + emTransito,
        quantidadeReservada: porLocalizacao.comprado?.quantidadeReservada || 0,
      };
      totalGeral += emTransito;
    }

    // Determinar status do estoque (baseado no disponível para venda)
    let statusEstoque: 'abaixo' | 'normal' | 'zerado';
    if (totalDisponivel === 0) {
      statusEstoque = 'zerado';
    } else if (totalDisponivel < produto.estoqueMinimo) {
      statusEstoque = 'abaixo';
    } else {
      statusEstoque = 'normal';
    }

    agregado.push({
      produtoId: produto.id,
      produtoNome: produto.nome,
      produtoSku: produto.sku,
      estoqueMinimo: produto.estoqueMinimo,
      fotoPrincipal: produto.fotoPrincipal,
      status: produto.status,
      porLocalizacao,
      totalDisponivel,
      totalGeral,
      statusEstoque,
    });
  });

  return agregado;
}

/**
 * Mapeia arrays em Maps para acesso O(1)
 */
export function toMap<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}
