import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import { Atendimento, Produto, VariavelAcabamento } from '@/types';

interface GeradoPDFProps {
  atendimento: Atendimento & { id: string };
  produtos: (Produto & { id: string })[];
  acabamentos: (VariavelAcabamento & { id: string })[];
  nomeEmpresa: string;
  logoURL?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Helvetica',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
  },
  logo: {
    width: 60,
    height: 60,
    marginRight: 20,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#D4AF37',
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5A6B7C',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 10,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 8,
    color: '#5A6B7C',
    backgroundColor: '#F5F5F5',
    padding: 5,
  },
  clientInfo: {
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  clientColumn: {
    flex: 1,
    fontSize: 10,
  },
  clientLabel: {
    fontWeight: 'bold',
    color: '#5A6B7C',
    marginBottom: 3,
  },
  clientValue: {
    color: '#333',
  },
  table: {
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  tableHeader: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: '#D4AF37',
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#999',
  },
  tableRow: {
    display: 'flex',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    fontSize: 9,
  },
  tableCell: {
    padding: 6,
    flex: 1,
  },
  photoCol: {
    width: 50,
  },
  nameCol: {
    flex: 2,
  },
  qtdCol: {
    width: 40,
    textAlign: 'center',
  },
  precoCol: {
    width: 70,
    textAlign: 'right',
    paddingRight: 6,
  },
  photoImg: {
    width: 45,
    height: 45,
    objectFit: 'cover',
  },
  resumo: {
    marginTop: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 5,
  },
  resumoLine: {
    display: 'flex',
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    fontSize: 10,
    paddingRight: 10,
  },
  resumoLineTotal: {
    display: 'flex',
    flexDirection: 'row',
    width: 250,
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D4AF37',
    borderTopWidth: 2,
    borderTopColor: '#D4AF37',
    paddingTop: 8,
    paddingRight: 10,
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#DDD',
    fontSize: 8,
    color: '#999',
    textAlign: 'center',
  },
  paymentInfo: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#F5F5F5',
    fontSize: 9,
    borderRadius: 3,
  },
  paymentTitle: {
    fontWeight: 'bold',
    color: '#5A6B7C',
    marginBottom: 5,
  },
});

const getNomeAcabamento = (id: string, acabamentos: (VariavelAcabamento & { id: string })[]) => {
  return acabamentos.find((a) => a.id === id)?.nomeDaOpcao || 'N/A';
};

export function OrcamentoPDF({
  atendimento,
  produtos,
  acabamentos,
  nomeEmpresa,
  logoURL,
}: GeradoPDFProps) {
  const dataCriacao = atendimento.criadoEm instanceof Date
    ? atendimento.criadoEm.toLocaleDateString('pt-BR')
    : new Date(atendimento.criadoEm as any).toLocaleDateString('pt-BR');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {logoURL && <Image style={styles.logo} src={logoURL} />}
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{nomeEmpresa}</Text>
            <Text style={styles.title}>
              {atendimento.tipo === 'orcamento' ? 'ORÇAMENTO' : 'COMPROVANTE DE VENDA'}
            </Text>
            <Text style={styles.subtitle}>Nº {atendimento.id.substring(0, 8).toUpperCase()}</Text>
            <Text style={styles.subtitle}>Data: {dataCriacao}</Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.clientInfo}>
          <View style={styles.clientColumn}>
            <Text style={styles.clientLabel}>CLIENTE</Text>
            <Text style={styles.clientValue}>Nome: Cliente ID {atendimento.clienteId}</Text>
          </View>
          <View style={styles.clientColumn}>
            <Text style={styles.clientLabel}>REPRESENTANTE</Text>
            <Text style={styles.clientValue}>Vendedor ID {atendimento.vendedorId}</Text>
          </View>
        </View>

        {/* Items Table */}
        <Text style={styles.sectionTitle}>ITENS DO ORÇAMENTO</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={[styles.tableCell, styles.photoCol]}>
              <Text>Foto</Text>
            </View>
            <View style={[styles.tableCell, styles.nameCol]}>
              <Text>Produto / Acabamento</Text>
            </View>
            <View style={[styles.tableCell, styles.qtdCol]}>
              <Text>Qtd</Text>
            </View>
            <View style={[styles.tableCell, styles.precoCol]}>
              <Text>Preço Unit.</Text>
            </View>
            <View style={[styles.tableCell, styles.precoCol]}>
              <Text>Total</Text>
            </View>
          </View>

          {atendimento.itens?.map((item, idx) => (
            <View key={idx} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.photoCol]}>
                {item.foto && <Image style={styles.photoImg} src={item.foto} />}
              </View>
              <View style={[styles.tableCell, styles.nameCol]}>
                <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>{item.nome}</Text>
                <Text style={{ fontSize: 8, color: '#999' }}>
                  {getNomeAcabamento(item.acabamentoEscolhido, acabamentos)}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.qtdCol]}>
                <Text>{item.qtd}</Text>
              </View>
              <View style={[styles.tableCell, styles.precoCol]}>
                <Text>R$ {(item.precoAplicado ?? 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.tableCell, styles.precoCol]}>
                <Text>R$ {((item.precoAplicado ?? 0) * (item.qtd ?? 0)).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Resumo */}
        <View style={styles.resumo}>
          <View style={styles.resumoLine}>
            <Text>Subtotal:</Text>
            <Text>R$ {atendimento.resumoVisual?.subtotal?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.resumoLine}>
            <Text>Descontos:</Text>
            <Text>-R$ {atendimento.resumoVisual?.valorDescontos?.toFixed(2) || '0.00'}</Text>
          </View>
          <View style={styles.resumoLineTotal}>
            <Text>TOTAL:</Text>
            <Text>R$ {atendimento.resumoVisual?.totalFinal?.toFixed(2) || '0.00'}</Text>
          </View>
        </View>

        {/* Payment Info */}
        {atendimento.pagamentos && atendimento.pagamentos.length > 0 && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>FORMAS DE PAGAMENTO</Text>
            {atendimento.pagamentos.map((pag, idx) => (
              <Text key={idx}>
                {pag.forma.toUpperCase()} {pag.parcelas && `- ${pag.parcelas}x`}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Validade deste orçamento: 30 dias</Text>
          <Text style={{ marginTop: 5 }}>
            Este é um orçamento válido. Sujeito à confirmação de estoque.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
