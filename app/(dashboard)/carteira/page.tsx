'use client';

import { useAuth, useCollection, useUpdateDocument } from '@/lib/hooks';
import { Atendimento, Cliente } from '@/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { query, where, collectionGroup, getDocs } from 'firebase/firestore';
import { ArrowRight, Loader2, Mail, Phone, TrendingUp, Eye } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

type AtendimentoComCliente = Atendimento & { id: string; cliente?: Cliente & { id: string } };

const statusPipeline = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-500/10 border-blue-500/20 text-blue-600' },
  { value: 'negociando', label: 'Negociando', color: 'bg-amber-500/10 border-amber-500/20 text-amber-600' },
  { value: 'quente', label: 'Quente', color: 'bg-red-500/10 border-red-500/20 text-red-600' },
  { value: 'esfriou', label: 'Esfriou', color: 'bg-gray-500/10 border-gray-500/20 text-gray-600' },
];

export default function CarteiraPage() {
  const { userProfile } = useAuth();
  const { data: atendimentos } = useCollection<Atendimento>('atendimentos');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { update: updateAtendimento } = useUpdateDocument('atendimentos');

  const [carteiraOrcamentos, setCarteiraOrcamentos] = useState<AtendimentoComCliente[]>([]);
  const [selectedOrcamento, setSelectedOrcamento] = useState<AtendimentoComCliente | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filtrar orçamentos do vendedor
  useEffect(() => {
    const meuAtendimentos = atendimentos
      .filter(
        (a) =>
          a.tipo === 'orcamento' &&
          a.vendedorId === userProfile?.uid &&
          a.status === 'pendente'
      )
      .map((a) => ({
        ...(a as Atendimento & { id: string }),
        cliente: clientes.find((c) => c.id === (a as any).clienteId),
      }));

    setCarteiraOrcamentos(meuAtendimentos);
  }, [atendimentos, clientes, userProfile]);

  const handleChangePipeline = async (id: string, novoPipeline: string) => {
    try {
      await updateAtendimento(id, { pipelineVendedor: novoPipeline });
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const handleViewDetails = (orc: AtendimentoComCliente) => {
    setSelectedOrcamento(orc);
    setIsDetailModalOpen(true);
  };

  // Agrupar por pipeline
  const porPipeline = {
    novo: carteiraOrcamentos.filter((o) => o.pipelineVendedor === 'novo'),
    negociando: carteiraOrcamentos.filter((o) => o.pipelineVendedor === 'negociando'),
    quente: carteiraOrcamentos.filter((o) => o.pipelineVendedor === 'quente'),
    esfriou: carteiraOrcamentos.filter((o) => o.pipelineVendedor === 'esfriou'),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Minha Carteira</h1>
        <p className="text-muted-foreground mt-2">Acompanhamento de orçamentos em aberto</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total em Aberto', value: carteiraOrcamentos.length, icon: '📊' },
          { label: 'Novos', value: porPipeline.novo.length, icon: '✨' },
          { label: 'Negociando', value: porPipeline.negociando.length, icon: '🤝' },
          { label: 'Quentes', value: porPipeline.quente.length, icon: '🔥' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-card rounded-lg border border-border p-4">
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusPipeline.map((status) => (
          <div key={status.value} className="space-y-3">
            <div className={`px-4 py-2 rounded-lg border ${status.color}`}>
              <p className="font-semibold text-sm">{status.label}</p>
              <p className="text-xs mt-1">{(porPipeline as any)[status.value]?.length || 0} orçamentos</p>
            </div>

            <div className="space-y-2">
              {(porPipeline as any)[status.value]?.map((orc: AtendimentoComCliente) => (
                <div
                  key={orc.id}
                  className="bg-card rounded-lg border border-border p-3 hover:border-mali-primary/50 transition-colors cursor-pointer"
                  onClick={() => handleViewDetails(orc)}
                >
                  <div className="mb-2">
                    <p className="font-medium text-sm text-foreground line-clamp-2">
                      {orc.cliente?.nome || 'Cliente Desconhecido'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Total: R$ {orc.resumoVisual?.totalFinal.toFixed(2) || '0.00'}
                    </p>
                  </div>

                  {status.value !== 'esfriou' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const nextIndex = statusPipeline.findIndex((s) => s.value === status.value) + 1;
                        if (nextIndex < statusPipeline.length) {
                          handleChangePipeline(orc.id, statusPipeline[nextIndex].value);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1 bg-background border border-border rounded text-xs text-foreground hover:bg-mali-primary/10 transition-colors mt-2"
                    >
                      <ArrowRight className="w-3 h-3" />
                      Próximo
                    </button>
                  )}

                  <div className="flex gap-1 mt-2">
                    {orc.cliente?.telefoneWhatsapp && (
                      <a
                        href={`https://wa.me/${orc.cliente.telefoneWhatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 p-1 bg-emerald-500/10 rounded text-emerald-600 hover:bg-emerald-500/20 transition-colors text-center"
                        title="Enviar WhatsApp"
                      >
                        <Phone className="w-3 h-3 inline" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewDetails(orc);
                      }}
                      className="flex-1 p-1 bg-blue-500/10 rounded text-blue-600 hover:bg-blue-500/20 transition-colors"
                      title="Ver detalhes"
                    >
                      <Eye className="w-3 h-3 inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        title="Detalhes do Orçamento"
        onClose={() => setIsDetailModalOpen(false)}
        size="lg"
      >
        {selectedOrcamento && (
          <div className="space-y-4">
            {/* Cliente */}
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Cliente</h4>
              <p className="text-sm text-foreground">{selectedOrcamento.cliente?.nome}</p>
              <p className="text-sm text-muted-foreground">{selectedOrcamento.cliente?.cpfCnpj}</p>
              {selectedOrcamento.cliente?.telefoneWhatsapp && (
                <a
                  href={`https://wa.me/${selectedOrcamento.cliente.telefoneWhatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-600 hover:underline mt-2 inline-flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {selectedOrcamento.cliente?.telefoneWhatsapp}
                </a>
              )}
            </div>

            {/* Itens */}
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-3">Itens</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedOrcamento.itens?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <div>
                      <p className="text-foreground">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.qtd}</p>
                    </div>
                    <p className="font-medium text-foreground">R$ {(item.precoAplicado * item.qtd).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div className="p-4 bg-mali-primary/10 rounded-lg border border-mali-primary/20">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground">Total:</span>
                <span className="text-2xl font-bold text-mali-primary">
                  R$ {selectedOrcamento.resumoVisual?.totalFinal.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-muted-foreground">Pontuação:</span>
                <span className="font-medium text-foreground">{selectedOrcamento.resumoVisual?.pontuacaoMedia.toFixed(2)}</span>
              </div>
            </div>

            {/* Status Pipeline */}
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-3">Mover Para:</h4>
              <div className="grid grid-cols-2 gap-2">
                {statusPipeline.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      handleChangePipeline(selectedOrcamento.id, status.value);
                      setIsDetailModalOpen(false);
                    }}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                      selectedOrcamento.pipelineVendedor === status.value
                        ? `${status.color} border-current`
                        : 'bg-card border-border text-foreground hover:bg-background'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <a
                href={`https://wa.me/${selectedOrcamento.cliente?.telefoneWhatsapp?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors font-medium text-center"
              >
                Enviar WhatsApp
              </a>
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
