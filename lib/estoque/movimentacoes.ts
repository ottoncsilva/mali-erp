'use client';

import {
  doc,
  runTransaction,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  LocalizacaoEstoque,
  MovimentacaoEstoque,
  NotaFiscal,
  ItemNotaFiscal,
} from '@/types';
import { LOCALIZACOES_DISPONIVEIS } from '@/types';

/**
 * Operações de estoque que exigem consistência transacional.
 * Tudo roda no cliente via runTransaction (o projeto não usa Cloud Functions).
 */

/** Id composto de um saldo de estoque. */
export function estoqueId(produtoId: string, localizacao: LocalizacaoEstoque): string {
  return `${produtoId}_${localizacao}`;
}

interface DadosProduto {
  produtoId: string;
  produtoNome: string;
  produtoSku: string;
}

interface ContextoUsuario {
  registradoPorId: string;
  registradoPorNome?: string;
}

/**
 * Entrada de estoque numa localização (ex.: recebimento de compra).
 * Cria/atualiza o saldo e grava a movimentação de auditoria.
 */
export async function registrarEntrada(
  produto: DadosProduto,
  localizacao: LocalizacaoEstoque,
  quantidade: number,
  referencia: { tipo: MovimentacaoEstoque['referenciaTipo']; id?: string },
  ctx: ContextoUsuario,
  motivo?: string
) {
  const saldoRef = doc(db, 'estoque', estoqueId(produto.produtoId, localizacao));
  const movRef = doc(collection(db, 'movimentacoes_estoque'));
  const produtoRef = doc(db, 'produtos', produto.produtoId);

  await runTransaction(db, async (tx) => {
    const saldoSnap = await tx.get(saldoRef);
    const atual = saldoSnap.exists() ? (saldoSnap.data().quantidade as number) : 0;
    const novaQtd = atual + quantidade;

    aplicarSaldo(tx, saldoRef, saldoSnap.exists(), produto, localizacao, novaQtd);
    gravarMovimentacao(tx, movRef, {
      produto,
      tipo: 'entrada',
      localizacaoDestino: localizacao,
      quantidade,
      referencia,
      ctx,
      motivo,
    });

    // Atualiza estoque denormalizado no produto (apenas locais disponíveis).
    await atualizarEstoqueProduto(tx, produtoRef, produto.produtoId, localizacao, quantidade);
  });
}

/**
 * Saída de estoque de uma localização (ex.: baixa por venda ou ajuste).
 * Lança erro se não houver saldo suficiente.
 */
export async function registrarSaida(
  produto: DadosProduto,
  localizacao: LocalizacaoEstoque,
  quantidade: number,
  referencia: { tipo: MovimentacaoEstoque['referenciaTipo']; id?: string },
  ctx: ContextoUsuario,
  motivo?: string
) {
  const saldoRef = doc(db, 'estoque', estoqueId(produto.produtoId, localizacao));
  const movRef = doc(collection(db, 'movimentacoes_estoque'));
  const produtoRef = doc(db, 'produtos', produto.produtoId);

  await runTransaction(db, async (tx) => {
    const saldoSnap = await tx.get(saldoRef);
    const atual = saldoSnap.exists() ? (saldoSnap.data().quantidade as number) : 0;
    if (atual < quantidade) {
      throw new Error(
        `Estoque insuficiente em ${localizacao}: disponível ${atual}, solicitado ${quantidade}.`
      );
    }
    const novaQtd = atual - quantidade;

    aplicarSaldo(tx, saldoRef, true, produto, localizacao, novaQtd);
    gravarMovimentacao(tx, movRef, {
      produto,
      tipo: 'saida',
      localizacaoOrigem: localizacao,
      quantidade,
      referencia,
      ctx,
      motivo,
    });

    await atualizarEstoqueProduto(tx, produtoRef, produto.produtoId, localizacao, -quantidade);
  });
}

/**
 * Transferência entre localizações (ex.: comprado → showroom).
 */
export async function registrarTransferencia(
  produto: DadosProduto,
  origem: LocalizacaoEstoque,
  destino: LocalizacaoEstoque,
  quantidade: number,
  ctx: ContextoUsuario,
  motivo?: string
) {
  if (origem === destino) throw new Error('Origem e destino devem ser diferentes.');

  const origemRef = doc(db, 'estoque', estoqueId(produto.produtoId, origem));
  const destinoRef = doc(db, 'estoque', estoqueId(produto.produtoId, destino));
  const movRef = doc(collection(db, 'movimentacoes_estoque'));
  const produtoRef = doc(db, 'produtos', produto.produtoId);

  await runTransaction(db, async (tx) => {
    const origemSnap = await tx.get(origemRef);
    const destinoSnap = await tx.get(destinoRef);

    const qtdOrigem = origemSnap.exists() ? (origemSnap.data().quantidade as number) : 0;
    if (qtdOrigem < quantidade) {
      throw new Error(
        `Estoque insuficiente em ${origem}: disponível ${qtdOrigem}, solicitado ${quantidade}.`
      );
    }
    const qtdDestino = destinoSnap.exists() ? (destinoSnap.data().quantidade as number) : 0;

    aplicarSaldo(tx, origemRef, true, produto, origem, qtdOrigem - quantidade);
    aplicarSaldo(tx, destinoRef, destinoSnap.exists(), produto, destino, qtdDestino + quantidade);
    gravarMovimentacao(tx, movRef, {
      produto,
      tipo: 'transferencia',
      localizacaoOrigem: origem,
      localizacaoDestino: destino,
      quantidade,
      referencia: { tipo: 'transferencia' },
      ctx,
      motivo,
    });

    // Ajusta o estoque disponível do produto se a transferência cruza a
    // fronteira "disponível ↔ indisponível".
    const origemDisp = LOCALIZACOES_DISPONIVEIS.includes(origem);
    const destinoDisp = LOCALIZACOES_DISPONIVEIS.includes(destino);
    if (origemDisp !== destinoDisp) {
      const delta = destinoDisp ? quantidade : -quantidade;
      await atualizarEstoqueProdutoDelta(tx, produtoRef, delta);
    }
  });
}

/**
 * Ajuste manual de estoque (correção de inventário).
 * `novaQuantidade` é o valor final desejado na localização.
 */
export async function registrarAjuste(
  produto: DadosProduto,
  localizacao: LocalizacaoEstoque,
  novaQuantidade: number,
  ctx: ContextoUsuario,
  motivo: string
) {
  const saldoRef = doc(db, 'estoque', estoqueId(produto.produtoId, localizacao));
  const movRef = doc(collection(db, 'movimentacoes_estoque'));
  const produtoRef = doc(db, 'produtos', produto.produtoId);

  await runTransaction(db, async (tx) => {
    const saldoSnap = await tx.get(saldoRef);
    const atual = saldoSnap.exists() ? (saldoSnap.data().quantidade as number) : 0;
    const delta = novaQuantidade - atual;

    aplicarSaldo(tx, saldoRef, saldoSnap.exists(), produto, localizacao, novaQuantidade);
    gravarMovimentacao(tx, movRef, {
      produto,
      tipo: 'ajuste',
      localizacaoDestino: localizacao,
      quantidade: Math.abs(delta),
      referencia: { tipo: 'ajuste_manual' },
      ctx,
      motivo,
    });

    await atualizarEstoqueProduto(tx, produtoRef, produto.produtoId, localizacao, delta);
  });
}

// ----------------- helpers internos -----------------

function aplicarSaldo(
  tx: any,
  ref: any,
  existe: boolean,
  produto: DadosProduto,
  localizacao: LocalizacaoEstoque,
  quantidade: number
) {
  if (existe) {
    tx.update(ref, { quantidade, atualizadoEm: serverTimestamp() });
  } else {
    tx.set(ref, {
      produtoId: produto.produtoId,
      produtoNome: produto.produtoNome,
      produtoSku: produto.produtoSku,
      localizacao,
      quantidade,
      quantidadeReservada: 0,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
  }
}

function gravarMovimentacao(
  tx: any,
  ref: any,
  args: {
    produto: DadosProduto;
    tipo: MovimentacaoEstoque['tipo'];
    localizacaoOrigem?: LocalizacaoEstoque;
    localizacaoDestino?: LocalizacaoEstoque;
    quantidade: number;
    referencia: { tipo: MovimentacaoEstoque['referenciaTipo']; id?: string };
    ctx: ContextoUsuario;
    motivo?: string;
  }
) {
  const mov: any = {
    produtoId: args.produto.produtoId,
    produtoNome: args.produto.produtoNome,
    tipo: args.tipo,
    quantidade: args.quantidade,
    referenciaTipo: args.referencia.tipo,
    registradoPorId: args.ctx.registradoPorId,
    criadoEm: serverTimestamp(),
  };
  if (args.localizacaoOrigem) mov.localizacaoOrigem = args.localizacaoOrigem;
  if (args.localizacaoDestino) mov.localizacaoDestino = args.localizacaoDestino;
  if (args.referencia.id) mov.referenciaId = args.referencia.id;
  if (args.ctx.registradoPorNome) mov.registradoPorNome = args.ctx.registradoPorNome;
  if (args.motivo) mov.motivo = args.motivo;
  tx.set(ref, mov);
}

/**
 * Atualiza o campo `estoqueAtual` (denormalizado) do produto, contando apenas
 * localizações disponíveis para venda. `delta` pode ser negativo.
 */
async function atualizarEstoqueProduto(
  tx: any,
  produtoRef: any,
  produtoId: string,
  localizacao: LocalizacaoEstoque,
  delta: number
) {
  if (!LOCALIZACOES_DISPONIVEIS.includes(localizacao)) return; // comprado/entrega não contam
  await atualizarEstoqueProdutoDelta(tx, produtoRef, delta);
}

async function atualizarEstoqueProdutoDelta(tx: any, produtoRef: any, delta: number) {
  const snap = await tx.get(produtoRef);
  if (!snap.exists()) return;
  const atual = (snap.data().estoqueAtual as number) || 0;
  tx.update(produtoRef, {
    estoqueAtual: Math.max(0, atual + delta),
    atualizadoEm: serverTimestamp(),
  });
}
