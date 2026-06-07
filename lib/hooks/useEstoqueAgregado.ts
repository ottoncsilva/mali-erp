'use client';

import { useMemo } from 'react';
import { useCollection } from './useFirestore';
import { EstoqueItem, Produto, Deposito } from '@/types';
import { agregaEstoque, toMap, EstoqueAgregado } from '@/lib/estoque/agregacao';

export function useEstoqueAgregado() {
  const { data: estoque, loading: loadingEstoque } = useCollection<EstoqueItem>('estoque');
  const { data: produtos, loading: loadingProdutos } = useCollection<Produto>('produtos');
  const { data: depositos, loading: loadingDepositos } = useCollection<Deposito>('depositos');

  const agregado = useMemo(() => {
    if (!estoque || !produtos || !depositos) {
      return [];
    }

    const produtosMap = toMap(produtos as (Produto & { id: string })[]);
    const depositosMap = toMap(depositos as (Deposito & { id: string })[]);

    return agregaEstoque(
      estoque as (EstoqueItem & { id: string })[],
      produtosMap,
      depositosMap
    );
  }, [estoque, produtos, depositos]);

  return {
    agregado,
    loading: loadingEstoque || loadingProdutos || loadingDepositos,
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
