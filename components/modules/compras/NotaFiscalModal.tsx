'use client';

import { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useCollection, useAuth } from '@/lib/hooks';
import { CadastroRapidoProduto } from './CadastroRapidoProduto';
import {
  ratearFreteECalcularCMV,
  calcularTotaisNota,
  registrarNotaFiscal,
  type ItemParaRateio,
} from '@/lib/estoque';
import { formatBRL } from '@/lib/utils/format';
import { LOCALIZACOES } from '@/types';
import type { Fornecedor, Produto, PedidoCompra, LocalizacaoEstoque } from '@/types';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  pedidoVinculado?: (PedidoCompra & { id: string }) | null;
}

const LOCAIS = Object.keys(LOCALIZACOES) as LocalizacaoEstoque[];

export function NotaFiscalModal({ isOpen, onClose, onSaved, pedidoVinculado }: Props) {
  const { userProfile } = useAuth();
  const { data: fornecedores } = useCollection<Fornecedor>('fornecedores');
  const { data: produtos } = useCollection<Produto>('produtos');

  const [fornecedorId, setFornecedorId] = useState('');
  const [numero, setNumero] = useState('');
  const [serie, setSerie] = useState('');
  const [dataEmissao, setDataEmissao] = useState(() => new Date().toISOString().slice(0, 10));
  const [freteTotal, setFreteTotal] = useState(0);
  const [localizacaoDestino, setLocalizacaoDestino] = useState<LocalizacaoEstoque>('comprado');
  const [itens, setItens] = useState<ItemParaRateio[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Pré-preenche a partir do pedido vinculado.
  useEffect(() => {
    if (isOpen && pedidoVinculado) {
      setFornecedorId(pedidoVinculado.fornecedorId);
      setFreteTotal(pedidoVinculado.freteEstimado || 0);
      setItens(
        pedidoVinculado.itens.map((it) => ({
          produtoId: it.produtoId,
          nomeProduto: it.nomeProduto,
          skuProduto: it.skuProduto,
          quantidade: it.quantidade,
          custoUnitario: it.custoUnitario,
          icms: it.icms * it.quantidade,
          ipi: it.ipi * it.quantidade,
        }))
      );
    }
  }, [isOpen, pedidoVinculado]);

  const fornecedor = fornecedores.find((f) => f.id === fornecedorId);

  // Calcula rateio de frete e CMV em tempo real.
  const itensCalculados = useMemo(() => ratearFreteECalcularCMV(itens, freteTotal), [itens, freteTotal]);
  const totais = useMemo(() => calcularTotaisNota(itensCalculados, freteTotal), [itensCalculados, freteTotal]);

  const adicionarItem = () => {
    setItens([...itens, { produtoId: '', nomeProduto: '', skuProduto: '', quantidade: 1, custoUnitario: 0, icms: 0, ipi: 0 }]);
  };

  const atualizarItem = (index: number, patch: Partial<ItemParaRateio>) => {
    setItens(itens.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const selecionarProduto = (index: number, produtoId: string) => {
    const p = produtos.find((pr) => pr.id === produtoId);
    if (!p) return atualizarItem(index, { produtoId: '', nomeProduto: '', skuProduto: '' });
    atualizarItem(index, {
      produtoId: p.id,
      nomeProduto: p.nome,
      skuProduto: p.sku,
      custoUnitario: p.custoProduto || 0,
    });
  };

  const removerItem = (index: number) => setItens(itens.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!fornecedorId) return setErro('Selecione um fornecedor.');
    if (!numero.trim()) return setErro('Informe o número da nota.');
    if (itens.length === 0) return setErro('Adicione pelo menos um item.');
    if (itens.some((i) => !i.produtoId || i.quantidade <= 0)) {
      return setErro('Todos os itens devem ter produto e quantidade válida.');
    }

    setSalvando(true);
    try {
      await registrarNotaFiscal(
        {
          numero: numero.trim(),
          serie: serie.trim(),
          fornecedorId,
          fornecedorNome: fornecedor?.razaoSocial || '',
          pedidoCompraId: pedidoVinculado?.id,
          dataEmissao: new Date(dataEmissao),
          itens: itensCalculados,
          freteTotal,
          subtotalProdutos: totais.subtotalProdutos,
          icmsTotal: totais.icmsTotal,
          ipiTotal: totais.ipiTotal,
          valorTotal: totais.valorTotal,
          localizacaoDestino,
          observacoes: observacoes || undefined,
        },
        { registradoPorId: userProfile?.uid || '', registradoPorNome: userProfile?.nome }
      );
      onSaved();
      onClose();
      reset();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao registrar nota.');
    } finally {
      setSalvando(false);
    }
  };

  const reset = () => {
    setFornecedorId('');
    setNumero('');
    setSerie('');
    setDataEmissao(new Date().toISOString().slice(0, 10));
    setFreteTotal(0);
    setLocalizacaoDestino('comprado');
    setItens([]);
    setObservacoes('');
    setErro(null);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        title={pedidoVinculado ? `Registrar NF — ${pedidoVinculado.numero}` : 'Registrar Nota Fiscal'}
        onClose={onClose}
        size="full"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-foreground mb-2">Fornecedor</label>
              <select
                value={fornecedorId}
                onChange={(e) => setFornecedorId(e.target.value)}
                disabled={!!pedidoVinculado}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary disabled:opacity-60"
                required
              >
                <option value="">Selecione...</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.razaoSocial}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Número NF</label>
              <input
                type="text"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Série</label>
              <input
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Data emissão</label>
              <input
                type="date"
                value={dataEmissao}
                onChange={(e) => setDataEmissao(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Frete total (R$)</label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={freteTotal}
                onChange={(e) => setFreteTotal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Entrada no estoque</label>
              <select
                value={localizacaoDestino}
                onChange={(e) => setLocalizacaoDestino(e.target.value as LocalizacaoEstoque)}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                {LOCAIS.map((l) => (
                  <option key={l} value={l}>
                    {LOCALIZACOES[l]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Itens com preview de CMV */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">Itens & Composição de CMV</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCadastroAberto(true)}
                  className="text-xs px-3 py-1.5 bg-mali-secondary/10 text-mali-secondary rounded-md hover:bg-mali-secondary/20 transition-colors"
                >
                  + Novo Produto
                </button>
                <button
                  type="button"
                  onClick={adicionarItem}
                  className="text-xs px-3 py-1.5 bg-mali-primary/10 text-mali-primary rounded-md hover:bg-mali-primary/20 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Item
                </button>
              </div>
            </div>

            {itens.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-md">
                Nenhum item. Vincule um pedido ou adicione manualmente.
              </p>
            )}

            {itens.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-background border-b border-border">
                    <tr>
                      <th className="px-2 py-2 text-left font-semibold">Produto</th>
                      <th className="px-2 py-2 text-right font-semibold">Qtd</th>
                      <th className="px-2 py-2 text-right font-semibold">Custo un.</th>
                      <th className="px-2 py-2 text-right font-semibold">ICMS</th>
                      <th className="px-2 py-2 text-right font-semibold">IPI</th>
                      <th className="px-2 py-2 text-right font-semibold">Frete rateado</th>
                      <th className="px-2 py-2 text-right font-semibold text-mali-primary">CMV un.</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, index) => {
                      const calc = itensCalculados[index];
                      return (
                        <tr key={index} className="border-b border-border">
                          <td className="px-2 py-1.5 min-w-[180px]">
                            <select
                              value={item.produtoId}
                              onChange={(e) => selecionarProduto(index, e.target.value)}
                              className="w-full px-2 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-mali-primary"
                            >
                              <option value="">Selecione...</option>
                              {produtos.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={1}
                              value={item.quantidade}
                              onChange={(e) => atualizarItem(index, { quantidade: parseInt(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 bg-card border border-border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-mali-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.custoUnitario}
                              onChange={(e) => atualizarItem(index, { custoUnitario: parseFloat(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 bg-card border border-border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-mali-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.icms}
                              onChange={(e) => atualizarItem(index, { icms: parseFloat(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 bg-card border border-border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-mali-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.ipi}
                              onChange={(e) => atualizarItem(index, { ipi: parseFloat(e.target.value) || 0 })}
                              className="w-20 px-2 py-1 bg-card border border-border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-mali-primary"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right text-muted-foreground">{formatBRL(calc?.freteRateado)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold text-mali-primary">{formatBRL(calc?.cmvUnitario)}</td>
                          <td className="px-2 py-1.5 text-right">
                            <button type="button" onClick={() => removerItem(index)} className="p-1 hover:bg-card rounded">
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Observações</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
            />
          </div>

          {/* Totais */}
          <div className="flex flex-wrap justify-end gap-6 text-sm border-t border-border pt-3">
            <span className="text-muted-foreground">
              Produtos: <span className="text-foreground font-medium">{formatBRL(totais.subtotalProdutos)}</span>
            </span>
            <span className="text-muted-foreground">
              ICMS: <span className="text-foreground font-medium">{formatBRL(totais.icmsTotal)}</span>
            </span>
            <span className="text-muted-foreground">
              IPI: <span className="text-foreground font-medium">{formatBRL(totais.ipiTotal)}</span>
            </span>
            <span className="text-muted-foreground">
              Frete: <span className="text-foreground font-medium">{formatBRL(freteTotal)}</span>
            </span>
            <span className="text-muted-foreground">
              Total NF: <span className="text-mali-primary font-bold">{formatBRL(totais.valorTotal)}</span>
            </span>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex-1 px-4 py-2 bg-mali-primary text-mali-secondary rounded-md hover:bg-mali-primary-dark transition-colors font-medium disabled:opacity-50"
            >
              {salvando ? 'Registrando...' : 'Registrar NF e dar entrada'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-background border border-border text-foreground rounded-md hover:bg-card transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <CadastroRapidoProduto
        isOpen={cadastroAberto}
        onClose={() => setCadastroAberto(false)}
        fornecedorId={fornecedorId}
        onCriado={(id, nome, sku) => {
          setItens((prev) => [
            ...prev,
            { produtoId: id, nomeProduto: nome, skuProduto: sku, quantidade: 1, custoUnitario: 0, icms: 0, ipi: 0 },
          ]);
        }}
      />
    </>
  );
}
