// Package reports manages the lifecycle and metadata of uploaded CSV reports.
// It provides an in-memory store for tracking reports and a cleanup worker
// to ensure temporary files are removed after their TTL expires.
package reports
