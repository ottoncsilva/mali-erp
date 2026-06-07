'use client';

import {
  doc,
  collection,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { estoqueId } from '@/lib/estoque/movimentacoes';
import { LOCALIZACOES_DISPONIVEIS } from '@/types';

/**
 * Finalização de venda ATÔMICA.
 *
 * Consolida em UMA única transação Firestore tudo que antes eram chamadas
 * sequenciais independentes (com risco de dados órfãos em caso de falha):
 *  1. Cria o atendimento (venda).
 *  2. Baixa o estoque dos itens vendidos de estoque (showroom→depósito) + movimentações.
 *  3. Gera pedidos de compra para itens sob encomenda (agrupados por fornecedor).
 *  4. Cria a conta a receber (parcelas da venda).
 *  5. Cria as contas a pagar (comissões de especificador e colaboradores).
 *
 * O Firestore exige todas as LEITURAS antes das ESCRITAS na transação.
 * Por isso a função lê primeiro todos os saldos e o contador, valida, e só então
 * escreve. Se qualquer passo falhar, NADA é persistido.
 */

interface ContextoUsuario {
  registradoPorId: string;
  registradoPorNome?: string;
}

export interface ItemVendaFinalizacao {
  produtoId: string;
  produtoNome: string;
  produtoSku: string;
  quantidade: number;
  modalidade: 'estoque' | 'encomenda';
  // Dados usados apenas em encomenda:
  custoUnitario: number;
  icms: number;
  ipi: number;
  fornecedorId: string;
  fornecedorNome: string;
}

export interface ParcelaFinalizacao {
  numero: number;
  valor: number;
  vencimento: Date;
  pago: boolean;
}

export interface ContaPagarFinalizacao {
  colaboradorId?: string;
  parcelas: ParcelaFinalizacao[];
  valorTotal: number;
  descricao: string;
}

export interface DadosFinalizacaoVenda {
  /** Objeto do atendimento já montado (sem id). */
  atendimento: Record<string, any>;
  itens: ItemVendaFinalizacao[];
  contaReceber: {
    parcelas: ParcelaFinalizacao[];
    valorTotal: number;
    descricao: string;
  };
  contasPagar: ContaPagarFinalizacao[];
  ctx: ContextoUsuario;
}

export interface ResultadoFinalizacao {
  atendimentoId: string;
  numerosPedidoCompra: string[];
}

export async function finalizarVendaAtomica(
  dados: DadosFinalizacaoVenda
): Promise<ResultadoFinalizacao> {
  const { atendimento, itens, contaReceber, contasPagar, ctx } = dados;

  const itensEstoque = itens.filter((i) => i.modalidade === 'estoque');
  const itensEncomenda = itens.filter((i) => i.modalidade === 'encomenda');

  // Agrupa encomendas por fornecedor (cada grupo vira um pedido de compra).
  const encomendaPorFornecedor = new Map<string, ItemVendaFinalizacao[]>();
  for (const item of itensEncomenda) {
    const chave = item.fornecedorId || 'sem_fornecedor';
    if (!encomendaPorFornecedor.has(chave)) encomendaPorFornecedor.set(chave, []);
    encomendaPorFornecedor.get(chave)!.push(item);
  }
  const totalPedidosCompra = encomendaPorFornecedor.size;

  // Refs pré-criados (ids gerados antes da transação para vínculos).
  const atendimentoRef = doc(collection(db, 'atendimentos'));
  const atendimentoId = atendimentoRef.id;

  // Refs de estoque/produto por item de estoque.
  const refsEstoque = itensEstoque.map((item) => ({
    item,
    showroomRef: doc(db, 'estoque', estoqueId(item.produtoId, 'showroom')),
    depositoRef: doc(db, 'estoque', estoqueId(item.produtoId, 'deposito')),
    produtoRef: doc(db, 'produtos', item.produtoId),
  }));

  const ano = new Date().getFullYear();
  const contadorRef = doc(db, 'contadores', `PC_${ano}`);

  const numerosPedidoCompra: string[] = [];

  await runTransaction(db, async (tx) => {
    // ===== FASE 1: LEITURAS =====
    // 1a. Contador de pedidos de compra (se houver encomendas).
    let contadorAtual = 0;
    if (totalPedidosCompra > 0) {
      const contadorSnap = await tx.get(contadorRef);
      contadorAtual = contadorSnap.exists() ? (contadorSnap.data().valor as number) : 0;
    }

    // 1b. Saldos de estoque e produtos.
    const leituras = await Promise.all(
      refsEstoque.map(async (r) => {
        const showroomSnap = await tx.get(r.showroomRef);
        const depositoSnap = await tx.get(r.depositoRef);
        const produtoSnap = await tx.get(r.produtoRef);
        return { ...r, showroomSnap, depositoSnap, produtoSnap };
      })
    );

    // ===== VALIDAÇÃO (antes de qualquer escrita) =====
    for (const l of leituras) {
      const qtdShowroom = l.showroomSnap.exists()
        ? (l.showroomSnap.data().quantidade as number)
        : 0;
      const qtdDeposito = l.depositoSnap.exists()
        ? (l.depositoSnap.data().quantidade as number)
        : 0;
      if (qtdShowroom + qtdDeposito < l.item.quantidade) {
        throw new Error(
          `Estoque insuficiente para "${l.item.produtoNome}": disponível ${
            qtdShowroom + qtdDeposito
          }, necessário ${l.item.quantidade}.`
        );
      }
    }

    // ===== FASE 2: ESCRITAS =====
    // 2a. Atendimento.
    tx.set(atendimentoRef, {
      ...atendimento,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });

    // 2b. Baixa de estoque + movimentações + estoque denormalizado.
    for (const l of leituras) {
      const qtdShowroom = l.showroomSnap.exists()
        ? (l.showroomSnap.data().quantidade as number)
        : 0;
      const qtdDeposito = l.depositoSnap.exists()
        ? (l.depositoSnap.data().quantidade as number)
        : 0;

      let restante = l.item.quantidade;
      const baixarShowroom = Math.min(qtdShowroom, restante);
      restante -= baixarShowroom;
      const baixarDeposito = Math.min(qtdDeposito, restante);

      if (baixarShowroom > 0) {
        tx.update(l.showroomRef, {
          quantidade: qtdShowroom - baixarShowroom,
          atualizadoEm: serverTimestamp(),
        });
        gravarSaida(tx, l.item, 'showroom', baixarShowroom, atendimentoId, ctx);
      }
      if (baixarDeposito > 0) {
        tx.update(l.depositoRef, {
          quantidade: qtdDeposito - baixarDeposito,
          atualizadoEm: serverTimestamp(),
        });
        gravarSaida(tx, l.item, 'deposito', baixarDeposito, atendimentoId, ctx);
      }

      // Estoque denormalizado do produto (apenas localizações disponíveis).
      if (l.produtoSnap.exists()) {
        const atual = (l.produtoSnap.data().estoqueAtual as number) || 0;
        tx.update(l.produtoRef, {
          estoqueAtual: Math.max(0, atual - l.item.quantidade),
          atualizadoEm: serverTimestamp(),
        });
      }
    }

    // 2c. Pedidos de compra (encomendas), com numeração sequencial.
    if (totalPedidosCompra > 0) {
      let seq = contadorAtual;
      for (const [, grupo] of encomendaPorFornecedor) {
        seq += 1;
        const numero = `PC-${ano}-${String(seq).padStart(4, '0')}`;
        numerosPedidoCompra.push(numero);
        const totalEstimado = grupo.reduce(
          (s, i) => s + i.custoUnitario * i.quantidade,
          0
        );
        const pedidoRef = doc(collection(db, 'pedidos_compra'));
        tx.set(pedidoRef, {
          numero,
          fornecedorId: grupo[0].fornecedorId,
          fornecedorNome: grupo[0].fornecedorNome,
          itens: grupo.map((i) => ({
            produtoId: i.produtoId,
            nomeProduto: i.produtoNome,
            skuProduto: i.produtoSku,
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
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        });
      }
      // Atualiza o contador uma única vez.
      tx.set(
        contadorRef,
        { valor: seq, prefixo: 'PC', ano, atualizadoEm: serverTimestamp() },
        { merge: true }
      );
    }

    // 2d. Conta a receber.
    const contaReceberRef = doc(collection(db, 'contas_receber'));
    tx.set(contaReceberRef, {
      referenciaId: atendimentoId,
      parcelas: contaReceber.parcelas,
      valorTotal: contaReceber.valorTotal,
      status: 'aberto',
      descricao: contaReceber.descricao,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });

    // 2e. Contas a pagar (comissões).
    for (const cp of contasPagar) {
      const cpRef = doc(collection(db, 'contas_pagar'));
      tx.set(cpRef, {
        referenciaId: atendimentoId,
        ...(cp.colaboradorId ? { colaboradorId: cp.colaboradorId } : {}),
        parcelas: cp.parcelas,
        valorTotal: cp.valorTotal,
        status: 'aberto',
        descricao: cp.descricao,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      });
    }
  });

  return { atendimentoId, numerosPedidoCompra };
}

function gravarSaida(
  tx: any,
  item: ItemVendaFinalizacao,
  localizacao: 'showroom' | 'deposito',
  quantidade: number,
  atendimentoId: string,
  ctx: ContextoUsuario
) {
  const movRef = doc(collection(db, 'movimentacoes_estoque'));
  const mov: any = {
    produtoId: item.produtoId,
    produtoNome: item.produtoNome,
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
