'use client';

import { LOCALIZACOES, LocalizacaoEstoque } from '@/types';
import { EstoqueAgregado } from '@/lib/estoque/agregacao';

interface DepositBreakdownPopoverProps {
  linha: EstoqueAgregado;
}

const ORDEM_LOCAIS: LocalizacaoEstoque[] = ['showroom', 'deposito', 'comprado', 'entrega'];

/**
 * Popover exibido ao passar o mouse sobre a quantidade total de um produto.
 * Mostra o detalhamento do estoque por localização física e por depósito.
 */
export function DepositBreakdownPopover({ linha }: DepositBreakdownPopoverProps) {
  return (
    <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-card border border-border rounded-lg shadow-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Detalhamento</span>
        <span className="text-sm font-bold text-mali-primary">{linha.totalGeral} un</span>
      </div>

      <div className="space-y-1.5">
        {ORDEM_LOCAIS.map((local) => {
          const dados = linha.porLocalizacao[local];
          if (!dados || dados.quantidade === 0) return null;

          const disponivel = local === 'showroom' || local === 'deposito';

          return (
            <div key={local}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      disponivel ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {LOCALIZACOES[local]}
                </span>
                <span className="font-medium text-foreground">{dados.quantidade} un</span>
              </div>

              {/* Detalhamento por depósito individual (quando houver) */}
              {dados.depositos && dados.depositos.length > 1 && (
                <div className="ml-3.5 mt-1 space-y-0.5">
                  {dados.depositos.map((dep) => (
                    <div
                      key={dep.depositoId}
                      className="flex items-center justify-between text-[11px] text-muted-foreground"
                    >
                      <span>{dep.depositoNome}</span>
                      <span>{dep.quantidade} un</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border text-xs">
        <span className="text-muted-foreground">Disponível p/ venda</span>
        <span className="font-semibold text-emerald-600">{linha.totalDisponivel} un</span>
      </div>
    </div>
  );
}
