'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth, useCollection } from '@/lib/hooks';
import { Atendimento, Produto, Cliente, Meta, Usuario } from '@/types';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  DollarSign,
  AlertTriangle,
  FileText,
  Target,
  Filter,
  Loader2,
} from 'lucide-react';
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
import { Modal } from '@/components/ui/Modal';
import { formatBRL } from '@/lib/utils/format';
import { toDate, dentroDoPeriodo, intervaloMes, MESES_CURTOS, MESES_LONGOS } from '@/lib/utils/datas';

export default function DashboardPage() {
  const { userProfile, can } = useAuth();
  const podeVerCompleto = can('dashboard.completo');

  const { data: atendimentos, loading: atendimentosLoading } = useCollection<Atendimento>('atendimentos');
  const { data: produtos } = useCollection<Produto>('produtos');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { data: metas } = useCollection<Meta>('metas');
  const { data: colaboradores } = useCollection<Usuario>('usuarios');

  const [modalMetaOpen, setModalMetaOpen] = useState(false);

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  const stats = useMemo(() => {
    const vendas = atendimentos.filter((a) => a.tipo === 'venda');
    const orcamentos = atendimentos.filter((a) => a.tipo === 'orcamento');

    const faturamentoTotal = vendas.reduce((acc, v) => acc + (v.resumoVisual?.totalFinal ?? 0), 0);
    const ticketMedio = vendas.length > 0 ? faturamentoTotal / vendas.length : 0;
    const orcamentosPendentes = orcamentos.filter((o) => o.status === 'pendente').length;
    const estoqueCritico = produtos.filter((p) => (p.estoqueAtual ?? 0) <= (p.estoqueMinimo ?? 0)).length;

    // Faturamento mensal do ano corrente
    const porMes = Array.from({ length: 12 }, (_, i) => ({ month: MESES_CURTOS[i], vendas: 0 }));
    vendas.forEach((v) => {
      const data = toDate(v.criadoEm);
      if (data && data.getFullYear() === anoAtual) {
        porMes[data.getMonth()].vendas += v.resumoVisual?.totalFinal ?? 0;
      }
    });

    // ===== Comparativo: mês atual vs mês anterior =====
    const intervAtual = intervaloMes(anoAtual, mesAtual);
    const baseAnterior = new Date(anoAtual, mesAtual - 1, 1);
    const intervAnterior = intervaloMes(baseAnterior.getFullYear(), baseAnterior.getMonth());

    const fatMesAtual = vendas
      .filter((v) => dentroDoPeriodo(toDate(v.criadoEm), intervAtual.inicio, intervAtual.fim))
      .reduce((s, v) => s + (v.resumoVisual?.totalFinal ?? 0), 0);
    const fatMesAnterior = vendas
      .filter((v) => dentroDoPeriodo(toDate(v.criadoEm), intervAnterior.inicio, intervAnterior.fim))
      .reduce((s, v) => s + (v.resumoVisual?.totalFinal ?? 0), 0);
    const crescimento = fatMesAnterior > 0 ? ((fatMesAtual - fatMesAnterior) / fatMesAnterior) * 100 : 0;

    // ===== Funil de conversão (orçamentos criados no ano) =====
    const orcamentosAno = orcamentos.filter((o) => {
      const d = toDate(o.criadoEm);
      return d && d.getFullYear() === anoAtual;
    });
    const totalOrcamentos = orcamentosAno.length;
    const aprovados = orcamentosAno.filter((o) =>
      ['aprovado', 'convertido', 'finalizado'].includes(o.status)
    ).length;
    const vendasAno = vendas.filter((v) => {
      const d = toDate(v.criadoEm);
      return d && d.getFullYear() === anoAtual;
    }).length;
    const taxaConversao = totalOrcamentos > 0 ? (vendasAno / totalOrcamentos) * 100 : 0;

    // ===== Top produtos vendidos (por faturamento, ano) =====
    const accProd: Record<string, { nome: string; qtd: number; faturamento: number }> = {};
    vendas
      .filter((v) => {
        const d = toDate(v.criadoEm);
        return d && d.getFullYear() === anoAtual;
      })
      .forEach((v) => {
        (v.itens || []).forEach((item) => {
          if (!accProd[item.produtoId]) {
            accProd[item.produtoId] = { nome: item.nome, qtd: 0, faturamento: 0 };
          }
          accProd[item.produtoId].qtd += item.qtd;
          accProd[item.produtoId].faturamento += item.precoAplicado * item.qtd;
        });
      });
    const topProdutos = Object.values(accProd)
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 5);

    return {
      faturamentoTotal,
      ticketMedio,
      orcamentosPendentes,
      estoqueCritico,
      totalClientes: clientes.length,
      chartData: porMes,
      fatMesAtual,
      fatMesAnterior,
      crescimento,
      funil: { totalOrcamentos, aprovados, vendasAno, taxaConversao },
      topProdutos,
    };
  }, [atendimentos, produtos, clientes, anoAtual, mesAtual]);

  // ===== Meta do mês (loja) e progresso =====
  const metaDoMes = useMemo(() => {
    const m = metas.find((x) => x.ano === anoAtual && x.mes === mesAtual && !x.vendedorId);
    return m?.valorMeta ?? 0;
  }, [metas, anoAtual, mesAtual]);

  const progressoMeta = metaDoMes > 0 ? Math.min(100, (stats.fatMesAtual / metaDoMes) * 100) : 0;

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Bem-vindo, {userProfile?.nome?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground">Aqui está um resumo do desempenho da sua loja</p>
        </div>
        {podeVerCompleto && (
          <button
            onClick={() => setModalMetaOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-md text-sm font-medium text-foreground hover:bg-background transition-colors"
          >
            <Target className="w-4 h-4 text-mali-primary" />
            Definir Metas
          </button>
        )}
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

      {/* Meta do mês + Comparativo + Funil */}
      {podeVerCompleto && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Meta do mês */}
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Target className="w-5 h-5 text-mali-primary" />
                Meta de {MESES_LONGOS[mesAtual]}
              </h3>
            </div>
            {metaDoMes > 0 ? (
              <>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-2xl font-bold text-mali-primary">{formatBRL(stats.fatMesAtual)}</span>
                  <span className="text-sm text-muted-foreground">de {formatBRL(metaDoMes)}</span>
                </div>
                <div className="w-full h-3 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-mali-primary to-mali-primary-dark rounded-full transition-all"
                    style={{ width: `${progressoMeta}%` }}
                  />
                </div>
                <p className="text-sm mt-2 text-muted-foreground">
                  <span className={`font-semibold ${progressoMeta >= 100 ? 'text-emerald-600' : 'text-foreground'}`}>
                    {progressoMeta.toFixed(0)}%
                  </span>{' '}
                  da meta atingida
                </p>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Nenhuma meta definida para este mês.</p>
                <button
                  onClick={() => setModalMetaOpen(true)}
                  className="text-sm text-mali-primary hover:underline font-medium"
                >
                  Definir meta agora
                </button>
              </div>
            )}
          </div>

          {/* Comparativo */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Comparativo Mensal</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{MESES_LONGOS[mesAtual]}</span>
                <span className="font-semibold text-foreground">{formatBRL(stats.fatMesAtual)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  {MESES_LONGOS[(mesAtual + 11) % 12]}
                </span>
                <span className="font-semibold text-muted-foreground">{formatBRL(stats.fatMesAnterior)}</span>
              </div>
              <div className="h-px bg-border my-2" />
              <div
                className={`flex items-center gap-2 ${
                  stats.crescimento >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {stats.crescimento >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="text-xl font-bold">
                  {stats.crescimento >= 0 ? '+' : ''}
                  {stats.crescimento.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">vs. mês anterior</span>
              </div>
            </div>
          </div>

          {/* Funil de conversão */}
          <div className="bg-card rounded-lg border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Funil de Conversão ({anoAtual})</h3>
            <div className="space-y-2">
              <FunilBarra
                label="Orçamentos"
                valor={stats.funil.totalOrcamentos}
                max={stats.funil.totalOrcamentos}
                cor="bg-blue-500"
              />
              <FunilBarra
                label="Aprovados"
                valor={stats.funil.aprovados}
                max={stats.funil.totalOrcamentos}
                cor="bg-amber-500"
              />
              <FunilBarra
                label="Vendas"
                valor={stats.funil.vendasAno}
                max={stats.funil.totalOrcamentos}
                cor="bg-emerald-500"
              />
            </div>
            <p className="text-sm mt-4 text-muted-foreground">
              Taxa de conversão:{' '}
              <span className="font-bold text-mali-primary">{stats.funil.taxaConversao.toFixed(1)}%</span>
            </p>
          </div>
        </div>
      )}

      {/* Chart + Top Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Faturamento Mensal ({anoAtual})</h2>
          {temDadosGrafico ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  formatter={(value) => (typeof value === 'number' ? formatBRL(value) : value)}
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
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

        {/* Top produtos */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Top Produtos ({anoAtual})</h2>
          {stats.topProdutos.length > 0 ? (
            <div className="space-y-3">
              {stats.topProdutos.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-mali-primary/10 text-mali-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground">{p.qtd} un. vendidas</p>
                  </div>
                  <span className="text-sm font-semibold text-mali-primary whitespace-nowrap">
                    {formatBRL(p.faturamento)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-center text-muted-foreground">
              <Package className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">Sem vendas no período</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/produtos"
          className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors"
        >
          <Package className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Produtos</h3>
          <p className="text-sm text-muted-foreground">{produtos.length} produto(s) no catálogo</p>
        </Link>

        <Link
          href="/dashboard/clientes"
          className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors"
        >
          <Users className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Clientes</h3>
          <p className="text-sm text-muted-foreground">{stats.totalClientes} cliente(s) cadastrado(s)</p>
        </Link>

        <Link
          href="/dashboard/orcamentos"
          className="bg-card rounded-lg border border-border p-6 hover:border-mali-primary/50 transition-colors"
        >
          <DollarSign className="w-6 h-6 text-mali-primary mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Novo Orçamento</h3>
          <p className="text-sm text-muted-foreground">Abrir o PDV e gerar orçamento</p>
        </Link>
      </div>

      {/* Modal de metas */}
      {modalMetaOpen && (
        <ModalMetas
          isOpen={modalMetaOpen}
          onClose={() => setModalMetaOpen(false)}
          ano={anoAtual}
          mes={mesAtual}
          metas={metas}
          colaboradores={colaboradores}
        />
      )}
    </div>
  );
}

function FunilBarra({ label, valor, max, cor }: { label: string; valor: number; max: number; cor: string }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{valor}</span>
      </div>
      <div className="w-full h-2 bg-background rounded-full overflow-hidden">
        <div className={`h-full ${cor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ModalMetas({
  isOpen,
  onClose,
  ano,
  mes,
  metas,
  colaboradores,
}: {
  isOpen: boolean;
  onClose: () => void;
  ano: number;
  mes: number;
  metas: (Meta & { id: string })[];
  colaboradores: (Usuario & { id: string })[];
}) {
  const metaLoja = metas.find((m) => m.ano === ano && m.mes === mes && !m.vendedorId);
  const [valorLoja, setValorLoja] = useState<number>(metaLoja?.valorMeta ?? 0);
  const [metasVendedor, setMetasVendedor] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    metas
      .filter((m) => m.ano === ano && m.mes === mes && m.vendedorId)
      .forEach((m) => {
        if (m.vendedorId) init[m.vendedorId] = m.valorMeta;
      });
    return init;
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const vendedores = colaboradores.filter(
    (c) => c.ativo !== false && (c.perfil === 'vendedor' || c.perfil === 'gerencia')
  );

  const salvar = async () => {
    setErro('');
    setSalvando(true);
    try {
      // Meta da loja
      await setDoc(
        doc(db, 'metas', `${ano}-${mes}`),
        { ano, mes, valorMeta: valorLoja, atualizadoEm: new Date() },
        { merge: true }
      );
      // Metas por vendedor
      for (const v of vendedores) {
        const valor = metasVendedor[v.id] ?? 0;
        await setDoc(
          doc(db, 'metas', `${v.id}_${ano}-${mes}`),
          {
            ano,
            mes,
            vendedorId: v.id,
            vendedorNome: v.nome,
            valorMeta: valor,
            atualizadoEm: new Date(),
          },
          { merge: true }
        );
      }
      onClose();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar metas');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title={`Metas de ${MESES_LONGOS[mes]} / ${ano}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
            <Target className="w-4 h-4 text-mali-primary" />
            Meta da Loja (R$)
          </label>
          <input
            type="number"
            step="0.01"
            value={valorLoja || ''}
            onChange={(e) => setValorLoja(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            placeholder="Ex: 50000"
          />
        </div>

        {vendedores.length > 0 && (
          <div>
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-mali-primary" />
              Metas por Vendedor (opcional)
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {vendedores.map((v) => (
                <div key={v.id} className="flex items-center gap-3">
                  <span className="text-sm text-foreground flex-1 truncate">{v.nome}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={metasVendedor[v.id] || ''}
                    onChange={(e) =>
                      setMetasVendedor({ ...metasVendedor, [v.id]: parseFloat(e.target.value) || 0 })
                    }
                    className="w-40 px-3 py-1.5 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
                    placeholder="R$ 0,00"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-background"
          >
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Metas
          </button>
        </div>
      </div>
    </Modal>
  );
}
