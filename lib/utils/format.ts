/** Formata um valor numérico como moeda brasileira (R$). */
export function formatBRL(valor: number | undefined | null): string {
  return (valor ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/** Remove tudo que não for dígito. */
export function somenteDigitos(valor: string): string {
  return (valor || '').replace(/\D/g, '');
}

/** Máscara de CEP: 00000-000. */
export function mascaraCEP(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** Máscara de telefone: (00) 00000-0000 ou (00) 0000-0000. */
export function mascaraTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Máscara de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00). */
export function mascaraCpfCnpj(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export interface EnderecoViaCEP {
  rua: string;
  bairro: string;
  cidade: string;
  uf: string;
}

/** Consulta o ViaCEP. Retorna null se o CEP for inválido/não encontrado. */
export async function buscarCEP(cep: string): Promise<EnderecoViaCEP | null> {
  const d = somenteDigitos(cep);
  if (d.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${d}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      rua: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      uf: data.uf || '',
    };
  } catch {
    return null;
  }
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
