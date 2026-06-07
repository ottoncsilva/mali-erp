/**
 * Fonte única de verdade para perfis, permissões e travas de negociação.
 *
 * Em vez de espalhar checagens `if (perfil === 'admin')` pelo código, todo
 * acesso passa por uma permissão granular (`Permissao`). Cada perfil mapeia
 * para um conjunto de permissões em `PERMISSOES_POR_PERFIL`. A UI usa o helper
 * `can(perfil, permissao)`; a matriz do CLAUDE.md vira código aqui.
 */

// Perfis do sistema. `sem_acesso` é o estado de um usuário recém-criado que
// ainda não foi liberado por um administrador.
export type Perfil =
  | 'admin'
  | 'gerencia'
  | 'vendedor'
  | 'comprador'
  | 'financeiro'
  | 'estoquista'
  | 'sem_acesso';

// Perfis que podem ser atribuídos na tela de gestão de usuários
// (exclui `sem_acesso`, que é apenas um estado transitório).
export const PERFIS_ATRIBUIVEIS: Exclude<Perfil, 'sem_acesso'>[] = [
  'admin',
  'gerencia',
  'vendedor',
  'comprador',
  'financeiro',
  'estoquista',
];

export const PERFIL_LABEL: Record<Perfil, string> = {
  admin: 'Administrador',
  gerencia: 'Gerência',
  vendedor: 'Vendedor',
  comprador: 'Comprador',
  financeiro: 'Financeiro',
  estoquista: 'Estoquista',
  sem_acesso: 'Sem acesso',
};

export const PERFIL_DESCRICAO: Record<Exclude<Perfil, 'sem_acesso'>, string> = {
  admin: 'Acesso total ao sistema, sem travas de preço.',
  gerencia: 'Vendas, financeiro, catálogo e configurações. Trava 1.5x.',
  vendedor: 'CRM, orçamentos e PDV. Trava 1.8x. Não vê custo nem financeiro.',
  comprador: 'Catálogo, estoque, compras e custos. Não vende.',
  financeiro: 'Contas a pagar/receber, relatórios e DRE.',
  estoquista: 'Consulta e movimentação de estoque.',
};

// Permissões granulares. Pense nelas como "o que a pessoa pode fazer", não
// "quem ela é".
export type Permissao =
  // Dashboard
  | 'dashboard.completo' // KPIs financeiros completos (senão, resumido)
  // Vendas / CRM / PDV
  | 'vendas.acessar' // clientes, orçamentos, carteira, especificadores
  | 'pdv.usar' // abrir o balcão e fechar venda/orçamento
  // Custos
  | 'custo.ver' // ver CMV, custo de produto, margem
  // Financeiro
  | 'financeiro.acessar'
  | 'dre.ver'
  // Estoque & Compras
  | 'estoque.acessar'
  | 'compras.acessar'
  | 'catalogo.gerir' // produtos, categorias, fornecedores
  // Operações
  | 'operacoes.acessar' // entregas, assistência técnica
  // Configurações
  | 'config.precificacao'
  | 'config.empresa'
  | 'usuarios.gerir';

const TODAS_PERMISSOES: Permissao[] = [
  'dashboard.completo',
  'vendas.acessar',
  'pdv.usar',
  'custo.ver',
  'financeiro.acessar',
  'dre.ver',
  'estoque.acessar',
  'compras.acessar',
  'catalogo.gerir',
  'operacoes.acessar',
  'config.precificacao',
  'config.empresa',
  'usuarios.gerir',
];

export const PERMISSOES_POR_PERFIL: Record<Perfil, Permissao[]> = {
  admin: [...TODAS_PERMISSOES],
  gerencia: [
    'dashboard.completo',
    'vendas.acessar',
    'pdv.usar',
    'custo.ver',
    'financeiro.acessar',
    'dre.ver',
    'estoque.acessar',
    'compras.acessar',
    'catalogo.gerir',
    'operacoes.acessar',
    'config.precificacao',
    'usuarios.gerir',
  ],
  vendedor: ['vendas.acessar', 'pdv.usar'],
  comprador: ['custo.ver', 'estoque.acessar', 'compras.acessar', 'catalogo.gerir'],
  financeiro: ['financeiro.acessar', 'dre.ver'],
  estoquista: ['estoque.acessar'],
  sem_acesso: [],
};

/** Trava mínima de pontuação por perfil (negócio). 0 = ilimitado. */
export const LIMITE_PONTUACAO: Record<Perfil, number> = {
  admin: 0,
  gerencia: 1.5,
  vendedor: 1.8,
  comprador: 0,
  financeiro: 0,
  estoquista: 0,
  sem_acesso: 0,
};

// ===================== Comissões =====================

/** Base de cálculo da comissão (forma de remuneração). */
export type BaseComissao = 'vista' | 'proposta' | 'margem';

export const BASE_COMISSAO_LABEL: Record<BaseComissao, string> = {
  vista: 'Preço à vista (líquido)',
  proposta: 'Valor total da proposta',
  margem: 'Margem (preço − CMV)',
};

/**
 * Modo de atribuição da comissão do cargo numa venda:
 * - `vendedor`: paga apenas ao colaborador que FECHOU a venda (se for deste cargo).
 * - `override`: paga a TODOS os colaboradores ativos do cargo em toda venda
 *   (override gerencial, ex.: gerente ganha um % sobre todas as vendas).
 */
export type ModoComissao = 'vendedor' | 'override';

export const MODO_COMISSAO_LABEL: Record<ModoComissao, string> = {
  vendedor: 'Quem fechou a venda',
  override: 'Todos do cargo (override)',
};

// ===================== Metadados de permissão (UI) =====================

export const PERMISSAO_LABEL: Record<Permissao, string> = {
  'dashboard.completo': 'Dashboard completo (KPIs financeiros)',
  'vendas.acessar': 'Vendas — clientes, orçamentos, carteira',
  'pdv.usar': 'PDV — abrir balcão e fechar venda',
  'custo.ver': 'Ver custo / CMV / margem',
  'financeiro.acessar': 'Financeiro — contas a pagar/receber',
  'dre.ver': 'DRE / apuração',
  'estoque.acessar': 'Estoque',
  'compras.acessar': 'Compras',
  'catalogo.gerir': 'Catálogo — produtos, categorias, fornecedores',
  'operacoes.acessar': 'Operações — entregas, assistência',
  'config.precificacao': 'Configurar precificação',
  'config.empresa': 'Configurar dados da empresa',
  'usuarios.gerir': 'Gerir usuários, cargos e comissões',
};

/** Agrupamento das permissões para exibição em tela. */
export const GRUPOS_PERMISSAO: { grupo: string; permissoes: Permissao[] }[] = [
  { grupo: 'Vendas', permissoes: ['vendas.acessar', 'pdv.usar', 'dashboard.completo'] },
  { grupo: 'Financeiro', permissoes: ['financeiro.acessar', 'dre.ver', 'custo.ver'] },
  {
    grupo: 'Catálogo & Estoque',
    permissoes: ['estoque.acessar', 'compras.acessar', 'catalogo.gerir'],
  },
  { grupo: 'Operações', permissoes: ['operacoes.acessar'] },
  {
    grupo: 'Configurações',
    permissoes: ['config.precificacao', 'config.empresa', 'usuarios.gerir'],
  },
];

export function getTodasPermissoes(): Permissao[] {
  return [...TODAS_PERMISSOES];
}

// ===================== Cargos padrão (seed do Firestore) =====================

export interface CargoPadrao {
  id: Exclude<Perfil, 'sem_acesso'>;
  nome: string;
  permissoes: Permissao[];
  limitePontuacao: number;
  comissaoAtiva: boolean;
  comissaoPct: number;
  baseComissao: BaseComissao;
  modoComissao: ModoComissao;
  sistema: true;
}

/**
 * Cargos padrão usados para popular a coleção `cargos` no primeiro acesso à
 * tela de cargos. São marcados como `sistema` (não podem ser excluídos).
 */
export const CARGOS_PADRAO: CargoPadrao[] = PERFIS_ATRIBUIVEIS.map((id) => ({
  id,
  nome: PERFIL_LABEL[id],
  permissoes: PERMISSOES_POR_PERFIL[id],
  limitePontuacao: LIMITE_PONTUACAO[id],
  comissaoAtiva: id === 'vendedor' || id === 'gerencia',
  comissaoPct: id === 'vendedor' ? 3 : id === 'gerencia' ? 1 : 0,
  baseComissao: 'vista',
  modoComissao: id === 'gerencia' ? 'override' : 'vendedor',
  sistema: true,
}));

/** Verifica se um perfil possui determinada permissão. */
export function can(perfil: Perfil | undefined | null, permissao: Permissao): boolean {
  if (!perfil) return false;
  return PERMISSOES_POR_PERFIL[perfil]?.includes(permissao) ?? false;
}

/** Verifica se o perfil possui ao menos uma das permissões informadas. */
export function canAny(perfil: Perfil | undefined | null, permissoes: Permissao[]): boolean {
  return permissoes.some((p) => can(perfil, p));
}

/** Verifica se o perfil está entre os informados. */
export function temPerfil(perfil: Perfil | undefined | null, perfis: Perfil[]): boolean {
  return !!perfil && perfis.includes(perfil);
}

/** Trava de pontuação mínima do perfil. */
export function limitePontuacao(perfil: Perfil | undefined | null): number {
  if (!perfil) return 0;
  return LIMITE_PONTUACAO[perfil] ?? 0;
}

/**
 * E-mails que recebem perfil admin automaticamente no primeiro acesso
 * (bootstrap). Configurável via NEXT_PUBLIC_ADMIN_EMAILS (separados por vírgula).
 */
export function emailEhAdminBootstrap(email: string | null | undefined): boolean {
  if (!email) return false;
  const lista = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}
