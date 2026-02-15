package engine

// ReportRequest defines the parameters for generating a report, including
// grouping, metrics, filters, and row limits.
type ReportRequest struct {
	GroupBy []string `json:"groupBy"`
	Metrics []struct {
		Op    string `json:"op"`
		Field string `json:"field,omitempty"`
	} `json:"metrics"`
	Filters []struct {
		Field string `json:"field"`
		Op    string `json:"op"`
		Value string `json:"value"`
	} `json:"filters"`
	Limit int `json:"limit"`
}

// ReportResponse contains the aggregated results of a report execution.
type ReportResponse struct {
	Columns     []string   `json:"columns"`
	Rows        [][]string `json:"rows"`
	RowsScanned int        `json:"rowsScanned"`
}
