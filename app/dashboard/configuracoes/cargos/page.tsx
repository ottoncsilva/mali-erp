'use client';

import { useEffect, useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCollection } from '@/lib/hooks';
import { Cargo } from '@/types';
import {
  Permissao,
  GRUPOS_PERMISSAO,
  PERMISSAO_LABEL,
  seedCargosSeVazio,
} from '@/lib/auth';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Modal } from '@/components/ui/Modal';
import { ShieldCheck, Plus, Pencil, Trash2, Loader2, Lock } from 'lucide-react';

// Converte um nome em uma chave/id de cargo (slug).
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

interface FormCargo {
  id: string;
  nome: string;
  permissoes: Permissao[];
  limitePontuacao: number;
  sistema: boolean;
}

const FORM_VAZIO: FormCargo = {
  id: '',
  nome: '',
  permissoes: [],
  limitePontuacao: 0,
  sistema: false,
};

function CargosContent() {
  const { data: cargos, loading } = useCollection<Cargo>('cargos');
  const [seeding, setSeeding] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormCargo>(FORM_VAZIO);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    seedCargosSeVazio().finally(() => setSeeding(false));
  }, []);

  const abrirNovo = () => {
    setForm(FORM_VAZIO);
    setEditando(false);
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (c: Cargo & { id: string }) => {
    setForm({
      id: c.id,
      nome: c.nome,
      permissoes: (c.permissoes || []) as Permissao[],
      limitePontuacao: c.limitePontuacao || 0,
      sistema: !!c.sistema,
    });
    setEditando(true);
    setErro('');
    setModalOpen(true);
  };

  const togglePermissao = (p: Permissao) => {
    setForm((f) => ({
      ...f,
      permissoes: f.permissoes.includes(p)
        ? f.permissoes.filter((x) => x !== p)
        : [...f.permissoes, p],
    }));
  };

  const salvar = async () => {
    setErro('');
    if (!form.nome.trim()) {
      setErro('Informe o nome do cargo.');
      return;
    }
    const id = editando ? form.id : slugify(form.nome);
    if (!id) {
      setErro('Nome inválido para gerar a chave do cargo.');
      return;
    }
    if (!editando && cargos.some((c) => c.id === id)) {
      setErro('Já existe um cargo com esse nome.');
      return;
    }
    setSalvando(true);
    try {
      await setDoc(
        doc(db, 'cargos', id),
        {
          nome: form.nome.trim(),
          permissoes: form.permissoes,
          limitePontuacao: form.limitePontuacao || 0,
          sistema: form.sistema,
          ativo: true,
          atualizadoEm: new Date(),
          ...(editando ? {} : { criadoEm: new Date(), comissaoAtiva: false, comissaoPct: 0, baseComissao: 'vista', modoComissao: 'vendedor' }),
        },
        { merge: true }
      );
      setModalOpen(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c: Cargo & { id: string }) => {
    if (c.sistema) return;
    if (!confirm(`Excluir o cargo "${c.nome}"? Usuários com esse cargo perderão as permissões.`)) {
      return;
    }
    await deleteDoc(doc(db, 'cargos', c.id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <ShieldCheck className="w-8 h-8" />
            Cargos & Permissões
          </h1>
          <p className="text-muted-foreground mt-2">
            Defina o que cada cargo pode acessar no sistema
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Novo Cargo
        </button>
      </div>

      {loading || seeding ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cargos
            .slice()
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map((c) => (
              <div key={c.id} className="bg-card border border-border rounded-lg p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {c.nome}
                      {c.sistema && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {(c.permissoes?.length || 0)} permissões
                      {c.limitePontuacao ? ` · trava ${c.limitePontuacao}x` : ' · sem trava'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => abrirEdicao(c)}
                      className="p-1.5 rounded hover:bg-background"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {!c.sistema && (
                      <button
                        onClick={() => excluir(c)}
                        className="p-1.5 rounded hover:bg-background"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(c.permissoes || []).slice(0, 6).map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded bg-background text-[10px] text-muted-foreground"
                    >
                      {PERMISSAO_LABEL[p as Permissao] || p}
                    </span>
                  ))}
                  {(c.permissoes?.length || 0) > 6 && (
                    <span className="px-2 py-0.5 text-[10px] text-muted-foreground">
                      +{(c.permissoes!.length - 6)}
                    </span>
                  )}
                  {(c.permissoes?.length || 0) === 0 && (
                    <span className="text-[11px] text-muted-foreground">Sem permissões</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        title={editando ? `Editar — ${form.nome}` : 'Novo Cargo'}
        onClose={() => setModalOpen(false)}
        size="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome do cargo</label>
              <input
                type="text"
                value={form.nome}
                disabled={form.sistema}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-60"
                placeholder="Ex: Supervisor de loja"
              />
              {form.sistema && (
                <p className="text-xs text-muted-foreground mt-1">
                  Cargo do sistema — o nome não pode ser alterado.
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Trava de pontuação (mín.)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.limitePontuacao}
                onChange={(e) =>
                  setForm({ ...form, limitePontuacao: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">0 = sem trava (ilimitado)</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Permissões</label>
            <div className="space-y-4">
              {GRUPOS_PERMISSAO.map((grupo) => (
                <div key={grupo.grupo}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
                    {grupo.grupo}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {grupo.permissoes.map((p) => (
                      <label
                        key={p}
                        className="flex items-center gap-2 p-2 rounded-md border border-border hover:bg-background cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={form.permissoes.includes(p)}
                          onChange={() => togglePermissao(p)}
                          className="accent-mali-primary"
                        />
                        <span className="text-sm text-foreground">{PERMISSAO_LABEL[p]}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-background"
            >
              Cancelar
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function CargosPage() {
  return (
    <ProtegerPagina permissao="usuarios.gerir">
      <CargosContent />
    </ProtegerPagina>
  );
}
