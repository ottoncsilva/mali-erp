'use client';

import { CondicaoPagamentoConfig } from '@/types';
import { DebouncedNumberInput } from './DebouncedNumberInput';

const fmt = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface ControlBarProps {
  descontoPercentual: number;
  onDescontoChange: (valor: number) => void;

  pontuacaoPadrao: number;
  onPontuacaoChange: (valor: number) => void;

  condicaoId: string;
  condicoes: CondicaoPagamentoConfig[];
  onCondicaoChange: (id: string) => void;

  totalProposta: number;
  pontuacaoMedia: number;
  limitePerfil: number;

  vistaLiquido: number;
  apresentacao: boolean;
}

/**
 * Barra superior com: Pontuação (editável + debounce), Vista (R$),
 * Seletor de Condição, Total, Desconto %.
 * Cores: pontuação fica vermelha se < limit, verde caso contrário.
 */
export function ControlBar({
  descontoPercentual,
  onDescontoChange,
  pontuacaoPadrao,
  onPontuacaoChange,
  condicaoId,
  condicoes,
  onCondicaoChange,
  totalProposta,
  pontuacaoMedia,
  limitePerfil,
  vistaLiquido,
  apresentacao,
}: ControlBarProps) {
  const pontOk = pontuacaoMedia >= limitePerfil;

  return (
    <div className="bg-background border-b border-border px-4 py-3 flex flex-wrap items-end gap-3 md:gap-4">
      {/* PONT. (editável, mostra a do média) */}
      {!apresentacao && (
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
            PONT.
          </span>
          <div
            className={`text-2xl font-bold ${
              pontOk ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {pontuacaoMedia.toFixed(2)}
          </div>
          <span className="text-[9px] text-muted-foreground mt-0.5">padrão</span>
        </div>
      )}

      {/* VISTA (readonly) */}
      {!apresentacao && (
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
            VISTA
          </span>
          <p className="text-sm font-semibold text-foreground">R$ {fmt(vistaLiquido)}</p>
        </div>
      )}

      {/* CONDIÇÃO (seletor) */}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
          Pagamento
        </span>
        <select
          value={condicaoId}
          onChange={(e) => onCondicaoChange(e.target.value)}
          className="px-3 py-1.5 bg-card border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
        >
          {condicoes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {/* DESC. % (editável, input com DebouncedNumberInput) */}
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
          Desc. %
        </span>
        <input
          type="number"
          value={descontoPercentual || ''}
          onChange={(e) =>
            onDescontoChange(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))
          }
          placeholder="0"
          step="0.5"
          min="0"
          max="100"
          className="w-20 px-2 py-1.5 bg-card border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
        />
      </div>

      {/* TOTAL (destaque, R$) */}
      <div className="flex flex-col ml-auto">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
          Total
        </span>
        <p className="text-2xl font-bold text-mali-primary">R$ {fmt(totalProposta)}</p>
      </div>
    </div>
  );
}
