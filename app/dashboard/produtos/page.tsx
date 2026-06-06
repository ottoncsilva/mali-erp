'use client';

import { useState, useRef } from 'react';
import { useCollection, useAddDocument, useUpdateDocument, useDeleteDocument, useStorageUpload } from '@/lib/hooks';
import { Produto, Categoria, Fornecedor, VariavelAcabamento } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Plus, Edit2, Trash2, X, Upload, ChevronDown } from 'lucide-react';

export default function ProdutosPage() {
  const { data: produtos, loading: produtosLoading } = useCollection<Produto>('produtos');
  const { data: categorias } = useCollection<Categoria>('categorias');
  const { data: fornecedores } = useCollection<Fornecedor>('fornecedores');
  const { data: acabamentos } = useCollection<VariavelAcabamento>('variaveis_acabamento');

  const { add: addProduto } = useAddDocument('produtos');
  const { update: updateProduto } = useUpdateDocument('produtos');
  const { remove: deleteProduto } = useDeleteDocument('produtos');
  const { uploadFile } = useStorageUpload();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    nome: '',
    sku: '',
    categoriaId: '',
    fornecedorId: '',
    acabamentosDisponiveis: [] as string[],
    fotoPrincipal: '',
    custoProduto: 0,
    icms: 0,
    ipi: 0,
    frete: 0,
    tipoPontuacao: 'padrao' as 'padrao' | 'especial',
    pontuacaoEspecial: 2.0,
    estoqueMinimo: 5,
    estoqueAtual: 0,
    status: 'ativo' as 'ativo' | 'inativo' | 'esgotado',
  });

  // Calcular CMV em tempo real
  const cmv = formData.custoProduto + formData.icms + formData.ipi + formData.frete;

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    setUploadingFoto(true);
    try {
      const file = e.target.files[0];
      const fileName = `${Date.now()}-${file.name}`;
      const path = `produtos/${editingId || 'novo'}/${fileName}`;
      const url = await uploadFile(file, path);

      setFotos([...fotos, url]);
      if (fotos.length === 0) {
        setFormData({ ...formData, fotoPrincipal: url });
      }
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFoto = (index: number) => {
    const newFotos = fotos.filter((_, i) => i !== index);
    setFotos(newFotos);
    if (formData.fotoPrincipal === fotos[index] && newFotos.length > 0) {
      setFormData({ ...formData, fotoPrincipal: newFotos[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = { ...formData, fotos };
      if (editingId) {
        await updateProduto(editingId, data);
      } else {
        await addProduto(data);
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
      sku: '',
      categoriaId: '',
      fornecedorId: '',
      acabamentosDisponiveis: [],
      fotoPrincipal: '',
      custoProduto: 0,
      icms: 0,
      ipi: 0,
      frete: 0,
      tipoPontuacao: 'padrao',
      pontuacaoEspecial: 2.0,
      estoqueMinimo: 5,
      estoqueAtual: 0,
      status: 'ativo',
    });
    setFotos([]);
    setEditingId(null);
  };

  const handleEdit = (produto: Produto & { id: string }) => {
    setFormData({ ...produto, pontuacaoEspecial: produto.pontuacaoEspecial ?? 2.0 });
    setFotos(produto.fotos || []);
    setEditingId(produto.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      try {
        await deleteProduto(id);
      } catch (err) {
        console.error('Erro:', err);
      }
    }
  };

  const columns = [
    {
      header: 'Produto',
      accessor: 'nome',
      width: '25%',
      render: (nome: string, row: Produto) => (
        <div className="flex items-center gap-3">
          {row.fotoPrincipal && (
            <img src={row.fotoPrincipal} alt={nome} className="w-10 h-10 rounded object-cover" />
          )}
          <div>
            <p className="font-medium text-foreground">{nome}</p>
            <p className="text-xs text-muted-foreground">{row.sku}</p>
          </div>
        </div>
      ),
    },
    { header: 'Estoque', accessor: 'estoqueAtual', render: (estoque: number) => `${estoque} un` },
    {
      header: 'CMV',
      accessor: 'custoProduto',
      render: (_: string, row: Produto) => `R$ ${((row.custoProduto + row.icms + row.ipi + row.frete) || 0).toFixed(2)}`,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (status: string) => (
        <span className={`px-2 py-1 rounded text-xs font-medium ${status === 'ativo' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-orange-500/20 text-orange-600'}`}>
          {status === 'ativo' ? 'Ativo' : status === 'inativo' ? 'Inativo' : 'Esgotado'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'id',
      render: (id: string, row: Produto & { id: string }) => (
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
          <h1 className="text-3xl font-bold text-foreground">Produtos</h1>
          <p className="text-muted-foreground mt-2">Gestão do catálogo de produtos e estoque</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-lg hover:shadow-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      <Table columns={columns} data={produtos} loading={produtosLoading} />

      <Modal isOpen={isModalOpen} title={editingId ? 'Editar Produto' : 'Novo Produto'} onClose={() => setIsModalOpen(false)} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Informações Básicas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome do Produto</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">SKU</label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Categoria</label>
                <select
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({ ...formData, categoriaId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fornecedor</label>
                <select
                  value={formData.fornecedorId}
                  onChange={(e) => setFormData({ ...formData, fornecedorId: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  required
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map(forn => (
                    <option key={forn.id} value={forn.id}>{forn.razaoSocial}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Acabamentos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Acabamentos Disponíveis</h3>
            <div className="grid grid-cols-3 gap-2 p-3 bg-background rounded-md border border-border max-h-32 overflow-y-auto">
              {acabamentos.map(acabamento => (
                <label key={acabamento.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.acabamentosDisponiveis.includes(acabamento.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          acabamentosDisponiveis: [...formData.acabamentosDisponiveis, acabamento.id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          acabamentosDisponiveis: formData.acabamentosDisponiveis.filter(id => id !== acabamento.id)
                        });
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-foreground">{acabamento.nomeDaOpcao}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fotos */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Fotos do Produto</h3>
            <div className="flex gap-2 mb-4">
              {fotos.map((foto, idx) => (
                <div key={idx} className="relative">
                  <img src={foto} alt={`Foto ${idx + 1}`} className="w-16 h-16 rounded object-cover border-2 border-mali-primary" />
                  <button
                    type="button"
                    onClick={() => handleRemoveFoto(idx)}
                    className="absolute -top-2 -right-2 bg-destructive rounded-full p-1"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFoto}
              className="flex items-center gap-2 px-3 py-2 border border-dashed border-mali-primary rounded-md text-mali-primary hover:bg-mali-primary/5 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploadingFoto ? 'Enviando...' : 'Adicionar Foto'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFotoUpload}
              className="hidden"
            />
          </div>

          {/* Precificação */}
          <div className="space-y-4 p-4 bg-background rounded-md border border-border">
            <h3 className="font-semibold text-foreground">Precificação & Custo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Custo do Produto (R$)</label>
                <input
                  type="number"
                  value={formData.custoProduto}
                  onChange={(e) => setFormData({ ...formData, custoProduto: parseFloat(e.target.value) })}
                  step="0.01"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ICMS (R$)</label>
                <input
                  type="number"
                  value={formData.icms}
                  onChange={(e) => setFormData({ ...formData, icms: parseFloat(e.target.value) })}
                  step="0.01"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">IPI (R$)</label>
                <input
                  type="number"
                  value={formData.ipi}
                  onChange={(e) => setFormData({ ...formData, ipi: parseFloat(e.target.value) })}
                  step="0.01"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Frete (R$)</label>
                <input
                  type="number"
                  value={formData.frete}
                  onChange={(e) => setFormData({ ...formData, frete: parseFloat(e.target.value) })}
                  step="0.01"
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                />
              </div>
            </div>
            <div className="p-3 bg-mali-primary/10 border border-mali-primary rounded-md">
              <p className="text-sm text-mali-primary font-semibold">CMV (Custo da Mercadoria Vendida): R$ {cmv.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Tipo de Pontuação</label>
                <select
                  value={formData.tipoPontuacao}
                  onChange={(e) => setFormData({ ...formData, tipoPontuacao: e.target.value as any })}
                  className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                >
                  <option value="padrao">Padrão (Global)</option>
                  <option value="especial">Especial (Customizada)</option>
                </select>
              </div>
              {formData.tipoPontuacao === 'especial' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Pontuação Especial</label>
                  <input
                    type="number"
                    value={formData.pontuacaoEspecial}
                    onChange={(e) => setFormData({ ...formData, pontuacaoEspecial: parseFloat(e.target.value) })}
                    step="0.1"
                    min="1"
                    className="w-full px-3 py-2 bg-card border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Estoque */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Estoque</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Estoque Mínimo</label>
                <input
                  type="number"
                  value={formData.estoqueMinimo}
                  onChange={(e) => setFormData({ ...formData, estoqueMinimo: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Estoque Atual</label>
                <input
                  type="number"
                  value={formData.estoqueAtual}
                  onChange={(e) => setFormData({ ...formData, estoqueAtual: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="esgotado">Esgotado</option>
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium"
            >
              {editingId ? 'Atualizar Produto' : 'Criar Produto'}
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
