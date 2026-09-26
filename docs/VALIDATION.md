# Validation

Verified locally with Node.js 24.20.0 on Windows:

- Production build completed.
- TypeScript strict checks passed.
- Nine automated tests passed against real SQLite and the generated migrations.
- Eight HTTP checks passed against the running application and local D1: creation, invalid transition, starting work, commenting, resolution, stale-version rejection, history and foreign-origin rejection.

The database tests use a small adapter for the D1 API and atomic batches. They execute real prepared SQL but are not a simulation of Cloudflare infrastructure or network failures.

The HTTP check used a temporary ticket, which was removed from the local database afterward. No production records were used.

GitHub Actions runs installation, type checks, tests and production compilation. Check the Actions tab for hosted outcomes. The initial validation did not include browser interaction/visual QA. A supported WebMCP contract check has not been performed; WebMCP is an optional progressive enhancement. Accessibility relies on semantic markup, responsive styles and the installed UI primitives, and has not been independently audited.

## Frontend refactor — 2026-09-26

Verified locally with Node.js 24.19.0 on Linux:

- All 13 automated tests passed: nine database/domain tests and four API-client tests for JSON requests, conflict errors, non-JSON failures and cancellation.
- Strict TypeScript checks and production build passed.
- Manual browser checks passed for creation, editing, preserving a comment draft during editing, posting the comment, starting work, resolution and search.
- Browser records were fictional and used local D1 only. No production data was changed.

The new client tests mock HTTP responses; they do not simulate the complete React lifecycle or replace automated end-to-end tests.
