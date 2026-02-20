import { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SearchX,
  Table as TableIcon,
  BarChart3,
} from "lucide-react";
import type { ReportResult } from "../lib/api";
import { ReportChart } from "./ReportChart";

interface ReportResultsProps {
  result: ReportResult;
}

type SortConfig = {
  key: number;
  direction: "asc" | "desc";
};

function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  return (
    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
      {!active ? (
        <ChevronsUpDown className="w-6 h-6 text-[var(--muted)] opacity-60 group-hover:opacity-100 transition-opacity" />
      ) : (
        <span className="flex flex-col -space-y-2.5">
          <ChevronUp
            className={`w-5 h-5 ${active && direction === "asc" ? "text-[var(--accent)]" : "text-[var(--muted)] opacity-60"}`}
          />
          <ChevronDown
            className={`w-5 h-5 ${active && direction === "desc" ? "text-[var(--accent)]" : "text-[var(--muted)] opacity-60"}`}
          />
        </span>
      )}
    </div>
  );
}

export function ReportResults({ result }: ReportResultsProps) {
  const [view, setView] = useState<"table" | "chart">("table");

  // Identify numeric columns (metrics)
  const numericColumnIndices = useMemo(() => {
    return result.columns
      .map((_, idx) => {
        // First column is usually the group by column (string)
        if (idx === 0) return -1;
        // Check if values in this column are numeric
        const isNumeric = result.rows.some((row) => !isNaN(parseFloat(row[idx])));
        return isNumeric ? idx : -1;
      })
      .filter((idx) => idx !== -1);
  }, [result.columns, result.rows]);

  // Default metric selection
  const [selectedMetricIdx, setSelectedMetricIdx] = useState(() => {
    const sumIdx = result.columns.findIndex((c) => c.startsWith("sum("));
    if (sumIdx !== -1 && numericColumnIndices.includes(sumIdx)) return sumIdx;

    const countIdx = result.columns.findIndex((c) => c === "count");
    if (countIdx !== -1 && numericColumnIndices.includes(countIdx)) return countIdx;

    return numericColumnIndices.length > 0 ? numericColumnIndices[0] : -1;
  });

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(() => {
    // Default sorting:
    // If sum metric exists -> sort descending by sum
    // Else -> sort descending by count

    // Sum columns usually look like "sum(column)"
    const sumIdx = result.columns.findIndex((c) => c.startsWith("sum("));
    if (sumIdx !== -1) return { key: sumIdx, direction: "desc" };

    const countIdx = result.columns.findIndex((c) => c === "count");
    if (countIdx !== -1) return { key: countIdx, direction: "desc" };

    return null;
  });

  const sortedRows = useMemo(() => {
    if (!sortConfig) return result.rows;

    return [...result.rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      // Try to compare as numbers
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      // Fallback to string comparison
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [result.rows, sortConfig]);

  const handleSort = (index: number) => {
    setSortConfig((prev) => {
      if (prev?.key === index) {
        return { key: index, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: index, direction: "desc" };
    });
  };

  if (result.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-[var(--surface-elevated)] rounded-full flex items-center justify-center mb-4">
          <SearchX className="w-8 h-8 text-[var(--muted)]" />
        </div>
        <h3 className="text-lg font-medium text-[var(--text-primary)]">No results found</h3>
        <p className="text-[var(--text-secondary)] mt-1">No results match your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Context */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-[var(--text-primary)]">Report Results</h3>
        <div className="text-base text-[var(--text-secondary)] flex gap-4">
          <span>
            {result.rows.length} groups • {result.rowsScanned.toLocaleString()} rows scanned
          </span>
        </div>
      </div>

      {/* Row 2: Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-base font-medium text-[var(--text-secondary)]">Metric</label>
          <select
            className="bg-[var(--surface-elevated)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-base focus:ring-2 focus:ring-[var(--accent)] outline-none transition-all"
            value={selectedMetricIdx}
            onChange={(e) => setSelectedMetricIdx(parseInt(e.target.value))}
          >
            {numericColumnIndices.map((idx) => (
              <option key={idx} value={idx}>
                {result.columns[idx]}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1 shadow-[var(--shadow-subtle)]">
          <button
            type="button"
            onClick={() => setView("table")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "table"
                ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            aria-pressed={view === "table"}
          >
            <TableIcon
              className={`w-5 h-5 ${
                view === "table" ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
              strokeWidth={1.75}
            />
            Table
          </button>

          <button
            type="button"
            onClick={() => setView("chart")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === "chart"
                ? "bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
            aria-pressed={view === "chart"}
          >
            <BarChart3
              className={`w-5 h-5 ${
                view === "chart" ? "text-[var(--accent)]" : "text-[var(--muted)]"
              }`}
              strokeWidth={2.25}
            />
            Chart
          </button>
        </div>
      </div>

      {/* Row 3: Visualization */}
      {view === "table" ? (
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[var(--surface-elevated)] z-10 border-b border-[var(--border)]">
                <tr>
                  {result.columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-base font-semibold cursor-pointer hover:bg-[var(--white-08)] transition-colors group whitespace-nowrap text-[var(--text-primary)]"
                      onClick={() => handleSort(i)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col}</span>
                        <SortIcon
                          active={sortConfig?.key === i}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {sortedRows.map((row, i) => (
                  <tr key={i} className="hover:bg-[var(--accent-hover-bg)] transition-colors">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-base text-[var(--text-secondary)] whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ReportChart result={result} selectedMetricIdx={selectedMetricIdx} />
      )}
    </div>
  );
}
