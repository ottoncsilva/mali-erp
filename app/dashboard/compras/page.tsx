'use client';

import { useMemo, useState } from 'react';
import { useCollection, useUpdateDocument } from '@/lib/hooks';
import { Table } from '@/components/ui/Table';
import { PedidoCompraModal } from '@/components/modules/compras/PedidoCompraModal';
import { NotaFiscalModal } from '@/components/modules/compras/NotaFiscalModal';
import { formatBRL, formatData } from '@/lib/utils/format';
import type { PedidoCompra, NotaFiscal } from '@/types';
import { Plus, FileText, XCircle, FileInput } from 'lucide-react';

const STATUS_PEDIDO: Record<PedidoCompra['status'], { label: string; cor: string }> = {
  pedido: { label: 'Pedido', cor: 'bg-blue-100 text-blue-700' },
  em_transito: { label: 'Em Trânsito', cor: 'bg-amber-100 text-amber-700' },
  recebido: { label: 'Recebido', cor: 'bg-indigo-100 text-indigo-700' },
  faturado: { label: 'Faturado', cor: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', cor: 'bg-gray-100 text-gray-500' },
};

export default function ComprasPage() {
  const { data: pedidos, loading: loadingPedidos } = useCollection<PedidoCompra>('pedidos_compra');
  const { data: notas, loading: loadingNotas } = useCollection<NotaFiscal>('notas_fiscais');
  const { update: updatePedido } = useUpdateDocument('pedidos_compra');

  const [aba, setAba] = useState<'pedidos' | 'notas'>('pedidos');
  const [novoPedido, setNovoPedido] = useState(false);
  const [novaNota, setNovaNota] = useState(false);
  const [pedidoParaNota, setPedidoParaNota] = useState<(PedidoCompra & { id: string }) | null>(null);

  const pedidosOrdenados = useMemo(
    () => [...pedidos].sort((a, b) => (b.numero || '').localeCompare(a.numero || '')),
    [pedidos]
  );
  const notasOrdenadas = useMemo(
    () => [...notas].sort((a, b) => (b.numero || '').localeCompare(a.numero || '')),
    [notas]
  );

  const cancelarPedido = async (id: string) => {
    if (confirm('Cancelar este pedido de compra?')) {
      await updatePedido(id, { status: 'cancelado' });
    }
  };

  const abrirNotaDoPedido = (pedido: PedidoCompra & { id: string }) => {
    setPedidoParaNota(pedido);
    setNovaNota(true);
  };

  const colunasPedidos = [
    { header: 'Número', accessor: 'numero', render: (v: string) => <span className="font-medium">{v}</span> },
    { header: 'Fornecedor', accessor: 'fornecedorNome' },
    {
      header: 'Itens',
      accessor: 'itens',
      render: (itens: any[]) => `${itens?.length || 0} item(ns)`,
    },
    { header: 'Total', accessor: 'totalEstimado', render: (v: number) => formatBRL(v) },
    {
      header: 'Prazo',
      accessor: 'prazoEntregaEstimado',
      render: (v: any) => formatData(v),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (v: PedidoCompra['status']) => {
        const s = STATUS_PEDIDO[v] || STATUS_PEDIDO.pedido;
        return <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.cor}`}>{s.label}</span>;
      },
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (id: string, row: PedidoCompra & { id: string }) => (
        <div className="flex gap-2">
          {row.status !== 'faturado' && row.status !== 'cancelado' && (
            <>
              <button
                onClick={() => abrirNotaDoPedido(row)}
                className="p-1 hover:bg-background rounded"
                title="Registrar nota fiscal"
              >
                <FileInput className="w-4 h-4 text-mali-primary" />
              </button>
              <button
                onClick={() => cancelarPedido(id)}
                className="p-1 hover:bg-background rounded"
                title="Cancelar pedido"
              >
                <XCircle className="w-4 h-4 text-destructive" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const colunasNotas = [
    { header: 'NF', accessor: 'numero', render: (v: string) => <span className="font-medium">{v}</span> },
    { header: 'Série', accessor: 'serie', render: (v: string) => v || '-' },
    { header: 'Fornecedor', accessor: 'fornecedorNome' },
    { header: 'Entrada', accessor: 'dataEntrada', render: (v: any) => formatData(v) },
    { header: 'Frete', accessor: 'freteTotal', render: (v: number) => formatBRL(v) },
    { header: 'Total', accessor: 'valorTotal', render: (v: number) => <span className="font-semibold">{formatBRL(v)}</span> },
    {
      header: 'Status',
      accessor: 'status',
      render: (v: string) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 capitalize">{v}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Compras</h1>
          <p className="text-muted-foreground mt-2">
            Pedidos de compra e entrada de notas fiscais com rateio de frete e composição de CMV
          </p>
        </div>
        {aba === 'pedidos' ? (
          <button
            onClick={() => setNovoPedido(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        ) : (
          <button
            onClick={() => {
              setPedidoParaNota(null);
              setNovaNota(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
          >
            <FileText className="w-4 h-4" />
            Registrar NF
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setAba('pedidos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            aba === 'pedidos'
              ? 'border-mali-primary text-mali-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Pedidos de Compra
        </button>
        <button
          onClick={() => setAba('notas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            aba === 'notas'
              ? 'border-mali-primary text-mali-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Notas Fiscais
        </button>
      </div>

      {aba === 'pedidos' ? (
        <Table
          columns={colunasPedidos}
          data={pedidosOrdenados}
          loading={loadingPedidos}
          emptyMessage="Nenhum pedido de compra. Clique em 'Novo Pedido' para começar."
        />
      ) : (
        <Table
          columns={colunasNotas}
          data={notasOrdenadas}
          loading={loadingNotas}
          emptyMessage="Nenhuma nota fiscal registrada."
        />
      )}

      <PedidoCompraModal isOpen={novoPedido} onClose={() => setNovoPedido(false)} onSaved={() => {}} />
      <NotaFiscalModal
        isOpen={novaNota}
        onClose={() => {
          setNovaNota(false);
          setPedidoParaNota(null);
        }}
        onSaved={() => {}}
        pedidoVinculado={pedidoParaNota}
      />
    </div>
  );
}
