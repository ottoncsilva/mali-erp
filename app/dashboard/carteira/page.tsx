'use client';

import { useAuth, useCollection, useUpdateDocument } from '@/lib/hooks';
import { Atendimento, Cliente } from '@/types';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { ArrowRight, Loader2, Mail, Phone, TrendingUp, Eye, AlertCircle, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { formatBRL } from '@/lib/utils/format';
import { toDate, diferencaDias } from '@/lib/utils/datas';
import { linkWhatsApp, mensagemFollowUp, normalizarTelefone } from '@/lib/utils/whatsapp';

type AtendimentoComCliente = Atendimento & { id: string; cliente?: Cliente & { id: string } };

const statusPipeline = [
  { value: 'novo', label: 'Novo', color: 'bg-blue-500/10 border-blue-500/20 text-blue-600', icon: '✨' },
  { value: 'negociando', label: 'Negociando', color: 'bg-amber-500/10 border-amber-500/20 text-amber-600', icon: '🤝' },
  { value: 'quente', label: 'Quente', color: 'bg-red-500/10 border-red-500/20 text-red-600', icon: '🔥' },
  { value: 'esfriou', label: 'Esfriou', color: 'bg-gray-500/10 border-gray-500/20 text-gray-600', icon: '❄️' },
];

const getQuoteStatus = (orc: AtendimentoComCliente): { tipo: 'vencido' | 'vencendo' | 'ok' | 'sem_data'; label: string } => {
  const diasValidadeOrcamento = 7; // Default; should come from empresa config
  const dataCriacao = toDate(orc.criadoEm);
  if (!dataCriacao) return { tipo: 'sem_data', label: 'Data desconhecida' };

  const hoje = new Date();
  const diasDecorridos = diferencaDias(dataCriacao, hoje);
  const diasRestantes = diasValidadeOrcamento - diasDecorridos;

  if (diasRestantes < 0) return { tipo: 'vencido', label: `Vencido há ${Math.abs(diasRestantes)} dias` };
  if (diasRestantes <= 2) return { tipo: 'vencendo', label: `Vence em ${diasRestantes} dias` };
  return { tipo: 'ok', label: `Válido por ${diasRestantes} dias` };
};

export default function CarteiraPage() {
  const { userProfile } = useAuth();
  const { data: atendimentos } = useCollection<Atendimento>('atendimentos');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { update: updateAtendimento } = useUpdateDocument('atendimentos');

  const [carteiraOrcamentos, setCarteiraOrcamentos] = useState<AtendimentoComCliente[]>([]);
  const [selectedOrcamento, setSelectedOrcamento] = useState<AtendimentoComCliente | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ id: string; fromStatus: string } | null>(null);
  const [followUpData, setFollowUpData] = useState({ data: '', observacao: '' });

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

  const handleDragStart = (e: React.DragEvent, id: string, status: string) => {
    setDraggedItem({ id, fromStatus: status });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, toStatus: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.fromStatus !== toStatus) {
      await handleChangePipeline(draggedItem.id, toStatus);
    }
    setDraggedItem(null);
  };

  const handleSaveFollowUp = async () => {
    if (!selectedOrcamento || !followUpData.data) return;

    try {
      await updateAtendimento(selectedOrcamento.id, {
        followUp: {
          data: new Date(followUpData.data),
          observacao: followUpData.observacao,
          concluido: false,
        },
      });
      setIsFollowUpModalOpen(false);
      setFollowUpData({ data: '', observacao: '' });
    } catch (err) {
      console.error('Erro ao salvar follow-up:', err);
    }
  };

  const handleSendWhatsApp = (orc: AtendimentoComCliente, tipo: 'followup' | 'orcamento') => {
    const telefone = orc.clienteTelefone || orc.cliente?.telefoneWhatsapp;
    if (!telefone) return;

    let mensagem = '';
    if (tipo === 'followup') {
      mensagem = mensagemFollowUp({ clienteNome: orc.clienteNome });
    } else {
      mensagem = `Olá! Venho confirmar a disponibilidade do orçamento de *${formatBRL(orc.resumoVisual?.totalFinal || 0)}*. Posso ajudar com alguma dúvida?`;
    }

    const url = linkWhatsApp(telefone, mensagem);
    window.open(url, '_blank');
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

      {/* Alertas de Vencimento */}
      {carteiraOrcamentos.some((o) => getQuoteStatus(o).tipo === 'vencido' || getQuoteStatus(o).tipo === 'vencendo') && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900 mb-1">Orçamentos vencendo ou vencidos</h4>
              <div className="space-y-1 text-sm text-red-800">
                {carteiraOrcamentos.map((orc) => {
                  const status = getQuoteStatus(orc);
                  if (status.tipo === 'ok' || status.tipo === 'sem_data') return null;
                  return (
                    <div key={orc.id} className="flex justify-between">
                      <span>{orc.clienteNome || 'Cliente'}</span>
                      <span className="font-medium">{status.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board com Drag-Drop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusPipeline.map((status) => (
          <div
            key={status.value}
            className="space-y-3"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status.value)}
          >
            <div className={`px-4 py-2 rounded-lg border ${status.color}`}>
              <p className="font-semibold text-sm">{status.icon} {status.label}</p>
              <p className="text-xs mt-1">{(porPipeline as any)[status.value]?.length || 0} orçamentos</p>
            </div>

            <div className="space-y-2 min-h-[400px]">
              {(porPipeline as any)[status.value]?.map((orc: AtendimentoComCliente) => {
                const quoteStatus = getQuoteStatus(orc);
                const isExpired = quoteStatus.tipo === 'vencido';
                const isExpiring = quoteStatus.tipo === 'vencendo';

                return (
                  <div
                    key={orc.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, orc.id, status.value)}
                    className={`bg-card rounded-lg border p-3 transition-all cursor-move hover:shadow-md ${
                      isExpired
                        ? 'border-red-500 bg-red-50/50'
                        : isExpiring
                          ? 'border-amber-500 bg-amber-50/50'
                          : 'border-border hover:border-mali-primary/50'
                    }`}
                  >
                    {/* Vencimento Badge */}
                    {(isExpired || isExpiring) && (
                      <div className={`text-xs font-medium mb-2 px-2 py-1 rounded ${
                        isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {quoteStatus.label}
                      </div>
                    )}

                    <div className="mb-2">
                      <p className="font-medium text-sm text-foreground line-clamp-2">
                        {orc.clienteNome || 'Cliente Desconhecido'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBRL(orc.resumoVisual?.totalFinal || 0)}
                      </p>
                    </div>

                    {/* Follow-up Info */}
                    {orc.followUp && !orc.followUp.concluido && (
                      <div className="bg-blue-50 rounded p-2 mb-2 text-xs border border-blue-200">
                        <div className="flex items-center gap-1 text-blue-700 font-medium">
                          <Clock className="w-3 h-3" />
                          Follow-up agendado
                        </div>
                        <p className="text-blue-600 text-xs mt-1">
                          {toDate(orc.followUp.data)?.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-1 mt-2 flex-wrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrcamento(orc);
                          setIsFollowUpModalOpen(true);
                        }}
                        className="flex-1 min-w-0 p-1 bg-purple-500/10 rounded text-purple-600 hover:bg-purple-500/20 transition-colors text-xs font-medium"
                        title="Agendar follow-up"
                      >
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        Follow-up
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrcamento(orc);
                          handleSendWhatsApp(orc, 'followup');
                        }}
                        className="flex-1 min-w-0 p-1 bg-emerald-500/10 rounded text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                        title="Enviar WhatsApp"
                      >
                        <MessageCircle className="w-3 h-3 inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(orc);
                        }}
                        className="flex-1 min-w-0 p-1 bg-blue-500/10 rounded text-blue-600 hover:bg-blue-500/20 transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="w-3 h-3 inline" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Follow-up Modal */}
      <Modal
        isOpen={isFollowUpModalOpen}
        title="Agendar Follow-up"
        onClose={() => {
          setIsFollowUpModalOpen(false);
          setFollowUpData({ data: '', observacao: '' });
        }}
        size="md"
      >
        {selectedOrcamento && (
          <div className="space-y-4">
            <div className="p-4 bg-background rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="text-lg font-semibold text-foreground">{selectedOrcamento.clienteNome}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Data do Follow-up</label>
              <input
                type="date"
                value={followUpData.data}
                onChange={(e) => setFollowUpData({ ...followUpData, data: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observação</label>
              <textarea
                value={followUpData.observacao}
                onChange={(e) => setFollowUpData({ ...followUpData, observacao: e.target.value })}
                placeholder="Ex: Cliente quer orçamento com desconto..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSaveFollowUp}
                className="flex-1 px-4 py-2 bg-mali-primary text-white rounded-md hover:bg-mali-primary/90 transition-colors font-medium"
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Agendar
              </button>
              <button
                onClick={() => {
                  setIsFollowUpModalOpen(false);
                  setFollowUpData({ data: '', observacao: '' });
                }}
                className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </Modal>

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
                  R$ {selectedOrcamento.resumoVisual?.totalFinal?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div className="flex justify-between items-center mt-2 text-sm">
                <span className="text-muted-foreground">Pontuação:</span>
                <span className="font-medium text-foreground">{selectedOrcamento.resumoVisual?.pontuacaoMedia?.toFixed(2) ?? '0.00'}</span>
              </div>
            </div>

            {/* Vencimento Status */}
            {(() => {
              const quoteStatus = getQuoteStatus(selectedOrcamento);
              return (
                quoteStatus.tipo !== 'sem_data' && (
                  <div className={`p-4 rounded-lg border ${
                    quoteStatus.tipo === 'vencido'
                      ? 'bg-red-50 border-red-200'
                      : quoteStatus.tipo === 'vencendo'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-green-50 border-green-200'
                  }`}>
                    <p className={`text-sm font-semibold ${
                      quoteStatus.tipo === 'vencido'
                        ? 'text-red-900'
                        : quoteStatus.tipo === 'vencendo'
                          ? 'text-amber-900'
                          : 'text-green-900'
                    }`}>
                      {quoteStatus.label}
                    </p>
                  </div>
                )
              );
            })()}

            {/* Follow-up Status */}
            {selectedOrcamento.followUp && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  {selectedOrcamento.followUp.concluido ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-blue-900">
                      {selectedOrcamento.followUp.concluido ? 'Follow-up concluído' : 'Follow-up agendado'}
                    </p>
                    <p className="text-sm text-blue-800 mt-1">
                      {toDate(selectedOrcamento.followUp.data)?.toLocaleDateString('pt-BR')}
                    </p>
                    {selectedOrcamento.followUp.observacao && (
                      <p className="text-sm text-blue-700 mt-2">{selectedOrcamento.followUp.observacao}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

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

            <div className="flex gap-2 pt-4">
              <button
                onClick={() => {
                  handleSendWhatsApp(selectedOrcamento, 'followup');
                  setIsDetailModalOpen(false);
                }}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors font-medium text-center"
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                WhatsApp
              </button>
              <button
                onClick={() => {
                  setSelectedOrcamento(selectedOrcamento);
                  setIsDetailModalOpen(false);
                  setIsFollowUpModalOpen(true);
                }}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors font-medium text-center"
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Follow-up
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
