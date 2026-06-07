'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth, useCollection, useAddDocument } from '@/lib/hooks';
import { Produto, Cliente, VariavelAcabamento, EstoqueItem, Fornecedor } from '@/types';
import { LOCALIZACOES_DISPONIVEIS } from '@/types';
import { ItemCarrinho } from '@/lib/utils/precificacao';
import { ProdutoSearch } from '@/components/modules/ProdutoSearch';
import { CarrinhoSimulador } from '@/components/modules/CarrinhoSimulador';
import { Modal } from '@/components/ui/Modal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { baixarEstoquePorVenda, dispararPedidosEncomenda } from '@/lib/estoque';
import { Plus, ShoppingCart, FileText, Loader2 } from 'lucide-react';

interface PDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Chamado após salvar com sucesso (orçamento ou venda). */
  onSaved?: () => void;
}

export function PDVModal({ isOpen, onClose, onSaved }: PDVModalProps) {
  const { userProfile } = useAuth();
  const { data: produtos, loading: produtosLoading } = useCollection<Produto>('produtos');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { data: acabamentos } = useCollection<VariavelAcabamento>('variaveis_acabamento');
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
  const [tipoAtendimento, setTipoAtendimento] = useState<'orcamento' | 'venda'>('orcamento');
  const [pontuacaoPadrao, setPontuacaoPadrao] = useState(2.0);
  const [limitePerfil, setLimitePerfil] = useState(1.8);
  const [processando, setProcessando] = useState(false);

  // Resetar estado quando o modal abre
  useEffect(() => {
    if (isOpen) {
      setCarrinho([]);
      setClienteId('');
      setTipoAtendimento('orcamento');
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

  const handleAddItem = (produtoId: string, acabamentoId: string, quantidade: number) => {
    const produto = produtos.find((p) => p.id === produtoId);
    if (!produto) return;

    const precoTabela = produto.custoProduto + produto.icms + produto.ipi + produto.frete;
    const pontuacao =
      produto.tipoPontuacao === 'especial'
        ? produto.pontuacaoEspecial ?? pontuacaoPadrao
        : pontuacaoPadrao;
    const precoAplicado = precoTabela * pontuacao;

    const dispEstoque = disponibilidade[produtoId] ?? 0;
    const novoItem: ItemCarrinho = {
      produtoId,
      produto,
      acabamentoEscolhido: acabamentoId,
      quantidade,
      precoAplicado,
      desconto: 0,
      modalidade: dispEstoque >= quantidade ? 'estoque' : 'encomenda',
    };

    setCarrinho([...carrinho, novoItem]);
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

  const handleFinalizar = async () => {
    if (carrinho.length === 0) {
      alert('Carrinho vazio');
      return;
    }

    if (!clienteId) {
      alert('Selecione ou cadastre um cliente');
      return;
    }

    setProcessando(true);

    try {
      let subtotal = 0;
      let totalDescontos = 0;
      let somaPontuacoes = 0;

      carrinho.forEach((item) => {
        const pont =
          item.produto.tipoPontuacao === 'especial'
            ? item.produto.pontuacaoEspecial ?? pontuacaoPadrao
            : pontuacaoPadrao;
        const precoTabela = item.precoAplicado / pont;
        const precoTotalTabela = precoTabela * item.quantidade;
        const precoTotalAplicado = item.precoAplicado * item.quantidade;
        const desconto = precoTotalTabela - precoTotalAplicado;

        subtotal += precoTotalTabela;
        totalDescontos += desconto;
        somaPontuacoes +=
          (item.produto.custoProduto + item.produto.icms + item.produto.ipi + item.produto.frete) /
          item.precoAplicado;
      });

      // Denormaliza dados do cliente (página pública não lê coleção de clientes)
      const clienteSelecionado = clientes.find((c) => c.id === clienteId);

      const atendimento = {
        tipo: tipoAtendimento,
        pipelineVendedor: 'novo',
        status: tipoAtendimento === 'orcamento' ? 'pendente' : 'finalizado',
        clienteId,
        clienteNome: clienteSelecionado?.nome || '',
        clienteTelefone: clienteSelecionado?.telefoneWhatsapp || '',
        vendedorId: userProfile?.uid,
        itens: carrinho.map((item) => {
          const pont =
            item.produto.tipoPontuacao === 'especial'
              ? item.produto.pontuacaoEspecial ?? pontuacaoPadrao
              : pontuacaoPadrao;
          const cmv =
            item.produto.custoProduto + item.produto.icms + item.produto.ipi + item.produto.frete;
          return {
            produtoId: item.produtoId,
            acabamentoEscolhido: item.acabamentoEscolhido,
            nome: item.produto.nome,
            foto: item.produto.fotoPrincipal,
            qtd: item.quantidade,
            cmvUnitario: cmv,
            precoTabela: item.precoAplicado / pont,
            precoAplicado: item.precoAplicado,
            descontoConcedido: 0,
            pontuacaoReal: cmv / item.precoAplicado,
          };
        }),
        resumoVisual: {
          subtotal,
          valorDescontos: totalDescontos,
          totalFinal: subtotal - totalDescontos,
          pontuacaoMedia: somaPontuacoes / carrinho.length,
        },
        pagamentos: [],
        logistica: {
          statusEntrega: 'agendada',
        },
      };

      const atendimentoId = await addAtendimento(atendimento);

      // Integração com Estoque/Compras: apenas para vendas confirmadas.
      let mensagemExtra = '';
      if (tipoAtendimento === 'venda') {
        const ctx = { registradoPorId: userProfile?.uid || '', registradoPorNome: userProfile?.nome };
        const encomendas: Array<any> = [];

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

      setCarrinho([]);
      setClienteId('');
      alert(`${tipoAtendimento === 'orcamento' ? 'Orçamento' : 'Venda'} criado com sucesso!${mensagemExtra}`);
      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao finalizar');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={tipoAtendimento === 'orcamento' ? 'Novo Orçamento' : 'Nova Venda'}
      onClose={onClose}
      size="full"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Esquerda: Busca de Produtos */}
        <div className="lg:col-span-1">
          <ProdutoSearch
            produtos={produtos}
            acabamentos={acabamentos}
            onAddItem={handleAddItem}
            loading={produtosLoading}
          />
        </div>

        {/* Direita: Carrinho + Simulador */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cliente */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground mb-4">Cliente</h3>
            <div className="flex gap-2">
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
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
                className="flex items-center gap-2 px-3 py-2 bg-background border border-border rounded-md text-foreground hover:bg-card transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tipo de Atendimento */}
          <div className="bg-card rounded-lg border border-border p-4">
            <h3 className="font-semibold text-foreground mb-4">Tipo de Atendimento</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTipoAtendimento('orcamento')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  tipoAtendimento === 'orcamento'
                    ? 'bg-mali-primary text-mali-secondary'
                    : 'bg-background border border-border text-foreground hover:bg-card'
                }`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                Orçamento
              </button>
              <button
                onClick={() => setTipoAtendimento('venda')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  tipoAtendimento === 'venda'
                    ? 'bg-mali-primary text-mali-secondary'
                    : 'bg-background border border-border text-foreground hover:bg-card'
                }`}
              >
                <ShoppingCart className="w-4 h-4 inline mr-2" />
                Venda
              </button>
            </div>
          </div>

          {/* Carrinho + Simulador */}
          <CarrinhoSimulador
            itens={carrinho}
            onRemoveItem={handleRemoveItem}
            onUpdatePreco={() => {}}
            pontuacaoPadrao={pontuacaoPadrao}
            limitePerfil={limitePerfil}
            acabamentos={acabamentos}
            mostrarModalidade={tipoAtendimento === 'venda'}
            disponibilidade={disponibilidade}
            onUpdateModalidade={handleUpdateModalidade}
          />

          {/* Ações Finais */}
          {carrinho.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={handleFinalizar}
                disabled={!clienteId || processando}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-semibold"
              >
                {processando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {tipoAtendimento === 'orcamento' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    {tipoAtendimento === 'orcamento' ? 'Gerar Orçamento' : 'Finalizar Venda'}
                  </>
                )}
              </button>
              <button
                onClick={() => setCarrinho([])}
                className="px-6 py-3 bg-background border border-border text-foreground rounded-lg hover:bg-card transition-colors font-semibold"
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal aninhado: Novo Cliente */}
      <Modal
        isOpen={isClienteModalOpen}
        title="Cadastro Rápido de Cliente"
        onClose={() => setIsClienteModalOpen(false)}
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateCliente();
          }}
          className="space-y-4"
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

          <div className="flex gap-3 pt-4">
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
      </Modal>
    </Modal>
  );
}
