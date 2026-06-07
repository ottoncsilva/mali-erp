'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/hooks';
import { CondicaoPagamentoConfig } from '@/types';
import { condicoesPadrao, fatorCondicao } from '@/lib/utils/precificacao';
import { AlertCircle, Save, Plus, Trash2, Percent } from 'lucide-react';

export default function PrecificacaoPage() {
  const { can, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    pontuacaoPadrao: 2.0,
    limitesPontuacao: { vendedor: 1.8, gerencia: 1.5 },
    taxaJurosMensal: 0.02,
    condicoesPagamento: [] as CondicaoPagamentoConfig[],
  });
  const seededRef = useRef(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'empresa', 'config');
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : {};
        const condicoes: CondicaoPagamentoConfig[] =
          Array.isArray(data.condicoesPagamento) && data.condicoesPagamento.length > 0
            ? data.condicoesPagamento
            : condicoesPadrao();
        // Marca para persistir as condições padrão na primeira vez.
        if (!Array.isArray(data.condicoesPagamento) || data.condicoesPagamento.length === 0) {
          seededRef.current = true;
        }
        setConfig({
          pontuacaoPadrao: data.pontuacaoPadrao || 2.0,
          limitesPontuacao: data.limitesPontuacao || { vendedor: 1.8, gerencia: 1.5 },
          taxaJurosMensal: data.taxaJurosMensal ?? 0.02,
          condicoesPagamento: condicoes.sort((a, b) => a.ordem - b.ordem),
        });
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'empresa', 'config');
      await setDoc(docRef, config, { merge: true });
      seededRef.current = false;
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const updateCondicao = (id: string, patch: Partial<CondicaoPagamentoConfig>) => {
    setConfig((prev) => ({
      ...prev,
      condicoesPagamento: prev.condicoesPagamento.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  };

  const removeCondicao = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      condicoesPagamento: prev.condicoesPagamento.filter((c) => c.id !== id),
    }));
  };

  const addCondicao = () => {
    const nova: CondicaoPagamentoConfig = {
      id: `cond-${Date.now()}`,
      nome: 'Nova condição',
      tipo: 'parcelado',
      parcelas: 1,
      temEntrada: false,
      ativo: true,
      ordem: (config.condicoesPagamento.reduce((m, c) => Math.max(m, c.ordem), 0) || 0) + 1,
    };
    setConfig((prev) => ({
      ...prev,
      condicoesPagamento: [...prev.condicoesPagamento, nova],
    }));
  };

  const restaurarPadroes = () => {
    if (confirm('Restaurar as condições de pagamento padrão? As atuais serão substituídas.')) {
      setConfig((prev) => ({ ...prev, condicoesPagamento: condicoesPadrao() }));
    }
  };

  if (loading || authLoading) {
    return <div className="text-center py-8">Carregando configurações...</div>;
  }

  if (!can('config.precificacao')) {
    return (
      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-6 flex gap-4">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-orange-600 mb-1">Acesso Restrito</h3>
          <p className="text-sm text-orange-600/80">Apenas Admin e Gerência podem acessar esta página</p>
        </div>
      </div>
    );
  }

  // Exemplo de impacto dos juros sobre R$ 1.000 à vista.
  const taxaPct = (config.taxaJurosMensal * 100).toFixed(2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Precificação</h1>
        <p className="text-muted-foreground mt-2">Configure pontuação, travas, juros e condições de pagamento</p>
      </div>

      <div className="bg-card rounded-lg border border-border p-8 space-y-8">
        {/* Pontuação Padrão */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Pontuação Padrão da Loja</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Este multiplicador será aplicado ao CMV para calcular o preço à vista dos produtos
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">Multiplicador Padrão</label>
              <input
                type="number"
                value={config.pontuacaoPadrao}
                onChange={(e) => setConfig({ ...config, pontuacaoPadrao: parseFloat(e.target.value) })}
                step="0.1"
                min="1"
                className="w-full px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary text-lg"
              />
              <p className="text-xs text-muted-foreground mt-2">Exemplo: 2.0 = Preço = CMV × 2</p>
            </div>
            <div className="p-4 bg-background rounded-md">
              <p className="text-sm text-muted-foreground mb-2">Exemplo Prático:</p>
              <p className="text-2xl font-bold text-mali-primary">
                R$ {(100 * config.pontuacaoPadrao).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">CMV R$100 → Preço com Pontuação {config.pontuacaoPadrao}</p>
            </div>
          </div>
        </div>

        {/* Travas de Negociação */}
        <div className="pt-6 border-t border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Travas de Negociação</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Define o limite mínimo de pontuação que cada perfil pode negociar. Se a pontuação cair abaixo, o sistema bloqueia até aprovação.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-background rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                Vendedor
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Pontuação Mínima</label>
                  <input
                    type="number"
                    value={config.limitesPontuacao.vendedor}
                    onChange={(e) => setConfig({
                      ...config,
                      limitesPontuacao: { ...config.limitesPontuacao, vendedor: parseFloat(e.target.value) }
                    })}
                    step="0.1"
                    min="1"
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="p-3 bg-blue-500/10 rounded-md">
                  <p className="text-xs text-blue-600">
                    Vendedor não pode cobrar com pontuação menor que {config.limitesPontuacao.vendedor}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                Gerência
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Pontuação Mínima</label>
                  <input
                    type="number"
                    value={config.limitesPontuacao.gerencia}
                    onChange={(e) => setConfig({
                      ...config,
                      limitesPontuacao: { ...config.limitesPontuacao, gerencia: parseFloat(e.target.value) }
                    })}
                    step="0.1"
                    min="1"
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div className="p-3 bg-amber-500/10 rounded-md">
                  <p className="text-xs text-amber-600">
                    Gerência não pode cobrar com pontuação menor que {config.limitesPontuacao.gerencia}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 bg-background rounded-lg border border-border md:col-span-2">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-mali-primary"></span>
                Admin
              </h3>
              <p className="text-sm text-muted-foreground">Admin tem acesso ilimitado - pode cobrar com qualquer pontuação</p>
            </div>
          </div>
        </div>

        {/* Juros e Condições de Pagamento */}
        <div className="pt-6 border-t border-border">
          <h2 className="text-xl font-semibold text-foreground mb-4">Juros & Condições de Pagamento</h2>
          <p className="text-sm text-muted-foreground mb-6">
            A taxa de juros mensal é aplicada via <strong>Tabela Price</strong> para converter o preço à vista no
            valor a prazo. As condições abaixo alimentam o orçamento, o financeiro e o PDF.
          </p>

          {/* Taxa de juros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                <Percent className="w-4 h-4 text-mali-primary" /> Taxa de Juros Mensal (%)
              </label>
              <input
                type="number"
                value={taxaPct}
                onChange={(e) =>
                  setConfig({ ...config, taxaJurosMensal: (parseFloat(e.target.value) || 0) / 100 })
                }
                step="0.1"
                min="0"
                className="w-full px-4 py-3 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary text-lg"
              />
              <p className="text-xs text-muted-foreground mt-2">Ex.: 2,00 = 2% ao mês</p>
            </div>
            <div className="p-4 bg-background rounded-md md:col-span-2">
              <p className="text-sm text-muted-foreground mb-2">Exemplo: R$ 1.000,00 à vista parcelado:</p>
              <div className="flex flex-wrap gap-4">
                {[1, 6, 10, 12].map((n) => {
                  const total = 1000 * fatorCondicao(
                    { id: `${n}`, nome: '', tipo: 'parcelado', parcelas: n, temEntrada: false, ativo: true, ordem: 0 },
                    config.taxaJurosMensal
                  );
                  return (
                    <div key={n} className="text-center">
                      <p className="text-xs text-muted-foreground">{n}x</p>
                      <p className="text-sm font-bold text-mali-primary">R$ {(total / n).toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">total R$ {total.toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lista de condições */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {config.condicoesPagamento.length} condições cadastradas
            </p>
            <div className="flex gap-2">
              <button
                onClick={restaurarPadroes}
                className="px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground hover:bg-card transition-colors"
              >
                Restaurar padrões
              </button>
              <button
                onClick={addCondicao}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-background text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nome</th>
                  <th className="text-left px-3 py-2 font-medium">Tipo</th>
                  <th className="text-center px-3 py-2 font-medium">Parcelas</th>
                  <th className="text-center px-3 py-2 font-medium">Ativo</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {config.condicoesPagamento.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={c.nome}
                        onChange={(e) => updateCondicao(c.id, { nome: e.target.value })}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-mali-primary"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={c.tipo}
                        onChange={(e) => {
                          const tipo = e.target.value as CondicaoPagamentoConfig['tipo'];
                          updateCondicao(c.id, {
                            tipo,
                            temEntrada: tipo === 'entrada_parcelado',
                            parcelas: tipo === 'avista' ? 1 : c.parcelas,
                          });
                        }}
                        className="w-full px-2 py-1 bg-background border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-mali-primary"
                      >
                        <option value="avista">À Vista</option>
                        <option value="parcelado">Parcelado</option>
                        <option value="entrada_parcelado">Entrada + Parcelas</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="number"
                        value={c.parcelas}
                        min="1"
                        disabled={c.tipo === 'avista'}
                        onChange={(e) => updateCondicao(c.id, { parcelas: parseInt(e.target.value) || 1 })}
                        className="w-16 px-2 py-1 bg-background border border-border rounded text-foreground text-center focus:outline-none focus:ring-1 focus:ring-mali-primary disabled:opacity-40"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={c.ativo}
                        onChange={(e) => updateCondicao(c.id, { ativo: e.target.checked })}
                        className="w-4 h-4 accent-mali-primary"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeCondicao(c.id)}
                        className="p-1 hover:bg-red-500/10 rounded transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-600">
            <strong>Como funciona:</strong> Pontuação Real = Preço Final ÷ CMV. O desconto incide sobre o preço à
            vista; depois os juros da condição convertem o à vista no valor da proposta.
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-6 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-medium"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </div>
    </div>
  );
}
