'use client';

import { useAuth, useCollection } from '@/lib/hooks';
import { Atendimento, Produto, Cliente, VariavelAcabamento } from '@/types';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { query, where, getDocs, collection } from 'firebase/firestore';
import { Copy, Eye, Share2, Download, MessageCircle, Check } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { OrcamentoPDF } from '@/lib/utils/gerador-pdf';

type OrcamentoComDetalhes = Atendimento & {
  id: string;
  cliente?: Cliente & { id: string };
  vendedor?: any;
};

export default function OrcamentosPage() {
  const { userProfile } = useAuth();
  const { data: atendimentos } = useCollection<Atendimento>('atendimentos');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { data: produtos } = useCollection<Produto>('produtos');
  const { data: acabamentos } = useCollection<VariavelAcabamento>('variaveis_acabamento');

  const [orcamentos, setOrcamentos] = useState<OrcamentoComDetalhes[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'meus'>('pendentes');
  const [selectedOrc, setSelectedOrc] = useState<OrcamentoComDetalhes | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState('Mali Mobile');

  // Carregar orçamentos
  useEffect(() => {
    let filtered = atendimentos
      .filter((a) => a.tipo === 'orcamento')
      .map((a) => ({
        ...(a as Atendimento & { id: string }),
        cliente: clientes.find((c) => c.id === (a as any).clienteId),
      }));

    if (filtro === 'pendentes') {
      filtered = filtered.filter((a) => a.status === 'pendente');
    } else if (filtro === 'meus') {
      filtered = filtered.filter((a) => a.vendedorId === userProfile?.uid);
    }

    setOrcamentos(filtered);
  }, [atendimentos, clientes, userProfile, filtro]);

  const handleCopyLink = (orcamentoId: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/orcamento/${orcamentoId}`;
    navigator.clipboard.writeText(link);
    setLinkCopiado(true);
    setTimeout(() => setLinkCopiado(false), 2000);
  };

  const handleShareWhatsApp = (orcamento: OrcamentoComDetalhes) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${baseUrl}/orcamento/${orcamento.id}`;
    const clienteNome = orcamento.cliente?.nome || 'Cliente';
    const total = orcamento.resumoVisual?.totalFinal.toFixed(2) || '0.00';
    const telefone = orcamento.cliente?.telefoneWhatsapp?.replace(/\D/g, '') || '';

    const mensagem = encodeURIComponent(
      `Olá ${clienteNome}! 👋\n\nSegue o seu orçamento no valor de R$ ${total}:\n\n${link}\n\nQualquer dúvida, estou à disposição! 😊`
    );

    if (telefone) {
      window.open(`https://wa.me/${telefone}?text=${mensagem}`, '_blank');
    } else {
      alert('Cliente sem WhatsApp registrado');
    }
  };

  const handleViewDetails = (orc: OrcamentoComDetalhes) => {
    setSelectedOrc(orc);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Orçamentos</h1>
        <p className="text-muted-foreground mt-2">Gerencie e compartilhe orçamentos com clientes</p>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        {[
          { value: 'pendentes', label: '📋 Pendentes' },
          { value: 'meus', label: '👤 Meus Orçamentos' },
          { value: 'todos', label: '📊 Todos' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value as any)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filtro === f.value
                ? 'bg-mali-primary text-mali-secondary'
                : 'bg-card border border-border text-foreground hover:bg-background'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {orcamentos.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum orçamento encontrado
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Cliente</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Total</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Pontuação</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentos.map((orc) => (
                  <tr key={orc.id} className="border-b border-border hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">
                      {orc.cliente?.nome || 'Desconhecido'}
                    </td>
                    <td className="px-6 py-4 text-foreground">
                      R$ {orc.resumoVisual?.totalFinal.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-semibold ${
                        orc.resumoVisual && orc.resumoVisual.pontuacaoMedia >= 1.8
                          ? 'text-emerald-600'
                          : 'text-orange-600'
                      }`}>
                        {orc.resumoVisual?.pontuacaoMedia.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-600">
                        {orc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => handleViewDetails(orc)}
                        className="p-1 hover:bg-background rounded transition-colors"
                        title="Visualizar"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleCopyLink(orc.id)}
                        className="p-1 hover:bg-background rounded transition-colors"
                        title="Copiar link"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleShareWhatsApp(orc)}
                        className="p-1 hover:bg-background rounded transition-colors"
                        title="Enviar via WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        title="Detalhes do Orçamento"
        onClose={() => setIsDetailModalOpen(false)}
        size="xl"
      >
        {selectedOrc && (
          <div className="space-y-4">
            {/* Ações Rápidas */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleCopyLink(selectedOrc.id)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 rounded-md hover:bg-blue-500/20 transition-colors font-medium text-sm"
              >
                <Copy className="w-4 h-4" />
                {linkCopiado ? 'Link Copiado!' : 'Copiar Link'}
              </button>
              <button
                onClick={() => handleShareWhatsApp(selectedOrc)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-md hover:bg-emerald-500/20 transition-colors font-medium text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Enviar WhatsApp
              </button>
              {selectedOrc.itens && selectedOrc.itens.length > 0 && (
                <PDFDownloadLink
                  document={
                    <OrcamentoPDF
                      atendimento={selectedOrc}
                      produtos={produtos}
                      acabamentos={acabamentos}
                      nomeEmpresa={nomeEmpresa}
                    />
                  }
                  fileName={`orcamento-${selectedOrc.id.substring(0, 8)}.pdf`}
                >
                  {({ blob, url, loading, error }) => (
                    <button
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-600 rounded-md hover:bg-orange-500/20 transition-colors font-medium text-sm"
                    >
                      <Download className="w-4 h-4" />
                      {loading ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
              )}
            </div>

            {/* Informações */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">Cliente</h4>
                <p className="text-sm text-foreground">{selectedOrc.cliente?.nome}</p>
                <p className="text-xs text-muted-foreground mt-2">WhatsApp:</p>
                <p className="text-sm text-foreground">{selectedOrc.cliente?.telefoneWhatsapp}</p>
              </div>

              <div className="p-4 bg-background rounded-lg border border-border">
                <h4 className="font-semibold text-foreground mb-2">Valores</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">R$ {selectedOrc.resumoVisual?.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-orange-600">
                    <span>Desconto:</span>
                    <span className="font-medium">-R$ {selectedOrc.resumoVisual?.valorDescontos.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 mt-1">
                    <span className="font-semibold">Total:</span>
                    <span className="font-bold text-mali-primary text-lg">
                      R$ {selectedOrc.resumoVisual?.totalFinal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Itens */}
            <div className="p-4 bg-background rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-3">Itens</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedOrc.itens?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm p-2 bg-card rounded">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{item.nome}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {item.qtd}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">R$ {(item.precoAplicado * item.qtd).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Pont: {item.pontuacaoReal?.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Link Compartilhável */}
            <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-sm font-semibold text-blue-600 mb-2">Link Compartilhável</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/orcamento/${selectedOrc.id}`}
                  className="flex-1 px-3 py-2 bg-white border border-blue-200 rounded text-xs text-foreground"
                />
                <button
                  onClick={() => handleCopyLink(selectedOrc.id)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  {linkCopiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                📱 Link é mobile-friendly - compartilhe com o cliente!
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
