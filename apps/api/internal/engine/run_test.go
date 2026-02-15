package engine

import (
	"os"
	"path/filepath"
	"testing"
)

func TestRunReport(t *testing.T) {
	// Create a small CSV fixture
	csvContent := `id,name,category,amount
1,Item A,Electronics,100.50
2,Item B,Books,20.00
3,Item C,Electronics,50.00
4,Item D,Books,30.00
5,Item E,Clothing,
6,Item F,Electronics,invalid
7,Item G,Electronics,10.00,extra` // Inconsistent row length

	tmpDir := t.TempDir()
	csvPath := filepath.Join(tmpDir, "test.csv")
	if err := os.WriteFile(csvPath, []byte(csvContent), 0644); err != nil {
		t.Fatalf("failed to create test csv: %v", err)
	}

	t.Run("count formatting is integer", func(t *testing.T) {
		req := ReportRequest{
			Metrics: []struct {
				Op    string `json:"op"`
				Field string `json:"field,omitempty"`
			}{{Op: "count"}},
		}
		resp, err := RunReport(csvPath, req)
		if err != nil {
			t.Fatalf("RunReport failed: %v", err)
		}
		// Expected: one row with empty group key and count of 7
		if len(resp.Rows) != 1 || resp.Rows[0][0] != "7" {
			t.Errorf("expected count 7, got %v", resp.Rows)
		}
	})

	t.Run("groupBy + count", func(t *testing.T) {
		req := ReportRequest{
			GroupBy: []string{"category"},
			Metrics: []struct {
				Op    string `json:"op"`
				Field string `json:"field,omitempty"`
			}{{Op: "count"}},
		}
		resp, err := RunReport(csvPath, req)
		if err != nil {
			t.Fatalf("RunReport failed: %v", err)
		}
		// Expected: Electronics(4), Books(2), Clothing(1)
		expected := map[string]string{
			"Electronics": "4",
			"Books":       "2",
			"Clothing":    "1",
		}
		if len(resp.Rows) != 3 {
			t.Errorf("expected 3 rows, got %d", len(resp.Rows))
		}
		for _, row := range resp.Rows {
			if expected[row[0]] != row[1] {
				t.Errorf("expected %s for %s, got %s", expected[row[0]], row[0], row[1])
			}
		}
	})

	t.Run("groupBy + sum (numeric parsing)", func(t *testing.T) {
		req := ReportRequest{
			GroupBy: []string{"category"},
			Metrics: []struct {
				Op    string `json:"op"`
				Field string `json:"field,omitempty"`
			}{{Op: "sum", Field: "amount"}},
		}
		resp, err := RunReport(csvPath, req)
		if err != nil {
			t.Fatalf("RunReport failed: %v", err)
		}
		// Electronics: 100.50 + 50.00 + 10.00 = 160.50 (invalid and extra row values ignored for sum if not numeric)
		// Books: 20.00 + 30.00 = 50.00
		// Clothing: empty string = 0.00
		expected := map[string]string{
			"Electronics": "160.50",
			"Books":       "50.00",
			"Clothing":    "0.00",
		}
		for _, row := range resp.Rows {
			if expected[row[0]] != row[1] {
				t.Errorf("expected %s for %s, got %s", expected[row[0]], row[0], row[1])
			}
		}
	})

	t.Run("filter eq", func(t *testing.T) {
		req := ReportRequest{
			Filters: []struct {
				Field string `json:"field"`
				Op    string `json:"op"`
				Value string `json:"value"`
			}{{Field: "category", Op: "eq", Value: "Books"}},
			Metrics: []struct {
				Op    string `json:"op"`
				Field string `json:"field,omitempty"`
			}{{Op: "count"}},
		}
		resp, err := RunReport(csvPath, req)
		if err != nil {
			t.Fatalf("RunReport failed: %v", err)
		}
		if len(resp.Rows) != 1 || resp.Rows[0][0] != "2" {
			t.Errorf("expected count 2, got %v", resp.Rows)
		}
	})

	t.Run("filter contains (case-insensitive)", func(t *testing.T) {
		req := ReportRequest{
			Filters: []struct {
				Field string `json:"field"`
				Op    string `json:"op"`
				Value string `json:"value"`
			}{{Field: "name", Op: "contains", Value: "item"}}, // lowercase search
			Metrics: []struct {
				Op    string `json:"op"`
				Field string `json:"field,omitempty"`
			}{{Op: "count"}},
		}
		resp, err := RunReport(csvPath, req)
		if err != nil {
			t.Fatalf("RunReport failed: %v", err)
		}
		if len(resp.Rows) != 1 || resp.Rows[0][0] != "7" {
			t.Errorf("expected count 7, got %v", resp.Rows)
		}
	})

	t.Run("invalid groupBy column returns error", func(t *testing.T) {
		req := ReportRequest{
			GroupBy: []string{"invalid_col"},
		}
		_, err := RunReport(csvPath, req)
		if err == nil {
			t.Error("expected error for invalid groupBy column, got nil")
		}
	})

	t.Run("invalid metric column returns error", func(t *testing.T) {
		req := ReportRequest{
			Metrics: []struct {
				Op    string `json:"op"`
				Field string `json:"field,omitempty"`
			}{{Op: "sum", Field: "invalid_col"}},
		}
		_, err := RunReport(csvPath, req)
		if err == nil {
			t.Error("expected error for invalid metric column, got nil")
		}
	})

	t.Run("invalid filter column returns error", func(t *testing.T) {
		req := ReportRequest{
			Filters: []struct {
				Field string `json:"field"`
				Op    string `json:"op"`
				Value string `json:"value"`
			}{{Field: "invalid_col", Op: "eq", Value: "val"}},
		}
		_, err := RunReport(csvPath, req)
		if err == nil {
			t.Error("expected error for invalid filter column, got nil")
		}
	})

	t.Run("inconsistent row lengths don't crash", func(t *testing.T) {
		// This is covered by the overall test since the CSV has an extra field in the last row
		// and we check results above. Specifically checking rowsScanned.
		req := ReportRequest{
			Metrics: []struct {
				Op    string `json:"op"`
				Field string `json:"field,omitempty"`
			}{{Op: "count"}},
		}
		resp, err := RunReport(csvPath, req)
		if err != nil {
			t.Fatalf("RunReport failed: %v", err)
		}
		if resp.RowsScanned != 7 {
			t.Errorf("expected 7 rows scanned, got %d", resp.RowsScanned)
		}
	})
}
