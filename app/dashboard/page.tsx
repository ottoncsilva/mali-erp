'use client';

import { useAuth } from '@/lib/hooks';
import { TrendingUp, Package, Users, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function DashboardPage() {
  const { userProfile } = useAuth();

  const mockData = [
    { month: 'Jan', vendas: 4000, lucro: 2400 },
    { month: 'Fev', vendas: 3000, lucro: 1398 },
    { month: 'Mar', vendas: 2000, lucro: 9800 },
    { month: 'Abr', vendas: 2780, lucro: 3908 },
    { month: 'Mai', vendas: 1890, lucro: 4800 },
    { month: 'Jun', vendas: 2390, lucro: 3800 },
  ];

  const cards = [
    {
      title: 'Faturamento Hoje',
      value: 'R$ 12.450,00',
      change: '+12%',
      icon: <DollarSign className="w-6 h-6" />,
      bgColor: 'from-mali-primary/20 to-mali-primary-light/20',
    },
    {
      title: 'Ticket Médio',
      value: 'R$ 1.245,00',
      change: '+5%',
      icon: <TrendingUp className="w-6 h-6" />,
      bgColor: 'from-emerald-500/20 to-emerald-400/20',
    },
    {
      title: 'Estoque Crítico',
      value: '5 Produtos',
      change: '-2',
      icon: <AlertTriangle className="w-6 h-6" />,
      bgColor: 'from-orange-500/20 to-orange-400/20',
    },
    {
      title: 'Entregas Hoje',
      value: '3 Agendadas',
      change: '+1',
      icon: <Calendar className="w-6 h-6" />,
      bgColor: 'from-blue-500/20 to-blue-400/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bem-vindo, {userProfile?.nome.split(' ')[0]}! 👋
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo do desempenho da sua loja
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-card rounded-lg border border-border p-6">
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.bgColor} flex items-center justify-center mb-4 text-mali-primary`}>
              {card.icon}
            </div>
            <h3 className="text-sm text-muted-foreground mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-foreground mb-2">{card.value}</p>
            <p className="text-xs text-emerald-600">{card.change} vs ontem</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Faturamento Mensal</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a4b5c" />
              <XAxis dataKey="month" stroke="#5a6b7c" />
              <YAxis stroke="#5a6b7c" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2a3a',
                  border: '1px solid #3a4b5c',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Legend />
              <Bar dataKey="vendas" fill="#D4AF37" radius={[8, 8, 0, 0]} />
              <Bar dataKey="lucro" fill="#5A6B7C" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Chart */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Tendência de Lucro</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3a4b5c" />
              <XAxis dataKey="month" stroke="#5a6b7c" />
              <YAxis stroke="#5a6b7c" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a2a3a',
                  border: '1px solid #3a4b5c',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#d4af37' }}
              />
              <Line
                type="monotone"
                dataKey="lucro"
                stroke="#D4AF37"
                strokeWidth={2}
                dot={{ fill: '#D4AF37' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors cursor-pointer">
          <Package className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Novo Produto</h3>
          <p className="text-sm text-muted-foreground">Adicionar produto ao catálogo</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors cursor-pointer">
          <Users className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Novo Cliente</h3>
          <p className="text-sm text-muted-foreground">Cadastrar cliente na base</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors cursor-pointer">
          <DollarSign className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Nova Venda</h3>
          <p className="text-sm text-muted-foreground">Iniciar atendimento no PDV</p>
        </div>
      </div>
    </div>
  );
}
