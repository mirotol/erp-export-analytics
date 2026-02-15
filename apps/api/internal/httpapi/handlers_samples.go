package httpapi

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"erp-export-analytics/api/internal/csvutil"
)

var DataDir = "data"

type SampleFile struct {
	ID       string `json:"id"`
	FileName string `json:"fileName"`
	Title    string `json:"title"`
	Rows     int    `json:"rows"`
}

var SampleFiles = map[string]SampleFile{
	"sample-invoices": {
		ID:       "sample-invoices",
		FileName: "sample-invoices.csv",
		Title:    "Invoices (ERP export)",
		Rows:     50,
	},
	"sample-payments": {
		ID:       "sample-payments",
		FileName: "sample-payments.csv",
		Title:    "Payments (ERP export)",
		Rows:     80,
	},
}

func handleGetSamples(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	samples := make([]SampleFile, 0, len(SampleFiles))
	ids := []string{"sample-invoices", "sample-payments"}
	for _, id := range ids {
		if s, ok := SampleFiles[id]; ok {
			samples = append(samples, s)
		}
	}

	writeJSON(w, http.StatusOK, samples)
}

func handleDownloadSample(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/samples/")
	if id == "" {
		http.Error(w, "missing sample id", http.StatusBadRequest)
		return
	}

	isView := r.URL.Query().Has("view")

	sample, ok := SampleFiles[id]
	if !ok {
		http.Error(w, "sample not found", http.StatusNotFound)
		return
	}

	path := filepath.Join(DataDir, "samples", sample.FileName)
	f, err := os.Open(path)
	if err != nil {
		log.Printf("error opening sample file %s: %v", path, err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	if isView {
		headers, previewRows, err := csvutil.ParseCSV(f)
		if err != nil {
			http.Error(w, "failed to parse sample csv", http.StatusInternalServerError)
			return
		}

		info, _ := f.Stat()
		writeJSON(w, http.StatusOK, UploadResponse{
			ReportID:    fmt.Sprintf("sample-%s", id),
			FileName:    sample.FileName,
			Size:        info.Size(),
			Columns:     headers,
			PreviewRows: previewRows,
		})
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", sample.FileName))
	w.WriteHeader(http.StatusOK)

	if _, err := io.Copy(w, f); err != nil {
		log.Printf("error copying sample file to response: %v", err)
	}
}
