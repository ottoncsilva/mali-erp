/**
 * Geração de links de WhatsApp com mensagens pré-formatadas.
 *
 * Centraliza a montagem de URLs `wa.me` e os templates de mensagem usados pelo
 * CRM (envio de orçamento, follow-up, cobrança). Mantém um tom profissional e
 * usa os dados denormalizados do atendimento (não depende da coleção clientes).
 */

import { Atendimento } from '@/types';
import { formatBRL } from './format';

/** Remove tudo que não for dígito e garante o DDI 55 (Brasil). */
export function normalizarTelefone(telefone: string | undefined | null): string {
  const d = (telefone || '').replace(/\D/g, '');
  if (!d) return '';
  // Já tem DDI 55 (12 ou 13 dígitos com DDD + número).
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d;
  // Número nacional (10 ou 11 dígitos) — prefixa o DDI.
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

/** Monta a URL wa.me com a mensagem (já codificada). */
export function linkWhatsApp(telefone: string | undefined | null, mensagem?: string): string {
  const fone = normalizarTelefone(telefone);
  const base = fone ? `https://wa.me/${fone}` : 'https://wa.me/';
  if (!mensagem) return base;
  return `${base}?text=${encodeURIComponent(mensagem)}`;
}

interface ContextoMensagem {
  nomeEmpresa?: string;
  linkOrcamento?: string; // URL pública do orçamento
}

/** Primeiro nome do cliente (saudação mais próxima). */
function primeiroNome(nome: string | undefined): string {
  return (nome || '').trim().split(/\s+/)[0] || 'tudo bem';
}

/** Mensagem de envio do orçamento ao cliente. */
export function mensagemOrcamento(
  atendimento: Pick<Atendimento, 'clienteNome' | 'resumoVisual' | 'id'>,
  ctx: ContextoMensagem = {}
): string {
  const nome = primeiroNome(atendimento.clienteNome);
  const total = formatBRL(atendimento.resumoVisual?.totalFinal);
  const empresa = ctx.nomeEmpresa || 'nossa loja';
  const linhas = [
    `Olá, ${nome}! Tudo bem? 😊`,
    ``,
    `Aqui é da ${empresa}. Preparei seu orçamento no valor de *${total}*.`,
  ];
  if (ctx.linkOrcamento) {
    linhas.push(``, `Você pode ver todos os detalhes neste link:`, ctx.linkOrcamento);
  }
  linhas.push(``, `Qualquer dúvida estou à disposição! 🛋️`);
  return linhas.join('\n');
}

/** Mensagem de follow-up (retomar contato). */
export function mensagemFollowUp(
  atendimento: Pick<Atendimento, 'clienteNome'>,
  ctx: ContextoMensagem = {}
): string {
  const nome = primeiroNome(atendimento.clienteNome);
  const empresa = ctx.nomeEmpresa || 'nossa loja';
  return [
    `Olá, ${nome}! 😊`,
    ``,
    `Passando para saber se você teve a chance de avaliar o orçamento que preparei na ${empresa}.`,
    `Posso ajudar com alguma dúvida ou ajustar alguma condição? Fico no aguardo!`,
  ].join('\n');
}

/** Mensagem de lembrete de parcela / cobrança amigável. */
export function mensagemCobranca(
  clienteNome: string | undefined,
  valor: number,
  vencimento: Date,
  ctx: ContextoMensagem = {}
): string {
  const nome = primeiroNome(clienteNome);
  const empresa = ctx.nomeEmpresa || 'nossa loja';
  const data = vencimento.toLocaleDateString('pt-BR');
  return [
    `Olá, ${nome}! 😊`,
    ``,
    `Aqui é da ${empresa}. Passando para lembrar da parcela de *${formatBRL(valor)}* com vencimento em *${data}*.`,
    `Se já efetuou o pagamento, por favor desconsidere. Obrigado!`,
  ].join('\n');
}
