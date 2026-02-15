import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";

// ---- Recharts/JSDOM helpers ----
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe("App Happy Path", () => {
  const mockSamples = [
    // Match your UI earlier: id, fileName, title, rows
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
    globalThis.ResizeObserver = ResizeObserverMock;

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      // Normalize by stripping origin if present
      const path = url.replace(/^https?:\/\/[^/]+/, "");

      if (path.startsWith("/api/samples") && !path.includes("/api/samples/")) {
        return {
          ok: true,
          json: async () => mockSamples,
        } as Response;
      }

      if (path.startsWith("/api/samples/sample-1")) {
        // allow any query: ?view or ?view=true
        return {
          ok: true,
          json: async () => mockPreview,
        } as Response;
      }

      if (path.includes("/run")) {
        return {
          ok: true,
          json: async () => mockReportResult,
        } as Response;
      }

      return {
        ok: false,
        status: 404,
        text: async () => "Not found",
      } as Response;
    }) as any;
  });

  it("renders page, loads samples, and can run a report", async () => {
    render(<App />);

    expect(screen.getByText(/ERP Export Analytics/i)).toBeInTheDocument();

    // Samples appear
    const invoicesBtn = await screen.findByRole("button", { name: /Invoices/i });
    fireEvent.click(invoicesBtn);

    // Preview + builder appear after sample load
    expect(await screen.findByText(/Report Preview/i)).toBeInTheDocument();
    expect(await screen.findByText(/Build Report/i)).toBeInTheDocument();

    // Run report
    const runButton = screen.getByRole("button", { name: /Run Report/i });
    fireEvent.click(runButton);

    // Results appear
    expect(await screen.findByText(/Report Results/i)).toBeInTheDocument();

    // Check that the table shows the mocked result
    expect(await screen.findByText("sum(total)")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();

    // Switch to chart view
    // If your buttons are text-based, this works:
    let chartToggle: HTMLElement | null = null;
    try {
      chartToggle = screen.getByRole("button", { name: /Chart/i });
    } catch {
      // Fallback if icon-only: ensure you add aria-label in your component
      chartToggle = screen.getByLabelText(/Chart/i);
    }

    fireEvent.click(chartToggle!);

    // Chart container should appear
    await waitFor(() => {
      // Recharts renders an svg and/or responsive container
      const svg = document.querySelector(".recharts-wrapper svg");
      const container = document.querySelector(".recharts-responsive-container");
      expect(svg || container).toBeTruthy();
    });

    // Switch back to table
    let tableToggle: HTMLElement | null = null;
    try {
      tableToggle = screen.getByRole("button", { name: /Table/i });
    } catch {
      tableToggle = screen.getByLabelText(/Table/i);
    }

    fireEvent.click(tableToggle!);

    // Verify table is back and data is correct
    expect(await screen.findByText("sum(total)")).toBeInTheDocument();
    expect(screen.getByText("100.00")).toBeInTheDocument();
  });
});
