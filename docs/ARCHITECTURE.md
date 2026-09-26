# Architecture

IssueDesk is a single-workspace help desk. The UI is written in React and TypeScript, with a small HTTP API and durable SQLite-compatible storage through Cloudflare D1.

## Request flow

`React components → workspace/list/detail hooks → ticket API client → HTTP route → validation → ticket store → D1`

- `components/desk.tsx`: composes the workspace layout.
- `components/desk/`: summary, filters, ticket list, form dialog, detail panel and shared display helpers.
- `hooks/use-ticket-workspace.ts`: coordinates mutations, dialogs, notifications and retry keys.
- `hooks/use-ticket-list.ts` and `use-ticket-detail.ts`: fetching, cancellation, loading and error state; the list also owns debounced search and pagination.
- `hooks/use-ticket-tool.ts`: optional WebMCP registration and cleanup.
- `lib/api-client.ts`: JSON transport and consistent HTTP errors.
- `lib/ticket-api.ts`: typed ticket endpoints and mutation payloads.
- `components/ticket-form.tsx`: reusable create/edit form.
- `lib/tickets.ts`: shared types, validation and permitted status transitions.
- `lib/api-server.ts`: bounded JSON parsing, same-origin checks and error responses.
- `db/ticket-store.ts`: prepared SQL and transactional batches.
- `db/schema.ts` and `drizzle/`: schema definition and versioned migrations.

## Decisions

**One workspace, one permission level.** Everyone who can access this deployment can read and modify its tickets. Assignee and requester names are labels, not authenticated identities. Hosted access is restricted by the hosting gateway; the application does not implement login or authorization. A standalone deployment requires an access gateway or application authentication before public use.

**Explicit status transitions.** A ticket begins as `open`, must move to `in_progress` before `resolved`, and can be reopened. Repeating the current status is a no-op. These rules are enforced server-side.

**Optimistic concurrency.** Updates include the version that was read. SQL updates only a matching version; stale writes return 409. A unique mutation ID connects each successful update to its history entry inside one atomic D1 batch. The losing writer does not add misleading history. The UI preserves an unsuccessful form submission for review.

**Prepared SQL.** Values are bound rather than interpolated. Search escapes SQL wildcard characters and searches titles, requester names and exact ticket numbers. SQLite LIKE does not provide full Unicode case folding or accent-insensitive search. Lists are paginated in groups of ten. Summary counts describe the whole workspace, independently of active filters. Offset pagination can shift under concurrent inserts.

**Retry keys.** Creation and comments accept client-generated identifiers to prevent duplicate submissions after connection failures. Creation retries compare the current ticket fields; a ticket edited since its original creation may return a conflict. This is intentionally simpler than retaining immutable operation responses.

**UI behavior.** Abort controllers discard stale list/detail requests. The application provides loading, empty, error and success states. Existing dialog, sheet and select primitives provide keyboard behavior and focus management. Narrow layouts use ticket cards instead of a wide table. Product records are stored in D1, not browser storage.

**Migration generation.** The migration script calls Drizzle's schema-diff API directly with native Node.js TypeScript support. This avoids requiring a TypeScript CLI loader. Generated SQL and snapshots are reviewed and versioned together. Published migrations must not be edited; create a new migration.

## Boundaries

The application has no individual identity, roles, attachments, email delivery, SLA engine or ticket deletion. History is not tamper-proof against database operators. Comments are attributed to the shared support team. Example loading is an optional empty-workspace action that creates clearly described fictional requests; it is not an atomic bulk import.

Public operation needs authenticated users, authorization, abuse protection, backups, monitoring and retention rules. No production throughput or availability target is claimed.

## Browser integration

A feature-detected WebMCP tool, `start_ticket_creation`, opens the same form as the visible button. It does not save a ticket. Unsupported browsers use the interface normally. Its schema accepts an empty object and rejects unexpected fields.
