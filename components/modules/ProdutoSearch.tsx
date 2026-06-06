'use client';

import { useState, useMemo } from 'react';
import { Produto, VariavelAcabamento } from '@/types';
import { Search, Plus, X } from 'lucide-react';

interface ProdutoSearchProps {
  produtos: (Produto & { id: string })[];
  acabamentos: (VariavelAcabamento & { id: string })[];
  onAddItem: (produtoId: string, acabamentoId: string, quantidade: number) => void;
  loading?: boolean;
}

export function ProdutoSearch({
  produtos,
  acabamentos,
  onAddItem,
  loading,
}: ProdutoSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<(Produto & { id: string }) | null>(null);
  const [selectedAcabamento, setSelectedAcabamento] = useState('');
  const [quantidade, setQuantidade] = useState(1);

  const filtrados = useMemo(() => {
    if (!searchTerm) return produtos.slice(0, 8);
    const term = searchTerm.toLowerCase();
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term)
    );
  }, [searchTerm, produtos]);

  const handleSelectProduto = (produto: Produto & { id: string }) => {
    setSelectedProduto(produto);
    setSelectedAcabamento('');
    setQuantidade(1);
  };

  const handleAddItem = () => {
    if (!selectedProduto || !selectedAcabamento) {
      alert('Selecione um produto e um acabamento');
      return;
    }
    onAddItem(selectedProduto.id, selectedAcabamento, quantidade);
    setSelectedProduto(null);
    setSelectedAcabamento('');
    setQuantidade(1);
    setSearchTerm('');
  };

  const acabamentosDisponiveis = selectedProduto
    ? acabamentos.filter((a) => selectedProduto.acabamentosDisponiveis.includes(a.id))
    : [];

  return (
    <div className="bg-card rounded-lg border border-border p-4 space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome ou SKU..."
          className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
        />
      </div>

      {/* Results Grid */}
      {!selectedProduto && (
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {loading ? (
            <div className="text-center text-muted-foreground col-span-2">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center text-muted-foreground col-span-2 text-sm">
              Nenhum produto encontrado
            </div>
          ) : (
            filtrados.map((produto) => (
              <button
                key={produto.id}
                onClick={() => handleSelectProduto(produto)}
                className="flex flex-col items-start p-2 bg-background border border-border rounded-md hover:border-mali-primary transition-colors text-left"
              >
                {produto.fotoPrincipal && (
                  <img
                    src={produto.fotoPrincipal}
                    alt={produto.nome}
                    className="w-full h-20 rounded object-cover mb-2"
                  />
                )}
                <p className="text-xs font-medium text-foreground line-clamp-2">
                  {produto.nome}
                </p>
                <p className="text-xs text-muted-foreground">{produto.sku}</p>
                <p className="text-xs text-mali-primary font-semibold mt-1">
                  Est: {produto.estoqueAtual}
                </p>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected Produto Details */}
      {selectedProduto && (
        <div className="space-y-4 p-4 bg-background rounded-md border border-mali-primary/30">
          <div className="flex items-start justify-between">
            <div className="flex gap-3 flex-1">
              {selectedProduto.fotoPrincipal && (
                <img
                  src={selectedProduto.fotoPrincipal}
                  alt={selectedProduto.nome}
                  className="w-16 h-16 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{selectedProduto.nome}</h3>
                <p className="text-xs text-muted-foreground">{selectedProduto.sku}</p>
                <p className="text-xs text-emerald-600 mt-1">Est: {selectedProduto.estoqueAtual}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedProduto(null)}
              className="p-1 hover:bg-card rounded"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Acabamento Selection */}
          {acabamentosDisponiveis.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Acabamento
              </label>
              <select
                value={selectedAcabamento}
                onChange={(e) => setSelectedAcabamento(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary text-sm"
              >
                <option value="">Selecione um acabamento</option>
                {acabamentosDisponiveis.map((acabamento) => (
                  <option key={acabamento.id} value={acabamento.id}>
                    {acabamento.nomeDaOpcao}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quantidade */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Quantidade
            </label>
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAddItem}
              disabled={!selectedAcabamento}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-md hover:shadow-lg transition-all disabled:opacity-50 font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar ao Carrinho
            </button>
            <button
              onClick={() => setSelectedProduto(null)}
              className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
