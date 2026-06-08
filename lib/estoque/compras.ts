'use client';

import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type {
  ItemNotaFiscal,
  LocalizacaoEstoque,
  NotaFiscal,
} from '@/types';
import { LOCALIZACOES, LOCALIZACOES_DISPONIVEIS } from '@/types';
import { estoqueId } from './movimentacoes';
import { arredondar } from './calculos';

// Todas as localizações físicas representam estoque que a loja já possui
// (comprado/em trânsito, showroom, depósito, em entrega) — base do custo médio.
const TODAS_LOCALIZACOES = Object.keys(LOCALIZACOES) as LocalizacaoEstoque[];

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
 * Registra uma nota fiscal de entrada de forma ATÔMICA (uma única transação):
 *  1. Persiste a nota com status 'registrada'.
 *  2. Dá entrada no estoque (localização destino) para cada item + movimentações.
 *  3. Atualiza o CMV do produto (custo/icms/ipi/frete por unidade) + estoque denormalizado.
 *  4. Marca o pedido de compra vinculado como 'faturado'.
 *  5. Cria uma conta a pagar referente à nota.
 *
 * Se qualquer passo falhar, NADA é persistido (evita estoque entrado sem conta a pagar etc).
 */
export async function registrarNotaFiscal(
  dados: DadosNota,
  ctx: ContextoUsuario
): Promise<string> {
  const notaRef = doc(collection(db, 'notas_fiscais'));
  const notaId = notaRef.id;

  const destinoDisponivel = LOCALIZACOES_DISPONIVEIS.includes(dados.localizacaoDestino);

  // Refs por item (saldo de estoque destino + produto + todas as localizações
  // para apurar a quantidade já possuída antes da entrada → custo médio ponderado).
  const refsItens = dados.itens.map((item) => ({
    item,
    saldoRef: doc(db, 'estoque', estoqueId(item.produtoId, dados.localizacaoDestino)),
    produtoRef: doc(db, 'produtos', item.produtoId),
    saldosTodasRefs: TODAS_LOCALIZACOES.map((loc) =>
      doc(db, 'estoque', estoqueId(item.produtoId, loc))
    ),
  }));

  const pedidoRef = dados.pedidoCompraId
    ? doc(db, 'pedidos_compra', dados.pedidoCompraId)
    : null;

  await runTransaction(db, async (tx) => {
    // ===== FASE 1: LEITURAS =====
    const leituras = await Promise.all(
      refsItens.map(async (r) => {
        const saldoSnap = await tx.get(r.saldoRef);
        const produtoSnap = await tx.get(r.produtoRef);
        const saldosTodas = await Promise.all(r.saldosTodasRefs.map((ref) => tx.get(ref)));
        // Quantidade total já possuída (todas as localizações) ANTES desta entrada.
        const qtdOwnedAntes = saldosTodas.reduce(
          (s, snap) => s + (snap.exists() ? (snap.data().quantidade as number) || 0 : 0),
          0
        );
        return { ...r, saldoSnap, produtoSnap, qtdOwnedAntes };
      })
    );

    // ===== FASE 2: ESCRITAS =====
    // 2a. Nota fiscal.
    tx.set(notaRef, {
      ...dados,
      dataEntrada: new Date(),
      status: 'registrada' as NotaFiscal['status'],
      registradaPorId: ctx.registradoPorId,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });

    // 2b. Entrada de estoque + movimentações + CMV/estoque do produto.
    for (const l of leituras) {
      const atual = l.saldoSnap.exists() ? (l.saldoSnap.data().quantidade as number) : 0;
      const novaQtd = atual + l.item.quantidade;

      // Saldo de estoque.
      if (l.saldoSnap.exists()) {
        tx.update(l.saldoRef, { quantidade: novaQtd, atualizadoEm: serverTimestamp() });
      } else {
        tx.set(l.saldoRef, {
          produtoId: l.item.produtoId,
          produtoNome: l.item.nomeProduto,
          produtoSku: l.item.skuProduto,
          localizacao: dados.localizacaoDestino,
          quantidade: novaQtd,
          quantidadeReservada: 0,
          criadoEm: serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        });
      }

      // Movimentação de auditoria.
      const movRef = doc(collection(db, 'movimentacoes_estoque'));
      const mov: any = {
        produtoId: l.item.produtoId,
        produtoNome: l.item.nomeProduto,
        tipo: 'entrada',
        localizacaoDestino: dados.localizacaoDestino,
        quantidade: l.item.quantidade,
        referenciaTipo: 'nota_fiscal',
        referenciaId: notaId,
        registradoPorId: ctx.registradoPorId,
        criadoEm: serverTimestamp(),
      };
      if (ctx.registradoPorNome) mov.registradoPorNome = ctx.registradoPorNome;
      tx.set(movRef, mov);

      // CMV do produto por CUSTO MÉDIO PONDERADO (não sobrescreve).
      // Mistura o custo do estoque remanescente com o custo da nova nota, por unidade.
      const qtdEntrada = l.item.quantidade > 0 ? l.item.quantidade : 1;
      const qtdAntes = l.qtdOwnedAntes;
      const qtdTotal = qtdAntes + qtdEntrada;

      const dadosProd = l.produtoSnap.exists() ? l.produtoSnap.data() : {};
      const custoAntigoUnit = (dadosProd.custoProduto as number) || 0;
      const icmsAntigoUnit = (dadosProd.icms as number) || 0;
      const ipiAntigoUnit = (dadosProd.ipi as number) || 0;
      const freteAntigoUnit = (dadosProd.frete as number) || 0;

      // Componentes por unidade vindos da nota.
      const custoNovoUnit = l.item.custoUnitario;
      const icmsNovoUnit = l.item.icms / qtdEntrada;
      const ipiNovoUnit = l.item.ipi / qtdEntrada;
      const freteNovoUnit = l.item.freteRateado / qtdEntrada;

      // Média ponderada por quantidade; se não havia estoque, assume o custo da nota.
      const mediaPonderada = (antigoUnit: number, novoUnit: number) =>
        qtdAntes > 0 && qtdTotal > 0
          ? arredondar((qtdAntes * antigoUnit + qtdEntrada * novoUnit) / qtdTotal)
          : arredondar(novoUnit);

      const produtoUpdate: any = {
        custoProduto: mediaPonderada(custoAntigoUnit, custoNovoUnit),
        icms: mediaPonderada(icmsAntigoUnit, icmsNovoUnit),
        ipi: mediaPonderada(ipiAntigoUnit, ipiNovoUnit),
        frete: mediaPonderada(freteAntigoUnit, freteNovoUnit),
        atualizadoEm: serverTimestamp(),
      };
      // Estoque denormalizado só conta localizações disponíveis.
      if (destinoDisponivel && l.produtoSnap.exists()) {
        const estoqueAtual = (l.produtoSnap.data().estoqueAtual as number) || 0;
        produtoUpdate.estoqueAtual = Math.max(0, estoqueAtual + l.item.quantidade);
      }
      tx.update(l.produtoRef, produtoUpdate);
    }

    // 2c. Pedido de compra vinculado → faturado.
    if (pedidoRef) {
      tx.update(pedidoRef, {
        status: 'faturado',
        atualizadoEm: serverTimestamp(),
      });
    }

    // 2d. Conta a pagar (parcela única, vencimento 30 dias).
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 30);
    const contaPagarRef = doc(collection(db, 'contas_pagar'));
    tx.set(contaPagarRef, {
      referenciaId: notaId,
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
  });

  return notaId;
}
