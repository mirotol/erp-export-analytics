interface TableProps {
  columns: string[];
  rows: string[][];
}

export function Table({ columns, rows }: TableProps) {
  return (
    <div className="relative overflow-x-auto border border-border rounded-lg max-h-[500px] overflow-y-auto">
      <table className="w-full text-base text-left border-collapse">
        <thead className="sticky top-0 bg-surface-hover z-10 border-b border-border">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover:bg-surface-hover/50 transition-colors">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
