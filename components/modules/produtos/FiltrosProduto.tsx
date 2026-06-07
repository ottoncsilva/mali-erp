'use client';

import { useState } from 'react';
import { Categoria, FiltroProduto } from '@/types';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

interface FiltrosProdutoProps {
  filtros: FiltroProduto;
  onChange: (filtros: FiltroProduto) => void;
  categorias: (Categoria & { id: string })[];
}

const STATUS_OPCOES: Array<{ valor: FiltroProduto['status']; label: string }> = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'ativo', label: 'Ativos' },
  { valor: 'inativo', label: 'Inativos' },
];

/**
 * Filtros da página de Produtos: busca por texto, categorias (checkboxes),
 * faixa de quantidade em estoque e status.
 */
export function FiltrosProduto({ filtros, onChange, categorias }: FiltrosProdutoProps) {
  const [aberto, setAberto] = useState(false);

  const toggleCategoria = (id: string) => {
    const novas = filtros.categoriaIds.includes(id)
      ? filtros.categoriaIds.filter((c) => c !== id)
      : [...filtros.categoriaIds, id];
    onChange({ ...filtros, categoriaIds: novas });
  };

  const limpar = () => {
    onChange({
      textoBusca: '',
      categoriaIds: [],
      estoqueQuantidadeMin: undefined,
      estoqueQuantidadeMax: undefined,
      status: 'todos',
    });
  };

  const temFiltrosAtivos =
    filtros.categoriaIds.length > 0 ||
    filtros.status !== 'todos' ||
    filtros.textoBusca.length > 0 ||
    filtros.estoqueQuantidadeMin !== undefined ||
    filtros.estoqueQuantidadeMax !== undefined;

  const contagemFiltros =
    filtros.categoriaIds.length +
    (filtros.status !== 'todos' ? 1 : 0) +
    (filtros.estoqueQuantidadeMin !== undefined || filtros.estoqueQuantidadeMax !== undefined ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={filtros.textoBusca}
            onChange={(e) => onChange({ ...filtros, textoBusca: e.target.value })}
            placeholder="Buscar por nome ou SKU..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
          />
        </div>

        {/* Botão de filtros */}
        <button
          onClick={() => setAberto(!aberto)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
            temFiltrosAtivos
              ? 'bg-mali-primary/10 border-mali-primary text-mali-primary'
              : 'bg-background border-border text-foreground hover:bg-card'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtros
          {contagemFiltros > 0 && (
            <span className="bg-mali-primary text-mali-secondary text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {contagemFiltros}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>

        {temFiltrosAtivos && (
          <button
            onClick={limpar}
            className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {/* Painel de filtros */}
      {aberto && (
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Status */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Status</h4>
            <div className="space-y-2">
              {STATUS_OPCOES.map((opcao) => (
                <label
                  key={opcao.valor}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name="status-produto"
                    checked={filtros.status === opcao.valor}
                    onChange={() => onChange({ ...filtros, status: opcao.valor })}
                    className="w-4 h-4 accent-mali-primary"
                  />
                  <span className="text-foreground">{opcao.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quantidade em estoque */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Quantidade em Estoque</h4>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Mínimo</label>
                <input
                  type="number"
                  value={filtros.estoqueQuantidadeMin ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...filtros,
                      estoqueQuantidadeMin: e.target.value === '' ? undefined : parseInt(e.target.value),
                    })
                  }
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Máximo</label>
                <input
                  type="number"
                  value={filtros.estoqueQuantidadeMax ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...filtros,
                      estoqueQuantidadeMax: e.target.value === '' ? undefined : parseInt(e.target.value),
                    })
                  }
                  placeholder="∞"
                  min="0"
                  className="w-full px-3 py-1.5 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
            </div>
          </div>

          {/* Categorias */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Categorias</h4>
            {categorias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma categoria</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {categorias.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filtros.categoriaIds.includes(cat.id)}
                      onChange={() => toggleCategoria(cat.id)}
                      className="w-4 h-4 accent-mali-primary"
                    />
                    <span className="text-foreground">{cat.nome}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
