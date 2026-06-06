'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAuth, useCollection } from '@/lib/hooks';
import { Atendimento, Produto, Cliente } from '@/types';
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, FileText } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatBRL = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Converte criadoEm (Date | Firestore Timestamp | string) em Date de forma segura.
function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export default function DashboardPage() {
  const { userProfile } = useAuth();
  const { data: atendimentos, loading: atendimentosLoading } = useCollection<Atendimento>('atendimentos');
  const { data: produtos } = useCollection<Produto>('produtos');
  const { data: clientes } = useCollection<Cliente>('clientes');

  const stats = useMemo(() => {
    const vendas = atendimentos.filter((a) => a.tipo === 'venda');
    const orcamentos = atendimentos.filter((a) => a.tipo === 'orcamento');

    const faturamentoTotal = vendas.reduce(
      (acc, v) => acc + (v.resumoVisual?.totalFinal ?? 0),
      0
    );
    const ticketMedio = vendas.length > 0 ? faturamentoTotal / vendas.length : 0;
    const orcamentosPendentes = orcamentos.filter((o) => o.status === 'pendente').length;
    const estoqueCritico = produtos.filter(
      (p) => (p.estoqueAtual ?? 0) <= (p.estoqueMinimo ?? 0)
    ).length;

    // Faturamento mensal do ano corrente
    const anoAtual = new Date().getFullYear();
    const porMes = Array.from({ length: 12 }, (_, i) => ({ month: MESES[i], vendas: 0 }));
    vendas.forEach((v) => {
      const data = toDate(v.criadoEm);
      if (data && data.getFullYear() === anoAtual) {
        porMes[data.getMonth()].vendas += v.resumoVisual?.totalFinal ?? 0;
      }
    });

    return {
      faturamentoTotal,
      ticketMedio,
      orcamentosPendentes,
      estoqueCritico,
      totalClientes: clientes.length,
      chartData: porMes,
    };
  }, [atendimentos, produtos, clientes]);

  const cards = [
    {
      title: 'Faturamento Total',
      value: formatBRL(stats.faturamentoTotal),
      icon: <DollarSign className="w-6 h-6" />,
      bgColor: 'from-mali-primary/20 to-mali-primary/5',
    },
    {
      title: 'Ticket Médio',
      value: formatBRL(stats.ticketMedio),
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: 'from-emerald-500/20 to-emerald-400/5',
    },
    {
      title: 'Orçamentos Pendentes',
      value: `${stats.orcamentosPendentes}`,
      icon: <FileText className="w-6 h-6" />,
      bgColor: 'from-blue-500/20 to-blue-400/5',
    },
    {
      title: 'Estoque Crítico',
      value: `${stats.estoqueCritico} Produto(s)`,
      icon: <AlertTriangle className="w-6 h-6" />,
      bgColor: 'from-orange-500/20 to-orange-400/5',
    },
  ];

  const temDadosGrafico = stats.chartData.some((m) => m.vendas > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bem-vindo, {userProfile?.nome?.split(' ')[0] || 'Usuário'}! 👋
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo do desempenho da sua loja
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-card rounded-lg border border-border p-6">
            <div
              className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.bgColor} flex items-center justify-center mb-4 text-mali-primary`}
            >
              {card.icon}
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-foreground">
              {atendimentosLoading ? '...' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Faturamento Mensal ({new Date().getFullYear()})
        </h2>
        {temDadosGrafico ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value) => (typeof value === 'number' ? formatBRL(value) : value)}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#5A6B7C' }}
              />
              <Legend />
              <Bar dataKey="vendas" name="Faturamento" fill="#D4AF37" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center text-muted-foreground">
            <TrendingUp className="w-10 h-10 mb-3 opacity-40" />
            <p className="font-medium">Ainda não há vendas registradas</p>
            <p className="text-sm">Os dados de faturamento aparecerão aqui conforme as vendas forem finalizadas.</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/produtos"
          className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors"
        >
          <Package className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Produtos</h3>
          <p className="text-sm text-muted-foreground">
            {produtos.length} produto(s) no catálogo
          </p>
        </Link>

        <Link
          href="/dashboard/balcao"
          className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors"
        >
          <Users className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Clientes</h3>
          <p className="text-sm text-muted-foreground">
            {stats.totalClientes} cliente(s) cadastrado(s)
          </p>
        </Link>

        <Link
          href="/dashboard/balcao"
          className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors"
        >
          <DollarSign className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Nova Venda</h3>
          <p className="text-sm text-muted-foreground">Iniciar atendimento no PDV</p>
        </Link>
      </div>
    </div>
  );
}
