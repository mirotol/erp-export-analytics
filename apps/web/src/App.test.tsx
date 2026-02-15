import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("App Happy Path", () => {
  const mockSamples = [
    { id: "sample-1", fileName: "sample-invoices.csv", title: "Invoices (ERP export)", rows: 1 },
  ];

  const mockPreview = {
    reportId: "sample-1",
    fileName: "sample-invoices.csv",
    columns: ["id", "name", "total"],
    previewRows: [["1", "Test", "100"]],
    size: 1024,
  };

  const mockReportResult = {
    columns: ["name", "count", "sum(total)"],
    rows: [["Test", "1", "100.00"]],
    rowsScanned: 1,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.ResizeObserver = ResizeObserverMock as any;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : ((input as Request).url ?? input.toString());

      const path = url.replace(/^https?:\/\/[^/]+/, "");

      if (path.startsWith("/api/samples") && !path.includes("/api/samples/")) {
        return { ok: true, json: async () => mockSamples } as Response;
      }

      if (path.startsWith("/api/samples/sample-1")) {
        return { ok: true, json: async () => mockPreview } as Response;
      }

      if (path.includes("/run")) {
        return { ok: true, json: async () => mockReportResult } as Response;
      }

      return { ok: false, status: 404, text: async () => "Not found" } as Response;
    }) as any;
  });

  it("renders page, loads samples, and can run a report", async () => {
    render(<App />);

    expect(screen.getByText(/ERP Export Analytics/i)).toBeInTheDocument();

    const invoicesBtn = await screen.findByRole("button", { name: /Invoices/i });
    fireEvent.click(invoicesBtn);

    expect(await screen.findByText(/Report Preview/i)).toBeInTheDocument();
    expect(await screen.findByText(/Build Report/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Run Report/i }));

    expect(await screen.findByText(/Report Results/i)).toBeInTheDocument();

    // Table content from mocked report result
    expect(await screen.findByText("sum(total)")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();

    // Switch to chart
    const chartToggle =
      screen.queryByRole("button", { name: /Chart/i }) ?? screen.getByLabelText(/Chart/i);
    fireEvent.click(chartToggle);

    await waitFor(() => {
      const svg = document.querySelector(".recharts-wrapper svg");
      const container = document.querySelector(".recharts-responsive-container");
      expect(svg || container).toBeTruthy();
    });

    // Switch back to table
    const tableToggle =
      screen.queryByRole("button", { name: /Table/i }) ?? screen.getByLabelText(/Table/i);
    fireEvent.click(tableToggle);

    // Table content visible again
    expect(await screen.findByText("sum(total)")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
  });
});
