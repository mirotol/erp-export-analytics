api-dev:
	cd apps/api && air

api-test:
	cd apps/api && go test ./...

api-lint:
	cd apps/api && golangci-lint run

api-fmt:
	cd apps/api && go fmt ./...

fmt: 
	api-fmt web-fmt

web-dev:
	cd apps/web && npm run dev

web-install:
	cd apps/web && npm install

web-fmt:
	cd apps/web && npm run format

web-fmt-check:
	cd apps/web && npm run format:check

web-test:
	cd apps/web && npm run test:run
