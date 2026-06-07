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
import { Calendar, Plus, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Table } from '@/components/ui/Table';
import { useCollection } from '@/lib/hooks';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Entrega, StatusEntrega, Cliente, Atendimento } from '@/types';

const statusEntrega: { value: StatusEntrega; label: string; color: string }[] = [
  { value: 'agendada', label: '📅 Agendada', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'em_rota', label: '🚚 Em Rota', color: 'bg-amber-500/20 text-amber-600' },
  { value: 'entregue', label: '✓ Entregue', color: 'bg-emerald-500/20 text-emerald-600' },
  { value: 'montada', label: '🔧 Montada', color: 'bg-purple-500/20 text-purple-600' },
  { value: 'problema', label: '⚠️ Problema', color: 'bg-red-500/20 text-red-600' },
];

interface FormEntrega {
  id?: string;
  atendimentoId: string;
  clienteId: string;
  clienteNome: string;
  clienteTelefone: string;
  dataAgendada: Date;
  turno: 'manha' | 'tarde';
  status: StatusEntrega;
  enderecoEntrega: string;
  observacoes: string;
  montador: string;
}

function toDate(v: any): Date {
  if (!v) return new Date();
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formEntregaVazio(): FormEntrega {
  return {
    atendimentoId: '',
    clienteId: '',
    clienteNome: '',
    clienteTelefone: '',
    dataAgendada: new Date(),
    turno: 'manha',
    status: 'agendada',
    enderecoEntrega: '',
    observacoes: '',
    montador: '',
  };
}

function EntregasContent() {
  const { data: entregas, loading } = useCollection<Entrega>('entregas');
  const { data: clientes } = useCollection<Cliente>('clientes');
  const { data: atendimentos } = useCollection<Atendimento>('atendimentos');

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormEntrega>(formEntregaVazio());
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [viewMode, setViewMode] = useState<'agenda' | 'lista'>('lista');

  // Vendas finalizadas (para vincular entrega).
  const vendas = useMemo(
    () => (atendimentos as (Atendimento & { id: string })[]).filter((a) => a.tipo === 'venda'),
    [atendimentos]
  );

  const entregasPorData = useMemo(() => {
    const grouped: Record<string, (Entrega & { id: string })[]> = {};
    (entregas as (Entrega & { id: string })[]).forEach((e) => {
      const data = toDate(e.dataAgendada).toLocaleDateString('pt-BR');
      if (!grouped[data]) grouped[data] = [];
      grouped[data].push(e);
    });
    return grouped;
  }, [entregas]);

  const abrirNovo = () => {
    setForm(formEntregaVazio());
    setEditando(false);
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (e: Entrega & { id: string }) => {
    setForm({
      id: e.id,
      atendimentoId: e.atendimentoId || '',
      clienteId: e.clienteId || '',
      clienteNome: e.clienteNome,
      clienteTelefone: e.clienteTelefone || '',
      dataAgendada: toDate(e.dataAgendada),
      turno: e.turno,
      status: e.status,
      enderecoEntrega: e.enderecoEntrega,
      observacoes: e.observacoes || '',
      montador: e.montador || '',
    });
    setEditando(true);
    setErro('');
    setModalOpen(true);
  };

  // Ao escolher uma venda, preenche cliente/endereço.
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
      enderecoEntrega: (cliente as any)?.endereco || form.enderecoEntrega,
    });
  };

  const salvar = async () => {
    setErro('');
    if (!form.clienteNome.trim()) {
      setErro('Informe o cliente.');
      return;
    }
    setSalvando(true);
    try {
      const dados: any = {
        atendimentoId: form.atendimentoId || null,
        clienteId: form.clienteId || null,
        clienteNome: form.clienteNome.trim(),
        clienteTelefone: form.clienteTelefone || null,
        dataAgendada: form.dataAgendada,
        turno: form.turno,
        status: form.status,
        enderecoEntrega: form.enderecoEntrega,
        observacoes: form.observacoes || null,
        montador: form.montador || null,
        atualizadoEm: serverTimestamp(),
      };
      if (form.status === 'entregue' || form.status === 'montada') {
        dados.entregueEm = serverTimestamp();
      }
      if (editando && form.id) {
        await updateDoc(doc(db, 'entregas', form.id), dados);
      } else {
        await addDoc(collection(db, 'entregas'), { ...dados, criadoEm: serverTimestamp() });
      }
      setModalOpen(false);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (e: Entrega & { id: string }) => {
    if (!confirm(`Excluir a entrega de "${e.clienteNome}"?`)) return;
    await deleteDoc(doc(db, 'entregas', e.id));
  };

  const columns = [
    { header: 'Cliente', accessor: 'clienteNome' },
    { header: 'Endereço', accessor: 'enderecoEntrega', width: '30%' },
    {
      header: 'Data',
      accessor: 'dataAgendada',
      render: (data: any) => toDate(data).toLocaleDateString('pt-BR'),
    },
    {
      header: 'Turno',
      accessor: 'turno',
      render: (turno: string) => (turno === 'manha' ? '🌅 Manhã' : '🌆 Tarde'),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status: string) => {
        const s = statusEntrega.find((st) => st.value === status);
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
      render: (_: string, row: Entrega & { id: string }) => (
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
          <h1 className="text-3xl font-bold text-foreground">Entregas & Montagem</h1>
          <p className="text-muted-foreground mt-2">Agendamento e rastreamento de entregas</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-lg hover:opacity-90 transition-all"
        >
          <Plus className="w-4 h-4" />
          Agendar Entrega
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setViewMode('lista')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'lista'
              ? 'bg-mali-primary text-mali-secondary'
              : 'bg-card border border-border text-foreground hover:bg-background'
          }`}
        >
          📋 Lista
        </button>
        <button
          onClick={() => setViewMode('agenda')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
            viewMode === 'agenda'
              ? 'bg-mali-primary text-mali-secondary'
              : 'bg-card border border-border text-foreground hover:bg-background'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Calendário
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : viewMode === 'lista' ? (
        <Table columns={columns} data={entregas} emptyMessage="Nenhuma entrega agendada" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(entregasPorData).map(([data, items]) => (
            <div key={data} className="bg-card rounded-lg border border-border p-4">
              <h3 className="font-semibold text-foreground mb-3">{data}</h3>
              <div className="space-y-2">
                {items.map((entrega) => {
                  const status = statusEntrega.find((s) => s.value === entrega.status);
                  return (
                    <div
                      key={entrega.id}
                      onClick={() => abrirEdicao(entrega)}
                      className={`p-3 rounded-lg cursor-pointer border-l-4 transition-all hover:shadow-md ${status?.color} border-l-mali-primary`}
                    >
                      <p className="text-xs font-semibold mb-1">
                        {entrega.turno === 'manha' ? '🌅 Manhã' : '🌆 Tarde'}
                      </p>
                      <p className="text-sm font-medium line-clamp-1">{entrega.clienteNome}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {entrega.enderecoEntrega}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {Object.keys(entregasPorData).length === 0 && (
            <p className="text-muted-foreground text-sm col-span-full text-center py-8">
              Nenhuma entrega agendada
            </p>
          )}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        title={editando ? 'Editar Entrega' : 'Agendar Entrega'}
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
              <option value="">Entrega avulsa</option>
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
            <label className="text-sm font-medium text-foreground mb-1 block">Endereço de Entrega</label>
            <input
              type="text"
              value={form.enderecoEntrega}
              onChange={(e) => setForm({ ...form, enderecoEntrega: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Data</label>
              <input
                type="date"
                value={form.dataAgendada.toISOString().split('T')[0]}
                onChange={(e) => setForm({ ...form, dataAgendada: new Date(e.target.value) })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Turno</label>
              <select
                value={form.turno}
                onChange={(e) => setForm({ ...form, turno: e.target.value as 'manha' | 'tarde' })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                <option value="manha">🌅 Manhã</option>
                <option value="tarde">🌆 Tarde</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Montador</label>
              <input
                type="text"
                value={form.montador}
                onChange={(e) => setForm({ ...form, montador: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
            <div className="grid grid-cols-3 gap-2">
              {statusEntrega.map((status) => (
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
              placeholder="Ex: 5º andar sem elevador..."
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

export default function EntregasPage() {
  return (
    <ProtegerPagina permissao="operacoes.acessar">
      <EntregasContent />
    </ProtegerPagina>
  );
}
