'use client';

import { useState } from 'react';
import { useCollection, useAddDocument, useUpdateDocument, useDeleteDocument } from '@/lib/hooks';
import { Cliente } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function ClientesPage() {
  const { data: clientes, loading } = useCollection<Cliente>('clientes');
  const { add: addCliente } = useAddDocument('clientes');
  const { update: updateCliente } = useUpdateDocument('clientes');
  const { remove: deleteCliente } = useDeleteDocument('clientes');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    nome: string;
    cpfCnpj: string;
    telefoneWhatsapp: string;
    endereco: string;
    enderecoEntrega: string;
    classificacao: 'novo' | 'recorrente' | 'vip';
  }>({
    nome: '',
    cpfCnpj: '',
    telefoneWhatsapp: '',
    endereco: '',
    enderecoEntrega: '',
    classificacao: 'novo',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCliente(editingId, formData);
      } else {
        await addCliente(formData);
      }
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cpfCnpj: '',
      telefoneWhatsapp: '',
      endereco: '',
      enderecoEntrega: '',
      classificacao: 'novo',
    });
    setEditingId(null);
  };

  const handleEdit = (cliente: Cliente & { id: string }) => {
    setFormData({
      nome: cliente.nome,
      cpfCnpj: cliente.cpfCnpj,
      telefoneWhatsapp: cliente.telefoneWhatsapp,
      endereco: cliente.endereco,
      enderecoEntrega: cliente.enderecoEntrega || '',
      classificacao: cliente.classificacao,
    });
    setEditingId(cliente.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este cliente?')) {
      try {
        await deleteCliente(id);
      } catch (err) {
        console.error('Erro:', err);
      }
    }
  };

  const columns = [
    { header: 'Nome', accessor: 'nome', width: '30%' },
    { header: 'Telefone', accessor: 'telefoneWhatsapp', width: '20%' },
    { header: 'CPF/CNPJ', accessor: 'cpfCnpj', width: '20%' },
    {
      header: 'Classificação',
      accessor: 'classificacao',
      render: (classificacao: string) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            classificacao === 'vip'
              ? 'bg-yellow-500/20 text-yellow-600'
              : classificacao === 'recorrente'
              ? 'bg-emerald-500/20 text-emerald-600'
              : 'bg-blue-500/20 text-blue-600'
          }`}
        >
          {classificacao === 'vip' ? 'VIP' : classificacao === 'recorrente' ? 'Recorrente' : 'Novo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (id: string, row: Cliente & { id: string }) => (
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
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-2">Gerencie sua carteira de clientes</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <Table columns={columns} data={clientes} loading={loading} />

      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Editar Cliente' : 'Novo Cliente'}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-foreground mb-2">
                CPF/CNPJ
              </label>
              <input
                type="text"
                value={formData.cpfCnpj}
                onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                WhatsApp
              </label>
              <input
                type="tel"
                value={formData.telefoneWhatsapp}
                onChange={(e) => setFormData({ ...formData, telefoneWhatsapp: e.target.value })}
                placeholder="11999999999"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Classificação
              </label>
              <select
                value={formData.classificacao}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    classificacao: e.target.value as 'novo' | 'recorrente' | 'vip',
                  })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                <option value="novo">Novo</option>
                <option value="recorrente">Recorrente</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Endereço</label>
            <input
              type="text"
              value={formData.endereco}
              onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Endereço de Entrega (opcional)
            </label>
            <input
              type="text"
              value={formData.enderecoEntrega}
              onChange={(e) => setFormData({ ...formData, enderecoEntrega: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium"
            >
              {editingId ? 'Atualizar' : 'Criar'} Cliente
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
