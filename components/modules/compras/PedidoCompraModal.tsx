'use client';

import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCollection, useAddDocument, useAuth } from '@/lib/hooks';
import { CadastroRapidoProduto } from './CadastroRapidoProduto';
import { proximoNumero } from '@/lib/estoque';
import { formatBRL } from '@/lib/utils/format';
import type { Fornecedor, Produto, ItemPedidoCompra, PedidoCompra } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PedidoCompraModal({ isOpen, onClose, onSaved }: Props) {
  const { userProfile } = useAuth();
  const { data: fornecedores } = useCollection<Fornecedor>('fornecedores');
  const { data: produtos } = useCollection<Produto>('produtos');
  const { add } = useAddDocument('pedidos_compra');

  const [fornecedorId, setFornecedorId] = useState('');
  const [itens, setItens] = useState<ItemPedidoCompra[]>([]);
  const [freteEstimado, setFreteEstimado] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fornecedor = fornecedores.find((f) => f.id === fornecedorId);

  const totalItens = useMemo(
    () => itens.reduce((s, i) => s + i.custoUnitario * i.quantidade, 0),
    [itens]
  );
  const totalEstimado = totalItens + freteEstimado;

  const adicionarItem = () => {
    setItens([
      ...itens,
      { produtoId: '', nomeProduto: '', skuProduto: '', quantidade: 1, custoUnitario: 0, icms: 0, ipi: 0 },
    ]);
  };

  const atualizarItem = (index: number, patch: Partial<ItemPedidoCompra>) => {
    setItens(itens.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const selecionarProduto = (index: number, produtoId: string) => {
    const p = produtos.find((pr) => pr.id === produtoId);
    if (!p) {
      atualizarItem(index, { produtoId: '', nomeProduto: '', skuProduto: '' });
      return;
    }
    atualizarItem(index, {
      produtoId: p.id,
      nomeProduto: p.nome,
      skuProduto: p.sku,
      custoUnitario: p.custoProduto || 0,
      icms: p.icms || 0,
      ipi: p.ipi || 0,
    });
  };

  const removerItem = (index: number) => setItens(itens.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!fornecedorId) return setErro('Selecione um fornecedor.');
    if (itens.length === 0) return setErro('Adicione pelo menos um item.');
    if (itens.some((i) => !i.produtoId || i.quantidade <= 0)) {
      return setErro('Todos os itens devem ter produto e quantidade válida.');
    }

    setSalvando(true);
    try {
      const numero = await proximoNumero('PC');
      let prazoEntregaEstimado: Date | undefined;
      if (fornecedor?.prazoEntregaDias) {
        prazoEntregaEstimado = new Date();
        prazoEntregaEstimado.setDate(prazoEntregaEstimado.getDate() + fornecedor.prazoEntregaDias);
      }

      const novo: Omit<PedidoCompra, 'id' | 'criadoEm' | 'atualizadoEm'> = {
        numero,
        fornecedorId,
        fornecedorNome: fornecedor?.razaoSocial || '',
        itens,
        freteEstimado,
        totalEstimado,
        prazoEntregaEstimado,
        status: 'pedido',
        origem: 'manual',
        criadoPorId: userProfile?.uid || '',
        observacoes: observacoes || undefined,
      };
      // Remove campos undefined (Firestore não aceita).
      const limpo = JSON.parse(JSON.stringify(novo, (_k, v) => (v === undefined ? undefined : v)));
      await add({ ...limpo, prazoEntregaEstimado: prazoEntregaEstimado ?? null });
      onSaved();
      onClose();
      reset();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao criar pedido.');
    } finally {
      setSalvando(false);
    }
  };

  const reset = () => {
    setFornecedorId('');
    setItens([]);
    setFreteEstimado(0);
    setObservacoes('');
    setErro(null);
  };

  return (
    <>
      <Modal isOpen={isOpen} title="Novo Pedido de Compra" onClose={onClose} size="2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Fornecedor</label>
              <select
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                required
              >
                <option value="">Selecione...</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.razaoSocial}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Frete estimado (R$)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={freteEstimado}
                onChange={(e) => setFreteEstimado(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Itens</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCadastroAberto(true)}
                  className="text-xs px-3 py-1.5 bg-mali-secondary/10 text-mali-secondary rounded-md hover:bg-mali-secondary/20 transition-colors"
                >
                  + Novo Produto
                </button>
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="text-xs px-3 py-1.5 bg-mali-primary/10 text-mali-primary rounded-md hover:bg-mali-primary/20 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Item
                </button>
              </div>
            </div>

            {itens.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
                Nenhum item adicionado.
              </p>
            )}

            {itens.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end bg-background p-3 rounded-md border border-border">
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-xs text-muted-foreground mb-1">Produto</label>
                  <select
                    value={item.produtoId}
                    onChange={(e) => selecionarProduto(index, e.target.value)}
                    className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mali-primary"
                  >
                    <option value="">Selecione...</option>
                    {produtos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Qtd</label>
                  <input
                    type="number"
                    min={1}
                    value={item.quantidade}
                    onChange={(e) => atualizarItem(index, { quantidade: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mali-primary"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Custo un.</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={item.custoUnitario}
                    onChange={(e) => atualizarItem(index, { custoUnitario: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1.5 bg-card border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mali-primary"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Subtotal</label>
                  <p className="px-2 py-1.5 text-sm text-foreground">{formatBRL(item.custoUnitario * item.quantidade)}</p>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => removerItem(index)} className="p-1.5 hover:bg-card rounded">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>

          {/* Resumo */}
          <div className="flex justify-end gap-6 text-sm border-t border-border pt-3">
            <span className="text-muted-foreground">
              Produtos: <span className="text-foreground font-medium">{formatBRL(totalItens)}</span>
            </span>
            <span className="text-muted-foreground">
              Frete: <span className="text-foreground font-medium">{formatBRL(freteEstimado)}</span>
            </span>
            <span className="text-muted-foreground">
              Total: <span className="text-mali-primary font-bold">{formatBRL(totalEstimado)}</span>
            </span>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Criar Pedido'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <CadastroRapidoProduto
        isOpen={cadastroAberto}
        onClose={() => setCadastroAberto(false)}
        fornecedorId={fornecedorId}
        onCriado={(id, nome, sku) => {
          // Adiciona automaticamente como item do pedido.
          setItens((prev) => [
            ...prev,
            { produtoId: id, nomeProduto: nome, skuProduto: sku, quantidade: 1, custoUnitario: 0, icms: 0, ipi: 0 },
          ]);
        }}
      />
    </>
  );
}
