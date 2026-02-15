package httpapi

import "net/http"

// NewRouter initializes and returns a new http.Handler configured with all API routes.
func NewRouter() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/upload", handleUpload)
	mux.HandleFunc("/api/samples", handleGetSamples)
	mux.HandleFunc("/api/samples/", handleDownloadSample)
	mux.HandleFunc("/api/reports/", handleRunReport)
	mux.HandleFunc("/health", handleHealth)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})

	return mux
}
