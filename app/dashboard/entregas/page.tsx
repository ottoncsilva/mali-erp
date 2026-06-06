'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Calendar, Plus, Truck, Edit2 } from 'lucide-react';
import { Table } from '@/components/ui/Table';

interface EntregaAgendada {
  id: string;
  clienteNome: string;
  dataAgendada: Date;
  turno: 'manha' | 'tarde';
  status: 'agendada' | 'em_rota' | 'entregue' | 'montada' | 'problema';
  enderecoEntrega: string;
  observacoes: string;
  montador?: string;
}

const statusEntrega = [
  { value: 'agendada', label: '📅 Agendada', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'em_rota', label: '🚚 Em Rota', color: 'bg-amber-500/20 text-amber-600' },
  { value: 'entregue', label: '✓ Entregue', color: 'bg-emerald-500/20 text-emerald-600' },
  { value: 'montada', label: '🔧 Montada', color: 'bg-purple-500/20 text-purple-600' },
  { value: 'problema', label: '⚠️ Problema', color: 'bg-red-500/20 text-red-600' },
];

export default function EntregasPage() {
  const [entregas, setEntregas] = useState<EntregaAgendada[]>([
    {
      id: '1',
      clienteNome: 'João Silva',
      dataAgendada: new Date(2026, 5, 10),
      turno: 'manha',
      status: 'agendada',
      enderecoEntrega: 'Rua das Flores, 123 - São Paulo, SP',
      observacoes: 'Apto no 5º andar, sem elevador',
      montador: 'Carlos Silva',
    },
  ]);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<EntregaAgendada | null>(null);
  const [viewMode, setViewMode] = useState<'agenda' | 'lista'>('agenda');

  const entregasPorData = useMemo(() => {
    const grouped: { [key: string]: EntregaAgendada[] } = {};
    entregas.forEach((entrega) => {
      const data = new Date(entrega.dataAgendada).toLocaleDateString('pt-BR');
      if (!grouped[data]) grouped[data] = [];
      grouped[data].push(entrega);
    });
    return grouped;
  }, [entregas]);

  const columns = [
    { header: 'Cliente', accessor: 'clienteNome' },
    { header: 'Endereço', accessor: 'enderecoEntrega', width: '30%' },
    {
      header: 'Data',
      accessor: 'dataAgendada',
      render: (data: Date) => new Date(data).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Turno',
      accessor: 'turno',
      render: (turno: string) => turno === 'manha' ? '🌅 Manhã' : '🌆 Tarde',
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status: string) => {
        const s = statusEntrega.find((st) => st.value === status);
        return s ? <span className={`px-2 py-1 rounded text-xs font-medium ${s.color}`}>{s.label}</span> : status;
      },
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (id: string, row: EntregaAgendada) => (
        <button
          onClick={() => {
            setSelectedEntrega(row);
            setIsDetailModalOpen(true);
          }}
          className="p-1 hover:bg-background rounded"
        >
          <Edit2 className="w-4 h-4 text-mali-primary" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entregas & Montagem</h1>
          <p className="text-muted-foreground mt-2">Agendamento e rastreamento de entregas</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          Agendar Entrega
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setViewMode('agenda')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'agenda'
              ? 'bg-mali-primary text-mali-secondary'
              : 'bg-card border border-border text-foreground hover:bg-background'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendário
        </button>
        <button
          onClick={() => setViewMode('lista')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'lista'
              ? 'bg-mali-primary text-mali-secondary'
              : 'bg-card border border-border text-foreground hover:bg-background'
          }`}
        >
          📋 Lista
        </button>
      </div>

      {viewMode === 'lista' ? (
        <Table columns={columns} data={entregas} emptyMessage="Nenhuma entrega agendada" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
          {Object.entries(entregasPorData).map(([data, items]) => (
            <div key={data} className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">{data}</h3>
              <div className="space-y-2">
                {items.map((entrega) => {
                  const status = statusEntrega.find((s) => s.value === entrega.status);
                  return (
                    <div
                      key={entrega.id}
                      onClick={() => {
                        setSelectedEntrega(entrega);
                        setIsDetailModalOpen(true);
                      }}
                      className={`p-3 rounded-lg cursor-pointer border-l-4 transition-all hover:shadow-md ${status?.color} border-l-mali-primary`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        {entrega.turno === 'manha' ? '🌅 Manhã' : '🌆 Tarde'}
                      </p>
                      <p className="text-sm font-medium line-clamp-1">{entrega.clienteNome}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {entrega.enderecoEntrega}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isDetailModalOpen}
        title="Detalhes da Entrega"
        onClose={() => setIsDetailModalOpen(false)}
        size="lg"
      >
        {selectedEntrega && (
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Cliente</h4>
              <p className="text-sm text-foreground">{selectedEntrega.clienteNome}</p>
            </div>

            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Endereço de Entrega</h4>
              <p className="text-sm text-foreground">{selectedEntrega.enderecoEntrega}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Data</p>
                <p className="font-semibold text-foreground">
                  {new Date(selectedEntrega.dataAgendada).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="p-4 bg-background rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-1">Turno</p>
                <p className="font-semibold text-foreground">
                  {selectedEntrega.turno === 'manha' ? '🌅 Manhã' : '🌆 Tarde'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-3">Status</h4>
              <div className="grid grid-cols-2 gap-2">
                {statusEntrega.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      setSelectedEntrega({ ...selectedEntrega, status: status.value as any });
                    }}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                      selectedEntrega.status === status.value
                        ? `${status.color} border-current`
                        : 'bg-card border-border text-foreground hover:bg-background'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Montador</h4>
              <input
                type="text"
                value={selectedEntrega.montador || ''}
                onChange={(e) => setSelectedEntrega({ ...selectedEntrega, montador: e.target.value })}
                placeholder="Nome do montador"
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>

            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Observações</h4>
              <textarea
                value={selectedEntrega.observacoes || ''}
                onChange={(e) => setSelectedEntrega({ ...selectedEntrega, observacoes: e.target.value })}
                placeholder="Ex: 5º andar sem elevador..."
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium">
                Salvar
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
