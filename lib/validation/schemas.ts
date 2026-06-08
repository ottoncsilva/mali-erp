/**
 * Esquemas Zod para validação de formulários.
 * Centraliza regras de validação em um único lugar.
 */

import { z } from 'zod';

// Schemas de Cliente
export const SchemaPessoa = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
});

export const SchemaCliente = SchemaPessoa.extend({
  telefoneWhatsapp: z.string().optional(),
  endereco: z.string().optional(),
  observacoes: z.string().optional(),
});

// Schemas de Produto
export const SchemaProduto = z.object({
  nome: z.string().min(2, 'Nome do produto obrigatório'),
  sku: z.string().min(1, 'SKU obrigatório'),
  categoriaId: z.string().min(1, 'Categoria obrigatória'),
  fornecedorId: z.string().min(1, 'Fornecedor obrigatório'),
  custoProduto: z.number().min(0, 'Custo deve ser >= 0'),
  icms: z.number().min(0, 'ICMS deve ser >= 0'),
  ipi: z.number().min(0, 'IPI deve ser >= 0'),
  frete: z.number().min(0, 'Frete deve ser >= 0'),
  estoqueMinimo: z.number().min(0, 'Estoque mínimo deve ser >= 0'),
  tipoPontuacao: z.enum(['padrao', 'especial']),
  pontuacaoEspecial: z.number().optional(),
});

// Schemas Financeiros
export const SchemaContaBancaria = z.object({
  nome: z.string().min(2, 'Nome da conta obrigatório'),
  tipo: z.enum(['caixa', 'banco', 'carteira_digital', 'outro']),
  banco: z.string().optional(),
  agencia: z.string().optional(),
  conta: z.string().optional(),
  saldoInicial: z.number().min(0, 'Saldo inicial deve ser >= 0'),
  cor: z.string().optional(),
});

export const SchemaLancamento = z.object({
  tipo: z.enum(['receber', 'pagar']),
  descricao: z.string().min(3, 'Descrição deve ter ao menos 3 caracteres'),
  categoriaId: z.string().min(1, 'Categoria obrigatória'),
  valor: z.number().min(0.01, 'Valor deve ser maior que 0'),
  vencimento: z.date(),
  contraparteNome: z.string().optional(),
});

export const SchemaBaixa = z.object({
  dataRecebimento: z.date(),
  contaBancariaId: z.string().min(1, 'Conta bancária obrigatória'),
  formaPagamento: z.enum([
    'dinheiro',
    'pix',
    'cartao_credito',
    'cartao_debito',
    'boleto',
    'transferencia',
    'cheque',
    'outro',
  ]),
  valorPago: z.number().min(0, 'Valor deve ser >= 0'),
  juros: z.number().min(0, 'Juros deve ser >= 0').default(0),
  multa: z.number().min(0, 'Multa deve ser >= 0').default(0),
  desconto: z.number().min(0, 'Desconto deve ser >= 0').default(0),
  observacoes: z.string().optional(),
});

// Helper para converter erros Zod para objeto amigável
export function formatarErrosZod(erros: z.ZodError): Record<string, string> {
  return erros.flatten().fieldErrors as Record<string, string>;
}

// Tipo helper
export type InferSchema<T extends z.ZodType> = z.infer<T>;
