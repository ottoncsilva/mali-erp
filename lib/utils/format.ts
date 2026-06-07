/** Formata um valor numérico como moeda brasileira (R$). */
export function formatBRL(valor: number | undefined | null): string {
  return (valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Formata uma data (Date | Timestamp | string) como dd/mm/aaaa. */
export function formatData(valor: any): string {
  if (!valor) return '-';
  let data: Date;
  if (valor instanceof Date) data = valor;
  else if (typeof valor?.toDate === 'function') data = valor.toDate();
  else data = new Date(valor);
  if (isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR');
}
