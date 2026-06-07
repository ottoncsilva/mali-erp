'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Produto } from '@/types';
import { Search, Plus } from 'lucide-react';

interface SearchProductsProps {
  produtos: (Produto & { id: string })[];
  onAddItem: (produtoId: string, quantidade: number) => void;
  loading?: boolean;
}

/**
 * Busca de uma linha. O popup com os resultados só aparece ao focar/digitar
 * e some ao clicar fora ou selecionar um item (que entra direto no carrinho).
 */
export function SearchProducts({ produtos, onAddItem, loading }: SearchProductsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtrados = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return produtos.slice(0, 12);
    return produtos
      .filter(
        (p) =>
          (p.nome || '').toLowerCase().includes(term) ||
          (p.sku || '').toLowerCase().includes(term)
      )
      .slice(0, 24);
  }, [searchTerm, produtos]);

  const handleSelect = (produtoId: string) => {
    onAddItem(produtoId, 1);
    setSearchTerm('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar produto por nome ou SKU…"
        className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
      />

      {/* Popup de resultados */}
      {open && (
        <div className="absolute z-30 mt-1 w-full bg-card border border-border rounded-md shadow-xl max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Carregando…</div>
          ) : filtrados.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Nenhum produto encontrado</div>
          ) : (
            <ul className="divide-y divide-border">
              {filtrados.map((produto) => (
                <li key={produto.id}>
                  <button
                    onClick={() => handleSelect(produto.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-background transition-colors text-left"
                  >
                    {produto.fotoPrincipal ? (
                      <img
                        src={produto.fotoPrincipal}
                        alt={produto.nome}
                        className="w-9 h-9 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded bg-background flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{produto.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {produto.sku} · Est: {produto.estoqueAtual ?? 0}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-mali-primary flex-shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
