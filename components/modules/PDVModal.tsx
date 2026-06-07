'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth, useCollection, useAddDocument, useDebounce } from '@/lib/hooks';
import { Produto, Cliente, EstoqueItem, Fornecedor, CondicaoPagamentoConfig, Especificador } from '@/types';
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
import { ControlBar, SearchProducts, ItemsTable, ParcelasTable, VersaoGerencial } from './pdv';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { baixarEstoquePorVenda, dispararPedidosEncomenda } from '@/lib/estoque';
import { ShoppingCart, FileText, Loader2, Eye, EyeOff, X } from 'lucide-react';

interface PDVModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  const { data: especificadores } = useCollection<Especificador>('especificadores');
  const { add: addAtendimento } = useAddDocument('atendimentos');
  const { add: addCliente } = useAddDocument('clientes');
  const { add: addContaPagar } = useAddDocument('contas_pagar');
  const { add: addContaReceber } = useAddDocument('contas_receber');

  // Disponibilidade por produto
  const disponibilidade = useMemo(() => {
    const mapa: Record<string, number> = {};
    estoque.forEach((e) => {
      if (LOCALIZACOES_DISPONIVEIS.includes(e.localizacao)) {
        mapa[e.produtoId] = (mapa[e.produtoId] || 0) + (e.quantidade || 0);
      }
    });
    return mapa;
  }, [estoque]);

  // State
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [clienteId, setClienteId] = useState('');
  const [especificadorId, setEspecificadorId] = useState('');
  const [isClienteModalOpen, setIsClienteModalOpen] = useState(false);
  const [novoClienteData, setNovoClienteData] = useState({
    nome: '',
    cpfCnpj: '',
    telefoneWhatsapp: '',
    endereco: '',
  });

  // Negociação: desconto% e pontuação com debounce
  const [descontoPercentual, setDescontoPercentual] = useState(0);
  const descontoPercentualDebounced = useDebounce(descontoPercentual, 2000);

  const [pontuacaoPadraoEditavel, setPontuacaoPadraoEditavel] = useState(2.0);
  const pontuacaoPadraoDebounced = useDebounce(pontuacaoPadraoEditavel, 2000);

  const [condicaoId, setCondicaoId] = useState('avista');
  const [entradaManual, setEntradaManual] = useState<number | undefined>(undefined);
  const [parcelasEditaveis, setParcelasEditaveis] = useState<
    Record<number, { valor?: number; vencimento?: Date }>
  >({});
  const [apresentacao, setApresentacao] = useState(false);

  // Config
  const [pontuacaoPadrao, setPontuacaoPadrao] = useState(2.0);
  const [taxaJurosMensal, setTaxaJurosMensal] = useState(0.02);
  const [condicoes, setCondicoes] = useState<CondicaoPagamentoConfig[]>(condicoesPadrao());
  const [limitePerfil, setLimitePerfil] = useState(1.8);
  const [processando, setProcessando] = useState(false);

  // Resetar ao abrir
  useEffect(() => {
    if (isOpen) {
      setCarrinho([]);
      setClienteId('');
      setEspecificadorId('');
      setDescontoPercentual(0);
      setPontuacaoPadraoEditavel(2.0);
      setEntradaManual(undefined);
      setApresentacao(false);
      setProcessando(false);
      setParcelasEditaveis({});
    }
  }, [isOpen]);

  // Carregar config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'empresa', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPontuacaoPadrao(data.pontuacaoPadrao || 2.0);
          setPontuacaoPadraoEditavel(data.pontuacaoPadrao || 2.0);
          setTaxaJurosMensal(data.taxaJurosMensal ?? 0.02);

          const conds: CondicaoPagamentoConfig[] =
            Array.isArray(data.condicoesPagamento) && data.condicoesPagamento.length > 0
              ? data.condicoesPagamento.filter((c: CondicaoPagamentoConfig) => c.ativo)
              : condicoesPadrao();
          const ordenadas = conds.sort((a, b) => a.ordem - b.ordem);
          setCondicoes(ordenadas);
          setCondicaoId(ordenadas[0]?.id || 'avista');

          if (userProfile?.perfil === 'admin') {
            setLimitePerfil(1.0);
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

  // Especificador selecionado (comissão capturada do cadastro).
  const especificador = useMemo(
    () => especificadores.find((e) => e.id === especificadorId),
    [especificadores, especificadorId]
  );

  // ===================== CÁLCULO (motor) =====================
  const resumo = useMemo(
    () =>
      resumirCarrinho(
        carrinho,
        pontuacaoPadraoDebounced,
        descontoPercentualDebounced,
        especificador?.comissao ?? 0
      ),
    [carrinho, pontuacaoPadraoDebounced, descontoPercentualDebounced, especificador]
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

  const condicaoTemEntrada =
    condicaoSelecionada.tipo === 'entrada_parcelado' || condicaoSelecionada.temEntrada;

  // ===================== HANDLERS =====================
  const handleAddItem = (produtoId: string, quantidade: number) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;

    const existente = carrinho.findIndex((i) => i.produtoId === produtoId);
    if (existente >= 0) {
      handleUpdateQtd(existente, carrinho[existente].quantidade + quantidade);
      return;
    }

    const precoVistaUnit = calcularCMV(produto) * pontuacaoPadraoDebounced;
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
      const fatorDesc = 1 - descontoPercentualDebounced / 100;

      const atendimento = {
        tipo,
        pipelineVendedor: 'novo',
        status: tipo === 'orcamento' ? 'pendente' : 'finalizado',
        clienteId,
        clienteNome: clienteSelecionado?.nome || '',
        clienteTelefone: clienteSelecionado?.telefoneWhatsapp || '',
        vendedorId: userProfile?.uid,
        ...(especificador
          ? {
              especificadorId: especificador.id,
              especificadorNome: especificador.nome,
              especificadorComissao: resumo.comissaoPercentual,
              especificadorComissaoValor: resumo.comissaoValor,
            }
          : {}),
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
          descontoPercentual: descontoPercentualDebounced,
        },
        pagamento: {
          condicaoId: condicaoSelecionada.id,
          condicaoNome: condicaoSelecionada.nome,
          valorProposta: plano.proposta,
          entrada: plano.entrada,
          parcelas: plano.parcelas.map((p) => ({
            numero: p.numero,
            valor: parcelasEditaveis[p.numero]?.valor ?? p.valor,
            vencimento: parcelasEditaveis[p.numero]?.vencimento ?? p.vencimento,
          })),
        },
        logistica: { statusEntrega: 'agendada' },
      };

      const atendimentoId = await addAtendimento(atendimento);

      // Integração estoque/compras
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
          mensagemExtra = `\n\nPedido(s) de compra gerado(s): ${numeros.join(', ')}.`;
        }

        // Conta a receber: parcelas da venda (entrada hoje + demais vencimentos).
        const parcelasReceber = [
          ...(plano.entrada > 0
            ? [{ numero: 0, valor: plano.entrada, vencimento: new Date(), pago: false }]
            : []),
          ...plano.parcelas.map((p) => ({
            numero: p.numero,
            valor: parcelasEditaveis[p.numero]?.valor ?? p.valor,
            vencimento: parcelasEditaveis[p.numero]?.vencimento ?? p.vencimento,
            pago: false,
          })),
        ];
        await addContaReceber({
          referenciaId: atendimentoId,
          parcelas: parcelasReceber,
          valorTotal: plano.proposta,
          status: 'aberto',
          descricao: `Venda ${condicaoSelecionada.nome} - ${clienteSelecionado?.nome || ''}`.trim(),
          criadoEm: new Date(),
          atualizadoEm: new Date(),
        });

        // Conta a pagar: comissão do especificador (vencimento em 30 dias).
        if (especificador && resumo.comissaoValor > 0) {
          const vencComissao = new Date();
          vencComissao.setDate(vencComissao.getDate() + 30);
          await addContaPagar({
            referenciaId: atendimentoId,
            parcelas: [
              { numero: 1, valor: resumo.comissaoValor, vencimento: vencComissao, pago: false },
            ],
            valorTotal: resumo.comissaoValor,
            status: 'aberto',
            descricao: `Comissão (${resumo.comissaoPercentual.toFixed(1)}%) - ${especificador.nome}`,
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          });
          mensagemExtra += `\n\nComissão de R$ ${fmt(resumo.comissaoValor)} lançada em Contas a Pagar para ${especificador.nome}.`;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border shadow-xl w-full max-w-7xl my-4 flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== Header ===== */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">Orçamento / Venda</h2>
            <button
              onClick={() => setApresentacao((v) => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                apresentacao
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                  : 'bg-background border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {apresentacao ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Apresentação: {apresentacao ? 'ON' : 'OFF'}
            </button>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-background rounded-md transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* ===== Control Bar ===== */}
        <ControlBar
          descontoPercentual={descontoPercentual}
          onDescontoChange={setDescontoPercentual}
          pontuacaoPadrao={pontuacaoPadraoEditavel}
          onPontuacaoChange={setPontuacaoPadraoEditavel}
          condicaoId={condicaoId}
          condicoes={condicoes}
          onCondicaoChange={setCondicaoId}
          totalProposta={plano.proposta}
          pontuacaoMedia={resumo.pontuacaoMedia}
          limitePerfil={limitePerfil}
          vistaLiquido={resumo.vistaLiquido}
          apresentacao={apresentacao}
        />

        {/* ===== Corpo (grid 2 cols) ===== */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-4 min-h-0">
          {/* ESQUERDA: Cliente, Busca, Itens, Gerencial */}
          <div className="flex-1 flex flex-col gap-4 min-w-0 min-h-0 lg:max-w-xl">
            {/* Cliente */}
            <div className="bg-background rounded-lg border border-border p-3 flex-shrink-0">
              <h3 className="font-semibold text-foreground mb-2 text-sm">Cliente</h3>
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
                  className="px-3 py-2 bg-card border border-border rounded-md text-foreground hover:bg-background transition-colors text-sm font-medium"
                >
                  +
                </button>
              </div>

              {/* Especificador (indicador com comissão) */}
              {!apresentacao && (
                <div className="mt-3">
                  <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                    Especificador (indicação)
                  </label>
                  <select
                    value={especificadorId}
                    onChange={(e) => setEspecificadorId(e.target.value)}
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  >
                    <option value="">Sem especificador</option>
                    {especificadores
                      .filter((e) => e.ativo)
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nome} — {(e.comissao ?? 0).toFixed(1)}%
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* Busca */}
            <SearchProducts
              produtos={produtos}
              onAddItem={handleAddItem}
              loading={produtosLoading}
            />

            {/* Itens */}
            <ItemsTable
              carrinho={carrinho}
              resumo={resumo}
              disponibilidade={disponibilidade}
              apresentacao={apresentacao}
              limitePerfil={limitePerfil}
              vistaLiquido={resumo.vistaLiquido}
              proposta={plano.proposta}
              condicaoNome={condicaoSelecionada.nome}
              onUpdateQtd={handleUpdateQtd}
              onRemoveItem={handleRemoveItem}
              onUpdateModalidade={handleUpdateModalidade}
            />

            {/* Visão Gerencial */}
            <VersaoGerencial
              resumo={resumo}
              plano={plano}
              validacao={validacao}
              apresentacao={apresentacao}
              especificadorNome={especificador?.nome}
            />
          </div>

          {/* DIREITA: Parcelas */}
          <div className="w-full lg:w-96 min-h-0">
            <ParcelasTable
              plano={plano}
              editavel={condicaoTemEntrada}
              onEntradaChange={setEntradaManual}
              onParcelaChange={(numero, patch) => {
                setParcelasEditaveis((prev) => ({
                  ...prev,
                  [numero]: { ...prev[numero], ...patch },
                }));
              }}
            />
          </div>
        </div>

        {/* ===== Rodapé: Botões ===== */}
        <div className="border-t border-border p-4 flex flex-col sm:flex-row gap-3 flex-shrink-0">
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
                  onChange={(e) =>
                    setNovoClienteData({ ...novoClienteData, telefoneWhatsapp: e.target.value })
                  }
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
