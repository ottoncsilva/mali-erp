'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Loader2, AlertCircle } from 'lucide-react';
import { Table } from '@/components/ui/Table';
import { useCollection } from '@/lib/hooks';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Atendimento, Produto, Categoria, Usuario } from '@/types';
import { intervaloPeriodo } from '@/lib/financeiro/dre';
import { formatBRL } from '@/lib/utils/format';

const COLORS = ['#D4AF37', '#5A6B7C', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

type Periodo = 'mes' | 'trimestre' | 'ano';
type TipoRelatorio = 'vendas' | 'produtos' | 'vendedor';

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function RelatoriosContent() {
  const [filtroTipo, setFiltroTipo] = useState<TipoRelatorio>('vendas');
  const [filtroPeriodo, setFiltroPeriodo] = useState<Periodo>('mes');

  const { data: atendimentos, loading: loadingA } = useCollection<Atendimento>('atendimentos');
  const { data: produtos, loading: loadingP } = useCollection<Produto>('produtos');
  const { data: categoriasCat } = useCollection<Categoria>('categorias');
  const { data: colaboradores } = useCollection<Usuario>('usuarios');

  const loading = loadingA || loadingP;

  const { inicio, fim } = useMemo(() => intervaloPeriodo(filtroPeriodo), [filtroPeriodo]);

  // Vendas finalizadas no período.
  const vendas = useMemo(() => {
    return (atendimentos as (Atendimento & { id: string })[]).filter((a) => {
      if (a.tipo !== 'venda') return false;
      const data = toDate((a as any).criadoEm);
      return data && data >= inicio && data <= fim;
    });
  }, [atendimentos, inicio, fim]);

  // Vendas por categoria de produto.
  const porCategoria = useMemo(() => {
    const prodMap = new Map(produtos.map((p) => [p.id, p]));
    const catMap = new Map(categoriasCat.map((c) => [c.id, c.nome]));
    const acc: Record<string, number> = {};
    for (const v of vendas) {
      for (const item of v.itens || []) {
        const prod = prodMap.get(item.produtoId);
        const catId = (prod as any)?.categoriaId || 'sem_categoria';
        const nome = catMap.get(catId) || 'Sem Categoria';
        acc[nome] = (acc[nome] || 0) + item.precoAplicado * item.qtd;
      }
    }
    return Object.entries(acc)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [vendas, produtos, categoriasCat]);

  // Produtos mais vendidos.
  const porProduto = useMemo(() => {
    const acc: Record<string, { nome: string; quantidade: number; faturamento: number }> = {};
    for (const v of vendas) {
      for (const item of v.itens || []) {
        if (!acc[item.produtoId]) {
          acc[item.produtoId] = { nome: item.nome, quantidade: 0, faturamento: 0 };
        }
        acc[item.produtoId].quantidade += item.qtd;
        acc[item.produtoId].faturamento += item.precoAplicado * item.qtd;
      }
    }
    return Object.values(acc)
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10);
  }, [vendas]);

  // Vendas por vendedor.
  const porVendedor = useMemo(() => {
    const colabMap = new Map(colaboradores.map((c) => [c.uid || (c as any).id, c.nome]));
    const acc: Record<string, { vendedor: string; vendas: number; qtdVendas: number }> = {};
    for (const v of vendas) {
      const id = v.vendedorId || 'sem_vendedor';
      const nome = colabMap.get(id) || 'Não identificado';
      if (!acc[id]) acc[id] = { vendedor: nome, vendas: 0, qtdVendas: 0 };
      acc[id].vendas += v.resumoVisual?.totalFinal || 0;
      acc[id].qtdVendas += 1;
    }
    return Object.values(acc)
      .map((v) => ({ ...v, ticket: v.qtdVendas > 0 ? v.vendas / v.qtdVendas : 0 }))
      .sort((a, b) => b.vendas - a.vendas);
  }, [vendas, colaboradores]);

  const totalFaturamento = vendas.reduce((s, v) => s + (v.resumoVisual?.totalFinal || 0), 0);
  const ticketMedio = vendas.length > 0 ? totalFaturamento / vendas.length : 0;

  const colunasCategoria = [
    { header: 'Categoria', accessor: 'name' },
    { header: 'Faturamento', accessor: 'value', render: (val: number) => formatBRL(val) },
  ];

  const colunasVendedor = [
    { header: 'Vendedor', accessor: 'vendedor' },
    { header: 'Faturamento', accessor: 'vendas', render: (val: number) => formatBRL(val) },
    { header: 'Nº Vendas', accessor: 'qtdVendas' },
    { header: 'Ticket Médio', accessor: 'ticket', render: (val: number) => formatBRL(val) },
  ];

  const semVendas = vendas.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Análise de vendas e desempenho — dados reais</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Faturamento</p>
          <p className="text-2xl font-bold text-mali-primary">{formatBRL(totalFaturamento)}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Nº de Vendas</p>
          <p className="text-2xl font-bold text-foreground">{vendas.length}</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">Ticket Médio</p>
          <p className="text-2xl font-bold text-emerald-600">{formatBRL(ticketMedio)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        {[
          { value: 'vendas', label: '📊 Vendas' },
          { value: 'produtos', label: '📦 Produtos' },
          { value: 'vendedor', label: '👥 Vendedores' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroTipo(f.value as TipoRelatorio)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filtroTipo === f.value
                ? 'bg-mali-primary text-mali-secondary'
                : 'bg-card border border-border text-foreground hover:bg-background'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Período */}
      <div className="flex gap-3">
        {[
          { value: 'mes', label: '📅 Mês' },
          { value: 'trimestre', label: '📊 Trimestre' },
          { value: 'ano', label: '📈 Ano' },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setFiltroPeriodo(p.value as Periodo)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              filtroPeriodo === p.value
                ? 'bg-background border-2 border-mali-primary text-mali-primary'
                : 'bg-background border border-border text-foreground hover:bg-card'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : semVendas ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-600">
            Nenhuma venda finalizada no período selecionado.
          </p>
        </div>
      ) : (
        <>
          {filtroTipo === 'vendas' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Vendas por Categoria</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={porCategoria}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatBRL(value as number)}`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {porCategoria.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val) => (typeof val === 'number' ? formatBRL(val) : val)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Top Categorias</h3>
                <Table columns={colunasCategoria} data={porCategoria} />
              </div>
            </div>
          )}

          {filtroTipo === 'produtos' && (
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Produtos Mais Vendidos</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={porProduto}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="nome" angle={-30} textAnchor="end" height={100} stroke="#5a6b7c" />
                  <YAxis stroke="#5a6b7c" />
                  <Tooltip formatter={(v) => formatBRL(Number(v))} />
                  <Legend />
                  <Bar dataKey="quantidade" name="Qtd" fill="#5A6B7C" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="faturamento" name="Faturamento" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {filtroTipo === 'vendedor' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Faturamento por Vendedor</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={porVendedor}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="vendedor" angle={-45} textAnchor="end" height={100} stroke="#5a6b7c" />
                    <YAxis stroke="#5a6b7c" />
                    <Tooltip formatter={(v) => formatBRL(Number(v))} />
                    <Bar dataKey="vendas" name="Faturamento" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card rounded-lg border border-border p-6">
                <h3 className="font-semibold text-foreground mb-4">Detalhamento</h3>
                <Table columns={colunasVendedor} data={porVendedor} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RelatoriosPage() {
  return (
    <ProtegerPagina permissao="financeiro.acessar">
      <RelatoriosContent />
    </ProtegerPagina>
  );
}
