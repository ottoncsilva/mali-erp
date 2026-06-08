'use client';

import { useState, useMemo, useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCollection, useAuth } from '@/lib/hooks';
import { MovimentoCaixa, ContaBancaria } from '@/types';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Check, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { formatBRL, formatData } from '@/lib/utils/format';

interface MovimentoComStatus extends MovimentoCaixa {
  id: string;
}

function ConciliacaoContent() {
  const { userProfile } = useAuth();
  const { data: movimentos, loading: loadingMov } = useCollection<MovimentoCaixa>('movimentos_caixa');
  const { data: contas, loading: loadingContas } = useCollection<ContaBancaria>('contas_bancarias');

  const [contaSelecionada, setContaSelecionada] = useState<string>('');

  // `contas` chega de forma assíncrona; pré-seleciona a primeira quando carregar.
  useEffect(() => {
    if (!contaSelecionada && contas.length > 0) {
      setContaSelecionada(contas[0].id);
    }
  }, [contas, contaSelecionada]);
  const [mesAnoSelecionado, setMesAnoSelecionado] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [saldoExtratoInformado, setSaldoExtratoInformado] = useState<number>(0);
  const [conciliando, setConciliando] = useState<string | null>(null);

  const conta = contas.find((c) => c.id === contaSelecionada);

  // Filtra movimentos da conta selecionada e mês
  const movimentosFiltrados = useMemo(() => {
    if (!conta) return [];

    const [ano, mes] = mesAnoSelecionado.split('-');
    const anoNum = parseInt(ano);
    const mesNum = parseInt(mes) - 1;

    return (movimentos as MovimentoComStatus[])
      .filter((m) => {
        if (m.contaBancariaId !== contaSelecionada) return false;
        const data = m.criadoEm instanceof Date ? m.criadoEm : new Date(m.criadoEm || '');
        return data.getFullYear() === anoNum && data.getMonth() === mesNum;
      })
      .sort((a, b) => {
        const dataA = a.criadoEm instanceof Date ? a.criadoEm : new Date(a.criadoEm || '');
        const dataB = b.criadoEm instanceof Date ? b.criadoEm : new Date(b.criadoEm || '');
        return dataA.getTime() - dataB.getTime();
      });
  }, [movimentos, contaSelecionada, mesAnoSelecionado, conta]);

  // Calcula saldo esperado (do sistema) e diferença
  const [saldoEsperado, reconciliados, pendentes] = useMemo(() => {
    if (!conta) return [0, [], []];

    let saldo = conta.saldoInicial;
    const rec: MovimentoComStatus[] = [];
    const pend: MovimentoComStatus[] = [];

    for (const m of movimentosFiltrados) {
      if (m.tipo === 'entrada') saldo += m.valor;
      else if (m.tipo === 'saida') saldo -= m.valor;

      if (m.conciliado) rec.push(m);
      else pend.push(m);
    }

    return [saldo, rec, pend];
  }, [movimentosFiltrados, conta]);

  const diferenca = saldoExtratoInformado - saldoEsperado;
  const conciliado = diferenca === 0 && pendentes.length === 0;

  const handleToggleConciliacao = async (movimentoId: string, isConciliado: boolean) => {
    setConciliando(movimentoId);
    try {
      await updateDoc(doc(db, 'movimentos_caixa', movimentoId), {
        conciliado: !isConciliado,
        conciliadoEm: !isConciliado ? new Date() : null,
        conciliadoPorId: !isConciliado ? userProfile?.uid : null,
      });
    } catch (e) {
      alert('Erro ao atualizar reconciliação: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setConciliando(null);
    }
  };

  const handleMarcarTodosConciliados = async () => {
    if (!confirm('Marcar todos os movimentos pendentes como conciliados?')) return;
    setConciliando('todos');
    try {
      for (const m of pendentes) {
        await updateDoc(doc(db, 'movimentos_caixa', m.id), {
          conciliado: true,
          conciliadoEm: new Date(),
          conciliadoPorId: userProfile?.uid,
        });
      }
    } catch (e) {
      alert('Erro ao reconciliar: ' + (e instanceof Error ? e.message : ''));
    } finally {
      setConciliando(null);
    }
  };

  const loading = loadingMov || loadingContas;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Conciliação Bancária</h1>
        <p className="text-muted-foreground mt-2">Reconcilie os movimentos com o extrato do banco</p>
      </div>

      {/* Seleção de Conta e Período */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Conta Bancária</label>
            <select
              value={contaSelecionada}
              onChange={(e) => setContaSelecionada(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            >
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Mês/Ano</label>
            <input
              type="month"
              value={mesAnoSelecionado}
              onChange={(e) => setMesAnoSelecionado(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Saldo do Extrato</label>
            <input
              type="number"
              step="0.01"
              value={saldoExtratoInformado}
              onChange={(e) => setSaldoExtratoInformado(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              placeholder="Informe o saldo do extrato"
            />
          </div>
        </div>
      </div>

      {/* Resumo da Reconciliação */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Saldo Esperado (Sistema)</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatBRL(saldoEsperado)}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Saldo Extrato</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatBRL(saldoExtratoInformado)}</p>
        </div>

        <div
          className={`rounded-lg border p-4 ${
            diferenca === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <p className={`text-sm font-medium ${diferenca === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            Diferença
          </p>
          <p className={`text-2xl font-bold mt-1 ${diferenca === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatBRL(Math.abs(diferenca))}
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <div className="flex items-center gap-2 mt-2">
            {conciliado ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <span className="font-bold text-emerald-600">Conciliada</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-6 h-6 text-amber-600" />
                <span className="font-bold text-amber-600">Pendente</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Alerta de Diferença */}
      {diferenca !== 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">Diferença de {formatBRL(Math.abs(diferenca))}</p>
            <p className="text-sm text-amber-800">
              {diferenca > 0
                ? `Sistema tem ${formatBRL(Math.abs(diferenca))} menos que o extrato`
                : `Sistema tem ${formatBRL(Math.abs(diferenca))} a mais que o extrato`}
            </p>
          </div>
        </div>
      )}

      {/* Tabela de Movimentos */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : movimentosFiltrados.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-sm text-blue-600">Nenhum movimento neste período</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg font-semibold text-foreground">Movimentos do Período</p>
              <p className="text-sm text-muted-foreground mt-1">
                {reconciliados.length} conciliados • {pendentes.length} pendentes
              </p>
            </div>
            {pendentes.length > 0 && (
              <button
                onClick={handleMarcarTodosConciliados}
                disabled={conciliando === 'todos'}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {conciliando === 'todos' ? 'Processando...' : 'Marcar Todos'}
              </button>
            )}
          </div>

          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="space-y-2 p-4">
              {movimentosFiltrados.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    m.conciliado
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-background border-border hover:border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          m.tipo === 'entrada' ? 'bg-emerald-600' : 'bg-red-600'
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-foreground">{m.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.criadoEm instanceof Date ? m.criadoEm.toLocaleDateString('pt-BR') : formatData(m.criadoEm)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          m.tipo === 'entrada' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {m.tipo === 'entrada' ? '+' : '-'} {formatBRL(m.valor)}
                      </p>
                      {m.conciliado && (
                        <p className="text-xs text-emerald-600 font-medium">Conciliado</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggleConciliacao(m.id, m.conciliado || false)}
                      disabled={conciliando === m.id}
                      className={`p-2 rounded-lg transition-colors ${
                        m.conciliado
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={m.conciliado ? 'Desmarcar' : 'Reconciliar'}
                    >
                      {conciliando === m.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ConciliacaoPage() {
  return (
    <ProtegerPagina permissao="financeiro.acessar">
      <ConciliacaoContent />
    </ProtegerPagina>
  );
}
