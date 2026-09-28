# IssueDesk — project case study

## Problem

A support queue needs more than a ticket form: people must find requests, understand their status, assign work and retain the history of each resolution. Concurrent edits and retries can otherwise lose information or create duplicate records.

## Project implementation

The project covers the responsive React interface, reusable create/edit form, list/detail hooks, typed HTTP client, server-side validation, SQL persistence and automated validation. The UI provides search, filters, pagination, comments and explicit start/resolve/reopen actions.

## Decisions and evidence

| Decision | Reason | Where to review |
| --- | --- | --- |
| Separate components, state hooks and API transport | Keep interface changes separate from request handling | [Workspace](../components/desk.tsx), [hooks](../hooks), [API client](../lib/ticket-api.ts) |
| Check the ticket version on mutation | Reject a stale edit with 409 instead of losing another writer's changes | [Store](../db/ticket-store.ts), [domain tests](../test/tickets.test.ts) |
| Commit changes and history in one D1 batch | Avoid a saved change without its history entry | [Store](../db/ticket-store.ts), rollback test |
| Reuse identifiers for creation and comments | Avoid duplicates when a client retries after a lost response | [Workspace hook](../hooks/use-ticket-workspace.ts), retry tests |
| Run the compiled Worker against disposable local D1 | Exercise real HTTP boundaries and persistence in CI | [Integration tests](../test/integration/http.test.ts), [workflow](../.github/workflows/ci.yml) |

## Demonstration and validation

Start with the [screenshots and visual walkthrough](../README.md#see-the-workflow). The 35-second video is an annotated sequence of interface captures using fictional data.

The automated suite contains 13 unit/domain/client tests plus three HTTP integration scenarios. Manual browser validation covered creation, editing, preserving a comment draft, posting comments, status changes and search. Commands and limitations are in the [validation record](VALIDATION.md).

## Scope and tradeoffs

This version has one shared workspace. Assignee names are labels, not authenticated accounts. Application-level authentication, role permissions and automated browser tests remain future work. The hosted application is private; repository visitors can review the demonstration and run the app locally. Local runtime tests do not establish production performance or availability.

[Architecture](ARCHITECTURE.md) · [API](API.md) · [Back to README](../README.md)
