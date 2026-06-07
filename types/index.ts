// Empresa
export interface Empresa {
  nome: string;
  cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  logoURL?: string;
  pontuacaoPadrao: number;
  limitesPontuacao: {
    vendedor: number;
    gerencia: number;
  };
  diasValidadeOrcamento: number;
}

// Usuários
export interface Usuario {
  uid: string;
  nome: string;
  email: string;
  perfil: 'admin' | 'gerencia' | 'vendedor' | 'comprador' | 'financeiro' | 'estoquista';
  ativo: boolean;
  avatarURL?: string;
  comissaoPct?: number;
}

// Categorias
export interface Categoria {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  subcategorias: string[];
}

// Fornecedores
export interface Fornecedor {
  id: string;
  razaoSocial: string;
  cnpj: string;
  contatos: string[];
  endereco: string;
  observacoes?: string;
  prazoEntregaDias: number;
}

// Produtos
export interface Produto {
  id: string;
  nome: string;
  sku: string;
  categoriaId: string;
  fornecedorId: string;
  fotos: string[]; // URLs do Firebase Storage
  fotoPrincipal: string;
  custoProduto: number;
  icms: number;
  ipi: number;
  frete: number;
  tipoPontuacao: 'padrao' | 'especial';
  pontuacaoEspecial?: number;
  estoqueMinimo: number;
  estoqueAtual: number; // soma de todas as localizações disponíveis (denormalizado)
  localizacaoPadrao?: LocalizacaoEstoque; // local padrão ao receber compras
  status: 'ativo' | 'inativo' | 'esgotado';
  criadoEm: Date;
  atualizadoEm: Date;
}

// ===================== ESTOQUE & COMPRAS =====================

// Localizações físicas do estoque
export type LocalizacaoEstoque = 'comprado' | 'showroom' | 'deposito' | 'entrega';

export const LOCALIZACOES: Record<LocalizacaoEstoque, string> = {
  comprado: 'Comprado / Em Trânsito',
  showroom: 'Showroom',
  deposito: 'Depósito',
  entrega: 'Em Entrega',
};

// Localizações consideradas disponíveis para venda imediata
export const LOCALIZACOES_DISPONIVEIS: LocalizacaoEstoque[] = ['showroom', 'deposito'];

// Saldo de estoque de um produto em uma localização específica.
// Documento com id composto: `${produtoId}_${localizacao}`
export interface EstoqueItem {
  id: string;
  produtoId: string;
  produtoNome: string; // denormalizado para exibição
  produtoSku: string; // denormalizado para exibição
  localizacao: LocalizacaoEstoque;
  quantidade: number;
  quantidadeReservada: number; // reservada para vendas/entregas pendentes
  criadoEm: Date;
  atualizadoEm: Date;
}

// Movimentação de estoque (trilha de auditoria — imutável)
export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  produtoNome: string;
  tipo: 'entrada' | 'saida' | 'ajuste' | 'transferencia';
  localizacaoOrigem?: LocalizacaoEstoque; // para saida/transferencia
  localizacaoDestino?: LocalizacaoEstoque; // para entrada/transferencia
  quantidade: number;
  referenciaTipo: 'pedido_compra' | 'nota_fiscal' | 'atendimento' | 'ajuste_manual' | 'transferencia';
  referenciaId?: string;
  motivo?: string;
  registradoPorId: string;
  registradoPorNome?: string;
  criadoEm: Date;
}

// Item de um pedido de compra
export interface ItemPedidoCompra {
  produtoId: string; // pode ser produto já existente
  nomeProduto: string; // denormalizado
  skuProduto: string;
  quantidade: number;
  custoUnitario: number; // custo previsto por unidade
  icms: number; // % ou valor por unidade (alinhar com Produto)
  ipi: number;
}

// Pedido de compra
export interface PedidoCompra {
  id: string;
  numero: string; // sequencial legível, ex: PC-2026-0001
  fornecedorId: string;
  fornecedorNome: string; // denormalizado
  itens: ItemPedidoCompra[];
  freteEstimado: number;
  totalEstimado: number; // soma dos itens + frete
  prazoEntregaEstimado?: Date;
  status: 'pedido' | 'em_transito' | 'recebido' | 'faturado' | 'cancelado';
  origem: 'manual' | 'encomenda'; // encomenda = disparada por venda sob encomenda
  atendimentoOrigemId?: string; // se veio de uma venda sob encomenda
  criadoPorId: string;
  aprovadoPorId?: string;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Item de uma nota fiscal (com rateio de frete e CMV calculado)
export interface ItemNotaFiscal {
  produtoId: string;
  nomeProduto: string;
  skuProduto: string;
  quantidade: number;
  custoUnitario: number; // da nota
  subtotal: number; // custoUnitario * quantidade
  icms: number; // valor total de ICMS do item
  ipi: number; // valor total de IPI do item
  freteRateado: number; // parcela do frete alocada a este item
  cmvUnitario: number; // (custo + frete rateado/qtd + icms/qtd + ipi/qtd)
  cmvTotal: number; // cmvUnitario * quantidade
}

// Nota fiscal de entrada (compra)
export interface NotaFiscal {
  id: string;
  numero: string; // número da NF-e do fornecedor
  serie: string;
  fornecedorId: string;
  fornecedorNome: string;
  pedidoCompraId?: string; // vínculo opcional ao pedido
  dataEmissao: Date;
  dataEntrada: Date; // quando registrada no sistema
  itens: ItemNotaFiscal[];
  freteTotal: number;
  subtotalProdutos: number;
  icmsTotal: number;
  ipiTotal: number;
  valorTotal: number; // subtotal + frete + ipi (conforme regra fiscal)
  localizacaoDestino: LocalizacaoEstoque; // para onde entra o estoque (padrão: comprado)
  status: 'rascunho' | 'registrada' | 'cancelada';
  registradaPorId: string;
  observacoes?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Clientes
export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefoneWhatsapp: string;
  endereco: string;
  enderecoEntrega?: string;
  classificacao: 'novo' | 'recorrente' | 'vip';
  criadoEm: Date;
}

// Item do Atendimento
export interface ItemAtendimento {
  produtoId: string;
  nome: string;
  foto: string;
  qtd: number;
  cmvUnitario: number;
  precoTabela: number;
  precoAplicado: number;
  descontoConcedido: number;
  pontuacaoReal: number;
}

// Atendimentos (Orçamentos e Vendas)
export interface Atendimento {
  id: string;
  tipo: 'orcamento' | 'venda';
  pipelineVendedor: 'novo' | 'negociando' | 'esfriou' | 'quente';
  status: 'pendente' | 'aprovado' | 'convertido' | 'finalizado' | 'cancelado';
  clienteId: string;
  // Dados denormalizados do cliente (para exibição na página pública sem
  // expor a coleção de clientes). Preenchidos na criação do atendimento.
  clienteNome?: string;
  clienteTelefone?: string;
  vendedorId: string;
  itens: ItemAtendimento[];
  resumoVisual: {
    subtotal: number;
    valorDescontos: number;
    totalFinal: number;
    pontuacaoMedia: number;
  };
  pagamentos: Array<{
    forma: 'pix' | 'cartao' | 'dinheiro' | 'cheque';
    valor: number;
    parcelas?: number;
  }>;
  logistica?: {
    statusEntrega: 'agendada' | 'em_rota' | 'entregue' | 'montada' | 'problema';
    dataAgendada?: Date;
    observacoes?: string;
  };
  aprovadorId?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Assistência Técnica
export interface AssistenciaTecnica {
  id: string;
  atendimentoId: string;
  clienteId: string;
  problemaRelatado: string;
  status: 'aberto' | 'aguardando_peca' | 'visita_agendada' | 'resolvido';
  solicitacaoPeca?: {
    fornecedorId: string;
    nomePeca: string;
    quantidade: number;
  };
  dataVisita?: Date;
  resolvidoEm?: Date;
}

// Financeiro
export interface ContaReceber {
  id: string;
  referenciaId: string;
  parcelas: Array<{
    numero: number;
    valor: number;
    vencimento: Date;
    pago: boolean;
    pagoEm?: Date;
  }>;
  valorTotal: number;
  status: 'aberto' | 'parcial' | 'pago' | 'vencido';
}

export interface ContaPagar {
  id: string;
  referenciaId: string;
  parcelas: Array<{
    numero: number;
    valor: number;
    vencimento: Date;
    pago: boolean;
    pagoEm?: Date;
  }>;
  valorTotal: number;
  status: 'aberto' | 'parcial' | 'pago' | 'vencido';
}
