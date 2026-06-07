import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Lançamento manual de uma conta a pagar ou a receber (despesa/receita avulsa).
 * Ex.: pagar aluguel, energia, registrar uma receita não originada de venda.
 *
 * Cria a conta com parcela(s). A baixa (movimento de caixa) é feita depois,
 * pela tela de financeiro, via baixarParcela().
 */

export interface DadosLancamentoManual {
  tipo: 'receber' | 'pagar';
  descricao: string;
  categoriaId: string;
  valorTotal: number;
  dataCompetencia: Date;
  parcelas: { numero: number; valor: number; vencimento: Date; pago: boolean }[];
  contraparteNome?: string;
  observacoes?: string;
}

export async function lancarContaManual(dados: DadosLancamentoManual): Promise<string> {
  const colecao = dados.tipo === 'receber' ? 'contas_receber' : 'contas_pagar';
  const ref = await addDoc(collection(db, colecao), {
    origem: 'manual',
    descricao: dados.descricao,
    categoriaId: dados.categoriaId,
    valorTotal: dados.valorTotal,
    dataCompetencia: dados.dataCompetencia,
    parcelas: dados.parcelas,
    status: 'aberto',
    ...(dados.contraparteNome ? { contraparteNome: dados.contraparteNome } : {}),
    ...(dados.observacoes ? { observacoes: dados.observacoes } : {}),
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
  return ref.id;
}
