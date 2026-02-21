package engine

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"strings"

	"erp-export-analytics/api/internal/csvutil"
)

// RunReport processes a CSV file based on the provided request parameters,
// performing filtering, grouping, and metric aggregation.
func RunReport(filePath string, req ReportRequest) (ReportResponse, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return ReportResponse{}, fmt.Errorf("failed to open report file: %w", err)
	}
	defer f.Close()

	csvReader := csv.NewReader(f)
	csvReader.FieldsPerRecord = -1

	headers, err := csvReader.Read()
	if err != nil {
		return ReportResponse{}, fmt.Errorf("failed to read csv headers: %w", err)
	}

	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[h] = i
	}

	// Simple validation and setup
	var groupByIndices []int
	for _, gb := range req.GroupBy {
		idx, ok := headerMap[gb]
		if !ok {
			return ReportResponse{}, fmt.Errorf("invalid groupBy column: %s", gb)
		}
		groupByIndices = append(groupByIndices, idx)
	}

	// Metrics setup
	type metricInfo struct {
		op    string
		field string
		idx   int
	}
	var metrics []metricInfo
	for _, m := range req.Metrics {
		idx := -1
		if m.Field != "" {
			var ok bool
			idx, ok = headerMap[m.Field]
			if !ok {
				return ReportResponse{}, fmt.Errorf("invalid metric field: %s", m.Field)
			}
		}
		metrics = append(metrics, metricInfo{op: m.Op, field: m.Field, idx: idx})
	}

	// Filter setup
	type filterInfo struct {
		idx   int
		op    string
		value string
	}
	var filters []filterInfo
	for _, f := range req.Filters {
		idx, ok := headerMap[f.Field]
		if !ok {
			return ReportResponse{}, fmt.Errorf("invalid filter field: %s", f.Field)
		}
		filters = append(filters, filterInfo{idx: idx, op: f.Op, value: f.Value})
	}

	// Aggregation
	type aggState struct {
		sum   float64
		count int64
	}
	results := make(map[string][]aggState)
	groupOrder := []string{}
	rowsScanned := 0

	for {
		row, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("error reading csv row: %v", err)
			break
		}
		rowsScanned++

		// Apply filters
		match := true
		for _, f := range filters {
			if f.idx >= len(row) {
				match = false
				break
			}
			val := row[f.idx]
			if f.op == "eq" {
				if val != f.value {
					match = false
					break
				}
			} else if f.op == "contains" {
				if !strings.Contains(strings.ToLower(val), strings.ToLower(f.value)) {
					match = false
					break
				}
			}
		}
		if !match {
			continue
		}

		// Determine group
		var groupValues []string
		for _, idx := range groupByIndices {
			if idx < len(row) {
				groupValues = append(groupValues, row[idx])
			} else {
				groupValues = append(groupValues, "")
			}
		}
		groupKey := strings.Join(groupValues, "\x1f")

		if _, ok := results[groupKey]; !ok {
			results[groupKey] = make([]aggState, len(metrics))
			groupOrder = append(groupOrder, groupKey)
		}

		// Update metrics
		for i, m := range metrics {
			switch m.op {
			case "count":
				results[groupKey][i].count++
			case "sum", "avg":
				if m.idx < len(row) {
					valStr := row[m.idx]
					if val, ok := csvutil.InferNumeric(valStr); ok {
						results[groupKey][i].sum += val
						results[groupKey][i].count++
					}
				}
			}
		}
	}

	// Prepare response
	respColumns := []string{}
	for _, gb := range req.GroupBy {
		respColumns = append(respColumns, gb)
	}
	for _, m := range req.Metrics {
		colName := m.Op
		if m.Field != "" {
			colName += "(" + m.Field + ")"
		}
		respColumns = append(respColumns, colName)
	}

	respRows := [][]string{}
	for _, gk := range groupOrder {
		states := results[gk]
		row := []string{}
		if len(groupByIndices) > 0 {
			groupValues := strings.Split(gk, "\x1f")
			row = append(row, groupValues...)
		}

		for i, st := range states {
			switch req.Metrics[i].Op {
			case "count":
				row = append(row, fmt.Sprintf("%d", st.count))
			case "sum":
				row = append(row, fmt.Sprintf("%.2f", st.sum))
			case "avg":
				if st.count > 0 {
					row = append(row, fmt.Sprintf("%.2f", st.sum/float64(st.count)))
				} else {
					row = append(row, "0.00")
				}
			default:
				row = append(row, fmt.Sprintf("%.2f", st.sum))
			}
		}

		respRows = append(respRows, row)
		if req.Limit > 0 && len(respRows) >= req.Limit {
			break
		}
	}

	return ReportResponse{
		Columns:     respColumns,
		Rows:        respRows,
		RowsScanned: rowsScanned,
	}, nil
}
