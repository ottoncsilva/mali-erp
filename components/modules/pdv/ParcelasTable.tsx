'use client';

import { ResultadoCondicao } from '@/lib/utils/precificacao';

const fmt = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toInputDate = (d: Date) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

interface ParcelasTableProps {
  plano: ResultadoCondicao;
  /** Quando true (condição com entrada), entrada/valores/datas são editáveis. */
  editavel: boolean;
  onEntradaChange: (valor: number) => void;
  onParcelaChange: (numero: number, patch: { valor?: number; vencimento?: Date }) => void;
}

export function ParcelasTable({ plano, editavel, onEntradaChange, onParcelaChange }: ParcelasTableProps) {
  const somaParcelas = plano.parcelas.reduce((acc, p) => acc + p.valor, 0);
  const somaTotal = plano.entrada + somaParcelas;
  const diverge = Math.abs(somaTotal - plano.proposta) > 0.5;

  return (
    <div className="bg-background rounded-lg border border-border flex flex-col min-h-0">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-foreground text-sm">Parcelas — {plano.condicaoNome}</h3>
        <span className="text-sm font-bold text-mali-primary">R$ {fmt(plano.proposta)}</span>
      </div>

      {/* Entrada editável */}
      {(editavel || plano.entrada > 0) && (
        <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-shrink-0">
          <label className="text-sm text-muted-foreground whitespace-nowrap">Entrada (hoje):</label>
          {editavel ? (
            <input
              type="number"
              value={Number(plano.entrada.toFixed(2))}
              min="0"
              step="50"
              onChange={(e) => onEntradaChange(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-32 px-2 py-1 bg-card border border-border rounded text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-mali-primary"
            />
          ) : (
            <span className="font-semibold text-foreground">R$ {fmt(plano.entrada)}</span>
          )}
          <span className="text-xs text-muted-foreground">redistribui o restante</span>
        </div>
      )}

      {/* Lista com scroll próprio */}
      <div className="overflow-y-auto flex-1 min-h-0 p-3 space-y-2">
        {plano.parcelas.map((p) => (
          <div
            key={p.numero}
            className="flex items-center gap-2 px-3 py-2 bg-card rounded border border-border text-sm"
          >
            <span className="text-muted-foreground w-20 flex-shrink-0">
              Parcela {p.numero}
              {editavel ? '' : `/${plano.parcelas.length}`}
            </span>
            {editavel ? (
              <>
                <input
                  type="date"
                  value={toInputDate(p.vencimento)}
                  onChange={(e) =>
                    onParcelaChange(p.numero, { vencimento: new Date(e.target.value + 'T00:00:00') })
                  }
                  className="flex-1 min-w-0 px-2 py-1 bg-background border border-border rounded text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-mali-primary"
                />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <input
                    type="number"
                    value={Number(p.valor.toFixed(2))}
                    min="0"
                    step="10"
                    onChange={(e) =>
                      onParcelaChange(p.numero, { valor: Math.max(0, parseFloat(e.target.value) || 0) })
                    }
                    className="w-24 px-2 py-1 bg-background border border-border rounded text-foreground text-right focus:outline-none focus:ring-1 focus:ring-mali-primary"
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between flex-1">
                <span className="text-xs text-muted-foreground">
                  {p.vencimento.toLocaleDateString('pt-BR')}
                </span>
                <span className="font-semibold text-foreground">R$ {fmt(p.valor)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rodapé: soma das parcelas */}
      {editavel && (
        <div className="flex-shrink-0 border-t border-border px-4 py-2 text-sm flex justify-between">
          <span className="text-muted-foreground">Soma (entrada + parcelas)</span>
          <span className={`font-bold ${diverge ? 'text-orange-600' : 'text-emerald-600'}`}>
            R$ {fmt(somaTotal)}
          </span>
        </div>
      )}
    </div>
  );
}
