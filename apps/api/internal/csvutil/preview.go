package csvutil

import (
	"encoding/csv"
	"io"
)

// ParseCSV reads a CSV file and returns its headers and the first 50 data rows as a preview.
func ParseCSV(reader io.Reader) ([]string, [][]string, error) {
	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Read headers
	headers, err := csvReader.Read()
	if err != nil {
		return nil, nil, err
	}

	var previewRows [][]string
	for i := 0; i < 50; i++ {
		row, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, nil, err
		}
		previewRows = append(previewRows, row)
	}

	return headers, previewRows, nil
}
