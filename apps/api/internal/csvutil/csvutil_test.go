package csvutil

import (
	"strings"
	"testing"
)

func TestInferNumeric(t *testing.T) {
	tests := []struct {
		input    string
		expected float64
		ok       bool
	}{{"12.5", 12.5, true}, {"0", 0, true}, {"-1", -1, true}, {"", 0, false}, {"abc", 0, false}, {"1,000", 0, false}}
	for _, tc := range tests {
		val, ok := InferNumeric(tc.input)
		if ok != tc.ok {
			t.Errorf("InferNumeric(%q) ok = %v, want %v", tc.input, ok, tc.ok)
		}
		if ok && val != tc.expected {
			t.Errorf("InferNumeric(%q) val = %v, want %v", tc.input, val, tc.expected)
		}
	}
}
func TestParseCSV(t *testing.T) {
	t.Run("Valid CSV", func(t *testing.T) {
		input := "h1,h2\nv1,v2\nv3,v4"
		headers, rows, err := ParseCSV(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseCSV failed: %v", err)
		}
		if len(headers) != 2 || headers[0] != "h1" || headers[1] != "h2" {
			t.Errorf("unexpected headers: %v", headers)
		}
		if len(rows) != 2 {
			t.Errorf("expected 2 rows, got %d", len(rows))
		}
	})
	t.Run("Empty CSV", func(t *testing.T) {
		input := ""
		_, _, err := ParseCSV(strings.NewReader(input))
		if err == nil {
			t.Error("expected error for empty CSV, got nil")
		}
	})
	t.Run("Only Headers", func(t *testing.T) {
		input := "h1,h2"
		headers, rows, err := ParseCSV(strings.NewReader(input))
		if err != nil {
			t.Fatalf("ParseCSV failed: %v", err)
		}
		if len(headers) != 2 {
			t.Errorf("expected 2 headers, got %d", len(headers))
		}
		if len(rows) != 0 {
			t.Errorf("expected 0 rows, got %d", len(rows))
		}
	})
}
