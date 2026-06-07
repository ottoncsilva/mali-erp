'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCollection } from '@/lib/hooks';
import { CategoriaFinanceira, TipoCategoriaFinanceira, GrupoDRE } from '@/types';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Landmark, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { seedCategoriasSeVazio, CATEGORIA_LABEL, GRUPO_DRE_LABEL } from '@/lib/financeiro/categorias';

interface FormCategoria {
  id: string;
  nome: string;
  tipo: TipoCategoriaFinanceira;
  grupoDRE: GrupoDRE;
  cor?: string;
}

const TIPOS: TipoCategoriaFinanceira[] = ['receita', 'despesa'];
const GRUPOS: GrupoDRE[] = [
  'receita_bruta',
  'deducoes',
  'cmv',
  'despesa_operacional',
  'despesa_pessoal',
  'despesa_financeira',
  'outras_receitas',
  'nao_operacional',
];

function CategoriasContent() {
  const { data: categorias, loading } = useCollection<CategoriaFinanceira>('categorias_financeiras');
  const [seeding, setSeeding] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormCategoria>({
    id: '',
    nome: '',
    tipo: 'despesa',
    grupoDRE: 'despesa_operacional',
  });
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoCategoriaFinanceira | 'todas'>('todas');

  useEffect(() => {
    seedCategoriasSeVazio().finally(() => setSeeding(false));
  }, []);

  const gerarId = (nome: string): string => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
  };

  const abrirNovo = () => {
    setForm({
      id: '',
      nome: '',
      tipo: 'despesa',
      grupoDRE: 'despesa_operacional',
    });
    setEditando(false);
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (c: CategoriaFinanceira & { id: string }) => {
    setForm({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      grupoDRE: c.grupoDRE,
      cor: c.cor,
    });
    setEditando(true);
    setErro('');
    setModalOpen(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.nome.trim()) {
      setErro('Informe o nome da categoria.');
      return;
    }
    const id = editando ? form.id : gerarId(form.nome);
    if (!id) {
      setErro('Nome inválido para gerar o ID.');
      return;
    }
    if (!editando && categorias.some((c) => c.id === id)) {
      setErro('Já existe uma categoria com esse nome.');
      return;
    }
    setSalvando(true);
    try {
      await setDoc(
        doc(db, 'categorias_financeiras', id),
        {
          nome: form.nome.trim(),
          tipo: form.tipo,
          grupoDRE: form.grupoDRE,
          cor: form.cor,
          ativo: true,
          atualizadoEm: new Date(),
          ...(editando ? {} : { criadoEm: new Date() }),
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

  const excluir = async (c: CategoriaFinanceira & { id: string }) => {
    if (c.sistema) return;
    if (!confirm(`Excluir a categoria "${c.nome}"?`)) return;
    await deleteDoc(doc(db, 'categorias_financeiras', c.id));
  };

  const filtradas = useMemo(() => {
    return categorias.filter((c) =>
      filtroTipo === 'todas' ? true : c.tipo === filtroTipo
    );
  }, [categorias, filtroTipo]);

  const columns = [
    {
      header: 'Nome',
      accessor: 'nome',
      render: (nome: string, row: CategoriaFinanceira & { id: string }) => (
        <div>
          <p className="font-semibold text-foreground">{nome}</p>
          {row.sistema && (
            <p className="text-xs text-muted-foreground">Sistema (protegido)</p>
          )}
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (tipo: TipoCategoriaFinanceira) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            tipo === 'receita'
              ? 'bg-emerald-500/20 text-emerald-600'
              : 'bg-red-500/20 text-red-600'
          }`}
        >
          {tipo === 'receita' ? '📥 Receita' : '📤 Despesa'}
        </span>
      ),
    },
    {
      header: 'Grupo DRE',
      accessor: 'grupoDRE',
      render: (grupo: GrupoDRE) => (
        <span className="text-sm text-muted-foreground">{GRUPO_DRE_LABEL[grupo]}</span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (_: string, row: CategoriaFinanceira & { id: string }) => (
        <div className="flex gap-2">
          <button
            onClick={() => abrirEdicao(row)}
            className="p-1.5 rounded hover:bg-background"
            title="Editar"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
          {!row.sistema && (
            <button
              onClick={() => excluir(row)}
              className="p-1.5 rounded hover:bg-background"
              title="Excluir"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Landmark className="w-8 h-8" />
            Categorias Financeiras
          </h1>
          <p className="text-muted-foreground mt-2">Plano de contas para classificação de lançamentos</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {/* Filtro */}
      <div className="flex gap-3">
        {[
          { value: 'todas', label: '📊 Todas' },
          { value: 'receita', label: '📥 Receitas' },
          { value: 'despesa', label: '📤 Despesas' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroTipo(f.value as any)}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filtroTipo === f.value
                ? 'bg-mali-primary text-mali-secondary'
                : 'bg-card border border-border text-foreground hover:bg-background'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading || seeding ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : (
        <Table columns={columns} data={filtradas} emptyMessage="Nenhuma categoria encontrada" />
      )}

      <Modal isOpen={modalOpen} title={editando ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              placeholder="Ex: Aluguel"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCategoriaFinanceira })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t === 'receita' ? 'Receita' : 'Despesa'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Grupo DRE</label>
              <select
                value={form.grupoDRE}
                onChange={(e) => setForm({ ...form, grupoDRE: e.target.value as GrupoDRE })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                {GRUPOS.map((g) => (
                  <option key={g} value={g}>
                    {GRUPO_DRE_LABEL[g]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
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

export default function CategoriasFinanceirasPage() {
  return (
    <ProtegerPagina permissao="financeiro.acessar">
      <CategoriasContent />
    </ProtegerPagina>
  );
}
