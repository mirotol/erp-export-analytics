package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"path/filepath"
	"strings"

	"erp-export-analytics/api/internal/engine"
	"erp-export-analytics/api/internal/reports"
)

func handleRunReport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	reportID := strings.TrimPrefix(r.URL.Path, "/api/reports/")
	reportID = strings.TrimSuffix(reportID, "/run")
	if reportID == "" {
		http.Error(w, "missing report id", http.StatusBadRequest)
		return
	}

	report, ok := reports.GetReport(reportID)

	var filePath string
	if !ok {
		// Check if it's a sample report
		if strings.HasPrefix(reportID, "sample-") {
			sampleID := strings.TrimPrefix(reportID, "sample-")
			sample, ok := SampleFiles[sampleID]
			if !ok {
				http.Error(w, "report not found", http.StatusNotFound)
				return
			}
			filePath = filepath.Join(DataDir, "samples", sample.FileName)
		} else {
			http.Error(w, "report not found", http.StatusNotFound)
			return
		}
	} else {
		filePath = report.FilePath
	}

	var req engine.ReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := engine.RunReport(filePath, req)
	if err != nil {
		log.Printf("error running report: %v", err)
		// Distinguish between client error and server error?
		// For now, simple approach
		if strings.Contains(err.Error(), "invalid") {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "failed to run report", http.StatusInternalServerError)
		}
		return
	}

	writeJSON(w, http.StatusOK, resp)
}
