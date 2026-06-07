import {
  collection,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ContaReceber, ContaPagar, ParcelaConta, MovimentoCaixa, ContaBancaria } from '@/types';
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
 * Operação ATÔMICA: atualiza parcela, conta, saldo bancário e cria movimento de caixa.
 *
 * Fluxo transacional:
 * 1. Atualiza a parcela: pago=true, pagoEm=data, juros/multa/desconto, formaPagamento
 * 2. Recalcula o status da conta (aberto/parcial/pago)
 * 3. Atualiza saldoAtual da conta bancária
 * 4. Cria um movimento de caixa (regime de caixa)
 * 5. Atualiza referência do movimento na parcela
 *
 * Retorna o ID do movimento de caixa criado.
 */
export async function baixarParcela(dados: DadosBaixa): Promise<string> {
  const { contaId, tipo, parcelaNumero, dataRecebimento, ...dadosPagamento } = dados;
  const colecao = tipo === 'receber' ? 'contas_receber' : 'contas_pagar';
  const contaRef = doc(db, colecao, contaId);
  const contaBancariaRef = doc(db, 'contas_bancarias', dadosPagamento.contaBancariaId);

  return runTransaction(db, async (transaction) => {
    // 1. Ler dados atuais dentro da transação
    const contaSnap = await transaction.get(contaRef);
    if (!contaSnap.exists()) {
      throw new Error(`Conta ${colecao}/${contaId} não encontrada`);
    }

    const conta = contaSnap.data() as ContaReceber | ContaPagar;
    const parcelaIdx = conta.parcelas.findIndex((p) => p.numero === parcelaNumero);
    if (parcelaIdx === -1) {
      throw new Error(`Parcela ${parcelaNumero} não encontrada`);
    }

    const contaBancariaSnap = await transaction.get(contaBancariaRef);
    if (!contaBancariaSnap.exists()) {
      throw new Error(`Conta bancária não encontrada`);
    }

    const contaBancaria = contaBancariaSnap.data() as ContaBancaria;

    // 2. Calcular novo estado da parcela
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

    // 4. Atualizar saldo bancário (entrada para receber, saida para pagar)
    const isReceber = tipo === 'receber';
    const novoSaldo = isReceber
      ? contaBancaria.saldoAtual + dadosPagamento.valorPago
      : contaBancaria.saldoAtual - dadosPagamento.valorPago;

    // 5. Criar movimento de caixa
    const movimento: Omit<MovimentoCaixa, 'id'> = {
      contaBancariaId: dadosPagamento.contaBancariaId,
      tipo: isReceber ? 'entrada' : 'saida',
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

    const movRef = doc(collection(db, 'movimentos_caixa'));

    // 6. Atualizar parcela com referência ao movimento
    const parcelasComMovimento = novasParcelas.map((p, idx) =>
      idx === parcelaIdx ? { ...p, movimentoId: movRef.id } : p
    );

    // 7. Executar transação: atualizar conta + conta bancária + criar movimento
    transaction.update(contaRef, {
      parcelas: parcelasComMovimento,
      status: novoStatus,
      atualizadoEm: new Date(),
    });

    transaction.update(contaBancariaRef, {
      saldoAtual: novoSaldo,
      atualizadoEm: new Date(),
    });

    transaction.set(movRef, movimento);

    return movRef.id;
  });
}

/**
 * Reabre uma parcela (desfaz uma baixa).
 * Operação ATÔMICA: cria movimento de ESTORNO (reversal) e atualiza parcela + conta bancária.
 * Mantém imutabilidade: não deleta movimento original, cria uma reversão.
 */
export async function reabrirParcela(
  contaId: string,
  tipo: 'receber' | 'pagar',
  parcelaNumero: number
): Promise<void> {
  const colecao = tipo === 'receber' ? 'contas_receber' : 'contas_pagar';
  const contaRef = doc(db, colecao, contaId);

  return runTransaction(db, async (transaction) => {
    // 1. Ler dados atuais
    const contaSnap = await transaction.get(contaRef);
    if (!contaSnap.exists()) {
      throw new Error(`Conta ${colecao}/${contaId} não encontrada`);
    }

    const conta = contaSnap.data() as ContaReceber | ContaPagar;
    const parcelaIdx = conta.parcelas.findIndex((p) => p.numero === parcelaNumero);
    if (parcelaIdx === -1) {
      throw new Error(`Parcela ${parcelaNumero} não encontrada`);
    }

    const parcela = conta.parcelas[parcelaIdx];
    if (!parcela.pago) {
      throw new Error(`Parcela ${parcelaNumero} não está paga`);
    }

    // 2. Se há movimento de caixa, ler a conta bancária para atualizar saldo
    let contaBancariaRef: any = null;
    if (parcela.contaBancariaId) {
      contaBancariaRef = doc(db, 'contas_bancarias', parcela.contaBancariaId);
      const contaBancariaSnap = await transaction.get(contaBancariaRef);
      if (!contaBancariaSnap.exists()) {
        throw new Error(`Conta bancária não encontrada`);
      }
    }

    // 3. Limpar dados de pagamento da parcela
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

    // 4. Recalcular status
    const todasPagas = novasParcelas.every((p) => p.pago);
    const algumaPaga = novasParcelas.some((p) => p.pago);
    const novoStatus = todasPagas ? 'pago' : algumaPaga ? 'parcial' : 'aberto';

    // 5. Se há movimento, criar reversão (estorno)
    if (parcela.movimentoId && parcela.contaBancariaId) {
      const isReceber = tipo === 'receber';
      const contaBancaria = (await transaction.get(contaBancariaRef)).data() as ContaBancaria;

      // Reversão: inverte o tipo e valor
      const movimentoReversal: Omit<MovimentoCaixa, 'id'> = {
        contaBancariaId: parcela.contaBancariaId,
        tipo: isReceber ? 'saida' : 'entrada', // Invertido
        valor: parcela.valorPago || 0,
        data: new Date(),
        categoriaId: conta.categoriaId,
        descricao: `Estorno de baixa: ${conta.descricao || `${colecao}/${contaId}`}`,
        origemTipo: tipo === 'receber' ? 'conta_receber' : 'conta_pagar',
        origemId: contaId,
        parcelaNumero,
        formaPagamento: parcela.formaPagamento,
        registradoPorId: '',
        registradoPorNome: 'Sistema',
        criadoEm: new Date(),
      };

      // Atualizar saldo bancário (reverter operação original)
      const novoSaldo = isReceber
        ? contaBancaria.saldoAtual - (parcela.valorPago || 0)
        : contaBancaria.saldoAtual + (parcela.valorPago || 0);

      const movReversalRef = doc(collection(db, 'movimentos_caixa'));
      transaction.set(movReversalRef, movimentoReversal);
      transaction.update(contaBancariaRef, {
        saldoAtual: novoSaldo,
        atualizadoEm: new Date(),
      });
    }

    // 6. Atualizar conta
    transaction.update(contaRef, {
      parcelas: novasParcelas,
      status: novoStatus,
      atualizadoEm: new Date(),
    });
  });
}
