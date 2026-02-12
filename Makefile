api-dev:
	cd apps/api && go run .

api-test:
	cd apps/api && go test ./...

web-dev:
	cd apps/web && npm run dev

web-install:
	cd apps/web && npm install
