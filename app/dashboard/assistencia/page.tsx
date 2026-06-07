'use client';

import { useState, useMemo } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useCollection } from '@/lib/hooks';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { AssistenciaTecnica, StatusChamado, Cliente, Atendimento } from '@/types';

const statusChamado: { value: StatusChamado; label: string; color: string }[] = [
  { value: 'aberto', label: '🔴 Aberto', color: 'bg-red-500/20 text-red-600' },
  { value: 'aguardando_peca', label: '⏳ Aguardando Peça', color: 'bg-amber-500/20 text-amber-600' },
  { value: 'visita_agendada', label: '📅 Visita Agendada', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'resolvido', label: '✓ Resolvido', color: 'bg-emerald-500/20 text-emerald-600' },
];

interface FormChamado {
  id?: string;
  atendimentoId: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  problemaRelatado: string;
  status: StatusChamado;
  tecnico: string;
  dataVisita: string;
  observacoes: string;
}

function toDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formVazio(): FormChamado {
  return {
    atendimentoId: '',
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    problemaRelatado: '',
    status: 'aberto',
    tecnico: '',
    dataVisita: '',
    observacoes: '',
  };
}

function AssistenciaContent() {
  const { data: chamados, loading } = useCollection<AssistenciaTecnica>('assistencia_tecnica');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { data: atendimentos } = useCollection<Atendimento>('atendimentos');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormChamado>(formVazio());
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const vendas = useMemo(
    () => (atendimentos as (Atendimento & { id: string })[]).filter((a) => a.tipo === 'venda'),
    [atendimentos]
  );

  const abrirNovo = () => {
    setForm(formVazio());
    setEditando(false);
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (c: AssistenciaTecnica & { id: string }) => {
    setForm({
      id: c.id,
      atendimentoId: c.atendimentoId || '',
      clienteId: c.clienteId || '',
      clienteNome: c.clienteNome,
      clienteTelefone: c.clienteTelefone || '',
      problemaRelatado: c.problemaRelatado,
      status: c.status,
      tecnico: c.tecnico || '',
      dataVisita: c.dataVisita ? toDate(c.dataVisita).toISOString().split('T')[0] : '',
      observacoes: c.observacoes || '',
    });
    setEditando(true);
    setErro('');
    setModalOpen(true);
  };

  const vincularVenda = (atendimentoId: string) => {
    const venda = vendas.find((v) => v.id === atendimentoId);
    if (!venda) {
      setForm({ ...form, atendimentoId: '' });
      return;
    }
    const cliente = clientes.find((c) => c.id === venda.clienteId);
    setForm({
      ...form,
      atendimentoId,
      clienteId: venda.clienteId || '',
      clienteNome: venda.clienteNome || cliente?.nome || '',
      clienteTelefone: venda.clienteTelefone || (cliente as any)?.telefoneWhatsapp || '',
    });
  };

  const salvar = async () => {
    setErro('');
    if (!form.clienteNome.trim()) {
      setErro('Informe o cliente.');
      return;
    }
    if (!form.problemaRelatado.trim()) {
      setErro('Descreva o problema.');
      return;
    }
    setSalvando(true);
    try {
      const dados: any = {
        atendimentoId: form.atendimentoId || null,
        clienteId: form.clienteId || null,
        clienteNome: form.clienteNome.trim(),
        clienteTelefone: form.clienteTelefone || null,
        problemaRelatado: form.problemaRelatado.trim(),
        status: form.status,
        tecnico: form.tecnico || null,
        dataVisita: form.dataVisita ? new Date(form.dataVisita) : null,
        observacoes: form.observacoes || null,
        atualizadoEm: serverTimestamp(),
      };
      if (form.status === 'resolvido') {
        dados.resolvidoEm = serverTimestamp();
      }
      if (editando && form.id) {
        await updateDoc(doc(db, 'assistencia_tecnica', form.id), dados);
      } else {
        await addDoc(collection(db, 'assistencia_tecnica'), {
          ...dados,
          dataAbertura: serverTimestamp(),
          criadoEm: serverTimestamp(),
        });
      }
      setModalOpen(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c: AssistenciaTecnica & { id: string }) => {
    if (!confirm(`Excluir o chamado de "${c.clienteNome}"?`)) return;
    await deleteDoc(doc(db, 'assistencia_tecnica', c.id));
  };

  const columns = [
    { header: 'Cliente', accessor: 'clienteNome' },
    { header: 'Problema', accessor: 'problemaRelatado', width: '35%' },
    {
      header: 'Abertura',
      accessor: 'dataAbertura',
      render: (data: any) => toDate(data).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status: string) => {
        const s = statusChamado.find((st) => st.value === status);
        return s ? (
          <span className={`px-2 py-1 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
        ) : (
          status
        );
      },
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (_: string, row: AssistenciaTecnica & { id: string }) => (
        <div className="flex gap-2">
          <button onClick={() => abrirEdicao(row)} className="p-1 hover:bg-background rounded" title="Editar">
            <Edit2 className="w-4 h-4 text-mali-primary" />
          </button>
          <button onClick={() => excluir(row)} className="p-1 hover:bg-background rounded" title="Excluir">
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
          <h1 className="text-3xl font-bold text-foreground">Assistência Técnica</h1>
          <p className="text-muted-foreground mt-2">Suporte e pós-venda</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-lg hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Chamado
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : (
        <Table columns={columns} data={chamados} emptyMessage="Nenhum chamado aberto" />
      )}

      <Modal
        isOpen={modalOpen}
        title={editando ? 'Editar Chamado' : 'Novo Chamado'}
        onClose={() => setModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Vincular a uma venda (opcional)
            </label>
            <select
              value={form.atendimentoId}
              onChange={(e) => vincularVenda(e.target.value)}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            >
              <option value="">Chamado avulso</option>
              {vendas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.clienteNome} — {toDate((v as any).criadoEm).toLocaleDateString('pt-BR')}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Cliente</label>
              <input
                type="text"
                value={form.clienteNome}
                onChange={(e) => setForm({ ...form, clienteNome: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Telefone</label>
              <input
                type="text"
                value={form.clienteTelefone}
                onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Problema Relatado</label>
            <textarea
              value={form.problemaRelatado}
              onChange={(e) => setForm({ ...form, problemaRelatado: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary resize-none"
              rows={2}
              placeholder="Descreva o problema..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Técnico</label>
              <input
                type="text"
                value={form.tecnico}
                onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data da Visita</label>
              <input
                type="date"
                value={form.dataVisita}
                onChange={(e) => setForm({ ...form, dataVisita: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {statusChamado.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setForm({ ...form, status: status.value })}
                  className={`px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                    form.status === status.value
                      ? `${status.color} border-current`
                      : 'bg-card border-border text-foreground hover:bg-background'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mali-primary resize-none"
              rows={2}
            />
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

export default function AssistenciaPage() {
  return (
    <ProtegerPagina permissao="operacoes.acessar">
      <AssistenciaContent />
    </ProtegerPagina>
  );
}
