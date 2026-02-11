api-dev:
	cd apps/api && go run .

api-test:
	cd apps/api && go test ./...
