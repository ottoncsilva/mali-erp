'use client';

import { useState } from 'react';
import { useCollection, useAddDocument, useUpdateDocument, useDeleteDocument } from '@/lib/hooks';
import { Especificador } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import {
  mascaraCEP,
  mascaraTelefone,
  mascaraCpfCnpj,
  buscarCEP,
} from '@/lib/utils/format';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';

const enderecoVazio = {
  cep: '',
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
};

const formVazio = {
  nome: '',
  email: '',
  telefone: '',
  cpfCnpj: '',
  pix: '',
  comissao: 10,
  ativo: true,
  endereco: { ...enderecoVazio },
};

export default function EspecificadoresPage() {
  const { data: especificadores, loading } = useCollection<Especificador>('especificadores');
  const { add } = useAddDocument('especificadores');
  const { update } = useUpdateDocument('especificadores');
  const { remove } = useDeleteDocument('especificadores');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [formData, setFormData] = useState<typeof formVazio>({ ...formVazio });

  const resetForm = () => {
    setFormData({ ...formVazio, endereco: { ...enderecoVazio } });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        comissao: Math.max(0, Math.min(99.9, formData.comissao || 0)),
        atualizadoEm: new Date(),
      };
      if (editingId) {
        await update(editingId, payload);
      } else {
        await add({ ...payload, criadoEm: new Date() });
      }
      resetForm();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao salvar especificador');
    }
  };

  const handleEdit = (e: Especificador & { id: string }) => {
    setFormData({
      nome: e.nome || '',
      email: e.email || '',
      telefone: e.telefone || '',
      cpfCnpj: e.cpfCnpj || '',
      pix: e.pix || '',
      comissao: e.comissao ?? 10,
      ativo: e.ativo ?? true,
      endereco: { ...enderecoVazio, ...(e.endereco || {}) },
    });
    setEditingId(e.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este especificador?')) {
      try {
        await remove(id);
      } catch (err) {
        console.error('Erro:', err);
      }
    }
  };

  const handleCepBlur = async () => {
    const cep = formData.endereco.cep;
    if (cep.replace(/\D/g, '').length !== 8) return;
    setBuscandoCep(true);
    try {
      const r = await buscarCEP(cep);
      if (r) {
        setFormData((prev) => ({
          ...prev,
          endereco: {
            ...prev.endereco,
            rua: r.rua || prev.endereco.rua,
            bairro: r.bairro || prev.endereco.bairro,
            cidade: r.cidade || prev.endereco.cidade,
            uf: r.uf || prev.endereco.uf,
          },
        }));
      }
    } finally {
      setBuscandoCep(false);
    }
  };

  const setEnd = (campo: string, valor: string) =>
    setFormData((prev) => ({ ...prev, endereco: { ...prev.endereco, [campo]: valor } }));

  const columns = [
    { header: 'Nome', accessor: 'nome', width: '25%' },
    { header: 'E-mail', accessor: 'email', width: '20%' },
    {
      header: 'Telefone',
      accessor: 'telefone',
      render: (v: string) => v || '-',
    },
    {
      header: 'Comissão',
      accessor: 'comissao',
      render: (v: number) => <span className="font-semibold text-mali-primary">{(v ?? 0).toFixed(1)}%</span>,
    },
    {
      header: 'Status',
      accessor: 'ativo',
      render: (ativo: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            ativo ? 'bg-emerald-500/20 text-emerald-600' : 'bg-gray-200 text-gray-500'
          }`}
        >
          {ativo ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (id: string, row: Especificador & { id: string }) => (
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

  const inputCls =
    'w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Especificadores</h1>
          <p className="text-muted-foreground mt-2">
            Indicadores que recebem comissão sobre as vendas
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Especificador
        </button>
      </div>

      <Table columns={columns} data={especificadores} loading={loading} />

      <Modal
        isOpen={isModalOpen}
        title={editingId ? 'Editar Especificador' : 'Novo Especificador'}
        onClose={() => setIsModalOpen(false)}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputCls}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: mascaraTelefone(e.target.value) })}
                placeholder="(11) 99999-9999"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">CPF/CNPJ</label>
              <input
                type="text"
                value={formData.cpfCnpj}
                onChange={(e) => setFormData({ ...formData, cpfCnpj: mascaraCpfCnpj(e.target.value) })}
                placeholder="000.000.000-00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Comissão (%)</label>
              <input
                type="number"
                value={formData.comissao}
                onChange={(e) => setFormData({ ...formData, comissao: parseFloat(e.target.value) || 0 })}
                step="0.5"
                min="0"
                max="99"
                className={inputCls}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">PIX</label>
            <input
              type="text"
              value={formData.pix}
              onChange={(e) => setFormData({ ...formData, pix: e.target.value })}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              className={inputCls}
            />
          </div>

          {/* Endereço */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-foreground mb-2">
                  CEP {buscandoCep && <Loader2 className="w-3 h-3 inline animate-spin" />}
                </label>
                <input
                  type="text"
                  value={formData.endereco.cep}
                  onChange={(e) => setEnd('cep', mascaraCEP(e.target.value))}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  className={inputCls}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Rua</label>
                <input
                  type="text"
                  value={formData.endereco.rua}
                  onChange={(e) => setEnd('rua', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Número</label>
                <input
                  type="text"
                  value={formData.endereco.numero}
                  onChange={(e) => setEnd('numero', e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Complemento</label>
                <input
                  type="text"
                  value={formData.endereco.complemento}
                  onChange={(e) => setEnd('complemento', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Bairro</label>
                <input
                  type="text"
                  value={formData.endereco.bairro}
                  onChange={(e) => setEnd('bairro', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
                <input
                  type="text"
                  value={formData.endereco.cidade}
                  onChange={(e) => setEnd('cidade', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">UF</label>
                <input
                  type="text"
                  value={formData.endereco.uf}
                  onChange={(e) => setEnd('uf', e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={formData.ativo}
              onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
              className="w-4 h-4 accent-mali-primary"
            />
            <span className="text-foreground">Ativo</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium"
            >
              {editingId ? 'Atualizar' : 'Criar'} Especificador
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
