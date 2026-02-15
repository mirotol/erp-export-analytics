import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ReportResult } from "../lib/api";

interface ReportChartProps {
  result: ReportResult;
}

export function ReportChart({ result }: ReportChartProps) {
  // 1. Identify numeric columns (metrics)
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

  // 2. Default metric selection
  const [selectedMetricIdx, setSelectedMetricIdx] = useState(() => {
    const sumIdx = result.columns.findIndex((c) => c.startsWith("sum("));
    if (sumIdx !== -1 && numericColumnIndices.includes(sumIdx)) return sumIdx;

    const countIdx = result.columns.findIndex((c) => c === "count");
    if (countIdx !== -1 && numericColumnIndices.includes(countIdx)) return countIdx;

    return numericColumnIndices.length > 0 ? numericColumnIndices[0] : -1;
  });

  // 3. Prepare data
  const chartData = useMemo(() => {
    if (selectedMetricIdx === -1 || result.rows.length === 0) return [];

    // Sort all rows by selected metric descending
    const sorted = [...result.rows].sort((a, b) => {
      const valA = parseFloat(a[selectedMetricIdx]) || 0;
      const valB = parseFloat(b[selectedMetricIdx]) || 0;
      return valB - valA;
    });

    const top12 = sorted.slice(0, 12);
    const others = sorted.slice(12);

    const data = top12.map((row) => ({
      name: row[0] || "(empty)",
      value: parseFloat(row[selectedMetricIdx]) || 0,
    }));

    if (others.length > 0) {
      const othersValue = others.reduce(
        (acc, row) => acc + (parseFloat(row[selectedMetricIdx]) || 0),
        0
      );
      data.push({
        name: "Other",
        value: othersValue,
      });
    }

    return data;
  }, [result.rows, selectedMetricIdx]);

  // 4. Determine if we should use horizontal layout
  const isHorizontal = useMemo(() => {
    return chartData.some((item) => item.name.length > 14);
  }, [chartData]);

  // 5. Label formatting
  const formatLabel = (label: string) => {
    if (isHorizontal && label.length > 20) {
      return label.substring(0, 20) + "...";
    }
    return label;
  };

  const formatTooltipLabel = (label: React.ReactNode): React.ReactNode => {
    return typeof label === "string" && label.length > 30 ? `${label.slice(0, 30)}...` : label;
  };

  // 6. Validate if chart can be shown
  const canShowChart = result.columns.length > 1 && numericColumnIndices.length > 0;

  if (!canShowChart) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-surface border border-border rounded-xl">
        <h3 className="text-lg font-medium text-foreground">Cannot render chart</h3>
        <p className="text-muted-foreground mt-2 max-w-md">
          Charts require at least one "Group by" column and one numeric metric (Count or Sum).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <label className="text-base font-medium text-muted-foreground">Metric:</label>
        <select
          className="bg-surface-hover border border-border rounded-lg px-3 py-1.5 text-base focus:ring-2 focus:ring-accent outline-none transition-all"
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

      <div className="h-[400px] w-full bg-surface border border-border rounded-xl p-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{
              top: 10,
              right: 30,
              left: isHorizontal ? 40 : 0,
              bottom: isHorizontal ? 0 : 20,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#27272a"
              vertical={isHorizontal}
              horizontal={!isHorizontal}
            />
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
                  }
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={isHorizontal ? 100 : 60}
                  tickFormatter={formatLabel}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
                  }
                />
              </>
            )}
            <Tooltip
              cursor={{ fill: "#27272a", opacity: 0.4 }}
              labelFormatter={formatTooltipLabel}
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                color: "#fafafa",
              }}
              itemStyle={{ color: "#b530ca" }}
            />
            <Bar dataKey="value" radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`cell-${index}`} fill="#b530ca" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
