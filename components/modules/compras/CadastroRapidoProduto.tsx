'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useAddDocument, useCollection } from '@/lib/hooks';
import type { Categoria, Produto } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCriado: (produtoId: string, nome: string, sku: string) => void;
  fornecedorId?: string;
}

/**
 * Cadastro rápido de produto durante a criação de uma compra.
 * Cria o produto com os dados mínimos; o CMV é refinado ao registrar a nota.
 */
export function CadastroRapidoProduto({ isOpen, onClose, onCriado, fornecedorId }: Props) {
  const { add } = useAddDocument('produtos');
  const { data: categorias } = useCollection<Categoria>('categorias');

  const [nome, setNome] = useState('');
  const [sku, setSku] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [custoProduto, setCustoProduto] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!nome.trim() || !sku.trim()) {
      setErro('Nome e SKU são obrigatórios.');
      return;
    }
    setSalvando(true);
    try {
      const novo: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'> = {
        nome: nome.trim(),
        sku: sku.trim(),
        categoriaId,
        fornecedorId: fornecedorId || '',
        acabamentosDisponiveis: [],
        fotos: [],
        fotoPrincipal: '',
        custoProduto,
        icms: 0,
        ipi: 0,
        frete: 0,
        tipoPontuacao: 'padrao',
        estoqueMinimo,
        estoqueAtual: 0,
        status: 'ativo',
      };
      const id = await add(novo);
      onCriado(id, novo.nome, novo.sku);
      onClose();
      reset();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
    } finally {
      setSalvando(false);
    }
  };

  const reset = () => {
    setNome('');
    setSku('');
    setCategoriaId('');
    setCustoProduto(0);
    setEstoqueMinimo(0);
    setErro(null);
  };

  return (
    <Modal isOpen={isOpen} title="Cadastro Rápido de Produto" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">SKU</label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Categoria</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            >
              <option value="">Selecione...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Custo estimado (R$)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={custoProduto}
              onChange={(e) => setCustoProduto(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Estoque mínimo</label>
            <input
              type="number"
              min={0}
              value={estoqueMinimo}
              onChange={(e) => setEstoqueMinimo(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Cadastrar'}
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
  );
}
