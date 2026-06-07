'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  useCollection,
  useUpdateDocument,
  useStorageUpload,
} from '@/lib/hooks';
import {
  Produto,
  Categoria,
  Fornecedor,
  EstoqueItem,
  MovimentacaoEstoque,
  NotaFiscal,
  LOCALIZACOES,
  LOCALIZACOES_DISPONIVEIS,
  LocalizacaoEstoque,
} from '@/types';
import { formatBRL, formatData } from '@/lib/utils/format';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  X,
  Upload,
  Package,
  DollarSign,
  Boxes,
  AlertTriangle,
  Save,
  TrendingUp,
  History,
} from 'lucide-react';

interface ProdutoDetailModalProps {
  produtoId: string | null;
  isOpen: boolean;
  onClose: () => void;
  // 'view' = somente leitura; 'edit' = edição completa
  mode?: 'view' | 'edit';
}

type Aba = 'info' | 'precificacao' | 'estoque';

const ABAS: Array<{ id: Aba; label: string; icon: React.ReactNode }> = [
  { id: 'info', label: 'Informações Básicas', icon: <Package className="w-4 h-4" /> },
  { id: 'precificacao', label: 'Precificação', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'estoque', label: 'Estoque', icon: <Boxes className="w-4 h-4" /> },
];

const LOCAIS = Object.keys(LOCALIZACOES) as LocalizacaoEstoque[];

export function ProdutoDetailModal({
  produtoId,
  isOpen,
  onClose,
  mode = 'edit',
}: ProdutoDetailModalProps) {
  const { data: produtos } = useCollection<Produto>('produtos');
  const { data: categorias } = useCollection<Categoria>('categorias');
  const { data: fornecedores } = useCollection<Fornecedor>('fornecedores');
  const { data: estoque } = useCollection<EstoqueItem>('estoque');
  const { data: movimentacoes } = useCollection<MovimentacaoEstoque>('movimentacoes_estoque');
  const { data: notasFiscais } = useCollection<NotaFiscal>('notas_fiscais');

  const { update: updateProduto, loading: salvando } = useUpdateDocument('produtos');
  const { uploadFile } = useStorageUpload();

  const [pontuacaoPadrao, setPontuacaoPadrao] = useState(2.0);
  const [aba, setAba] = useState<Aba>('info');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);

  const podeEditar = mode === 'edit';

  const produto = useMemo(
    () => (produtos as (Produto & { id: string })[]).find((p) => p.id === produtoId),
    [produtos, produtoId]
  );

  const [form, setForm] = useState({
    nome: '',
    sku: '',
    categoriaId: '',
    fornecedorId: '',
    fotoPrincipal: '',
    custoProduto: 0,
    icms: 0,
    ipi: 0,
    frete: 0,
    tipoPontuacao: 'padrao' as 'padrao' | 'especial',
    pontuacaoEspecial: 2.0,
    estoqueMinimo: 5,
    status: 'ativo' as 'ativo' | 'inativo' | 'esgotado',
  });

  // Carrega dados do produto no formulário ao abrir
  useEffect(() => {
    if (produto) {
      setForm({
        nome: produto.nome,
        sku: produto.sku,
        categoriaId: produto.categoriaId,
        fornecedorId: produto.fornecedorId,
        fotoPrincipal: produto.fotoPrincipal,
        custoProduto: produto.custoProduto,
        icms: produto.icms,
        ipi: produto.ipi,
        frete: produto.frete,
        tipoPontuacao: produto.tipoPontuacao,
        pontuacaoEspecial: produto.pontuacaoEspecial || 2.0,
        estoqueMinimo: produto.estoqueMinimo,
        status: produto.status,
      });
      setFotos(produto.fotos || []);
    }
  }, [produto]);

  useEffect(() => {
    if (isOpen) setAba('info');
  }, [isOpen]);

  // Carrega a pontuação padrão da loja (para calcular o preço à vista de tabela).
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'empresa', 'config'));
        if (snap.exists()) setPontuacaoPadrao(snap.data().pontuacaoPadrao || 2.0);
      } catch (err) {
        console.error('Erro ao carregar pontuação padrão:', err);
      }
    })();
  }, [isOpen]);

  const cmv = form.custoProduto + form.icms + form.ipi + form.frete;
  // Pontuação aplicável e preço à vista de tabela.
  const pontuacaoAplicada =
    form.tipoPontuacao === 'especial' ? form.pontuacaoEspecial || pontuacaoPadrao : pontuacaoPadrao;
  const precoVista = cmv * pontuacaoAplicada;

  // Estoque deste produto, agrupado por localização
  const saldosPorLocal = useMemo(() => {
    const itens = (estoque as (EstoqueItem & { id: string })[]).filter(
      (e) => e.produtoId === produtoId
    );
    return LOCAIS.reduce((acc, l) => {
      acc[l] = itens
        .filter((i) => i.localizacao === l)
        .reduce((s, i) => s + (i.quantidade || 0), 0);
      return acc;
    }, {} as Record<LocalizacaoEstoque, number>);
  }, [estoque, produtoId]);

  const totalDisponivel = LOCALIZACOES_DISPONIVEIS.reduce((s, l) => s + saldosPorLocal[l], 0);
  const totalGeral = LOCAIS.reduce((s, l) => s + saldosPorLocal[l], 0);
  const abaixoMinimo = totalDisponivel < form.estoqueMinimo;

  // Movimentações deste produto (ordenadas)
  const movimentacoesProduto = useMemo(() => {
    return (movimentacoes as (MovimentacaoEstoque & { id: string })[])
      .filter((m) => m.produtoId === produtoId)
      .sort((a, b) => toMillis(b.criadoEm) - toMillis(a.criadoEm));
  }, [movimentacoes, produtoId]);

  // Histórico de compras: itens de notas fiscais que contêm este produto
  const historicoCompras = useMemo(() => {
    const linhas: Array<{
      data: any;
      numeroNF: string;
      fornecedor: string;
      quantidade: number;
      custoUnitario: number;
      cmvUnitario: number;
    }> = [];
    (notasFiscais as (NotaFiscal & { id: string })[]).forEach((nf) => {
      nf.itens?.forEach((item) => {
        if (item.produtoId === produtoId) {
          linhas.push({
            data: nf.dataEntrada || nf.dataEmissao,
            numeroNF: nf.numero,
            fornecedor: nf.fornecedorNome,
            quantidade: item.quantidade,
            custoUnitario: item.custoUnitario,
            cmvUnitario: item.cmvUnitario,
          });
        }
      });
    });
    return linhas.sort((a, b) => toMillis(b.data) - toMillis(a.data));
  }, [notasFiscais, produtoId]);

  const handleFotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !produtoId) return;
    setUploadingFoto(true);
    try {
      const file = e.target.files[0];
      const path = `produtos/${produtoId}/${Date.now()}-${file.name}`;
      const url = await uploadFile(file, path);
      const novas = [...fotos, url];
      setFotos(novas);
      if (fotos.length === 0) setForm({ ...form, fotoPrincipal: url });
    } catch (err) {
      console.error('Erro no upload:', err);
    } finally {
      setUploadingFoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFoto = (index: number) => {
    const novas = fotos.filter((_, i) => i !== index);
    setFotos(novas);
    if (form.fotoPrincipal === fotos[index]) {
      setForm({ ...form, fotoPrincipal: novas[0] || '' });
    }
  };

  const handleSalvar = async () => {
    if (!produtoId) return;
    try {
      await updateProduto(produtoId, { ...form, fotos });
      alert('Produto atualizado com sucesso!');
      onClose();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar produto');
    }
  };

  if (!isOpen || !produtoId) return null;

  if (!produto) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-card rounded-lg border border-border p-8">
          <p className="text-muted-foreground">Carregando produto...</p>
        </div>
      </div>
    );
  }

  const inputCls =
    'w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-60 disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-lg border border-border shadow-xl w-full max-w-4xl my-8 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            {form.fotoPrincipal && (
              <img
                src={form.fotoPrincipal}
                alt={form.nome}
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">{form.nome || 'Produto'}</h2>
              <p className="text-xs text-muted-foreground">{form.sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-background rounded-md transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex gap-1 px-6 border-b border-border flex-shrink-0 overflow-x-auto">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                aba === a.id
                  ? 'border-mali-primary text-mali-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {a.icon}
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* ABA: Informações Básicas */}
          {aba === 'info' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
                  <input
                    type="text"
                    value={form.nome}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">SKU</label>
                  <input
                    type="text"
                    value={form.sku}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Categoria</label>
                  <select
                    value={form.categoriaId}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Selecione</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Fornecedor</label>
                  <select
                    value={form.fornecedorId}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, fornecedorId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Selecione</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.razaoSocial}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                  <select
                    value={form.status}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className={inputCls}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="esgotado">Esgotado</option>
                  </select>
                </div>
              </div>

              {/* Fotos */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Fotos</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {fotos.map((foto, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={foto}
                        alt={`Foto ${idx + 1}`}
                        className={`w-20 h-20 rounded object-cover border-2 ${
                          form.fotoPrincipal === foto ? 'border-mali-primary' : 'border-border'
                        }`}
                      />
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(idx)}
                          className="absolute -top-2 -right-2 bg-destructive rounded-full p-1"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      )}
                    </div>
                  ))}
                  {fotos.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma foto cadastrada</p>
                  )}
                </div>
                {podeEditar && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFoto}
                      className="flex items-center gap-2 px-3 py-2 border border-dashed border-mali-primary rounded-md text-mali-primary hover:bg-mali-primary/5 disabled:opacity-50 text-sm"
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
                  </>
                )}
              </div>
            </div>
          )}

          {/* ABA: Precificação */}
          {aba === 'precificacao' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <CampoMoeda
                  label="Custo (R$)"
                  value={form.custoProduto}
                  disabled={!podeEditar}
                  onChange={(v) => setForm({ ...form, custoProduto: v })}
                />
                <CampoMoeda
                  label="ICMS (R$)"
                  value={form.icms}
                  disabled={!podeEditar}
                  onChange={(v) => setForm({ ...form, icms: v })}
                />
                <CampoMoeda
                  label="IPI (R$)"
                  value={form.ipi}
                  disabled={!podeEditar}
                  onChange={(v) => setForm({ ...form, ipi: v })}
                />
                <CampoMoeda
                  label="Frete (R$)"
                  value={form.frete}
                  disabled={!podeEditar}
                  onChange={(v) => setForm({ ...form, frete: v })}
                />
              </div>

              <div className="p-4 bg-mali-primary/10 border border-mali-primary rounded-md flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">CMV (Custo da Mercadoria Vendida)</span>
                <span className="text-lg font-bold text-mali-primary">{formatBRL(cmv)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tipo de Pontuação</label>
                  <select
                    value={form.tipoPontuacao}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, tipoPontuacao: e.target.value as any })}
                    className={inputCls}
                  >
                    <option value="padrao">Padrão (Global)</option>
                    <option value="especial">Especial (Customizada)</option>
                  </select>
                </div>
                {form.tipoPontuacao === 'especial' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Pontuação Especial</label>
                    <input
                      type="number"
                      value={form.pontuacaoEspecial}
                      disabled={!podeEditar}
                      onChange={(e) => setForm({ ...form, pontuacaoEspecial: parseFloat(e.target.value) })}
                      step="0.1"
                      min="1"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>

              {/* Preço à Vista calculado (CMV × pontuação aplicada) */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-md flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">Preço à Vista (Tabela)</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    CMV {formatBRL(cmv)} × pontuação {pontuacaoAplicada.toFixed(2)}
                    {form.tipoPontuacao === 'padrao' ? ' (padrão da loja)' : ' (especial)'}
                  </p>
                </div>
                <span className="text-lg font-bold text-emerald-600">{formatBRL(precoVista)}</span>
              </div>

              {/* Histórico de Compras */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <TrendingUp className="w-4 h-4 text-mali-primary" />
                  Histórico de Compras
                </h3>
                {historicoCompras.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-background rounded-md border border-border">
                    Nenhuma compra registrada para este produto.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-background border-b border-border">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">NF</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fornecedor</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qtd</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Custo Un.</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">CMV Un.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historicoCompras.map((h, idx) => (
                          <tr key={idx} className="border-b border-border last:border-0">
                            <td className="px-3 py-2 text-foreground">{formatData(h.data)}</td>
                            <td className="px-3 py-2 text-foreground">{h.numeroNF}</td>
                            <td className="px-3 py-2 text-muted-foreground">{h.fornecedor}</td>
                            <td className="px-3 py-2 text-right text-foreground">{h.quantidade}</td>
                            <td className="px-3 py-2 text-right text-foreground">{formatBRL(h.custoUnitario)}</td>
                            <td className="px-3 py-2 text-right font-medium text-mali-primary">{formatBRL(h.cmvUnitario)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: Estoque */}
          {aba === 'estoque' && (
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-background rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Estoque Total</p>
                  <p className="text-2xl font-bold text-foreground">{totalGeral} un</p>
                </div>
                <div className="bg-background rounded-lg border border-border p-4">
                  <p className="text-xs text-muted-foreground">Disponível p/ venda</p>
                  <p className={`text-2xl font-bold ${abaixoMinimo ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {totalDisponivel} un
                  </p>
                </div>
                <div className="bg-background rounded-lg border border-border p-4">
                  <label className="block text-xs text-muted-foreground mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    value={form.estoqueMinimo}
                    disabled={!podeEditar}
                    onChange={(e) => setForm({ ...form, estoqueMinimo: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-2 py-1 bg-card border border-border rounded text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-60"
                  />
                </div>
              </div>

              {abaixoMinimo && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-600">
                    Estoque disponível ({totalDisponivel}) abaixo do mínimo ({form.estoqueMinimo}).
                  </p>
                </div>
              )}

              {/* Saldo por localização */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Saldo por Localização</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {LOCAIS.map((local) => {
                    const disponivel = LOCALIZACOES_DISPONIVEIS.includes(local);
                    return (
                      <div
                        key={local}
                        className="bg-background rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              disponivel ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <p className="text-xs text-muted-foreground">{LOCALIZACOES[local]}</p>
                        </div>
                        <p className="text-lg font-semibold text-foreground">{saldosPorLocal[local]} un</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Histórico de movimentações */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                  <History className="w-4 h-4 text-mali-primary" />
                  Histórico de Movimentações
                </h3>
                {movimentacoesProduto.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center bg-background rounded-md border border-border">
                    Nenhuma movimentação registrada.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border border-border max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-background border-b border-border sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Data</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Movimento</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qtd</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimentacoesProduto.map((m) => {
                          const o = m.localizacaoOrigem ? LOCALIZACOES[m.localizacaoOrigem] : null;
                          const d = m.localizacaoDestino ? LOCALIZACOES[m.localizacaoDestino] : null;
                          const mov = o && d ? `${o} → ${d}` : d ? `→ ${d}` : o ? `${o} →` : '-';
                          return (
                            <tr key={m.id} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 text-foreground">{formatData(m.criadoEm)}</td>
                              <td className="px-3 py-2 capitalize text-foreground">{m.tipo}</td>
                              <td className="px-3 py-2 text-muted-foreground">{mov}</td>
                              <td className="px-3 py-2 text-right text-foreground">{m.quantidade}</td>
                              <td className="px-3 py-2 text-muted-foreground">{m.registradoPorNome || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {podeEditar && (
          <div className="flex justify-end gap-3 p-6 border-t border-border flex-shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-mali-primary to-mali-primary-dark text-mali-secondary rounded-md hover:shadow-lg transition-all disabled:opacity-50 font-medium"
            >
              <Save className="w-4 h-4" />
              {salvando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CampoMoeda({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step="0.01"
        className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-60"
      />
    </div>
  );
}

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
