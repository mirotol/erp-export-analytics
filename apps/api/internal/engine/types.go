package engine

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

type ReportResponse struct {
	Columns     []string   `json:"columns"`
	Rows        [][]string `json:"rows"`
	RowsScanned int        `json:"rowsScanned"`
}
