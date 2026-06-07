'use client';

import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCollection } from '@/lib/hooks';
import { Cargo } from '@/types';
import {
  BaseComissao,
  ModoComissao,
  BASE_COMISSAO_LABEL,
  MODO_COMISSAO_LABEL,
  seedCargosSeVazio,
} from '@/lib/auth';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Percent, Loader2, Info, Save, CheckCircle2 } from 'lucide-react';

function ComissoesContent() {
  const { data: cargos, loading } = useCollection<Cargo>('cargos');
  const [seeding, setSeeding] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [salvoId, setSalvoId] = useState<string | null>(null);
  // Edições locais por cargo antes de salvar.
  const [rascunho, setRascunho] = useState<Record<string, Partial<Cargo>>>({});

  useEffect(() => {
    seedCargosSeVazio().finally(() => setSeeding(false));
  }, []);

  const valorDe = (c: Cargo & { id: string }, campo: keyof Cargo) => {
    const r = rascunho[c.id];
    return r && campo in r ? (r as any)[campo] : (c as any)[campo];
  };

  const setCampo = (id: string, campo: keyof Cargo, valor: any) => {
    setRascunho((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));
    setSalvoId(null);
  };

  const salvar = async (c: Cargo & { id: string }) => {
    setSalvandoId(c.id);
    try {
      await updateDoc(doc(db, 'cargos', c.id), {
        comissaoAtiva: valorDe(c, 'comissaoAtiva') ?? false,
        comissaoPct: valorDe(c, 'comissaoPct') ?? 0,
        baseComissao: valorDe(c, 'baseComissao') ?? 'vista',
        modoComissao: valorDe(c, 'modoComissao') ?? 'vendedor',
        atualizadoEm: new Date(),
      });
      setRascunho((prev) => {
        const novo = { ...prev };
        delete novo[c.id];
        return novo;
      });
      setSalvoId(c.id);
    } finally {
      setSalvandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Percent className="w-8 h-8" />
          Comissões por Cargo
        </h1>
        <p className="text-muted-foreground mt-2">
          Defina o percentual e a forma de remuneração de cada cargo. A comissão não altera o
          preço — gera contas a pagar a cada venda.
        </p>
      </div>

      <div className="flex items-start gap-2 p-4 bg-mali-primary/5 border border-mali-primary/20 rounded-lg">
        <Info className="w-5 h-5 text-mali-primary flex-shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong className="text-foreground">Quem fechou a venda</strong>: paga só ao colaborador
            que registrou a venda (típico de vendedor).
          </p>
          <p>
            <strong className="text-foreground">Todos do cargo (override)</strong>: paga a todos os
            colaboradores ativos do cargo em toda venda (típico de gerente).
          </p>
          <p>O percentual pode ser ajustado individualmente no cadastro de cada colaborador.</p>
        </div>
      </div>

      {loading || seeding ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {cargos
            .slice()
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((c) => {
              const ativa = valorDe(c, 'comissaoAtiva') ?? false;
              const alterado = !!rascunho[c.id];
              return (
                <div key={c.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[140px]">
                      <p className="font-semibold text-foreground">{c.nome}</p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={ativa}
                          onChange={(e) => setCampo(c.id, 'comissaoAtiva', e.target.checked)}
                          className="accent-mali-primary"
                        />
                        <span className="text-sm text-muted-foreground">Comissão ativa</span>
                      </label>
                    </div>

                    <div className="w-24">
                      <label className="text-xs text-muted-foreground mb-1 block">% padrão</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        disabled={!ativa}
                        value={valorDe(c, 'comissaoPct') ?? 0}
                        onChange={(e) =>
                          setCampo(c.id, 'comissaoPct', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-50"
                      />
                    </div>

                    <div className="flex-1 min-w-[180px]">
                      <label className="text-xs text-muted-foreground mb-1 block">
                        Base de cálculo
                      </label>
                      <select
                        disabled={!ativa}
                        value={valorDe(c, 'baseComissao') ?? 'vista'}
                        onChange={(e) =>
                          setCampo(c.id, 'baseComissao', e.target.value as BaseComissao)
                        }
                        className="w-full px-2 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-50"
                      >
                        {(['vista', 'proposta', 'margem'] as BaseComissao[]).map((b) => (
                          <option key={b} value={b}>
                            {BASE_COMISSAO_LABEL[b]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1 min-w-[180px]">
                      <label className="text-xs text-muted-foreground mb-1 block">Quem recebe</label>
                      <select
                        disabled={!ativa}
                        value={valorDe(c, 'modoComissao') ?? 'vendedor'}
                        onChange={(e) =>
                          setCampo(c.id, 'modoComissao', e.target.value as ModoComissao)
                        }
                        className="w-full px-2 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-50"
                      >
                        {(['vendedor', 'override'] as ModoComissao[]).map((m) => (
                          <option key={m} value={m}>
                            {MODO_COMISSAO_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => salvar(c)}
                      disabled={!alterado || salvandoId === c.id}
                      className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {salvandoId === c.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : salvoId === c.id ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {salvoId === c.id ? 'Salvo' : 'Salvar'}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

export default function ComissoesPage() {
  return (
    <ProtegerPagina permissao="usuarios.gerir">
      <ComissoesContent />
    </ProtegerPagina>
  );
}
