'use client';

import { useState, useMemo } from 'react';
import { ItemCarrinho, processarSimulacaoCompleta, CondicaoPagamento, validarTrvasdaNegociacao } from '@/lib/utils/precificacao';
import { Produto, VariavelAcabamento } from '@/types';
import { Trash2, ChevronDown, AlertCircle } from 'lucide-react';
import { calcularCMV, calcularPrecoTabela, calcularPontuacaoReal } from '@/lib/utils/precificacao';

interface CarrinhoSimuladorProps {
  itens: ItemCarrinho[];
  onRemoveItem: (index: number) => void;
  onUpdatePreco: (index: number, novoPreco: number) => void;
  pontuacaoPadrao: number;
  limitePerfil: number;
  acabamentos: (VariavelAcabamento & { id: string })[];
  /** Mostra o seletor de modalidade (estoque/encomenda) — apenas em vendas. */
  mostrarModalidade?: boolean;
  /** Saldo disponível por produtoId (showroom + depósito). */
  disponibilidade?: Record<string, number>;
  onUpdateModalidade?: (index: number, modalidade: 'estoque' | 'encomenda') => void;
}

export function CarrinhoSimulador({
  itens,
  onRemoveItem,
  onUpdatePreco,
  pontuacaoPadrao,
  limitePerfil,
  acabamentos,
  mostrarModalidade,
  disponibilidade,
  onUpdateModalidade,
}: CarrinhoSimuladorProps) {
  const [parcelasCartao, setParcelasCartao] = useState(1);
  const [desconto, setDesconto] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'reais' | 'percentual'>('reais');

  // Aplicar desconto ao carrinho
  const itensComDesconto = useMemo(() => {
    if (desconto === 0) return itens;

    return itens.map((item, idx) => {
      const precoTabela = calcularPrecoTabela(item.produto, pontuacaoPadrao);
      let novoPreco = precoTabela;

      if (descontoTipo === 'percentual') {
        novoPreco = precoTabela * (1 - desconto / 100);
      } else {
        // Desconto em reais distribuído entre itens
        const descontoUnitario = desconto / itens.length;
        novoPreco = Math.max(0, precoTabela - descontoUnitario);
      }

      return {
        ...item,
        precoAplicado: Math.max(0, novoPreco),
      };
    });
  }, [itens, desconto, descontoTipo, pontuacaoPadrao]);

  // Simular carrinho
  const condicoesPagamento: CondicaoPagamento[] = [
    { forma: 'pix', parcelas: 1 },
    { forma: 'cartao', parcelas: parcelasCartao },
  ];

  const simulacao = processarSimulacaoCompleta(
    itensComDesconto,
    pontuacaoPadrao,
    condicoesPagamento
  );

  // Validar travas
  const validacao = validarTrvasdaNegociacao(simulacao.pontuacaoMedia, limitePerfil);

  // Buscar nome do acabamento
  const getNomeAcabamento = (id: string) => {
    return acabamentos.find((a) => a.id === id)?.nomeDaOpcao || 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Carrinho */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="bg-background px-6 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Itens do Carrinho ({itensComDesconto.length})</h3>
        </div>

        {itensComDesconto.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Carrinho vazio. Busque produtos à esquerda.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {itensComDesconto.map((item, idx) => {
              const cmv = calcularCMV(item.produto);
              const precoTabela = calcularPrecoTabela(item.produto, pontuacaoPadrao);
              const pontuacao = calcularPontuacaoReal(cmv, item.precoAplicado);

              return (
                <div key={idx} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    {item.produto.fotoPrincipal && (
                      <img
                        src={item.produto.fotoPrincipal}
                        alt={item.produto.nome}
                        className="w-12 h-12 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{item.produto.nome}</p>
                      <p className="text-xs text-muted-foreground">{getNomeAcabamento(item.acabamentoEscolhido)}</p>
                    </div>
                    <button
                      onClick={() => onRemoveItem(idx)}
                      className="p-1 hover:bg-background rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Qtd:</span>
                      <p className="font-semibold text-foreground">{item.quantidade}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Preço Tabela:</span>
                      <p className="font-semibold text-foreground">R$ {precoTabela.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Preço Aplicado:</span>
                      <p className="font-semibold text-mali-primary">R$ {item.precoAplicado.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs p-2 bg-background rounded">
                    <div>
                      <span className="text-muted-foreground">Desconto:</span>
                      <p className="font-semibold text-orange-600">
                        R$ {(precoTabela - item.precoAplicado).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pontuação:</span>
                      <p className={`font-semibold ${pontuacao >= limitePerfil ? 'text-emerald-600' : 'text-red-600'}`}>
                        {pontuacao.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Modalidade de fornecimento (apenas em vendas) */}
                  {mostrarModalidade && (() => {
                    const disp = disponibilidade?.[item.produtoId] ?? 0;
                    const semEstoque = disp < item.quantidade;
                    const modalidade = item.modalidade ?? (semEstoque ? 'encomenda' : 'estoque');
                    return (
                      <div className="flex items-center justify-between gap-2 text-xs p-2 bg-background rounded">
                        <div>
                          <span className="text-muted-foreground">Disponível em estoque: </span>
                          <span className={`font-semibold ${semEstoque ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {disp}
                          </span>
                        </div>
                        <select
                          value={modalidade}
                          onChange={(e) => onUpdateModalidade?.(idx, e.target.value as 'estoque' | 'encomenda')}
                          className="px-2 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-mali-primary"
                        >
                          <option value="estoque" disabled={semEstoque}>
                            Vender do estoque
                          </option>
                          <option value="encomenda">Sob encomenda (gera compra)</option>
                        </select>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desconto Global */}
      {itensComDesconto.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Negociação</h3>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Tipo</label>
              <select
                value={descontoTipo}
                onChange={(e) => setDescontoTipo(e.target.value as any)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                <option value="reais">R$ Reais</option>
                <option value="percentual">% Percentual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Desconto {descontoTipo === 'percentual' ? '(%)' : '(R$)'}
              </label>
              <input
                type="number"
                value={desconto}
                onChange={(e) => setDesconto(Math.max(0, parseFloat(e.target.value) || 0))}
                step={descontoTipo === 'percentual' ? '0.5' : '10'}
                min="0"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Desconto Ofertado</label>
              <p className="px-3 py-2 bg-background rounded text-sm font-semibold text-orange-600">
                {descontoTipo === 'percentual'
                  ? `${desconto.toFixed(1)}%`
                  : `R$ ${desconto.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Simulador de Parcelamento */}
      {itensComDesconto.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          <h3 className="font-semibold text-foreground">Simulador de Parcelamento</h3>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Parcelamento (Cartão)
            </label>
            <select
              value={parcelasCartao}
              onChange={(e) => setParcelasCartao(parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary"
            >
              {[1, 3, 6, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>

          {/* Opções de Pagamento */}
          <div className="space-y-2">
            <div className="p-3 bg-background rounded-md border border-mali-primary/20">
              <p className="text-xs text-muted-foreground mb-1">PIX/DINHEIRO à vista:</p>
              <p className="text-lg font-bold text-mali-primary">
                R$ {simulacao.totalFinal.toFixed(2)}
              </p>
            </div>

            <div className="p-3 bg-background rounded-md border border-border">
              <p className="text-xs text-muted-foreground mb-2">
                CARTÃO {parcelasCartao}x:
              </p>
              <p className="text-lg font-bold text-foreground mb-2">
                R$ {(simulacao.totalFinal / parcelasCartao).toFixed(2)} × {parcelasCartao}
              </p>
              <p className="text-xs text-muted-foreground">
                Total: R$ {simulacao.totalFinal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Resumo & Travas */}
      {itensComDesconto.length > 0 && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="bg-card rounded-lg border border-border p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Resumo da Venda</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Preço Tabela:</span>
                <span className="font-medium">R$ {simulacao.precoTabela.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span className="text-muted-foreground">Desconto Total:</span>
                <span className="font-bold">
                  R$ {simulacao.totalDescontos.toFixed(2)} ({simulacao.descontoPercentual.toFixed(1)}%)
                </span>
              </div>
              <div className="h-px bg-border"></div>
              <div className="flex justify-between">
                <span className="text-foreground font-semibold">TOTAL FINAL:</span>
                <span className="text-2xl font-bold text-mali-primary">
                  R$ {simulacao.totalFinal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Pontuação Média */}
          <div className={`rounded-lg border p-4 ${validacao.valido ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex gap-3">
              <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${validacao.valido ? 'text-emerald-600' : 'text-red-600'}`} />
              <div>
                <p className={`font-semibold text-sm ${validacao.valido ? 'text-emerald-600' : 'text-red-600'}`}>
                  Pontuação Média: {simulacao.pontuacaoMedia.toFixed(2)}
                </p>
                {!validacao.valido && (
                  <p className="text-xs text-red-600 mt-1">{validacao.motivo}</p>
                )}
                {validacao.valido && (
                  <p className="text-xs text-emerald-600 mt-1">
                    ✓ Dentro do seu limite ({limitePerfil})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
