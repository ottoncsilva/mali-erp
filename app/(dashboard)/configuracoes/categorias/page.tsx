'use client';

import { useState } from 'react';
import { useCollection, useAddDocument, useUpdateDocument, useDeleteDocument } from '@/lib/hooks';
import { Categoria } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function CategoriasPage() {
  const { data: categorias, loading } = useCollection<Categoria>('categorias');
  const { add: addCategoria } = useAddDocument('categorias');
  const { update: updateCategoria } = useUpdateDocument('categorias');
  const { remove: deleteCategoria } = useDeleteDocument('categorias');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', ativo: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCategoria(editingId, formData);
      } else {
        await addCategoria(formData);
      }
      setFormData({ nome: '', descricao: '', ativo: true });
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const handleEdit = (categoria: Categoria & { id: string }) => {
    setFormData({ nome: categoria.nome, descricao: categoria.descricao, ativo: categoria.ativo });
    setEditingId(categoria.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar?')) {
      try {
        await deleteCategoria(id);
      } catch (err) {
        console.error('Erro:', err);
      }
    }
  };

  const handleOpenModal = () => {
    setFormData({ nome: '', descricao: '', ativo: true });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Nome', accessor: 'nome', width: '40%' },
    { header: 'Descrição', accessor: 'descricao', width: '40%' },
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
      render: (id: string, row: Categoria & { id: string }) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-1 hover:bg-background rounded transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4 text-mali-primary" />
          </button>
          <button
            onClick={() => handleDelete(id)}
            className="p-1 hover:bg-background rounded transition-colors"
            title="Deletar"
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
          <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground mt-2">Gerencie as categorias de produtos</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      <Table columns={columns} data={categorias} loading={loading} />

      <Modal isOpen={isModalOpen} title={editingId ? 'Editar Categoria' : 'Nova Categoria'} onClose={() => setIsModalOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              rows={3}
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
