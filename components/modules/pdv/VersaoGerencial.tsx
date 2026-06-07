'use client';

import { ResumoCarrinho, ResultadoCondicao } from '@/lib/utils/precificacao';
import { AlertCircle } from 'lucide-react';

const fmt = (n: number) =>
  (isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface VersaoGerencialProps {
  resumo: ResumoCarrinho;
  plano: ResultadoCondicao;
  validacao: { valido: boolean; motivo?: string };
  apresentacao: boolean;
  especificadorNome?: string;
}

/**
 * Resumo gerencial compacto: Proposta, Vista, Juros, Pontuação.
 * Oculto quando apresentacao === true.
 */
export function VersaoGerencial({
  resumo,
  plano,
  validacao,
  apresentacao,
  especificadorNome,
}: VersaoGerencialProps) {
  if (apresentacao) return null;

  return (
    <div className="bg-mali-secondary text-white rounded-lg p-4 space-y-3">
      <p className="text-xs uppercase tracking-wide text-white/60 font-medium">Visão Gerencial</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-white/60 mb-1">Valor Proposta</p>
          <p className="text-2xl font-bold text-emerald-400">R$ {fmt(plano.proposta)}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 mb-1">Preço à Vista</p>
          <p className="text-2xl font-bold text-blue-300">R$ {fmt(resumo.vistaLiquido)}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 mb-1">Juros</p>
          <p className="text-lg font-semibold text-amber-300">R$ {fmt(plano.juros)}</p>
        </div>
        <div>
          <p className="text-xs text-white/60 mb-1">Pontuação</p>
          <p
            className={`text-lg font-semibold ${
              validacao.valido ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {resumo.pontuacaoMedia.toFixed(2)}x
          </p>
        </div>
      </div>

      {resumo.comissaoPercentual > 0 && (
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-white/15">
          <div>
            <p className="text-xs text-white/60 mb-1">
              Comissão{especificadorNome ? ` — ${especificadorNome}` : ''} ({resumo.comissaoPercentual.toFixed(1)}%)
            </p>
            <p className="text-lg font-semibold text-orange-300">R$ {fmt(resumo.comissaoValor)}</p>
          </div>
          <div>
            <p className="text-xs text-white/60 mb-1">Loja retém (à vista)</p>
            <p className="text-lg font-semibold text-blue-300">R$ {fmt(resumo.vistaBaseLiquido)}</p>
          </div>
        </div>
      )}

      {!validacao.valido && (
        <div className="flex gap-2 p-3 bg-red-500/20 rounded border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{validacao.motivo}</p>
        </div>
      )}
    </div>
  );
}
