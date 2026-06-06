'use client';

import { useState } from 'react';
import { useCollection, useAddDocument, useUpdateDocument, useDeleteDocument } from '@/lib/hooks';
import { Fornecedor } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function FornecedoresPage() {
  const { data: fornecedores, loading } = useCollection<Fornecedor>('fornecedores');
  const { add: addFornecedor } = useAddDocument('fornecedores');
  const { update: updateFornecedor } = useUpdateDocument('fornecedores');
  const { remove: deleteFornecedor } = useDeleteDocument('fornecedores');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    razaoSocial: '',
    cnpj: '',
    contatos: [''],
    endereco: '',
    observacoes: '',
    prazoEntregaDias: 7,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateFornecedor(editingId, formData);
      } else {
        await addFornecedor(formData);
      }
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      razaoSocial: '',
      cnpj: '',
      contatos: [''],
      endereco: '',
      observacoes: '',
      prazoEntregaDias: 7,
    });
    setEditingId(null);
  };

  const handleEdit = (fornecedor: Fornecedor & { id: string }) => {
    setFormData({ ...fornecedor });
    setEditingId(fornecedor.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar?')) {
      try {
        await deleteFornecedor(id);
      } catch (err) {
        console.error('Erro:', err);
      }
    }
  };

  const columns = [
    { header: 'Razão Social', accessor: 'razaoSocial', width: '30%' },
    { header: 'CNPJ', accessor: 'cnpj', width: '20%' },
    {
      header: 'Contato',
      accessor: 'contatos',
      render: (contatos: string[]) => contatos?.[0] || '-',
    },
    {
      header: 'Prazo (dias)',
      accessor: 'prazoEntregaDias',
      render: (dias: number) => `${dias}d`,
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (id: string, row: Fornecedor & { id: string }) => (
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
          <h1 className="text-3xl font-bold text-foreground">Fornecedores</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus fornecedores</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </button>
      </div>

      <Table columns={columns} data={fornecedores} loading={loading} />

      <Modal isOpen={isModalOpen} title={editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'} onClose={() => setIsModalOpen(false)} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Razão Social</label>
              <input
                type="text"
                value={formData.razaoSocial}
                onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">CNPJ</label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Endereço</label>
            <input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Contatos (principais)</label>
            <input
              type="text"
              value={formData.contatos?.[0] || ''}
              onChange={(e) => setFormData({ ...formData, contatos: [e.target.value] })}
              placeholder="Email, telefone, etc"
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Prazo de Entrega (dias)</label>
            <input
              type="number"
              value={formData.prazoEntregaDias}
              onChange={(e) => setFormData({ ...formData, prazoEntregaDias: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              rows={3}
            />
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
