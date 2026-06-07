'use client';

import { ItemCarrinho, ResumoCarrinho } from '@/lib/utils/precificacao';
import { Plus, Minus, Trash2 } from 'lucide-react';

const fmt = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ItemsTableProps {
  carrinho: ItemCarrinho[];
  resumo: ResumoCarrinho;
  disponibilidade: Record<string, number>;
  apresentacao: boolean;
  limitePerfil: number;
  vistaLiquido: number;
  proposta: number;
  condicaoNome: string;
  onUpdateQtd: (index: number, qtd: number) => void;
  onRemoveItem: (index: number) => void;
  onUpdateModalidade: (index: number, modalidade: 'estoque' | 'encomenda') => void;
}

export function ItemsTable({
  carrinho,
  resumo,
  disponibilidade,
  apresentacao,
  limitePerfil,
  vistaLiquido,
  proposta,
  condicaoNome,
  onUpdateQtd,
  onRemoveItem,
  onUpdateModalidade,
}: ItemsTableProps) {
  return (
    <div className="bg-background rounded-lg border border-border flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
        <h3 className="font-semibold text-foreground text-sm">Itens ({carrinho.length})</h3>
      </div>

      {carrinho.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Nenhum item. Use a busca acima.
        </div>
      ) : (
        <>
          {/* Área com scroll próprio */}
          <div className="overflow-y-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-[11px] uppercase sticky top-0 bg-background z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 font-medium">Produto</th>
                  <th className="text-center px-2 py-2 font-medium">Qtd</th>
                  {!apresentacao && <th className="text-right px-2 py-2 font-medium">Un. Vista</th>}
                  {!apresentacao && <th className="text-right px-2 py-2 font-medium">Vista</th>}
                  <th className="text-right px-2 py-2 font-medium">Un. Final</th>
                  <th className="text-right px-2 py-2 font-medium">Total Final</th>
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
                  const unit = r ? r.precoVistaTotal / item.quantidade : 0;
                  // Valor final (com juros da condição), rateado proporcionalmente.
                  const fatorFinal = vistaLiquido > 0 ? proposta / vistaLiquido : 1;
                  const totalFinal = (r?.precoVistaTotal || 0) * fatorFinal;
                  const unitFinal = item.quantidade > 0 ? totalFinal / item.quantidade : 0;
                  return (
                    <tr key={item.produtoId} className="border-b border-border/60 align-top">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {item.produto.fotoPrincipal && (
                            <img
                              src={item.produto.fotoPrincipal}
                              alt={item.produto.nome}
                              className="w-8 h-8 rounded object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground leading-tight truncate">
                              {item.produto.nome}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-muted-foreground">{item.produto.sku}</span>
                              <select
                                value={modalidade}
                                onChange={(e) =>
                                  onUpdateModalidade(idx, e.target.value as 'estoque' | 'encomenda')
                                }
                                className="px-1 py-0.5 bg-card border border-border rounded text-[10px] focus:outline-none focus:ring-1 focus:ring-mali-primary"
                              >
                                <option value="estoque" disabled={semEstoque}>
                                  Estoque ({disp})
                                </option>
                                <option value="encomenda">Encomenda</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => onUpdateQtd(idx, item.quantidade - 1)}
                            className="p-1 hover:bg-card rounded"
                          >
                            <Minus className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <input
                            type="number"
                            value={item.quantidade}
                            min="1"
                            onChange={(e) => onUpdateQtd(idx, parseInt(e.target.value) || 1)}
                            className="w-11 px-1 py-1 bg-card border border-border rounded text-center text-foreground focus:outline-none focus:ring-1 focus:ring-mali-primary"
                          />
                          <button
                            onClick={() => onUpdateQtd(idx, item.quantidade + 1)}
                            className="p-1 hover:bg-card rounded"
                          >
                            <Plus className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                      {!apresentacao && (
                        <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">
                          R$ {fmt(unit)}
                        </td>
                      )}
                      {!apresentacao && (
                        <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">
                          R$ {fmt(r?.precoVistaTotal || 0)}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right text-foreground whitespace-nowrap">
                        R$ {fmt(unitFinal)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold text-mali-primary whitespace-nowrap">
                        R$ {fmt(totalFinal)}
                      </td>
                      {!apresentacao && (
                        <td
                          className={`px-2 py-2 text-right font-medium ${
                            (r?.pontuacao || 0) >= limitePerfil ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {(r?.pontuacao || 0).toFixed(2)}
                        </td>
                      )}
                      <td className="px-2 py-2 text-right">
                        <button onClick={() => onRemoveItem(idx)} className="p-1 hover:bg-card rounded">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Rodapé fixo: à vista (oculto em apresentação) + total com condição */}
          <div className="flex-shrink-0 border-t border-border px-4 py-2.5 space-y-1 text-sm">
            {!apresentacao && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Soma à vista (c/ desconto)</span>
                <span className="font-semibold text-foreground">R$ {fmt(vistaLiquido)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total ({condicaoNome})</span>
              <span className="font-bold text-mali-primary">R$ {fmt(proposta)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
