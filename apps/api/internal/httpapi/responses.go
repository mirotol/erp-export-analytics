package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON: %v", err)
	}
}

// UploadResponse defines the JSON structure for a successful CSV upload response.
type UploadResponse struct {
	ReportID    string     `json:"reportId"`
	FileName    string     `json:"fileName"`
	Size        int64      `json:"size"`
	Columns     []string   `json:"columns"`
	PreviewRows [][]string `json:"previewRows"`
}
