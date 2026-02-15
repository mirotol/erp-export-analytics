package main

import (
	"log"
	"net/http"

	"erp-export-analytics/api/internal/httpapi"
	"erp-export-analytics/api/internal/reports"
)

func main() {
	reports.StartCleanupWorker()

	mux := httpapi.NewRouter()

	addr := ":8080"
	log.Printf("API listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
