import {
  collection,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ContaReceber, ContaPagar, ParcelaConta, MovimentoCaixa } from '@/types';
import { FormaPagamento } from '@/types';

export interface DadosBaixa {
  contaId: string;
  tipo: 'receber' | 'pagar';
  parcelaNumero: number;
  dataRecebimento: Date;
  contaBancariaId: string;
  formaPagamento: FormaPagamento;
  valorPago: number; // valor efetivamente movimentado
  juros?: number; // adicionado na baixa
  multa?: number; // adicionado na baixa
  desconto?: number; // concedido na baixa
  observacoes?: string;
  registradoPorId: string;
  registradoPorNome: string;
}

/**
 * Baixa uma parcela de uma conta (a receber ou a pagar).
 * Atualiza o status da parcela e da conta, e cria um movimento de caixa.
 *
 * Fluxo:
 * 1. Atualiza a parcela: pago=true, pagoEm=data, juros/multa/desconto, formaPagamento
 * 2. Recalcula o status da conta (aberto/parcial/pago)
 * 3. Cria um movimento de caixa (regime de caixa)
 *
 * Retorna o ID do movimento de caixa criado.
 */
export async function baixarParcela(dados: DadosBaixa): Promise<string> {
  const { contaId, tipo, parcelaNumero, dataRecebimento, ...dadosPagamento } = dados;

  // 1. Buscar a conta existente
  const colecao = tipo === 'receber' ? 'contas_receber' : 'contas_pagar';
  const contaRef = doc(db, colecao, contaId);

  // Pegar dados atuais (via getDoc — o Firebase não retorna no updateDoc)
  const { getDoc } = await import('firebase/firestore');
  const snap = await getDoc(contaRef);
  if (!snap.exists()) {
    throw new Error(`Conta ${colecao}/${contaId} não encontrada`);
  }

  const conta = snap.data() as ContaReceber | ContaPagar;
  const parcelaIdx = conta.parcelas.findIndex((p) => p.numero === parcelaNumero);
  if (parcelaIdx === -1) {
    throw new Error(`Parcela ${parcelaNumero} não encontrada`);
  }

  // 2. Atualizar a parcela
  const novasParcelas = conta.parcelas.map((p, idx) =>
    idx === parcelaIdx
      ? {
          ...p,
          pago: true,
          pagoEm: dataRecebimento,
          valorPago: dadosPagamento.valorPago,
          juros: dadosPagamento.juros || 0,
          multa: dadosPagamento.multa || 0,
          desconto: dadosPagamento.desconto || 0,
          contaBancariaId: dadosPagamento.contaBancariaId,
          formaPagamento: dadosPagamento.formaPagamento,
        }
      : p
  );

  // 3. Recalcular status
  const todasPagas = novasParcelas.every((p) => p.pago);
  const algumaPaga = novasParcelas.some((p) => p.pago);
  const novoStatus = todasPagas ? 'pago' : algumaPaga ? 'parcial' : 'aberto';

  // 4. Atualizar a conta
  await updateDoc(contaRef, {
    parcelas: novasParcelas,
    status: novoStatus,
    atualizadoEm: serverTimestamp(),
  });

  // 5. Criar movimento de caixa (regime de caixa)
  const movimento: Omit<MovimentoCaixa, 'id'> = {
    contaBancariaId: dadosPagamento.contaBancariaId,
    tipo: 'entrada', // entrada ou saida? Depende do tipo de conta
    valor: dadosPagamento.valorPago,
    data: dataRecebimento,
    categoriaId: conta.categoriaId,
    descricao: `Baixa: ${conta.descricao || `${colecao}/${contaId}`}`,
    origemTipo: tipo === 'receber' ? 'conta_receber' : 'conta_pagar',
    origemId: contaId,
    parcelaNumero,
    formaPagamento: dadosPagamento.formaPagamento,
    registradoPorId: dadosPagamento.registradoPorId,
    registradoPorNome: dadosPagamento.registradoPorNome,
    criadoEm: dataRecebimento,
  };

  const movRef = await addDoc(collection(db, 'movimentos_caixa'), movimento);

  // 6. Atualizar a referência do movimento na parcela (para rastreabilidade)
  // Nota: pode fazer update adicional se quiser linkar
  const parcelasComMovimento = novasParcelas.map((p, idx) =>
    idx === parcelaIdx ? { ...p, movimentoId: movRef.id } : p
  );
  await updateDoc(contaRef, { parcelas: parcelasComMovimento });

  return movRef.id;
}

/**
 * Reabre uma parcela (desfaz uma baixa).
 * Remove o movimento de caixa e limpa os dados de pagamento.
 */
export async function reabrirParcela(
  contaId: string,
  tipo: 'receber' | 'pagar',
  parcelaNumero: number
): Promise<void> {
  const colecao = tipo === 'receber' ? 'contas_receber' : 'contas_pagar';
  const contaRef = doc(db, colecao, contaId);

  const { getDoc, deleteDoc } = await import('firebase/firestore');
  const snap = await getDoc(contaRef);
  if (!snap.exists()) {
    throw new Error(`Conta ${colecao}/${contaId} não encontrada`);
  }

  const conta = snap.data() as ContaReceber | ContaPagar;
  const parcelaIdx = conta.parcelas.findIndex((p) => p.numero === parcelaNumero);
  if (parcelaIdx === -1) {
    throw new Error(`Parcela ${parcelaNumero} não encontrada`);
  }

  const parcela = conta.parcelas[parcelaIdx];

  // Deletar movimento de caixa se houver
  if (parcela.movimentoId) {
    try {
      await deleteDoc(doc(db, 'movimentos_caixa', parcela.movimentoId));
    } catch (err) {
      console.warn(`Não foi possível deletar movimento ${parcela.movimentoId}:`, err);
    }
  }

  // Atualizar parcela: limpar dados de pagamento
  const novasParcelas = conta.parcelas.map((p, idx) =>
    idx === parcelaIdx
      ? {
          ...p,
          pago: false,
          pagoEm: undefined,
          valorPago: undefined,
          juros: undefined,
          multa: undefined,
          desconto: undefined,
          contaBancariaId: undefined,
          formaPagamento: undefined,
          movimentoId: undefined,
        }
      : p
  );

  // Recalcular status
  const todasPagas = novasParcelas.every((p) => p.pago);
  const algumaPaga = novasParcelas.some((p) => p.pago);
  const novoStatus = todasPagas ? 'pago' : algumaPaga ? 'parcial' : 'aberto';

  await updateDoc(contaRef, {
    parcelas: novasParcelas,
    status: novoStatus,
    atualizadoEm: serverTimestamp(),
  });
}
