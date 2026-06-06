'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import { Atendimento, Cliente, Produto, VariavelAcabamento } from '@/types';
import { Loader2, MessageCircle, Download, AlertCircle } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { OrcamentoPDF } from '@/lib/utils/gerador-pdf';

interface PageProps {
  params: {
    id: string;
  };
}

export default function OrcamentoPublicoPage({ params }: PageProps) {
  const [orcamento, setOrcamento] = useState<(Atendimento & { id: string }) | null>(null);
  const [cliente, setCliente] = useState<(Cliente & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<(Produto & { id: string })[]>([]);
  const [acabamentos, setAcabamentos] = useState<(VariavelAcabamento & { id: string })[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar orçamento
        const orcRef = doc(db, 'atendimentos', params.id);
        const orcSnap = await getDoc(orcRef);

        if (!orcSnap.exists()) {
          setError('Orçamento não encontrado');
          setLoading(false);
          return;
        }

        const orcData = { ...(orcSnap.data() as Atendimento), id: orcSnap.id };
        setOrcamento(orcData);

        // Carregar cliente
        if (orcData.clienteId) {
          const clienteRef = doc(db, 'clientes', orcData.clienteId);
          const clienteSnap = await getDoc(clienteRef);
          if (clienteSnap.exists()) {
            setCliente({ ...(clienteSnap.data() as Cliente), id: clienteSnap.id });
          }
        }

        // Carregar produtos e acabamentos (para nomes e geração de PDF)
        const [produtosSnap, acabamentosSnap] = await Promise.all([
          getDocs(collection(db, 'produtos')),
          getDocs(collection(db, 'variaveis_acabamento')),
        ]);
        setProdutos(
          produtosSnap.docs.map((d) => ({ ...(d.data() as Produto), id: d.id }))
        );
        setAcabamentos(
          acabamentosSnap.docs.map((d) => ({ ...(d.data() as VariavelAcabamento), id: d.id }))
        );

        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar:', err);
        setError('Erro ao carregar orçamento');
        setLoading(false);
      }
    };

    loadData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mali-primary/10 to-mali-secondary/10">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-mali-primary mx-auto mb-4" />
          <p className="text-foreground">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  if (error || !orcamento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mali-primary/10 to-mali-secondary/10 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Oops!</h1>
          <p className="text-muted-foreground mb-6">{error || 'Orçamento não encontrado'}</p>
          <a
            href="/"
            className="inline-block px-6 py-2 bg-mali-primary text-white rounded-lg hover:bg-mali-primary-dark transition-colors"
          >
            Voltar ao Início
          </a>
        </div>
      </div>
    );
  }

  const getNomeAcabamento = (id: string) => {
    return acabamentos.find((a) => a.id === id)?.nomeDaOpcao || 'N/A';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mali-primary/10 to-mali-secondary/10 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Card Principal */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-mali-primary to-mali-primary-dark p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">Seu Orçamento Mali Mobile</h1>
            <p className="text-mali-accent/80">Nº {orcamento.id.substring(0, 8).toUpperCase()}</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8">
            {/* Cliente Info */}
            {cliente && (
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h2 className="text-lg font-semibold text-foreground mb-4">Informações do Cliente</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Nome</p>
                    <p className="text-lg font-medium text-foreground">{cliente.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                    <p className="text-lg font-medium text-foreground">{cliente.telefoneWhatsapp}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Itens */}
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Itens do Orçamento</h2>
              <div className="space-y-4">
                {orcamento.itens?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    {item.foto && (
                      <img
                        src={item.foto}
                        alt={item.nome}
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-lg">{item.nome}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{getNomeAcabamento(item.acabamentoEscolhido)}</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Quantidade:</span>
                          <p className="font-semibold text-foreground">{item.qtd}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Preço Unitário:</span>
                          <p className="font-semibold text-foreground">R$ {(item.precoAplicado ?? 0).toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Subtotal:</span>
                          <p className="font-bold text-mali-primary text-lg">
                            R$ {((item.precoAplicado ?? 0) * (item.qtd ?? 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-gradient-to-r from-mali-primary/10 to-mali-secondary/10 rounded-lg p-6 border-2 border-mali-primary">
              <h2 className="text-lg font-semibold text-foreground mb-4">Resumo do Orçamento</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">R$ {orcamento.resumoVisual?.subtotal?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm text-orange-600">
                  <span>Desconto Oferecido:</span>
                  <span className="font-bold">-R$ {orcamento.resumoVisual?.valorDescontos?.toFixed(2) ?? '0.00'}</span>
                </div>
                <div className="h-px bg-mali-primary/30"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-foreground">TOTAL:</span>
                  <span className="text-3xl font-bold text-mali-primary">
                    R$ {orcamento.resumoVisual?.totalFinal?.toFixed(2) ?? '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                ✓ <strong>Orçamento válido por 30 dias</strong> a partir da data de emissão
              </p>
              <p className="text-sm text-blue-900 mt-2">
                ✓ Este orçamento está sujeito à confirmação de estoque e disponibilidade
              </p>
            </div>

            {/* Ações */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href={`https://wa.me/${cliente?.telefoneWhatsapp?.replace(/\D/g, '')}?text=Olá! Gostaria de confirmar o orçamento nº ${orcamento.id.substring(0, 8).toUpperCase()} no valor de R$ ${orcamento.resumoVisual?.totalFinal?.toFixed(2) ?? '0.00'}. Segue o link: ${typeof window !== 'undefined' ? window.location.href : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-semibold"
              >
                <MessageCircle className="w-5 h-5" />
                Aprovar via WhatsApp
              </a>

              {orcamento.itens && orcamento.itens.length > 0 && (
                <PDFDownloadLink
                  document={
                    <OrcamentoPDF
                      atendimento={orcamento}
                      produtos={produtos}
                      acabamentos={acabamentos}
                      nomeEmpresa="Mali Mobile"
                    />
                  }
                  fileName={`orcamento-${orcamento.id.substring(0, 8)}.pdf`}
                >
                  {({ blob, url, loading, error }) => (
                    <button
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-semibold disabled:opacity-50"
                    >
                      <Download className="w-5 h-5" />
                      {loading ? 'Gerando...' : 'Baixar PDF'}
                    </button>
                  )}
                </PDFDownloadLink>
              )}

              <button
                onClick={() => window.print()}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold"
              >
                🖨️ Imprimir
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 border-t border-gray-200 p-6 text-center text-sm text-muted-foreground">
            <p>Mali Mobile - Sistema de Gestão de Vendas</p>
            <p className="mt-1">Qualquer dúvida, entre em contato conosco!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
