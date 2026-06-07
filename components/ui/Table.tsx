import { ReactNode } from 'react';

interface TableProps {
  columns: Array<{ header: string; accessor: string; width?: string; render?: (value: any, row: any) => ReactNode }>;
  data: any[];
  loading?: boolean;
  emptyMessage?: string;
  // Permite que conteúdo (ex.: popovers em hover) "escape" das bordas da tabela.
  allowOverflow?: boolean;
}

export function Table({ columns, data, loading, emptyMessage = 'Nenhum registro encontrado', allowOverflow }: TableProps) {
  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className={`${allowOverflow ? 'overflow-visible' : 'overflow-x-auto'} rounded-lg border border-border`}>
      <table className="w-full text-sm">
        <thead className="bg-card border-b border-border">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-3 text-left font-semibold text-foreground"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-border hover:bg-card/50 transition-colors"
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className="px-6 py-4 text-foreground">
                  {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
