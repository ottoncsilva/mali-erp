'use client';

import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  ItemNotaFiscal,
  LocalizacaoEstoque,
  NotaFiscal,
} from '@/types';
import { registrarEntrada } from './movimentacoes';
import { arredondar } from './calculos';

interface ContextoUsuario {
  registradoPorId: string;
  registradoPorNome?: string;
}

interface DadosNota {
  numero: string;
  serie: string;
  fornecedorId: string;
  fornecedorNome: string;
  pedidoCompraId?: string;
  dataEmissao: Date;
  itens: ItemNotaFiscal[];
  freteTotal: number;
  subtotalProdutos: number;
  icmsTotal: number;
  ipiTotal: number;
  valorTotal: number;
  localizacaoDestino: LocalizacaoEstoque;
  observacoes?: string;
}

/**
 * Registra uma nota fiscal de entrada:
 *  1. Persiste a nota com status 'registrada'.
 *  2. Dá entrada no estoque (localização destino) para cada item.
 *  3. Atualiza o CMV do produto (custo/icms/ipi/frete por unidade).
 *  4. Marca o pedido de compra vinculado como 'faturado'.
 *  5. Cria uma conta a pagar referente à nota.
 *
 * As entradas de estoque rodam em transações individuais (uma por item).
 */
export async function registrarNotaFiscal(dados: DadosNota, ctx: ContextoUsuario): Promise<string> {
  // 1. Cria a nota fiscal.
  const notaRef = await addDoc(collection(db, 'notas_fiscais'), {
    ...dados,
    dataEntrada: new Date(),
    status: 'registrada' as NotaFiscal['status'],
    registradaPorId: ctx.registradoPorId,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  // 2 + 3. Entrada de estoque e atualização de CMV por item.
  for (const item of dados.itens) {
    await registrarEntrada(
      {
        produtoId: item.produtoId,
        produtoNome: item.nomeProduto,
        produtoSku: item.skuProduto,
      },
      dados.localizacaoDestino,
      item.quantidade,
      { tipo: 'nota_fiscal', id: notaRef.id },
      ctx
    );

    // Atualiza componentes de custo do produto (por unidade) para refletir a
    // última compra, mantendo compatibilidade com calcularCMV (custo+icms+ipi+frete).
    const qtd = item.quantidade > 0 ? item.quantidade : 1;
    await updateDoc(doc(db, 'produtos', item.produtoId), {
      custoProduto: item.custoUnitario,
      icms: arredondar(item.icms / qtd),
      ipi: arredondar(item.ipi / qtd),
      frete: arredondar(item.freteRateado / qtd),
      atualizadoEm: serverTimestamp(),
    });
  }

  // 4. Atualiza o pedido de compra vinculado.
  if (dados.pedidoCompraId) {
    await updateDoc(doc(db, 'pedidos_compra', dados.pedidoCompraId), {
      status: 'faturado',
      atualizadoEm: serverTimestamp(),
    });
  }

  // 5. Cria conta a pagar (parcela única no vencimento padrão de 30 dias).
  const vencimento = new Date();
  vencimento.setDate(vencimento.getDate() + 30);
  await addDoc(collection(db, 'contas_pagar'), {
    referenciaId: notaRef.id,
    parcelas: [
      {
        numero: 1,
        valor: dados.valorTotal,
        vencimento,
        pago: false,
      },
    ],
    valorTotal: dados.valorTotal,
    status: 'aberto',
    descricao: `NF ${dados.numero} - ${dados.fornecedorNome}`,
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });

  return notaRef.id;
}
