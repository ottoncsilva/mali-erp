'use client';

import { useMemo } from 'react';
import { useCollection } from './useFirestore';
import { EstoqueItem, Produto, Deposito, PedidoCompra } from '@/types';
import { agregaEstoque, toMap, EstoqueAgregado } from '@/lib/estoque/agregacao';

// Pedidos com mercadoria comprada mas ainda não recebida.
const STATUS_EM_TRANSITO: PedidoCompra['status'][] = ['pedido', 'em_transito', 'recebido'];

export function useEstoqueAgregado() {
  const { data: estoque, loading: loadingEstoque } = useCollection<EstoqueItem>('estoque');
  const { data: produtos, loading: loadingProdutos } = useCollection<Produto>('produtos');
  const { data: depositos, loading: loadingDepositos } = useCollection<Deposito>('depositos');
  const { data: pedidos, loading: loadingPedidos } = useCollection<PedidoCompra>('pedidos_compra');

  const agregado = useMemo(() => {
    if (!estoque || !produtos || !depositos) {
      return [];
    }

    const produtosMap = toMap(produtos as (Produto & { id: string })[]);
    const depositosMap = toMap(depositos as (Deposito & { id: string })[]);

    // Soma a quantidade comprada e ainda não recebida por produto.
    const emTransito = new Map<string, number>();
    (pedidos || []).forEach((pedido) => {
      if (!STATUS_EM_TRANSITO.includes(pedido.status)) return;
      pedido.itens?.forEach((item) => {
        emTransito.set(
          item.produtoId,
          (emTransito.get(item.produtoId) || 0) + (item.quantidade || 0)
        );
      });
    });

    return agregaEstoque(
      estoque as (EstoqueItem & { id: string })[],
      produtosMap,
      depositosMap,
      emTransito
    );
  }, [estoque, produtos, depositos, pedidos]);

  return {
    agregado,
    loading: loadingEstoque || loadingProdutos || loadingDepositos || loadingPedidos,
  };
}

export function useProdutoDetalhado(produtoId: string | null) {
  const { data: produtos, loading: loadingProduto } = useCollection<Produto>('produtos');
  const { data: estoque, loading: loadingEstoque } = useCollection<EstoqueItem>('estoque');
  const { data: movimentacoes, loading: loadingMovimentacoes } = useCollection(
    'movimentacoes_estoque'
  );

  const produtoDetalhado = useMemo(() => {
    if (!produtoId || !produtos || !estoque || !movimentacoes) {
      return null;
    }

    const produto = (produtos as (Produto & { id: string })[]).find(
      (p) => p.id === produtoId
    );
    if (!produto) return null;

    const estoqueItens = (estoque as (EstoqueItem & { id: string })[]).filter(
      (e) => e.produtoId === produtoId
    );

    const movimentacoesItens = movimentacoes.filter(
      (m: any) => m.produtoId === produtoId
    );

    return {
      ...produto,
      estoqueDetalhado: estoqueItens,
      movimentacoesRecentes: movimentacoesItens,
    };
  }, [produtoId, produtos, estoque, movimentacoes]);

  return {
    produtoDetalhado,
    loading: loadingProduto || loadingEstoque || loadingMovimentacoes,
  };
}
