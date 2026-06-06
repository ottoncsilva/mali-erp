'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

export default function ApuracaoPage() {
  const [periodo, setPeriodo] = useState('mes'); // mes, trimestre, ano

  // Mock DRE Data
  const dre = {
    receitaBruta: 45000,
    deducoes: 2250, // 5% impostos
    receitaliquida: 42750,
    cmv: 21375, // 50% da receita líquida
    lucroBruto: 21375,
    despesasOperacionais: 8550, // Aluguel, energia, pessoal, etc
    lucroOperacional: 12825,
    despesasFinanceiras: 500,
    lucroLiquido: 12325,
  };

  const margemBruta = ((dre.lucroBruto / dre.receitaliquida) * 100).toFixed(2);
  const margemOperacional = ((dre.lucroOperacional / dre.receitaliquida) * 100).toFixed(2);
  const margemLiquida = ((dre.lucroLiquido / dre.receitaliquida) * 100).toFixed(2);

  const venddasPorMes = [
    { mes: 'Jan', vendas: 35000, lucro: 8750 },
    { mes: 'Fev', vendas: 38000, lucro: 9500 },
    { mes: 'Mar', vendas: 40000, lucro: 10000 },
    { mes: 'Abr', vendas: 42000, lucro: 10500 },
    { mes: 'Mai', vendas: 44000, lucro: 11000 },
    { mes: 'Jun', vendas: 45000, lucro: 12325 },
  ];

  const margemPorProduto = [
    { produto: 'Sofá', margem: 52, vendas: 15000 },
    { produto: 'Poltronas', margem: 48, vendas: 12000 },
    { produto: 'Mesas', margem: 45, vendas: 10000 },
    { produto: 'Racks', margem: 50, vendas: 8000 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Apuração de Resultado (DRE)</h1>
        <p className="text-muted-foreground mt-2">Demonstração do Resultado do Exercício</p>
      </div>

      {/* Período */}
      <div className="flex gap-3">
        {[
          { value: 'mes', label: '📅 Este Mês' },
          { value: 'trimestre', label: '📊 Este Trimestre' },
          { value: 'ano', label: '📈 Este Ano' },
        ].map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriodo(p.value)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              periodo === p.value
                ? 'bg-mali-primary text-mali-secondary'
                : 'bg-card border border-border text-foreground hover:bg-background'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* DRE Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">DEMONSTRAÇÃO DO RESULTADO</h2>

          <div className="space-y-3">
            {/* Receita */}
            <div className="flex justify-between items-center p-3 bg-background rounded">
              <span className="text-sm text-muted-foreground">RECEITA BRUTA</span>
              <span className="text-lg font-semibold text-foreground">R$ {dre.receitaBruta.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-background rounded text-red-600">
              <span className="text-sm">(-) Deduções (Impostos)</span>
              <span className="font-semibold">-R$ {dre.deducoes.toFixed(2)}</span>
            </div>

            <div className="h-px bg-mali-primary/30 my-2"></div>

            <div className="flex justify-between items-center p-3 bg-background rounded">
              <span className="text-sm font-semibold">RECEITA LÍQUIDA</span>
              <span className="text-lg font-bold text-mali-primary">R$ {dre.receitaliquida.toFixed(2)}</span>
            </div>

            {/* CMV */}
            <div className="flex justify-between items-center p-3 bg-background rounded text-red-600">
              <span className="text-sm">(-) CMV (Custo da Mercadoria Vendida)</span>
              <span className="font-semibold">-R$ {dre.cmv.toFixed(2)}</span>
            </div>

            <div className="h-px bg-mali-primary/30 my-2"></div>

            <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded border border-emerald-500/20">
              <span className="text-sm font-semibold text-emerald-600">(=) LUCRO BRUTO</span>
              <span className="text-lg font-bold text-emerald-600">R$ {dre.lucroBruto.toFixed(2)}</span>
            </div>

            {/* Despesas */}
            <div className="flex justify-between items-center p-3 bg-background rounded text-red-600">
              <span className="text-sm">(-) Despesas Operacionais</span>
              <span className="font-semibold">-R$ {dre.despesasOperacionais.toFixed(2)}</span>
            </div>

            <div className="h-px bg-mali-primary/30 my-2"></div>

            <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded border border-blue-500/20">
              <span className="text-sm font-semibold text-blue-600">(=) LUCRO OPERACIONAL</span>
              <span className="text-lg font-bold text-blue-600">R$ {dre.lucroOperacional.toFixed(2)}</span>
            </div>

            {/* Resultado Final */}
            <div className="flex justify-between items-center p-3 bg-background rounded text-red-600">
              <span className="text-sm">(-) Despesas Financeiras</span>
              <span className="font-semibold">-R$ {dre.despesasFinanceiras.toFixed(2)}</span>
            </div>

            <div className="h-px bg-mali-primary/30 my-2"></div>

            <div className="flex justify-between items-center p-4 bg-mali-primary/10 rounded-lg border-2 border-mali-primary">
              <span className="text-lg font-bold text-mali-primary">(=) LUCRO LÍQUIDO</span>
              <span className="text-2xl font-bold text-mali-primary">R$ {dre.lucroLiquido.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Margens */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-sm text-muted-foreground">Margem Bruta</span>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{margemBruta}%</p>
          <p className="text-xs text-muted-foreground mt-2">Do faturamento líquido</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">Margem Operacional</span>
          </div>
          <p className="text-3xl font-bold text-blue-600">{margemOperacional}%</p>
          <p className="text-xs text-muted-foreground mt-2">Após despesas operacionais</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-mali-primary/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-mali-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Margem Líquida</span>
          </div>
          <p className="text-3xl font-bold text-mali-primary">{margemLiquida}%</p>
          <p className="text-xs text-muted-foreground mt-2">Lucro final</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas e Lucro */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Evolução de Vendas e Lucro</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={venddasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a4b5c" />
              <XAxis dataKey="mes" stroke="#5a6b7c" />
              <YAxis stroke="#5a6b7c" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2a3a', border: '1px solid #3a4b5c', borderRadius: '8px' }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Legend />
              <Bar dataKey="vendas" fill="#D4AF37" radius={[8, 8, 0, 0]} />
              <Bar dataKey="lucro" fill="#5A6B7C" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Margem por Produto */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="font-semibold text-foreground mb-4">Margem por Categoria</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={margemPorProduto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a4b5c" />
              <XAxis dataKey="produto" stroke="#5a6b7c" />
              <YAxis stroke="#5a6b7c" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a2a3a', border: '1px solid #3a4b5c', borderRadius: '8px' }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Bar dataKey="margem" fill="#D4AF37" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Análise */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-600 mb-1">📊 Análise do Período</p>
            <p className="text-sm text-blue-600">
              Margem bruta de {margemBruta}% indica boa precificação. Foco em reduzir despesas operacionais para melhorar
              a margem líquida de {margemLiquida}%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
