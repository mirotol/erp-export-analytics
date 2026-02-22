import { useState, useMemo } from "react";
import { ChevronUp, ChevronDown, SearchX, Table as TableIcon, BarChart3 } from "lucide-react";
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
    <div
      className={`w-5 h-5 flex items-center justify-center shrink-0 text-(--text-primary) transition-opacity ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      {direction === "asc" ? (
        <ChevronUp className="w-5 h-5" strokeWidth={2.5} />
      ) : (
        <ChevronDown className="w-5 h-5" strokeWidth={2.5} />
      )}
    </div>
  );
}

export function ReportResults({ result }: ReportResultsProps) {
  const [view, setView] = useState<"table" | "chart">("table");

  // Identify numeric columns (metrics)
  const numericColumnIndices = useMemo(() => {
    return result.columns
      .map((col, idx) => {
        const isMetric = col === "count" || col.startsWith("sum(") || col.startsWith("avg(");
        return isMetric ? idx : -1;
      })
      .filter((idx) => idx !== -1);
  }, [result.columns]);

  // Default metric selection
  const [selectedMetricIdx, setSelectedMetricIdx] = useState(() => {
    const avgIdx = result.columns.findIndex((c) => c.startsWith("avg("));
    if (avgIdx !== -1 && numericColumnIndices.includes(avgIdx)) return avgIdx;

    const sumIdx = result.columns.findIndex((c) => c.startsWith("sum("));
    if (sumIdx !== -1 && numericColumnIndices.includes(sumIdx)) return sumIdx;

    const countIdx = result.columns.findIndex((c) => c === "count");
    if (countIdx !== -1 && numericColumnIndices.includes(countIdx)) return countIdx;

    return numericColumnIndices.length > 0 ? numericColumnIndices[0] : -1;
  });

  const [sortConfig, setSortConfig] = useState<SortConfig | null>(() => {
    // Default sorting:
    // If avg metric exists -> sort descending by avg
    // Else if sum metric exists -> sort descending by sum
    // Else -> sort descending by count

    const avgIdx = result.columns.findIndex((c) => c.startsWith("avg("));
    if (avgIdx !== -1) return { key: avgIdx, direction: "desc" };

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
        <div className="w-16 h-16 bg-(--surface-elevated) rounded-full flex items-center justify-center mb-4">
          <SearchX className="w-8 h-8 text-(--muted)" />
        </div>
        <h3 className="text-lg font-medium text-(--text-primary)">No results found</h3>
        <p className="text-(--text-secondary) mt-1">No results match your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-xl font-semibold text-(--text-primary)">Report Results</h3>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="text-base text-(--text-secondary)">
            <span>
              {result.rows.length} groups • {result.rowsScanned.toLocaleString()} rows scanned
            </span>
          </div>

          <div className="inline-flex items-center bg-(--surface) border border-(--border) rounded-lg p-1 shadow-(--shadow-subtle)">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "table"
                  ? "bg-(--surface-elevated) text-(--text-primary) ring-1 ring-(--border)"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
              aria-pressed={view === "table"}
            >
              <TableIcon
                className={`w-5 h-5 ${view === "table" ? "text-(--accent)" : "text-(--muted)"}`}
                strokeWidth={1.75}
              />
              Table
            </button>

            <button
              type="button"
              onClick={() => setView("chart")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === "chart"
                  ? "bg-(--surface-elevated) text-(--text-primary) ring-1 ring-(--border)"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              }`}
              aria-pressed={view === "chart"}
            >
              <BarChart3
                className={`w-5 h-5 ${view === "chart" ? "text-(--accent)" : "text-(--muted)"}`}
                strokeWidth={2.25}
              />
              Chart
            </button>
          </div>
        </div>
      </div>

      {/* Visualization */}
      {view === "table" ? (
        <div className="border border-(--border) rounded-xl overflow-hidden bg-(--surface)">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-(--surface-elevated) z-10 border-b border-(--border)">
                <tr>
                  {result.columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-base font-semibold cursor-pointer hover:bg-(--bg-active) transition-colors group whitespace-nowrap text-(--text-primary)"
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
              <tbody className="divide-y divide-(--border-subtle)">
                {sortedRows.map((row, i) => (
                  <tr key={i} className="hover:bg-(--accent-hover-bg) transition-colors">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-base text-(--text-secondary) whitespace-nowrap"
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
        <ReportChart
          result={result}
          selectedMetricIdx={selectedMetricIdx}
          setSelectedMetricIdx={setSelectedMetricIdx}
          numericColumnIndices={numericColumnIndices}
        />
      )}
    </div>
  );
}
