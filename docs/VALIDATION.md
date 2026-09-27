# Validation

Verified locally with Node.js 24.20.0 on Windows:

- Production build completed.
- TypeScript strict checks passed.
- Nine automated tests passed against real SQLite and the generated migrations.
- Eight HTTP checks passed against the running application and local D1: creation, invalid transition, starting work, commenting, resolution, stale-version rejection, history and foreign-origin rejection.

The database tests use a small adapter for the D1 API and atomic batches. They execute real prepared SQL but are not a simulation of Cloudflare infrastructure or network failures.

The HTTP check used a temporary ticket, which was removed from the local database afterward. No production records were used.

GitHub Actions runs installation, type checks, unit/domain tests, production compilation and HTTP integration tests. Check the Actions tab for hosted outcomes. The initial validation did not include browser interaction/visual QA. A supported WebMCP contract check has not been performed; WebMCP is an optional progressive enhancement. Accessibility relies on semantic markup, responsive styles and the installed UI primitives, and has not been independently audited.

## Frontend refactor — 2026-09-26

Verified locally with Node.js 24.19.0 on Linux:

- All 13 automated tests passed: nine database/domain tests and four API-client tests for JSON requests, conflict errors, non-JSON failures and cancellation.
- Strict TypeScript checks and production build passed.
- Manual browser checks passed for creation, editing, preserving a comment draft during editing, posting the comment, starting work, resolution and search.
- Browser records were fictional and used local D1 only. No production data was changed.

The new client tests mock HTTP responses; they do not simulate the complete React lifecycle or replace automated end-to-end tests.

## Automated HTTP integration — 2026-09-27

Verified locally with Node.js 24.19.0 on Linux. All 16 tests passed across the two commands: 13 unit/domain/client tests and three HTTP integration scenarios. TypeScript checks and production compilation also passed.

`npm run test:integration` uses the compiled Worker in Miniflare's local Worker runtime with a fresh temporary D1 database. It applies every migration listed in the checked-in migration journal, binds only to loopback, and removes the database and stops the server on completion. It never accepts a remote target URL.

The scenarios cover:

- Create/retry, edit, stale-edit rejection, invalid status transition, start, comment/retry, resolve, reopen and persisted history.
- Search, status/priority filters, pagination without duplicate records, invalid pagination and missing records.
- Foreign-origin rejection, unsupported content type, malformed JSON, oversized requests and invalid fields, with no extra database writes.

These tests run after the build in GitHub Actions. They exercise HTTP routes and local D1 without mocking application responses. They do not exercise browser interactions or establish production performance, authentication or availability guarantees.

The first hosted run exposed an intermittent 503 from Wrangler’s development proxy during a mutation request. The test server now runs the compiled modules directly in Miniflare, using the generated Wrangler configuration for bindings and assets. This removes the development proxy and hot-reload lifecycle from the test path without retrying failed mutations or relaxing assertions.
