package handlers

import (
	"encoding/csv"
	"io"
	"net/mail"
	"path/filepath"
	"strings"

	"github.com/xuri/excelize/v2"
)

type importResult struct {
	Created int      `json:"created"`
	Updated int      `json:"updated"`
	Skipped int      `json:"skipped"`
	Errors  []string `json:"errors"`
	Total   int      `json:"total"`
}

// parseCSVFile reads a CSV file and returns rows as string slices.
// Auto-skips the header row if the first cell looks like a column label.
func parseCSVFile(r io.Reader) ([][]string, error) {
	reader := csv.NewReader(r)
	reader.FieldsPerRecord = -1
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	allRows, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(allRows) == 0 {
		return nil, nil
	}

	// Skip header if first cell looks like a label
	first := strings.ToLower(strings.TrimSpace(allRows[0][0]))
	if first == "email" || first == "e-mail" || first == "email address" || first == "email_address" {
		allRows = allRows[1:]
	}

	return allRows, nil
}

// parseXLSXFile reads an XLSX file and returns rows from the first sheet.
func parseXLSXFile(r io.Reader) ([][]string, error) {
	f, err := excelize.OpenReader(r)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, nil
	}

	allRows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, err
	}
	if len(allRows) == 0 {
		return nil, nil
	}

	// Skip header if first cell looks like a label
	first := strings.ToLower(strings.TrimSpace(allRows[0][0]))
	if first == "email" || first == "e-mail" || first == "email address" || first == "email_address" {
		allRows = allRows[1:]
	}

	return allRows, nil
}

// parsePastedEmails splits pasted text into individual email rows.
// Supports comma, semicolon, and newline separators.
func parsePastedEmails(text string) [][]string {
	text = strings.ReplaceAll(text, ";", "\n")
	text = strings.ReplaceAll(text, ",", "\n")

	lines := strings.Split(text, "\n")
	var rows [][]string
	for _, line := range lines {
		email := strings.TrimSpace(line)
		if email != "" {
			rows = append(rows, []string{email})
		}
	}
	return rows
}

// isValidEmail performs basic email validation.
func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// safeIndex returns the trimmed string at index i, or empty string if out of bounds.
func safeIndex(row []string, i int) string {
	if i >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[i])
}

// detectFileType returns "csv" or "xlsx" based on file extension.
func detectFileType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".xlsx", ".xls":
		return "xlsx"
	case ".csv", ".tsv":
		return "csv"
	default:
		return ""
	}
}
