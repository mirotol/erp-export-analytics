import { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  SearchX,
  Table as TableIcon,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
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

  const dimensionIndices = useMemo(() => {
    return result.columns
      .map((col, idx) => {
        const isMetric = col === "count" || col.startsWith("sum(") || col.startsWith("avg(");
        return isMetric ? -1 : idx;
      })
      .filter((idx) => idx !== -1);
  }, [result.columns]);

  const dimensions = useMemo(
    () => dimensionIndices.map((i) => result.columns[i]),
    [dimensionIndices, result.columns]
  );

  const metrics = useMemo(
    () => numericColumnIndices.map((i) => result.columns[i]),
    [numericColumnIndices, result.columns]
  );

  const chartRows = useMemo(() => {
    const indices = [...dimensionIndices, ...numericColumnIndices];
    return result.rows.map((row) => indices.map((i) => row[i]));
  }, [result.rows, dimensionIndices, numericColumnIndices]);

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Reset pagination on result change (dimensions, metrics, filters)
  const [prevResult, setPrevResult] = useState(result);
  if (result !== prevResult) {
    setPrevResult(result);
    setCurrentPage(1);
  }

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

  const totalPages = Math.ceil(sortedRows.length / pageSize);
  const displayRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

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
        <div className="flex flex-col border border-(--border) rounded-xl overflow-hidden bg-(--surface) shadow-(--shadow-subtle)">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)]">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-(--surface-elevated) z-10 border-b border-(--border) shadow-[0_1px_0_0_var(--border)]">
                <tr>
                  {result.columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-3.5 text-sm font-semibold cursor-pointer hover:bg-(--bg-hover) transition-colors group whitespace-nowrap text-(--text-primary)"
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
                {displayRows.map((row, i) => (
                  <tr key={i} className="hover:bg-(--bg-subtle) transition-colors">
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-sm text-(--text-secondary) whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-(--bg-subtle) border-t border-(--border) gap-4">
            <div className="flex items-center gap-4 text-sm text-(--text-secondary)">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-(--surface) border border-(--border) rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-(--accent) focus:border-transparent cursor-pointer"
                >
                  {[10, 25, 50, 100].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <span className="hidden sm:inline">|</span>
              <span>
                Showing{" "}
                <span className="font-medium text-(--text-primary)">
                  {(currentPage - 1) * pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-(--text-primary)">
                  {Math.min(currentPage * pageSize, sortedRows.length)}
                </span>{" "}
                of <span className="font-medium text-(--text-primary)">{sortedRows.length}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-md hover:bg-(--bg-hover) disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-md hover:bg-(--bg-hover) disabled:opacity-30 disabled:hover:bg-transparent transition-colors mr-1"
                title="Previous Page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((p, i) =>
                  p === "..." ? (
                    <div
                      key={`ellipsis-${i}`}
                      className="w-8 h-8 flex items-center justify-center text-(--text-secondary)"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p as number)}
                      className={`w-8 h-8 rounded-md text-sm font-medium transition-all ${
                        currentPage === p
                          ? "bg-(--accent) text-white shadow-md shadow-(--accent-shadow)"
                          : "text-(--text-secondary) hover:bg-(--bg-hover) hover:text-(--text-primary)"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md hover:bg-(--bg-hover) disabled:opacity-30 disabled:hover:bg-transparent transition-colors ml-1"
                title="Next Page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md hover:bg-(--bg-hover) disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <ReportChart dimensions={dimensions} metrics={metrics} rows={chartRows} />
      )}
    </div>
  );
}
