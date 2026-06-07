'use client';

import { useState } from 'react';
import { Deposito, FiltroEstoque } from '@/types';
import { Search, Filter, X, ChevronDown } from 'lucide-react';

interface FiltrosEstoqueProps {
  filtros: FiltroEstoque;
  onChange: (filtros: FiltroEstoque) => void;
  depositos: (Deposito & { id: string })[];
}

const STATUS_OPCOES: Array<{ valor: FiltroEstoque['statusEstoque']; label: string; cor: string }> = [
  { valor: 'abaixo', label: 'Abaixo do mínimo', cor: 'text-amber-600' },
  { valor: 'normal', label: 'Normal', cor: 'text-emerald-600' },
  { valor: 'zerado', label: 'Zerado', cor: 'text-red-600' },
];

/**
 * Filtros da página de Estoque: busca por texto, seleção de depósitos
 * (checkboxes) e status do estoque (checkboxes).
 */
export function FiltrosEstoque({ filtros, onChange, depositos }: FiltrosEstoqueProps) {
  const [aberto, setAberto] = useState(false);

  const toggleDeposito = (id: string) => {
    const novos = filtros.depositoIds.includes(id)
      ? filtros.depositoIds.filter((d) => d !== id)
      : [...filtros.depositoIds, id];
    onChange({ ...filtros, depositoIds: novos });
  };

  const setStatus = (status: FiltroEstoque['statusEstoque']) => {
    // Alternar: se já está selecionado, volta para 'todos'
    onChange({ ...filtros, statusEstoque: filtros.statusEstoque === status ? 'todos' : status });
  };

  const limpar = () => {
    onChange({ depositoIds: [], statusEstoque: 'todos', textoBusca: '' });
  };

  const temFiltrosAtivos =
    filtros.depositoIds.length > 0 ||
    filtros.statusEstoque !== 'todos' ||
    filtros.textoBusca.length > 0;

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
          {temFiltrosAtivos && (
            <span className="bg-mali-primary text-mali-secondary text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {filtros.depositoIds.length + (filtros.statusEstoque !== 'todos' ? 1 : 0)}
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
        <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status do estoque */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Status do Estoque</h4>
            <div className="space-y-2">
              {STATUS_OPCOES.map((opcao) => (
                <label
                  key={opcao.valor}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={filtros.statusEstoque === opcao.valor}
                    onChange={() => setStatus(opcao.valor)}
                    className="w-4 h-4 accent-mali-primary"
                  />
                  <span className={opcao.cor}>{opcao.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Depósitos */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Depósitos</h4>
            {depositos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum depósito cadastrado</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {depositos.map((dep) => (
                  <label key={dep.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filtros.depositoIds.includes(dep.id)}
                      onChange={() => toggleDeposito(dep.id)}
                      className="w-4 h-4 accent-mali-primary"
                    />
                    <span className="text-foreground">{dep.nome}</span>
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
