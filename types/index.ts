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

// Variáveis de Acabamento
export interface VariavelAcabamento {
  id: string;
  tipo: 'tecido' | 'cor_madeira' | 'lateralidade' | 'outro';
  nomeDaOpcao: string;
  ativo: boolean;
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
  acabamentosDisponiveis: string[]; // IDs de VariavelAcabamento
  fotos: string[]; // URLs do Firebase Storage
  fotoPrincipal: string;
  custoProduto: number;
  icms: number;
  ipi: number;
  frete: number;
  tipoPontuacao: 'padrao' | 'especial';
  pontuacaoEspecial?: number;
  estoqueMinimo: number;
  estoqueAtual: number;
  status: 'ativo' | 'inativo' | 'esgotado';
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
  acabamentoEscolhido: string;
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
