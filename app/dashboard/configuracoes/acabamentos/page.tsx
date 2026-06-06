'use client';

import { useState } from 'react';
import { useCollection, useAddDocument, useUpdateDocument, useDeleteDocument } from '@/lib/hooks';
import { VariavelAcabamento } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const tiposAcabamento = [
  { value: 'tecido', label: 'Tecido' },
  { value: 'cor_madeira', label: 'Cor de Madeira' },
  { value: 'lateralidade', label: 'Lateralidade (Chaise)' },
  { value: 'outro', label: 'Outro' },
];

export default function AcabamentosPage() {
  const { data: acabamentos, loading } = useCollection<VariavelAcabamento>('variaveis_acabamento');
  const { add: addAcabamento } = useAddDocument('variaveis_acabamento');
  const { update: updateAcabamento } = useUpdateDocument('variaveis_acabamento');
  const { remove: deleteAcabamento } = useDeleteDocument('variaveis_acabamento');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'tecido',
    nomeDaOpcao: '',
    ativo: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateAcabamento(editingId, formData);
      } else {
        await addAcabamento(formData);
      }
      setFormData({ tipo: 'tecido', nomeDaOpcao: '', ativo: true });
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const handleEdit = (acabamento: VariavelAcabamento & { id: string }) => {
    setFormData({ ...acabamento });
    setEditingId(acabamento.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar?')) {
      try {
        await deleteAcabamento(id);
      } catch (err) {
        console.error('Erro:', err);
      }
    }
  };

  const columns = [
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (tipo: string) => tiposAcabamento.find(t => t.value === tipo)?.label || tipo,
    },
    { header: 'Nome', accessor: 'nomeDaOpcao', width: '50%' },
    {
      header: 'Status',
      accessor: 'ativo',
      render: (value: boolean) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${value ? 'bg-emerald-500/20 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
          {value ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (id: string, row: VariavelAcabamento & { id: string }) => (
        <div className="flex gap-2">
          <button onClick={() => handleEdit(row)} className="p-1 hover:bg-background rounded">
            <Edit2 className="w-4 h-4 text-mali-primary" />
          </button>
          <button onClick={() => handleDelete(id)} className="p-1 hover:bg-background rounded">
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
          <h1 className="text-3xl font-bold text-foreground">Variáveis de Acabamento</h1>
          <p className="text-muted-foreground mt-2">Tecidos, cores de madeira, lateralidades, etc.</p>
        </div>
        <button
          onClick={() => { setFormData({ tipo: 'tecido', nomeDaOpcao: '', ativo: true }); setEditingId(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Acabamento
        </button>
      </div>

      <Table columns={columns} data={acabamentos} loading={loading} />

      <Modal isOpen={isModalOpen} title={editingId ? 'Editar Acabamento' : 'Novo Acabamento'} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Tipo</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            >
              {tiposAcabamento.map(tipo => (
                <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nome da Opção</label>
            <input
              type="text"
              value={formData.nomeDaOpcao}
              onChange={(e) => setFormData({ ...formData, nomeDaOpcao: e.target.value })}
              placeholder="Ex: Linho Cinza, Madeira Jatoba, Esquerda"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Ativa</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium"
            >
              {editingId ? 'Atualizar' : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
