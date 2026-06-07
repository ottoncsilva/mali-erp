'use client';

import { useState, useEffect, useRef } from 'react';
import { Deposito } from '@/types';
import { useCollection, useAddDocument, useUpdateDocument } from '@/lib/hooks';
import { X, Plus, Edit2, Warehouse } from 'lucide-react';

interface DepositosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Depósitos iniciais criados automaticamente na primeira abertura
// (caso a coleção esteja vazia).
const DEPOSITOS_INICIAIS = [
  { nome: 'Showroom', endereco: '', cidade: '', responsavel: '' },
  { nome: 'Depósito', endereco: '', cidade: '', responsavel: '' },
  { nome: 'Demonstração', endereco: '', cidade: '', responsavel: '' },
];

export function DepositosModal({ isOpen, onClose }: DepositosModalProps) {
  const { data: depositos, loading } = useCollection<Deposito>('depositos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    cidade: '',
    responsavel: '',
  });

  const { add, loading: adding } = useAddDocument('depositos');
  const { update, loading: updating } = useUpdateDocument('depositos');
  const seedingRef = useRef(false);

  // Cria os depósitos iniciais automaticamente se a coleção estiver vazia.
  useEffect(() => {
    if (!isOpen || loading || seedingRef.current) return;
    if (depositos && depositos.length === 0) {
      seedingRef.current = true;
      (async () => {
        try {
          for (const dep of DEPOSITOS_INICIAIS) {
            await add({ ...dep, ativo: true });
          }
        } catch (err) {
          console.error('Erro ao criar depósitos iniciais:', err);
          seedingRef.current = false;
        }
      })();
    }
  }, [isOpen, loading, depositos, add]);

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setShowForm(false);
      setFormData({ nome: '', endereco: '', cidade: '', responsavel: '' });
    }
  }, [isOpen]);

  const handleNovo = () => {
    setEditingId(null);
    setFormData({ nome: '', endereco: '', cidade: '', responsavel: '' });
    setShowForm(true);
  };

  const handleEdit = (deposito: Deposito & { id: string }) => {
    setEditingId(deposito.id);
    setFormData({
      nome: deposito.nome,
      endereco: deposito.endereco || '',
      cidade: deposito.cidade || '',
      responsavel: deposito.responsavel || '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      alert('Nome do depósito é obrigatório');
      return;
    }

    try {
      if (editingId) {
        await update(editingId, { ...formData });
      } else {
        await add({ ...formData, ativo: true });
      }
      setEditingId(null);
      setShowForm(false);
      setFormData({ nome: '', endereco: '', cidade: '', responsavel: '' });
    } catch (error) {
      console.error('Erro ao salvar depósito:', error);
      alert('Erro ao salvar depósito');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setShowForm(false);
    setFormData({ nome: '', endereco: '', cidade: '', responsavel: '' });
  };

  if (!isOpen) return null;

  const lista = (depositos as (Deposito & { id: string })[]) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-mali-primary" />
            <h2 className="text-xl font-semibold text-foreground">Depósitos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Barra de ação */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {lista.length} {lista.length === 1 ? 'depósito cadastrado' : 'depósitos cadastrados'}
            </p>
            {!showForm && (
              <button
                onClick={handleNovo}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-md hover:shadow-lg transition-all font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar Depósito
              </button>
            )}
          </div>

          {/* Formulário (aparece ao clicar em Adicionar/Editar) */}
          {showForm && (
            <div className="bg-background rounded-lg border border-mali-primary/40 p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {editingId ? 'Editar Depósito' : 'Novo Depósito'}
              </h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nome do Depósito *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Depósito Principal, Showroom"
                  autoFocus
                  className="w-full px-4 py-2 bg-card border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Endereço</label>
                  <input
                    type="text"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Ex: Rua A, 123"
                    className="w-full px-4 py-2 bg-card border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Cidade</label>
                  <input
                    type="text"
                    value={formData.cidade}
                    onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    placeholder="Ex: São Paulo"
                    className="w-full px-4 py-2 bg-card border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Responsável
                </label>
                <input
                  type="text"
                  value={formData.responsavel}
                  onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                  placeholder="Nome do responsável pelo depósito"
                  className="w-full px-4 py-2 bg-card border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={adding || updating}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-md hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                >
                  {editingId ? 'Salvar Alterações' : 'Criar Depósito'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 bg-card border border-border text-foreground rounded-md hover:bg-background transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de depósitos */}
          <div>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : lista.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Preparando depósitos iniciais...
              </div>
            ) : (
              <div className="space-y-3">
                {lista.map((deposito) => (
                  <div
                    key={deposito.id}
                    className="p-4 bg-background rounded-lg border border-border flex items-start justify-between hover:border-mali-primary/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-mali-primary/10 rounded-md">
                        <Warehouse className="w-4 h-4 text-mali-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{deposito.nome}</h4>
                          {!deposito.ativo && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                        {deposito.endereco && (
                          <p className="text-sm text-muted-foreground">
                            {deposito.endereco}
                            {deposito.cidade && ` - ${deposito.cidade}`}
                          </p>
                        )}
                        {deposito.responsavel && (
                          <p className="text-sm text-muted-foreground">
                            Responsável: {deposito.responsavel}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleEdit(deposito)}
                      className="p-2 hover:bg-card rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground hover:text-mali-primary" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-6 bg-background sticky bottom-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-card border border-border text-foreground rounded-md hover:bg-background transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
