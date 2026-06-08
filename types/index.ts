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
  // Follow-up / lembrete de contato (CRM ativo). Preenchido pelo vendedor.
  followUp?: {
    data: Date; // quando voltar a contatar o cliente
    observacao?: string;
    concluido?: boolean;
    concluidoEm?: Date;
  };
  criadoEm: Date;
  atualizadoEm: Date;
}

// Entrega & Montagem (coleção `entregas`)
export type StatusEntrega = 'agendada' | 'em_rota' | 'entregue' | 'montada' | 'problema';

export interface Entrega {
  id: string;
  atendimentoId?: string; // venda de origem (opcional p/ avulsa)
  clienteId?: string;
  clienteNome: string;
  clienteTelefone?: string;
  dataAgendada: Date;
  turno: 'manha' | 'tarde';
  status: StatusEntrega;
  enderecoEntrega: string;
  observacoes?: string;
  montador?: string;
  // Comprovação de entrega
  fotoComprovante?: string;
  assinaturaURL?: string;
  entregueEm?: Date;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

// Assistência Técnica (coleção `assistencia_tecnica`)
export type StatusChamado = 'aberto' | 'aguardando_peca' | 'visita_agendada' | 'resolvido';

export interface AssistenciaTecnica {
  id: string;
  atendimentoId?: string;
  clienteId?: string;
  clienteNome: string;
  clienteTelefone?: string;
  problemaRelatado: string;
  status: StatusChamado;
  solicitacaoPeca?: {
    fornecedorId?: string;
    nomePeca: string;
    quantidade: number;
  };
  tecnico?: string;
  dataAbertura?: Date;
  dataVisita?: Date;
  resolvidoEm?: Date;
  observacoes?: string;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

// ===================== FINANCEIRO =====================

// Forma de pagamento/recebimento (registrada na baixa — regime de caixa).
export type FormaPagamento =
  | 'dinheiro'
  | 'pix'
  | 'cartao_credito'
  | 'cartao_debito'
  | 'boleto'
  | 'transferencia'
  | 'cheque'
  | 'outro';

// Plano de contas: classifica cada lançamento e define onde ele entra na DRE.
export type TipoCategoriaFinanceira = 'receita' | 'despesa';

export type GrupoDRE =
  | 'receita_bruta' // vendas de mercadorias/serviços
  | 'deducoes' // impostos sobre venda, devoluções
  | 'cmv' // custo das mercadorias vendidas
  | 'despesa_operacional' // aluguel, energia, marketing...
  | 'despesa_pessoal' // salários, comissões, encargos
  | 'despesa_financeira' // juros, tarifas bancárias
  | 'outras_receitas' // receitas não operacionais
  | 'nao_operacional'; // aportes, retiradas, investimentos (fora do resultado)

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoCategoriaFinanceira;
  grupoDRE: GrupoDRE;
  cor?: string;
  ativo: boolean;
  sistema?: boolean; // categorias padrão não podem ser excluídas
  criadoEm?: Date;
  atualizadoEm?: Date;
}

// Conta bancária / caixa / carteira digital.
export type TipoContaBancaria = 'caixa' | 'banco' | 'carteira_digital' | 'outro';

export interface ContaBancaria {
  id: string;
  nome: string; // "Caixa Loja", "Itaú CC", "PIX"
  tipo: TipoContaBancaria;
  banco?: string;
  agencia?: string;
  conta?: string;
  saldoInicial: number;
  saldoAtual: number; // denormalizado; recalculado a cada movimento
  ativo: boolean;
  cor?: string;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

// De onde nasceu o título.
export type OrigemConta = 'venda' | 'compra' | 'comissao' | 'especificador' | 'manual';

// Status (armazenado) do título. "vencido" é derivado em tela a partir das datas.
export type StatusConta = 'aberto' | 'parcial' | 'pago' | 'cancelado';

// Parcela de um título (a pagar ou a receber).
export interface ParcelaConta {
  numero: number;
  valor: number; // valor original (regime de competência)
  vencimento: Date;
  pago: boolean;
  pagoEm?: Date;
  // Dados da baixa (regime de caixa)
  valorPago?: number; // efetivamente movimentado (com juros/multa/desconto)
  juros?: number;
  multa?: number;
  desconto?: number;
  contaBancariaId?: string; // conta de liquidação
  formaPagamento?: FormaPagamento;
  movimentoId?: string; // movimento de caixa gerado pela baixa
}

// Título a receber.
export interface ContaReceber {
  id: string;
  origem: OrigemConta;
  referenciaId?: string; // atendimento/venda que originou
  clienteId?: string;
  contraparteNome?: string; // cliente (denormalizado)
  categoriaId?: string;
  dataCompetencia?: Date; // data do fato gerador (regime de competência)
  parcelas: ParcelaConta[];
  valorTotal: number;
  status: StatusConta;
  descricao?: string;
  observacoes?: string;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

// Título a pagar.
export interface ContaPagar {
  id: string;
  origem: OrigemConta;
  referenciaId?: string; // atendimento/nota/comissão que originou
  fornecedorId?: string;
  colaboradorId?: string; // quando for comissão de colaborador
  contraparteNome?: string; // fornecedor/colaborador (denormalizado)
  categoriaId?: string;
  dataCompetencia?: Date;
  parcelas: ParcelaConta[];
  valorTotal: number;
  status: StatusConta;
  descricao?: string;
  observacoes?: string;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

// Movimento de caixa: registro imutável de entrada/saída de dinheiro numa conta.
// É a base do regime de CAIXA (DRE e fluxo realizado) e do extrato bancário.
export type TipoMovimento = 'entrada' | 'saida' | 'transferencia';

export interface MovimentoCaixa {
  id: string;
  contaBancariaId: string;
  contaBancariaNome?: string;
  tipo: TipoMovimento;
  valor: number; // sempre positivo
  data: Date; // data efetiva do caixa
  categoriaId?: string;
  categoriaNome?: string;
  descricao: string;
  origemTipo: 'conta_receber' | 'conta_pagar' | 'transferencia' | 'ajuste';
  origemId?: string; // título de origem
  parcelaNumero?: number;
  contraContaId?: string; // conta destino (transferência)
  formaPagamento?: FormaPagamento;
  registradoPorId?: string;
  registradoPorNome?: string;
  criadoEm?: Date;
  // Conciliação bancária: confronto do movimento do sistema com o extrato real.
  conciliado?: boolean;
  conciliadoEm?: Date;
  conciliadoPorId?: string;
  // Quando o movimento nasce de uma importação de extrato (OFX), guarda o id
  // da transação no extrato para evitar duplicidade.
  fitId?: string;
}

// ===================== METAS DE VENDAS =====================

// Meta de faturamento mensal. Pode ser da loja (vendedorId vazio) ou de um
// vendedor específico. Id composto: `${ano}-${mes}` (loja) ou
// `${vendedorId}_${ano}-${mes}` (vendedor).
export interface Meta {
  id: string;
  ano: number;
  mes: number; // 0-11 (janeiro = 0)
  vendedorId?: string; // vazio/ausente = meta global da loja
  vendedorNome?: string;
  valorMeta: number;
  criadoEm?: Date;
  atualizadoEm?: Date;
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
