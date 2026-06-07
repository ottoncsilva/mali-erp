'use client';

import { useMemo, useState } from 'react';
import { useCollection, useUpdateDocument } from '@/lib/hooks';
import { Table } from '@/components/ui/Table';
import { formatBRL, formatData } from '@/lib/utils/format';
import { ContaPagar, ContaReceber } from '@/types';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';

type Tipo = 'receber' | 'pagar';

interface LinhaConta {
  contaId: string;
  tipo: Tipo;
  descricao: string;
  numeroParcela: number;
  valor: number;
  vencimento: any;
  pago: boolean;
  totalParcelas: number;
}

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export default function FinanceiroPage() {
  const { data: contasReceber, loading: loadingR } = useCollection<ContaReceber>('contas_receber');
  const { data: contasPagar, loading: loadingP } = useCollection<ContaPagar>('contas_pagar');
  const { update: updateReceber } = useUpdateDocument('contas_receber');
  const { update: updatePagar } = useUpdateDocument('contas_pagar');

  const [filtro, setFiltro] = useState<Tipo | 'todas'>('todas');

  // Achata as parcelas de cada conta em linhas individuais.
  const linhas = useMemo(() => {
    const todas: LinhaConta[] = [];
    (contasReceber as (ContaReceber & { id: string })[]).forEach((c) => {
      (c.parcelas || []).forEach((p) => {
        todas.push({
          contaId: c.id,
          tipo: 'receber',
          descricao: c.descricao || 'Conta a receber',
          numeroParcela: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
          pago: p.pago,
          totalParcelas: c.parcelas.length,
        });
      });
    });
    (contasPagar as (ContaPagar & { id: string })[]).forEach((c) => {
      (c.parcelas || []).forEach((p) => {
        todas.push({
          contaId: c.id,
          tipo: 'pagar',
          descricao: c.descricao || 'Conta a pagar',
          numeroParcela: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
          pago: p.pago,
          totalParcelas: c.parcelas.length,
        });
      });
    });
    return todas.sort((a, b) => toMillis(a.vencimento) - toMillis(b.vencimento));
  }, [contasReceber, contasPagar]);

  const filtradas = filtro === 'todas' ? linhas : linhas.filter((l) => l.tipo === filtro);

  const totalReceber = linhas
    .filter((l) => l.tipo === 'receber' && !l.pago)
    .reduce((s, l) => s + l.valor, 0);
  const totalPagar = linhas
    .filter((l) => l.tipo === 'pagar' && !l.pago)
    .reduce((s, l) => s + l.valor, 0);

  // Marca/desmarca uma parcela como paga, recalculando o status da conta.
  const togglePago = async (linha: LinhaConta) => {
    const colecao = linha.tipo === 'receber' ? contasReceber : contasPagar;
    const update = linha.tipo === 'receber' ? updateReceber : updatePagar;
    const conta = (colecao as any[]).find((c) => c.id === linha.contaId);
    if (!conta) return;
    const parcelas = conta.parcelas.map((p: any) =>
      p.numero === linha.numeroParcela
        ? { ...p, pago: !linha.pago, pagoEm: !linha.pago ? new Date() : null }
        : p
    );
    const todasPagas = parcelas.every((p: any) => p.pago);
    const algumaPaga = parcelas.some((p: any) => p.pago);
    const status = todasPagas ? 'pago' : algumaPaga ? 'parcial' : 'aberto';
    await update(linha.contaId, { parcelas, status, atualizadoEm: new Date() });
  };

  const columns = [
    {
      header: 'Descrição',
      accessor: 'descricao',
      render: (v: string, row: LinhaConta) => (
        <div>
          <p className="text-foreground">{v}</p>
          {row.totalParcelas > 1 && (
            <p className="text-xs text-muted-foreground">
              Parcela {row.numeroParcela}/{row.totalParcelas}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (tipo: Tipo) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            tipo === 'receber' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'
          }`}
        >
          {tipo === 'receber' ? 'A Receber' : 'A Pagar'}
        </span>
      ),
    },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (valor: number, row: LinhaConta) => (
        <span className={row.tipo === 'receber' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
          {row.tipo === 'receber' ? '+' : '-'} {formatBRL(valor)}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      accessor: 'vencimento',
      render: (data: any) => formatData(data),
    },
    {
      header: 'Status',
      accessor: 'pago',
      render: (pago: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            pago ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
          }`}
        >
          {pago ? '✓ Pago' : '⏳ Aberto'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'contaId',
      render: (_: string, row: LinhaConta) => (
        <button
          onClick={() => togglePago(row)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-border hover:bg-background transition-colors"
          title={row.pago ? 'Marcar como aberto' : 'Marcar como pago'}
        >
          <CheckCircle2 className={`w-4 h-4 ${row.pago ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          {row.pago ? 'Reabrir' : 'Baixar'}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground mt-2">Contas a receber e a pagar</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-sm text-muted-foreground">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalReceber)}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm text-muted-foreground">A Pagar</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatBRL(totalPagar)}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-mali-primary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-mali-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Saldo Projetado</span>
          </div>
          <p className={`text-2xl font-bold ${totalReceber - totalPagar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatBRL(totalReceber - totalPagar)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        {[
          { value: 'receber', label: '📥 A Receber' },
          { value: 'pagar', label: '📤 A Pagar' },
          { value: 'todas', label: '📊 Todas' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value as Tipo | 'todas')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filtro === f.value
                ? 'bg-mali-primary text-mali-secondary'
                : 'bg-card border border-border text-foreground hover:bg-background'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Table
        columns={columns}
        data={filtradas}
        loading={loadingR || loadingP}
        emptyMessage="Nenhuma conta encontrada"
      />
    </div>
  );
}
