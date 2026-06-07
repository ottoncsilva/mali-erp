'use client';

import { useState, useEffect, useRef } from 'react';
import { Deposito } from '@/types';
import { useCollection, useAddDocument, useUpdateDocument, useDeleteDocument } from '@/lib/hooks';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import { Warehouse, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';

const DEPOSITOS_INICIAIS = [
  { nome: 'Showroom', endereco: '', cidade: '', responsavel: '' },
  { nome: 'Depósito', endereco: '', cidade: '', responsavel: '' },
  { nome: 'Demonstração', endereco: '', cidade: '', responsavel: '' },
];

interface FormDeposito {
  nome: string;
  endereco: string;
  cidade: string;
  responsavel: string;
}

function DepositosContent() {
  const { data: depositos, loading } = useCollection<Deposito>('depositos');
  const [seeding, setSeeding] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [formData, setFormData] = useState<FormDeposito>({
    nome: '',
    endereco: '',
    cidade: '',
    responsavel: '',
  });

  const { add, loading: adding } = useAddDocument('depositos');
  const { update, loading: updating } = useUpdateDocument('depositos');
  const { remove: deleteDeposito, loading: deleting } = useDeleteDocument('depositos');
  const seedingRef = useRef(false);

  // Cria os depósitos iniciais automaticamente se a coleção estiver vazia.
  useEffect(() => {
    if (loading || seedingRef.current) return;
    if (depositos && depositos.length === 0) {
      seedingRef.current = true;
      (async () => {
        try {
          for (const dep of DEPOSITOS_INICIAIS) {
            await add({ ...dep, ativo: true });
          }
        } catch (err) {
          console.error('Erro ao criar depósitos iniciais:', err);
        } finally {
          setSeeding(false);
        }
      })();
    } else {
      setSeeding(false);
    }
  }, [loading, depositos, add]);

  const abrirNovo = () => {
    setEditingId(null);
    setFormData({ nome: '', endereco: '', cidade: '', responsavel: '' });
    setErro('');
    setModalOpen(true);
  };

  const abrirEdicao = (deposito: Deposito & { id: string }) => {
    setEditingId(deposito.id);
    setFormData({
      nome: deposito.nome,
      endereco: deposito.endereco || '',
      cidade: deposito.cidade || '',
      responsavel: deposito.responsavel || '',
    });
    setErro('');
    setModalOpen(true);
  };

  const salvar = async () => {
    setErro('');
    if (!formData.nome.trim()) {
      setErro('Nome do depósito é obrigatório');
      return;
    }
    setSalvando(true);
    try {
      if (editingId) {
        await update(editingId, { ...formData });
      } else {
        await add({ ...formData, ativo: true });
      }
      setModalOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (deposito: Deposito & { id: string }) => {
    if (!confirm(`Excluir o depósito "${deposito.nome}"?`)) return;
    try {
      await deleteDeposito(deposito.id);
    } catch (err) {
      alert('Erro ao excluir: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const columns = [
    {
      header: 'Nome',
      accessor: 'nome',
      render: (nome: string) => <p className="font-semibold text-foreground">{nome}</p>,
    },
    {
      header: 'Endereço',
      accessor: 'endereco',
      render: (endereco: string) => <p className="text-sm text-muted-foreground">{endereco || '-'}</p>,
    },
    {
      header: 'Cidade',
      accessor: 'cidade',
      render: (cidade: string) => <p className="text-sm text-muted-foreground">{cidade || '-'}</p>,
    },
    {
      header: 'Responsável',
      accessor: 'responsavel',
      render: (responsavel: string) => <p className="text-sm text-muted-foreground">{responsavel || '-'}</p>,
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (_: string, row: Deposito & { id: string }) => (
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
            <Warehouse className="w-8 h-8" />
            Depósitos
          </h1>
          <p className="text-muted-foreground mt-2">Gerencie os locais físicos de armazenamento de produtos</p>
        </div>
        <button
          onClick={abrirNovo}
          className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Novo Depósito
        </button>
      </div>

      {loading || seeding ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : (
        <Table columns={columns} data={depositos} emptyMessage="Nenhum depósito cadastrado" />
      )}

      <Modal isOpen={modalOpen} title={editingId ? 'Editar Depósito' : 'Novo Depósito'} onClose={() => setModalOpen(false)} size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              placeholder="Ex: Showroom, Depósito Principal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Endereço</label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                placeholder="Rua, número"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Cidade</label>
              <input
                type="text"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                placeholder="São Paulo"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Responsável</label>
            <input
              type="text"
              value={formData.responsavel}
              onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              placeholder="Nome do responsável"
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
              className="px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {salvando ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
              Salvar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function DepositosPage() {
  return (
    <ProtegerPagina permissao="estoque.acessar">
      <DepositosContent />
    </ProtegerPagina>
  );
}
