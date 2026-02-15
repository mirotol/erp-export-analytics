package csvutil

import "strconv"

// InferNumeric attempts to parse a string value as a 64-bit floating point number.
func InferNumeric(valStr string) (float64, bool) {
	val, err := strconv.ParseFloat(valStr, 64)
	if err != nil {
		return 0, false
	}
	return val, true
}
