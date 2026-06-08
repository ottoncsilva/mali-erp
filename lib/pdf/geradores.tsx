/**
 * Geradores de PDF para relatórios do ERP.
 * Usando @react-pdf/renderer para criar documentos estruturados.
 */

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatBRL } from '@/lib/utils/format';

export const estilosBase = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
    paddingBottom: 15,
  },
  titulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 5,
  },
  subtitulo: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  dataGeracao: {
    fontSize: 9,
    color: '#999',
    marginTop: 5,
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
    paddingBottom: 8,
    paddingTop: 8,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
    paddingTop: 5,
  },
  tableCell: {
    flex: 1,
    paddingRight: 10,
    fontSize: 10,
  },
  tableCellRight: {
    flex: 1,
    paddingRight: 10,
    fontSize: 10,
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#D4AF37',
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    paddingBottom: 8,
    paddingTop: 8,
    fontWeight: 'bold',
    borderTopWidth: 2,
    borderTopColor: '#D4AF37',
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
  },
  positivo: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  negativo: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
});

export interface DREData {
  receitaBruta: number;
  deducoes: number;
  cmv: number;
  despesasOperacionais: number;
  despesasPessoal: number;
  despesasFinanceiras: number;
  lucroLiquido: number;
  periodo: string;
  regime: 'caixa' | 'competencia';
  dataGeracao: Date;
}

export interface ComissaoData {
  colaboradorNome: string;
  colaboradorId: string;
  mesAno: string;
  totalComissao: number;
  quantidadeVendas: number;
  ticketMedio: number;
  percentualMeta?: number;
}

export interface ExtratoData {
  contaNome: string;
  contaTipo: string;
  periodo: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
  movimentos: Array<{
    data: Date;
    descricao: string;
    tipo: string;
    valor: number;
    saldo: number;
  }>;
}

export function gerarDREPDF(data: DREData) {
  const margemLiquida = data.receitaBruta > 0 ? (data.lucroLiquido / data.receitaBruta) * 100 : 0;

  return (
    <Document>
      <Page size="A4" style={estilosBase.page}>
        {/* Header */}
        <View style={estilosBase.header}>
          <Text style={estilosBase.titulo}>Demonstração de Resultado (DRE)</Text>
          <Text style={estilosBase.subtitulo}>Período: {data.periodo}</Text>
          <Text style={estilosBase.subtitulo}>Regime: {data.regime === 'caixa' ? 'Caixa' : 'Competência'}</Text>
          <Text style={estilosBase.dataGeracao}>Gerado em {data.dataGeracao.toLocaleDateString('pt-BR')}</Text>
        </View>

        {/* Receitas */}
        <View style={estilosBase.section}>
          <Text style={estilosBase.sectionTitle}>RECEITAS</Text>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>Receita Bruta</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(data.receitaBruta)}</Text>
          </View>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>(-) Deduções</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(data.deducoes)}</Text>
          </View>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>(-) CMV</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(data.cmv)}</Text>
          </View>
        </View>

        {/* Despesas */}
        <View style={estilosBase.section}>
          <Text style={estilosBase.sectionTitle}>DESPESAS</Text>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>Operacionais</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(data.despesasOperacionais)}</Text>
          </View>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>Pessoal</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(data.despesasPessoal)}</Text>
          </View>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>Financeiras</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(data.despesasFinanceiras)}</Text>
          </View>
        </View>

        {/* Resultado */}
        <View style={estilosBase.section}>
          <View style={estilosBase.totalRow}>
            <Text style={estilosBase.tableCell}>LUCRO LÍQUIDO</Text>
            <Text style={[estilosBase.tableCellRight, data.lucroLiquido >= 0 ? estilosBase.positivo : estilosBase.negativo]}>
              {formatBRL(data.lucroLiquido)}
            </Text>
          </View>
          <View style={{ ...estilosBase.tableRow, marginTop: 10 }}>
            <Text style={estilosBase.tableCell}>Margem Líquida</Text>
            <Text style={estilosBase.tableCellRight}>{margemLiquida.toFixed(2)}%</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={estilosBase.footer}>
          <Text>Relatório confidencial — Uso interno</Text>
        </View>
      </Page>
    </Document>
  );
}

export function gerarComissoesPDF(colaboradores: ComissaoData[], periodo: string) {
  const totalComissoes = colaboradores.reduce((acc, c) => acc + c.totalComissao, 0);

  return (
    <Document>
      <Page size="A4" style={estilosBase.page}>
        {/* Header */}
        <View style={estilosBase.header}>
          <Text style={estilosBase.titulo}>Relatório de Comissões</Text>
          <Text style={estilosBase.subtitulo}>Período: {periodo}</Text>
          <Text style={estilosBase.dataGeracao}>Gerado em {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        {/* Tabela de Comissões */}
        <View style={estilosBase.section}>
          <View style={estilosBase.tableHeader}>
            <Text style={{ ...estilosBase.tableCell, flex: 2 }}>Colaborador</Text>
            <Text style={estilosBase.tableCellRight}>Vendas</Text>
            <Text style={estilosBase.tableCellRight}>Ticket</Text>
            <Text style={estilosBase.tableCellRight}>Comissão</Text>
          </View>

          {colaboradores.map((col, idx) => (
            <View key={idx} style={estilosBase.tableRow}>
              <Text style={{ ...estilosBase.tableCell, flex: 2 }}>{col.colaboradorNome}</Text>
              <Text style={estilosBase.tableCellRight}>{col.quantidadeVendas}</Text>
              <Text style={estilosBase.tableCellRight}>{formatBRL(col.ticketMedio)}</Text>
              <Text style={estilosBase.tableCellRight}>{formatBRL(col.totalComissao)}</Text>
            </View>
          ))}

          {/* Total */}
          <View style={estilosBase.totalRow}>
            <Text style={{ ...estilosBase.tableCell, flex: 2 }}>TOTAL</Text>
            <Text style={estilosBase.tableCellRight}>{colaboradores.reduce((a, c) => a + c.quantidadeVendas, 0)}</Text>
            <Text style={estilosBase.tableCellRight}>-</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(totalComissoes)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={estilosBase.footer}>
          <Text>Relatório confidencial — Uso interno</Text>
        </View>
      </Page>
    </Document>
  );
}

export function gerarExtratoContaBancariaPDF(data: ExtratoData) {
  return (
    <Document>
      <Page size="A4" style={estilosBase.page}>
        {/* Header */}
        <View style={estilosBase.header}>
          <Text style={estilosBase.titulo}>Extrato da Conta</Text>
          <Text style={estilosBase.subtitulo}>{data.contaNome}</Text>
          <Text style={estilosBase.subtitulo}>Período: {data.periodo}</Text>
          <Text style={estilosBase.dataGeracao}>Gerado em {new Date().toLocaleDateString('pt-BR')}</Text>
        </View>

        {/* Resumo */}
        <View style={estilosBase.section}>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>Saldo Inicial</Text>
            <Text style={estilosBase.tableCellRight}>{formatBRL(data.saldoInicial)}</Text>
          </View>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>(+) Entradas</Text>
            <Text style={[estilosBase.tableCellRight, estilosBase.positivo]}>{formatBRL(data.totalEntradas)}</Text>
          </View>
          <View style={estilosBase.tableRow}>
            <Text style={estilosBase.tableCell}>(-) Saídas</Text>
            <Text style={[estilosBase.tableCellRight, estilosBase.negativo]}>{formatBRL(data.totalSaidas)}</Text>
          </View>
          <View style={estilosBase.totalRow}>
            <Text style={estilosBase.tableCell}>Saldo Final</Text>
            <Text
              style={[
                estilosBase.tableCellRight,
                data.saldoFinal >= 0 ? estilosBase.positivo : estilosBase.negativo,
              ]}
            >
              {formatBRL(data.saldoFinal)}
            </Text>
          </View>
        </View>

        {/* Movimentos */}
        <View style={estilosBase.section}>
          <Text style={estilosBase.sectionTitle}>MOVIMENTOS</Text>
          <View style={estilosBase.tableHeader}>
            <Text style={{ ...estilosBase.tableCell, flex: 0.8 }}>Data</Text>
            <Text style={{ ...estilosBase.tableCell, flex: 2 }}>Descrição</Text>
            <Text style={estilosBase.tableCellRight}>Valor</Text>
            <Text style={estilosBase.tableCellRight}>Saldo</Text>
          </View>

          {data.movimentos.slice(0, 25).map((mov, idx) => (
            <View key={idx} style={estilosBase.tableRow}>
              <Text style={{ ...estilosBase.tableCell, flex: 0.8 }}>
                {new Date(mov.data).toLocaleDateString('pt-BR')}
              </Text>
              <Text style={{ ...estilosBase.tableCell, flex: 2 }}>{mov.descricao}</Text>
              <Text
                style={[
                  estilosBase.tableCellRight,
                  mov.tipo === 'entrada' ? estilosBase.positivo : estilosBase.negativo,
                ]}
              >
                {formatBRL(mov.valor)}
              </Text>
              <Text style={estilosBase.tableCellRight}>{formatBRL(mov.saldo)}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <View style={estilosBase.footer}>
          <Text>Extrato confidencial — Uso interno</Text>
        </View>
      </Page>
    </Document>
  );
}
