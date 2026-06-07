'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/hooks';
import { AlertCircle, Save } from 'lucide-react';

export default function PrecificacaoPage() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    pontuacaoPadrao: 2.0,
    limitesPontuacao: { vendedor: 1.8, gerencia: 1.5 },
  });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'empresa', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig({
            pontuacaoPadrao: data.pontuacaoPadrao || 2.0,
            limitesPontuacao: data.limitesPontuacao || { vendedor: 1.8, gerencia: 1.5 },
          });
        }
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
      // setDoc com merge cria o documento se ainda não existir (evita erro do updateDoc).
      await setDoc(docRef, config, { merge: true });
      alert('Configurações salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (userProfile?.perfil !== 'admin' && userProfile?.perfil !== 'gerencia') {
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

  if (loading) {
    return <div className="text-center py-8">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Precificação</h1>
        <p className="text-muted-foreground mt-2">Configure as regras de precificação e pontuação da loja</p>
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
            {/* Vendedor */}
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

            {/* Gerência */}
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

            {/* Admin */}
            <div className="p-6 bg-background rounded-lg border border-border md:col-span-2">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-mali-primary"></span>
                Admin
              </h3>
              <p className="text-sm text-muted-foreground">Admin tem acesso ilimitado - pode cobrar com qualquer pontuação</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <p className="text-sm text-blue-600">
            <strong>Como funciona:</strong> Pontuação Real = CMV ÷ Preço Final. Se cair abaixo do limite, o sistema solicita aprovação de quem tem maior limite.
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
