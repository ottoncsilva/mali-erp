'use client';

import { useState } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useCollection } from '@/lib/hooks';
import { ContaBancaria, TipoContaBancaria } from '@/types';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Building2, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { formatBRL, formatData } from '@/lib/utils/format';

interface FormConta {
  id: string;
  nome: string;
  tipo: TipoContaBancaria;
  banco?: string;
  agencia?: string;
  conta?: string;
  saldoInicial: number;
  cor?: string;
}

const TIPOS: { value: TipoContaBancaria; label: string }[] = [
  { value: 'caixa', label: 'Caixa' },
  { value: 'banco', label: 'Banco' },
  { value: 'carteira_digital', label: 'Carteira Digital' },
  { value: 'outro', label: 'Outro' },
];

function ContasBancariasContent() {
  const { data: contas, loading } = useCollection<ContaBancaria>('contas_bancarias');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormConta>({
    id: '',
    nome: '',
    tipo: 'banco',
    saldoInicial: 0,
  });
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const gerarId = (): string => {
    return `conta_${Date.now()}`;
  };

  const abrirNovo = () => {
    setForm({
      id: gerarId(),
      nome: '',
      tipo: 'banco',
      saldoInicial: 0,
    });
    setEditando(false);
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (c: ContaBancaria & { id: string }) => {
    setForm({
      id: c.id,
      nome: c.nome,
      tipo: c.tipo,
      banco: c.banco,
      agencia: c.agencia,
      conta: c.conta,
      saldoInicial: c.saldoInicial,
      cor: c.cor,
    });
    setEditando(true);
    setErro('');
    setModalOpen(true);
  };

  const salvar = async () => {
    setErro('');
    if (!form.nome.trim()) {
      setErro('Informe o nome da conta.');
      return;
    }
    setSalvando(true);
    try {
      await setDoc(
        doc(db, 'contas_bancarias', form.id),
        {
          nome: form.nome.trim(),
          tipo: form.tipo,
          banco: form.banco || null,
          agencia: form.agencia || null,
          conta: form.conta || null,
          saldoInicial: form.saldoInicial,
          saldoAtual: editando ? undefined : form.saldoInicial,
          cor: form.cor || null,
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

  const excluir = async (c: ContaBancaria & { id: string }) => {
    if (!confirm(`Excluir a conta "${c.nome}"?`)) return;
    await deleteDoc(doc(db, 'contas_bancarias', c.id));
  };

  const columns = [
    {
      header: 'Conta',
      accessor: 'nome',
      render: (nome: string, row: ContaBancaria & { id: string }) => (
        <div>
          <p className="font-semibold text-foreground">{nome}</p>
          {row.tipo === 'banco' && row.agencia && row.conta && (
            <p className="text-xs text-muted-foreground">
              {row.banco || 'Banco'} • Ag. {row.agencia} • CC {row.conta}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (tipo: TipoContaBancaria) => {
        const label = TIPOS.find((t) => t.value === tipo)?.label || tipo;
        return <span className="text-sm text-muted-foreground">{label}</span>;
      },
    },
    {
      header: 'Saldo',
      accessor: 'saldoAtual',
      render: (saldo: number) => <span className="font-semibold">{formatBRL(saldo)}</span>,
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (_: string, row: ContaBancaria & { id: string }) => (
        <div className="flex gap-2">
          <button
            onClick={() => abrirEdicao(row)}
            className="p-1.5 rounded hover:bg-background"
            title="Editar"
          >
            <Pencil className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => excluir(row)}
            className="p-1.5 rounded hover:bg-background"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            Contas Bancárias
          </h1>
          <p className="text-muted-foreground mt-2">Gerencie suas contas, caixa e carteiras digitais</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Nova Conta
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : (
        <Table columns={columns} data={contas} emptyMessage="Nenhuma conta cadastrada" />
      )}

      <Modal isOpen={modalOpen} title={editando ? 'Editar Conta' : 'Nova Conta Bancária'} onClose={() => setModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                placeholder="Ex: Caixa Loja, Itaú CC, PIX"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoContaBancaria })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Saldo Inicial</label>
              <input
                type="number"
                step="0.01"
                value={form.saldoInicial}
                onChange={(e) => setForm({ ...form, saldoInicial: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>

            {form.tipo === 'banco' && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Banco</label>
                  <input
                    type="text"
                    value={form.banco || ''}
                    onChange={(e) => setForm({ ...form, banco: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                    placeholder="Ex: Itaú"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Agência</label>
                  <input
                    type="text"
                    value={form.agencia || ''}
                    onChange={(e) => setForm({ ...form, agencia: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                    placeholder="0000-0"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Conta</label>
                  <input
                    type="text"
                    value={form.conta || ''}
                    onChange={(e) => setForm({ ...form, conta: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                    placeholder="000000-0"
                  />
                </div>
              </>
            )}
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

export default function ContasBancariasPage() {
  return (
    <ProtegerPagina permissao="financeiro.acessar">
      <ContasBancariasContent />
    </ProtegerPagina>
  );
}
