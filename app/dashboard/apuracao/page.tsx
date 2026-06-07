'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { useCollection } from '@/lib/hooks';
import { ProtegerPagina } from '@/components/auth/ProtegerPagina';
import {
  MovimentoCaixa,
  CategoriaFinanceira,
  ContaReceber,
  ContaPagar,
} from '@/types';
import {
  calcularDRECaixa,
  calcularDRECompetencia,
  intervaloPeriodo,
  RegimeDRE,
} from '@/lib/financeiro/dre';
import { formatBRL } from '@/lib/utils/format';

type Periodo = 'mes' | 'trimestre' | 'ano';

function ApuracaoContent() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [regime, setRegime] = useState<RegimeDRE>('caixa');

  const { data: movimentos, loading: loadingMov } = useCollection<MovimentoCaixa>('movimentos_caixa');
  const { data: categorias, loading: loadingCat } = useCollection<CategoriaFinanceira>('categorias_financeiras');
  const { data: contasReceber, loading: loadingR } = useCollection<ContaReceber>('contas_receber');
  const { data: contasPagar, loading: loadingP } = useCollection<ContaPagar>('contas_pagar');

  const loading = loadingMov || loadingCat || loadingR || loadingP;

  const { inicio, fim } = useMemo(() => intervaloPeriodo(periodo), [periodo]);

  const dre = useMemo(() => {
    if (regime === 'caixa') {
      return calcularDRECaixa(movimentos, categorias, inicio, fim);
    }
    return calcularDRECompetencia(contasReceber, contasPagar, categorias, inicio, fim);
  }, [regime, movimentos, categorias, contasReceber, contasPagar, inicio, fim]);

  // Evolução mensal (últimos 6 meses) — sempre por regime de caixa para o gráfico.
  const evolucaoMensal = useMemo(() => {
    const meses: { mes: string; receita: number; despesa: number; resultado: number }[] = [];
    const hoje = new Date();
    const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    for (let i = 5; i >= 0; i--) {
      const base = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ini = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0);
      const f = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);
      const d = calcularDRECaixa(movimentos, categorias, ini, f);
      meses.push({
        mes: nomesMes[base.getMonth()],
        receita: d.receitaBruta + d.outrasReceitas,
        despesa: d.deducoes + d.cmv + d.despesasOperacionais + d.despesasPessoal + d.despesasFinanceiras,
        resultado: d.lucroLiquido,
      });
    }
    return meses;
  }, [movimentos, categorias]);

  // Despesas por grupo (para gráfico de barras).
  const despesasPorGrupo = useMemo(() => {
    return [
      { grupo: 'CMV', valor: dre.cmv },
      { grupo: 'Operacional', valor: dre.despesasOperacionais },
      { grupo: 'Pessoal', valor: dre.despesasPessoal },
      { grupo: 'Financeira', valor: dre.despesasFinanceiras },
    ].filter((d) => d.valor > 0);
  }, [dre]);

  const semDados =
    dre.receitaBruta === 0 &&
    dre.cmv === 0 &&
    dre.despesasOperacionais === 0 &&
    dre.despesasPessoal === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Apuração de Resultado (DRE)</h1>
        <p className="text-muted-foreground mt-2">
          Demonstração do Resultado do Exercício — dados reais do sistema
        </p>
      </div>

      {/* Controles: Período + Regime */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3">
          {[
            { value: 'mes', label: '📅 Este Mês' },
            { value: 'trimestre', label: '📊 Este Trimestre' },
            { value: 'ano', label: '📈 Este Ano' },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value as Periodo)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                periodo === p.value
                  ? 'bg-mali-primary text-mali-secondary'
                  : 'bg-card border border-border text-foreground hover:bg-background'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">Regime:</span>
          {[
            { value: 'caixa', label: 'Caixa' },
            { value: 'competencia', label: 'Competência' },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => setRegime(r.value as RegimeDRE)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                regime === r.value
                  ? 'bg-mali-secondary text-white'
                  : 'bg-card border border-border text-foreground hover:bg-background'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {regime === 'caixa'
          ? 'Regime de Caixa: considera o dinheiro que efetivamente entrou/saiu (movimentos de caixa).'
          : 'Regime de Competência: considera o fato gerador (parcelas), independente do pagamento.'}
      </p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-mali-primary" />
        </div>
      ) : (
        <>
          {semDados && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-600">
                Nenhum movimento financeiro encontrado no período. Os valores aparecerão
                conforme vendas forem fechadas e contas forem baixadas.
              </p>
            </div>
          )}

          {/* DRE Table */}
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">DEMONSTRAÇÃO DO RESULTADO</h2>

              <div className="space-y-3">
                <LinhaDRE label="RECEITA BRUTA" valor={dre.receitaBruta} />
                {dre.outrasReceitas > 0 && (
                  <LinhaDRE label="(+) Outras Receitas" valor={dre.outrasReceitas} positivo />
                )}
                <LinhaDRE label="(-) Deduções (Impostos/Devoluções)" valor={-dre.deducoes} negativo />

                <div className="h-px bg-mali-primary/30 my-2"></div>
                <LinhaDRE label="RECEITA LÍQUIDA" valor={dre.receitaLiquida} destaque />

                <LinhaDRE label="(-) CMV (Custo da Mercadoria Vendida)" valor={-dre.cmv} negativo />

                <div className="h-px bg-mali-primary/30 my-2"></div>
                <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded border border-emerald-500/20">
                  <span className="text-sm font-semibold text-emerald-600">(=) LUCRO BRUTO</span>
                  <span className="text-lg font-bold text-emerald-600">{formatBRL(dre.lucroBruto)}</span>
                </div>

                <LinhaDRE label="(-) Despesas Operacionais" valor={-dre.despesasOperacionais} negativo />
                <LinhaDRE label="(-) Despesas com Pessoal" valor={-dre.despesasPessoal} negativo />

                <div className="h-px bg-mali-primary/30 my-2"></div>
                <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded border border-blue-500/20">
                  <span className="text-sm font-semibold text-blue-600">(=) LUCRO OPERACIONAL</span>
                  <span className="text-lg font-bold text-blue-600">{formatBRL(dre.lucroOperacional)}</span>
                </div>

                <LinhaDRE label="(-) Despesas Financeiras" valor={-dre.despesasFinanceiras} negativo />

                <div className="h-px bg-mali-primary/30 my-2"></div>
                <div className="flex justify-between items-center p-4 bg-mali-primary/10 rounded-lg border-2 border-mali-primary">
                  <span className="text-lg font-bold text-mali-primary">(=) LUCRO LÍQUIDO</span>
                  <span className="text-2xl font-bold text-mali-primary">{formatBRL(dre.lucroLiquido)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Margens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <CardMargem
              titulo="Margem Bruta"
              valor={dre.margemBruta}
              cor="emerald"
              descricao="Do faturamento líquido"
            />
            <CardMargem
              titulo="Margem Operacional"
              valor={dre.margemOperacional}
              cor="blue"
              descricao="Após despesas operacionais"
            />
            <CardMargem
              titulo="Margem Líquida"
              valor={dre.margemLiquida}
              cor="mali"
              descricao="Lucro final"
            />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Evolução (últimos 6 meses — caixa)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={evolucaoMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="mes" stroke="#5a6b7c" />
                  <YAxis stroke="#5a6b7c" />
                  <Tooltip formatter={(v) => formatBRL(Number(v))} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="#10B981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="#EF4444" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="resultado" name="Resultado" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-card rounded-lg border border-border p-6">
              <h3 className="font-semibold text-foreground mb-4">Despesas por Grupo</h3>
              {despesasPorGrupo.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                  Sem despesas no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={despesasPorGrupo}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="grupo" stroke="#5a6b7c" />
                    <YAxis stroke="#5a6b7c" />
                    <Tooltip formatter={(v) => formatBRL(Number(v))} />
                    <Bar dataKey="valor" name="Valor" fill="#D4AF37" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LinhaDRE({
  label,
  valor,
  negativo,
  positivo,
  destaque,
}: {
  label: string;
  valor: number;
  negativo?: boolean;
  positivo?: boolean;
  destaque?: boolean;
}) {
  return (
    <div
      className={`flex justify-between items-center p-3 bg-background rounded ${
        negativo ? 'text-red-600' : positivo ? 'text-emerald-600' : ''
      }`}
    >
      <span className={`text-sm ${destaque ? 'font-semibold' : ''}`}>{label}</span>
      <span className={`${destaque ? 'text-lg font-bold text-mali-primary' : 'font-semibold'}`}>
        {formatBRL(valor)}
      </span>
    </div>
  );
}

function CardMargem({
  titulo,
  valor,
  cor,
  descricao,
}: {
  titulo: string;
  valor: number;
  cor: 'emerald' | 'blue' | 'mali';
  descricao: string;
}) {
  const cores = {
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600' },
    mali: { bg: 'bg-mali-primary/10', text: 'text-mali-primary' },
  }[cor];

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 ${cores.bg} rounded-lg`}>
          <TrendingUp className={`w-6 h-6 ${cores.text}`} />
        </div>
        <span className="text-sm text-muted-foreground">{titulo}</span>
      </div>
      <p className={`text-3xl font-bold ${cores.text}`}>{valor.toFixed(2)}%</p>
      <p className="text-xs text-muted-foreground mt-2">{descricao}</p>
    </div>
  );
}

export default function ApuracaoPage() {
  return (
    <ProtegerPagina permissao="dre.ver">
      <ApuracaoContent />
    </ProtegerPagina>
  );
}
