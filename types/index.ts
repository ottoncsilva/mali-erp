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
  // Motor de precificação — condições de pagamento
  taxaJurosMensal?: number; // ex.: 0.02 = 2% ao mês (Tabela Price)
  condicoesPagamento?: CondicaoPagamentoConfig[];
}

// Condição de pagamento cadastrável (Configurações › Precificação).
// Alimenta o orçamento, o financeiro e o PDF (fonte única).
export interface CondicaoPagamentoConfig {
  id: string; // 'avista', '1x'...'12x', 'e1'...'e12'
  nome: string; // "À Vista", "3x", "Entrada + 6x"
  tipo: 'avista' | 'parcelado' | 'entrada_parcelado';
  parcelas: number; // nº de parcelas (sem contar a entrada)
  temEntrada: boolean;
  ativo: boolean;
  ordem: number;
}

// Cadastro completo da empresa (doc `empresa/dados`).
// Separado de `empresa/config` (precificação) para não misturar responsabilidades.
export interface DadosEmpresa {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  telefone: string;
  whatsapp?: string;
  email: string;
  site?: string;
  // Endereço estruturado
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  // Identidade visual
  logoURL?: string;
}

// Cargo (perfil de acesso) — dinâmico, editável em Configurações › Cargos.
// O id do documento é a "chave" do cargo, gravada em `usuario.perfil`.
export interface Cargo {
  id: string;
  nome: string;
  permissoes: string[]; // lista de Permissao
  limitePontuacao: number; // trava mínima de pontuação (0 = ilimitado)
  // Comissão por cargo (Configurações › Comissões)
  comissaoAtiva: boolean;
  comissaoPct: number; // % padrão do cargo
  baseComissao: 'vista' | 'proposta' | 'margem';
  modoComissao: 'vendedor' | 'override';
  sistema?: boolean; // cargos padrão não podem ser excluídos
  ativo?: boolean;
}

// Usuários / Colaboradores
export interface Usuario {
  uid: string;
  nome: string;
  email: string;
  perfil: string; // id do cargo (dinâmico) ou 'sem_acesso'
  ativo: boolean;
  avatarURL?: string;
  // Comissão: override do % padrão do cargo (undefined = usa o do cargo)
  comissaoPct?: number;
  // Dados cadastrais do colaborador
  telefone?: string;
  cpf?: string;
  cargoTexto?: string; // cargo/função descritiva livre (RH)
  dataAdmissao?: any;
  pix?: string;
  observacoes?: string;
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

// Depósitos (Localizações Físicas)
export interface Deposito {
  id: string;
  nome: string;
  endereco?: string;
  cidade?: string;
  responsavel?: string; // User ID do gerente de depósito
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Endereço estruturado (usado por Especificador)
export interface EnderecoEstruturado {
  cep: string; // 12345-678
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

// Especificadores (indicadores que recebem comissão sobre a venda)
export interface Especificador {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cpfCnpj: string;
  endereco: EnderecoEstruturado;
  pix: string;
  comissao: number; // percentual 0..100
  ativo: boolean;
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
  // Especificador (indicador) — opcional. Captura comissão no momento da venda.
  especificadorId?: string;
  especificadorNome?: string;
  especificadorComissao?: number; // percentual aplicado
  especificadorComissaoValor?: number; // valor em R$ a pagar ao especificador
  itens: ItemAtendimento[];
  resumoVisual: {
    subtotal: number; // soma à vista (preço de tabela)
    valorDescontos: number;
    totalFinal: number; // valor da proposta (com juros da condição)
    pontuacaoMedia: number;
    precoVista?: number; // total à vista já com desconto (sem juros)
    descontoPercentual?: number;
  };
  // Condição de pagamento escolhida + plano de parcelas (com datas).
  pagamento?: {
    condicaoId: string;
    condicaoNome: string;
    valorProposta: number; // total com juros
    entrada: number; // valor da entrada (0 se não houver)
    parcelas: Array<{
      numero: number;
      valor: number;
      vencimento: Date;
    }>;
  };
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
  descricao?: string;
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
  descricao?: string;
}

// ===================== FILTROS =====================

export type StatusEstoqueFiltro = 'abaixo' | 'normal' | 'zerado';

export interface FiltroEstoque {
  depositoIds: string[];
  // Seleção múltipla de status. Vazio = todos.
  statusEstoque: StatusEstoqueFiltro[];
  textoBusca: string;
}

export interface FiltroProduto {
  textoBusca: string;
  categoriaIds: string[];
  estoqueQuantidadeMin?: number;
  estoqueQuantidadeMax?: number;
  status: 'ativo' | 'inativo' | 'todos';
}
