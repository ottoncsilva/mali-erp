'use client';

import { useMemo, useState } from 'react';
import { useCollection, useAuth } from '@/lib/hooks';
import { Table } from '@/components/ui/Table';
import { TransferenciaModal } from '@/components/modules/estoque/TransferenciaModal';
import { AjusteModal } from '@/components/modules/estoque/AjusteModal';
import { LOCALIZACOES, LOCALIZACOES_DISPONIVEIS } from '@/types';
import type { EstoqueItem, Produto, MovimentacaoEstoque, LocalizacaoEstoque } from '@/types';
import { formatData } from '@/lib/utils/format';
import { Boxes, Truck, AlertTriangle, PackageCheck, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';

interface LinhaEstoque {
  id: string;
  nome: string;
  sku: string;
  estoqueMinimo: number;
  saldos: Record<LocalizacaoEstoque, number>;
  total: number;
  disponivel: number;
  abaixoMinimo: boolean;
}

const LOCAIS = Object.keys(LOCALIZACOES) as LocalizacaoEstoque[];

export default function EstoquePage() {
  const { userProfile } = useAuth();
  const { data: estoque, loading: loadingEstoque } = useCollection<EstoqueItem>('estoque');
  const { data: produtos, loading: loadingProdutos } = useCollection<Produto>('produtos');
  const { data: movimentacoes, loading: loadingMov } = useCollection<MovimentacaoEstoque>('movimentacoes_estoque');

  const [aba, setAba] = useState<'saldos' | 'movimentacoes'>('saldos');
  const [transferindo, setTransferindo] = useState<LinhaEstoque | null>(null);
  const [ajustando, setAjustando] = useState<LinhaEstoque | null>(null);
  const [filtro, setFiltro] = useState('');

  // Agrupa saldos por produto.
  const linhas = useMemo<LinhaEstoque[]>(() => {
    return produtos.map((p) => {
      const itens = estoque.filter((e) => e.produtoId === p.id);
      const saldos = LOCAIS.reduce((acc, l) => {
        acc[l] = itens.filter((i) => i.localizacao === l).reduce((s, i) => s + (i.quantidade || 0), 0);
        return acc;
      }, {} as Record<LocalizacaoEstoque, number>);
      const total = LOCAIS.reduce((s, l) => s + saldos[l], 0);
      const disponivel = LOCALIZACOES_DISPONIVEIS.reduce((s, l) => s + saldos[l], 0);
      return {
        id: p.id,
        nome: p.nome,
        sku: p.sku,
        estoqueMinimo: p.estoqueMinimo || 0,
        saldos,
        total,
        disponivel,
        abaixoMinimo: disponivel < (p.estoqueMinimo || 0),
      };
    });
  }, [produtos, estoque]);

  const linhasFiltradas = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    if (!f) return linhas;
    return linhas.filter((l) => l.nome.toLowerCase().includes(f) || l.sku.toLowerCase().includes(f));
  }, [linhas, filtro]);

  // KPIs
  const kpis = useMemo(() => {
    const totalDisponivel = linhas.reduce((s, l) => s + l.disponivel, 0);
    const baixoEstoque = linhas.filter((l) => l.abaixoMinimo).length;
    const emTransito = linhas.reduce((s, l) => s + l.saldos.comprado, 0);
    const emEntrega = linhas.reduce((s, l) => s + l.saldos.entrega, 0);
    return { totalDisponivel, baixoEstoque, emTransito, emEntrega };
  }, [linhas]);

  const usuario = { id: userProfile?.uid || '', nome: userProfile?.nome };

  const colunasSaldos = [
    {
      header: 'Produto',
      accessor: 'nome',
      render: (_: any, row: LinhaEstoque) => (
        <div>
          <p className="font-medium text-foreground flex items-center gap-2">
            {row.nome}
            {row.abaixoMinimo && (
              <span title="Abaixo do estoque mínimo">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{row.sku}</p>
        </div>
      ),
    },
    { header: 'Comprado', accessor: 'comprado', render: (_: any, r: LinhaEstoque) => r.saldos.comprado },
    { header: 'Showroom', accessor: 'showroom', render: (_: any, r: LinhaEstoque) => r.saldos.showroom },
    { header: 'Depósito', accessor: 'deposito', render: (_: any, r: LinhaEstoque) => r.saldos.deposito },
    { header: 'Entrega', accessor: 'entrega', render: (_: any, r: LinhaEstoque) => r.saldos.entrega },
    {
      header: 'Disponível',
      accessor: 'disponivel',
      render: (_: any, r: LinhaEstoque) => (
        <span className={`font-semibold ${r.abaixoMinimo ? 'text-amber-600' : 'text-foreground'}`}>
          {r.disponivel}
        </span>
      ),
    },
    {
      header: 'Mín.',
      accessor: 'estoqueMinimo',
      render: (_: any, r: LinhaEstoque) => <span className="text-muted-foreground">{r.estoqueMinimo}</span>,
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (_: any, row: LinhaEstoque) => (
        <div className="flex gap-2">
          <button
            onClick={() => setTransferindo(row)}
            className="p-1 hover:bg-background rounded"
            title="Transferir entre localizações"
          >
            <ArrowLeftRight className="w-4 h-4 text-mali-primary" />
          </button>
          <button
            onClick={() => setAjustando(row)}
            className="p-1 hover:bg-background rounded"
            title="Ajustar estoque"
          >
            <SlidersHorizontal className="w-4 h-4 text-mali-secondary" />
          </button>
        </div>
      ),
    },
  ];

  const movimentacoesOrdenadas = useMemo(() => {
    return [...movimentacoes].sort((a, b) => {
      const da = toMillis(a.criadoEm);
      const db = toMillis(b.criadoEm);
      return db - da;
    });
  }, [movimentacoes]);

  const colunasMov = [
    { header: 'Data', accessor: 'criadoEm', render: (v: any) => formatData(v) },
    { header: 'Produto', accessor: 'produtoNome' },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (v: string) => <span className="capitalize">{v}</span>,
    },
    {
      header: 'Movimento',
      accessor: 'id',
      render: (_: any, r: MovimentacaoEstoque) => {
        const o = r.localizacaoOrigem ? LOCALIZACOES[r.localizacaoOrigem] : null;
        const d = r.localizacaoDestino ? LOCALIZACOES[r.localizacaoDestino] : null;
        if (o && d) return `${o} → ${d}`;
        if (d) return `→ ${d}`;
        if (o) return `${o} →`;
        return '-';
      },
    },
    { header: 'Qtd', accessor: 'quantidade' },
    {
      header: 'Origem',
      accessor: 'referenciaTipo',
      render: (v: string) => <span className="text-muted-foreground capitalize">{v?.replace('_', ' ')}</span>,
    },
    { header: 'Por', accessor: 'registradoPorNome', render: (v: string) => v || '-' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Estoque</h1>
        <p className="text-muted-foreground mt-2">
          Controle de saldos por localização física e histórico de movimentações
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<PackageCheck className="w-5 h-5" />} label="Disponível p/ venda" valor={kpis.totalDisponivel} />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Itens abaixo do mínimo"
          valor={kpis.baixoEstoque}
          alerta={kpis.baixoEstoque > 0}
        />
        <KpiCard icon={<Truck className="w-5 h-5" />} label="Comprado / em trânsito" valor={kpis.emTransito} />
        <KpiCard icon={<Boxes className="w-5 h-5" />} label="Em entrega" valor={kpis.emEntrega} />
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-border">
        <TabBtn ativo={aba === 'saldos'} onClick={() => setAba('saldos')}>
          Saldos por Produto
        </TabBtn>
        <TabBtn ativo={aba === 'movimentacoes'} onClick={() => setAba('movimentacoes')}>
          Movimentações
        </TabBtn>
      </div>

      {aba === 'saldos' && (
        <div className="space-y-4">
          <input
            type="text"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Buscar por nome ou SKU..."
            className="w-full sm:w-80 px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
          />
          <Table
            columns={colunasSaldos}
            data={linhasFiltradas}
            loading={loadingEstoque || loadingProdutos}
            emptyMessage="Nenhum produto cadastrado. Cadastre produtos e registre compras para gerar estoque."
          />
        </div>
      )}

      {aba === 'movimentacoes' && (
        <Table
          columns={colunasMov}
          data={movimentacoesOrdenadas}
          loading={loadingMov}
          emptyMessage="Nenhuma movimentação registrada ainda."
        />
      )}

      <TransferenciaModal
        isOpen={!!transferindo}
        onClose={() => setTransferindo(null)}
        onDone={() => {}}
        produto={transferindo}
        usuario={usuario}
      />
      <AjusteModal
        isOpen={!!ajustando}
        onClose={() => setAjustando(null)}
        onDone={() => {}}
        produto={ajustando}
        usuario={usuario}
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  valor,
  alerta,
}: {
  icon: React.ReactNode;
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${alerta ? 'bg-amber-100 text-amber-600' : 'bg-mali-primary/10 text-mali-primary'}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{valor}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        ativo
          ? 'border-mali-primary text-mali-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
