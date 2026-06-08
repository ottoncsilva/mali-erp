'use client';

import { useMemo, useState } from 'react';
import { useCollection } from '@/lib/hooks';
import { Table } from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { formatBRL, formatData } from '@/lib/utils/format';
import { ContaPagar, ContaReceber, ContaBancaria, FormaPagamento, CategoriaFinanceira, MovimentoCaixa } from '@/types';
import { DollarSign, TrendingUp, TrendingDown, CheckCircle2, Loader2, AlertCircle, Plus, Download } from 'lucide-react';
import { baixarParcela, reabrirParcela } from '@/lib/financeiro/baixa';
import { lancarContaManual } from '@/lib/financeiro/lancamento';
import { useAuth } from '@/lib/hooks';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { gerarExtratoContaBancariaPDF } from '@/lib/pdf/geradores';

type Tipo = 'receber' | 'pagar';

interface LinhaConta {
  contaId: string;
  tipo: Tipo;
  descricao: string;
  numeroParcela: number;
  valor: number;
  vencimento: any;
  pago: boolean;
  pagoEm?: Date;
  totalParcelas: number;
  contaReceber?: ContaReceber;
  contaPagar?: ContaPagar;
}

interface FormBaixa {
  dataRecebimento: Date;
  contaBancariaId: string;
  formaPagamento: FormaPagamento;
  valorPago: number;
  juros: number;
  multa: number;
  desconto: number;
  observacoes: string;
}

interface FormLancamento {
  tipo: Tipo;
  descricao: string;
  categoriaId: string;
  valor: number;
  vencimento: Date;
  contraparteNome: string;
}

const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'outro', label: 'Outro' },
];

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v?.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

export default function FinanceiroPage() {
  const { userProfile } = useAuth();
  const { data: contasReceber, loading: loadingR } = useCollection<ContaReceber>('contas_receber');
  const { data: contasPagar, loading: loadingP } = useCollection<ContaPagar>('contas_pagar');
  const { data: contas, loading: loadingContas } = useCollection<ContaBancaria>('contas_bancarias');
  const { data: categorias } = useCollection<CategoriaFinanceira>('categorias_financeiras');
  const { data: movimentos } = useCollection<MovimentoCaixa>('movimentos_caixa');

  const [filtro, setFiltro] = useState<Tipo | 'todas'>('todas');
  const [modalBaixaOpen, setModalBaixaOpen] = useState(false);
  const [linhaParaBaixar, setLinhaParaBaixar] = useState<LinhaConta | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [contaSelecionadaExportar, setContaSelecionadaExportar] = useState<string>(contas.length > 0 ? contas[0].id : '');

  // Lançamento manual
  const [modalLancOpen, setModalLancOpen] = useState(false);
  const [salvandoLanc, setSalvandoLanc] = useState(false);
  const [erroLanc, setErroLanc] = useState('');
  const [formLanc, setFormLanc] = useState<FormLancamento>({
    tipo: 'pagar',
    descricao: '',
    categoriaId: '',
    valor: 0,
    vencimento: new Date(),
    contraparteNome: '',
  });

  const [formBaixa, setFormBaixa] = useState<FormBaixa>({
    dataRecebimento: new Date(),
    contaBancariaId: '',
    formaPagamento: 'pix',
    valorPago: 0,
    juros: 0,
    multa: 0,
    desconto: 0,
    observacoes: '',
  });

  // Achata as parcelas em linhas
  const linhas = useMemo(() => {
    const todas: LinhaConta[] = [];
    (contasReceber as (ContaReceber & { id: string })[]).forEach((c) => {
      (c.parcelas || []).forEach((p) => {
        todas.push({
          contaId: c.id,
          tipo: 'receber',
          descricao: c.descricao || 'Conta a receber',
          numeroParcela: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
          pago: p.pago,
          pagoEm: p.pagoEm,
          totalParcelas: c.parcelas.length,
          contaReceber: c,
        });
      });
    });
    (contasPagar as (ContaPagar & { id: string })[]).forEach((c) => {
      (c.parcelas || []).forEach((p) => {
        todas.push({
          contaId: c.id,
          tipo: 'pagar',
          descricao: c.descricao || 'Conta a pagar',
          numeroParcela: p.numero,
          valor: p.valor,
          vencimento: p.vencimento,
          pago: p.pago,
          pagoEm: p.pagoEm,
          totalParcelas: c.parcelas.length,
          contaPagar: c,
        });
      });
    });
    return todas.sort((a, b) => toMillis(a.vencimento) - toMillis(b.vencimento));
  }, [contasReceber, contasPagar]);

  const filtradas = filtro === 'todas' ? linhas : linhas.filter((l) => l.tipo === filtro);

  const totalReceber = linhas
    .filter((l) => l.tipo === 'receber' && !l.pago)
    .reduce((s, l) => s + l.valor, 0);
  const totalPagar = linhas
    .filter((l) => l.tipo === 'pagar' && !l.pago)
    .reduce((s, l) => s + l.valor, 0);

  const handleBaixar = (linha: LinhaConta) => {
    setLinhaParaBaixar(linha);
    setFormBaixa({
      dataRecebimento: new Date(),
      contaBancariaId: contas.length > 0 ? contas[0].id : '',
      formaPagamento: 'pix',
      valorPago: linha.valor,
      juros: 0,
      multa: 0,
      desconto: 0,
      observacoes: '',
    });
    setErro('');
    setModalBaixaOpen(true);
  };

  const handleRebaixar = async (linha: LinhaConta) => {
    if (!confirm('Tem certeza que deseja reabrir esta parcela?')) return;
    try {
      await reabrirParcela(linha.contaId, linha.tipo, linha.numeroParcela);
    } catch (err) {
      alert('Erro ao reabrir: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleSalvarBaixa = async () => {
    if (!linhaParaBaixar) return;
    setErro('');
    setSalvando(true);
    try {
      await baixarParcela({
        contaId: linhaParaBaixar.contaId,
        tipo: linhaParaBaixar.tipo,
        parcelaNumero: linhaParaBaixar.numeroParcela,
        ...formBaixa,
        registradoPorId: userProfile?.uid || '',
        registradoPorNome: userProfile?.nome || '',
      });
      setModalBaixaOpen(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao baixar');
    } finally {
      setSalvando(false);
    }
  };

  const abrirLancamento = () => {
    setFormLanc({
      tipo: 'pagar',
      descricao: '',
      categoriaId: '',
      valor: 0,
      vencimento: new Date(),
      contraparteNome: '',
    });
    setErroLanc('');
    setModalLancOpen(true);
  };

  const handleSalvarLancamento = async () => {
    setErroLanc('');
    if (!formLanc.descricao.trim()) {
      setErroLanc('Informe a descrição.');
      return;
    }
    if (formLanc.valor <= 0) {
      setErroLanc('Informe um valor maior que zero.');
      return;
    }
    setSalvandoLanc(true);
    try {
      await lancarContaManual({
        tipo: formLanc.tipo,
        descricao: formLanc.descricao.trim(),
        categoriaId: formLanc.categoriaId,
        valorTotal: formLanc.valor,
        dataCompetencia: formLanc.vencimento,
        parcelas: [
          { numero: 1, valor: formLanc.valor, vencimento: formLanc.vencimento, pago: false },
        ],
        contraparteNome: formLanc.contraparteNome || undefined,
      });
      setModalLancOpen(false);
    } catch (err) {
      setErroLanc(err instanceof Error ? err.message : 'Erro ao lançar');
    } finally {
      setSalvandoLanc(false);
    }
  };

  // Categorias filtradas pelo tipo do lançamento (receita/despesa).
  const categoriasDoTipo = useMemo(() => {
    const alvo = formLanc.tipo === 'receber' ? 'receita' : 'despesa';
    return categorias.filter((c) => c.tipo === alvo && c.ativo !== false);
  }, [categorias, formLanc.tipo]);

  const columns = [
    {
      header: 'Descrição',
      accessor: 'descricao',
      render: (v: string, row: LinhaConta) => (
        <div>
          <p className="text-foreground text-sm">{v}</p>
          {row.totalParcelas > 1 && (
            <p className="text-xs text-muted-foreground">
              Parcela {row.numeroParcela}/{row.totalParcelas}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: 'tipo',
      render: (tipo: Tipo) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            tipo === 'receber' ? 'bg-emerald-500/20 text-emerald-600' : 'bg-red-500/20 text-red-600'
          }`}
        >
          {tipo === 'receber' ? 'A Receber' : 'A Pagar'}
        </span>
      ),
    },
    {
      header: 'Valor',
      accessor: 'valor',
      render: (valor: number, row: LinhaConta) => (
        <span className={row.tipo === 'receber' ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
          {row.tipo === 'receber' ? '+' : '-'} {formatBRL(valor)}
        </span>
      ),
    },
    {
      header: 'Vencimento',
      accessor: 'vencimento',
      render: (data: any) => {
        const d = toMillis(data);
        const hoje = toMillis(new Date());
        const vencido = d < hoje && data;
        return (
          <span className={vencido ? 'text-destructive font-semibold' : ''}>
            {formatData(data)}
            {vencido && ' ⚠️'}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'pago',
      render: (pago: boolean, row: LinhaConta) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            pago ? 'bg-emerald-500/20 text-emerald-600' : 'bg-amber-500/20 text-amber-600'
          }`}
        >
          {pago ? `✓ Pago em ${formatData(row.pagoEm)}` : '⏳ Aberto'}
        </span>
      ),
    },
    {
      header: 'Ações',
      accessor: 'contaId',
      render: (_: string, row: LinhaConta) => (
        <div className="flex gap-2">
          {!row.pago ? (
            <button
              onClick={() => handleBaixar(row)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-emerald-500 text-emerald-600 hover:bg-emerald-500/10 transition-colors"
              title="Baixar"
            >
              <CheckCircle2 className="w-4 h-4" />
              Baixar
            </button>
          ) : (
            <button
              onClick={() => handleRebaixar(row)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-amber-500 text-amber-600 hover:bg-amber-500/10 transition-colors"
              title="Reabrir"
            >
              Reabrir
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground mt-2">Recebimentos, pagamentos e lançamentos</p>
        </div>
        <div className="flex gap-3 items-center">
          {contas.length > 0 && (
            <div className="flex gap-2 items-center">
              <select
                value={contaSelecionadaExportar}
                onChange={(e) => setContaSelecionadaExportar(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm"
              >
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <ExportExtratoButton
                contaId={contaSelecionadaExportar}
                contas={contas}
                movimentos={movimentos}
              />
            </div>
          )}
          <button
            onClick={abrirLancamento}
            className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-sm text-muted-foreground">A Receber</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatBRL(totalReceber)}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-red-500/10 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm text-muted-foreground">A Pagar</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{formatBRL(totalPagar)}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-mali-primary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-mali-primary" />
            </div>
            <span className="text-sm text-muted-foreground">Saldo Projetado</span>
          </div>
          <p className={`text-2xl font-bold ${totalReceber - totalPagar >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatBRL(totalReceber - totalPagar)}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3">
        {[
          { value: 'receber', label: '📥 A Receber' },
          { value: 'pagar', label: '📤 A Pagar' },
          { value: 'todas', label: '📊 Todas' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value as Tipo | 'todas')}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              filtro === f.value
                ? 'bg-mali-primary text-mali-secondary'
                : 'bg-card border border-border text-foreground hover:bg-background'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Table
        columns={columns}
        data={filtradas}
        loading={loadingR || loadingP || loadingContas}
        emptyMessage="Nenhuma conta encontrada"
      />

      {/* Modal de Baixa Profissional */}
      <Modal
        isOpen={modalBaixaOpen}
        title={linhaParaBaixar ? `Baixar ${linhaParaBaixar.tipo === 'receber' ? 'Recebimento' : 'Pagamento'}` : 'Baixa'}
        onClose={() => setModalBaixaOpen(false)}
        size="lg"
      >
        {linhaParaBaixar && (
          <div className="space-y-4">
            {/* Dados da parcela */}
            <div className="p-4 bg-background rounded-lg border border-border space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>{linhaParaBaixar.descricao}</strong>
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Parcela:</span>{' '}
                  <span className="font-semibold">{linhaParaBaixar.numeroParcela}/{linhaParaBaixar.totalParcelas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vencimento:</span>{' '}
                  <span className="font-semibold">{formatData(linhaParaBaixar.vencimento)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Original:</span>{' '}
                  <span className="font-semibold">{formatBRL(linhaParaBaixar.valor)}</span>
                </div>
              </div>
            </div>

            {/* Formulário de baixa */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Data</label>
                  <input
                    type="date"
                    value={formBaixa.dataRecebimento.toISOString().split('T')[0]}
                    onChange={(e) =>
                      setFormBaixa({
                        ...formBaixa,
                        dataRecebimento: new Date(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Forma de Pagamento</label>
                  <select
                    value={formBaixa.formaPagamento}
                    onChange={(e) =>
                      setFormBaixa({
                        ...formBaixa,
                        formaPagamento: e.target.value as FormaPagamento,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Conta Bancária</label>
                <select
                  value={formBaixa.contaBancariaId}
                  onChange={(e) =>
                    setFormBaixa({
                      ...formBaixa,
                      contaBancariaId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                >
                  <option value="">Selecione...</option>
                  {contas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
                {!formBaixa.contaBancariaId && contas.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Nenhuma conta bancária cadastrada</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Valor Pago</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formBaixa.valorPago}
                    onChange={(e) =>
                      setFormBaixa({
                        ...formBaixa,
                        valorPago: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Desconto (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formBaixa.desconto}
                    onChange={(e) =>
                      setFormBaixa({
                        ...formBaixa,
                        desconto: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Juros (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formBaixa.juros}
                    onChange={(e) =>
                      setFormBaixa({
                        ...formBaixa,
                        juros: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Multa (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formBaixa.multa}
                    onChange={(e) =>
                      setFormBaixa({
                        ...formBaixa,
                        multa: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Observações</label>
                <textarea
                  value={formBaixa.observacoes}
                  onChange={(e) =>
                    setFormBaixa({
                      ...formBaixa,
                      observacoes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary resize-none"
                  rows={2}
                  placeholder="Notas sobre a baixa..."
                />
              </div>

              {/* Resumo */}
              <div className="p-3 bg-background rounded-lg border border-border">
                <p className="text-sm font-medium text-foreground mb-2">Resumo da Baixa</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Valor Original:</span>
                    <span>{formatBRL(linhaParaBaixar.valor)}</span>
                  </div>
                  {formBaixa.desconto > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>- Desconto:</span>
                      <span>-{formatBRL(formBaixa.desconto)}</span>
                    </div>
                  )}
                  {formBaixa.juros > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>+ Juros:</span>
                      <span>+{formatBRL(formBaixa.juros)}</span>
                    </div>
                  )}
                  {formBaixa.multa > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>+ Multa:</span>
                      <span>+{formatBRL(formBaixa.multa)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-1 mt-1 flex justify-between font-semibold text-foreground">
                    <span>Total a Pagar:</span>
                    <span>
                      {formatBRL(
                        linhaParaBaixar.valor -
                          formBaixa.desconto +
                          formBaixa.juros +
                          formBaixa.multa
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {erro && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{erro}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <button
                onClick={() => setModalBaixaOpen(false)}
                className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-background"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarBaixa}
                disabled={salvando || !formBaixa.contaBancariaId}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Baixa
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de Lançamento Manual */}
      <Modal
        isOpen={modalLancOpen}
        title="Novo Lançamento"
        onClose={() => setModalLancOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {[
              { value: 'pagar', label: '📤 Despesa (a pagar)' },
              { value: 'receber', label: '📥 Receita (a receber)' },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setFormLanc({ ...formLanc, tipo: t.value as Tipo, categoriaId: '' })}
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  formLanc.tipo === t.value
                    ? 'bg-mali-primary text-mali-secondary'
                    : 'bg-card border border-border text-foreground hover:bg-background'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Descrição</label>
            <input
              type="text"
              value={formLanc.descricao}
              onChange={(e) => setFormLanc({ ...formLanc, descricao: e.target.value })}
              className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              placeholder="Ex: Aluguel de junho, Conta de energia"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Categoria</label>
              <select
                value={formLanc.categoriaId}
                onChange={(e) => setFormLanc({ ...formLanc, categoriaId: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              >
                <option value="">Sem categoria</option>
                {categoriasDoTipo.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Valor</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formLanc.valor}
                onChange={(e) => setFormLanc({ ...formLanc, valor: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Vencimento</label>
              <input
                type="date"
                value={formLanc.vencimento.toISOString().split('T')[0]}
                onChange={(e) => setFormLanc({ ...formLanc, vencimento: new Date(e.target.value) })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {formLanc.tipo === 'receber' ? 'Cliente/Pagador' : 'Fornecedor/Beneficiário'}
              </label>
              <input
                type="text"
                value={formLanc.contraparteNome}
                onChange={(e) => setFormLanc({ ...formLanc, contraparteNome: e.target.value })}
                className="w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-mali-primary"
                placeholder="Opcional"
              />
            </div>
          </div>

          {erroLanc && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{erroLanc}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={() => setModalLancOpen(false)}
              className="px-4 py-2 rounded-md border border-border text-foreground hover:bg-background"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvarLancamento}
              disabled={salvandoLanc}
              className="flex items-center gap-2 px-4 py-2 bg-mali-primary text-mali-secondary font-semibold rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {salvandoLanc && <Loader2 className="w-4 h-4 animate-spin" />}
              Lançar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ExportExtratoButton({
  contaId,
  contas,
  movimentos,
}: {
  contaId: string;
  contas: (ContaBancaria & { id: string })[];
  movimentos: (MovimentoCaixa & { id: string })[];
}) {
  const conta = contas.find((c) => c.id === contaId);
  if (!conta) return null;

  const movimentosDaConta = movimentos.filter((m) => m.contaBancariaId === contaId);

  let saldoAtual = conta.saldoInicial;
  const movimentosComSaldo = movimentosDaConta.map((m) => {
    const saldoAnterior = saldoAtual;
    if (m.tipo === 'entrada') {
      saldoAtual += m.valor;
    } else if (m.tipo === 'saida') {
      saldoAtual -= m.valor;
    }
    return {
      data: m.criadoEm || new Date(),
      descricao: m.descricao,
      tipo: m.tipo,
      valor: m.valor,
      saldo: saldoAtual,
    };
  });

  const pdfDoc = gerarExtratoContaBancariaPDF({
    contaNome: conta.nome,
    contaTipo: conta.tipo,
    periodo: `${new Date().getFullYear()} - ${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    saldoInicial: conta.saldoInicial,
    saldoFinal: saldoAtual,
    totalEntradas: movimentosDaConta.filter((m) => m.tipo === 'entrada').reduce((s, m) => s + m.valor, 0),
    totalSaidas: movimentosDaConta.filter((m) => m.tipo === 'saida').reduce((s, m) => s + m.valor, 0),
    movimentos: movimentosComSaldo,
  });

  return (
    <PDFDownloadLink document={pdfDoc} fileName={`Extrato_${conta.nome}_${new Date().getTime()}.pdf`}>
      {({ blob, url, loading, error }) => (
        <button
          disabled={loading}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {loading ? 'Gerando...' : 'Extrato'}
        </button>
      )}
    </PDFDownloadLink>
  );
}
