'use client';

import {
  doc,
  collection,
  runTransaction,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { estoqueId } from './movimentacoes';
import { proximoNumero } from './numeracao';
import type { ItemPedidoCompra, PedidoCompra } from '@/types';

interface ContextoUsuario {
  registradoPorId: string;
  registradoPorNome?: string;
}

interface DadosProduto {
  produtoId: string;
  produtoNome: string;
  produtoSku: string;
}

/**
 * Baixa o estoque de um produto ao confirmar uma venda, priorizando o showroom
 * e depois o depósito. Lança erro se não houver saldo disponível suficiente.
 * Grava as movimentações de saída correspondentes.
 */
export async function baixarEstoquePorVenda(
  produto: DadosProduto,
  quantidade: number,
  atendimentoId: string,
  ctx: ContextoUsuario
) {
  const showroomRef = doc(db, 'estoque', estoqueId(produto.produtoId, 'showroom'));
  const depositoRef = doc(db, 'estoque', estoqueId(produto.produtoId, 'deposito'));
  const produtoRef = doc(db, 'produtos', produto.produtoId);

  await runTransaction(db, async (tx) => {
    const showroomSnap = await tx.get(showroomRef);
    const depositoSnap = await tx.get(depositoRef);
    const produtoSnap = await tx.get(produtoRef);

    const qtdShowroom = showroomSnap.exists() ? (showroomSnap.data().quantidade as number) : 0;
    const qtdDeposito = depositoSnap.exists() ? (depositoSnap.data().quantidade as number) : 0;

    if (qtdShowroom + qtdDeposito < quantidade) {
      throw new Error(
        `Estoque insuficiente para "${produto.produtoNome}": disponível ${qtdShowroom + qtdDeposito}, necessário ${quantidade}.`
      );
    }

    let restante = quantidade;
    const baixarShowroom = Math.min(qtdShowroom, restante);
    restante -= baixarShowroom;
    const baixarDeposito = Math.min(qtdDeposito, restante);
    restante -= baixarDeposito;

    if (baixarShowroom > 0) {
      tx.update(showroomRef, {
        quantidade: qtdShowroom - baixarShowroom,
        atualizadoEm: serverTimestamp(),
      });
      gravarSaida(tx, produto, 'showroom', baixarShowroom, atendimentoId, ctx);
    }
    if (baixarDeposito > 0) {
      tx.update(depositoRef, {
        quantidade: qtdDeposito - baixarDeposito,
        atualizadoEm: serverTimestamp(),
      });
      gravarSaida(tx, produto, 'deposito', baixarDeposito, atendimentoId, ctx);
    }

    if (produtoSnap.exists()) {
      const atual = (produtoSnap.data().estoqueAtual as number) || 0;
      tx.update(produtoRef, {
        estoqueAtual: Math.max(0, atual - quantidade),
        atualizadoEm: serverTimestamp(),
      });
    }
  });
}

function gravarSaida(
  tx: any,
  produto: DadosProduto,
  localizacao: 'showroom' | 'deposito',
  quantidade: number,
  atendimentoId: string,
  ctx: ContextoUsuario
) {
  const movRef = doc(collection(db, 'movimentacoes_estoque'));
  const mov: any = {
    produtoId: produto.produtoId,
    produtoNome: produto.produtoNome,
    tipo: 'saida',
    localizacaoOrigem: localizacao,
    quantidade,
    referenciaTipo: 'atendimento',
    referenciaId: atendimentoId,
    registradoPorId: ctx.registradoPorId,
    criadoEm: serverTimestamp(),
  };
  if (ctx.registradoPorNome) mov.registradoPorNome = ctx.registradoPorNome;
  tx.set(movRef, mov);
}

/**
 * Cria pedidos de compra para itens vendidos sob encomenda, agrupados por
 * fornecedor. Retorna os números dos pedidos gerados.
 */
export async function dispararPedidosEncomenda(
  itens: Array<ItemPedidoCompra & { fornecedorId: string; fornecedorNome: string }>,
  atendimentoId: string,
  ctx: ContextoUsuario
): Promise<string[]> {
  // Agrupa por fornecedor.
  const porFornecedor = new Map<string, typeof itens>();
  for (const item of itens) {
    const chave = item.fornecedorId || 'sem_fornecedor';
    if (!porFornecedor.has(chave)) porFornecedor.set(chave, []);
    porFornecedor.get(chave)!.push(item);
  }

  const numeros: string[] = [];
  for (const [, grupo] of porFornecedor) {
    const numero = await proximoNumero('PC');
    const totalEstimado = grupo.reduce((s, i) => s + i.custoUnitario * i.quantidade, 0);

    const novo: Omit<PedidoCompra, 'id' | 'criadoEm' | 'atualizadoEm'> = {
      numero,
      fornecedorId: grupo[0].fornecedorId,
      fornecedorNome: grupo[0].fornecedorNome,
      itens: grupo.map((i) => ({
        produtoId: i.produtoId,
        nomeProduto: i.nomeProduto,
        skuProduto: i.skuProduto,
        quantidade: i.quantidade,
        custoUnitario: i.custoUnitario,
        icms: i.icms,
        ipi: i.ipi,
      })),
      freteEstimado: 0,
      totalEstimado,
      status: 'pedido',
      origem: 'encomenda',
      atendimentoOrigemId: atendimentoId,
      criadoPorId: ctx.registradoPorId,
    };

    await addDoc(collection(db, 'pedidos_compra'), {
      ...novo,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
    numeros.push(numero);
  }

  return numeros;
}
