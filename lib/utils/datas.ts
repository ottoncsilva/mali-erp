/**
 * Utilitários de data compartilhados.
 *
 * O Firestore devolve datas como `Timestamp`, mas no app elas também podem ser
 * `Date` ou `string` (ISO). `toDate` normaliza tudo para `Date | null`.
 */

/** Converte Timestamp | Date | string em Date de forma segura. */
export function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** True se `data` está dentro do intervalo [inicio, fim] (inclusive). */
export function dentroDoPeriodo(data: Date | null, inicio: Date, fim: Date): boolean {
  if (!data) return false;
  return data >= inicio && data <= fim;
}

export const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export const MESES_LONGOS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/** Início (00:00:00) e fim (23:59:59) de um mês específico. */
export function intervaloMes(ano: number, mes: number): { inicio: Date; fim: Date } {
  return {
    inicio: new Date(ano, mes, 1, 0, 0, 0, 0),
    fim: new Date(ano, mes + 1, 0, 23, 59, 59, 999),
  };
}

/** Diferença em dias inteiros entre duas datas (b - a). */
export function diferencaDias(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
