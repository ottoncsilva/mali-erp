'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Plus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface ChamadoTecnico {
  id: string;
  clienteNome: string;
  problemaRelatado: string;
  status: 'aberto' | 'aguardando_peca' | 'visita_agendada' | 'resolvido';
  dataAbertura: Date;
  dataVisita?: Date;
  solicitacaoPeca?: string;
}

const statusChamado = [
  { value: 'aberto', label: '🔴 Aberto', color: 'bg-red-500/20 text-red-600' },
  { value: 'aguardando_peca', label: '⏳ Aguardando Peça', color: 'bg-amber-500/20 text-amber-600' },
  { value: 'visita_agendada', label: '📅 Visita Agendada', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'resolvido', label: '✓ Resolvido', color: 'bg-emerald-500/20 text-emerald-600' },
];

export default function AssistenciaPage() {
  const [chamados, setChamados] = useState<ChamadoTecnico[]>([
    {
      id: '1',
      clienteNome: 'João Silva',
      problemaRelatado: 'Tecido com pequeno rasgado',
      status: 'aberto',
      dataAbertura: new Date(2026, 5, 5),
    },
  ]);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedChamado, setSelectedChamado] = useState<ChamadoTecnico | null>(null);

  const columns = [
    { header: 'Cliente', accessor: 'clienteNome' },
    { header: 'Problema', accessor: 'problemaRelatado', width: '40%' },
    {
      header: 'Data Abertura',
      accessor: 'dataAbertura',
      render: (data: Date) => new Date(data).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status: string) => {
        const s = statusChamado.find((st) => st.value === status);
        return s ? <span className={`px-2 py-1 rounded text-xs font-medium ${s.color}`}>{s.label}</span> : status;
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Assistência Técnica</h1>
          <p className="text-muted-foreground mt-2">Suporte e pós-venda</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all">
          <Plus className="w-4 h-4" />
          Novo Chamado
        </button>
      </div>

      <Table columns={columns} data={chamados} emptyMessage="Nenhum chamado aberto" />

      <Modal isOpen={isDetailModalOpen} title="Detalhes do Chamado" onClose={() => setIsDetailModalOpen(false)}>
        {selectedChamado && (
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Cliente</h4>
              <p className="text-sm text-foreground">{selectedChamado.clienteNome}</p>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Problema</h4>
              <p className="text-sm text-foreground">{selectedChamado.problemaRelatado}</p>
            </div>
            <div className="flex gap-3 pt-4">
              <button className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md font-medium">
                Salvar
              </button>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md font-medium"
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
