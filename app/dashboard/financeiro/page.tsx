'use client';

import { useState } from 'react';
import { Table } from '@/components/ui/Table';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface Conta {
  id: string;
  tipo: 'receber' | 'pagar';
  descricao: string;
  valor: number;
  vencimento: Date;
  status: 'aberto' | 'pago' | 'vencido';
}

export default function FinanceiroPage() {
  const [contas, setContas] = useState<Conta[]>([
    {
      id: '1',
      tipo: 'receber',
      descricao: 'Venda - Sofá Linho',
      valor: 1800,
      vencimento: new Date(2026, 6, 10),
      status: 'aberto',
    },
  ]);

  const [filtro, setFiltro] = useState<'receber' | 'pagar' | 'todas'>('todas');

  const filtradas = filtro === 'todas' ? contas : contas.filter((c) => c.tipo === filtro);

  const totalReceber = contas
    .filter((c) => c.tipo === 'receber' && c.status === 'aberto')
    .reduce((sum, c) => sum + c.valor, 0);

  const totalPagar = contas
    .filter((c) => c.tipo === 'pagar' && c.status === 'aberto')
    .reduce((sum, c) => sum + c.valor, 0);

  const columns = [
    { header: 'Descrição', accessor: 'descricao' },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (valor: number, row: Conta) => (
        <span className={row.tipo === 'receber' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
          {row.tipo === 'receber' ? '+' : '-'} R$ {valor.toFixed(2)}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      accessor: 'vencimento',
      render: (data: Date) => new Date(data).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          status === 'pago' ? 'bg-emerald-500/20 text-emerald-600' : 
          status === 'vencido' ? 'bg-red-500/20 text-red-600' :
          'bg-amber-500/20 text-amber-600'
        }`}>
          {status === 'pago' ? '✓ Pago' : status === 'vencido' ? '⚠️ Vencido' : '⏳ Aberto'}
        </span>
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
          <p className="text-2xl font-bold text-emerald-600">R$ {totalReceber.toFixed(2)}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm text-muted-foreground">A Pagar</span>
          </div>
          <p className="text-2xl font-bold text-red-600">R$ {totalPagar.toFixed(2)}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-mali-primary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-mali-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Saldo</span>
          </div>
          <p className={`text-2xl font-bold ${(totalReceber - totalPagar) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            R$ {(totalReceber - totalPagar).toFixed(2)}
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
            onClick={() => setFiltro(f.value as any)}
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

      <Table columns={columns} data={filtradas} emptyMessage="Nenhuma conta encontrada" />
    </div>
  );
}
