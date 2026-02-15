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
	groupByIdx := -1
	if len(req.GroupBy) > 0 {
		idx, ok := headerMap[req.GroupBy[0]]
		if !ok {
			return ReportResponse{}, fmt.Errorf("invalid groupBy column: %s", req.GroupBy[0])
		}
		groupByIdx = idx
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
	results := make(map[string][]float64)
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
		groupKey := ""
		if groupByIdx != -1 && groupByIdx < len(row) {
			groupKey = row[groupByIdx]
		}

		if _, ok := results[groupKey]; !ok {
			results[groupKey] = make([]float64, len(metrics))
			groupOrder = append(groupOrder, groupKey)
		}

		// Update metrics
		for i, m := range metrics {
			switch m.op {
			case "count":
				results[groupKey][i]++
			case "sum":
				if m.idx < len(row) {
					valStr := row[m.idx]
					if val, ok := csvutil.InferNumeric(valStr); ok {
						results[groupKey][i] += val
					}
				}
			}
		}
	}

	// Prepare response
	respColumns := []string{}
	if groupByIdx != -1 {
		respColumns = append(respColumns, req.GroupBy[0])
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
		rowValues := results[gk]
		row := []string{}
		if groupByIdx != -1 {
			row = append(row, gk)
		}
		for i, v := range rowValues {
			switch req.Metrics[i].Op {
			case "count":
				row = append(row, fmt.Sprintf("%d", int64(v)))
			case "sum":
				row = append(row, fmt.Sprintf("%.2f", v))
			default:
				row = append(row, fmt.Sprintf("%.2f", v))
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
