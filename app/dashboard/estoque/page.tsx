'use client';

import { useMemo, useState } from 'react';
import { useCollection, useAuth } from '@/lib/hooks';
import { useEstoqueAgregado } from '@/lib/hooks/useEstoqueAgregado';
import { Table } from '@/components/ui/Table';
import { TransferenciaModal } from '@/components/modules/estoque/TransferenciaModal';
import { AjusteModal } from '@/components/modules/estoque/AjusteModal';
import { FiltrosEstoque } from '@/components/modules/estoque/FiltrosEstoque';
import { DepositBreakdownPopover } from '@/components/ui/DepositBreakdownPopover';
import { LOCALIZACOES } from '@/types';
import type {
  Deposito,
  MovimentacaoEstoque,
  LocalizacaoEstoque,
  FiltroEstoque,
} from '@/types';
import type { EstoqueAgregado } from '@/lib/estoque/agregacao';
import { formatData } from '@/lib/utils/format';
import { Boxes, Truck, AlertTriangle, PackageCheck, ArrowLeftRight, SlidersHorizontal } from 'lucide-react';

const LOCAIS = Object.keys(LOCALIZACOES) as LocalizacaoEstoque[];

// Converte EstoqueAgregado para o formato { saldos } esperado pelos modais.
function paraSaldos(linha: EstoqueAgregado) {
  const saldos = LOCAIS.reduce((acc, l) => {
    acc[l] = linha.porLocalizacao[l]?.quantidade || 0;
    return acc;
  }, {} as Record<LocalizacaoEstoque, number>);
  return { id: linha.produtoId, nome: linha.produtoNome, sku: linha.produtoSku, saldos };
}

export default function EstoquePage() {
  const { userProfile } = useAuth();
  const { agregado, loading } = useEstoqueAgregado();
  const { data: depositos } = useCollection<Deposito>('depositos');
  const { data: movimentacoes, loading: loadingMov } = useCollection<MovimentacaoEstoque>('movimentacoes_estoque');

  const [aba, setAba] = useState<'saldos' | 'movimentacoes'>('saldos');
  const [transferindo, setTransferindo] = useState<ReturnType<typeof paraSaldos> | null>(null);
  const [ajustando, setAjustando] = useState<ReturnType<typeof paraSaldos> | null>(null);
  const [filtros, setFiltros] = useState<FiltroEstoque>({
    depositoIds: [],
    statusEstoque: 'todos',
    textoBusca: '',
  });

  // Aplica filtros sobre o estoque agregado.
  const linhasFiltradas = useMemo(() => {
    return agregado.filter((linha) => {
      // Busca por texto
      if (filtros.textoBusca) {
        const termo = filtros.textoBusca.toLowerCase();
        if (
          !linha.produtoNome.toLowerCase().includes(termo) &&
          !linha.produtoSku.toLowerCase().includes(termo)
        ) {
          return false;
        }
      }

      // Status do estoque
      if (filtros.statusEstoque !== 'todos' && linha.statusEstoque !== filtros.statusEstoque) {
        return false;
      }

      // Depósitos selecionados
      if (filtros.depositoIds.length > 0) {
        const temDeposito = linha.porLocalizacao.deposito?.depositos?.some((d) =>
          filtros.depositoIds.includes(d.depositoId)
        );
        if (!temDeposito) return false;
      }

      return true;
    });
  }, [agregado, filtros]);

  // KPIs
  const kpis = useMemo(() => {
    const totalDisponivel = agregado.reduce((s, l) => s + l.totalDisponivel, 0);
    const baixoEstoque = agregado.filter((l) => l.statusEstoque === 'abaixo' || l.statusEstoque === 'zerado').length;
    const emTransito = agregado.reduce((s, l) => s + (l.porLocalizacao.comprado?.quantidade || 0), 0);
    const emEntrega = agregado.reduce((s, l) => s + (l.porLocalizacao.entrega?.quantidade || 0), 0);
    return { totalDisponivel, baixoEstoque, emTransito, emEntrega };
  }, [agregado]);

  const usuario = { id: userProfile?.uid || '', nome: userProfile?.nome };

  const colunasSaldos = [
    {
      header: 'Produto',
      accessor: 'produtoNome',
      render: (_: any, row: EstoqueAgregado) => (
        <div className="flex items-center gap-3">
          {row.fotoPrincipal && (
            <img src={row.fotoPrincipal} alt={row.produtoNome} className="w-10 h-10 rounded object-cover" />
          )}
          <div>
            <p className="font-medium text-foreground flex items-center gap-2">
              {row.produtoNome}
              {row.statusEstoque === 'abaixo' && (
                <span title="Abaixo do estoque mínimo">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{row.produtoSku}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Estoque Total',
      accessor: 'totalGeral',
      render: (_: any, row: EstoqueAgregado) => (
        <div className="group relative inline-block cursor-help">
          <span className="font-semibold text-foreground border-b border-dashed border-muted-foreground/50">
            {row.totalGeral} un
          </span>
          <DepositBreakdownPopover linha={row} />
        </div>
      ),
    },
    {
      header: 'Disponível',
      accessor: 'totalDisponivel',
      render: (_: any, r: EstoqueAgregado) => (
        <span
          className={`font-semibold ${
            r.statusEstoque === 'zerado'
              ? 'text-red-600'
              : r.statusEstoque === 'abaixo'
              ? 'text-amber-600'
              : 'text-emerald-600'
          }`}
        >
          {r.totalDisponivel}
        </span>
      ),
    },
    {
      header: 'Mín.',
      accessor: 'estoqueMinimo',
      render: (_: any, r: EstoqueAgregado) => <span className="text-muted-foreground">{r.estoqueMinimo}</span>,
    },
    {
      header: 'Status',
      accessor: 'statusEstoque',
      render: (_: any, r: EstoqueAgregado) => {
        const cfg = {
          zerado: { label: 'Zerado', cls: 'bg-red-500/20 text-red-600' },
          abaixo: { label: 'Abaixo do mín.', cls: 'bg-amber-500/20 text-amber-600' },
          normal: { label: 'Normal', cls: 'bg-emerald-500/20 text-emerald-600' },
        }[r.statusEstoque];
        return <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
      },
    },
    {
      header: 'Ações',
      accessor: 'produtoId',
      render: (_: any, row: EstoqueAgregado) => (
        <div className="flex gap-2">
          <button
            onClick={() => setTransferindo(paraSaldos(row))}
            className="p-1 hover:bg-background rounded"
            title="Transferir entre localizações"
          >
            <ArrowLeftRight className="w-4 h-4 text-mali-primary" />
          </button>
          <button
            onClick={() => setAjustando(paraSaldos(row))}
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
    return [...movimentacoes].sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
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
          <FiltrosEstoque
            filtros={filtros}
            onChange={setFiltros}
            depositos={depositos as (Deposito & { id: string })[]}
          />
          <Table
            columns={colunasSaldos}
            data={linhasFiltradas}
            loading={loading}
            allowOverflow
            emptyMessage="Nenhum produto encontrado. Cadastre produtos e registre compras para gerar estoque."
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
