package csvutil

import "strconv"

func InferNumeric(valStr string) (float64, bool) {
	val, err := strconv.ParseFloat(valStr, 64)
	if err != nil {
		return 0, false
	}
	return val, true
}
