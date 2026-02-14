api-dev:
	cd apps/api && air

install-air:
	go install github.com/air-verse/air@latest

api-test:
	cd apps/api && go test ./...

api-lint:
	cd apps/api && golangci-lint run

web-dev:
	cd apps/web && npm run dev

web-install:
	cd apps/web && npm install

