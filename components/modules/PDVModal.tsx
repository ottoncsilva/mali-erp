'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth, useCollection, useAddDocument } from '@/lib/hooks';
import { Produto, Cliente, EstoqueItem, Fornecedor, CondicaoPagamentoConfig } from '@/types';
import { LOCALIZACOES_DISPONIVEIS } from '@/types';
import {
  ItemCarrinho,
  resumirCarrinho,
  gerarPlanoPagamento,
  validarTravaNegociacao,
  pontuacaoDoProduto,
  calcularCMV,
  condicoesPadrao,
} from '@/lib/utils/precificacao';
import { ProdutoSearch } from '@/components/modules/ProdutoSearch';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { baixarEstoquePorVenda, dispararPedidosEncomenda } from '@/lib/estoque';
import {
  Plus,
  ShoppingCart,
  FileText,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  X,
  Minus,
} from 'lucide-react';

interface PDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado após salvar com sucesso (orçamento ou venda). */
  onSaved?: () => void;
}

const fmt = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function PDVModal({ isOpen, onClose, onSaved }: PDVModalProps) {
  const { userProfile } = useAuth();
  const { data: produtos, loading: produtosLoading } = useCollection<Produto>('produtos');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { data: estoque } = useCollection<EstoqueItem>('estoque');
  const { data: fornecedores } = useCollection<Fornecedor>('fornecedores');
  const { add: addAtendimento } = useAddDocument('atendimentos');
  const { add: addCliente } = useAddDocument('clientes');

  // Disponibilidade por produto (showroom + depósito).
  const disponibilidade = useMemo(() => {
    const mapa: Record<string, number> = {};
    estoque.forEach((e) => {
      if (LOCALIZACOES_DISPONIVEIS.includes(e.localizacao)) {
        mapa[e.produtoId] = (mapa[e.produtoId] || 0) + (e.quantidade || 0);
      }
    });
    return mapa;
  }, [estoque]);

  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [novoClienteData, setNovoClienteData] = useState({
    nome: '',
    cpfCnpj: '',
    telefoneWhatsapp: '',
    endereco: '',
  });

  // Negociação
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const [condicaoId, setCondicaoId] = useState('avista');
  const [entradaManual, setEntradaManual] = useState<number | undefined>(undefined);
  const [apresentacao, setApresentacao] = useState(false);

  // Config
  const [pontuacaoPadrao, setPontuacaoPadrao] = useState(2.0);
  const [taxaJurosMensal, setTaxaJurosMensal] = useState(0.02);
  const [condicoes, setCondicoes] = useState<CondicaoPagamentoConfig[]>(condicoesPadrao());
  const [limitePerfil, setLimitePerfil] = useState(1.8);
  const [processando, setProcessando] = useState(false);

  // Resetar estado quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setCarrinho([]);
      setClienteId('');
      setDescontoPercentual(0);
      setEntradaManual(undefined);
      setApresentacao(false);
      setProcessando(false);
    }
  }, [isOpen]);

  // Carregar configurações
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'empresa', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPontuacaoPadrao(data.pontuacaoPadrao || 2.0);
          setTaxaJurosMensal(data.taxaJurosMensal ?? 0.02);

          const conds: CondicaoPagamentoConfig[] =
            Array.isArray(data.condicoesPagamento) && data.condicoesPagamento.length > 0
              ? data.condicoesPagamento.filter((c: CondicaoPagamentoConfig) => c.ativo)
              : condicoesPadrao();
          const ordenadas = conds.sort((a, b) => a.ordem - b.ordem);
          setCondicoes(ordenadas);
          setCondicaoId(ordenadas[0]?.id || 'avista');

          if (userProfile?.perfil === 'admin') {
            setLimitePerfil(1.0); // Ilimitado
          } else if (userProfile?.perfil === 'gerencia') {
            setLimitePerfil(data.limitesPontuacao?.gerencia || 1.5);
          } else {
            setLimitePerfil(data.limitesPontuacao?.vendedor || 1.8);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar config:', err);
      }
    };

    if (isOpen) loadConfig();
  }, [userProfile, isOpen]);

  // ===================== CÁLCULO (motor) =====================
  const resumo = useMemo(
    () => resumirCarrinho(carrinho, pontuacaoPadrao, descontoPercentual),
    [carrinho, pontuacaoPadrao, descontoPercentual]
  );

  const condicaoSelecionada = useMemo(
    () => condicoes.find((c) => c.id === condicaoId) || condicoes[0] || condicoesPadrao()[0],
    [condicoes, condicaoId]
  );

  const plano = useMemo(
    () => gerarPlanoPagamento(resumo.vistaLiquido, condicaoSelecionada, taxaJurosMensal, { entradaManual }),
    [resumo.vistaLiquido, condicaoSelecionada, taxaJurosMensal, entradaManual]
  );

  const validacao = validarTravaNegociacao(resumo.pontuacaoMedia, limitePerfil);

  // ===================== HANDLERS CARRINHO =====================
  const handleAddItem = (produtoId: string, quantidade: number) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;

    // Se já existe, soma a quantidade.
    const existente = carrinho.findIndex((i) => i.produtoId === produtoId);
    if (existente >= 0) {
      handleUpdateQtd(existente, carrinho[existente].quantidade + quantidade);
      return;
    }

    const precoVistaUnit = calcularCMV(produto) * pontuacaoDoProduto(produto, pontuacaoPadrao);
    const dispEstoque = disponibilidade[produtoId] ?? 0;
    const novoItem: ItemCarrinho = {
      produtoId,
      produto,
      quantidade,
      precoAplicado: precoVistaUnit,
      desconto: 0,
      modalidade: dispEstoque >= quantidade ? 'estoque' : 'encomenda',
    };
    setCarrinho([...carrinho, novoItem]);
  };

  const handleUpdateQtd = (index: number, qtd: number) => {
    const q = Math.max(1, qtd || 1);
    setCarrinho((prev) => prev.map((it, i) => (i === index ? { ...it, quantidade: q } : it)));
  };

  const handleRemoveItem = (index: number) => {
    setCarrinho(carrinho.filter((_, i) => i !== index));
  };

  const handleUpdateModalidade = (index: number, modalidade: 'estoque' | 'encomenda') => {
    setCarrinho((prev) => prev.map((it, i) => (i === index ? { ...it, modalidade } : it)));
  };

  const handleCreateCliente = async () => {
    if (!novoClienteData.nome || !novoClienteData.telefoneWhatsapp) {
      alert('Preencha Nome e WhatsApp');
      return;
    }
    try {
      const docRef = await addCliente({
        nome: novoClienteData.nome,
        cpfCnpj: novoClienteData.cpfCnpj,
        telefoneWhatsapp: novoClienteData.telefoneWhatsapp,
        endereco: novoClienteData.endereco,
        classificacao: 'novo',
        criadoEm: new Date(),
      });
      setClienteId(docRef);
      setNovoClienteData({ nome: '', cpfCnpj: '', telefoneWhatsapp: '', endereco: '' });
      setIsClienteModalOpen(false);
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  // ===================== SALVAR =====================
  const handleSalvar = async (tipo: 'orcamento' | 'venda') => {
    if (carrinho.length === 0) {
      alert('Carrinho vazio');
      return;
    }
    if (!clienteId) {
      alert('Selecione ou cadastre um cliente');
      return;
    }
    if (tipo === 'venda' && !validacao.valido) {
      alert(validacao.motivo);
      return;
    }

    setProcessando(true);
    try {
      const clienteSelecionado = clientes.find((c) => c.id === clienteId);
      const fatorDesc = 1 - descontoPercentual / 100;

      const atendimento = {
        tipo,
        pipelineVendedor: 'novo',
        status: tipo === 'orcamento' ? 'pendente' : 'finalizado',
        clienteId,
        clienteNome: clienteSelecionado?.nome || '',
        clienteTelefone: clienteSelecionado?.telefoneWhatsapp || '',
        vendedorId: userProfile?.uid,
        itens: carrinho.map((item) => {
          const cmv = calcularCMV(item.produto);
          const precoVistaUnit = item.precoAplicado;
          const precoAplicadoUnit = precoVistaUnit * fatorDesc;
          return {
            produtoId: item.produtoId,
            nome: item.produto.nome,
            foto: item.produto.fotoPrincipal,
            qtd: item.quantidade,
            cmvUnitario: cmv,
            precoTabela: precoVistaUnit,
            precoAplicado: precoAplicadoUnit,
            descontoConcedido: (precoVistaUnit - precoAplicadoUnit) * item.quantidade,
            pontuacaoReal: cmv > 0 ? precoAplicadoUnit / cmv : 0,
          };
        }),
        resumoVisual: {
          subtotal: resumo.subtotalVista,
          valorDescontos: resumo.valorDescontos,
          totalFinal: plano.proposta,
          pontuacaoMedia: resumo.pontuacaoMedia,
          precoVista: resumo.vistaLiquido,
          descontoPercentual,
        },
        pagamento: {
          condicaoId: condicaoSelecionada.id,
          condicaoNome: condicaoSelecionada.nome,
          valorProposta: plano.proposta,
          entrada: plano.entrada,
          parcelas: plano.parcelas.map((p) => ({
            numero: p.numero,
            valor: p.valor,
            vencimento: p.vencimento,
          })),
        },
        logistica: { statusEntrega: 'agendada' },
      };

      const atendimentoId = await addAtendimento(atendimento);

      // Integração com Estoque/Compras: apenas para vendas confirmadas.
      let mensagemExtra = '';
      if (tipo === 'venda') {
        const ctx = { registradoPorId: userProfile?.uid || '', registradoPorNome: userProfile?.nome };
        const encomendas: Array<{
          produtoId: string;
          nomeProduto: string;
          skuProduto: string;
          quantidade: number;
          custoUnitario: number;
          icms: number;
          ipi: number;
          fornecedorId: string;
          fornecedorNome: string;
        }> = [];

        for (const item of carrinho) {
          const disp = disponibilidade[item.produtoId] ?? 0;
          const modalidade = item.modalidade ?? (disp >= item.quantidade ? 'estoque' : 'encomenda');

          if (modalidade === 'estoque') {
            await baixarEstoquePorVenda(
              {
                produtoId: item.produtoId,
                produtoNome: item.produto.nome,
                produtoSku: item.produto.sku,
              },
              item.quantidade,
              atendimentoId,
              ctx
            );
          } else {
            const fornecedor = fornecedores.find((f) => f.id === item.produto.fornecedorId);
            encomendas.push({
              produtoId: item.produtoId,
              nomeProduto: item.produto.nome,
              skuProduto: item.produto.sku,
              quantidade: item.quantidade,
              custoUnitario: item.produto.custoProduto || 0,
              icms: item.produto.icms || 0,
              ipi: item.produto.ipi || 0,
              fornecedorId: item.produto.fornecedorId || '',
              fornecedorNome: fornecedor?.razaoSocial || '',
            });
          }
        }

        if (encomendas.length > 0) {
          const numeros = await dispararPedidosEncomenda(encomendas, atendimentoId, ctx);
          mensagemExtra = `\n\nPedido(s) de compra gerado(s) para itens sob encomenda: ${numeros.join(', ')}.`;
        }
      }

      alert(`${tipo === 'orcamento' ? 'Orçamento salvo' : 'Venda concluída'} com sucesso!${mensagemExtra}`);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao salvar');
    } finally {
      setProcessando(false);
    }
  };

  if (!isOpen) return null;

  const temItens = carrinho.length > 0;
  const condicaoTemEntrada =
    condicaoSelecionada.tipo === 'entrada_parcelado' || condicaoSelecionada.temEntrada;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border shadow-xl w-full max-w-6xl my-4 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header + barra de resumo ===== */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Orçamento / Venda</h2>
            <button
              onClick={() => setApresentacao((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                apresentacao
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
              title="Oculta informações internas (pontuação, à vista, custo) para mostrar ao cliente"
            >
              {apresentacao ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Apresentação: {apresentacao ? 'ON' : 'OFF'}
            </button>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-background rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Barra superior de precificação */}
        <div className="flex flex-wrap items-end gap-4 px-5 py-3 bg-background border-b border-border text-sm">
          {!apresentacao && (
            <>
              <ResumoCampo label="PONT.">
                <span className={resumo.pontuacaoMedia >= limitePerfil ? 'text-emerald-600' : 'text-red-600'}>
                  {resumo.pontuacaoMedia.toFixed(2)}
                </span>
              </ResumoCampo>
              <ResumoCampo label="VISTA">R$ {fmt(resumo.vistaLiquido)}</ResumoCampo>
            </>
          )}
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Pagamento</span>
            <select
              value={condicaoId}
              onChange={(e) => {
                setCondicaoId(e.target.value);
                setEntradaManual(undefined); // recalcula entrada padrão ao trocar condição
              }}
              className="px-2 py-1 bg-card border border-border rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-mali-primary"
            >
              {condicoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <ResumoCampo label="Total" destaque>
            R$ {fmt(plano.proposta)}
          </ResumoCampo>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Desc. %</span>
            <input
              type="number"
              value={descontoPercentual || ''}
              onChange={(e) => setDescontoPercentual(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
              placeholder="0"
              step="0.5"
              min="0"
              max="100"
              className="w-20 px-2 py-1 bg-card border border-border rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-mali-primary"
            />
          </div>
        </div>

        {/* ===== Corpo ===== */}
        <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Esquerda: Cliente */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-background rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">Cliente</h3>
              <div className="flex gap-2">
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsClienteModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-md text-foreground hover:bg-background transition-colors text-sm"
                  title="Cadastrar novo cliente"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Busca de produtos (no fluxo mobile fica abaixo do cliente) */}
            <div className="lg:hidden">
              <ProdutoSearch produtos={produtos} onAddItem={handleAddItem} loading={produtosLoading} />
            </div>
          </div>

          {/* Direita: Produtos */}
          <div className="lg:col-span-2 space-y-4">
            <div className="hidden lg:block">
              <ProdutoSearch produtos={produtos} onAddItem={handleAddItem} loading={produtosLoading} />
            </div>

            {/* Tabela de itens */}
            <div className="bg-background rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-foreground">Itens ({carrinho.length})</h3>
              </div>
              {!temItens ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  Nenhum item. Busque produtos acima.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-xs uppercase">
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-2 font-medium">Produto</th>
                        <th className="text-center px-2 py-2 font-medium">Qtd</th>
                        {!apresentacao && <th className="text-right px-2 py-2 font-medium">V. Unit.</th>}
                        <th className="text-right px-2 py-2 font-medium">V. Total</th>
                        {!apresentacao && <th className="text-right px-2 py-2 font-medium">Pont.</th>}
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {carrinho.map((item, idx) => {
                        const r = resumo.itens[idx];
                        const disp = disponibilidade[item.produtoId] ?? 0;
                        const semEstoque = disp < item.quantidade;
                        const modalidade = item.modalidade ?? (semEstoque ? 'encomenda' : 'estoque');
                        return (
                          <tr key={item.produtoId} className="border-b border-border/60 align-top">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {item.produto.fotoPrincipal && (
                                  <img
                                    src={item.produto.fotoPrincipal}
                                    alt={item.produto.nome}
                                    className="w-9 h-9 rounded object-cover flex-shrink-0"
                                  />
                                )}
                                <div>
                                  <p className="font-medium text-foreground leading-tight">{item.produto.nome}</p>
                                  <p className="text-xs text-muted-foreground">{item.produto.sku}</p>
                                  {/* Modalidade de fornecimento */}
                                  <select
                                    value={modalidade}
                                    onChange={(e) =>
                                      handleUpdateModalidade(idx, e.target.value as 'estoque' | 'encomenda')
                                    }
                                    className="mt-1 px-1.5 py-0.5 bg-card border border-border rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-mali-primary"
                                  >
                                    <option value="estoque" disabled={semEstoque}>
                                      Estoque ({disp})
                                    </option>
                                    <option value="encomenda">Sob encomenda</option>
                                  </select>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleUpdateQtd(idx, item.quantidade - 1)}
                                  className="p-1 hover:bg-card rounded"
                                >
                                  <Minus className="w-3 h-3 text-muted-foreground" />
                                </button>
                                <input
                                  type="number"
                                  value={item.quantidade}
                                  min="1"
                                  onChange={(e) => handleUpdateQtd(idx, parseInt(e.target.value) || 1)}
                                  className="w-12 px-1 py-1 bg-card border border-border rounded text-center text-foreground focus:outline-none focus:ring-1 focus:ring-mali-primary"
                                />
                                <button
                                  onClick={() => handleUpdateQtd(idx, item.quantidade + 1)}
                                  className="p-1 hover:bg-card rounded"
                                >
                                  <Plus className="w-3 h-3 text-muted-foreground" />
                                </button>
                              </div>
                            </td>
                            {!apresentacao && (
                              <td className="px-2 py-3 text-right text-foreground">
                                R$ {fmt(r?.precoVistaTotal / item.quantidade || 0)}
                              </td>
                            )}
                            <td className="px-2 py-3 text-right font-semibold text-foreground">
                              R$ {fmt(r?.precoVistaTotal || 0)}
                            </td>
                            {!apresentacao && (
                              <td
                                className={`px-2 py-3 text-right font-medium ${
                                  (r?.pontuacao || 0) >= limitePerfil ? 'text-emerald-600' : 'text-red-600'
                                }`}
                              >
                                {(r?.pontuacao || 0).toFixed(2)}
                              </td>
                            )}
                            <td className="px-2 py-3 text-right">
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 hover:bg-card rounded"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-card">
                        <td colSpan={apresentacao ? 2 : 3} className="px-4 py-2 text-sm font-medium text-muted-foreground">
                          {apresentacao ? 'Total dos itens' : 'Soma à vista (c/ desconto)'}
                        </td>
                        <td className="px-2 py-2 text-right font-bold text-mali-primary">
                          R$ {fmt(resumo.vistaLiquido)}
                        </td>
                        {!apresentacao && <td></td>}
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== Negociação (largura total) ===== */}
        {temItens && (
          <div className="px-5 pb-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Parcelas */}
            <div className="bg-background rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">Parcelas — {condicaoSelecionada.nome}</h3>
                <span className="text-sm font-bold text-mali-primary">R$ {fmt(plano.proposta)}</span>
              </div>

              {/* Entrada editável */}
              {condicaoTemEntrada && (
                <div className="mb-3 flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Entrada (hoje):</label>
                  <input
                    type="number"
                    value={Number(plano.entrada.toFixed(2))}
                    min="0"
                    step="50"
                    onChange={(e) => setEntradaManual(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-32 px-2 py-1 bg-card border border-border rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-mali-primary"
                  />
                  <span className="text-xs text-muted-foreground">redistribui o restante</span>
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {plano.parcelas.map((p) => (
                  <div
                    key={p.numero}
                    className="flex items-center justify-between px-3 py-2 bg-card rounded border border-border text-sm"
                  >
                    <span className="text-muted-foreground">
                      Parcela {p.numero}
                      {condicaoTemEntrada ? '' : `/${plano.parcelas.length}`}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {p.vencimento.toLocaleDateString('pt-BR')}
                      </span>
                      <span className="font-semibold text-foreground">R$ {fmt(p.valor)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visão gerencial (oculta na apresentação) */}
            {!apresentacao && (
              <div className="bg-mali-secondary text-white rounded-lg p-4">
                <p className="text-xs uppercase tracking-wide text-white/60 mb-3">Visão Gerencial</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-white/60">Valor Proposta</p>
                    <p className="text-xl font-bold text-emerald-400">R$ {fmt(plano.proposta)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Preço à Vista</p>
                    <p className="text-xl font-bold text-blue-300">R$ {fmt(resumo.vistaLiquido)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Juros embutidos</p>
                    <p className="text-lg font-semibold text-amber-300">R$ {fmt(plano.juros)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Pontuação</p>
                    <p
                      className={`text-lg font-semibold ${
                        validacao.valido ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {resumo.pontuacaoMedia.toFixed(2)}x
                    </p>
                  </div>
                </div>
                {!validacao.valido && (
                  <p className="text-xs text-red-300 mt-3 border-t border-white/10 pt-2">{validacao.motivo}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== Rodapé: 2 botões ===== */}
        <div className="border-t border-border p-4 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleSalvar('orcamento')}
            disabled={!temItens || !clienteId || processando}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-background border border-border text-foreground rounded-lg hover:bg-card transition-colors disabled:opacity-50 font-semibold"
          >
            {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Salvar Orçamento
          </button>
          <button
            onClick={() => handleSalvar('venda')}
            disabled={!temItens || !clienteId || processando}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
          >
            {processando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Concluir Venda
          </button>
        </div>
      </div>

      {/* ===== Modal aninhado: Novo Cliente ===== */}
      {isClienteModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setIsClienteModalOpen(false)}
        >
          <div
            className="bg-card rounded-lg border border-border shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Cadastro Rápido de Cliente</h2>
              <button onClick={() => setIsClienteModalOpen(false)} className="p-1 hover:bg-background rounded">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateCliente();
              }}
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
                <input
                  type="text"
                  value={novoClienteData.nome}
                  onChange={(e) => setNovoClienteData({ ...novoClienteData, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">WhatsApp</label>
                <input
                  type="tel"
                  value={novoClienteData.telefoneWhatsapp}
                  onChange={(e) => setNovoClienteData({ ...novoClienteData, telefoneWhatsapp: e.target.value })}
                  placeholder="11999999999"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">CPF/CNPJ</label>
                <input
                  type="text"
                  value={novoClienteData.cpfCnpj}
                  onChange={(e) => setNovoClienteData({ ...novoClienteData, cpfCnpj: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Endereço</label>
                <input
                  type="text"
                  value={novoClienteData.endereco}
                  onChange={(e) => setNovoClienteData({ ...novoClienteData, endereco: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium"
                >
                  Criar Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setIsClienteModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Campo compacto da barra de resumo superior.
function ResumoCampo({
  label,
  children,
  destaque,
}: {
  label: string;
  children: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{label}</span>
      <span className={`font-bold ${destaque ? 'text-mali-primary text-base' : 'text-foreground'}`}>
        {children}
      </span>
    </div>
  );
}
