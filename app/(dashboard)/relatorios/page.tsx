'use client';

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download, Filter } from 'lucide-react';
import { Table } from '@/components/ui/Table';

const COLORS = ['#D4AF37', '#5A6B7C', '#10B981', '#F59E0B', '#EF4444'];

export default function RelatoriosPage() {
  const [filtroTipo, setFiltroTipo] = useState('vendas');
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes');

  const vendaVendedor = [
    { vendedor: 'Carlos Silva', vendas: 18500, comissao: 925 },
    { vendedor: 'Ana Santos', vendas: 16000, comissao: 800 },
    { vendedor: 'João Pedro', vendas: 12500, comissao: 625 },
    { vendedor: 'Maria Costa', vendas: 11000, comissao: 550 },
  ];

  const vendaProduto = [
    { nome: 'Sofá', quantidade: 45, faturamento: 15000 },
    { nome: 'Poltrona', quantidade: 30, faturamento: 12000 },
    { nome: 'Mesa', quantidade: 25, faturamento: 10000 },
    { nome: 'Rack', quantidade: 20, faturamento: 8000 },
  ];

  const categorias = [
    { name: 'Sala', value: 35000 },
    { name: 'Quarto', value: 22000 },
    { name: 'Escritório', value: 18000 },
    { name: 'Cozinha', value: 12000 },
  ];

  const topTecidos = [
    { tecido: 'Linho Cinza', quantidade: 35 },
    { tecido: 'Suede Bege', quantidade: 28 },
    { tecido: 'Couro Preto', quantidade: 22 },
    { tecido: 'Linho Branco', quantidade: 18 },
  ];

  const mediasVendedor = [
    { vendedor: 'Carlos Silva', ticket: 2350, conversao: 72 },
    { vendedor: 'Ana Santos', ticket: 2000, conversao: 68 },
    { vendedor: 'João Pedro', ticket: 1785, conversao: 65 },
    { vendedor: 'Maria Costa', ticket: 1650, conversao: 62 },
  ];

  const colunas = [
    { header: 'Categoria', accessor: 'nome' },
    { header: 'Valor', accessor: 'value', render: (val: number) => `R$ ${val.toFixed(2)}` },
  ];

  const colunasVendedor = [
    { header: 'Vendedor', accessor: 'vendedor' },
    { header: 'Vendas', accessor: 'vendas', render: (val: number) => `R$ ${val.toFixed(2)}` },
    { header: 'Comissão', accessor: 'comissao', render: (val: number) => `R$ ${val.toFixed(2)}` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
        <p className="text-muted-foreground mt-2">Análise de vendas e desempenho</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        {[
          { value: 'vendas', label: '📊 Vendas' },
          { value: 'produtos', label: '📦 Produtos' },
          { value: 'vendedor', label: '👥 Vendedores' },
          { value: 'tecidos', label: '🎨 Acabamentos' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroTipo(f.value)}
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
          { value: 'semana', label: '📅 Semana' },
          { value: 'mes', label: '📅 Mês' },
          { value: 'trimestre', label: '📊 Trimestre' },
          { value: 'ano', label: '📈 Ano' },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setFiltroPeriodo(p.value)}
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

      {/* Conteúdo por Tipo */}
      {filtroTipo === 'vendas' && (
        <div className="space-y-6">
          {/* Gráfico de Categorias */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Vendas por Categoria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categorias}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: R$ ${value.toFixed(0)}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => (typeof val === 'number' ? `R$ ${val.toFixed(2)}` : val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Top Categorias</h3>
              <Table columns={colunas} data={categorias} />
            </div>
          </div>
        </div>
      )}

      {filtroTipo === 'produtos' && (
        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Produtos Mais Vendidos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendaProduto}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3a4b5c" />
                <XAxis dataKey="nome" stroke="#5a6b7c" />
                <YAxis stroke="#5a6b7c" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a2a3a', border: '1px solid #3a4b5c' }}
                  labelStyle={{ color: '#d4af37' }}
                />
                <Legend />
                <Bar dataKey="quantidade" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                <Bar dataKey="faturamento" fill="#5A6B7C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {filtroTipo === 'vendedor' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Vendas por Vendedor</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={vendaVendedor}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3a4b5c" />
                  <XAxis dataKey="vendedor" angle={-45} textAnchor="end" height={100} stroke="#5a6b7c" />
                  <YAxis stroke="#5a6b7c" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a2a3a', border: '1px solid #3a4b5c' }}
                    labelStyle={{ color: '#d4af37' }}
                  />
                  <Bar dataKey="vendas" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Comissões</h3>
              <Table columns={colunasVendedor} data={vendaVendedor} />
            </div>
          </div>

          {/* Métricas de Vendedor */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Ticket Médio & Taxa de Conversão</h3>
              <div className="space-y-2">
                {mediasVendedor.map((v, idx) => (
                  <div key={idx} className="p-3 bg-background rounded flex justify-between items-center">
                    <span className="font-medium text-foreground">{v.vendedor}</span>
                    <div className="flex gap-6 text-sm">
                      <span className="text-muted-foreground">
                        Ticket: <span className="font-semibold text-mali-primary">R$ {v.ticket.toFixed(2)}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Conversão: <span className="font-semibold text-emerald-600">{v.conversao}%</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {filtroTipo === 'tecidos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Acabamentos Mais Solicitados</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topTecidos}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3a4b5c" />
                  <XAxis dataKey="tecido" angle={-45} textAnchor="end" height={100} stroke="#5a6b7c" />
                  <YAxis stroke="#5a6b7c" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a2a3a', border: '1px solid #3a4b5c' }}
                    labelStyle={{ color: '#d4af37' }}
                  />
                  <Bar dataKey="quantidade" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Top Acabamentos</h3>
              <div className="space-y-2">
                {topTecidos.map((t, idx) => (
                  <div key={idx} className="p-3 bg-background rounded flex justify-between items-center">
                    <span className="text-foreground">{t.tecido}</span>
                    <span className="font-semibold text-mali-primary">{t.quantidade} unidades</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botão de Download */}
      <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all font-semibold">
        <Download className="w-4 h-4" />
        Exportar Relatório (PDF)
      </button>
    </div>
  );
}
