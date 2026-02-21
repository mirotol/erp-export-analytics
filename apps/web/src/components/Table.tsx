interface TableProps {
  columns: string[];
  rows: string[][];
}

export function Table({ columns, rows }: TableProps) {
  return (
    <div className="relative overflow-x-auto border border-(--border) rounded-lg max-h-125 overflow-y-auto">
      <table className="w-full text-base text-left border-collapse">
        <thead className="sticky top-0 bg-(--surface-elevated) z-10 border-b border-(--border)">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-4 py-3 font-semibold text-(--text-primary) whitespace-nowrap"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border-subtle)">
          {rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="hover:bg-(--accent-hover-bg) transition-colors cursor-default"
            >
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-4 py-3 text-(--text-secondary) whitespace-nowrap">
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
